import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CreateReferenceDto } from './dto/reference/create-reference.dto';
import { ReferencesResponse } from './dto/reference/references.response';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { REFERENCES_MESSAGES } from './constants/references.message';
import { UpdateReferenceDto } from './dto/reference/update-reference.dto';
import { Prisma } from 'generated/prisma';

@Injectable()
export class ReferencesService {
    constructor(
        private readonly prismaService: PrismaService
    ) { }

    async create(libraryId: string, data: CreateReferenceDto): Promise<ReferencesResponse> {        
        const { addedBy, ...referenceData } = data;

        return await this.prismaService.references.create({
            data: {
                ...referenceData,
                library: {
                    connect: {
                        id: libraryId
                    }
                },
                addedByUser: {
                    connect: {
                        id: addedBy
                    }
                },
                type: data.type ? data.type : ""
            }
        });

    }

    async getReference(id: string): Promise<ReferencesResponse> {
        const reference = await this.prismaService.references.findUnique({
            where: { id }
        })

        if (!reference) {
            throw new CustomHttpException(REFERENCES_MESSAGES.REFERENCE_NOT_FOUND, 404, REFERENCES_MESSAGES.REFERENCE_NOT_FOUND);
        }

        return reference;
    }

    async updateReference(id: string, data: UpdateReferenceDto): Promise<ReferencesResponse> {
        const reference = await this.prismaService.references.findUnique({
            where: { id }
        })

        if (!reference) {
            throw new CustomHttpException(REFERENCES_MESSAGES.REFERENCE_NOT_FOUND, 404, REFERENCES_MESSAGES.REFERENCE_NOT_FOUND);
        }

        return await this.prismaService.references.update({
            where: { id },
            data
        })
    }

    async deleteReference(id: string): Promise<{ message: string }> {
        const reference = await this.prismaService.references.findUnique({
            where: { id }
        })

        if (!reference) {
            throw new CustomHttpException(REFERENCES_MESSAGES.REFERENCE_NOT_FOUND, 404, REFERENCES_MESSAGES.REFERENCE_NOT_FOUND);
        }

        await this.prismaService.references.delete({
            where: { id }
        })

        return { message: REFERENCES_MESSAGES.REFERENCE_DELETED_SUCCESSFULLY }
    }

    async getReferenceByDoi(doi: string): Promise<ReferencesResponse> {
        const reference = await this.prismaService.references.findFirst({
            where: { doi: doi }
        })

        if (!reference) {
            throw new CustomHttpException(REFERENCES_MESSAGES.REFERENCE_NOT_FOUND, 404, REFERENCES_MESSAGES.REFERENCE_NOT_FOUND);
        }

        return reference;
    }

    async addTagsToReference(id: string, tags: string[]): Promise<ReferencesResponse> {
        return await this.prismaService.references.update({
            where: { id },
            data: { tags }
        })
    }

    async removeTagsFromReference(id: string, tags: string[]): Promise<ReferencesResponse> {
        return await this.prismaService.references.update({
            where: { id },
            data: { tags: { set: tags } }
        })
    }

    async searchReferences(
        searchTerm: string,
        libraryId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{
        data: ReferencesResponse[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const searchConditions = {
        libraryId,
        OR: [
            { title: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
            { publication: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
            { publisher: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
            { doi: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
            { isbn: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
            { abstractText: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
            {
                authors: {
                    path: [],
                    string_contains: searchTerm
                }
            }
        ]
    };

        const [data, total] = await Promise.all([
            this.prismaService.references.findMany({
                where: searchConditions,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            this.prismaService.references.count({
                where: searchConditions
            })
        ]);

        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async filterReferencesAdvanced(
        libraryId: string,
        filters: {
            tags?: string[];
            year?: number;
            yearFrom?: number;
            yearTo?: number;
            journal?: string;
            authors?: string;
            referenceType?: string;
        }
    ): Promise<ReferencesResponse[]> {
        const whereConditions: any = { libraryId };

        if (filters.tags && filters.tags.length > 0) {
            whereConditions.tags = {
                hasSome: filters.tags
            };
        }

        if (filters.year) {
            whereConditions.year = filters.year;
        }

        if (filters.yearFrom || filters.yearTo) {
            whereConditions.year = {};
            if (filters.yearFrom) whereConditions.year.gte = filters.yearFrom;
            if (filters.yearTo) whereConditions.year.lte = filters.yearTo;
        }

        if (filters.journal) {
            whereConditions.journal = {
                contains: filters.journal,
                mode: 'insensitive'
            };
        }

        if (filters.authors) {
            whereConditions.authors = {
                contains: filters.authors,
                mode: 'insensitive'
            };
        }

        if (filters.referenceType) {
            whereConditions.referenceType = filters.referenceType;
        }

        return await this.prismaService.references.findMany({
            where: whereConditions,
            orderBy: { createdAt: 'desc' }
        });
    }

}
