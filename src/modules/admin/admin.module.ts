import { Module } from '@nestjs/common';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';
import { AdminFeedbackController } from './admin-feedback.controller';
import { AdminFeedbackService } from './admin-feedback.service';

@Module({
    controllers: [AdminUserController, AdminFeedbackController],
    providers: [AdminUserService, AdminFeedbackService],
    exports: [AdminUserService, AdminFeedbackService],
})
export class AdminModule {}
