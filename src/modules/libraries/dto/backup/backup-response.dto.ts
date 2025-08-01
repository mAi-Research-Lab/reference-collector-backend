import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BackupType, BackupFormat, BackupStatus, RestoreStrategy } from './backup.dto';

export class BackupResponseDto {
    @ApiProperty({ description: 'Backup ID' })
    id: string;

    @ApiProperty({ description: 'Library ID' })
    libraryId: string;

    @ApiProperty({ description: 'Library name' })
    libraryName: string;

    @ApiProperty({ description: 'Backup name' })
    name: string;

    @ApiPropertyOptional({ description: 'Backup description' })
    description?: string;

    @ApiProperty({ description: 'Backup type', enum: BackupType })
    type: BackupType;

    @ApiProperty({ description: 'Backup format', enum: BackupFormat })
    format: BackupFormat;

    @ApiProperty({ description: 'Backup status', enum: BackupStatus })
    status: BackupStatus;

    @ApiProperty({ description: 'File size in bytes' })
    fileSize: number;

    @ApiProperty({ description: 'File path or URL' })
    filePath: string;

    @ApiPropertyOptional({ description: 'Download URL' })
    downloadUrl?: string;

    @ApiProperty({ description: 'Created by user ID' })
    createdBy: string;

    @ApiProperty({ description: 'Created by user name' })
    createdByName: string;

    @ApiProperty({ description: 'Creation timestamp' })
    createdAt: string;

    @ApiPropertyOptional({ description: 'Completion timestamp' })
    completedAt?: string;

    @ApiPropertyOptional({ description: 'Expiration timestamp' })
    expiresAt?: string;

    @ApiProperty({ description: 'Is compressed' })
    isCompressed: boolean;

    @ApiProperty({ description: 'Is encrypted' })
    isEncrypted: boolean;

    @ApiProperty({ description: 'Includes file attachments' })
    includesFiles: boolean;

    @ApiProperty({ description: 'Includes library settings' })
    includesSettings: boolean;

    @ApiProperty({ description: 'Includes sharing data' })
    includesSharing: boolean;

    @ApiProperty({ description: 'Includes activity logs' })
    includesLogs: boolean;

    @ApiProperty({ description: 'Number of references' })
    referenceCount: number;

    @ApiProperty({ description: 'Number of collections' })
    collectionCount: number;

    @ApiProperty({ description: 'Number of files' })
    fileCount: number;

    @ApiPropertyOptional({ description: 'Error message if failed' })
    errorMessage?: string;

    @ApiPropertyOptional({ description: 'Progress percentage (0-100)' })
    progress?: number;

    @ApiPropertyOptional({ description: 'Estimated completion time' })
    estimatedCompletion?: string;

    @ApiProperty({ description: 'Backup metadata' })
    metadata: {
        version: string;
        appVersion: string;
        schemaVersion: string;
        totalSize: number;
        checksum: string;
    };
}

export class RestoreResponseDto {
    @ApiProperty({ description: 'Restore operation ID' })
    id: string;

    @ApiProperty({ description: 'Backup ID being restored' })
    backupId: string;

    @ApiProperty({ description: 'Target library ID' })
    libraryId: string;

    @ApiProperty({ description: 'Restore strategy', enum: RestoreStrategy })
    strategy: RestoreStrategy;

    @ApiProperty({ description: 'Restore status', enum: BackupStatus })
    status: BackupStatus;

    @ApiProperty({ description: 'Started by user ID' })
    startedBy: string;

    @ApiProperty({ description: 'Started by user name' })
    startedByName: string;

    @ApiProperty({ description: 'Start timestamp' })
    startedAt: string;

    @ApiPropertyOptional({ description: 'Completion timestamp' })
    completedAt?: string;

    @ApiPropertyOptional({ description: 'Progress percentage (0-100)' })
    progress?: number;

    @ApiPropertyOptional({ description: 'Error message if failed' })
    errorMessage?: string;

    @ApiProperty({ description: 'Restore statistics' })
    statistics: {
        totalItems: number;
        processedItems: number;
        successfulItems: number;
        failedItems: number;
        skippedItems: number;
        referencesRestored: number;
        collectionsRestored: number;
        filesRestored: number;
    };

    @ApiPropertyOptional({ description: 'Restore warnings' })
    warnings?: string[];

    @ApiPropertyOptional({ description: 'Items that failed to restore' })
    failures?: Array<{
        type: string;
        id: string;
        name: string;
        error: string;
    }>;
}

export class BackupValidationResponseDto {
    @ApiProperty({ description: 'Backup ID' })
    backupId: string;

    @ApiProperty({ description: 'Is valid backup' })
    isValid: boolean;

    @ApiProperty({ description: 'Backup format', enum: BackupFormat })
    format: BackupFormat;

    @ApiProperty({ description: 'Backup version' })
    version: string;

    @ApiProperty({ description: 'Creation timestamp' })
    createdAt: string;

    @ApiProperty({ description: 'File size in bytes' })
    fileSize: number;

    @ApiProperty({ description: 'Is encrypted' })
    isEncrypted: boolean;

    @ApiProperty({ description: 'Is compressed' })
    isCompressed: boolean;

    @ApiProperty({ description: 'Validation results' })
    validation: {
        structureValid: boolean;
        checksumValid: boolean;
        schemaValid: boolean;
        dataIntegrityValid: boolean;
    };

    @ApiProperty({ description: 'Backup contents summary' })
    contents: {
        libraryName: string;
        referenceCount: number;
        collectionCount: number;
        fileCount: number;
        includesFiles: boolean;
        includesSettings: boolean;
        includesSharing: boolean;
        includesLogs: boolean;
    };

    @ApiPropertyOptional({ description: 'Validation errors' })
    errors?: string[];

    @ApiPropertyOptional({ description: 'Validation warnings' })
    warnings?: string[];

    @ApiPropertyOptional({ description: 'Compatibility issues' })
    compatibility?: {
        isCompatible: boolean;
        requiredVersion: string;
        currentVersion: string;
        issues: string[];
    };
}

export class BackupListResponseDto {
    @ApiProperty({ description: 'List of backups', type: [BackupResponseDto] })
    backups: BackupResponseDto[];

    @ApiProperty({ description: 'Total number of backups' })
    total: number;

    @ApiProperty({ description: 'Current page' })
    page: number;

    @ApiProperty({ description: 'Items per page' })
    limit: number;

    @ApiProperty({ description: 'Total pages' })
    totalPages: number;

    @ApiProperty({ description: 'Has next page' })
    hasNext: boolean;

    @ApiProperty({ description: 'Has previous page' })
    hasPrevious: boolean;

    @ApiProperty({ description: 'Total storage used by backups (bytes)' })
    totalStorageUsed: number;

    @ApiProperty({ description: 'Storage statistics' })
    storageStats: {
        totalBackups: number;
        completedBackups: number;
        failedBackups: number;
        averageSize: number;
        oldestBackup: string;
        newestBackup: string;
    };
}

export class BackupScheduleResponseDto {
    @ApiProperty({ description: 'Schedule ID' })
    id: string;

    @ApiProperty({ description: 'Library ID' })
    libraryId: string;

    @ApiProperty({ description: 'Library name' })
    libraryName: string;

    @ApiProperty({ description: 'Schedule name' })
    name: string;

    @ApiProperty({ description: 'Cron expression' })
    cronExpression: string;

    @ApiProperty({ description: 'Timezone' })
    timezone: string;

    @ApiProperty({ description: 'Is active' })
    isActive: boolean;

    @ApiProperty({ description: 'Backup configuration' })
    backupConfig: {
        type: BackupType;
        format: BackupFormat;
        includeFiles: boolean;
        includeSettings: boolean;
        includeSharing: boolean;
        includeLogs: boolean;
        compress: boolean;
        encrypt: boolean;
    };

    @ApiProperty({ description: 'Auto cleanup settings' })
    autoCleanup: {
        enabled: boolean;
        retentionCount: number;
        retentionDays: number;
    };

    @ApiProperty({ description: 'Created by user ID' })
    createdBy: string;

    @ApiProperty({ description: 'Created by user name' })
    createdByName: string;

    @ApiProperty({ description: 'Creation timestamp' })
    createdAt: string;

    @ApiPropertyOptional({ description: 'Last run timestamp' })
    lastRunAt?: string;

    @ApiPropertyOptional({ description: 'Next run timestamp' })
    nextRunAt?: string;

    @ApiProperty({ description: 'Total runs' })
    totalRuns: number;

    @ApiProperty({ description: 'Successful runs' })
    successfulRuns: number;

    @ApiProperty({ description: 'Failed runs' })
    failedRuns: number;
}

export class ExportResponseDto {
    @ApiProperty({ description: 'Export ID' })
    id: string;

    @ApiProperty({ description: 'Export format', enum: BackupFormat })
    format: BackupFormat;

    @ApiProperty({ description: 'File name' })
    filename: string;

    @ApiProperty({ description: 'File size in bytes' })
    fileSize: number;

    @ApiProperty({ description: 'Download URL' })
    downloadUrl: string;

    @ApiProperty({ description: 'MIME type' })
    mimeType: string;

    @ApiProperty({ description: 'Export timestamp' })
    exportedAt: string;

    @ApiPropertyOptional({ description: 'Expiration timestamp' })
    expiresAt?: string;

    @ApiProperty({ description: 'Export statistics' })
    statistics: {
        totalReferences: number;
        totalCollections: number;
        totalFiles: number;
        includedFiles: boolean;
        includedMetadata: boolean;
    };
}

export class ImportResponseDto {
    @ApiProperty({ description: 'Import operation ID' })
    id: string;

    @ApiProperty({ description: 'Target library ID' })
    libraryId: string;

    @ApiProperty({ description: 'Import strategy', enum: RestoreStrategy })
    strategy: RestoreStrategy;

    @ApiProperty({ description: 'Import status', enum: BackupStatus })
    status: BackupStatus;

    @ApiProperty({ description: 'Started by user ID' })
    startedBy: string;

    @ApiProperty({ description: 'Start timestamp' })
    startedAt: string;

    @ApiPropertyOptional({ description: 'Completion timestamp' })
    completedAt?: string;

    @ApiProperty({ description: 'Import statistics' })
    statistics: {
        totalItems: number;
        processedItems: number;
        successfulItems: number;
        failedItems: number;
        referencesImported: number;
        collectionsImported: number;
        filesImported: number;
    };

    @ApiPropertyOptional({ description: 'Import warnings' })
    warnings?: string[];

    @ApiPropertyOptional({ description: 'Import errors' })
    errors?: string[];
}
