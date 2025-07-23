import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { SyncSessionsService } from './sync-sessions.service';
import { User } from '../user/decorators/user.decorator';
import { StartSyncDto } from './dto/start-sync.dto';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { ApiErrorResponse, ApiSuccessArrayResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { SyncSessionResponse } from './dto/sync-session.response';
import { SYNC_SESSION_MESSAGES } from './constants/sync-session.messages';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { UpdateSyncProgressDto } from './dto/update-sync-progress.dto';
import { CompleteSyncDto } from './dto/complete-sync.dto';
import { SyncConflictDto } from './dto/sync-conflict.dto';

@Controller('sync-sessions')
@ApiTags('Sync Sessions')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class SyncSessionsController {
    constructor(
        private readonly syncSessionsService: SyncSessionsService
    ) { }

    @Post('start/:officeDocumentId')
    @ApiOperation({ summary: 'Start sync session' })
    @ApiSuccessResponse(SyncSessionResponse, 200, SYNC_SESSION_MESSAGES.SYNC_SESSION_CREATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(409, SYNC_SESSION_MESSAGES.SYNC_SESSION_ALREADY_EXISTS)
    async startSyncSession(@User() user: any, @Param('officeDocumentId') officeDocumentId: string, @Body() data: StartSyncDto): Promise<ResponseDto> {
        const session = await this.syncSessionsService.startSyncSession(user.id, officeDocumentId, data);
        return {
            message: SYNC_SESSION_MESSAGES.SYNC_SESSION_CREATED_SUCCESSFULLY,
            data: session,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        };
    }

    @Put(':id/progress')
    @ApiOperation({ summary: 'Update sync session progress' })
    @ApiSuccessResponse(SyncSessionResponse, 200, SYNC_SESSION_MESSAGES.SYNC_SESSION_PROGRESS_UPDATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, SYNC_SESSION_MESSAGES.SYNC_SESSION_NOT_FOUND)
    async updateSyncSessionProgress(@Param('id') id: string, @Body() data: UpdateSyncProgressDto): Promise<ResponseDto> {
        const session = await this.syncSessionsService.updateSyncProgress(id, data);
        return {
            message: SYNC_SESSION_MESSAGES.SYNC_SESSION_PROGRESS_UPDATED_SUCCESSFULLY,
            data: session,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        };
    }

    @Put(':id/complete')
    @ApiOperation({ summary: 'Complete sync session' })
    @ApiSuccessResponse(SyncSessionResponse, 200, SYNC_SESSION_MESSAGES.SYNC_SESSION_COMPLETED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, SYNC_SESSION_MESSAGES.SYNC_SESSION_NOT_FOUND)
    async completeSyncSession(@Param('id') id: string, @Body() data: CompleteSyncDto): Promise<ResponseDto> {
        const session = await this.syncSessionsService.completeSyncSession(id, data);
        return {
            message: SYNC_SESSION_MESSAGES.SYNC_SESSION_COMPLETED_SUCCESSFULLY,
            data: session,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        };
    }

    @Get('history')
    @ApiQuery({ name: 'officeDocumentId', required: false })
    @ApiSuccessArrayResponse(SyncSessionResponse, 200, SYNC_SESSION_MESSAGES.SYNC_SESSION_HISTORY_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getSyncHistory(@User() user: any, @Query('officeDocumentId') officeDocumentId?: string): Promise<ResponseDto> {
        const history = await this.syncSessionsService.getSyncHistory(user.id, officeDocumentId);
        return {
            message: SYNC_SESSION_MESSAGES.SYNC_SESSION_HISTORY_FETCHED_SUCCESSFULLY,
            data: history,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        };
    }

    @Get('active')
    @ApiSuccessArrayResponse(SyncSessionResponse, 200, SYNC_SESSION_MESSAGES.SYNC_SESSION_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getActiveSyncSession(@User() user: any): Promise<ResponseDto> {
        const session = await this.syncSessionsService.getActiveSyncSessions(user.id);
        return {
            message: SYNC_SESSION_MESSAGES.SYNC_SESSION_FETCHED_SUCCESSFULLY,
            data: session,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        };
    }

    @Post(':id/conflict')
    @ApiOperation({ summary: 'Handle sync conflict' })
    @ApiSuccessResponse(SyncSessionResponse, 200, SYNC_SESSION_MESSAGES.SYNC_SESSION_CONFLICT_HANDLED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, SYNC_SESSION_MESSAGES.SYNC_SESSION_NOT_FOUND)
    async handleSyncConflict(@Param('id') id: string, @Body() data: SyncConflictDto): Promise<ResponseDto> {
        const session = await this.syncSessionsService.handleSyncConflict(id, data);
        
        return {
            message: SYNC_SESSION_MESSAGES.SYNC_SESSION_CONFLICT_HANDLED_SUCCESSFULLY,
            data: session,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Delete(':id/cancel')
    @ApiOperation({ summary: 'Cancel sync session' })
    @ApiSuccessResponse(SyncSessionResponse, 200, SYNC_SESSION_MESSAGES.SYNC_SESSION_CANCELLED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_MESSAGES.FORBIDDEN)
    @ApiErrorResponse(404, SYNC_SESSION_MESSAGES.SYNC_SESSION_NOT_FOUND)
    async cancelSyncSession(@Param('id') id: string, @User() user: any): Promise<ResponseDto> {
        const session = await this.syncSessionsService.cancelSyncSession(id, user.id);
        
        return {
            message: SYNC_SESSION_MESSAGES.SYNC_SESSION_CANCELLED_SUCCESSFULLY,
            data: session,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        }
    }
}
