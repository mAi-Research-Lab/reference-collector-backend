import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ExtensionCapturesService } from './extension-captures.service';
import { ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/common/guard/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CaptureWebPageDto } from './dto/capture-web-page.dto';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { User } from '../user/decorators/user.decorator';
import { ApiErrorResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { ExtensionCaptureResponse } from './dto/extension-capture.response';
import { CaptureStatsResponse } from './dto/capture-stats.response';

@Controller('extension/captures')
@ApiTags('Extension Captures')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class ExtensionCapturesController {
    constructor(
        private readonly extensionCapturesService: ExtensionCapturesService
    ) { }

    @Post(':libraryId')
    @ApiOperation({ summary: 'Capture web page' })
    @ApiSuccessResponse(ExtensionCaptureResponse, 200,'Extension capture created successfully')
    @ApiSuccessResponse(ExtensionCaptureResponse, 400,'Extension capture failed ')
    @ApiErrorResponse(400, 'Extension capture failed')
    @ApiErrorResponse(500, 'Extension capture failed to create')
    async captureWebPage(@User() user: any, @Param('libraryId') libraryId: string, @Body() data: CaptureWebPageDto): Promise<ResponseDto> {
        const capture = await this.extensionCapturesService.captureWebPage(user.id, libraryId, data);

        return {
            message: capture.success ? 'Extension capture created successfully' : 'Extension capture creation failed',
            statusCode: capture.success ? 201 : 400,
            success: capture.success,
            timestamp: new Date().toISOString(),
            data: capture
        }
    }

    @Get()
    @ApiQuery({ name: 'stats', enum: ['success', 'failed'] })
    @ApiOperation({ summary: 'Get extension captures' })
    @ApiSuccessResponse(ExtensionCaptureResponse, 200,'Extension captures retrieved successfully')
    @ApiErrorResponse(400, 'Extension captures failed to retrieve')
    @ApiErrorResponse(500, 'Extension captures failed to retrieve')
    async getExtensionCaptures(@User() user: any, @Query('stats') stats: 'success' | 'failed'): Promise<ResponseDto> {
        const captures = await this.extensionCapturesService.getUserCaptures(user.id, stats);

        return {
            message: 'Extension captures retrieved successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: captures
        }
    }

    @Put(':captureId')
    @ApiOperation({ summary: 'Reprocess extension capture' })
    @ApiParam({ name: 'captureId', type: 'string' })
    @ApiSuccessResponse(ExtensionCaptureResponse, 200,'Extension capture reprocessed successfully')
    @ApiErrorResponse(400, 'Extension capture failed to reprocess')
    @ApiErrorResponse(500, 'Extension capture failed to reprocess')
    async reprocessCapture(@User() user: any, @Param('captureId') captureId: string): Promise<ResponseDto> {
        const capture = await this.extensionCapturesService.reprocessCapture(captureId, user.id);

        return {
            message: capture.success ? 'Extension capture reprocessed successfully' : 'Extension capture reprocessing failed',
            statusCode: capture.success ? 200 : 400,
            success: capture.success,
            timestamp: new Date().toISOString(),
            data: capture
        }
    }

    @Delete(':captureId')
    @ApiOperation({ summary: 'Delete extension capture' })
    @ApiParam({ name: 'captureId', type: 'string' })
    @ApiSuccessResponse(ExtensionCaptureResponse, 200,'Extension capture deleted successfully')
    @ApiErrorResponse(400, 'Extension capture failed to delete')
    @ApiErrorResponse(500, 'Extension capture failed to delete')
    async deleteCapture(@User() user: any, @Param('captureId') captureId: string): Promise<ResponseDto> {
        const capture = await this.extensionCapturesService.deleteCapture(captureId);

        return {
            message: capture.message,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: capture
        }
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get extension capture stats' })
    @ApiSuccessResponse(CaptureStatsResponse, 200,'Extension capture stats retrieved successfully')
    @ApiErrorResponse(400, 'Extension capture stats failed to retrieve')
    @ApiErrorResponse(500, 'Extension capture stats failed to retrieve')
    async getCaptureStats(@User() user: any): Promise<ResponseDto> {
        const stats = await this.extensionCapturesService.getCaptureStats(user.id);

        return {
            message: 'Extension capture stats retrieved successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: stats
        }
    }
}
