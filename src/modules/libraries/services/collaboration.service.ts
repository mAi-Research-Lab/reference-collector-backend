import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import {
    CollaborationSettingsDto,
    ShareScope,
    AccessLevel
} from '../dto/sharing/advanced-sharing.dto';
import {
    CollaborationActivityDto,
    CollaborationStatsDto,
    SharePermissionSummaryDto
} from '../dto/sharing/advanced-sharing-response.dto';

@Injectable()
export class CollaborationService {
    constructor(private readonly prisma: PrismaService) {}

    async getLibraryCollaborationSettings(
        libraryId: string,
        userId: string
    ): Promise<CollaborationSettingsDto> {
        // Check if user has access to library
        await this.validateLibraryAccess(userId, libraryId);

        const settings = await this.prisma.libraryCollaborationSettings.findUnique({
            where: { libraryId }
        });

        if (!settings) {
            // Return default settings
            return {
                allowComments: true,
                allowSuggestions: true,
                requireApproval: false,
                notifyOnChanges: true,
                defaultAccessLevel: AccessLevel.READ,
                defaultExpirationDays: 30
            };
        }

        return {
            allowComments: settings.allowComments,
            allowSuggestions: settings.allowSuggestions,
            requireApproval: settings.requireApproval,
            notifyOnChanges: settings.notifyOnChanges,
            defaultAccessLevel: settings.defaultAccessLevel as AccessLevel,
            defaultExpirationDays: settings.defaultExpirationDays || undefined
        };
    }

    async updateLibraryCollaborationSettings(
        libraryId: string,
        userId: string,
        settings: CollaborationSettingsDto
    ): Promise<CollaborationSettingsDto> {
        // Check if user has admin access to library
        await this.validateLibraryAdminAccess(userId, libraryId);

        const updatedSettings = await this.prisma.libraryCollaborationSettings.upsert({
            where: { libraryId },
            create: {
                libraryId,
                allowComments: settings.allowComments ?? true,
                allowSuggestions: settings.allowSuggestions ?? true,
                requireApproval: settings.requireApproval ?? false,
                notifyOnChanges: settings.notifyOnChanges ?? true,
                defaultAccessLevel: settings.defaultAccessLevel ?? AccessLevel.READ,
                defaultExpirationDays: settings.defaultExpirationDays
            },
            update: {
                allowComments: settings.allowComments,
                allowSuggestions: settings.allowSuggestions,
                requireApproval: settings.requireApproval,
                notifyOnChanges: settings.notifyOnChanges,
                defaultAccessLevel: settings.defaultAccessLevel,
                defaultExpirationDays: settings.defaultExpirationDays
            }
        });

        return {
            allowComments: updatedSettings.allowComments,
            allowSuggestions: updatedSettings.allowSuggestions,
            requireApproval: updatedSettings.requireApproval,
            notifyOnChanges: updatedSettings.notifyOnChanges,
            defaultAccessLevel: updatedSettings.defaultAccessLevel as AccessLevel,
            defaultExpirationDays: updatedSettings.defaultExpirationDays || undefined
        };
    }

    async getCollaborationStats(
        libraryId: string,
        userId: string
    ): Promise<CollaborationStatsDto> {
        await this.validateLibraryAccess(userId, libraryId);

        // Get basic collaboration statistics
        const [
            totalCollaborators,
            activeCollaborators,
            pendingInvitations,
            recentActivity
        ] = await Promise.all([
            this.getTotalCollaborators(libraryId),
            this.getActiveCollaborators(libraryId),
            this.getPendingInvitations(libraryId),
            this.getRecentActivity(libraryId, 10)
        ]);

        return {
            totalCollaborators,
            activeCollaborators,
            pendingInvitations,
            totalComments: 0, // Mock - would count actual comments
            totalSuggestions: 0, // Mock - would count actual suggestions
            recentActivity,
            collaboratorsByRole: {
                admin: Math.floor(totalCollaborators * 0.1),
                editor: Math.floor(totalCollaborators * 0.3),
                viewer: Math.floor(totalCollaborators * 0.6)
            },
            activityByDay: this.generateMockActivityChart(30)
        };
    }

    async getLibraryCollaborators(
        libraryId: string,
        userId: string
    ): Promise<SharePermissionSummaryDto[]> {
        await this.validateLibraryAccess(userId, libraryId);

        const memberships = await this.prisma.libraryMemberships.findMany({
            where: { libraryId },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        lastLogin: true
                    }
                }
            }
        });

        return memberships.map(membership => ({
            userId: membership.userId,
            userName: membership.user.fullName,
            userEmail: membership.user.email,
            accessLevel: this.mapRoleToAccessLevel(membership.role),
            permissions: this.extractPermissions(membership.permissions as any),
            shareCount: 1, // Mock - would count actual shares
            lastActivity: membership.user.lastLogin?.toISOString() || new Date().toISOString(),
            expiresAt: undefined, // Would be set if membership has expiration
            isActive: true
        }));
    }

    async logCollaborationActivity(
        shareId: string,
        userId: string,
        action: string,
        resourceType: string,
        resourceId: string,
        details?: Record<string, any>,
        comment?: string
    ): Promise<void> {
        await this.prisma.collaborationLogs.create({
            data: {
                shareId,
                userId,
                action,
                resourceType,
                resourceId,
                details: details || {},
                comment
            }
        });
    }

    async getCollaborationActivity(
        libraryId: string,
        userId: string,
        limit: number = 50
    ): Promise<CollaborationActivityDto[]> {
        await this.validateLibraryAccess(userId, libraryId);

        // Get shares for this library
        const shares = await this.prisma.advancedShares.findMany({
            where: {
                scope: ShareScope.LIBRARY,
                resourceId: libraryId
            },
            select: { id: true }
        });

        const shareIds = shares.map(s => s.id);

        const activities = await this.prisma.collaborationLogs.findMany({
            where: {
                shareId: { in: shareIds }
            },
            take: limit,
            orderBy: { timestamp: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        return activities.map(activity => ({
            id: activity.id,
            userId: activity.userId,
            userName: activity.user.fullName,
            userAvatar: activity.user.avatarUrl || undefined,
            action: activity.action,
            resourceType: activity.resourceType,
            resourceId: activity.resourceId,
            resourceName: 'Unknown Resource', // Would be fetched based on type
            details: activity.details as Record<string, any>,
            timestamp: activity.timestamp.toISOString(),
            comment: activity.comment || undefined
        }));
    }

    private async validateLibraryAccess(userId: string, libraryId: string): Promise<void> {
        const library = await this.prisma.libraries.findFirst({
            where: {
                id: libraryId,
                isDeleted: false,
                OR: [
                    { ownerId: userId },
                    {
                        memberships: {
                            some: { userId }
                        }
                    }
                ]
            }
        });

        if (!library) {
            throw new CustomHttpException('Library not found or access denied', 404, 'LIBRARY_ACCESS_DENIED');
        }
    }

    private async validateLibraryAdminAccess(userId: string, libraryId: string): Promise<void> {
        const library = await this.prisma.libraries.findFirst({
            where: {
                id: libraryId,
                isDeleted: false,
                OR: [
                    { ownerId: userId },
                    {
                        memberships: {
                            some: {
                                userId,
                                role: { in: ['owner', 'admin'] }
                            }
                        }
                    }
                ]
            }
        });

        if (!library) {
            throw new CustomHttpException('Admin access required', 403, 'ADMIN_ACCESS_REQUIRED');
        }
    }

    private async getTotalCollaborators(libraryId: string): Promise<number> {
        return await this.prisma.libraryMemberships.count({
            where: { libraryId }
        });
    }

    private async getActiveCollaborators(libraryId: string): Promise<number> {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return await this.prisma.libraryMemberships.count({
            where: {
                libraryId,
                user: {
                    lastLogin: { gte: oneWeekAgo }
                }
            }
        });
    }

    private async getPendingInvitations(libraryId: string): Promise<number> {
        return await this.prisma.libraryInvitations.count({
            where: {
                libraryId,
                acceptedAt: null,
                expiresAt: { gt: new Date() }
            }
        });
    }

    private async getRecentActivity(libraryId: string, limit: number): Promise<CollaborationActivityDto[]> {
        // Mock implementation - would get actual recent activity
        return [];
    }

    private mapRoleToAccessLevel(role: string): AccessLevel {
        switch (role) {
            case 'owner':
            case 'admin':
                return AccessLevel.ADMIN;
            case 'editor':
                return AccessLevel.EDIT;
            case 'viewer':
                return AccessLevel.READ;
            default:
                return AccessLevel.READ;
        }
    }

    private extractPermissions(permissions: Record<string, any>): {
        canRead: boolean;
        canEdit: boolean;
        canComment: boolean;
        canDownload: boolean;
        canExport: boolean;
        canShare: boolean;
        canAdmin: boolean;
    } {
        return {
            canRead: permissions?.read ?? true,
            canEdit: permissions?.write ?? false,
            canComment: permissions?.comment ?? true,
            canDownload: permissions?.download ?? true,
            canExport: permissions?.export ?? false,
            canShare: permissions?.share ?? false,
            canAdmin: permissions?.admin ?? false
        };
    }

    private generateMockActivityChart(days: number): Array<{ date: string; count: number }> {
        const chart: Array<{ date: string; count: number }> = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const count = Math.floor(Math.random() * 20);
            chart.push({ date: dateStr, count });
        }

        return chart;
    }
}
