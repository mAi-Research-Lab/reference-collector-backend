/* eslint-disable no-case-declarations */
import { OperationType } from "../enums/document-operation.interface";
import { CitationOperation, CursorOperation, DocumentOperation, Position, TextOperation, TransformResult } from "../interfaces/document-operation.interface";

export class OperationTransformUtils {
    static transformPosition(originalPos: Position, conflictingOp: DocumentOperation): Position {
        if (!this.isOperationAffectingPosition(originalPos, conflictingOp)) {
            return originalPos;
        }
        let newOffset = originalPos.offset;
        let newLine = originalPos.line;
        let newColumn = originalPos.column;

        if (this.isOperationBeforePosition(originalPos, conflictingOp)) {
            const delta = this.calculateOffsetDelta(conflictingOp);
            newOffset += delta;

            const { line, column } = this.calculateLineColumn(originalPos, conflictingOp, delta);
            newLine = line;
            newColumn = column;
        }

        return {
            line: Math.max(0, newLine),
            column: Math.max(0, newColumn),
            offset: Math.max(0, newOffset)
        };
    }

    static transformTextOperation(originalOp: TextOperation, conflictingOp: DocumentOperation): TransformResult {
        if (conflictingOp.type === OperationType.CURSOR_MOVE) {
            return { transformed: originalOp, hasConflict: false };
        }

        const needsTransform = conflictingOp.position.offset <= originalOp.position.offset;

        if (needsTransform && conflictingOp.type === OperationType.TEXT_INSERT) {
            const newOffset = originalOp.position.offset + (conflictingOp.content?.length || 0);
            originalOp.position.offset = newOffset;
        }

        const hasConflict = originalOp.position.offset === conflictingOp.position.offset
            && originalOp.type === OperationType.TEXT_INSERT
            && conflictingOp.type === OperationType.TEXT_INSERT;

        return {
            transformed: originalOp,
            hasConflict,
            conflictType: hasConflict ? 'SAME_POSITION_INSERT' : undefined
        };
    }

    static transformCitationOperation(originalOp: CitationOperation, conflictingOp: DocumentOperation): TransformResult {
        if (conflictingOp.type === OperationType.CURSOR_MOVE) {
            return { transformed: originalOp, hasConflict: false };
        }

        const transformedOp = { ...originalOp };
        let hasConflict = false;
        let conflictType: string | undefined;

        if (conflictingOp.type === OperationType.TEXT_INSERT ||
            conflictingOp.type === OperationType.TEXT_DELETE ||
            conflictingOp.type === OperationType.TEXT_FORMAT) {

            const textOp = conflictingOp;

            if (textOp.position.offset <= originalOp.position.offset) {
                const offsetDelta = this.calculateOffsetDelta(textOp);
                transformedOp.position = {
                    ...originalOp.position,
                    offset: Math.max(0, originalOp.position.offset + offsetDelta)
                };

                const { line, column } = this.calculateLineColumn(originalOp.position, textOp, offsetDelta);
                transformedOp.position.line = line;
                transformedOp.position.column = column;
            }

            const citationStart = originalOp.position.offset;
            const citationEnd = citationStart + originalOp.citationText.length;
            const textStart = textOp.position.offset;
            const textEnd = textStart + (textOp.length || textOp.content?.length || 0);

            if ((textStart >= citationStart && textStart < citationEnd) ||
                (textEnd > citationStart && textEnd <= citationEnd) ||
                (textStart <= citationStart && textEnd >= citationEnd)) {

                hasConflict = true;
                conflictType = 'text-citation-overlap';

                if (textOp.type === OperationType.TEXT_DELETE &&
                    textStart <= citationStart && textEnd >= citationEnd) {
                    conflictType = 'citation-deleted';
                }
            }
        }

        if (conflictingOp.type === OperationType.CITATION_INSERT ||
            conflictingOp.type === OperationType.CITATION_UPDATE ||
            conflictingOp.type === OperationType.CITATION_DELETE) {

            const conflictingCitation = conflictingOp;

            if (originalOp.citationId === conflictingCitation.citationId) {
                hasConflict = true;

                if (conflictingOp.type === OperationType.CITATION_DELETE) {
                    conflictType = 'citation-deleted-by-other';
                } else if (conflictingOp.type === OperationType.CITATION_UPDATE) {
                    conflictType = 'citation-updated-by-other';

                    if (conflictingCitation.referenceId !== originalOp.referenceId) {
                        transformedOp.referenceId = conflictingCitation.referenceId;
                        transformedOp.citationText = conflictingCitation.citationText;
                    }
                } else if (conflictingOp.type === OperationType.CITATION_INSERT) {
                    conflictType = 'duplicate-citation-insert';
                }
            }

            else if (Math.abs(originalOp.position.offset - conflictingCitation.position.offset) < 5) {
                hasConflict = true;
                conflictType = 'citation-position-conflict';

                if (originalOp.timestamp > conflictingCitation.timestamp) {
                    transformedOp.position.offset += conflictingCitation.citationText.length + 1;
                }
            }

            else if (conflictingCitation.position.offset <= originalOp.position.offset) {
                const offsetDelta = this.calculateOffsetDelta(conflictingCitation);
                transformedOp.position = {
                    ...originalOp.position,
                    offset: Math.max(0, originalOp.position.offset + offsetDelta)
                };
            }
        }

        if (conflictingOp.type === OperationType.CITATION_UPDATE) {
            const conflictingCitation = conflictingOp;

            if (originalOp.referenceId === conflictingCitation.referenceId &&
                originalOp.citationText !== conflictingCitation.citationText) {

                transformedOp.citationText = conflictingCitation.citationText;
                hasConflict = true;
                conflictType = conflictType || 'citation-text-updated';
            }
        }

        if (hasConflict && conflictingOp.timestamp > originalOp.timestamp) {
            if (conflictType === 'citation-updated-by-other' || conflictType === 'citation-text-updated') {
                conflictType = 'citation-updated';
            } else if (conflictType === 'citation-deleted-by-other' || conflictType === 'citation-deleted') {
                conflictType = 'operation-cancelled';
            }
        }

        return {
            transformed: transformedOp,
            hasConflict,
            conflictType
        };
    }

    static composeOperations(operations: DocumentOperation[]): DocumentOperation[] {
        if (operations.length === 0) return [];
        if (operations.length === 1) return operations;

        const sortedOps = [...operations].sort((a, b) =>
            a.timestamp.getTime() - b.timestamp.getTime()
        );

        const composedOps: DocumentOperation[] = [];
        let currentGroup: DocumentOperation[] = [];

        for (let i = 0; i < sortedOps.length; i++) {
            const currentOp = sortedOps[i];

            if (currentGroup.length === 0) {
                currentGroup.push(currentOp);
            } else {
                const lastOp = currentGroup[currentGroup.length - 1];

                if (this.canComposeOperations(lastOp, currentOp)) {
                    currentGroup.push(currentOp);
                } else {
                    const composed = this.mergeOperationGroup(currentGroup);
                    if (composed) {
                        composedOps.push(composed);
                    }
                    currentGroup = [currentOp];
                }
            }
        }

        if (currentGroup.length > 0) {
            const composed = this.mergeOperationGroup(currentGroup);
            if (composed) {
                composedOps.push(composed);
            }
        }

        const validatedOps = composedOps.filter(op => this.validateComposedOperation(op));

        return validatedOps;
    }

    static normalizeOperation(rawOperation: any): DocumentOperation {
        const normalizedId = rawOperation.id || rawOperation.operationId || `op_${Date.now()}`;
        const normalizedUserId = rawOperation.userId || rawOperation.user_id || rawOperation.user;
        const normalizedDocumentId = rawOperation.documentId || rawOperation.document_id || rawOperation.doc;

        const normalizedTimestamp = rawOperation.timestamp ? new Date(rawOperation.timestamp) : new Date();
        const normalizedVersion = rawOperation.version || 1;

        const normalizedPosition: Position = {
            line: rawOperation.position?.line || rawOperation.line || 0,
            column: rawOperation.position?.column || rawOperation.column || rawOperation.col || 0,
            offset: rawOperation.position?.offset || rawOperation.offset || rawOperation.pos || 0
        };

        const normalizedType = rawOperation.type || rawOperation.operation_type || OperationType.TEXT_INSERT;

        const baseOp = {
            id: normalizedId,
            userId: normalizedUserId,
            documentId: normalizedDocumentId,
            timestamp: normalizedTimestamp,
            version: normalizedVersion,
            type: normalizedType,
            position: normalizedPosition
        };

        switch (normalizedType) {
            case OperationType.TEXT_INSERT:
            case OperationType.TEXT_DELETE:
            case OperationType.TEXT_FORMAT:
                return {
                    ...baseOp,
                    content: rawOperation.content || rawOperation.text || '',
                    length: rawOperation.length || rawOperation.len || 0,
                    formatting: rawOperation.formatting || {}
                } as TextOperation;

            case OperationType.CITATION_INSERT:
            case OperationType.CITATION_UPDATE:
            case OperationType.CITATION_DELETE:
                return {
                    ...baseOp,
                    citationId: rawOperation.citationId || rawOperation.citation_id || `cite_${Date.now()}`,
                    citationText: rawOperation.citationText || rawOperation.citation_text || '',
                    referenceId: rawOperation.referenceId || rawOperation.reference_id || ''
                } as CitationOperation;

            case OperationType.CURSOR_MOVE:
                return {
                    ...baseOp,
                    newPosition: rawOperation.newPosition || normalizedPosition
                } as CursorOperation;

            default:
                return baseOp as DocumentOperation;
        }
    }

    private static canComposeOperations(op1: DocumentOperation, op2: DocumentOperation): boolean {
        if (op1.userId !== op2.userId || op1.documentId !== op2.documentId) {
            return false;
        }

        if (op1.type !== op2.type) {
            return false;
        }

        const timeDiff = Math.abs(op2.timestamp.getTime() - op1.timestamp.getTime());
        if (timeDiff > 5000) {
            return false;
        }

        switch (op1.type) {
            case OperationType.TEXT_INSERT:
                return this.canComposeTextInserts(op1, op2 as TextOperation);

            case OperationType.TEXT_DELETE:
                return this.canComposeTextDeletes(op1, op2 as TextOperation);

            case OperationType.TEXT_FORMAT:
                return this.canComposeTextFormats(op1, op2 as TextOperation);

            case OperationType.CITATION_INSERT:
            case OperationType.CITATION_UPDATE:
            case OperationType.CITATION_DELETE:
                return false;

            case OperationType.CURSOR_MOVE:
                return true;

            default:
                return false;
        }
    }

    private static canComposeTextInserts(op1: TextOperation, op2: TextOperation): boolean {
        const op1End = op1.position.offset + (op1.content?.length || 0);
        return Math.abs(op2.position.offset - op1End) <= 1; // Ardışık veya çok yakın pozisyonlar
    }

    private static canComposeTextDeletes(op1: TextOperation, op2: TextOperation): boolean {
        return Math.abs(op1.position.offset - op2.position.offset) <= (op1.length || 0);
    }

    private static canComposeTextFormats(op1: TextOperation, op2: TextOperation): boolean {
        const op1End = op1.position.offset + (op1.length || 0);
        const op2End = op2.position.offset + (op2.length || 0);

        return !(op1End < op2.position.offset || op2End < op1.position.offset);
    }

    private static mergeOperationGroup(group: DocumentOperation[]): DocumentOperation | null {
        if (group.length === 0) return null;
        if (group.length === 1) return group[0];

        const firstOp = group[0];

        switch (firstOp.type) {
            case OperationType.TEXT_INSERT:
                return this.mergeTextInserts(group as TextOperation[]);

            case OperationType.TEXT_DELETE:
                return this.mergeTextDeletes(group as TextOperation[]);

            case OperationType.TEXT_FORMAT:
                return this.mergeTextFormats(group as TextOperation[]);

            case OperationType.CURSOR_MOVE:
                return this.mergeCursorMoves(group as CursorOperation[]);

            default:
                return firstOp;
        }
    }

    private static mergeTextInserts(operations: TextOperation[]): TextOperation {
        const firstOp = operations[0];
        const lastOp = operations[operations.length - 1];

        const mergedContent = operations
            .map(op => op.content || '')
            .join('');

        return {
            ...firstOp,
            id: `merged_${firstOp.id}_${lastOp.id}`,
            content: mergedContent,
            timestamp: lastOp.timestamp,
            version: lastOp.version
        };
    }

    private static mergeTextDeletes(operations: TextOperation[]): TextOperation {
        const firstOp = operations[0];
        const lastOp = operations[operations.length - 1];

        const totalLength = operations.reduce((sum, op) => sum + (op.length || 0), 0);

        return {
            ...firstOp,
            id: `merged_${firstOp.id}_${lastOp.id}`,
            length: totalLength,
            timestamp: lastOp.timestamp,
            version: lastOp.version
        };
    }

    private static mergeTextFormats(operations: TextOperation[]): TextOperation {
        const firstOp = operations[0];
        const lastOp = operations[operations.length - 1];

        const minOffset = Math.min(...operations.map(op => op.position.offset));
        const maxEnd = Math.max(...operations.map(op => op.position.offset + (op.length || 0)));

        const mergedFormatting = operations.reduce((merged, op) => ({
            ...merged,
            ...op.formatting
        }), {});

        return {
            ...firstOp,
            id: `merged_${firstOp.id}_${lastOp.id}`,
            position: { ...firstOp.position, offset: minOffset },
            length: maxEnd - minOffset,
            formatting: mergedFormatting,
            timestamp: lastOp.timestamp,
            version: lastOp.version
        };
    }

    private static mergeCursorMoves(operations: CursorOperation[]): CursorOperation {
        const firstOp = operations[0];
        const lastOp = operations[operations.length - 1];

        return {
            ...firstOp,
            id: `merged_${firstOp.id}_${lastOp.id}`,
            newPosition: lastOp.newPosition,
            timestamp: lastOp.timestamp,
            version: lastOp.version
        };
    }

    private static validateComposedOperation(operation: DocumentOperation): boolean {
        if (!operation.id || !operation.userId || !operation.documentId) {
            return false;
        }

        switch (operation.type) {
            case OperationType.TEXT_INSERT:
                const textOp = operation;
                return !!(textOp.content && textOp.content.length > 0);

            case OperationType.TEXT_DELETE:
                const deleteOp = operation;
                return !!(deleteOp.length && deleteOp.length > 0);

            case OperationType.CITATION_INSERT:
            case OperationType.CITATION_UPDATE:
                const citationOp = operation;
                return !!(citationOp.citationId && citationOp.citationText && citationOp.referenceId);

            default:
                return true;
        }
    }

    static invertOperation(operation: DocumentOperation): DocumentOperation {
        const baseInvertedOp = {
            id: `inverted_${operation.id}_${Date.now()}`,
            userId: operation.userId,
            documentId: operation.documentId,
            timestamp: new Date(),
            version: operation.version + 1,
            position: { ...operation.position }
        };


        switch (operation.type) {
            case OperationType.TEXT_INSERT: {
                const textOp = operation;
                return {
                    ...baseInvertedOp,
                    type: OperationType.TEXT_DELETE,
                    length: textOp.content?.length || 0
                } as TextOperation;
            }

            case OperationType.TEXT_DELETE: {
                const deleteOp = operation;
                return {
                    ...baseInvertedOp,
                    type: OperationType.TEXT_INSERT,
                    content: this.getDeletedContent(deleteOp)
                } as TextOperation;
            }

            case OperationType.TEXT_FORMAT: {
                const formatOp = operation;
                return {
                    ...baseInvertedOp,
                    type: OperationType.TEXT_FORMAT,
                    length: formatOp.length,
                    formatting: this.invertFormatting(formatOp.formatting)
                } as TextOperation;
            }

            case OperationType.CITATION_INSERT: {
                const citationOp = operation;
                return {
                    ...baseInvertedOp,
                    type: OperationType.CITATION_DELETE,
                    citationId: citationOp.citationId,
                    citationText: citationOp.citationText,
                    referenceId: citationOp.referenceId
                } as CitationOperation;
            }

            case OperationType.CITATION_DELETE: {
                const citationOp = operation;
                return {
                    ...baseInvertedOp,
                    type: OperationType.CITATION_INSERT,
                    citationId: citationOp.citationId,
                    citationText: citationOp.citationText,
                    referenceId: citationOp.referenceId
                } as CitationOperation;
            }

            case OperationType.CITATION_UPDATE: {
                const citationOp = operation;
                return {
                    ...baseInvertedOp,
                    type: OperationType.CITATION_UPDATE,
                    citationId: citationOp.citationId,
                    citationText: this.getPreviousCitationText(citationOp),
                    referenceId: this.getPreviousReferenceId(citationOp)
                } as CitationOperation;
            }

            case OperationType.CURSOR_MOVE: {
                const cursorOp = operation;
                return {
                    ...baseInvertedOp,
                    type: OperationType.CURSOR_MOVE,
                    userId: cursorOp.userId,
                    newPosition: this.getPreviousCursorPosition(cursorOp)
                } as CursorOperation;
            }

            default:
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                throw new Error(`Cannot invert operation of type: ${operation}`);
        }
    }

    static validateOperation(operation: DocumentOperation): boolean {
        if (!operation.id || !operation.userId || !operation.documentId) {
            return false;
        }

        if (operation.position.offset < 0 || operation.position.line < 0) {
            return false;
        }

        if (operation.type === OperationType.TEXT_INSERT) {
            const textOp = operation;
            if (!textOp.content || textOp.content.length === 0) {
                return false;
            }
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(operation.userId) || !uuidRegex.test(operation.documentId)) {
            return false;
        }

        return true;
    }

    private static calculateOffsetDelta(op: DocumentOperation): number {
        switch (op.type) {
            case OperationType.TEXT_INSERT:
                const textOp = op;
                return textOp.content?.length || 0;

            case OperationType.TEXT_DELETE:
                const deleteOp = op;
                return -(deleteOp.length || 0);

            case OperationType.CITATION_INSERT:
                const citationOp = op;
                return citationOp.citationText.length;

            case OperationType.CITATION_DELETE:
                const deleteCitationOp = op;
                return -deleteCitationOp.citationText.length;

            default:
                return 0;
        }
    }

    private static getDeletedContent(deleteOp: TextOperation): string {
        return `[DELETED_CONTENT_${deleteOp.length}]`;
    }

    private static invertFormatting(formatting?: { bold?: boolean; italic?: boolean; underline?: boolean }): typeof formatting {
        if (!formatting) return {};

        return {
            bold: formatting.bold !== undefined ? !formatting.bold : undefined,
            italic: formatting.italic !== undefined ? !formatting.italic : undefined,
            underline: formatting.underline !== undefined ? !formatting.underline : undefined
        };
    }

    private static getPreviousCitationText(citationOp: CitationOperation): string {
        return `[PREVIOUS_CITATION_TEXT_${citationOp.citationId}]`;
    }
    private static getPreviousReferenceId(citationOp: CitationOperation): string {
        return `[PREVIOUS_REFERENCE_ID_${citationOp.citationId}]`;
    }
    private static getPreviousCursorPosition(cursorOp: CursorOperation): Position {
        return {
            offset: cursorOp.newPosition.offset,
            line: cursorOp.newPosition.line,
            column: cursorOp.newPosition.column
        }
    }

    private static isOperationBeforePosition(pos: Position, op: DocumentOperation): boolean {
        return op.position.offset <= pos.offset;
    }

    private static isOperationAffectingPosition(pos: Position, op: DocumentOperation): boolean {
        switch (op.type) {
            case OperationType.TEXT_INSERT:
            case OperationType.TEXT_DELETE:
            case OperationType.CITATION_INSERT:
            case OperationType.CITATION_DELETE:
                return true;
            case OperationType.TEXT_FORMAT:
            case OperationType.CITATION_UPDATE:
            case OperationType.CURSOR_MOVE:
                return false;
            default:
                return false;
        }
    }

    private static calculateLineColumn(
        originalPos: Position,
        op: DocumentOperation,
        offsetDelta: number
    ): { line: number; column: number } {
        if (op.position.line === originalPos.line && op.position.column <= originalPos.column) {
            return this.calculateSameLineAdjustment(originalPos, op, offsetDelta);
        }

        if (op.position.line < originalPos.line) {
            return this.calculatePreviousLineAdjustment(originalPos, op, offsetDelta);
        }

        return {
            line: originalPos.line,
            column: originalPos.column
        };
    }

    private static calculateSameLineAdjustment(
        originalPos: Position,
        op: DocumentOperation,
        offsetDelta: number
    ): { line: number; column: number } {
        switch (op.type) {
            case OperationType.TEXT_INSERT:
            case OperationType.CITATION_INSERT:
                const insertContent = this.getOperationContent(op);
                const newLines = (insertContent.match(/\n/g) || []).length;

                if (newLines > 0) {
                    const lastLineContent = insertContent.split('\n').pop() || '';
                    return {
                        line: originalPos.line + newLines,
                        column: lastLineContent.length + (originalPos.column - op.position.column)
                    };
                } else {
                    return {
                        line: originalPos.line,
                        column: originalPos.column + offsetDelta
                    };
                }

            case OperationType.TEXT_DELETE:
            case OperationType.CITATION_DELETE:
                const deleteLength = Math.abs(offsetDelta);
                const deletedContent = this.estimateDeletedContent(op, deleteLength);
                const deletedNewLines = (deletedContent.match(/\n/g) || []).length;

                if (deletedNewLines > 0) {
                    return {
                        line: Math.max(0, originalPos.line - deletedNewLines),
                        column: originalPos.column
                    };
                } else {
                    return {
                        line: originalPos.line,
                        column: Math.max(0, originalPos.column + offsetDelta)
                    };
                }

            default:
                return {
                    line: originalPos.line,
                    column: originalPos.column
                };
        }
    }

    private static calculatePreviousLineAdjustment(
        originalPos: Position,
        op: DocumentOperation,
        offsetDelta: number
    ): { line: number; column: number } {
        const content = this.getOperationContent(op);
        const newLines = (content.match(/\n/g) || []).length;

        switch (op.type) {
            case OperationType.TEXT_INSERT:
            case OperationType.CITATION_INSERT:
                return {
                    line: originalPos.line + newLines,
                    column: originalPos.column
                };

            case OperationType.TEXT_DELETE:
            case OperationType.CITATION_DELETE:
                const deleteLength = Math.abs(offsetDelta);
                const deletedContent = this.estimateDeletedContent(op, deleteLength);
                const deletedNewLines = (deletedContent.match(/\n/g) || []).length;

                return {
                    line: Math.max(0, originalPos.line - deletedNewLines),
                    column: originalPos.column
                };

            default:
                return {
                    line: originalPos.line,
                    column: originalPos.column
                };
        }
    }

    private static getOperationContent(op: DocumentOperation): string {
        switch (op.type) {
            case OperationType.TEXT_INSERT:
                return (op).content || '';
            case OperationType.CITATION_INSERT:
                return (op).citationText;
            default:
                return '';
        }
    }

    private static estimateDeletedContent(op: DocumentOperation, length: number): string {
        return ' '.repeat(length);
    }
}