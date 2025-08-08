import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { DocumentCollaboratorService } from 'src/modules/documents/services/document-collaborator.service';
import { DocumentsService } from 'src/modules/documents/services/documents.service';
import { ReferencesService } from 'src/modules/references/references.service';
import { UserService } from 'src/modules/user/user.service';
import { CitationStylesService } from './citation-styles.service'; // Style service'i import et
import { CitationResponse, CitationResponseWithReferences } from '../dto/citation.response';
import { CreateCitationDto } from '../dto/create-citation.dto';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { CITATIONS_MESSAGES } from '../constants/citation.messages';
import { UpdateCitationDto } from '../dto/update-citation.dto';

@Injectable()
export class CitationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly documentCollaboratorService: DocumentCollaboratorService,
        private readonly referenceService: ReferencesService,
        private readonly documentService: DocumentsService,
        private readonly citationStylesService: CitationStylesService
    ) { }

    async create(userId: string, data: CreateCitationDto): Promise<CitationResponse> {
        if (data.documentId && !data.documentId.startsWith('doc_')) {
            if (!await this.checkDocumentAccess(data.documentId, userId)) {
                throw new CustomHttpException(CITATIONS_MESSAGES.USER_NOT_COLLABORATOR, 403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR);
            }
        }

        await this.referenceService.getReference(data.referenceId);
        const sortOrder = await this.getNextSortOrder(data.documentId);

        const styleId = data.styleId || await this.getDefaultStyleId();

        const citation_text = await this.citationStylesService.formatCitationWithStyle(styleId, {
            referenceId: data.referenceId,
            suppressAuthor: data.suppressAuthor,
            suppressDate: data.suppressDate,
            pageNumbers: data.pageNumbers,
            prefix: data.prefix,
            suffix: data.suffix
        });

        const citation = await this.prisma.citation.create({
            data: {
                referenceId: data.referenceId,
                documentId: data.documentId,
                citationText: citation_text,
                pageNumbers: data.pageNumbers || '',
                prefix: data.prefix || '',
                suffix: data.suffix || '',
                suppressAuthor: data.suppressAuthor || false,
                suppressDate: data.suppressDate || false,
                sortOrder: sortOrder,
                styleId: styleId,
                fieldId: data.fieldId
            }
        });

        return citation;
    }

    async getCitationsByDocument(documentId: string, userId: string): Promise<CitationResponseWithReferences[]> {
        if (!documentId.startsWith('doc_')) {
            if (!await this.checkDocumentAccess(documentId, userId)) {
                throw new CustomHttpException(CITATIONS_MESSAGES.USER_NOT_COLLABORATOR, 403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR);
            }
        }

        const citations = await this.prisma.citation.findMany({
            where: {
                documentId,
            },
            orderBy: {
                sortOrder: 'asc'
            },
            include: {
                reference: true
            }
        });

        return citations;
    }

    async update(id: string, data: UpdateCitationDto): Promise<CitationResponse> {
        const citation = await this.prisma.citation.findUnique({
            where: { id }
        });

        if (!citation) {
            throw new CustomHttpException(CITATIONS_MESSAGES.CITATION_NOT_FOUND, 404, CITATIONS_MESSAGES.CITATION_NOT_FOUND);
        }

        let citation_text = citation.citationText;
        if (data.styleId && data.styleId !== citation.styleId) {
            citation_text = await this.citationStylesService.formatCitationWithStyle(data.styleId, {
                referenceId: citation.referenceId,
                suppressAuthor: data.suppressAuthor ?? citation.suppressAuthor,
                suppressDate: data.suppressDate ?? citation.suppressDate,
                pageNumbers: data.pageNumbers ?? citation.pageNumbers!,
                prefix: data.prefix ?? citation.prefix!,
                suffix: data.suffix ?? citation.suffix!
            });
        } else if (data.suppressAuthor !== undefined || data.suppressDate !== undefined ||
            data.pageNumbers !== undefined || data.prefix !== undefined || data.suffix !== undefined) {
            // Diğer parametreler değişmişse yeniden formatla
            citation_text = await this.citationStylesService.formatCitationWithStyle(citation.styleId, {
                referenceId: citation.referenceId,
                suppressAuthor: data.suppressAuthor ?? citation.suppressAuthor,
                suppressDate: data.suppressDate ?? citation.suppressDate,
                pageNumbers: data.pageNumbers ?? citation.pageNumbers!,
                prefix: data.prefix ?? citation.prefix!,
                suffix: data.suffix ?? citation.suffix!
            });
        }

        const updatedCitation = await this.prisma.citation.update({
            where: { id },
            data: {
                ...data,
                citationText: citation_text
            }
        });

        return updatedCitation;
    }

    async delete(id: string): Promise<{ message: string }> {
        const citation = await this.prisma.citation.findUnique({
            where: { id }
        });

        if (!citation) {
            throw new CustomHttpException(CITATIONS_MESSAGES.CITATION_NOT_FOUND, 404, CITATIONS_MESSAGES.CITATION_NOT_FOUND);
        }

        await this.prisma.citation.delete({
            where: { id }
        });

        return { message: CITATIONS_MESSAGES.CITATION_DELETED_SUCCESSFULLY };
    }

    async updateFieldId(citationId: string, fieldId: string): Promise<CitationResponse> {
        const citation = await this.prisma.citation.findUnique({
            where: { id: citationId }
        });

        if (!citation) {
            throw new CustomHttpException(CITATIONS_MESSAGES.CITATION_NOT_FOUND, 404, CITATIONS_MESSAGES.CITATION_NOT_FOUND);
        }

        return await this.prisma.citation.update({
            where: { id: citationId },
            data: { fieldId }
        });
    }

    async updateSortOrder(citationId: string, sortOrder: number): Promise<void> {
        const citation = await this.prisma.citation.findUnique({
            where: { id: citationId }
        });

        if (!citation) {
            throw new CustomHttpException(CITATIONS_MESSAGES.CITATION_NOT_FOUND, 404, CITATIONS_MESSAGES.CITATION_NOT_FOUND);
        }

        await this.prisma.citation.update({
            where: { id: citationId },
            data: { sortOrder }
        });
    }

    async generateBibliography(documentId: string, userId: string, styleId?: string): Promise<any> {
        const whereClause: any = { documentId };

        if (documentId.startsWith('doc_')) {
            whereClause.userId = userId;
        } else {
            if (!await this.checkDocumentAccess(documentId, userId)) {
                throw new CustomHttpException(CITATIONS_MESSAGES.USER_NOT_COLLABORATOR, 403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR);
            }
        }

        const citations = await this.prisma.citation.findMany({
            where: whereClause,
            orderBy: {
                sortOrder: 'asc'
            }
        });

        if (citations.length === 0) {
            return {
                bibliographyText: 'No citations found for this document.',
                citationCount: 0,
                uniqueReferences: 0,
                style: 'none'
            };
        }

        const finalStyleId = styleId || citations[0]?.styleId || await this.getDefaultStyleId();

        const uniqueReferenceIds = [...new Set(citations.map(c => c.referenceId))];

        const bibliographyEntries = await this.citationStylesService.generateBibliography(uniqueReferenceIds, finalStyleId);

        const bibliographyText = `References\n\n${bibliographyEntries.join('\n\n')}`;

        const style = await this.citationStylesService.getStyleById(finalStyleId);

        return {
            bibliographyText,
            citationCount: citations.length,
            uniqueReferences: uniqueReferenceIds.length,
            style: style.name
        };
    }

    async refreshCitationsByStyle(documentId: string, newStyleId: string, userId: string): Promise<number> {
        const whereClause: any = { documentId };

        if (documentId.startsWith('doc_')) {
            whereClause.userId = userId;
        } else {
            if (!await this.checkDocumentAccess(documentId, userId)) {
                throw new CustomHttpException(CITATIONS_MESSAGES.USER_NOT_COLLABORATOR, 403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR);
            }
        }

        const citations = await this.prisma.citation.findMany({
            where: whereClause
        });

        let updatedCount = 0;

        for (const citation of citations) {
            try {
                const newCitationText = await this.citationStylesService.formatCitationWithStyle(newStyleId, {
                    referenceId: citation.referenceId,
                    suppressAuthor: citation.suppressAuthor,
                    suppressDate: citation.suppressDate,
                    pageNumbers: citation.pageNumbers!,
                    prefix: citation.prefix!,
                    suffix: citation.suffix!
                });

                await this.prisma.citation.update({
                    where: { id: citation.id },
                    data: {
                        citationText: newCitationText,
                        styleId: newStyleId
                    }
                });

                updatedCount++;
            } catch (error) {
                console.error(`Failed to update citation ${citation.id}:`, error);
            }
        }

        return updatedCount;
    }

    private async checkDocumentAccess(documentId: string, userId: string): Promise<boolean> {
        const document = await this.documentService.getDocument(documentId);

        if (document.createdBy === userId) return true;

        const collaborators = await this.documentCollaboratorService.getDocumentCollaborators(documentId);

        return collaborators.some((collaborator) =>
            collaborator.userId === userId && (collaborator.role === 'owner' || collaborator.role === 'editor')
        );
    }

    private async getNextSortOrder(documentId: string): Promise<number> {
        const lastCitation = await this.prisma.citation.findFirst({
            where: { documentId },
            orderBy: { sortOrder: 'desc' }
        });

        return (lastCitation?.sortOrder || 0) + 1;
    }

    private async getDefaultStyleId(): Promise<string> {
        const apaStyle = await this.prisma.citationStyle.findFirst({
            where: { shortName: 'apa' }
        });

        if (!apaStyle) {
            const firstStyle = await this.prisma.citationStyle.findFirst();
            if (!firstStyle) {
                throw new CustomHttpException('No citation styles available', 500, 'No citation styles available');
            }
            return firstStyle.id;
        }

        return apaStyle.id;
    }
}