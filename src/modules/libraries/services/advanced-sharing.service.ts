import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { LIBRARY_MESSAGES } from '../constants/library.messages';
import {
    CreateAdvancedShareDto,
    UpdateSharePermissionsDto,
    BulkShareDto,
    ShareAnalyticsQueryDto,
    CollaborationSettingsDto,
    ShareScope,
    ShareType,
    AccessLevel
} from '../dto/sharing/advanced-sharing.dto';
import {
    ShareResponseDto,
    ShareAnalyticsDto,
    CollaborationActivityDto,
    SharePermissionSummaryDto,
    BulkShareResultDto,
    ShareLinkResponseDto,
    CollaborationStatsDto,
    ShareSearchResultDto
} from '../dto/sharing/advanced-sharing-response.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AdvancedSharingService {
    constructor(private readonly prisma: PrismaService) {}

    async createShare(
        userId: string,
        createShareDto: CreateAdvancedShareDto
    ): Promise<ShareResponseDto> {
        // Validate resource exists and user has permission
        await this.validateResourceAccess(userId, createShareDto.scope, createShareDto.resourceId);

        // Generate share URL for link shares
        let shareUrl: string | undefined;
        let shortUrl: string | undefined;
        let qrCode: string | undefined;

        if (createShareDto.shareType === ShareType.LINK || createShareDto.shareType === ShareType.PUBLIC) {
            const shareToken = randomBytes(32).toString('hex');
            shareUrl = `${process.env.FRONTEND_URL}/shared/${shareToken}`;
            shortUrl = `${process.env.SHORT_URL_BASE}/${shareToken.substring(0, 8)}`;
            // In real implementation, generate QR code
            qrCode = `data:image/svg+xml;base64,${Buffer.from('<svg></svg>').toString('base64')}`;
        }

        // Get resource name
        const resourceName = await this.getResourceName(createShareDto.scope, createShareDto.resourceId);

        const share = await this.prisma.advancedShares.create({
            data: {
                shareType: createShareDto.shareType,
                scope: createShareDto.scope,
                resourceId: createShareDto.resourceId,
                resourceName,
                recipientEmail: createShareDto.recipientEmail,
                recipientUserId: createShareDto.recipientUserId,
                accessLevel: createShareDto.accessLevel,
                granularPermissions: createShareDto.granularPermissions ? JSON.parse(JSON.stringify(createShareDto.granularPermissions)) : {},
                linkSettings: createShareDto.linkSettings ? JSON.parse(JSON.stringify(createShareDto.linkSettings)) : {},
                shareUrl,
                shortUrl,
                qrCode,
                createdBy: userId,
                message: createShareDto.message,
                expiresAt: createShareDto.expiresAt ? new Date(createShareDto.expiresAt) : null,
                maxUses: createShareDto.linkSettings?.maxUses || null
            },
            include: {
                creator: {
                    select: { id: true, fullName: true }
                },
                recipient: {
                    select: { id: true, fullName: true, email: true }
                }
            }
        });

        // Send notification if requested
        if (createShareDto.notifyRecipient && createShareDto.recipientEmail) {
            await this.sendShareNotification(share.id, createShareDto.recipientEmail);
        }

        return this.formatShareResponse(share);
    }

    async getShares(
        userId: string,
        page: number = 1,
        limit: number = 20,
        filters?: {
            scope?: ShareScope;
            shareType?: ShareType;
            accessLevel?: AccessLevel;
            isActive?: boolean;
            isExpired?: boolean;
        }
    ): Promise<ShareSearchResultDto> {
        const skip = (page - 1) * limit;
        const where: any = {
            createdBy: userId
        };

        if (filters) {
            if (filters.scope) where.scope = filters.scope;
            if (filters.shareType) where.shareType = filters.shareType;
            if (filters.accessLevel) where.accessLevel = filters.accessLevel;
            if (filters.isActive !== undefined) where.isActive = filters.isActive;
            if (filters.isExpired !== undefined) {
                if (filters.isExpired) {
                    where.expiresAt = { lt: new Date() };
                } else {
                    where.OR = [
                        { expiresAt: null },
                        { expiresAt: { gte: new Date() } }
                    ];
                }
            }
        }

        const [shares, total] = await Promise.all([
            this.prisma.advancedShares.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: { select: { id: true, fullName: true } },
                    recipient: { select: { id: true, fullName: true, email: true } }
                }
            }),
            this.prisma.advancedShares.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            shares: shares.map(share => this.formatShareResponse(share)),
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
            filters: filters || {}
        };
    }

    async updateSharePermissions(
        shareId: string,
        userId: string,
        updateDto: UpdateSharePermissionsDto
    ): Promise<ShareResponseDto> {
        const share = await this.prisma.advancedShares.findFirst({
            where: { id: shareId, createdBy: userId }
        });

        if (!share) {
            throw new CustomHttpException('Share not found', 404, 'SHARE_NOT_FOUND');
        }

        const updatedShare = await this.prisma.advancedShares.update({
            where: { id: shareId },
            data: {
                accessLevel: updateDto.accessLevel,
                granularPermissions: updateDto.granularPermissions ?
                    JSON.parse(JSON.stringify(updateDto.granularPermissions)) :
                    share.granularPermissions,
                expiresAt: updateDto.expiresAt ? new Date(updateDto.expiresAt) : share.expiresAt,
                isActive: updateDto.isActive !== undefined ? updateDto.isActive : share.isActive
            },
            include: {
                creator: { select: { id: true, fullName: true } },
                recipient: { select: { id: true, fullName: true, email: true } }
            }
        });

        return this.formatShareResponse(updatedShare);
    }

    async deleteShare(shareId: string, userId: string): Promise<{ message: string }> {
        const share = await this.prisma.advancedShares.findFirst({
            where: { id: shareId, createdBy: userId }
        });

        if (!share) {
            throw new CustomHttpException('Share not found', 404, 'SHARE_NOT_FOUND');
        }

        await this.prisma.advancedShares.delete({
            where: { id: shareId }
        });

        return { message: 'Share deleted successfully' };
    }

    async bulkShare(
        userId: string,
        bulkShareDto: BulkShareDto
    ): Promise<BulkShareResultDto> {
        const results: BulkShareResultDto = {
            successCount: 0,
            failureCount: 0,
            totalRequested: bulkShareDto.resourceIds.length * bulkShareDto.recipientEmails.length,
            successfulShares: [],
            failures: [],
            summary: {
                resourcesShared: 0,
                recipientsNotified: 0,
                linksGenerated: 0
            }
        };

        for (const resourceId of bulkShareDto.resourceIds) {
            for (const recipientEmail of bulkShareDto.recipientEmails) {
                try {
                    const shareDto: CreateAdvancedShareDto = {
                        shareType: ShareType.DIRECT,
                        scope: bulkShareDto.scope,
                        resourceId,
                        recipientEmail,
                        accessLevel: bulkShareDto.accessLevel,
                        message: bulkShareDto.message,
                        expiresAt: bulkShareDto.expiresAt,
                        notifyRecipient: true
                    };

                    const share = await this.createShare(userId, shareDto);
                    results.successfulShares.push(share);
                    results.successCount++;
                    results.summary.recipientsNotified++;
                } catch (error) {
                    results.failures.push({
                        resourceId,
                        recipientEmail,
                        error: error.message || 'Unknown error'
                    });
                    results.failureCount++;
                }
            }
        }

        results.summary.resourcesShared = new Set(
            results.successfulShares.map(s => s.resourceId)
        ).size;

        return results;
    }

    async getShareAnalytics(
        userId: string,
        query: ShareAnalyticsQueryDto
    ): Promise<ShareAnalyticsDto> {
        const where: any = { createdBy: userId };

        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate) where.createdAt.gte = new Date(query.startDate);
            if (query.endDate) where.createdAt.lte = new Date(query.endDate);
        }

        if (query.scope) where.scope = query.scope;
        if (query.shareType) where.shareType = query.shareType;

        // Get basic counts
        const [totalShares, activeShares, expiredShares] = await Promise.all([
            this.prisma.advancedShares.count({ where }),
            this.prisma.advancedShares.count({ where: { ...where, isActive: true } }),
            this.prisma.advancedShares.count({
                where: { ...where, expiresAt: { lt: new Date() } }
            })
        ]);

        // Mock implementation for other analytics
        const sharesByType = {
            [ShareType.DIRECT]: Math.floor(totalShares * 0.6),
            [ShareType.LINK]: Math.floor(totalShares * 0.3),
            [ShareType.PUBLIC]: Math.floor(totalShares * 0.08),
            [ShareType.INSTITUTIONAL]: Math.floor(totalShares * 0.02)
        };

        const sharesByScope = {
            [ShareScope.LIBRARY]: Math.floor(totalShares * 0.4),
            [ShareScope.COLLECTION]: Math.floor(totalShares * 0.35),
            [ShareScope.REFERENCE]: Math.floor(totalShares * 0.25)
        };

        return {
            totalShares,
            activeShares,
            expiredShares,
            totalAccesses: totalShares * 3, // Mock
            uniqueUsers: Math.floor(totalShares * 0.7), // Mock
            sharesByType,
            sharesByScope,
            accessesByDay: this.generateMockChart(30),
            topSharedResources: [],
            collaboratorActivity: []
        };
    }

    private async validateResourceAccess(
        userId: string,
        scope: ShareScope,
        resourceId: string
    ): Promise<void> {
        // Implementation would check if user has access to the resource
        // For now, just check if resource exists
        let exists = false;

        switch (scope) {
            case ShareScope.LIBRARY:
                exists = !!(await this.prisma.libraries.findFirst({
                    where: { id: resourceId, isDeleted: false }
                }));
                break;
            case ShareScope.COLLECTION:
                exists = !!(await this.prisma.collections.findFirst({
                    where: { id: resourceId }
                }));
                break;
            case ShareScope.REFERENCE:
                exists = !!(await this.prisma.references.findFirst({
                    where: { id: resourceId }
                }));
                break;
        }

        if (!exists) {
            throw new CustomHttpException('Resource not found', 404, 'RESOURCE_NOT_FOUND');
        }
    }

    private async getResourceName(scope: ShareScope, resourceId: string): Promise<string> {
        switch (scope) {
            case ShareScope.LIBRARY:
                const library = await this.prisma.libraries.findFirst({
                    where: { id: resourceId },
                    select: { name: true }
                });
                return library?.name || 'Unknown Library';
            case ShareScope.COLLECTION:
                const collection = await this.prisma.collections.findFirst({
                    where: { id: resourceId },
                    select: { name: true }
                });
                return collection?.name || 'Unknown Collection';
            case ShareScope.REFERENCE:
                const reference = await this.prisma.references.findFirst({
                    where: { id: resourceId },
                    select: { title: true }
                });
                return reference?.title || 'Unknown Reference';
            default:
                return 'Unknown Resource';
        }
    }

    private async sendShareNotification(shareId: string, recipientEmail: string): Promise<void> {
        // Mock implementation - in real app, would send email
        console.log(`Sending share notification to ${recipientEmail} for share ${shareId}`);
    }

    private formatShareResponse(share: any): ShareResponseDto {
        return {
            id: share.id,
            shareType: share.shareType,
            scope: share.scope,
            resourceId: share.resourceId,
            resourceName: share.resourceName,
            recipientEmail: share.recipientEmail,
            recipientUserId: share.recipientUserId,
            recipientName: share.recipient?.fullName,
            accessLevel: share.accessLevel,
            granularPermissions: share.granularPermissions,
            linkSettings: share.linkSettings,
            shareUrl: share.shareUrl,
            createdBy: share.createdBy,
            createdByName: share.creator?.fullName || 'Unknown',
            createdAt: share.createdAt.toISOString(),
            expiresAt: share.expiresAt?.toISOString(),
            isActive: share.isActive,
            lastAccessedAt: share.lastAccessedAt?.toISOString(),
            accessCount: share.accessCount
        };
    }

    private generateMockChart(days: number): Array<{ date: string; count: number }> {
        const chart: Array<{ date: string; count: number }> = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const count = Math.floor(Math.random() * 10);
            chart.push({ date: dateStr, count });
        }

        return chart;
    }
}
