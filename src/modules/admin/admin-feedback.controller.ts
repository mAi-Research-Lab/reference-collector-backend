import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { FeedbackStatus, FeedbackType, UserType } from 'generated/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AdminFeedbackService } from './admin-feedback.service';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';

@Controller('admin/feedback')
@ApiTags('Admin - Feedback')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
@Roles(UserType.admin)
export class AdminFeedbackController {
    constructor(private readonly adminFeedbackService: AdminFeedbackService) {}

    @Get()
    @ApiOperation({ summary: 'List all feedbacks (admin)' })
    async findAll(
        @Query() query: PaginationQueryDto,
        @Query('status') status?: FeedbackStatus,
        @Query('type') type?: FeedbackType,
    ): Promise<ResponseDto> {
        const result = await this.adminFeedbackService.findAllPaginated({
            ...query,
            status,
            type,
        });

        return {
            success: true,
            message: 'Feedbacks retrieved',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: result,
        };
    }

    @Get(':feedbackId')
    @ApiOperation({ summary: 'Get feedback detail (admin)' })
    async findOne(@Param('feedbackId') feedbackId: string): Promise<ResponseDto> {
        const feedback = await this.adminFeedbackService.findById(feedbackId);

        return {
            success: true,
            message: 'Feedback retrieved',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: feedback,
        };
    }

    @Patch(':feedbackId/status')
    @ApiOperation({ summary: 'Update feedback status (admin)' })
    async updateStatus(
        @Param('feedbackId') feedbackId: string,
        @Body() dto: UpdateFeedbackStatusDto,
    ): Promise<ResponseDto> {
        const feedback = await this.adminFeedbackService.updateStatus(feedbackId, dto.status);

        return {
            success: true,
            message: 'Feedback status updated',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: feedback,
        };
    }
}
