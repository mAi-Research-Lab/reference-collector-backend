import { AuthType } from "../enums/auth.enum";
import { AccessLevel, PdfSourceType } from "./pdf-source.interface";

export interface PublisherConfig {
    id: string;
    name: string;
    baseUrl: string;
    apiUrl?: string;
    apiKey?: string;
    headers?: Record<string, string>;
    rateLimit: {
        requestsPerMinute: number;
        requestsPerHour: number;
    };
    authentication: {
        type: AuthType;
        required: boolean;
        config?: Record<string, any>;
    };
    patterns: {
        doiPattern: RegExp;
        pdfUrlPattern: RegExp;
        redirectPattern?: RegExp;
    };
    endpoints: {
        search?: string;
        download?: string;
        metadata?: string;
    };
}

export interface PdfSearchResult {
    found: boolean;
    results: PdfResultItem[];
    totalSources: number;
    searchTime: number;
    errors?: string[];
}

export interface PdfResultItem {
    source: string;
    sourceType: PdfSourceType;
    url: string;
    confidence: number;
    accessLevel: AccessLevel;
    fileSize?: number;
    contentType?: string;
    lastVerified?: Date;
    metadata?: {
        title?: string;
        filename?: string;
        pages?: number;
        quality?: 'low' | 'medium' | 'high';
    };
}

export interface DownloadResult {
    success: boolean;
    filePath?: string;
    fileSize?: number;
    contentType?: string;
    downloadTime?: number;
    error?: string;
    source: string;
}

export interface PdfValidationResult {
    isValid: boolean;
    fileSize: number;
    pageCount?: number;
    hasText: boolean;
    quality: 'low' | 'medium' | 'high';
    errors?: string[];
}