import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { Prisma } from 'generated/prisma';

export interface ZoteroReportItem {
    id: string;
    itemType: string;
    title: string;
    authors: Array<{ name: string; lastName?: string; firstName?: string }>;
    editors?: Array<{ name: string; lastName?: string; firstName?: string }>;
    abstract?: string;
    date?: string;
    year?: number;
    language?: string;
    shortTitle?: string;
    libraryCatalog?: string;
    place?: string;
    publisher?: string;
    isbn?: string;
    issn?: string;
    doi?: string;
    url?: string;
    pages?: string;
    volume?: string;
    issue?: string;
    publication?: string;
    dateAdded: Date;
    dateModified: Date;
    tags?: Array<{ name: string; color?: string }>;
    notes?: string;
    attachments?: Array<{ name: string; type: string; url?: string }>;
}

export interface ZoteroReportOptions {
    includeAbstract?: boolean;
    includeTags?: boolean;
    includeAttachments?: boolean;
    includeNotes?: boolean;
    sortBy?: 'dateAdded' | 'dateModified' | 'title' | 'author';
    sortOrder?: 'asc' | 'desc';
    format?: 'html' | 'json' | 'text';
}

@Injectable()
export class ReportGenerationService {
    constructor(private readonly prisma: PrismaService) {}

    async generateLibraryReport(
        libraryId: string, 
        options: ZoteroReportOptions = {}
    ): Promise<ZoteroReportItem[]> {
        const library = await this.prisma.libraries.findUnique({
            where: { id: libraryId }
        });

        if (!library) {
            throw new CustomHttpException('Library not found', 404, 'LIBRARY_NOT_FOUND');
        }

        const references = await this.prisma.references.findMany({
            where: {
                libraryId,
                isDeleted: false
            },
            include: {
                Files: {
                    select: {
                        originalFilename: true,
                        mimeType: true,
                        fileType: true,
                        storagePath: true
                    }
                }
            },
            orderBy: this.getOrderBy(options.sortBy, options.sortOrder)
        });

        return this.formatReferencesForReport(references, options);
    }

    async generateCollectionReport(
        collectionId: string, 
        options: ZoteroReportOptions = {}
    ): Promise<ZoteroReportItem[]> {
        const collection = await this.prisma.collections.findUnique({
            where: { id: collectionId }
        });

        if (!collection) {
            throw new CustomHttpException('Collection not found', 404, 'COLLECTION_NOT_FOUND');
        }

        const collectionItems = await this.prisma.collectionItems.findMany({
            where: { collectionId },
            include: {
                reference: {
                    include: {
                        Files: {
                            select: {
                                originalFilename: true,
                                mimeType: true,
                                fileType: true,
                                storagePath: true
                            }
                        }
                    }
                }
            },
            orderBy: { sortOrder: 'asc' }
        });

        const references = collectionItems.map(item => item.reference);
        return this.formatReferencesForReport(references, options);
    }

    async generateReferencesReport(
        referenceIds: string[], 
        options: ZoteroReportOptions = {}
    ): Promise<ZoteroReportItem[]> {
        const references = await this.prisma.references.findMany({
            where: {
                id: { in: referenceIds },
                isDeleted: false
            },
            include: {
                Files: {
                    select: {
                        originalFilename: true,
                        mimeType: true,
                        fileType: true,
                        storagePath: true
                    }
                }
            },
            orderBy: this.getOrderBy(options.sortBy, options.sortOrder)
        });

        return this.formatReferencesForReport(references, options);
    }

    generateHtmlReport(
        items: ZoteroReportItem[], 
        title: string = 'Reference Report'
    ): string {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .report-title {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 30px;
            border-bottom: 2px solid #007acc;
            padding-bottom: 10px;
        }
        .report-item {
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .item-title {
            font-size: 1.4em;
            font-weight: bold;
            margin-bottom: 15px;
            color: #2c3e50;
        }
        .metadata {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        .metadata-label {
            font-weight: bold;
            color: #555;
        }
        .metadata-value {
            color: #333;
        }
        .abstract {
            margin: 15px 0;
            padding: 15px;
            background-color: #f8f9fa;
            border-left: 4px solid #007acc;
            font-style: italic;
        }
        .tags {
            margin: 10px 0;
        }
        .tag {
            display: inline-block;
            background-color: #007acc;
            color: white;
            padding: 4px 8px;
            margin: 2px;
            border-radius: 3px;
            font-size: 0.9em;
        }
        .attachments {
            margin: 15px 0;
        }
        .attachment {
            display: block;
            color: #007acc;
            text-decoration: none;
            margin: 5px 0;
        }
        .attachment:hover {
            text-decoration: underline;
        }
        .notes {
            margin: 15px 0;
            padding: 10px;
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
        }
    </style>
</head>
<body>
    <div class="report-title">${title}</div>
    ${items.map(item => this.formatItemAsHtml(item)).join('\n')}
</body>
</html>`;

        return html;
    }

    private formatReferencesForReport(
        references: any[], 
        options: ZoteroReportOptions
    ): ZoteroReportItem[] {
        return references.map(ref => ({
            id: ref.id,
            itemType: this.formatItemType(ref.type),
            title: ref.title,
            authors: this.parseAuthors(ref.authors),
            editors: ref.editors ? this.parseAuthors(ref.editors) : undefined,
            abstract: options.includeAbstract ? ref.abstractText : undefined,
            date: ref.year ? ref.year.toString() : undefined,
            year: ref.year,
            language: ref.language,
            shortTitle: ref.title.length > 50 ? ref.title.substring(0, 50) + '...' : ref.title,
            libraryCatalog: ref.url ? 'Web' : 'Local',
            place: this.extractPlace(ref),
            publisher: ref.publisher,
            isbn: ref.isbn,
            issn: ref.issn,
            doi: ref.doi,
            url: ref.url,
            pages: ref.pages,
            volume: ref.volume,
            issue: ref.issue,
            publication: ref.publication,
            dateAdded: ref.dateAdded,
            dateModified: ref.dateModified,
            tags: options.includeTags ? this.parseTags(ref.tags) : undefined,
            notes: options.includeNotes ? ref.notes : undefined,
            attachments: options.includeAttachments ? this.parseAttachments(ref.Files) : undefined
        }));
    }

    private formatItemAsHtml(item: ZoteroReportItem): string {
        let html = `
    <div class="report-item">
        <div class="item-title">${this.escapeHtml(item.title)}</div>
        <div class="metadata">
            <div class="metadata-label">Item Type:</div>
            <div class="metadata-value">${this.escapeHtml(item.itemType)}</div>`;

        if (item.authors && item.authors.length > 0) {
            html += `
            <div class="metadata-label">Author:</div>
            <div class="metadata-value">${item.authors.map(author => this.escapeHtml(author.name)).join(', ')}</div>`;
        }

        if (item.editors && item.editors.length > 0) {
            html += `
            <div class="metadata-label">Editor:</div>
            <div class="metadata-value">${item.editors.map(editor => this.escapeHtml(editor.name)).join(', ')}</div>`;
        }

        if (item.abstract) {
            html += `
            <div class="metadata-label">Abstract:</div>
            <div class="abstract">${this.escapeHtml(item.abstract)}</div>`;
        }

        if (item.date) {
            html += `
            <div class="metadata-label">Date:</div>
            <div class="metadata-value">${this.escapeHtml(item.date)}</div>`;
        }

        if (item.language) {
            html += `
            <div class="metadata-label">Language:</div>
            <div class="metadata-value">${this.escapeHtml(item.language)}</div>`;
        }

        if (item.shortTitle) {
            html += `
            <div class="metadata-label">Short Title:</div>
            <div class="metadata-value">${this.escapeHtml(item.shortTitle)}</div>`;
        }

        if (item.libraryCatalog) {
            html += `
            <div class="metadata-label">Library Catalog:</div>
            <div class="metadata-value">${this.escapeHtml(item.libraryCatalog)}</div>`;
        }

        if (item.place) {
            html += `
            <div class="metadata-label">Place:</div>
            <div class="metadata-value">${this.escapeHtml(item.place)}</div>`;
        }

        if (item.publisher) {
            html += `
            <div class="metadata-label">Publisher:</div>
            <div class="metadata-value">${this.escapeHtml(item.publisher)}</div>`;
        }

        if (item.isbn) {
            html += `
            <div class="metadata-label">ISBN:</div>
            <div class="metadata-value">${this.escapeHtml(item.isbn)}</div>`;
        }

        if (item.pages) {
            html += `
            <div class="metadata-label"># of Pages:</div>
            <div class="metadata-value">${this.escapeHtml(item.pages)}</div>`;
        }

        html += `
            <div class="metadata-label">Date Added:</div>
            <div class="metadata-value">${item.dateAdded.toLocaleString()}</div>
            <div class="metadata-label">Modified:</div>
            <div class="metadata-value">${item.dateModified.toLocaleString()}</div>
        </div>`;

        if (item.attachments && item.attachments.length > 0) {
            html += `
        <div class="attachments">
            <strong>Attachments</strong>
            ${item.attachments.map(attachment => 
                `<div class="attachment">${this.escapeHtml(attachment.name)}</div>`
            ).join('')}
        </div>`;
        }

        html += `
    </div>`;

        return html;
    }

    private parseAuthors(authors: any): Array<{ name: string; lastName?: string; firstName?: string }> {
        if (!authors) return [];
        
        if (Array.isArray(authors)) {
            return authors.map(author => {
                if (typeof author === 'string') {
                    return { name: author };
                } else if (typeof author === 'object' && author.name) {
                    return {
                        name: author.name,
                        lastName: author.lastName,
                        firstName: author.firstName
                    };
                }
                return { name: 'Unknown' };
            });
        }
        
        return [];
    }

    private parseTags(tags: any): Array<{ name: string; color?: string }> {
        if (!tags) return [];
        
        if (Array.isArray(tags)) {
            return tags.map(tag => {
                if (typeof tag === 'string') {
                    return { name: tag };
                } else if (typeof tag === 'object' && tag.name) {
                    return {
                        name: tag.name,
                        color: tag.color
                    };
                }
                return { name: 'Unknown' };
            });
        }
        
        return [];
    }

    private parseAttachments(files: any[]): Array<{ name: string; type: string; url?: string }> {
        if (!files || !Array.isArray(files)) return [];
        
        return files.map(file => ({
            name: file.originalFilename,
            type: file.fileType,
            url: file.storagePath
        }));
    }

    private formatItemType(type: string): string {
        const typeMap: { [key: string]: string } = {
            'article': 'Journal Article',
            'book': 'Book',
            'bookSection': 'Book Section',
            'conferencePaper': 'Conference Paper',
            'thesis': 'Thesis',
            'report': 'Report',
            'webpage': 'Web Page',
            'document': 'Document',
            'presentation': 'Presentation'
        };
        
        return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
    }

    private extractPlace(reference: any): string | undefined {
        if (reference.metadata && reference.metadata.place) {
            return reference.metadata.place;
        }
        
        return undefined;
    }

    private getOrderBy(sortBy?: string, sortOrder?: string) {
        const order = sortOrder === 'desc' ? Prisma.SortOrder.desc : Prisma.SortOrder.asc;
        
        switch (sortBy) {
            case 'title':
                return { title: order };
            case 'dateModified':
                return { dateModified: order };
            case 'author':
                // For author sorting, we'll use title as a fallback
                return { title: order };
            case 'dateAdded':
            default:
                return { dateAdded: order };
        }
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
