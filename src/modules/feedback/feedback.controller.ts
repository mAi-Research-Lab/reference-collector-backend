import {
    Body,
    Controller,
    Get,
    Post,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { User } from '../user/decorators/user.decorator';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('feedback')
@ApiTags('Feedback')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class FeedbackController {
    constructor(private readonly feedbackService: FeedbackService) {}

    @Post()
    @ApiOperation({ summary: 'Submit feedback (bug report or suggestion)' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(
        FilesInterceptor('images', 5, {
            limits: { fileSize: 5 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                if (file.mimetype.startsWith('image/')) {
                    cb(null, true);
                } else {
                    cb(new Error('Only image files are allowed'), false);
                }
            },
        }),
    )
    async create(
        @User() user: any,
        @Body() dto: CreateFeedbackDto,
        @UploadedFiles() images?: Express.Multer.File[],
    ): Promise<ResponseDto> {
        const feedback = await this.feedbackService.create(user.id, dto, images);

        return {
            success: true,
            message: 'Feedback submitted successfully',
            statusCode: 201,
            timestamp: new Date().toISOString(),
            data: feedback,
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get user feedback history' })
    async findAll(@User() user: any): Promise<ResponseDto> {
        const feedbacks = await this.feedbackService.findAllByUser(user.id);

        return {
            success: true,
            message: 'Feedbacks retrieved',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: feedbacks,
        };
    }
}
