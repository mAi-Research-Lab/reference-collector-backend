import { Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { CollaborationService } from "../services/collaboration.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { OperationalTransformService } from "../services/operational-transform.service";
import { DocumentOperation } from "../interfaces/document-operation.interface";
import { OperationTransformUtils } from "../utils/operation-transform.utils";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { OPERATION_MESSAGES } from "../constants/operation.message";

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
    server: Server;

    private readonly logger = new Logger(DocumentCollaborationGateway.name);

    private userSessions = new Map<string, string>(); // socketId -> sessionId
    private sessionRooms = new Map<string, Set<string>>(); // sessionId -> Set<socketId>

    constructor(
        private readonly collaborationService: CollaborationService,
        private readonly prisma: PrismaService,
        private readonly operationalTransformService: OperationalTransformService,
    ) { }

    async handleDisconnect(client: any) {
        this.logger.log(`Client disconnected: ${client.id}`);
        await this.handleDesktopDisconnect(client.id);
    }

    handleConnection(client: any) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    @SubscribeMessage('join-document')
    async handleJoinDocument(@MessageBody() data: { documentId: string, userId: string }, @ConnectedSocket() client: Socket) {
        try {
            this.logger.log(`User ${data.userId} joining document ${data.documentId}`);

            const session = await this.collaborationService.getOrCreateSession(data.documentId, {
                participants: [{ userId: data.userId, socketId: client.id, joinedAt: new Date(), lastSeen: new Date(), isTyping: false }],
                operationLog: [],
                currentState: {},
                sessionData: {},
                conflictResolution: {},
            });

            const updatedSession = await this.collaborationService.addParticipant(
                session.id,
                data.userId,
                client.id
            );

            const roomName = `document-${data.documentId}`;
            await client.join(roomName);

            this.userSessions.set(client.id, session.id);
            if (!this.sessionRooms.has(session.id)) {
                this.sessionRooms.set(session.id, new Set());
            }
            this.sessionRooms.get(session.id)!.add(client.id);

            this.server.to(roomName).emit('user-joined', {
                userId: data.userId,
                sessionId: session.id,
                participants: updatedSession.participants
            });

            client.emit('session-joined', {
                sessionId: session.id,
                currentState: updatedSession.currentState,
                participants: updatedSession.participants
            });

            await this.synchronizeDocumentState(data.documentId, client);

            this.logger.log(`User ${data.userId} successfully joined document ${data.documentId}`);
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
            const sessionId = data.sessionId || this.userSessions.get(client.id);
            if (!sessionId) return;

            const userId = data.userId || 'temp-user-id'; // Use provided userId

            const updatedSession = await this.collaborationService.removeParticipant(sessionId, userId);

            const roomName = `document-${updatedSession.documentId}`;
            await client.leave(roomName);

            this.userSessions.delete(client.id);
            this.sessionRooms.get(sessionId)?.delete(client.id);

            this.server.to(roomName).emit('user-left', {
                userId,
                sessionId,
                participants: updatedSession.participants
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
            const { sessionId, operation, userId, documentId, version } = data;
            this.logger.log(`Text operation from user ${userId} in session ${sessionId}`);

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
                userId,
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
    ) {
        try {
            const { sessionId, userId, position, selection } = data;

            await this.collaborationService.updateCursorPosition(sessionId, userId, position);

            const sessionRoomSockets = this.sessionRooms.get(sessionId);
            if (sessionRoomSockets) {
                const session = await this.prisma.collaborationSession.findUnique({
                    where: { id: sessionId },
                    select: { documentId: true }
                });

                if (session) {
                    const roomName = `document-${session.documentId}`;
                    this.server.to(roomName).emit('cursor-updated', {
                        userId,
                        position,
                        selection,
                        timestamp: new Date()
                    });
                }
            }

            this.logger.log(`Cursor position updated for user ${userId} at position ${position}`);
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
        }
    ) {
        try {
            const { sessionId, userId, isTyping } = data;

            await this.collaborationService.updateTypingStatus(sessionId, userId, isTyping);

            const sessionRoomSockets = this.sessionRooms.get(sessionId);
            if (sessionRoomSockets) {
                const session = await this.prisma.collaborationSession.findUnique({
                    where: { id: sessionId },
                    select: { documentId: true }
                });

                if (session) {
                    const roomName = `document-${session.documentId}`;
                    this.server.to(roomName).emit('typing-status-changed', {
                        userId,
                        isTyping,
                        timestamp: new Date()
                    });
                }
            }

            this.logger.log(`Typing status updated for user ${userId}: ${isTyping ? 'started' : 'stopped'} typing`);
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
            const { operation, documentId } = data;

            if (!OperationTransformUtils.validateOperation(operation)) {
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
            await this.processAndBroadcastOperation(operation, session.id, client.id);

            client.emit('desktop-operation-success', {
                operationId: operation.id,
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
            const { documentId } = data;
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
            const { documentId, fromVersion } = data;
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
            const { documentId } = data;
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
                const senderSocket = this.server.sockets.sockets.get(senderSocketId);
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
            const senderSocket = this.server.sockets.sockets.get(senderSocketId);
            senderSocket?.emit('operation-confirmed', {
                operationId: operation.id,
                success: true,
                newVersion: operationResult.newVersion,
                transformedOperation: operationResult.transformedOperation
            });

        } catch (error) {
            this.logger.error(`Error processing operation: ${error.message}`);
            const senderSocket = this.server.sockets.sockets.get(senderSocketId);
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

            // 4. Enrich collaborator data with user info
            return collaborators.map(collaborator => {
                const user = users.find(u => u.id === collaborator.userId);
                return {
                    ...collaborator,
                    userName: user?.fullName || 'Unknown User',
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