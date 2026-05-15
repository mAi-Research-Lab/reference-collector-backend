/* eslint-disable no-case-declarations */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CitationOperation, DocumentOperation, OperationResult, TextOperation } from "../interfaces/document-operation.interface";
import { DocumentsService } from "src/modules/documents/services/documents.service";
import { OperationTransformUtils } from "../utils/operation-transform.utils";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { OPERATION_MESSAGES } from "../constants/operation.message";
import { DocumentCollaboratorService } from "src/modules/documents/services/document-collaborator.service";
import { OperationType } from "../enums/document-operation.interface";

@Injectable()
export class OperationalTransformService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly documentService: DocumentsService,
        private readonly documentCollaboratorService: DocumentCollaboratorService
    ) { }

    async applyOperation(operation: DocumentOperation): Promise<OperationResult> {
        if (!OperationTransformUtils.validateOperation(operation)) {
            throw new CustomHttpException(OPERATION_MESSAGES.INVALID_OPERATION_FORMAT, 400, 'INVALID_OPERATION');
        }

        const hasPermission = await this.validateUserPermissions(operation.userId, operation.documentId, operation.type);
        if (!hasPermission) {
            throw new CustomHttpException('User does not have permission', 403, 'NO_PERMISSION');
        }

        const document = await this.documentService.getDocument(operation.documentId);

        const currentVersion = document.version;
        let transformedOperation = operation;

        if (operation.version !== currentVersion) {
            const newOperations = await this.getOperationsAfterVersion(operation.documentId, operation.version);
            transformedOperation = this.transformOperations(operation, newOperations);
        }

        const shouldPersistContent = this.shouldPersistDocumentContent(transformedOperation);
        const newContent = shouldPersistContent
            ? this.applyOperationToContent(document.content, transformedOperation)
            : document.content;
        const newVersion = currentVersion! + 1;

        if (shouldPersistContent) {
            await this.updateDocumentContent(operation.documentId, newContent, newVersion, transformedOperation);
        }
        await this.saveOperation({ ...transformedOperation, version: newVersion });

        return {
            success: true,
            transformedOperation,
            conflicts: [],
            newVersion,
            appliedAt: new Date()
        };
    }

    async getOperationsAfterVersion(documentId: string, version: number): Promise<DocumentOperation[]> {
        const operations = await this.prisma.documentDeltas.findMany({
            where: {
                documentId,
                version: {
                    gt: version
                }
            },
            orderBy: {
                version: 'asc'
            }
        });

        const sortedOperations = operations.sort((a, b) =>
            a.timestamp.getTime() - b.timestamp.getTime()
        );

        const parsedOperations: DocumentOperation[] = [];

        for (const operation of sortedOperations) {
            try {
                const parsedOp = typeof operation.ops === 'string'
                    ? JSON.parse(operation.ops) as DocumentOperation
                    : JSON.parse(JSON.stringify(operation.ops)) as DocumentOperation;

                parsedOp.userId = operation.userId;
                parsedOp.documentId = operation.documentId;
                parsedOp.version = operation.version;
                parsedOp.timestamp = operation.timestamp;

                if (typeof parsedOp.timestamp === 'string') {
                    parsedOp.timestamp = new Date(parsedOp.timestamp);
                }

                if (OperationTransformUtils.validateOperation(parsedOp)) {
                    parsedOperations.push(parsedOp);
                } else {
                    console.warn(`Invalid operation found with ID: ${parsedOp.id}`);
                }
            } catch (error) {
                console.error(`Failed to parse operation from document_deltas:`, error);
                continue;
            }
        }

        return parsedOperations;
    }

    async updateDocumentContent(documentId: string, newContent: string, newVersion: number, operation?: DocumentOperation): Promise<void> {
        const document = await this.documentService.getDocument(documentId);
        const textOperation = operation as TextOperation | undefined;
        const nextContentDelta = textOperation?.attributes?.contentDelta ?? document.contentDelta;

        await this.documentService.updateDocument(document.id, operation?.userId || document.createdBy,
            {
                title: document.title,
                content: newContent,
                version: newVersion,
                contentDelta: nextContentDelta as any,
                citationStyle: document.citationStyle,
            }
        );
    }

    async saveOperation(operation: DocumentOperation): Promise<void> {
        if (!OperationTransformUtils.validateOperation(operation)) {
            throw new CustomHttpException(OPERATION_MESSAGES.INVALID_OPERATION_FORMAT, 400, 'INVALID_OPERATION');
        }

        await this.prisma.documentDeltas.create({
            data: {
                userId: operation.userId,
                documentId: operation.documentId,
                ops: operation as any,
                version: operation.version,
                timestamp: operation.timestamp
            }
        })
        await this.prisma.documents.update({
            where: {
                id: operation.documentId
            },
            data: {
                updatedAt: operation.timestamp,
                version: operation.version
            }
        })
    }

    transformOperations(newOp: DocumentOperation, existingOps: DocumentOperation[]): DocumentOperation {
        const sortedExistingOps = existingOps.sort((a, b) =>
            a.timestamp.getTime() - b.timestamp.getTime()
        );

        let transformedOp = { ...newOp };

        for (const existingOp of sortedExistingOps) {

            if (existingOp.type === OperationType.TEXT_INSERT ||
                existingOp.type === OperationType.TEXT_DELETE ||
                existingOp.type === OperationType.TEXT_FORMAT) {

                const transformResult = OperationTransformUtils.transformTextOperation(
                    transformedOp as TextOperation,
                    existingOp
                );
                transformedOp = transformResult.transformed;

            } else if (existingOp.type === OperationType.CITATION_INSERT ||
                existingOp.type === OperationType.CITATION_UPDATE ||
                existingOp.type === OperationType.CITATION_DELETE) {

                const transformResult = OperationTransformUtils.transformCitationOperation(
                    transformedOp as CitationOperation,
                    existingOp
                );
                transformedOp = transformResult.transformed;

            } else {
                transformedOp.position = OperationTransformUtils.transformPosition(
                    transformedOp.position,
                    existingOp
                );
            }

            transformedOp.version = existingOp.version;
        }

        return transformedOp;
    }

    async validateUserPermissions(userId: string, documentId: string, operationType: string): Promise<boolean> {
        const document = await this.documentService.getDocument(documentId);

        if (document.createdBy === userId) {
            return true;
        }

        const documentCollaborators = await this.documentCollaboratorService.getDocumentCollaborators(document.id);

        const userCollaborator = documentCollaborators.find(collaborator => collaborator.userId === userId);

        if (userCollaborator?.role === 'owner' || userCollaborator?.role === 'editor') {
            return true;
        }

        if (userCollaborator?.role === 'viewer') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
            return operationType === OperationType.CURSOR_MOVE;
        }

        const documentAccess = await this.prisma.documents.findUnique({
            where: { id: documentId },
            select: {
                libraryId: true,
                library: {
                    select: {
                        type: true
                    }
                }
            }
        });

        if (!documentAccess) {
            return false;
        }

        if (documentAccess.library.type !== 'shared' && documentAccess.library.type !== 'group') {
            return false;
        }

        const membership = await this.prisma.libraryMemberships.findUnique({
            where: {
                libraryId_userId: {
                    libraryId: documentAccess.libraryId,
                    userId
                }
            }
        });

        if (!membership) {
            return false;
        }

        if (membership.role === 'owner' || membership.role === 'admin' || membership.role === 'editor' || membership.role === 'member') {
            return true;
        }

        if (membership.role === 'viewer') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
            return operationType === OperationType.CURSOR_MOVE;
        }

        return false;
    }

    async processIncomingOperation(operation: DocumentOperation): Promise<OperationResult> {
        if (!OperationTransformUtils.validateOperation(operation)) {
            throw new CustomHttpException(OPERATION_MESSAGES.INVALID_OPERATION_FORMAT, 400, 'INVALID_OPERATION');
        }

        const hasPermission = await this.validateUserPermissions(operation.userId, operation.documentId, operation.type);
        if (!hasPermission) {
            throw new CustomHttpException(OPERATION_MESSAGES.PERMISSION_DENIED, 403, 'NO_PERMISSION');
        }

        const newerOperations = await this.getOperationsAfterVersion(operation.documentId, operation.version);

        const transformedOperation = this.transformOperations(operation, newerOperations);

        const result = await this.applyOperation(transformedOperation);

        return result;
    }

    generateOperationId(): string {
        const timestamp = Date.now();

        const random = Math.random().toString(36).substring(2, 15);

        const operationId = `op_${timestamp}_${random}`;

        return operationId;
    }

    async getDocumentVersion(documentId: string): Promise<number> {
        const document = await this.prisma.documents.findUnique({
            where: { id: documentId },
            select: { version: true }
        });

        if (!document) {
            throw new CustomHttpException('Document not found', 404, 'DOCUMENT_NOT_FOUND');
        }

        return document.version || 0;
    }

    resolveConflicts(operations: DocumentOperation[]): DocumentOperation[]{
        const sortedOps = operations.sort((a, b) => a.position.offset - b.position.offset);

        const resolvedOps: DocumentOperation[] = [];

        for (let i = 0; i < sortedOps.length; i++) {
            const currentOp = sortedOps[i];
            let hasConflict = false;

            for (let j = i + 1; j < sortedOps.length; j++) {
                const nextOp = sortedOps[j];

                if (Math.abs(currentOp.position.offset - nextOp.position.offset) < 5) {
                    hasConflict = true;

                    if (nextOp.timestamp > currentOp.timestamp) {
                        break;
                    }
                }
            }

            if (!hasConflict) {
                resolvedOps.push(currentOp);
            }
        }

        return resolvedOps;
    }

    private applyOperationToContent(currentContent: string, operation: DocumentOperation): string {
        switch (operation.type) {
            case OperationType.TEXT_INSERT:
                const textOp = operation as TextOperation;
                if (textOp.attributes?.html) return textOp.attributes.html;
                if (textOp.attributes?.delta) return currentContent;
                return currentContent.slice(0, operation.position.offset) +
                    (textOp.content || '') +
                    currentContent.slice(operation.position.offset);

            case OperationType.TEXT_DELETE:
                const deleteOp = operation as TextOperation;
                if (deleteOp.attributes?.html) return deleteOp.attributes.html;
                if (deleteOp.attributes?.delta) return currentContent;
                return currentContent.slice(0, operation.position.offset) +
                    currentContent.slice(operation.position.offset + (deleteOp.length || 0));

            case OperationType.TEXT_FORMAT:
                const formatOp = operation as TextOperation;
                if (formatOp.attributes?.html) return formatOp.attributes.html;
                if (formatOp.attributes?.delta) return currentContent;
                return formatOp.content ?? currentContent;

            case OperationType.CITATION_INSERT:
                const citationOp = operation as CitationOperation;
                return currentContent.slice(0, operation.position.offset) +
                    citationOp.citationText +
                    currentContent.slice(operation.position.offset);

            case OperationType.CITATION_DELETE:
                const citationDeleteOp = operation as CitationOperation;
                return currentContent.slice(0, operation.position.offset) +
                    currentContent.slice(operation.position.offset + citationDeleteOp.citationText.length);

            default:
                return currentContent;
        }
    }

    private shouldPersistDocumentContent(operation: DocumentOperation): boolean {
        if (operation.type !== OperationType.TEXT_INSERT &&
            operation.type !== OperationType.TEXT_DELETE &&
            operation.type !== OperationType.TEXT_FORMAT) {
            return true;
        }

        const textOperation = operation as TextOperation;
        return !!textOperation.attributes?.html || !!textOperation.attributes?.contentDelta || !!textOperation.attributes?.isSnapshot;
    }
}