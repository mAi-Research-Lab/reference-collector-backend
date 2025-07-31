export interface SnapshotResult {
    success: boolean;
    pdfBuffer?: Buffer;
    filePath?: string;
    metadata?: PageMetadata;
    error?: string;
    processingTime: number;
    quality: 'low' | 'medium' | 'high';
}

export interface PageMetadata {
    title: string;
    url: string;
    author?: string;
    publishDate?: string;
    wordCount: number;
    language?: string;
    contentType: 'article' | 'blog' | 'news' | 'academic' | 'other';
    extractedAt: Date;
}

export interface SnapshotOptions {
    removeAds?: boolean;
    optimizeForReading?: boolean;
    extractMainContent?: boolean;
    waitForJS?: number;
    format?: 'A4' | 'Letter';
    quality?: 'low' | 'medium' | 'high';
    includeImages?: boolean;
    timeout?: number;
}