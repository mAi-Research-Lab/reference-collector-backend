import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from 'generated/prisma';
import { IsEnum } from 'class-validator';

export class UpdateTicketStatusDto {
    @ApiProperty({ enum: TicketStatus })
    @IsEnum(TicketStatus)
    status: TicketStatus;
}
