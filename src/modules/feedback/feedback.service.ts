import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { S3StorageService } from '../references/services/s3-storage.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
    private readonly logger = new Logger(FeedbackService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3StorageService,
    ) {}

    async create(userId: string, dto: CreateFeedbackDto, files?: Express.Multer.File[]) {
        const imageKeys: string[] = [];

        if (files?.length && this.s3.ready) {
            for (const file of files) {
                const key = `feedbacks/${userId}/${Date.now()}-${file.originalname}`;
                await this.s3.uploadFile(file.buffer, key, file.mimetype);
                imageKeys.push(key);
            }
        }

        const feedback = await this.prisma.feedback.create({
            data: {
                userId,
                type: dto.type,
                subject: dto.subject,
                message: dto.message,
                appVersion: dto.appVersion ?? null,
                osInfo: dto.osInfo ?? null,
                imageKeys,
            },
        });

        this.logger.log(`Feedback created: ${feedback.id} (${dto.type}) by user ${userId}`);
        return feedback;
    }

    async findAllByUser(userId: string) {
        return this.prisma.feedback.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getImageUrl(userId: string, feedbackId: string, imageIndex: number) {
        const feedback = await this.prisma.feedback.findFirst({
            where: { id: feedbackId, userId },
        });

        if (!feedback || !feedback.imageKeys[imageIndex]) {
            return null;
        }

        return this.s3.getSignedUrl(feedback.imageKeys[imageIndex]);
    }
}
