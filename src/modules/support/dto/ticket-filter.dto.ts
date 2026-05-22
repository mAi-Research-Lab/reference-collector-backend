import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketPriority, TicketStatus } from 'generated/prisma';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TicketFilterDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({ enum: TicketStatus })
    @IsOptional()
    @IsEnum(TicketStatus)
    status?: TicketStatus;

    @ApiPropertyOptional({ enum: TicketPriority })
    @IsOptional()
    @IsEnum(TicketPriority)
    priority?: TicketPriority;

    @ApiPropertyOptional({ enum: TicketCategory })
    @IsOptional()
    @IsEnum(TicketCategory)
    category?: TicketCategory;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;
}
