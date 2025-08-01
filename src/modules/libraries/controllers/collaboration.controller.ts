import {
    Controller,
    Get,
    Put,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    ParseUUIDPipe,
    ParseIntPipe
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
    ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { GetUser } from 'src/modules/auth/decorators/get-user.decorator';
import { CollaborationService } from '../services/collaboration.service';
import { CollaborationSettingsDto } from '../dto/sharing/advanced-sharing.dto';
import {
    CollaborationStatsDto,
    CollaborationActivityDto,
    SharePermissionSummaryDto
} from '../dto/sharing/advanced-sharing-response.dto';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Library Collaboration')
@Controller('collaboration')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CollaborationController {
    constructor(
        private readonly collaborationService: CollaborationService
    ) {}

    @Get('libraries/:libraryId/settings')
    @ApiOperation({ 
        summary: 'Get library collaboration settings',
        description: 'Retrieve collaboration settings for a specific library'
    })
    @ApiParam({ name: 'libraryId', description: 'Library UUID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Collaboration settings retrieved successfully',
        type: CollaborationSettingsDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Library not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'No access to this library' 
    })
    async getLibraryCollaborationSettings(
        @Param('libraryId', ParseUUIDPipe) libraryId: string,
        @GetUser('id') userId: string
    ): Promise<ResponseDto<CollaborationSettingsDto>> {
        const settings = await this.collaborationService.getLibraryCollaborationSettings(
            libraryId, 
            userId
        );
        
        return {
            success: true,
            message: 'Collaboration settings retrieved successfully',
            data: settings
        };
    }

    @Put('libraries/:libraryId/settings')
    @ApiOperation({ 
        summary: 'Update library collaboration settings',
        description: 'Update collaboration settings for a specific library (admin only)'
    })
    @ApiParam({ name: 'libraryId', description: 'Library UUID' })
    @ApiBody({ type: CollaborationSettingsDto })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Collaboration settings updated successfully',
        type: CollaborationSettingsDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Library not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'Admin access required' 
    })
    async updateLibraryCollaborationSettings(
        @Param('libraryId', ParseUUIDPipe) libraryId: string,
        @GetUser('id') userId: string,
        @Body() settings: CollaborationSettingsDto
    ): Promise<ResponseDto<CollaborationSettingsDto>> {
        const updatedSettings = await this.collaborationService.updateLibraryCollaborationSettings(
            libraryId, 
            userId, 
            settings
        );
        
        return {
            success: true,
            message: 'Collaboration settings updated successfully',
            data: updatedSettings
        };
    }

    @Get('libraries/:libraryId/stats')
    @ApiOperation({ 
        summary: 'Get library collaboration statistics',
        description: 'Retrieve detailed collaboration statistics for a library'
    })
    @ApiParam({ name: 'libraryId', description: 'Library UUID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Collaboration statistics retrieved successfully',
        type: CollaborationStatsDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Library not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'No access to this library' 
    })
    async getCollaborationStats(
        @Param('libraryId', ParseUUIDPipe) libraryId: string,
        @GetUser('id') userId: string
    ): Promise<ResponseDto<CollaborationStatsDto>> {
        const stats = await this.collaborationService.getCollaborationStats(libraryId, userId);
        
        return {
            success: true,
            message: 'Collaboration statistics retrieved successfully',
            data: stats
        };
    }

    @Get('libraries/:libraryId/collaborators')
    @ApiOperation({ 
        summary: 'Get library collaborators',
        description: 'Retrieve list of all collaborators for a library with their permissions'
    })
    @ApiParam({ name: 'libraryId', description: 'Library UUID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Collaborators retrieved successfully',
        type: [SharePermissionSummaryDto]
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Library not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'No access to this library' 
    })
    async getLibraryCollaborators(
        @Param('libraryId', ParseUUIDPipe) libraryId: string,
        @GetUser('id') userId: string
    ): Promise<ResponseDto<SharePermissionSummaryDto[]>> {
        const collaborators = await this.collaborationService.getLibraryCollaborators(
            libraryId, 
            userId
        );
        
        return {
            success: true,
            message: 'Collaborators retrieved successfully',
            data: collaborators
        };
    }

    @Get('libraries/:libraryId/activity')
    @ApiOperation({ 
        summary: 'Get collaboration activity',
        description: 'Retrieve recent collaboration activity for a library'
    })
    @ApiParam({ name: 'libraryId', description: 'Library UUID' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of activities to retrieve (default: 50)' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Collaboration activity retrieved successfully',
        type: [CollaborationActivityDto]
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Library not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'No access to this library' 
    })
    async getCollaborationActivity(
        @Param('libraryId', ParseUUIDPipe) libraryId: string,
        @GetUser('id') userId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50
    ): Promise<ResponseDto<CollaborationActivityDto[]>> {
        const activity = await this.collaborationService.getCollaborationActivity(
            libraryId, 
            userId, 
            limit
        );
        
        return {
            success: true,
            message: 'Collaboration activity retrieved successfully',
            data: activity
        };
    }

    @Post('libraries/:libraryId/activity')
    @ApiOperation({ 
        summary: 'Log collaboration activity',
        description: 'Log a new collaboration activity (for tracking purposes)'
    })
    @ApiParam({ name: 'libraryId', description: 'Library UUID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                shareId: { type: 'string', format: 'uuid' },
                action: { type: 'string' },
                resourceType: { type: 'string' },
                resourceId: { type: 'string', format: 'uuid' },
                details: { type: 'object' },
                comment: { type: 'string' }
            },
            required: ['shareId', 'action', 'resourceType', 'resourceId']
        }
    })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'Activity logged successfully' 
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Library not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'No access to this library' 
    })
    async logCollaborationActivity(
        @Param('libraryId', ParseUUIDPipe) libraryId: string,
        @GetUser('id') userId: string,
        @Body() activityData: {
            shareId: string;
            action: string;
            resourceType: string;
            resourceId: string;
            details?: Record<string, any>;
            comment?: string;
        }
    ): Promise<ResponseDto<{ message: string }>> {
        await this.collaborationService.logCollaborationActivity(
            activityData.shareId,
            userId,
            activityData.action,
            activityData.resourceType,
            activityData.resourceId,
            activityData.details,
            activityData.comment
        );
        
        return {
            success: true,
            message: 'Activity logged successfully',
            data: { message: 'Activity logged successfully' }
        };
    }

    @Get('activity/recent')
    @ApiOperation({ 
        summary: 'Get user recent collaboration activity',
        description: 'Retrieve recent collaboration activity across all libraries for the current user'
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of activities to retrieve (default: 20)' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Recent activity retrieved successfully',
        type: [CollaborationActivityDto]
    })
    async getUserRecentActivity(
        @GetUser('id') userId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20
    ): Promise<ResponseDto<CollaborationActivityDto[]>> {
        // This would be implemented to get user's recent activity across all libraries
        // For now, return empty array
        return {
            success: true,
            message: 'Recent activity retrieved successfully',
            data: []
        };
    }
}
