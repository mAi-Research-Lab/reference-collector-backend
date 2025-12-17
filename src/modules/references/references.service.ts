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
import { AddFromSemanticScholarDto } from './dto/semantic-scholar/add-from-semantic-scholar.dto';
import { DoiResolverService } from '../pdf-retrieval/services/doi-resolver.service';
import { OpenAccessFinderService } from '../pdf-retrieval/services/open-access-finder.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class ReferencesService {
    private readonly logger = new Logger(ReferencesService.name);

    constructor(
        private readonly prismaService: PrismaService,
        private readonly duplicateDetectionService: DuplicateDetectionService,
        private readonly validationService: ReferenceValidationService,
        private readonly doiResolverService: DoiResolverService,
        private readonly openAccessFinderService: OpenAccessFinderService
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
        const references = await this.prismaService.references.findMany({
            where: {
                id: {
                    in: ids
                }
            }
        });
        
        // ✅ İstenen sırayla döndür (Prisma 'in' sıralamayı garanti etmez)
        const referenceMap = new Map(references.map(ref => [ref.id, ref]));
        return ids
            .map(id => referenceMap.get(id))
            .filter(ref => ref !== undefined) as ReferencesResponse[];
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

        // Tag formatını koru: hem string hem { name, color } formatını destekle
        let currentTags: Array<string | { name: string; color?: string }> = [];
        if (reference.tags && Array.isArray(reference.tags)) {
            currentTags = reference.tags as Array<string | { name: string; color?: string }>;
        }

        // Tag isimlerini normalize et
        const normalizeTagName = (tag: string | { name: string; color?: string }): string => {
            return typeof tag === 'string' ? tag : tag.name;
        };

        // Sadece silinmeyecek tag'ları tut (name'e göre karşılaştır)
        const updatedTags = currentTags
            .map(tag => {
                // Object formatına çevir
                if (typeof tag === 'string') {
                    return { name: tag, color: '#3b82f6' };
                }
                return tag;
            })
            .filter(tag => !tags.includes(normalizeTagName(tag)));

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
            // Kullanıcının erişebildiği library'lerde ara
            whereConditions.library = {
                OR: [
                    // Owner olduğu library'ler
                    { ownerId: userId },
                    // Üye olduğu library'ler
                    { memberships: { some: { userId: userId } } }
                ]
            };
        }

        return await this.prismaService.references.findMany({
            where: whereConditions,
            include: {
                library: true
            }
        });
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

    async checkDuplicateSemanticScholar(libraryId: string, paperId: string): Promise<boolean> {
        // Find all references in the library
        const references = await this.prismaService.references.findMany({
            where: {
                libraryId,
            },
            select: {
                id: true,
                metadata: true,
            },
        });

        // Check if any reference has matching paperId in metadata.semanticScholar.paperId
        for (const ref of references) {
            if (ref.metadata && typeof ref.metadata === 'object') {
                const metadata = ref.metadata as any;
                if (
                    metadata.semanticScholar &&
                    metadata.semanticScholar.paperId === paperId
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    async addFromSemanticScholar(dto: AddFromSemanticScholarDto): Promise<ReferencesResponse> {
        // Validate addedBy is provided
        if (!dto.addedBy) {
            throw new CustomHttpException('User ID is required', 400, 'USER_ID_REQUIRED');
        }

        // Check for duplicate
        const isDuplicate = await this.checkDuplicateSemanticScholar(dto.libraryId, dto.paperId);

        if (isDuplicate) {
            throw new CustomHttpException(
                'This paper already exists in your library',
                409,
                'DUPLICATE_REFERENCE',
            );
        }

        // Determine reference type from paper data
        const type = this.determineReferenceTypeFromSemanticScholar(dto.paperData);

        // Build authors array
        const authors = dto.paperData.authors?.map((author: any) => ({
            name: author.name || `${author.givenName || ''} ${author.familyName || ''}`.trim(),
            authorId: author.authorId,
        })) || [];

        // Build metadata with Semantic Scholar data
        const metadata = {
            semanticScholar: {
                paperId: dto.paperId,
                corpusId: dto.paperData.corpusId,
                externalIds: dto.paperData.externalIds,
                influentialCitationCount: dto.paperData.influentialCitationCount,
                isOpenAccess: dto.paperData.isOpenAccess,
                openAccessPdf: dto.paperData.openAccessPdf,
                fieldsOfStudy: dto.paperData.fieldsOfStudy,
                publicationTypes: dto.paperData.publicationTypes,
                publicationDate: dto.paperData.publicationDate,
            },
        };

        // Determine URL: Try multiple sources for PDF
        let url = dto.paperData.openAccessPdf?.url || null;

        // If no PDF from Semantic Scholar, try to find PDF from DOI
        if (!url && dto.paperData.externalIds?.DOI) {
            const doi = dto.paperData.externalIds.DOI;

            // 1. Try Crossref API
            try {
                const crossrefPdfUrl = await this.doiResolverService.findPdfFromDoi(doi);
                if (crossrefPdfUrl) {
                    url = crossrefPdfUrl;
                    this.logger.log(`Found PDF from Crossref for DOI: ${doi}`);
                }
            } catch (error) {
                this.logger.debug(`Crossref PDF search failed for DOI ${doi}: ${error.message}`);
                // Continue to try Unpaywall
            }

            // 2. If still not found, try Unpaywall API
            if (!url) {
                try {
                    const unpaywallResult = await this.openAccessFinderService.searchUnpaywall(doi);
                    if (unpaywallResult?.url) {
                        url = unpaywallResult.url;
                        this.logger.log(`Found PDF from Unpaywall for DOI: ${doi}`);
                    }
                } catch (error) {
                    this.logger.debug(`Unpaywall PDF search failed for DOI ${doi}: ${error.message}`);
                    // Fallback to DOI URL
                }
            }

            // 3. Final fallback: Use DOI URL if no PDF found
            if (!url) {
                url = `https://doi.org/${doi}`;
            }
        }

        // Create reference (skip validation since it's from Semantic Scholar)
        return await this.prismaService.references.create({
            data: {
                libraryId: dto.libraryId,
                collectionId: dto.collectionId || null,
                type: type || 'journal',
                title: dto.paperData.title || '',
                authors: authors.length > 0 ? (authors as any) : null,
                publication: dto.paperData.venue || dto.paperData.journal?.name || null,
                publisher: null,
                year: dto.paperData.year || null,
                volume: dto.paperData.journal?.volume || null,
                issue: null,
                pages: dto.paperData.journal?.pages || null,
                doi: dto.paperData.externalIds?.DOI || null,
                isbn: null,
                issn: null,
                url: url,
                abstractText: dto.paperData.abstract || null,
                language: null,
                citationCount: dto.paperData.citationCount || 0,
                addedBy: dto.addedBy,
                metadata: metadata as any,
            },
        }) as ReferencesResponse;
    }

    private determineReferenceTypeFromSemanticScholar(paperData: any): string {
        // Check publication types from Semantic Scholar
        if (paperData.publicationTypes && Array.isArray(paperData.publicationTypes)) {
            const types = paperData.publicationTypes.map((t: string) => t.toLowerCase());

            if (types.includes('journalarticle') || types.includes('article')) {
                return 'journal';
            }
            if (types.includes('book') || types.includes('bookchapter')) {
                return 'book';
            }
            if (types.includes('conference') || types.includes('workshop')) {
                return 'conference';
            }
            if (types.includes('thesis') || types.includes('dissertation')) {
                return 'thesis';
            }
        }

        // Fallback: check venue
        const venue = (paperData.venue || '').toLowerCase();
        if (venue.includes('conference') || venue.includes('workshop') || venue.includes('proceedings')) {
            return 'conference';
        }
        if (venue.includes('journal') || paperData.journal) {
            return 'journal';
        }

        // Default to journal
        return 'journal';
    }
}
