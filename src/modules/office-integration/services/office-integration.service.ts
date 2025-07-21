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
        const existingDocument = await this.prisma.officeDocuments.findFirst({
            where: {
                userId,
                documentPath: data.documentPath,
                documentHash: data.documentHash
            }
        });

        if (existingDocument) {
            throw new CustomHttpException(
                OFFICE_MESSAGES.DOCUMENT_ALREADY_REGISTERED,
                409,
                OFFICE_MESSAGES.DOCUMENT_ALREADY_REGISTERED
            );
        }

        const officeDocument = await this.prisma.officeDocuments.create({
            data: {
                userId,
                ...data,
                citationMapping: data.libraryLinks || {},
                syncStatus: SyncStatus.pending
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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
}