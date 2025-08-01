import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsArray, IsDateString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum BackupType {
    FULL = 'full',
    INCREMENTAL = 'incremental',
    REFERENCES_ONLY = 'references_only',
    METADATA_ONLY = 'metadata_only'
}

export enum BackupFormat {
    JSON = 'json',
    ZIP = 'zip',
    SQL = 'sql',
    BIBTEX = 'bibtex',
    RIS = 'ris'
}

export enum BackupStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

export enum RestoreStrategy {
    REPLACE = 'replace',
    MERGE = 'merge',
    SKIP_DUPLICATES = 'skip_duplicates',
    CREATE_NEW = 'create_new'
}

export class CreateBackupDto {
    @ApiProperty({ 
        description: 'Backup type',
        enum: BackupType,
        example: BackupType.FULL
    })
    @IsEnum(BackupType)
    type: BackupType;

    @ApiProperty({ 
        description: 'Backup format',
        enum: BackupFormat,
        example: BackupFormat.ZIP
    })
    @IsEnum(BackupFormat)
    format: BackupFormat;

    @ApiPropertyOptional({ 
        description: 'Custom backup name',
        example: 'My Research Library Backup'
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ 
        description: 'Backup description',
        example: 'Complete backup before major reorganization'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ 
        description: 'Include file attachments',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    includeFiles?: boolean = true;

    @ApiPropertyOptional({ 
        description: 'Include library settings',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    includeSettings?: boolean = true;

    @ApiPropertyOptional({ 
        description: 'Include sharing and collaboration data',
        default: false
    })
    @IsOptional()
    @IsBoolean()
    includeSharing?: boolean = false;

    @ApiPropertyOptional({ 
        description: 'Include activity logs',
        default: false
    })
    @IsOptional()
    @IsBoolean()
    includeLogs?: boolean = false;

    @ApiPropertyOptional({ 
        description: 'Compress backup',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    compress?: boolean = true;

    @ApiPropertyOptional({ 
        description: 'Encrypt backup with password',
        default: false
    })
    @IsOptional()
    @IsBoolean()
    encrypt?: boolean = false;

    @ApiPropertyOptional({ 
        description: 'Password for encryption (required if encrypt is true)'
    })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiPropertyOptional({ 
        description: 'Specific collection IDs to backup (if not provided, all collections)'
    })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    collectionIds?: string[];

    @ApiPropertyOptional({ 
        description: 'Date range start for incremental backup'
    })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ 
        description: 'Date range end for incremental backup'
    })
    @IsOptional()
    @IsDateString()
    dateTo?: string;
}

export class ScheduleBackupDto {
    @ApiProperty({ 
        description: 'Backup configuration',
        type: CreateBackupDto
    })
    @ValidateNested()
    @Type(() => CreateBackupDto)
    backupConfig: CreateBackupDto;

    @ApiProperty({ 
        description: 'Cron expression for scheduling',
        example: '0 2 * * *' // Daily at 2 AM
    })
    @IsString()
    cronExpression: string;

    @ApiPropertyOptional({ 
        description: 'Timezone for scheduling',
        example: 'UTC'
    })
    @IsOptional()
    @IsString()
    timezone?: string = 'UTC';

    @ApiPropertyOptional({ 
        description: 'Enable automatic cleanup of old backups',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    autoCleanup?: boolean = true;

    @ApiPropertyOptional({ 
        description: 'Number of backups to retain',
        default: 10
    })
    @IsOptional()
    retentionCount?: number = 10;

    @ApiPropertyOptional({ 
        description: 'Retention period in days',
        default: 30
    })
    @IsOptional()
    retentionDays?: number = 30;
}

export class RestoreBackupDto {
    @ApiProperty({ 
        description: 'Backup file ID or path'
    })
    @IsString()
    backupId: string;

    @ApiProperty({ 
        description: 'Restore strategy',
        enum: RestoreStrategy,
        example: RestoreStrategy.MERGE
    })
    @IsEnum(RestoreStrategy)
    strategy: RestoreStrategy;

    @ApiPropertyOptional({ 
        description: 'Target library ID (if creating new library)'
    })
    @IsOptional()
    @IsUUID('4')
    targetLibraryId?: string;

    @ApiPropertyOptional({ 
        description: 'New library name (if creating new library)'
    })
    @IsOptional()
    @IsString()
    newLibraryName?: string;

    @ApiPropertyOptional({ 
        description: 'Restore file attachments',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    restoreFiles?: boolean = true;

    @ApiPropertyOptional({ 
        description: 'Restore library settings',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    restoreSettings?: boolean = true;

    @ApiPropertyOptional({ 
        description: 'Restore sharing and collaboration data',
        default: false
    })
    @IsOptional()
    @IsBoolean()
    restoreSharing?: boolean = false;

    @ApiPropertyOptional({ 
        description: 'Password for encrypted backup'
    })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiPropertyOptional({ 
        description: 'Specific collections to restore'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    collectionNames?: string[];

    @ApiPropertyOptional({ 
        description: 'Validate backup before restore',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    validateBeforeRestore?: boolean = true;

    @ApiPropertyOptional({ 
        description: 'Create backup before restore',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    createBackupBeforeRestore?: boolean = true;
}

export class BackupValidationDto {
    @ApiProperty({ 
        description: 'Backup file ID or path'
    })
    @IsString()
    backupId: string;

    @ApiPropertyOptional({ 
        description: 'Password for encrypted backup'
    })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiPropertyOptional({ 
        description: 'Perform deep validation',
        default: false
    })
    @IsOptional()
    @IsBoolean()
    deepValidation?: boolean = false;
}

export class ExportLibraryDto {
    @ApiProperty({ 
        description: 'Export format',
        enum: BackupFormat,
        example: BackupFormat.ZIP
    })
    @IsEnum(BackupFormat)
    format: BackupFormat;

    @ApiPropertyOptional({ 
        description: 'Include file attachments',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    includeFiles?: boolean = true;

    @ApiPropertyOptional({ 
        description: 'Include library metadata',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    includeMetadata?: boolean = true;

    @ApiPropertyOptional({ 
        description: 'Specific collection IDs to export'
    })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    collectionIds?: string[];

    @ApiPropertyOptional({ 
        description: 'Custom filename'
    })
    @IsOptional()
    @IsString()
    filename?: string;
}

export class ImportLibraryDto {
    @ApiProperty({ 
        description: 'Import strategy',
        enum: RestoreStrategy,
        example: RestoreStrategy.MERGE
    })
    @IsEnum(RestoreStrategy)
    strategy: RestoreStrategy;

    @ApiPropertyOptional({ 
        description: 'Target library ID'
    })
    @IsOptional()
    @IsUUID('4')
    targetLibraryId?: string;

    @ApiPropertyOptional({ 
        description: 'New library name (if creating new)'
    })
    @IsOptional()
    @IsString()
    newLibraryName?: string;

    @ApiPropertyOptional({ 
        description: 'Import file attachments',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    importFiles?: boolean = true;

    @ApiPropertyOptional({ 
        description: 'Validate import data',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    validateData?: boolean = true;
}
