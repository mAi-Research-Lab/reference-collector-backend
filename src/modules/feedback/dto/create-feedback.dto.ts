import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum FeedbackTypeEnum {
    BUG = 'bug',
    SUGGESTION = 'suggestion',
}

export class CreateFeedbackDto {
    @ApiProperty({ enum: FeedbackTypeEnum, description: 'Feedback type' })
    @IsEnum(FeedbackTypeEnum)
    type: FeedbackTypeEnum;

    @ApiProperty({ description: 'Short subject / title', maxLength: 200 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    subject: string;

    @ApiProperty({ description: 'Detailed description', maxLength: 5000 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    message: string;

    @ApiPropertyOptional({ description: 'Application version' })
    @IsOptional()
    @IsString()
    appVersion?: string;

    @ApiPropertyOptional({ description: 'OS information' })
    @IsOptional()
    @IsString()
    osInfo?: string;
}
