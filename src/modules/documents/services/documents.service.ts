/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CreateDocumentDto } from '../dto/document/create-document.dto';
import { DocumentResponse } from '../dto/document/document.response';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { DOCUMENT_MESSAGES } from '../constants/document/document.messages';
import { UpdateDocumentDto } from '../dto/document/update-document.dto';
import { ContentDeltaDto } from '../dto/document/content-delta.dto';
import { CollaboratorRoles, Documents } from 'generated/prisma';

@Injectable()
export class DocumentsService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async create(createdBy: string, data: CreateDocumentDto): Promise<DocumentResponse> {
        const { contentDelta, templateId, ...rest } = data;
        const document = await this.prisma.documents.create({
            data: {
                ...rest,
                createdBy,
                contentDelta: contentDelta as any,
                ...(this.isUuid(templateId) ? { templateId } : {})
            }
        });

        await this.prisma.documentCollaborators.create({
            data: {
                documentId: document.id,
                userId: createdBy,
                role: CollaboratorRoles.owner,
                invitedBy: createdBy,
                acceptedAt: new Date(),
                permissions: {}
            }
        });

        return {
            ...document,
            contentDelta: document.contentDelta as any,
        } as DocumentResponse;
    }

    async getDocument(documentId: string): Promise<DocumentResponse> {
        const document = await this.prisma.documents.findUnique({
            where: {
                id: documentId
            }
        });

        if (!document) throw new CustomHttpException(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, 404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND);

        return {
            ...document,
            contentDelta: document.contentDelta as any,
        } as DocumentResponse;
    }

    async getUserDocuments(userId: string): Promise<DocumentResponse[]> {
        const documents = await this.prisma.documents.findMany({
            where: {
                createdBy: userId
            }
        });

        return documents as DocumentResponse[];
    }

    async getLibraryDocuments(userId: string, libraryId: string): Promise<DocumentResponse[]> {
        const documents = await this.prisma.documents.findMany({
            where: {
                libraryId,
                createdBy: userId,
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return documents as DocumentResponse[];
    }

    async updateDocument(documentId: string, data: UpdateDocumentDto): Promise<DocumentResponse> {

        const document = await this.prisma.documents.findUnique({
            where: {
                id: documentId
            }
        });

        if (!document) throw new CustomHttpException(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, 404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND);

        if (!this.checkDocumentOwnership(document, document.createdBy)) {
            throw new CustomHttpException(DOCUMENT_MESSAGES.USER_NOT_OWNER, 404, DOCUMENT_MESSAGES.USER_NOT_OWNER);
        }

        const { contentDelta, templateId, ...rest } = data;
        const content = data.content ?? document.content;
        const updatedDocument = await this.prisma.documents.update({
            where: {
                id: documentId
            },
            data: {
                ...rest,
                ...(contentDelta !== undefined ? { contentDelta: contentDelta as any } : {}),
                ...(this.isUuid(templateId) ? { templateId } : {}),
                updatedAt: new Date(),
                wordCount: content.split(' ').filter(Boolean).length,
                charCount: content.length
            }
        });

        return {
            ...updatedDocument,
            contentDelta: updatedDocument.contentDelta as any,
        } as DocumentResponse;
    }

    async deleteDocument(documentId: string): Promise<{ message: string }> {
        const document = await this.prisma.documents.findUnique({
            where: {
                id: documentId
            }
        });

        if (!document) throw new CustomHttpException(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, 404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND);

        if (!this.checkDocumentOwnership(document, document.createdBy)) {
            throw new CustomHttpException(DOCUMENT_MESSAGES.USER_NOT_OWNER, 404, DOCUMENT_MESSAGES.USER_NOT_OWNER);
        }

        await this.prisma.documents.delete({
            where: {
                id: documentId
            }
        });

        return { message: DOCUMENT_MESSAGES.DOCUMENT_DELETED_SUCCESSFULLY };
    }


    async updateContent(documentId: string, content: string): Promise<DocumentResponse> {
        const document = await this.prisma.documents.findUnique({
            where: {
                id: documentId
            }
        });

        if (!document) throw new CustomHttpException(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, 404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND);

        const updatedDocument = await this.prisma.documents.update({
            where: {
                id: documentId
            },
            data: {
                content,
                wordCount: content.split(' ').length,
                charCount: content.length,
                contentDelta: document.contentDelta as any,
                updatedAt: new Date()
            }
        });

        return {
            ...updatedDocument,
            contentDelta: updatedDocument.contentDelta as any,
        } as DocumentResponse;
    }

    async publishDocument(documentId: string): Promise<DocumentResponse> {
        const document = await this.prisma.documents.findUnique({
            where: {
                id: documentId
            }
        });

        if (!document) throw new CustomHttpException(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, 404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND);

        const publishedDocument = await this.prisma.documents.update({
            where: {
                id: documentId
            },
            data: {
                isPublished: true,
                publishedAt: new Date()
            }
        });

        return {
            ...publishedDocument,
            contentDelta: publishedDocument.contentDelta as any,
        } as DocumentResponse;
    }

    private checkDocumentOwnership(document: Documents, userId: string): boolean {
        return document.createdBy === userId;
    }

    private isUuid(value?: string): value is string {
        return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }
}
