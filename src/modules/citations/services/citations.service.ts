import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { DocumentCollaboratorService } from 'src/modules/documents/services/document-collaborator.service';
import { DocumentsService } from 'src/modules/documents/services/documents.service';
import { ReferencesService } from 'src/modules/references/references.service';
import { UserService } from 'src/modules/user/user.service';
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
        private readonly documentService: DocumentsService
    ) { }

    async create(userId: string, data: CreateCitationDto): Promise<CitationResponse> {
        if (!await this.checkDocumentAccess(data.documentId, userId)) {
            throw new CustomHttpException(CITATIONS_MESSAGES.USER_NOT_COLLABORATOR, 403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR);
        }

        const reference = await this.referenceService.getReference(data.referenceId);

        const citation_text = this.formatCitation(data, reference);
        const citation = await this.prisma.citation.create({
            data: {
                ...data,
                citationText: citation_text,
            }
        });

        return citation;
    }

    async getCitationsByDocument(documentId: string, userId: string): Promise<CitationResponseWithReferences[]> {
        if (!await this.checkDocumentAccess(documentId, userId)) {
            throw new CustomHttpException(CITATIONS_MESSAGES.USER_NOT_COLLABORATOR, 403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR);
        }

        const citations = await this.prisma.citation.findMany({
            where: {
                documentId
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

    async update(id: string, data: UpdateCitationDto, userId: string): Promise<CitationResponse> {
        const citation = await this.prisma.citation.findUnique({
            where: {
                id
            }
        });

        if (!citation) {
            throw new CustomHttpException(CITATIONS_MESSAGES.CITATION_NOT_FOUND, 404, CITATIONS_MESSAGES.CITATION_NOT_FOUND);
        }

        if (!await this.checkDocumentAccess(citation.documentId, userId)) {
            throw new CustomHttpException(CITATIONS_MESSAGES.USER_NOT_COLLABORATOR, 403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR);
        }

        const reference = await this.referenceService.getReference(citation.referenceId);

        const citation_text = this.formatCitation(citation, reference);
        const updatedCitation = await this.prisma.citation.update({
            where: {
                id
            },
            data: {
                ...data,
                citationText: citation_text
            }
        });

        return updatedCitation;
    }

    async delete(id: string, userId: string): Promise<{ message: string }> {
        const citation = await this.prisma.citation.findUnique({
            where: {
                id
            }
        });

        if (!citation) {
            throw new CustomHttpException(CITATIONS_MESSAGES.CITATION_NOT_FOUND, 404, CITATIONS_MESSAGES.CITATION_NOT_FOUND);
        }

        if (!await this.checkDocumentAccess(citation.documentId, userId)) {
            throw new CustomHttpException(CITATIONS_MESSAGES.USER_NOT_COLLABORATOR, 403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR);
        }

        await this.prisma.citation.delete({
            where: {
                id
            }
        });

        return { message: CITATIONS_MESSAGES.CITATION_DELETED_SUCCESSFULLY };
    }

    private async checkDocumentAccess(documentId: string, userId: string): Promise<boolean> {
        const document = await this.documentService.getDocument(documentId);

        if (document.createdBy === userId) return true;

        const collaborators = await this.documentCollaboratorService.getDocumentCollaborators(documentId);

        return collaborators.some((collaborator) =>
            collaborator.userId === userId && (collaborator.role === 'owner' || collaborator.role === 'editor')
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private formatCitation(citation: CreateCitationDto | UpdateCitationDto | CitationResponse, reference: any, style: string = 'apa'): string {
        const authors = citation.suppressAuthor ? '' : (reference.authors?.[0]?.lastName || 'Unknown');
        const year = citation.suppressDate ? '' : (reference.year || 'n.d.');
        const pages = citation.pageNumbers ? `, p. ${citation.pageNumbers}` : '';
        const prefix = citation.prefix ? `${citation.prefix} ` : '';
        const suffix = citation.suffix ? `, ${citation.suffix}` : '';

        return `${prefix}(${authors}, ${year}${pages}${suffix})`;
    }


}
