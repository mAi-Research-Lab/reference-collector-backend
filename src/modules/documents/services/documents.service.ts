/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CreateDocumentDto } from '../dto/document/create-document.dto';
import { DocumentResponse } from '../dto/document/document.response';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { DOCUMENT_MESSAGES } from '../constants/document/document.messages';
import { UpdateDocumentDto } from '../dto/document/update-document.dto';
import { ContentDeltaDto } from '../dto/document/content-delta.dto';
import { Documents } from 'generated/prisma';

@Injectable()
export class DocumentsService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async create(createdBy: string, data: CreateDocumentDto): Promise<DocumentResponse> {
        const document = await this.prisma.documents.create({
            data: {
                ...data,
                createdBy,
                contentDelta: data.contentDelta as any
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

        const updatedDocument = await this.prisma.documents.update({
            where: {
                id: documentId
            },
            data: {
                ...data,
                contentDelta: data.contentDelta as any,
                updatedAt: new Date()
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
}
