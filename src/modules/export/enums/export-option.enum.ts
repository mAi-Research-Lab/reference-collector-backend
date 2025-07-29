import { CitationStyle } from "generated/prisma";
import { ExportFormat } from "./export-format.enum";

export interface ExportOptions {
    citationStyle?: CitationStyle;
    title?: string;
    filename?: string;
    includeAbstracts?: boolean;
    groupByType?: boolean;
    includeAttachments?: boolean;
    customCss?: string;
    sortBy?: 'title' | 'year' | 'author' | 'type';
    sortDirection?: 'asc' | 'desc';
}

export class ExportResult {
    content: string;
    filename: string;
    mimeType: string;
    size: number;
    format: ExportFormat;
    exportedAt: Date;
    totalReferences: number;
    isBase64: boolean;
}