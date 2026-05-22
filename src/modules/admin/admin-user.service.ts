import { Injectable } from '@nestjs/common';
import { Prisma, UserType } from 'generated/prisma';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { PaginationQueryDto, buildPaginatedResult } from 'src/common/dto/pagination.dto';
import { formatUserResponse } from 'src/common/utils/format-user-response';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdminCreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminUserService {
    constructor(private readonly prisma: PrismaService) {}

    async findAllPaginated(query: PaginationQueryDto & { institutionId?: string; userType?: string }) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {};

        if (query.search) {
            where.OR = [
                { email: { contains: query.search, mode: 'insensitive' } },
                { fullName: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        if (query.institutionId) {
            where.institutionId = query.institutionId;
        }

        if (query.userType) {
            where.userType = query.userType as UserType;
        }

        const [users, totalCount] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    institution: { select: { id: true, name: true, domain: true } },
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        const data = users.map((u) => {
            const formatted = formatUserResponse(u);
            return {
                ...formatted,
                institution: u.institution,
            };
        });

        return buildPaginatedResult(data, totalCount, page, limit);
    }

    async create(dto: AdminCreateUserDto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) {
            throw new CustomHttpException(
                COMMON_MESSAGES.EMAIL_ALREADY_EXISTS,
                409,
                COMMON_MESSAGES.EMAIL_ALREADY_EXISTS,
            );
        }

        if (dto.institutionId) {
            const institution = await this.prisma.institution.findUnique({
                where: { id: dto.institutionId },
            });
            if (!institution) {
                throw new CustomHttpException('Institution not found', 404, 'INSTITUTION_NOT_FOUND');
            }
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash: hashedPassword,
                fullName: dto.fullName,
                userType: dto.userType,
                institutionId: dto.institutionId ?? null,
                fieldOfStudy: dto.fieldOfStudy ?? '',
                orcidId: dto.orcidId ?? '',
                phoneNumber: dto.phoneNumber?.trim() || null,
                emailVerified: dto.emailVerified ?? true,
                isActive: dto.isActive ?? true,
                preferences: {},
            },
            include: {
                institution: { select: { id: true, name: true, domain: true } },
            },
        });

        const formatted = formatUserResponse(user);
        return { ...formatted, institution: user.institution };
    }

    async updateStatus(userId: string, dto: UpdateUserStatusDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new CustomHttpException(COMMON_MESSAGES.USER_NOT_FOUND, 404, COMMON_MESSAGES.USER_NOT_FOUND);
        }

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                isActive: dto.isActive,
                ...(dto.emailVerified !== undefined ? { emailVerified: dto.emailVerified } : {}),
            },
            include: {
                institution: { select: { id: true, name: true, domain: true } },
            },
        });

        const formatted = formatUserResponse(updated);
        return { ...formatted, institution: updated.institution };
    }
}
