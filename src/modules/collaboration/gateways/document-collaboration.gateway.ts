import { Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { CollaborationService } from "../services/collaboration.service";
import { PrismaService } from "src/database/prisma/prisma.service";

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
        private readonly prisma: PrismaService
    ) { }

    async handleDisconnect(client: any) {
        this.logger.log(`Client disconnected: ${client.id}`);

        const sessionId = this.userSessions.get(client.id);
        if (sessionId) {
            await this.handleLeaveDocument({ sessionId }, client);
        }
    }
    handleConnection(client: any, ...args: any[]) {
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

            client.to(roomName).emit('user-joined', {
                userId: data.userId,
                sessionId: session.id,
                participants: updatedSession.participants
            });

            client.emit('session-joined', {
                sessionId: session.id,
                currentState: updatedSession.currentState,
                participants: updatedSession.participants
            });

            this.logger.log(`User ${data.userId} successfully joined document ${data.documentId}`);
        } catch (error) {
            this.logger.error(`Error joining document: ${error.message}`);
            client.emit('error', { message: 'Failed to join document' });
        }
    }

    @SubscribeMessage('leave-document')
    async handleLeaveDocument(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const sessionId = data.sessionId || this.userSessions.get(client.id);
            if (!sessionId) return;

            const userId = 'temp-user-id';

            const updatedSession = await this.collaborationService.removeParticipant(sessionId, userId);

            const roomName = `document-${updatedSession.documentId}`;
            await client.leave(roomName);

            this.userSessions.delete(client.id);
            this.sessionRooms.get(sessionId)?.delete(client.id);

            client.to(roomName).emit('user-left', {
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
            operation: {
                type: 'insert' | 'delete' | 'retain';
                position: number;
                content?: string;
                length?: number;
                attributes?: any;
            };
            userId: string;
        },
        @ConnectedSocket() client: Socket
    ) {
        try {
            const { sessionId, operation, userId } = data;

            this.logger.log(`Text operation from user ${userId} in session ${sessionId}`);

            const session = await this.collaborationService.getSessionById(sessionId);

            const operationWithMetadata = {
                id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                ...operation,
                userId,
                timestamp: new Date(),
                applied: false
            };

            const updatedSession = await this.collaborationService.addOperation(
                sessionId,
                operationWithMetadata
            );

            let currentContent = (updatedSession.currentState as any)?.content || '';

            if (operation.type === 'insert') {
                currentContent =
                    currentContent.slice(0, operation.position) +
                    operation.content +
                    currentContent.slice(operation.position);
            } else if (operation.type === 'delete') {
                currentContent =
                    currentContent.slice(0, operation.position) +
                    currentContent.slice(operation.position + (operation.length || 0));
            }

            const newState = {
                content: currentContent,
                version: ((updatedSession.currentState as any)?.version || 0) + 1,
                lastModified: new Date()
            };

            await this.collaborationService.updateDocumentStatus(sessionId, newState);

            const roomName = `document-${session.documentId}`;
            client.to(roomName).emit('text-operation-applied', {
                operation: operationWithMetadata,
                newState,
                userId
            });

            client.emit('operation-confirmed', {
                operationId: operationWithMetadata.id,
                success: true
            });

            this.logger.log(`Text operation ${operationWithMetadata.id} applied successfully`);
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
        @ConnectedSocket() client: Socket
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
                    client.to(roomName).emit('cursor-updated', {
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
        },
        @ConnectedSocket() client: Socket
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
                    client.to(roomName).emit('typing-status-changed', {
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

}