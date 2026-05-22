import { Injectable, Logger } from '@nestjs/common';
import { Prisma, TicketStatus, UserType } from 'generated/prisma';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { buildPaginatedResult } from 'src/common/dto/pagination.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { AddMessageDto } from './dto/add-message.dto';

@Injectable()
export class SupportService {
    private readonly logger = new Logger(SupportService.name);

    constructor(private readonly prisma: PrismaService) {}

    private async generateTicketNumber(): Promise<string> {
        const count = await this.prisma.supportTicket.count();
        const year = new Date().getFullYear();
        return `CT-${year}-${String(count + 1).padStart(5, '0')}`;
    }

    async createTicket(userId: string, dto: CreateTicketDto) {
        const ticketNumber = await this.generateTicketNumber();

        const ticket = await this.prisma.supportTicket.create({
            data: {
                ticketNumber,
                subject: dto.subject,
                description: dto.description,
                category: dto.category,
                priority: dto.priority,
                userId,
                messages: {
                    create: {
                        content: dto.description,
                        isFromUser: true,
                        authorId: userId,
                    },
                },
            },
            include: {
                user: { select: { id: true, email: true, fullName: true } },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        author: { select: { id: true, email: true, fullName: true, userType: true } },
                    },
                },
            },
        });

        this.logger.log(`Ticket created: ${ticket.ticketNumber}`);
        return ticket;
    }

    async getUserTickets(userId: string, filters: TicketFilterDto) {
        return this.findTicketsPaginated({ userId }, filters);
    }

    async getAdminTickets(filters: TicketFilterDto) {
        return this.findTicketsPaginated({}, filters);
    }

    private async findTicketsPaginated(
        baseWhere: Prisma.SupportTicketWhereInput,
        filters: TicketFilterDto,
    ) {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.SupportTicketWhereInput = { ...baseWhere };

        if (filters.status) where.status = filters.status;
        if (filters.priority) where.priority = filters.priority;
        if (filters.category) where.category = filters.category;

        if (filters.search) {
            where.OR = [
                { subject: { contains: filters.search, mode: 'insensitive' } },
                { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
                { user: { email: { contains: filters.search, mode: 'insensitive' } } },
                { user: { fullName: { contains: filters.search, mode: 'insensitive' } } },
            ];
        }

        const [tickets, totalCount] = await Promise.all([
            this.prisma.supportTicket.findMany({
                where,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    user: { select: { id: true, email: true, fullName: true } },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: {
                            author: { select: { id: true, fullName: true, userType: true } },
                        },
                    },
                    _count: { select: { messages: true } },
                },
            }),
            this.prisma.supportTicket.count({ where }),
        ]);

        const data = tickets.map((t) => ({
            ...t,
            messageCount: t._count.messages,
            lastMessage: t.messages[0] ?? null,
            messages: undefined,
            _count: undefined,
        }));

        return buildPaginatedResult(data, totalCount, page, limit);
    }

    async getTicketById(ticketId: string, userId: string, isAdmin: boolean) {
        const ticket = await this.prisma.supportTicket.findUnique({
            where: { id: ticketId },
            include: {
                user: { select: { id: true, email: true, fullName: true, userType: true } },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        author: { select: { id: true, email: true, fullName: true, userType: true } },
                    },
                },
            },
        });

        if (!ticket) {
            throw new CustomHttpException('Ticket not found', 404, 'TICKET_NOT_FOUND');
        }

        if (!isAdmin && ticket.userId !== userId) {
            throw new CustomHttpException('Forbidden', 403, 'FORBIDDEN');
        }

        return ticket;
    }

    async addMessage(ticketId: string, authorId: string, dto: AddMessageDto, isAdmin: boolean) {
        const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });

        if (!ticket) {
            throw new CustomHttpException('Ticket not found', 404, 'TICKET_NOT_FOUND');
        }

        if (!isAdmin && ticket.userId !== authorId) {
            throw new CustomHttpException('Forbidden', 403, 'FORBIDDEN');
        }

        const isFromUser = !isAdmin;

        const message = await this.prisma.supportTicketMessage.create({
            data: {
                ticketId,
                content: dto.content,
                isFromUser,
                authorId,
                isInternal: dto.isInternal ?? false,
            },
            include: {
                author: { select: { id: true, email: true, fullName: true, userType: true } },
            },
        });

        const updateData: Prisma.SupportTicketUpdateInput = {
            isRead: isFromUser ? false : true,
            updatedAt: new Date(),
        };

        if (!isFromUser && !ticket.firstResponseAt) {
            updateData.firstResponseAt = new Date();
        }

        if (!isFromUser && ticket.status === TicketStatus.open) {
            updateData.status = TicketStatus.in_progress;
        }

        await this.prisma.supportTicket.update({
            where: { id: ticketId },
            data: updateData,
        });

        return message;
    }

    async updateTicketStatus(ticketId: string, status: TicketStatus) {
        const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            throw new CustomHttpException('Ticket not found', 404, 'TICKET_NOT_FOUND');
        }

        return this.prisma.supportTicket.update({
            where: { id: ticketId },
            data: {
                status,
                resolvedAt: status === TicketStatus.resolved || status === TicketStatus.closed
                    ? new Date()
                    : null,
            },
            include: {
                user: { select: { id: true, email: true, fullName: true } },
            },
        });
    }

    async markAsRead(ticketId: string) {
        return this.prisma.supportTicket.update({
            where: { id: ticketId },
            data: { isRead: true },
        });
    }

    async markAsUnread(ticketId: string) {
        return this.prisma.supportTicket.update({
            where: { id: ticketId },
            data: { isRead: false },
        });
    }

    async getAdminStats() {
        const [total, open, inProgress, unread] = await Promise.all([
            this.prisma.supportTicket.count(),
            this.prisma.supportTicket.count({ where: { status: TicketStatus.open } }),
            this.prisma.supportTicket.count({ where: { status: TicketStatus.in_progress } }),
            this.prisma.supportTicket.count({ where: { isRead: false } }),
        ]);

        return { total, open, inProgress, unread };
    }

    async getUnreadCount() {
        const count = await this.prisma.supportTicket.count({ where: { isRead: false } });
        return { count };
    }

    isAdminUser(userType: string): boolean {
        return userType === UserType.admin;
    }
}
