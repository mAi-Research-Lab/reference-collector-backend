import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { TicketStatus, UserType } from 'generated/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { User } from '../user/decorators/user.decorator';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@Controller('support')
@ApiTags('Support')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class SupportController {
    constructor(private readonly supportService: SupportService) {}

    @Post('tickets')
    @ApiOperation({ summary: 'Create support ticket' })
    async createTicket(@User() user: any, @Body() dto: CreateTicketDto): Promise<ResponseDto> {
        const ticket = await this.supportService.createTicket(user.id, dto);
        return {
            success: true,
            message: 'Ticket created',
            statusCode: 201,
            timestamp: new Date().toISOString(),
            data: ticket,
        };
    }

    @Get('tickets')
    @ApiOperation({ summary: 'Get user tickets' })
    async getUserTickets(@User() user: any, @Query() filters: TicketFilterDto): Promise<ResponseDto> {
        const result = await this.supportService.getUserTickets(user.id, filters);
        return {
            success: true,
            message: 'Tickets retrieved',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: result,
        };
    }

    @Get('tickets/:ticketId')
    @ApiOperation({ summary: 'Get ticket detail' })
    async getTicket(@User() user: any, @Param('ticketId') ticketId: string): Promise<ResponseDto> {
        const isAdmin = this.supportService.isAdminUser(user.userType);
        const ticket = await this.supportService.getTicketById(ticketId, user.id, isAdmin);
        return {
            success: true,
            message: 'Ticket retrieved',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: ticket,
        };
    }

    @Post('tickets/:ticketId/messages')
    @ApiOperation({ summary: 'Add message to ticket' })
    async addMessage(
        @User() user: any,
        @Param('ticketId') ticketId: string,
        @Body() dto: AddMessageDto,
    ): Promise<ResponseDto> {
        const isAdmin = this.supportService.isAdminUser(user.userType);
        const message = await this.supportService.addMessage(ticketId, user.id, dto, isAdmin);
        return {
            success: true,
            message: 'Message added',
            statusCode: 201,
            timestamp: new Date().toISOString(),
            data: message,
        };
    }

    // --- Admin routes ---

    @Get('admin/tickets')
    @Roles(UserType.admin)
    @ApiOperation({ summary: 'Get all tickets (admin)' })
    async getAdminTickets(@Query() filters: TicketFilterDto): Promise<ResponseDto> {
        const result = await this.supportService.getAdminTickets(filters);
        return {
            success: true,
            message: 'Tickets retrieved',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: result,
        };
    }

    @Get('admin/stats')
    @Roles(UserType.admin)
    @ApiOperation({ summary: 'Get support stats (admin)' })
    async getAdminStats(): Promise<ResponseDto> {
        const stats = await this.supportService.getAdminStats();
        return {
            success: true,
            message: 'Stats retrieved',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: stats,
        };
    }

    @Get('admin/unread-count')
    @Roles(UserType.admin)
    @ApiOperation({ summary: 'Get unread ticket count (admin)' })
    async getUnreadCount(): Promise<ResponseDto> {
        const result = await this.supportService.getUnreadCount();
        return {
            success: true,
            message: 'Unread count retrieved',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: result,
        };
    }

    @Get('admin/tickets/:ticketId')
    @Roles(UserType.admin)
    @ApiOperation({ summary: 'Get ticket detail (admin)' })
    async getAdminTicket(@Param('ticketId') ticketId: string): Promise<ResponseDto> {
        const ticket = await this.supportService.getTicketById(ticketId, '', true);
        return {
            success: true,
            message: 'Ticket retrieved',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: ticket,
        };
    }

    @Post('admin/tickets/:ticketId/messages')
    @Roles(UserType.admin)
    @ApiOperation({ summary: 'Add admin message to ticket' })
    async addAdminMessage(
        @User() user: any,
        @Param('ticketId') ticketId: string,
        @Body() dto: AddMessageDto,
    ): Promise<ResponseDto> {
        const message = await this.supportService.addMessage(ticketId, user.id, dto, true);
        return {
            success: true,
            message: 'Message added',
            statusCode: 201,
            timestamp: new Date().toISOString(),
            data: message,
        };
    }

    @Patch('admin/tickets/:ticketId/status')
    @Roles(UserType.admin)
    @ApiOperation({ summary: 'Update ticket status (admin)' })
    async updateStatus(
        @Param('ticketId') ticketId: string,
        @Body() dto: UpdateTicketStatusDto,
    ): Promise<ResponseDto> {
        const ticket = await this.supportService.updateTicketStatus(ticketId, dto.status);
        return {
            success: true,
            message: 'Ticket status updated',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: ticket,
        };
    }

    @Patch('admin/tickets/mark-as-read')
    @Roles(UserType.admin)
    @ApiOperation({ summary: 'Mark ticket as read (admin)' })
    async markAsRead(@Body('ticketId') ticketId: string): Promise<ResponseDto> {
        await this.supportService.markAsRead(ticketId);
        return {
            success: true,
            message: 'Ticket marked as read',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: null,
        };
    }

    @Patch('admin/tickets/mark-as-unread')
    @Roles(UserType.admin)
    @ApiOperation({ summary: 'Mark ticket as unread (admin)' })
    async markAsUnread(@Body('ticketId') ticketId: string): Promise<ResponseDto> {
        await this.supportService.markAsUnread(ticketId);
        return {
            success: true,
            message: 'Ticket marked as unread',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: null,
        };
    }
}
