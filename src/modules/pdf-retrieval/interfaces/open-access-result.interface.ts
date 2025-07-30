import { AccessLevel } from "./pdf-source.interface";

export interface OpenAccessResult {
    source: string;
    url: string;
    confidence: number;
    accessLevel: AccessLevel;
    fileSize?: number;
    lastChecked: Date;
    metadata?: {
        title?: string;
        authors?: string[];
        journal?: string;
        year?: number;
        doi?: string;
    };
}

export interface OpenAccessQuery {
    doi?: string;
    title?: string;
    authors?: string[];
    journal?: string;
    year?: number;
    pmid?: string;
    isbn?: string;
}