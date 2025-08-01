import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
    ShareScope, 
    AccessLevel, 
    ShareType, 
    GranularPermissionDto, 
    ShareLinkSettingsDto 
} from './advanced-sharing.dto';

export class ShareResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ enum: ShareType })
    shareType: ShareType;

    @ApiProperty({ enum: ShareScope })
    scope: ShareScope;

    @ApiProperty()
    resourceId: string;

    @ApiProperty()
    resourceName: string;

    @ApiPropertyOptional()
    recipientEmail?: string;

    @ApiPropertyOptional()
    recipientUserId?: string;

    @ApiPropertyOptional()
    recipientName?: string;

    @ApiProperty({ enum: AccessLevel })
    accessLevel: AccessLevel;

    @ApiPropertyOptional()
    granularPermissions?: GranularPermissionDto[];

    @ApiPropertyOptional()
    linkSettings?: ShareLinkSettingsDto;

    @ApiPropertyOptional()
    shareUrl?: string;

    @ApiProperty()
    createdBy: string;

    @ApiProperty()
    createdByName: string;

    @ApiProperty()
    createdAt: string;

    @ApiPropertyOptional()
    expiresAt?: string;

    @ApiProperty()
    isActive: boolean;

    @ApiPropertyOptional()
    lastAccessedAt?: string;

    @ApiPropertyOptional()
    accessCount?: number;
}

export class ShareAnalyticsDto {
    @ApiProperty()
    totalShares: number;

    @ApiProperty()
    activeShares: number;

    @ApiProperty()
    expiredShares: number;

    @ApiProperty()
    totalAccesses: number;

    @ApiProperty()
    uniqueUsers: number;

    @ApiProperty()
    sharesByType: Record<ShareType, number>;

    @ApiProperty()
    sharesByScope: Record<ShareScope, number>;

    @ApiProperty()
    accessesByDay: Array<{ date: string; count: number }>;

    @ApiProperty()
    topSharedResources: Array<{
        resourceId: string;
        resourceName: string;
        shareCount: number;
        accessCount: number;
    }>;

    @ApiProperty()
    collaboratorActivity: Array<{
        userId: string;
        userName: string;
        lastActivity: string;
        actionsCount: number;
    }>;
}

export class CollaborationActivityDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    userName: string;

    @ApiProperty()
    userAvatar?: string;

    @ApiProperty()
    action: string;

    @ApiProperty()
    resourceType: string;

    @ApiProperty()
    resourceId: string;

    @ApiProperty()
    resourceName: string;

    @ApiPropertyOptional()
    details?: Record<string, any>;

    @ApiProperty()
    timestamp: string;

    @ApiPropertyOptional()
    comment?: string;
}

export class SharePermissionSummaryDto {
    @ApiProperty()
    userId: string;

    @ApiProperty()
    userName: string;

    @ApiProperty()
    userEmail: string;

    @ApiProperty({ enum: AccessLevel })
    accessLevel: AccessLevel;

    @ApiProperty()
    permissions: {
        canRead: boolean;
        canEdit: boolean;
        canComment: boolean;
        canDownload: boolean;
        canExport: boolean;
        canShare: boolean;
        canAdmin: boolean;
    };

    @ApiProperty()
    shareCount: number;

    @ApiProperty()
    lastActivity: string;

    @ApiPropertyOptional()
    expiresAt?: string;

    @ApiProperty()
    isActive: boolean;
}

export class BulkShareResultDto {
    @ApiProperty()
    successCount: number;

    @ApiProperty()
    failureCount: number;

    @ApiProperty()
    totalRequested: number;

    @ApiProperty()
    successfulShares: ShareResponseDto[];

    @ApiProperty()
    failures: Array<{
        resourceId: string;
        recipientEmail: string;
        error: string;
    }>;

    @ApiProperty()
    summary: {
        resourcesShared: number;
        recipientsNotified: number;
        linksGenerated: number;
    };
}

export class ShareLinkResponseDto {
    @ApiProperty()
    shareId: string;

    @ApiProperty()
    shareUrl: string;

    @ApiProperty()
    shortUrl: string;

    @ApiProperty()
    qrCode: string;

    @ApiPropertyOptional()
    password?: string;

    @ApiProperty()
    expiresAt: string;

    @ApiProperty()
    maxUses: number;

    @ApiProperty()
    currentUses: number;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    settings: ShareLinkSettingsDto;
}

export class CollaborationStatsDto {
    @ApiProperty()
    totalCollaborators: number;

    @ApiProperty()
    activeCollaborators: number;

    @ApiProperty()
    pendingInvitations: number;

    @ApiProperty()
    totalComments: number;

    @ApiProperty()
    totalSuggestions: number;

    @ApiProperty()
    recentActivity: CollaborationActivityDto[];

    @ApiProperty()
    collaboratorsByRole: Record<string, number>;

    @ApiProperty()
    activityByDay: Array<{ date: string; count: number }>;
}

export class ShareSearchResultDto {
    @ApiProperty()
    shares: ShareResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;

    @ApiProperty()
    hasNext: boolean;

    @ApiProperty()
    hasPrevious: boolean;

    @ApiProperty()
    filters: {
        scope?: ShareScope;
        shareType?: ShareType;
        accessLevel?: AccessLevel;
        isActive?: boolean;
        isExpired?: boolean;
    };
}
