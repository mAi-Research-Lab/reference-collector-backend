import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketPriority } from 'generated/prisma';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTicketDto {
    @ApiProperty()
    @IsString()
    @MinLength(3)
    subject: string;

    @ApiProperty()
    @IsString()
    @MinLength(10)
    description: string;

    @ApiPropertyOptional({ enum: TicketCategory })
    @IsOptional()
    @IsEnum(TicketCategory)
    category?: TicketCategory;

    @ApiPropertyOptional({ enum: TicketPriority })
    @IsOptional()
    @IsEnum(TicketPriority)
    priority?: TicketPriority;
}
