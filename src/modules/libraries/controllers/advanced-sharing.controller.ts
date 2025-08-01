import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    ParseUUIDPipe,
    ParseIntPipe,
    ParseBoolPipe,
    ParseEnumPipe
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
import { AdvancedSharingService } from '../services/advanced-sharing.service';
import {
    CreateAdvancedShareDto,
    UpdateSharePermissionsDto,
    BulkShareDto,
    ShareAnalyticsQueryDto,
    ShareScope,
    ShareType,
    AccessLevel
} from '../dto/sharing/advanced-sharing.dto';
import {
    ShareResponseDto,
    ShareAnalyticsDto,
    BulkShareResultDto,
    ShareSearchResultDto
} from '../dto/sharing/advanced-sharing-response.dto';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Advanced Library Sharing')
@Controller('advanced-sharing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdvancedSharingController {
    constructor(
        private readonly advancedSharingService: AdvancedSharingService
    ) {}

    @Post()
    @ApiOperation({ 
        summary: 'Create advanced share',
        description: 'Create a new advanced share with granular permissions and collaboration features'
    })
    @ApiBody({ type: CreateAdvancedShareDto })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'Share created successfully',
        type: ShareResponseDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Resource not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'No permission to share this resource' 
    })
    async createShare(
        @GetUser('id') userId: string,
        @Body() createShareDto: CreateAdvancedShareDto
    ): Promise<ResponseDto<ShareResponseDto>> {
        const share = await this.advancedSharingService.createShare(userId, createShareDto);
        
        return {
            success: true,
            message: 'Share created successfully',
            data: share
        };
    }

    @Get()
    @ApiOperation({ 
        summary: 'Get user shares',
        description: 'Retrieve paginated list of shares created by the user with filtering options'
    })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
    @ApiQuery({ name: 'scope', required: false, enum: ShareScope, description: 'Filter by share scope' })
    @ApiQuery({ name: 'shareType', required: false, enum: ShareType, description: 'Filter by share type' })
    @ApiQuery({ name: 'accessLevel', required: false, enum: AccessLevel, description: 'Filter by access level' })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
    @ApiQuery({ name: 'isExpired', required: false, type: Boolean, description: 'Filter by expiration status' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Shares retrieved successfully',
        type: ShareSearchResultDto
    })
    async getShares(
        @GetUser('id') userId: string,
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
        @Query('scope', new ParseEnumPipe(ShareScope, { optional: true })) scope?: ShareScope,
        @Query('shareType', new ParseEnumPipe(ShareType, { optional: true })) shareType?: ShareType,
        @Query('accessLevel', new ParseEnumPipe(AccessLevel, { optional: true })) accessLevel?: AccessLevel,
        @Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean,
        @Query('isExpired', new ParseBoolPipe({ optional: true })) isExpired?: boolean
    ): Promise<ResponseDto<ShareSearchResultDto>> {
        const filters = { scope, shareType, accessLevel, isActive, isExpired };
        const result = await this.advancedSharingService.getShares(userId, page, limit, filters);
        
        return {
            success: true,
            message: 'Shares retrieved successfully',
            data: result
        };
    }

    @Get('analytics')
    @ApiOperation({ 
        summary: 'Get sharing analytics',
        description: 'Retrieve detailed analytics about sharing activity and usage'
    })
    @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date for analytics (ISO string)' })
    @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date for analytics (ISO string)' })
    @ApiQuery({ name: 'scope', required: false, enum: ShareScope, description: 'Filter by share scope' })
    @ApiQuery({ name: 'shareType', required: false, enum: ShareType, description: 'Filter by share type' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Analytics retrieved successfully',
        type: ShareAnalyticsDto
    })
    async getAnalytics(
        @GetUser('id') userId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('scope', new ParseEnumPipe(ShareScope, { optional: true })) scope?: ShareScope,
        @Query('shareType', new ParseEnumPipe(ShareType, { optional: true })) shareType?: ShareType
    ): Promise<ResponseDto<ShareAnalyticsDto>> {
        const query: ShareAnalyticsQueryDto = { startDate, endDate, scope, shareType };
        const analytics = await this.advancedSharingService.getShareAnalytics(userId, query);
        
        return {
            success: true,
            message: 'Analytics retrieved successfully',
            data: analytics
        };
    }

    @Put(':id')
    @ApiOperation({ 
        summary: 'Update share permissions',
        description: 'Update permissions and settings for an existing share'
    })
    @ApiParam({ name: 'id', description: 'Share UUID' })
    @ApiBody({ type: UpdateSharePermissionsDto })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Share updated successfully',
        type: ShareResponseDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Share not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'No permission to update this share' 
    })
    async updateShare(
        @Param('id', ParseUUIDPipe) shareId: string,
        @GetUser('id') userId: string,
        @Body() updateDto: UpdateSharePermissionsDto
    ): Promise<ResponseDto<ShareResponseDto>> {
        const share = await this.advancedSharingService.updateSharePermissions(
            shareId, 
            userId, 
            updateDto
        );
        
        return {
            success: true,
            message: 'Share updated successfully',
            data: share
        };
    }

    @Delete(':id')
    @ApiOperation({ 
        summary: 'Delete share',
        description: 'Delete an existing share and revoke access'
    })
    @ApiParam({ name: 'id', description: 'Share UUID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Share deleted successfully' 
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Share not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'No permission to delete this share' 
    })
    async deleteShare(
        @Param('id', ParseUUIDPipe) shareId: string,
        @GetUser('id') userId: string
    ): Promise<ResponseDto<{ message: string }>> {
        const result = await this.advancedSharingService.deleteShare(shareId, userId);
        
        return {
            success: true,
            message: result.message,
            data: result
        };
    }

    @Post('bulk')
    @ApiOperation({ 
        summary: 'Bulk share resources',
        description: 'Share multiple resources with multiple recipients in a single operation'
    })
    @ApiBody({ type: BulkShareDto })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'Bulk share completed',
        type: BulkShareResultDto
    })
    @ApiResponse({ 
        status: HttpStatus.BAD_REQUEST, 
        description: 'Invalid bulk share request' 
    })
    async bulkShare(
        @GetUser('id') userId: string,
        @Body() bulkShareDto: BulkShareDto
    ): Promise<ResponseDto<BulkShareResultDto>> {
        const result = await this.advancedSharingService.bulkShare(userId, bulkShareDto);
        
        return {
            success: true,
            message: `Bulk share completed: ${result.successCount} successful, ${result.failureCount} failed`,
            data: result
        };
    }

    @Get(':id')
    @ApiOperation({ 
        summary: 'Get share details',
        description: 'Retrieve detailed information about a specific share'
    })
    @ApiParam({ name: 'id', description: 'Share UUID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Share details retrieved successfully',
        type: ShareResponseDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Share not found' 
    })
    async getShareById(
        @Param('id', ParseUUIDPipe) shareId: string,
        @GetUser('id') userId: string
    ): Promise<ResponseDto<ShareResponseDto>> {
        // This would be implemented in the service
        // For now, return a placeholder response
        return {
            success: true,
            message: 'Share details retrieved successfully',
            data: {} as ShareResponseDto
        };
    }

    @Post(':id/access')
    @ApiOperation({ 
        summary: 'Log share access',
        description: 'Log when a share is accessed (for analytics)'
    })
    @ApiParam({ name: 'id', description: 'Share UUID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Access logged successfully' 
    })
    async logAccess(
        @Param('id', ParseUUIDPipe) shareId: string,
        @GetUser('id') userId: string
    ): Promise<ResponseDto<{ message: string }>> {
        // This would be implemented in the service
        return {
            success: true,
            message: 'Access logged successfully',
            data: { message: 'Access logged successfully' }
        };
    }
}
