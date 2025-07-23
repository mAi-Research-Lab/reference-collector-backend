import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { SyncSessionResponse } from './dto/sync-session.response';
import { OfficeDocumentsService } from '../office-integration/services/office-integration.service';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { SYNC_SESSION_MESSAGES } from './constants/sync-session.messages';
import { SyncSessionStatus } from 'generated/prisma';
import { StartSyncDto } from './dto/start-sync.dto';
import { UpdateSyncProgressDto } from './dto/update-sync-progress.dto';
import { CompleteSyncDto } from './dto/complete-sync.dto';
import { SyncConflictDto } from './dto/sync-conflict.dto';
import { ConflictData } from './interfaces/conflict-data';
import { ConflictResolutionService } from './services/conflict-resolution.service';

@Injectable()
export class SyncSessionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly officeDocumentService: OfficeDocumentsService,
        private readonly conflictResolutionService: ConflictResolutionService
    ) { }

    async getSyncSessionById(sessionId: string): Promise<SyncSessionResponse> {
        const session = await this.prisma.syncSessions.findUnique({
            where: {
                id: sessionId
            }
        });

        if (!session) {
            throw new CustomHttpException(SYNC_SESSION_MESSAGES.SYNC_SESSION_NOT_FOUND, 404, SYNC_SESSION_MESSAGES.SYNC_SESSION_NOT_FOUND);
        }

        return this.mapToSyncSessionResponse(session);
    }

    async startSyncSession(userId: string, officeDocumentId: string, data: StartSyncDto): Promise<SyncSessionResponse> {
        await this.officeDocumentService.getDocumentById(officeDocumentId, userId);

        const syncSession = await this.prisma.syncSessions.findFirst({
            where: {
                userId,
                officeDocumentId
            }
        });

        if (syncSession) {
            throw new CustomHttpException(SYNC_SESSION_MESSAGES.SYNC_SESSION_ALREADY_EXISTS, 409, SYNC_SESSION_MESSAGES.SYNC_SESSION_ALREADY_EXISTS);
        }

        const newSession = await this.prisma.syncSessions.create({
            data: {
                userId,
                officeDocumentId,
                status: SyncSessionStatus.running,
                syncData: data.syncData || {},
                conflicts: data.conflicts || [],
                platformType: data.platformType,
                syncType: data.syncType,
                resolutionStrategy: data.resolutionStrategy
            }
        });

        return this.mapToSyncSessionResponse(newSession);

    }

    async updateSyncProgress(sessionId: string, progress: UpdateSyncProgressDto): Promise<SyncSessionResponse> {
        await this.getSyncSessionById(sessionId);

        const updatedProgress = {
            itemSynced: progress.itemsSynced,
            errorsCount: progress.errorsCount,
            syncData: progress.syncData || {},
            conflicts: progress.conflicts || [],
        };

        const updatedSession = await this.prisma.syncSessions.update({
            where: {
                id: sessionId
            },
            data: {
                ...updatedProgress,
                conflicts: updatedProgress.conflicts as any
            }
        })

        // conflict save ?

        return this.mapToSyncSessionResponse(updatedSession);
    }

    async completeSyncSession(sessionId: string, result: CompleteSyncDto): Promise<SyncSessionResponse> {
        await this.getSyncSessionById(sessionId);

        const updatedSession = await this.prisma.syncSessions.update({
            where: {
                id: sessionId
            },
            data: {
                ...result,
                completedAt: new Date()
            }
        })

        // final statics ?

        return this.mapToSyncSessionResponse(updatedSession);
    }

    async getSyncHistory(userId: string, officeDocumentId?: string): Promise<SyncSessionResponse[]> {

        const history = await this.prisma.syncSessions.findMany({
            where: {
                userId,
                ...(officeDocumentId && { officeDocumentId })
            },
            include: {
                officeDocument: true
            },
            orderBy: {
                startedAt: 'desc'
            }
        })
        return history.map(session => this.mapToSyncSessionResponse(session));
    }

    async getActiveSyncSessions(userId: string): Promise<SyncSessionResponse[]> {
        const sessions = await this.prisma.syncSessions.findMany({
            where: {
                userId,
                status: SyncSessionStatus.running
            },
            include: {
                officeDocument: true
            },
            orderBy: {
                startedAt: 'desc'
            }
        });

        return sessions.map(session => this.mapToSyncSessionResponse(session));
    }

    async handleSyncConflict(
        sessionId: string,
        conflict: SyncConflictDto
    ): Promise<SyncSessionResponse> {

        const session = await this.getSyncSessionById(sessionId);

        const conflictData: ConflictData = {
            id: `conflict_${Date.now()}`,
            type: conflict.conflictType,
            field: conflict.field,
            wordVersion: conflict.wordVersion,
            webVersion: conflict.webVersion,
            timestamp: conflict.metadata?.timestamp ? {
                word: conflict.metadata.timestamp,
                web: new Date().toISOString()
            } : undefined,
            status: 'pending'
        };

        const resolvedConflicts = this.conflictResolutionService.resolveConflicts(
            [conflictData],
            session.resolutionStrategy
        );

        const currentConflicts = Array.isArray(session.conflicts) ? session.conflicts : [];
        const updatedConflicts = [...currentConflicts, ...resolvedConflicts];

        const updatedSession = await this.prisma.syncSessions.update({
            where: { id: sessionId },
            data: {
                conflicts: updatedConflicts as any
            }
        })

        return this.mapToSyncSessionResponse(updatedSession);
    }

    async cancelSyncSession(sessionId: string, userId: string): Promise<{ message: string }> {
        const session = await this.getSyncSessionById(sessionId);

        if (session.userId !== userId) {
            throw new CustomHttpException(SYNC_SESSION_MESSAGES.NOT_YOUR_SESSION, 404, SYNC_SESSION_MESSAGES.NOT_YOUR_SESSION);
        }

        await this.prisma.syncSessions.update({
            where: { id: sessionId },
            data: {
                status: SyncSessionStatus.failed,
            }
        })

        return { message: SYNC_SESSION_MESSAGES.SYNC_SESSION_CANCELLED_SUCCESSFULLY };
    }


    private mapToSyncSessionResponse(session: any): SyncSessionResponse {
        return {
            id: session.id,
            userId: session.userId,
            officeDocumentId: session.officeDocumentId,
            platformType: session.platformType,
            syncType: session.syncType,
            syncData: session.syncData,
            conflicts: Array.isArray(session.conflicts) ? session.conflicts : [],
            resolutionStrategy: session.resolutionStrategy,
            itemsSynced: session.itemsSynced || 0,
            errorsCount: session.errorsCount || 0,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
            status: session.status
        };
    }
}
