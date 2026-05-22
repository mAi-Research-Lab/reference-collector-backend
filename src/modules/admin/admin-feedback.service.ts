import { Injectable } from '@nestjs/common';
import { FeedbackStatus, FeedbackType, Prisma } from 'generated/prisma';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { PaginationQueryDto, buildPaginatedResult } from 'src/common/dto/pagination.dto';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';

@Injectable()
export class AdminFeedbackService {
    constructor(private readonly prisma: PrismaService) {}

    async findAllPaginated(query: PaginationQueryDto & { status?: FeedbackStatus; type?: FeedbackType }) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.FeedbackWhereInput = {};

        if (query.status) where.status = query.status;
        if (query.type) where.type = query.type;

        if (query.search) {
            where.OR = [
                { subject: { contains: query.search, mode: 'insensitive' } },
                { message: { contains: query.search, mode: 'insensitive' } },
                { user: { email: { contains: query.search, mode: 'insensitive' } } },
                { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
            ];
        }

        const [feedbacks, totalCount] = await Promise.all([
            this.prisma.feedback.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, email: true, fullName: true, userType: true } },
                },
            }),
            this.prisma.feedback.count({ where }),
        ]);

        return buildPaginatedResult(feedbacks, totalCount, page, limit);
    }

    async findById(feedbackId: string) {
        const feedback = await this.prisma.feedback.findUnique({
            where: { id: feedbackId },
            include: {
                user: { select: { id: true, email: true, fullName: true, userType: true } },
            },
        });

        if (!feedback) {
            throw new CustomHttpException('Feedback not found', 404, 'FEEDBACK_NOT_FOUND');
        }

        return feedback;
    }

    async updateStatus(feedbackId: string, status: FeedbackStatus) {
        const feedback = await this.prisma.feedback.findUnique({ where: { id: feedbackId } });
        if (!feedback) {
            throw new CustomHttpException('Feedback not found', 404, 'FEEDBACK_NOT_FOUND');
        }

        return this.prisma.feedback.update({
            where: { id: feedbackId },
            data: { status },
            include: {
                user: { select: { id: true, email: true, fullName: true, userType: true } },
            },
        });
    }
}
