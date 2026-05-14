import { Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Namespace, Socket } from "socket.io";
import { CollaborationService } from "../services/collaboration.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { OperationalTransformService } from "../services/operational-transform.service";
import { DocumentOperation } from "../interfaces/document-operation.interface";
import { OperationTransformUtils } from "../utils/operation-transform.utils";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { OPERATION_MESSAGES } from "../constants/operation.message";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "src/modules/user/user.service";

@WebSocketGateway({
    namespace: '/collaboration',
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})
export class DocumentCollaborationGateway
    implements OnGatewayConnection, OnGatewayDisconnect {

    @WebSocketServer()
    server: Namespace;

    private readonly logger = new Logger(DocumentCollaborationGateway.name);

    private userSessions = new Map<string, string>(); // socketId -> sessionId
    private sessionRooms = new Map<string, Set<string>>(); // sessionId -> Set<socketId>

    constructor(
        private readonly collaborationService: CollaborationService,
        private readonly prisma: PrismaService,
        private readonly operationalTransformService: OperationalTransformService,
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
    ) { }

    private getSocketById(socketId: string): Socket | undefined {
        return this.server.sockets.get(socketId);
    }

    async handleDisconnect(client: any) {
        this.logger.log(`Client disconnected: ${client.id}`);
        await this.handleDesktopDisconnect(client.id);
    }

    async handleConnection(client: Socket) {
        try {
            const user = await this.authenticateClient(client);
            this.logger.log(`Client connected: ${client.id} (${user.id})`);
        } catch (error) {
            this.logger.warn(`Unauthorized collaboration socket ${client.id}: ${error.message}`);
            client.emit('error', { message: 'Unauthorized collaboration connection' });
            client.disconnect(true);
        }
    }

    private async authenticateClient(client: Socket): Promise<any> {
        if (client.data?.user) return client.data.user;

        const authToken = client.handshake.auth?.token;
        const header = client.handshake.headers?.authorization;
        const headerToken = typeof header === 'string' && header.startsWith('Bearer ')
            ? header.slice(7)
            : undefined;
        const token = authToken || headerToken;

        if (!token) {
            throw new Error('Missing token');
        }

        const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
        const user = await this.userService.findById(payload.sub);
        client.data.user = user;
        return user;
    }

    private async ensureDocumentAccess(documentId: string, userId: string, mode: 'view' | 'edit' = 'view'): Promise<void> {
        const document = await this.prisma.documents.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                createdBy: true,
                libraryId: true,
                library: {
                    select: {
                        type: true
                    }
                }
            }
        });

        if (!document) {
            throw new Error('Document not found');
        }

        if (document.createdBy === userId) {
            return;
        }

        const collaborator = await this.prisma.documentCollaborators.findUnique({
            where: {
                documentId_userId: {
                    documentId,
                    userId
                }
            }
        });

        if (collaborator) {
            if (mode === 'view' || collaborator.role === 'owner' || collaborator.role === 'editor') {
                return;
            }
        }

        if (document.library.type !== 'shared' && document.library.type !== 'group') {
            throw new Error('No document permission');
        }

        const membership = await this.prisma.libraryMemberships.findUnique({
            where: {
                libraryId_userId: {
                    libraryId: document.libraryId,
                    userId
                }
            }
        });

        if (membership) {
            if (mode === 'view' || membership.role === 'owner' || membership.role === 'admin' || membership.role === 'editor' || membership.role === 'member') {
                return;
            }
        }

        throw new Error('No document permission');
    }

    private async enrichParticipants(participants: any[]): Promise<any[]> {
        const userIds = [...new Set(participants.map((participant) => participant.userId).filter(Boolean))];
        if (userIds.length === 0) return participants;

        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true, email: true, avatarUrl: true }
        });

        return participants.map((participant) => {
            const user = users.find((item) => item.id === participant.userId);
            return {
                ...participant,
                userName: user?.fullName || user?.email || participant.userName,
                userEmail: user?.email || participant.userEmail,
                avatarUrl: user?.avatarUrl ?? participant.avatarUrl
            };
        });
    }

    @SubscribeMessage('join-document')
    async handleJoinDocument(@MessageBody() data: { documentId: string, userId: string }, @ConnectedSocket() client: Socket) {
        try {
            const user = await this.authenticateClient(client);
            await this.ensureDocumentAccess(data.documentId, user.id, 'view');
            this.logger.log(`User ${user.id} joining document ${data.documentId}`);

            const session = await this.collaborationService.getOrCreateSession(data.documentId, {
                participants: [{ userId: user.id, socketId: client.id, joinedAt: new Date(), lastSeen: new Date(), isTyping: false }],
                operationLog: [],
                currentState: {},
                sessionData: {},
                conflictResolution: {},
            });

            const updatedSession = await this.collaborationService.addParticipant(
                session.id,
                user.id,
                client.id
            );

            const roomName = `document-${data.documentId}`;
            await client.join(roomName);

            this.userSessions.set(client.id, session.id);
            if (!this.sessionRooms.has(session.id)) {
                this.sessionRooms.set(session.id, new Set());
            }
            this.sessionRooms.get(session.id)!.add(client.id);
            const participants = await this.enrichParticipants(updatedSession.participants as any[]);

            this.server.to(roomName).emit('user-joined', {
                userId: user.id,
                sessionId: session.id,
                participants
            });

            client.emit('session-joined', {
                sessionId: session.id,
                currentState: updatedSession.currentState,
                participants
            });

            await this.synchronizeDocumentState(data.documentId, client);

            this.logger.log(`User ${user.id} successfully joined document ${data.documentId}`);
        } catch (error) {
            this.logger.error(`Error joining document: ${error.message}`);
            client.emit('error', { message: 'Failed to join document' });
        }
    }

    @SubscribeMessage('leave-document')
    async handleLeaveDocument(
        @MessageBody() data: { sessionId: string, userId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const user = await this.authenticateClient(client);
            const sessionId = data.sessionId || this.userSessions.get(client.id);
            if (!sessionId) return;

            const userId = user.id;

            const updatedSession = await this.collaborationService.removeParticipant(sessionId, userId);

            const roomName = `document-${updatedSession.documentId}`;
            await client.leave(roomName);

            this.userSessions.delete(client.id);
            this.sessionRooms.get(sessionId)?.delete(client.id);
            const participants = await this.enrichParticipants(updatedSession.participants as any[]);

            this.server.to(roomName).emit('user-left', {
                userId,
                sessionId,
                participants
            });

            this.logger.log(`User ${userId} left document session ${sessionId}`);
        } catch (error) {
            this.logger.error(`Error leaving document: ${error.message}`);
        }
    }

    @SubscribeMessage('text-operation')
    async handleTextOperation(
        @MessageBody() data: {
            sessionId: string;
            documentId: string;
            operation: {
                type: string;
                position: { offset: number; line?: number; column?: number };
                content?: string;
                length?: number;
                attributes?: any;
            };
            userId: string;
            version: number;
        },
        @ConnectedSocket() client: Socket
    ) {
        try {
            const user = await this.authenticateClient(client);
            const { sessionId, operation, documentId, version } = data;
            await this.ensureDocumentAccess(documentId, user.id, 'edit');
            const session = await this.prisma.collaborationSession.findUnique({
                where: { id: sessionId },
                select: { documentId: true }
            });
            if (!session || session.documentId !== documentId) {
                throw new Error('Invalid collaboration session');
            }
            this.logger.log(`Text operation from user ${user.id} in session ${sessionId}`);

            // Create proper DocumentOperation object
            const documentOperation: DocumentOperation = {
                id: this.operationalTransformService.generateOperationId(),
                type: operation.type as any,
                position: {
                    offset: operation.position.offset,
                    line: operation.position.line || 0,
                    column: operation.position.column || 0,
                },
                content: operation.content,
                length: operation.length,
                attributes: operation.attributes,
                userId: user.id,
                documentId,
                version,
                timestamp: new Date(),
            };

            // Use OT service instead of manual processing
            await this.processAndBroadcastOperation(documentOperation, sessionId, client.id);

        } catch (error) {
            this.logger.error(`Error handling text operation: ${error.message}`);
            client.emit('operation-failed', {
                message: 'Failed to apply text operation',
                error: error.message
            });
        }
    }

    @SubscribeMessage('cursor-position')
    async handleCursorPosition(
        @MessageBody() data: {
            sessionId: string;
            userId: string;
            position: number;
            selection?: { start: number; end: number };
        },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const user = await this.authenticateClient(client);
            const { sessionId, position, selection } = data;
            const session = await this.prisma.collaborationSession.findUnique({
                where: { id: sessionId },
                select: { documentId: true }
            });
            if (!session) return;
            await this.ensureDocumentAccess(session.documentId, user.id, 'view');

            await this.collaborationService.updateCursorPosition(sessionId, user.id, position);

            const sessionRoomSockets = this.sessionRooms.get(sessionId);
            if (sessionRoomSockets) {
                if (session) {
                    const roomName = `document-${session.documentId}`;
                    this.server.to(roomName).emit('cursor-updated', {
                        userId: user.id,
                        position,
                        selection,
                        timestamp: new Date()
                    });
                }
            }

            this.logger.log(`Cursor position updated for user ${user.id} at position ${position}`);
        } catch (error) {
            this.logger.error(`Error updating cursor position: ${error.message}`);
        }
    }

    @SubscribeMessage('typing-status')
    async handleTypingStatus(
        @MessageBody() data: {
            sessionId: string;
            userId: string;
            isTyping: boolean;
        },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const user = await this.authenticateClient(client);
            const { sessionId, isTyping } = data;
            const session = await this.prisma.collaborationSession.findUnique({
                where: { id: sessionId },
                select: { documentId: true }
            });
            if (!session) return;
            await this.ensureDocumentAccess(session.documentId, user.id, 'view');

            await this.collaborationService.updateTypingStatus(sessionId, user.id, isTyping);

            const sessionRoomSockets = this.sessionRooms.get(sessionId);
            if (sessionRoomSockets) {
                if (session) {
                    const roomName = `document-${session.documentId}`;
                    this.server.to(roomName).emit('typing-status-changed', {
                        userId: user.id,
                        isTyping,
                        timestamp: new Date()
                    });
                }
            }

            this.logger.log(`Typing status updated for user ${user.id}: ${isTyping ? 'started' : 'stopped'} typing`);
        } catch (error) {
            this.logger.error(`Error updating typing status: ${error.message}`);
        }
    }

    @SubscribeMessage('desktop-operation')
    async handleDesktopOperation(
        @MessageBody() data: {
            documentId: string;
            operation: DocumentOperation;
        },
        @ConnectedSocket() client: Socket
    ): Promise<void> {
        try {
            const user = await this.authenticateClient(client);
            const { operation, documentId } = data;
            await this.ensureDocumentAccess(documentId, user.id, 'edit');
            const safeOperation = { ...operation, userId: user.id, documentId };

            if (!OperationTransformUtils.validateOperation(safeOperation)) {
                throw new CustomHttpException(OPERATION_MESSAGES.INVALID_OPERATION_FORMAT, 400, 'INVALID_OPERATION');
            }

            // Get or create session for desktop operation
            const session = await this.collaborationService.getOrCreateSession(documentId, {
                participants: [],
                operationLog: [],
                currentState: {},
                sessionData: {},
                conflictResolution: {},
            });

            // Process through OT service
            await this.processAndBroadcastOperation(safeOperation, session.id, client.id);

            client.emit('desktop-operation-success', {
                operationId: safeOperation.id,
                timestamp: new Date()
            });

        } catch (error) {
            this.logger.error(`Error handling desktop operation: ${error.message}`);
            client.emit('desktop-operation-failed', {
                operationId: data.operation.id,
                error: error.message
            });
        }
    }

    @SubscribeMessage('get-document-version')
    async handleGetDocumentVersion(
        @MessageBody() data: {
            documentId: string;
        },
        @ConnectedSocket() client: Socket
    ): Promise<void> {
        try {
            const user = await this.authenticateClient(client);
            const { documentId } = data;
            await this.ensureDocumentAccess(documentId, user.id, 'view');
            const currentVersion = await this.operationalTransformService.getDocumentVersion(documentId);

            client.emit('document-version', {
                documentId,
                version: currentVersion,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error(`Error getting document version: ${error.message}`);
            client.emit('operation-failed', {
                message: 'Failed to get document version',
                error: error.message
            });
        }
    }

    @SubscribeMessage('sync-document')
    async handleSyncDocument(
        @MessageBody() data: {
            documentId: string;
            fromVersion: number;
        },
        @ConnectedSocket() client: Socket
    ): Promise<void> {
        try {
            const user = await this.authenticateClient(client);
            const { documentId, fromVersion } = data;
            await this.ensureDocumentAccess(documentId, user.id, 'view');
            const operations = await this.operationalTransformService.getOperationsAfterVersion(documentId, fromVersion);

            client.emit('document-synced', {
                documentId,
                operations,
                fromVersion,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error(`Error syncing document: ${error.message}`);
            client.emit('sync-failed', {
                documentId: data.documentId,
                error: error.message
            });
        }
    }

    @SubscribeMessage('request-active-collaborators')
    async handleRequestActiveCollaborators(
        @MessageBody() data: {
            documentId: string;
        },
        @ConnectedSocket() client: Socket
    ): Promise<void> {
        try {
            const user = await this.authenticateClient(client);
            const { documentId } = data;
            await this.ensureDocumentAccess(documentId, user.id, 'view');
            const collaborators = await this.getActiveCollaborators(documentId);

            client.emit('active-collaborators', {
                documentId,
                collaborators,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error(`Error requesting active collaborators: ${error.message}`);
            client.emit('operation-failed', {
                message: 'Failed to request active collaborators',
                error: error.message
            });
        }
    }

    async processAndBroadcastOperation(
        operation: DocumentOperation,
        sessionId: string,
        senderSocketId: string
    ): Promise<void> {
        try {
            // 1. Process operation through OT service
            const operationResult = await this.operationalTransformService.processIncomingOperation(operation);

            if (!operationResult.success) {
                const senderSocket = this.getSocketById(senderSocketId);
                senderSocket?.emit('operation-failed', {
                    operationId: operation.id,
                    error: 'Operation failed to apply',
                    conflicts: operationResult.conflicts
                });
                return;
            }

            // 2. Update collaboration session
            await this.collaborationService.addOperation(sessionId, operationResult.transformedOperation!);

            // 3. Broadcast to all participants
            await this.broadcastOperationResult(operationResult, sessionId, senderSocketId);

            // 4. Send confirmation to sender
            const senderSocket = this.getSocketById(senderSocketId);
            senderSocket?.emit('operation-confirmed', {
                operationId: operation.id,
                success: true,
                newVersion: operationResult.newVersion,
                transformedOperation: operationResult.transformedOperation
            });

        } catch (error) {
            this.logger.error(`Error processing operation: ${error.message}`);
            const senderSocket = this.getSocketById(senderSocketId);
            senderSocket?.emit('operation-failed', {
                operationId: operation.id,
                error: error.message
            });
        }
    }

    async handleOperationConflict(
        conflictedOperation: DocumentOperation,
        sessionId: string
    ): Promise<void> {
        try {
            // 1. Get pending operations
            const session = await this.collaborationService.getSessionById(sessionId);
            const pendingOperations = (session.operationLog as any[]) || [];

            // 2. Resolve conflicts using OT service
            const allConflictedOps = [...pendingOperations, conflictedOperation];
            const resolvedOperations = this.operationalTransformService.resolveConflicts(allConflictedOps);

            // 3. Notify participants about resolution
            const roomName = `document-${session.documentId}`;
            this.server.to(roomName).emit('conflicts-resolved', {
                sessionId,
                resolvedOperations,
                timestamp: new Date()
            });

            // 4. Apply resolved operations
            for (const resolvedOp of resolvedOperations) {
                await this.operationalTransformService.processIncomingOperation(resolvedOp);
            }
        } catch (error) {
            this.logger.error(`Error handling operation conflict: ${error.message}`);
        }
    }

    async synchronizeDocumentState(documentId: string, clientSocket: Socket): Promise<void> {
        try {
            // 1. Get current document state from collaboration session
            const collaboration = await this.collaborationService.getOrCreateSession(documentId, {});
            if (!collaboration) return;

            const currentState = collaboration.currentState;
            const operationLog = (collaboration.operationLog as any[]) || [];

            // 2. Get recent operations (last 50)
            const recentOperations = operationLog.slice(-50);

            // 3. Get current version from OT service
            const currentVersion = await this.operationalTransformService.getDocumentVersion(documentId);

            // 4. Send sync data to client
            clientSocket.emit('document-synchronized', {
                documentId,
                currentState,
                recentOperations,
                currentVersion,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error(`Error synchronizing document state: ${error.message}`);
            clientSocket.emit('sync-failed', {
                error: 'Failed to synchronize document state'
            });
        }
    }

    async broadcastOperationResult(
        result: any,
        sessionId: string,
        excludeSocketId?: string
    ): Promise<void> {
        try {
            // 1. Get session info
            const session = await this.collaborationService.getSessionById(sessionId);
            const roomName = `document-${session.documentId}`;

            // 2. Format broadcast data
            const broadcastData = {
                operation: result.transformedOperation,
                sessionId,
                newVersion: result.newVersion,
                timestamp: new Date(),
                success: result.success
            };

            // 3. Broadcast to all participants except sender
            if (excludeSocketId) {
                this.server.to(roomName).except(excludeSocketId).emit('operation-broadcasted', broadcastData);
            } else {
                this.server.to(roomName).emit('operation-broadcasted', broadcastData);
            }

            // 4. Log broadcast statistics
            const participantCount = this.sessionRooms.get(sessionId)?.size || 0;
            this.logger.log(`Operation broadcasted to ${participantCount} participants in session ${sessionId}`);
        } catch (error) {
            this.logger.error(`Error broadcasting operation result: ${error.message}`);
        }
    }

    async handleDesktopDisconnect(socketId: string): Promise<void> {
        try {
            // 1. Find session for this socket
            const sessionId = this.userSessions.get(socketId);
            if (!sessionId) return;

            // 2. Clean up session mappings
            this.userSessions.delete(socketId);
            this.sessionRooms.get(sessionId)?.delete(socketId);

            // 3. Remove participant from collaboration session
            const session = await this.collaborationService.getSessionById(sessionId);
            const participants = (session.participants as any[]) || [];
            const participant = participants.find((p: any) => p.socketId === socketId);

            if (participant) {
                await this.collaborationService.removeParticipant(sessionId, participant.userId);

                // 4. Notify other participants
                const roomName = `document-${session.documentId}`;
                this.server.to(roomName).emit('collaborator-disconnected', {
                    userId: participant.userId,
                    sessionId,
                    timestamp: new Date()
                });
            }

            // 5. End session if no participants left
            if (this.sessionRooms.get(sessionId)?.size === 0) {
                await this.collaborationService.endSession(sessionId);
            }
        } catch (error) {
            this.logger.error(`Error handling desktop disconnect: ${error.message}`);
        }
    }

    async getActiveCollaborators(documentId: string): Promise<any[]> {
        try {
            // 1. Find active sessions for document
            const sessions = await this.prisma.collaborationSession.findMany({
                where: {
                    documentId,
                    isActive: true
                }
            });

            const collaborators: any[] = [];

            // 2. Collect participants from all sessions
            for (const session of sessions) {
                const participants = (session.participants as any[]) || [];
                collaborators.push(...participants);
            }

            // 3. Get user information
            const userIds = [...new Set(collaborators.map(c => c.userId))];
            const users = await this.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, fullName: true, email: true, avatarUrl: true }
            });

            return collaborators.map(collaborator => {
                const user = users.find(u => u.id === collaborator.userId);
                return {
                    ...collaborator,
                    userName: user?.fullName || user?.email || collaborator.userName || collaborator.userId,
                    userEmail: user?.email,
                    avatarUrl: user?.avatarUrl
                };
            });
        } catch (error) {
            this.logger.error(`Error getting active collaborators: ${error.message}`);
            return [];
        }
    }
}