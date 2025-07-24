import { OperationType } from "../enums/document-operation.interface";

export interface Position {
    line: number;
    column: number;
    offset: number;
}

export interface BaseOperation {
    id: string;
    userId: string;
    documentId: string;
    timestamp: Date;
    version: number;
    type: OperationType;
    position: Position;
}

export interface TextOperation extends BaseOperation {
    type: OperationType.TEXT_INSERT | OperationType.TEXT_DELETE | OperationType.TEXT_FORMAT;
    content?: string;
    length?: number;
    formatting?: {
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
    };
}

export interface CitationOperation extends BaseOperation {
    type: OperationType.CITATION_INSERT | OperationType.CITATION_UPDATE | OperationType.CITATION_DELETE;
    citationId: string;
    citationText: string;
    referenceId: string;
}

export interface CursorOperation extends BaseOperation {
    type: OperationType.CURSOR_MOVE;
    userId: string;
    newPosition: Position;
}

export type DocumentOperation = TextOperation | CitationOperation | CursorOperation;

export interface OperationResult {
    success: boolean;
    transformedOperation?: DocumentOperation;
    conflicts: string[];
    newVersion: number;
    appliedAt: Date;
}

export interface TransformResult {
    transformed: DocumentOperation;
    hasConflict: boolean;
    conflictType?: string;
}