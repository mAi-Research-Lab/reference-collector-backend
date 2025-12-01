import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RegisterDocumentDto } from '../dto/register-document.dto';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { OFFICE_MESSAGES } from '../constants/office-messages';
import { Platforms, SyncStatus } from 'generated/prisma';
import { OfficeDocumentResponse } from '../dto/office-document.response';

@Injectable()
export class OfficeDocumentsService {
    constructor(private readonly prisma: PrismaService) {}

    async registerDocument(userId: string, data: RegisterDocumentDto): Promise<OfficeDocumentResponse> {
        // Check if document already exists
        const existingDocument = await this.prisma.officeDocuments.findFirst({
            where: {
                userId,
                documentPath: data.documentPath,
            },
            include: {
                style: true
            }
        });

        // If exists, update hash and return existing document
        if (existingDocument) {
            const updatedDocument = await this.prisma.officeDocuments.update({
                where: { id: existingDocument.id },
                data: {
                    documentHash: data.documentHash,
                    lastSync: new Date()
                },
                include: {
                    style: true
                }
            });

            return updatedDocument as OfficeDocumentResponse;
        }

        // Create new document
        const officeDocument = await this.prisma.officeDocuments.create({
            data: {
                userId,
                ...data,
                citationMapping: data.libraryLinks || {},
                syncStatus: SyncStatus.pending,
                styleId: data.styleId,
                citationStyle: data.citationStyle
            },
            include: {
                style: true
            }
        });

        return officeDocument as OfficeDocumentResponse;
    }

    async getUserDocuments(userId: string): Promise<OfficeDocumentResponse[]> {
        const documents = await this.prisma.officeDocuments.findMany({
            where: {
                userId
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return documents as OfficeDocumentResponse[];
    }

    async getDocumentById(documentId: string, userId: string): Promise<OfficeDocumentResponse> {
        const document = await this.prisma.officeDocuments.findFirst({
            where: {
                id: documentId,
                userId
            }
        });

        if (!document) {
            throw new CustomHttpException(
                OFFICE_MESSAGES.DOCUMENT_NOT_FOUND,
                404,
                OFFICE_MESSAGES.DOCUMENT_NOT_FOUND
            );
        }

        return document as OfficeDocumentResponse;
    }

    async updateDocumentHash(documentId: string, userId: string, newHash: string): Promise<OfficeDocumentResponse> {
        await this.getDocumentById(documentId, userId);

        const updatedDocument = await this.prisma.officeDocuments.update({
            where: {
                id: documentId
            },
            data: {
                documentHash: newHash,
                syncStatus: SyncStatus.pending,
                updatedAt: new Date()
            }
        });

        return updatedDocument as OfficeDocumentResponse;
    }

    async updateCitationMapping(
        documentId: string, 
        userId: string, 
        citationId: string, 
        referenceId: string
    ): Promise<OfficeDocumentResponse> {

        const document = await this.getDocumentById(documentId, userId);

        const currentMapping = (document.citationMapping as any) || {};
        const updatedMapping = {
            ...currentMapping,
            [citationId]: referenceId
        };

        const updatedDocument = await this.prisma.officeDocuments.update({
            where: {
                id: documentId
            },
            data: {
                citationMapping: updatedMapping,
                lastSync: new Date()
            }
        });

        return updatedDocument as OfficeDocumentResponse;
    }

    async removeCitationMapping(
        documentId: string,
        userId: string,
        citationId: string
    ): Promise<OfficeDocumentResponse> {
        const document = await this.getDocumentById(documentId, userId);

        const currentMapping = (document.citationMapping as any) || {};
        delete currentMapping[citationId];

        const updatedDocument = await this.prisma.officeDocuments.update({
            where: {
                id: documentId
            },
            data: {
                citationMapping: currentMapping,
                lastSync: new Date()
            }
        });

        return updatedDocument as OfficeDocumentResponse;
    }

    async updateSyncStatus(
        documentId: string,
        userId: string,
        status: SyncStatus
    ): Promise<OfficeDocumentResponse> {
        await this.getDocumentById(documentId, userId);

        const updatedDocument = await this.prisma.officeDocuments.update({
            where: {
                id: documentId
            },
            data: {
                syncStatus: status,
                lastSync: status === SyncStatus.synced ? new Date() : undefined
            }
        });

        return updatedDocument as OfficeDocumentResponse;
    }

    async deleteDocument(documentId: string, userId: string): Promise<{ message: string }> {
        await this.getDocumentById(documentId, userId);

        await this.prisma.officeDocuments.delete({
            where: {
                id: documentId
            }
        });

        return { message: OFFICE_MESSAGES.DOCUMENT_DELETED_SUCCESSFULLY };
    }

    async getDocumentsByPlatform(userId: string, platform: Platforms): Promise<OfficeDocumentResponse[]> {
        const documents = await this.prisma.officeDocuments.findMany({
            where: {
                userId,
                platform
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return documents as OfficeDocumentResponse[];
    }

    async getDocumentCitations(documentId: string, userId: string): Promise<any> {
        const document = await this.getDocumentById(documentId, userId);
        
        const citationMapping = (document.citationMapping as any) || {};
        const referenceIds = Object.values(citationMapping) as string[];

        if (referenceIds.length === 0) {
            return [];
        }

        const references = await this.prisma.references.findMany({
            where: {
                id: {
                    in: referenceIds
                }
            }
        });

        return Object.entries(citationMapping).map(([citationId, referenceId]) => ({
            citationId,
            referenceId,
            reference: references.find(ref => ref.id === referenceId)
        }));
    }

    /**
     * Set or update citation style for a document
     */
    async setDocumentStyle(
        documentId: string,
        userId: string,
        styleId: string,
        citationStyle?: string
    ): Promise<OfficeDocumentResponse> {
        await this.getDocumentById(documentId, userId);

        // Verify style exists
        const style = await this.prisma.citationStyle.findUnique({
            where: { id: styleId }
        });

        if (!style) {
            throw new CustomHttpException(
                'Citation style not found',
                404,
                'STYLE_NOT_FOUND'
            );
        }

        const updatedDocument = await this.prisma.officeDocuments.update({
            where: { id: documentId },
            data: {
                styleId: styleId,
                citationStyle: citationStyle || style.shortName,
                lastSync: new Date()
            },
            include: {
                style: true
            }
        });

        return updatedDocument as OfficeDocumentResponse;
    }

    /**
     * Get document style
     */
    async getDocumentStyle(documentId: string, userId: string): Promise<any> {
        const document = await this.prisma.officeDocuments.findFirst({
            where: {
                id: documentId,
                userId
            },
            include: {
                style: true
            }
        });

        if (!document) {
            throw new CustomHttpException(
                OFFICE_MESSAGES.DOCUMENT_NOT_FOUND,
                404,
                OFFICE_MESSAGES.DOCUMENT_NOT_FOUND
            );
        }

        return {
            styleId: document.styleId,
            citationStyle: document.citationStyle,
            style: document.style
        };
    }

    /**
     * Get document by path (for re-opening documents)
     */
    async getDocumentByPath(userId: string, documentPath: string): Promise<OfficeDocumentResponse | null> {
        const document = await this.prisma.officeDocuments.findFirst({
            where: {
                userId,
                documentPath
            },
            include: {
                style: true
            }
        });

        return document as OfficeDocumentResponse | null;
    }
}