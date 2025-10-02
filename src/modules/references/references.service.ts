import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CreateReferenceDto } from './dto/reference/create-reference.dto';
import { ReferencesResponse } from './dto/reference/references.response';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { REFERENCES_MESSAGES } from './constants/references.message';
import { UpdateReferenceDto } from './dto/reference/update-reference.dto';
import { Prisma } from 'generated/prisma';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { ReferenceValidationService } from './services/reference-validation.service';

@Injectable()
export class ReferencesService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly duplicateDetectionService: DuplicateDetectionService,
        private readonly validationService: ReferenceValidationService
    ) { }

    async create(libraryId: string, data: CreateReferenceDto): Promise<ReferencesResponse> {
        const { addedBy, ...referenceData } = data;

        const validationResult = await this.validationService.validateReference(referenceData);

        if (!validationResult.isValid && validationResult.score < 60) {
            throw new CustomHttpException(
                `Reference validation failed. Score: ${validationResult.score}/100. Issues: ${validationResult.warnings.join(', ')}`,
                400,
                'REFERENCE_VALIDATION_FAILED'
            );
        }

        return await this.prismaService.references.create({
            data: {
                ...referenceData,
                collectionId: data.collectionId ? data.collectionId : null,
                libraryId: libraryId,
                addedBy: addedBy,
                type: data.type ? data.type : "",
                tags: data.tags ? { set: data.tags } : undefined,
            }
        }) as ReferencesResponse;
    }

    async getReferencesByLibrary(libraryId: string): Promise<ReferencesResponse[]> {
        return await this.prismaService.references.findMany({
            where: {
                library: {
                    id: libraryId
                }
            }
        })
    }

    async getReferencesByIds(ids: string[]): Promise<ReferencesResponse[]> {
        return await this.prismaService.references.findMany({
            where: {
                id: {
                    in: ids
                }
            }
        })
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

    async getReferencesByCollection(collectionId: string): Promise<ReferencesResponse[]> {
        return await this.prismaService.references.findMany({
            where: {
                collectionId: collectionId,
            }
        })
    }

    async addTagsToReference(id: string, tags: string[]): Promise<ReferencesResponse> {
        return await this.prismaService.references.update({
            where: { id },
            data: { tags }
        })
    }

    async removeTagsFromReference(id: string, tags: string[]): Promise<ReferencesResponse> {
        const reference = await this.prismaService.references.findUnique({
            where: { id }
        });

        if (!reference) {
            throw new CustomHttpException('Reference not found', 404, 'REFERENCE_NOT_FOUND');
        }

        let currentTags: string[] = [];
        if (reference.tags && Array.isArray(reference.tags)) {
            currentTags = reference.tags.filter(tag => typeof tag === 'string') as string[];
        }

        const updatedTags = currentTags.filter(tag => !tags.includes(tag));

        return await this.prismaService.references.update({
            where: { id },
            data: { tags: updatedTags }
        });
    }

    async updateTagsInReference(id: string, tags: Array<{ name: string; color?: string }>): Promise<ReferencesResponse> {
        const reference = await this.prismaService.references.findUnique({
            where: { id }
        });

        if (!reference) {
            throw new CustomHttpException('Reference not found', 404, 'REFERENCE_NOT_FOUND');
        }

        return await this.prismaService.references.update({
            where: { id },
            data: { tags: tags }
        });
    }

    async searchReferencesWithLibrary(
        searchTerm: string,
        libraryId: string,
        page: number = 1,
        limit: number = 10,
        userId?: string
    ): Promise<{
        data: ReferencesResponse[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const searchConditions: any = {
            libraryId,
            isDeleted: false,
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

        if (userId) {
            const libraryAccess = await this.prismaService.libraryMemberships.findFirst({
                where: {
                    libraryId: libraryId,
                    userId: userId
                }
            });

            if (!libraryAccess) {
                throw new CustomHttpException('Access denied to this library', 403, 'LIBRARY_ACCESS_DENIED');
            }
        }

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

    async searchReferences(searchTerm: string, userId?: string): Promise<ReferencesResponse[]> {
        const whereConditions: any = {
            isDeleted: false,
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

        if (userId) {
            whereConditions.library = {
                libraryMemberships: {
                    some: {
                        userId: userId,
                    }
                }
            };
        }

        return await this.prismaService.references.findMany({
            where: whereConditions,
            include: {
                library: true
            }
        })
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

    async moveReference(id: string, libraryId?: string, collectionId?: string, modifiedBy?: string): Promise<ReferencesResponse> {
        const reference = await this.prismaService.references.findUnique({
            where: { id }
        });

        if (!reference) {
            throw new CustomHttpException(
                REFERENCES_MESSAGES.REFERENCE_NOT_FOUND,
                404,
                REFERENCES_MESSAGES.REFERENCE_NOT_FOUND
            );
        }

        const updateData: { libraryId?: string; collectionId?: string | null; modifiedBy?: string } = {};

        if (modifiedBy) {
            updateData.modifiedBy = modifiedBy;
        }

        if (libraryId && libraryId !== reference.libraryId) {
            const libraryExists = await this.prismaService.libraries.findUnique({
                where: { id: libraryId }
            });

            if (!libraryExists) {
                throw new CustomHttpException(
                    'Library not found',
                    404,
                    'LIBRARY_NOT_FOUND'
                );
            }

            updateData.libraryId = libraryId;

            if (collectionId === undefined) {
                updateData.collectionId = null;
            }
        }

        if (collectionId !== undefined) {
            if (collectionId && collectionId.trim() !== '') {
                const targetLibraryId = updateData.libraryId || reference.libraryId;

                const collection = await this.prismaService.collections.findFirst({
                    where: {
                        id: collectionId,
                        libraryId: targetLibraryId
                    }
                });

                if (!collection) {
                    throw new CustomHttpException(
                        'Collection not found or does not belong to the specified library',
                        404,
                        'COLLECTION_NOT_FOUND_OR_INVALID'
                    );
                }

                updateData.collectionId = collectionId;
            } else {
                updateData.collectionId = null;
            }
        }

        if (Object.keys(updateData).length === 0) {
            return reference as ReferencesResponse;
        }

        return await this.prismaService.references.update({
            where: { id },
            data: updateData
        });
    }
}
