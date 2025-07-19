import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CreateCollaborationDto } from "../dto/create-collaboration.dto";
import { CollaborationResponse } from "../dto/collaboration.response";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { COLLABORATION_MESSAGES } from "../constants/collaboration.messages";
import { SessionData } from "../interfaces/collaborations.interface";

@Injectable()
export class CollaborationService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async getOrCreateSession(documentId: string, data: CreateCollaborationDto): Promise<CollaborationResponse> {
        const collaborationSession = await this.prisma.collaborationSession.findFirst({
            where: {
                documentId,
                isActive: true
            }
        })

        if (collaborationSession) {
            return collaborationSession as CollaborationResponse;
        }

        const createdSession = await this.prisma.collaborationSession.create({
            data: {
                documentId,
                ...data,
                participants: data.participants ?? {},
                operationLog: data.operationLog ?? {},
                currentState: data.currentState ?? {},
                sessionData: data.sessionData ?? {},
                conflictResolution: data.conflictResolution ?? {},
            }
        })

        return createdSession as CollaborationResponse
    }

    async addParticipant(sessionId: string, userId: string, socketId: string): Promise<CollaborationResponse> {
        const session = await this.prisma.collaborationSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            throw new CustomHttpException(COLLABORATION_MESSAGES.SESSION_NOT_FOUND, 404, COLLABORATION_MESSAGES.SESSION_NOT_FOUND);
        }

        const currentParticipants = (session.participants as any[]) || [];

        const existingIndex = currentParticipants.findIndex((p: any) => p.userId === userId);

        let updatedParticipants;
        if (existingIndex >= 0) {
            updatedParticipants = [...currentParticipants];
            updatedParticipants[existingIndex] = {
                ...updatedParticipants[existingIndex],
                socketId,
                lastSeen: new Date()
            };
        } else {
            updatedParticipants = [
                ...currentParticipants,
                {
                    userId,
                    socketId,
                    joinedAt: new Date(),
                    lastSeen: new Date(),
                    isTyping: false,
                    cursorPosition: null
                }
            ];
        }

        const updatedSession = await this.prisma.collaborationSession.update({
            where: { id: sessionId },
            data: {
                participants: updatedParticipants,
                lastActivity: new Date()
            }
        });

        return updatedSession as CollaborationResponse;
    }

    async removeParticipant(sessionId: string, userId: string): Promise<CollaborationResponse> {
        const session = await this.prisma.collaborationSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            throw new CustomHttpException(COLLABORATION_MESSAGES.SESSION_NOT_FOUND, 404, COLLABORATION_MESSAGES.SESSION_NOT_FOUND);
        }

        const currentParticipants = (session.participants as any[]) || [];
        const updatedParticipants = currentParticipants.filter((p: any) => p.userId !== userId);

        const isLastParticipant = updatedParticipants.length === 0;

        const updatedSession = await this.prisma.collaborationSession.update({
            where: { id: sessionId },
            data: {
                participants: updatedParticipants,
                isActive: !isLastParticipant,
                endedAt: isLastParticipant ? new Date() : null,
                lastActivity: new Date()
            }
        });

        return updatedSession as CollaborationResponse;
    }

    async addOperation(sessionId: string, data: any): Promise<CollaborationResponse> {
        const session = await this.prisma.collaborationSession.findUnique({
            where: {
                id: sessionId
            }
        })

        if (!session) {
            throw new CustomHttpException(COLLABORATION_MESSAGES.SESSION_NOT_FOUND, 404, COLLABORATION_MESSAGES.SESSION_NOT_FOUND);
        }

        const updatedSession = await this.prisma.collaborationSession.update({
            where: {
                id: sessionId
            },
            data: {
                operationLog: [
                    ...(session.operationLog as any[]),
                    { ...data, timestamp: new Date() }
                ]
            }
        })

        return updatedSession as CollaborationResponse
    }

    async updateCursorPosition(sessionId: string, userId: string, position: number): Promise<void> {
        const session = await this.prisma.collaborationSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            throw new CustomHttpException(
                COLLABORATION_MESSAGES.SESSION_NOT_FOUND,
                404,
                COLLABORATION_MESSAGES.SESSION_NOT_FOUND
            );
        }

        const currentSessionData = (session.sessionData as SessionData) || {};

        const updatedSessionData: SessionData = {
            ...currentSessionData,
            cursors: {
                ...currentSessionData.cursors,
                [userId]: {
                    ...currentSessionData.cursors?.[userId],
                    position,
                    lastUpdate: new Date(),
                    color: currentSessionData.cursors?.[userId]?.color || '#000000'
                }
            }
        };

        await this.prisma.collaborationSession.update({
            where: { id: sessionId },
            data: { sessionData: updatedSessionData as any }
        });
    }

    async updateTypingStatus(sessionId: string, userId: string, isTyping: boolean): Promise<void> {
        const session = await this.prisma.collaborationSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            throw new CustomHttpException(COLLABORATION_MESSAGES.SESSION_NOT_FOUND, 404, COLLABORATION_MESSAGES.SESSION_NOT_FOUND);
        }

        const currentParticipants = (session.participants as any[]) || [];
        const updatedParticipants = currentParticipants.map((p: any) =>
            p.userId === userId
                ? { ...p, isTyping, lastSeen: new Date() }
                : p
        );

        await this.prisma.collaborationSession.update({
            where: { id: sessionId },
            data: {
                participants: updatedParticipants,
                lastActivity: new Date()
            }
        });
    }

    async updateDocumentStatus(sessionId: string, newState: any): Promise<CollaborationResponse> {
        const session = await this.prisma.collaborationSession.findUnique({
            where: {
                id: sessionId
            }
        })

        if (!session) {
            throw new CustomHttpException(COLLABORATION_MESSAGES.SESSION_NOT_FOUND, 404, COLLABORATION_MESSAGES.SESSION_NOT_FOUND);
        }

        const updatedSession = await this.prisma.collaborationSession.update({
            where: {
                id: sessionId,
            },
            data: {
                currentState: newState
            }
        })

        return updatedSession as CollaborationResponse
    }

    async cleanupInactiveSessions(): Promise<void> {
        await this.prisma.collaborationSession.updateMany({
            where: {
                isActive: false,
                lastActivity: {
                    lt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day
                }
            },
            data: {
                isActive: false,
                endedAt: new Date()
            }
        })
    }

    async endSession(sessionId: string): Promise<void> {
        await this.prisma.collaborationSession.update({
            where: {
                id: sessionId
            },
            data: {
                isActive: false,
                endedAt: new Date()
            }
        })
    }
}