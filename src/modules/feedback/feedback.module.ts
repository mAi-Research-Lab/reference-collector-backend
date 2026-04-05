import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { S3StorageService } from '../references/services/s3-storage.service';

@Module({
    providers: [FeedbackService, S3StorageService],
    controllers: [FeedbackController],
})
export class FeedbackModule {}
