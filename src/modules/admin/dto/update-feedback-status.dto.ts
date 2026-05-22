import { ApiProperty } from '@nestjs/swagger';
import { FeedbackStatus } from 'generated/prisma';
import { IsEnum } from 'class-validator';

export class UpdateFeedbackStatusDto {
    @ApiProperty({ enum: FeedbackStatus })
    @IsEnum(FeedbackStatus)
    status: FeedbackStatus;
}
