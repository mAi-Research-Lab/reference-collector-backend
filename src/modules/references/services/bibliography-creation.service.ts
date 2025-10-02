import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { Prisma } from 'generated/prisma';

export interface BibliographyOptions {
    citationStyle: string;
    language?: string;
    displayCitationsAs?: 'footnotes' | 'endnotes';
    outputMode?: 'notes' | 'bibliography';
    outputMethod?: 'rtf' | 'html' | 'clipboard' | 'print';
    includeAbstract?: boolean;
    includeKeywords?: boolean;
    sortBy?: 'author' | 'title' | 'date' | 'custom';
    sortOrder?: 'asc' | 'desc';
}

export interface BibliographyResult {
    content: string;
    format: string;
    mimeType: string;
    filename: string;
    itemCount: number;
    style: string;
    entries: string[];
}

@Injectable()
export class BibliographyCreationService {
    constructor(private readonly prisma: PrismaService) {}

    async createBibliographyFromLibrary(
        libraryId: string, 
        options: BibliographyOptions
    ): Promise<BibliographyResult> {
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
                        fileType: true,
                        mimeType: true
                    }
                }
            },
            orderBy: this.getOrderBy(options.sortBy, options.sortOrder)
        });

        return this.generateBibliography(references, options, `Library: ${library.name}`);
    }

    async createBibliographyFromCollection(
        collectionId: string, 
        options: BibliographyOptions
    ): Promise<BibliographyResult> {
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
                                fileType: true,
                                mimeType: true
                            }
                        }
                    }
                }
            },
            orderBy: { sortOrder: 'asc' }
        });

        const references = collectionItems.map(item => item.reference);
        return this.generateBibliography(references, options, `Collection: ${collection.name}`);
    }

    async createBibliographyFromReferences(
        referenceIds: string[], 
        options: BibliographyOptions
    ): Promise<BibliographyResult> {
        const references = await this.prisma.references.findMany({
            where: {
                id: { in: referenceIds },
                isDeleted: false
            },
            include: {
                Files: {
                    select: {
                        originalFilename: true,
                        fileType: true,
                        mimeType: true
                    }
                }
            },
            orderBy: this.getOrderBy(options.sortBy, options.sortOrder)
        });

        return this.generateBibliography(references, options, 'Selected References');
    }

    private generateBibliography(
        references: any[], 
        options: BibliographyOptions, 
        title: string
    ): BibliographyResult {
        if (references.length === 0) {
            throw new CustomHttpException('No references found', 404, 'NO_REFERENCES_FOUND');
        }

        const entries = this.formatReferencesForBibliography(references, options);
        const content = this.formatBibliographyContent(entries, options, title);
        
        return {
            content,
            format: options.outputMethod || 'rtf',
            mimeType: this.getMimeType(options.outputMethod || 'rtf'),
            filename: this.generateFilename(title, options.outputMethod || 'rtf', options.citationStyle),
            itemCount: references.length,
            style: options.citationStyle,
            entries
        };
    }

    private formatReferencesForBibliography(
        references: any[], 
        options: BibliographyOptions
    ): string[] {
        const entries: string[] = [];

        for (const ref of references) {
            let entry = '';
            
            switch (options.citationStyle.toLowerCase()) {
                case 'apa':
                case 'apa-7th':
                    entry = this.formatAPAEntry(ref);
                    break;
                case 'chicago':
                case 'chicago-manual':
                    entry = this.formatChicagoEntry(ref);
                    break;
                case 'mla':
                case 'mla-8th':
                    entry = this.formatMLAEntry(ref);
                    break;
                case 'harvard':
                    entry = this.formatHarvardEntry(ref);
                    break;
                case 'ieee':
                    entry = this.formatIEEEEntry(ref);
                    break;
                case 'vancouver':
                    entry = this.formatVancouverEntry(ref);
                    break;
                default:
                    entry = this.formatDefaultEntry(ref);
            }

            if (entry) {
                entries.push(entry);
            }
        }

        return entries;
    }

    private formatBibliographyContent(
        entries: string[], 
        options: BibliographyOptions, 
        title: string
    ): string {
        switch (options.outputMethod) {
            case 'html':
                return this.formatAsHTML(entries, title, options);
            case 'rtf':
                return this.formatAsRTF(entries);
            case 'clipboard':
            case 'print':
            default:
                return this.formatAsText(entries);
        }
    }

    private formatAPAEntry(reference: any): string {
        const authors = this.formatAuthors(reference.authors, 'apa');
        const year = reference.year || 'n.d.';
        const title = reference.title;
        const publication = reference.publication || reference.publisher;
        const volume = reference.volume;
        const issue = reference.issue;
        const pages = reference.pages;
        const doi = reference.doi;
        const url = reference.url;

        let entry = `${authors} (${year}). ${title}.`;

        if (publication) {
            entry += ` ${publication}`;
        }

        if (volume) {
            entry += `, ${volume}`;
        }

        if (issue) {
            entry += `(${issue})`;
        }

        if (pages) {
            entry += `, ${pages}`;
        }

        if (doi) {
            entry += `. https://doi.org/${doi}`;
        } else if (url) {
            entry += `. ${url}`;
        }

        entry += '.';

        return entry;
    }

    private formatChicagoEntry(reference: any): string {
        const authors = this.formatAuthors(reference.authors, 'chicago');
        const year = reference.year || 'n.d.';
        const title = reference.title;
        const publication = reference.publication || reference.publisher;
        const volume = reference.volume;
        const issue = reference.issue;
        const pages = reference.pages;
        const publisher = reference.publisher;
        const place = this.extractPlace(reference);

        let entry = `${authors}. "${title}."`;

        if (publication) {
            entry += ` ${publication}`;
        }

        if (volume) {
            entry += ` ${volume}`;
        }

        if (issue) {
            entry += `, no. ${issue}`;
        }

        if (year) {
            entry += ` (${year})`;
        }

        if (pages) {
            entry += `: ${pages}`;
        }

        if (publisher && place) {
            entry += `. ${place}: ${publisher}`;
        }

        entry += '.';

        return entry;
    }

    private formatMLAEntry(reference: any): string {
        const authors = this.formatAuthors(reference.authors, 'mla');
        const title = reference.title;
        const publication = reference.publication || reference.publisher;
        const publisher = reference.publisher;
        const year = reference.year || 'n.d.';
        const pages = reference.pages;

        let entry = `${authors}. "${title}."`;

        if (publication) {
            entry += ` ${publication}`;
        }

        if (publisher && publisher !== publication) {
            entry += `, ${publisher}`;
        }

        entry += `, ${year}`;

        if (pages) {
            entry += `, pp. ${pages}`;
        }

        entry += '.';

        return entry;
    }

    private formatHarvardEntry(reference: any): string {
        const authors = this.formatAuthors(reference.authors, 'harvard');
        const year = reference.year || 'n.d.';
        const title = reference.title;
        const publication = reference.publication || reference.publisher;
        const volume = reference.volume;
        const issue = reference.issue;
        const pages = reference.pages;
        const doi = reference.doi;

        let entry = `${authors} ${year}, '${title}', ${publication}`;

        if (volume) {
            entry += `, vol. ${volume}`;
        }

        if (issue) {
            entry += `, no. ${issue}`;
        }

        if (pages) {
            entry += `, pp. ${pages}`;
        }

        if (doi) {
            entry += `, DOI: ${doi}`;
        }

        entry += '.';

        return entry;
    }

    private formatIEEEEntry(reference: any): string {
        const authors = this.formatAuthors(reference.authors, 'ieee');
        const year = reference.year || 'n.d.';
        const title = reference.title;
        const publication = reference.publication || reference.publisher;
        const volume = reference.volume;
        const issue = reference.issue;
        const pages = reference.pages;
        const doi = reference.doi;

        let entry = `${authors}, "${title}," ${publication}`;

        if (volume) {
            entry += `, vol. ${volume}`;
        }

        if (issue) {
            entry += `, no. ${issue}`;
        }

        if (pages) {
            entry += `, pp. ${pages}`;
        }

        if (year) {
            entry += `, ${year}`;
        }

        if (doi) {
            entry += `, doi: ${doi}`;
        }

        entry += '.';

        return entry;
    }

    private formatVancouverEntry(reference: any): string {
        const authors = this.formatAuthors(reference.authors, 'vancouver');
        const title = reference.title;
        const publication = reference.publication || reference.publisher;
        const volume = reference.volume;
        const issue = reference.issue;
        const pages = reference.pages;
        const year = reference.year || 'n.d.';

        let entry = `${authors}. ${title}. ${publication}`;

        if (volume) {
            entry += `. ${year};${volume}`;
        } else {
            entry += `. ${year}`;
        }

        if (issue) {
            entry += `(${issue})`;
        }

        if (pages) {
            entry += `:${pages}`;
        }

        entry += '.';

        return entry;
    }

    private formatDefaultEntry(reference: any): string {
        const authors = this.formatAuthors(reference.authors, 'default');
        const title = reference.title;
        const publication = reference.publication || reference.publisher;
        const year = reference.year || 'n.d.';

        return `${authors}. (${year}). ${title}. ${publication}.`;
    }

    private formatAuthors(authors: any, style: string): string {
        if (!authors || !Array.isArray(authors) || authors.length === 0) {
            return 'Unknown Author';
        }

        const authorNames = authors.map(author => {
            if (typeof author === 'string') {
                return author;
            } else if (typeof author === 'object' && author.name) {
                return author.name;
            }
            return 'Unknown Author';
        });

        switch (style) {
            case 'apa':
            case 'harvard':
                if (authorNames.length === 1) {
                    return authorNames[0];
                } else if (authorNames.length <= 7) {
                    return authorNames.join(', ');
                } else {
                    return `${authorNames.slice(0, 7).join(', ')}, et al.`;
                }
            case 'chicago':
            case 'mla':
                return authorNames.join(', ');
            case 'ieee':
                if (authorNames.length === 1) {
                    return authorNames[0];
                } else if (authorNames.length <= 6) {
                    return authorNames.join(', ');
                } else {
                    return `${authorNames.slice(0, 3).join(', ')}, et al.`;
                }
            case 'vancouver':
                if (authorNames.length === 1) {
                    return authorNames[0];
                } else if (authorNames.length <= 6) {
                    return authorNames.join(', ');
                } else {
                    return `${authorNames.slice(0, 3).join(', ')}, et al.`;
                }
            default:
                return authorNames.join(', ');
        }
    }

    private formatAsHTML(entries: string[], title: string, options: BibliographyOptions): string {
        const html = `
<!DOCTYPE html>
<html lang="${options.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bibliography - ${title}</title>
    <style>
        body {
            font-family: Times, 'Times New Roman', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 1.8em;
        }
        .bibliography-entry {
            margin-bottom: 15px;
            text-indent: -2em;
            padding-left: 2em;
        }
        .hanging-indent {
            text-indent: -2em;
            padding-left: 2em;
        }
    </style>
</head>
<body>
    <h1>Bibliography</h1>
    <div class="bibliography">
        ${entries.map((entry, index) => 
            `<div class="bibliography-entry">${index + 1}. ${this.escapeHtml(entry)}</div>`
        ).join('')}
    </div>
</body>
</html>`;
        return html;
    }

    private formatAsRTF(entries: string[]): string {
        let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}';
        rtf += '\\f0\\fs24\\b Bibliography\\b0\\par\\par';
        
        entries.forEach((entry, index) => {
            rtf += `${index + 1}. ${this.escapeRtf(entry)}\\par`;
        });
        
        rtf += '}';
        return rtf;
    }

    private formatAsText(entries: string[]): string {
        let text = `BIBLIOGRAPHY\n${'='.repeat(50)}\n\n`;
        
        entries.forEach((entry, index) => {
            text += `${index + 1}. ${entry}\n\n`;
        });
        
        return text;
    }

    private getOrderBy(sortBy?: string, sortOrder?: string) {
        const order = sortOrder === 'desc' ? Prisma.SortOrder.desc : Prisma.SortOrder.asc;
        
        switch (sortBy) {
            case 'title':
                return { title: order };
            case 'date':
                return { year: order };
            case 'custom':
                return { dateAdded: order };
            case 'author':
            default:
                return { title: order }; // Fallback to title sorting
        }
    }

    private getMimeType(format: string): string {
        switch (format) {
            case 'html':
                return 'text/html';
            case 'rtf':
                return 'application/rtf';
            case 'clipboard':
            case 'print':
            default:
                return 'text/plain';
        }
    }

    private generateFilename(title: string, format: string, style: string): string {
        const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const timestamp = new Date().toISOString().split('T')[0];
        return `bibliography_${cleanTitle}_${style}_${timestamp}.${format}`;
    }

    private extractPlace(reference: any): string | undefined {
        if (reference.metadata && reference.metadata.place) {
            return reference.metadata.place;
        }
        return undefined;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private escapeRtf(text: string): string {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/{/g, '\\{')
            .replace(/}/g, '\\}');
    }
}

