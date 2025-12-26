/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from "@nestjs/common";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CITATIONS_MESSAGES } from "../constants/citation.messages";
import { ReferencesService } from "src/modules/references/references.service";
import { CitationStyleResponse } from "../dto/citation-style/citation-style.response";
import { CreateCitationStyleDto } from "../dto/citation-style/citation-style-create.dto";
import { FormatCitationDto } from "../dto/format-citation.dto";
import { CSLProcessorService } from "./csl-processor.service";
import { DOMParser } from "xmldom";

@Injectable()
export class CitationStylesService {
    private citationNumbers = new Map<string, number>();
    private nextNumber = 1;

    constructor(
        private readonly prisma: PrismaService,
        private readonly referenceService: ReferencesService,
        private readonly cslProcessor: CSLProcessorService
    ) { }

    async getAvailableStyles(): Promise<CitationStyleResponse[]> {
        const citations = await this.prisma.citationStyle.findMany({
            orderBy: [
                { downloadCount: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return citations;
    }

    async getStyleById(id: string): Promise<CitationStyleResponse> {
        // ✅ UUID mi yoksa shortName mi kontrol et
        let style;
        
        // UUID formatında mı kontrol et (8-4-4-4-12 karakter)
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(id);
        
        if (isUUID) {
            // UUID ile arama
            style = await this.prisma.citationStyle.findUnique({ where: { id } });
        } else {
            // shortName ile arama
            style = await this.prisma.citationStyle.findFirst({ 
                where: { 
                    shortName: {
                        equals: id,
                        mode: 'insensitive'
                    }
                } 
            });
        }

        if (!style) {
            throw new CustomHttpException(CITATIONS_MESSAGES.STYLE_NOT_FOUND, 404, CITATIONS_MESSAGES.STYLE_NOT_FOUND);
        }

        return style;
    }

    async formatCitationWithStyle(styleId: string, data: FormatCitationDto): Promise<string> {
        const reference = await this.referenceService.getReference(data.referenceId);
        const style = await this.getStyleById(styleId);

        await this.incrementDownloadCount(styleId);


        // CSL content varsa direkt citeproc-js kullan (validation gereksiz)
        if (style.cslContent) {
            try {

                // Reference'ı CSL formatına normalize et
                const normalizedRef = this.normalizeReferenceForCSL(reference);

                const formattedCitation = this.cslProcessor.formatCitation(
                    style.cslContent,
                    normalizedRef,
                    {
                        suppressAuthor: data.suppressAuthor,
                        suppressDate: data.suppressDate,
                        pageNumbers: data.pageNumbers,
                        prefix: data.prefix,
                        suffix: data.suffix
                    }
                );


                // Eğer CSL boş sonuç döndürdüyse fallback'e git
                if (!formattedCitation || formattedCitation.trim() === '') {
                    console.warn('⚠️ Citeproc returned empty, using fallback');
                    return this.formatReferenceByStyleFallback(reference, style, data);
                }

                return formattedCitation;

            } catch (error) {
                console.error('❌ Citeproc-JS failed:', error.message);
                return this.formatReferenceByStyleFallback(reference, style, data);
            }
        } else {
            return this.formatReferenceByStyleFallback(reference, style, data);
        }
    }

    async formatCitationWithReference(
        styleId: string,
        reference: any,
        options: {
            suppressAuthor?: boolean;
            suppressDate?: boolean;
            pageNumbers?: string;
            prefix?: string;
            suffix?: string;
        } = {}
    ): Promise<string> {
        const style = await this.getStyleById(styleId);
        await this.incrementDownloadCount(styleId);

        // CSL content varsa direkt citeproc-js kullan
        if (style.cslContent) {
            try {
                // Reference'ı CSL formatına normalize et
                const normalizedRef = this.normalizeReferenceForCSL(reference);

                const formattedCitation = this.cslProcessor.formatCitation(
                    style.cslContent,
                    normalizedRef,
                    {
                        suppressAuthor: options.suppressAuthor,
                        suppressDate: options.suppressDate,
                        pageNumbers: options.pageNumbers,
                        prefix: options.prefix,
                        suffix: options.suffix
                    }
                );

                // Eğer CSL boş sonuç döndürdüyse fallback'e git
                if (!formattedCitation || formattedCitation.trim() === '') {
                    console.warn('⚠️ Citeproc returned empty, using fallback');
                    return this.formatReferenceByStyleFallback(reference, style, options);
                }

                return formattedCitation;

            } catch (error) {
                console.error('❌ Citeproc-JS failed:', error.message);
                return this.formatReferenceByStyleFallback(reference, style, options);
            }
        } else {
            return this.formatReferenceByStyleFallback(reference, style, options);
        }
    }

    async generateBibliography(referenceIds: string[], styleId: string): Promise<string[]> {

        const references = await this.referenceService.getReferencesByIds(referenceIds);
        const validReferences = references.filter(ref => ref !== undefined);
        const style = await this.getStyleById(styleId);


        const bibliographyEntries: string[] = [];

        for (let i = 0; i < validReferences.length; i++) {
            const reference = validReferences[i];


            try {
                let entry = '';

                // CSL kullanmaya çalış
                if (style.cslContent) {
                    const normalizedRef = this.normalizeReferenceForCSL(reference);
                    entry = this.cslProcessor.formatBibliography(style.cslContent, normalizedRef);
                }

                // CSL başarısız olursa fallback
                if (!entry || entry.trim() === '') {
                    entry = this.formatBibliographyEntryWithFormatting(reference, style);
                }

                if (entry && entry.trim()) {
                    bibliographyEntries.push(entry.trim());
                }
            } catch (error) {
                console.error(`🔧 Error processing reference ${reference.id}:`, error);
                const fallbackEntry = this.formatBibliographyEntryWithFormatting(reference, style);
                bibliographyEntries.push(fallbackEntry);
            }
        }


        const sortedEntries = this.sortAndFormatBibliographyEntries(bibliographyEntries, validReferences, style);

        sortedEntries.forEach((entry, index) => {
        });

        return sortedEntries;
    }

    private isValidCSLContent(cslContent: string): boolean {
        try {
            if (!cslContent || cslContent.trim() === '') {
                return false;
            }

            // XML validation
            const parser = new DOMParser();
            const doc = parser.parseFromString(cslContent, 'text/xml');

            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                return false;
            }

            const styleElement = doc.documentElement;
            if (!styleElement || styleElement.tagName !== 'style') {
                return false;
            }

            const namespace = styleElement.getAttribute('xmlns');
            if (namespace !== 'http://purl.org/net/xbiblio/csl') {
                return false;
            }

            // Citation element var mı?
            const citationElements = styleElement.getElementsByTagName('citation');
            if (citationElements.length === 0) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    private formatReferenceByStyleFallback(
        reference: any,
        style: any,
        options?: {
            suppressAuthor?: boolean;
            suppressDate?: boolean;
            pageNumbers?: string;
            prefix?: string;
            suffix?: string;
        }
    ): string {

        const suppressAuthor = options?.suppressAuthor || false;
        const suppressDate = options?.suppressDate || false;
        const pageNumbers = options?.pageNumbers;
        const prefix = options?.prefix || '';
        const suffix = options?.suffix || '';

        const styleShortName = style.shortName.toLowerCase();

        switch (styleShortName) {
            case 'apa':
                return this.formatAPAFallback(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            case 'mla':
                return this.formatMLAFallback(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            case 'chicago':
            case 'chicago-author-date':
                return this.formatChicagoFallback(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            case 'ieee':
                return this.formatIEEEFallback(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            case 'vancouver':
                return this.formatVancouverFallback(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            case 'harvard':
                return this.formatHarvardFallback(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            default:
                return this.formatAPAFallback(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
        }
    }

    async createCustomStyle(userId: string, data: CreateCitationStyleDto): Promise<CitationStyleResponse> {
        const createdStyle = await this.prisma.citationStyle.create({
            data: {
                ...data,
                isCustom: true,
                createdBy: userId
            }
        });

        return createdStyle;
    }

    async getPopularStyles(): Promise<CitationStyleResponse[]> {
        const styles = await this.getAvailableStyles();
        return styles.slice(0, 10);
    }

    async searchStyles(query: string): Promise<CitationStyleResponse[]> {
        const styles = await this.prisma.citationStyle.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { description: { contains: query } }
                ],
            },
            orderBy: {
                downloadCount: 'desc'
            }
        });

        return styles;
    }

    async incrementDownloadCount(styleId: string): Promise<void> {
        const style = await this.prisma.citationStyle.findUnique({ where: { id: styleId } });

        if (!style) {
            throw new CustomHttpException(CITATIONS_MESSAGES.STYLE_NOT_FOUND, 404, CITATIONS_MESSAGES.STYLE_NOT_FOUND);
        }

        await this.prisma.citationStyle.update({
            where: { id: styleId },
            data: { downloadCount: style.downloadCount + 1 }
        });
    }

    private normalizeReferenceForCSL(reference: any): any {

        // Authors normalize et - Sizin data structure için
        const authors = this.normalizeAuthorsForCSL(reference.authors);
        const editors = this.normalizeAuthorsForCSL(reference.editors);

        // Date normalize et
        let issued = {};
        if (reference.year) {
            const year = parseInt(reference.year.toString());
            if (!isNaN(year)) {
                issued = {
                    'date-parts': [[year]],
                    year: year
                };
            }
        }

        const normalized = {
            id: reference.id,
            type: this.mapReferenceTypeToCSL(reference.type || 'article'),

            title: reference.title || '',
            'container-title': reference.publication || '',
            'collection-title': reference.series || '',

            author: authors.length > 0 ? authors : undefined,
            editor: editors.length > 0 ? editors : undefined,

            publisher: reference.publisher || '',
            'publisher-place': reference.publisherPlace || reference.location || '',

            issued: issued,

            DOI: reference.doi || '',
            ISBN: reference.isbn || '',
            ISSN: reference.issn || '',
            URL: reference.url || '',

            volume: reference.volume || '',
            issue: reference.issue || '',
            page: reference.pages || '',
            'number-of-pages': reference.numberOfPages || '',

            abstract: reference.abstractText || '',
            language: reference.language || 'en',
            note: reference.notes || '',

            // Tags parse et (JSON formatından)
            keyword: (() => {
                if (!reference.tags) return '';
                
                // Tags JSON object ise parse et
                if (typeof reference.tags === 'object' && reference.tags.set) {
                    return Array.isArray(reference.tags.set) 
                        ? reference.tags.set.map((t: any) => t.name || t).join(', ')
                        : '';
                }
                
                // Array ise direkt kullan
                if (Array.isArray(reference.tags)) {
                    return reference.tags.map((t: any) => t.name || t).join(', ');
                }
                
                return '';
            })(),

            source: 'user-input'
        };

        // Boş değerleri temizle
        Object.keys(normalized).forEach(key => {
            if (normalized[key] === '' || normalized[key] === null || normalized[key] === undefined) {
                delete normalized[key];
            }
        });

        return normalized;
    }

    private normalizeAuthorsForCSL(authorsData: any): any[] {
        if (!authorsData) return [];

        let authors: any[] = [];

        if (typeof authorsData === 'string') {
            authors = [authorsData];
        } else if (Array.isArray(authorsData)) {
            authors = authorsData;
        } else if (typeof authorsData === 'object') {
            authors = [authorsData];
        }

        const cslAuthors = authors.map(author => {
            if (typeof author === 'string') {
                if (author.includes(',')) {
                    const parts = author.split(',').map(p => p.trim());
                    return {
                        family: parts[0] || '',
                        given: parts[1] || ''
                    };
                } else {
                    const parts = author.trim().split(' ');
                    return {
                        family: parts[parts.length - 1] || '',
                        given: parts.slice(0, -1).join(' ') || ''
                    };
                }
            } else if (author && typeof author === 'object') {
                let family = '';
                let given = '';

                // Your data structure: {"name":"John Doe","affiliation":"MIT"}
                if (author.name) {
                    const parts = author.name.trim().split(' ');
                    family = parts[parts.length - 1] || '';
                    given = parts.slice(0, -1).join(' ') || '';
                }
                // Standard structure
                else {
                    family = author.lastName || author.family || '';
                    given = author.firstName || author.given || '';
                }

                const cslAuthor: any = {
                    family: family,
                    given: given
                };

                // Opsiyonel alanlar
                if (author.suffix) cslAuthor.suffix = author.suffix;
                if (author['dropping-particle']) cslAuthor['dropping-particle'] = author['dropping-particle'];
                if (author['non-dropping-particle']) cslAuthor['non-dropping-particle'] = author['non-dropping-particle'];

                return cslAuthor;
            }

            return { family: '', given: '' };
        }).filter(author => author.family || author.given);

        return cslAuthors;
    }

    private mapReferenceTypeToCSL(type: string): string {
        const typeMapping = {
            'journal': 'article-journal',
            'article': 'article-journal',
            'magazine': 'article-magazine',
            'newspaper': 'article-newspaper',
            'book': 'book',
            'chapter': 'chapter',
            'book-chapter': 'chapter',
            'conference': 'paper-conference',
            'proceedings': 'paper-conference',
            'thesis': 'thesis',
            'dissertation': 'thesis',
            'report': 'report',
            'webpage': 'webpage',
            'website': 'webpage',
            'blog': 'post-weblog',
            'patent': 'patent',
            'software': 'software',
            'dataset': 'dataset',
            'manuscript': 'manuscript',
            'map': 'map',
            'interview': 'interview',
            'personal-communication': 'personal_communication',
            'speech': 'speech',
            'preprint': 'article',
            'misc': 'document'
        };

        return typeMapping[type?.toLowerCase()] || 'document';
    }

    private extractLastName(author: any): string {
        if (!author) return 'Unknown';

        if (typeof author === 'string') {
            const parts = author.trim().split(' ');
            return parts[parts.length - 1];
        }

        if (typeof author === 'object') {
            // Standard fields
            if (author.lastName || author.family) {
                return author.lastName || author.family;
            }

            // Your data structure: {"name":"John Doe","affiliation":"MIT"}
            if (author.name) {
                const parts = author.name.trim().split(' ');
                return parts[parts.length - 1];
            }
        }

        return 'Unknown';
    }

    private generateSortKey(reference: any): string {
        let key = '';

        if (reference.authors && reference.authors.length > 0) {
            const firstAuthor = reference.authors[0];
            if (typeof firstAuthor === 'string') {
                key += this.extractLastName(firstAuthor).toLowerCase();
            } else if (firstAuthor && typeof firstAuthor === 'object') {
                const lastName = firstAuthor.lastName || firstAuthor.family ||
                    this.extractLastName(firstAuthor.name || '');
                key += (lastName || 'unknown').toLowerCase();
            }
        } else {
            key += (reference.title || 'unknown').toLowerCase();
        }

        key += `_${reference.year || '9999'}`;
        key += `_${(reference.title || '').toLowerCase()}`;

        return key;
    }

    private getAuthorText(reference: any, styleType: string): string {
        const authors = reference.authors || reference.author || [];

        if (!authors || authors.length === 0) {
            return '';
        }

        if (authors.length === 1) {
            return this.extractLastName(authors[0]);
        } else if (authors.length === 2) {
            const lastName1 = this.extractLastName(authors[0]);
            const lastName2 = this.extractLastName(authors[1]);

            // Style'a göre connector değiştir
            const connector = styleType === 'apa' ? '&' : 'and';
            return `${lastName1} ${connector} ${lastName2}`;
        } else {
            const lastName = this.extractLastName(authors[0]);
            return `${lastName} et al.`;
        }
    }

    private formatAPAFallback(reference: any, options: any): string {
        let result = '';

        if (!options.suppressAuthor) {
            const authorText = this.getAuthorText(reference, 'apa');
            if (authorText) result += authorText;
        }

        if (!options.suppressDate) {
            const yearText = reference.year?.toString() || 'n.d.';
            if (result) result += ', ';
            result += yearText;
        }

        if (options.pageNumbers) {
            if (result) result += ', ';
            result += `p. ${options.pageNumbers}`;
        }

        const prefix = options.prefix || '';
        const suffix = options.suffix || '';

        return result ? `${prefix}(${result})${suffix}` : '';
    }

    private formatMLAFallback(reference: any, options: any): string {
        let result = '';

        if (!options.suppressAuthor) {
            const authorText = this.getAuthorText(reference, 'mla');
            if (authorText) result += authorText;
        }

        if (options.pageNumbers) {
            if (result) result += ' ';
            result += options.pageNumbers;
        }

        const prefix = options.prefix || '';
        const suffix = options.suffix || '';

        return result ? `${prefix}(${result})${suffix}` : '';
    }

    private formatChicagoFallback(reference: any, options: any): string {
        // Chicago author-date style (similar to APA)
        return this.formatAPAFallback(reference, options);
    }

    private formatIEEEFallback(reference: any, options: any): string {
        // IEEE uses numbered citations [1], [2], etc.
        const citationNumber = this.generateCitationNumber(reference.id);

        let result = `[${citationNumber}]`;

        if (options.pageNumbers) {
            const pagePrefix = options.pageNumbers.includes('-') || options.pageNumbers.includes('–') 
                ? 's.' 
                : 's.';
            result += `, ${pagePrefix} ${options.pageNumbers}`;
        }

        const prefix = options.prefix || '';
        const suffix = options.suffix || '';

        return `${prefix}${result}${suffix}`;
    }

    private formatVancouverFallback(reference: any, options: any): string {
        // Vancouver also uses numbered citations (similar to IEEE)
        return this.formatIEEEFallback(reference, options);
    }

    private formatHarvardFallback(reference: any, options: any): string {
        // Harvard is similar to APA
        return this.formatAPAFallback(reference, options);
    }

    private generateCitationNumber(referenceId: string): number {
        if (!this.citationNumbers.has(referenceId)) {
            this.citationNumbers.set(referenceId, this.nextNumber++);
        }
        return this.citationNumbers.get(referenceId)!;
    }

    resetCitationNumbers(): void {
        this.citationNumbers.clear();
        this.nextNumber = 1;
        // CSL processor'ı da reset et
        this.cslProcessor.resetCitationNumbers();
    }

    private formatBibliographyEntryWithFormatting(reference: any, style: any): string {
        const styleShortName = style.shortName.toLowerCase();

        switch (styleShortName) {
            case 'apa':
                return this.formatAPABibliographyEntry(reference);
            case 'mla':
                return this.formatMLABibliographyEntry(reference);
            case 'chicago-author-date':
            case 'chicago-note-bibliography':
            case 'ieee':
                return this.formatIEEEBibliographyEntry(reference);
            case 'vancouver':
                return this.formatVancouverBibliographyEntry(reference);
            case 'harvard-cite-them-right':
            case 'elsevier-harvard':
            case 'nature':
            case 'science':
            case 'cell':
            case 'springer-basic-author-date':
            case 'asm-journals':
            case 'american-medical-association':
            default:
                return this.formatAPABibliographyEntry(reference);
        }
    }

    private formatAPABibliographyEntry(reference: any): string {
        let entry = '';

        if (reference.authors && reference.authors.length > 0) {
            entry += this.formatAuthorsAPA(reference.authors);
        }

        const year = reference.year?.toString() || 'n.d.';
        entry += ` (${year}). `;

        if (reference.title) {
            if (reference.type === 'book' || reference.type === 'thesis') {
                entry += `*${reference.title}*`;
            } else {
                entry += reference.title;
            }

            if (!reference.title.endsWith('.')) {
                entry += '.';
            }
            entry += ' ';
        }

        if (reference.publication || reference['container-title']) {
            const container = reference.publication || reference['container-title'];
            entry += `*${container}*`;

            if (reference.volume) {
                entry += `, *${reference.volume}*`;
            }

            if (reference.issue) {
                entry += `(${reference.issue})`;
            }

            if (reference.pages) {
                entry += `, ${reference.pages}`;
            }

            entry += '. ';
        }

        const doi = reference.doi || reference.DOI;
        const url = reference.url || reference.URL;

        if (doi) {
            entry += `https://doi.org/${doi}`;
        } else if (url) {
            entry += url;
        }

        return entry;
    }

    private formatIEEEBibliographyEntry(reference: any): string {
        let entry = '';

        if (reference.authors && reference.authors.length > 0) {
            if (reference.authors.length <= 3) {
                const authorStrings = reference.authors.map(author => {
                    const lastName = this.extractLastName(author);
                    const firstName = this.extractFirstName(author);
                    const initials = firstName.split(' ')
                        .map(name => name.charAt(0).toUpperCase())
                        .join('. ');
                    return initials ? `${initials}. ${lastName}` : lastName;
                });
                entry += authorStrings.join(', ');
            } else {
                const firstAuthor = reference.authors[0];
                const lastName = this.extractLastName(firstAuthor);
                const firstName = this.extractFirstName(firstAuthor);
                const initials = firstName.split(' ')
                    .map(name => name.charAt(0).toUpperCase())
                    .join('. ');
                entry += initials ? `${initials}. ${lastName} et al.` : `${lastName} et al.`;
            }
        }

        if (reference.title) {
            entry += entry ? `, "${reference.title},"` : `"${reference.title},"`;
        }

        if (reference.publication) {
            entry += ` *${reference.publication}*`;

            if (reference.volume) {
                entry += `, vol. ${reference.volume}`;
            }

            if (reference.issue) {
                entry += `, no. ${reference.issue}`;
            }

            if (reference.pages) {
                const pagePrefix = reference.pages.includes('-') || reference.pages.includes('–') ? 'pp.' : 'p.';
                entry += `, ${pagePrefix} ${reference.pages}`;
            }

            if (reference.year) {
                entry += `, ${reference.year}`;
            }

            entry += '.';
        }

        const doi = reference.doi || reference.DOI;
        const url = reference.url || reference.URL;

        if (doi) {
            entry += ` DOI: ${doi}`;
        } else if (url) {
            entry += ` [Online]. Available: ${url}`;
        }

        return entry;
    }

    private formatMLABibliographyEntry(reference: any): string {
        let entry = '';

        if (reference.authors && reference.authors.length > 0) {
            entry += this.formatAuthorsMLABibliography(reference.authors) + '. ';
        }

        // Title - Articles in quotes, books italic
        if (reference.title) {
            if (reference.type === 'book') {
                entry += `*${reference.title}*. `;
            } else {
                entry += `"${reference.title}." `;
            }
        }

        if (reference.publication) {
            entry += `*${reference.publication}*`;

            if (reference.volume) {
                entry += `, vol. ${reference.volume}`;
            }

            if (reference.issue) {
                entry += `, no. ${reference.issue}`;
            }

            if (reference.year) {
                entry += `, ${reference.year}`;
            }

            if (reference.pages) {
                entry += `, pp. ${reference.pages}`;
            }

            entry += '. ';
        }

        const doi = reference.doi || reference.DOI;
        const url = reference.url || reference.URL;

        if (doi) {
            entry += `https://doi.org/${doi}`;
        } else if (url) {
            entry += url;
        }

        return entry;
    }

    private formatVancouverBibliographyEntry(reference: any): string {
        let entry = '';

        if (reference.authors && reference.authors.length > 0) {
            entry += this.formatAuthorsVancouver(reference.authors) + '. ';
        }

        if (reference.title) {
            entry += `${reference.title}. `;
        }

        if (reference.publication) {
            entry += `${reference.publication}`;

            if (reference.year) {
                entry += ` ${reference.year}`;
            }

            if (reference.volume) {
                entry += `;${reference.volume}`;
            }

            if (reference.issue) {
                entry += `(${reference.issue})`;
            }

            if (reference.pages) {
                entry += `:${reference.pages}`;
            }

            entry += '.';
        }

        return entry;
    }

    private formatAuthorsMLABibliography(authors: any[]): string {
        if (authors.length === 1) {
            const author = authors[0];
            const lastName = this.extractLastName(author);
            const firstName = this.extractFirstName(author);
            return `${lastName}, ${firstName}`;
        } else if (authors.length === 2) {
            const author1 = authors[0];
            const author2 = authors[1];
            const lastName1 = this.extractLastName(author1);
            const firstName1 = this.extractFirstName(author1);
            const lastName2 = this.extractLastName(author2);
            const firstName2 = this.extractFirstName(author2);
            return `${lastName1}, ${firstName1}, and ${firstName2} ${lastName2}`;
        } else {
            const firstAuthor = authors[0];
            const lastName = this.extractLastName(firstAuthor);
            const firstName = this.extractFirstName(firstAuthor);
            return `${lastName}, ${firstName}, et al`;
        }
    }

    private formatAuthorsVancouver(authors: any[]): string {
        if (authors.length <= 6) {
            return authors.map(author => {
                const lastName = this.extractLastName(author);
                const firstName = this.extractFirstName(author);
                const initials = firstName.split(' ').map(name => name.charAt(0).toUpperCase()).join('');
                return `${lastName} ${initials}`;
            }).join(', ');
        } else {
            const firstSix = authors.slice(0, 6).map(author => {
                const lastName = this.extractLastName(author);
                const firstName = this.extractFirstName(author);
                const initials = firstName.split(' ').map(name => name.charAt(0).toUpperCase()).join('');
                return `${lastName} ${initials}`;
            }).join(', ');
            return `${firstSix}, et al`;
        }
    }

    private formatAuthorsAPA(authors: any[]): string {
        if (authors.length === 1) {
            const author = authors[0];
            const lastName = this.extractLastName(author);
            const firstName = this.extractFirstName(author);
            const firstInitial = firstName.charAt(0).toUpperCase();
            const middleInitials = firstName.split(' ').slice(1).map(name => name.charAt(0).toUpperCase()).join('. ');
            const initials = middleInitials ? `${firstInitial}. ${middleInitials}` : `${firstInitial}.`;

            return `${lastName}, ${initials}`;
        }
        else if (authors.length === 2) {
            const author1 = authors[0];
            const author2 = authors[1];

            const lastName1 = this.extractLastName(author1);
            const firstName1 = this.extractFirstName(author1);
            const initials1 = firstName1.split(' ').map(name => name.charAt(0).toUpperCase()).join('. ') + '.';

            const lastName2 = this.extractLastName(author2);
            const firstName2 = this.extractFirstName(author2);
            const initials2 = firstName2.split(' ').map(name => name.charAt(0).toUpperCase()).join('. ') + '.';

            return `${lastName1}, ${initials1}, & ${initials2} ${lastName2}`;
        }
        else if (authors.length <= 20) {
            const authorStrings = authors.map((author, index) => {
                const lastName = this.extractLastName(author);
                const firstName = this.extractFirstName(author);
                const initials = firstName.split(' ').map(name => name.charAt(0).toUpperCase()).join('. ') + '.';

                if (index === 0) {
                    // First author: Last, F. M.
                    return `${lastName}, ${initials}`;
                } else if (index === authors.length - 1) {
                    // Last author: & F. M. Last
                    return `& ${initials} ${lastName}`;
                } else {
                    // Middle authors: F. M. Last
                    return `${initials} ${lastName}`;
                }
            });

            return authorStrings.join(', ');
        }
        else {
            // 21+ authors: first 19, ..., last author
            const firstNineteen = authors.slice(0, 19).map((author, index) => {
                const lastName = this.extractLastName(author);
                const firstName = this.extractFirstName(author);
                const initials = firstName.split(' ').map(name => name.charAt(0).toUpperCase()).join('. ') + '.';

                if (index === 0) {
                    return `${lastName}, ${initials}`;
                } else {
                    return `${initials} ${lastName}`;
                }
            });

            const lastAuthor = authors[authors.length - 1];
            const lastLastName = this.extractLastName(lastAuthor);
            const lastFirstName = this.extractFirstName(lastAuthor);
            const lastInitials = lastFirstName.split(' ').map(name => name.charAt(0).toUpperCase()).join('. ') + '.';

            return `${firstNineteen.join(', ')}, ... ${lastInitials} ${lastLastName}`;
        }
    }

    private sortAndFormatBibliographyEntries(entries: string[], references: any[], style: any): string[] {
        // Sort alphabetically by first author's last name
        const combined = entries.map((entry, index) => ({
            entry,
            reference: references[index],
            sortKey: this.generateSortKey(references[index])
        }));

        combined.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        return combined.map(item => item.entry);
    }

    private extractFirstName(author: any): string {
        if (!author) return '';

        if (typeof author === 'string') {
            const parts = author.trim().split(' ');
            return parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
        }

        if (typeof author === 'object') {
            if (author.firstName || author.given) {
                return author.firstName || author.given;
            }
            if (author.name) {
                const parts = author.name.trim().split(' ');
                return parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
            }
        }

        return '';
    }

    setCitationNumbersForReferences(referenceNumberMap: Map<string, number>): void {

        // Kendi citation numbers map'ini güncelle
        this.citationNumbers.clear();
        referenceNumberMap.forEach((number, referenceId) => {
            this.citationNumbers.set(referenceId, number);
        });

        // Next number'ı en yüksek sayıdan 1 fazla yap
        this.nextNumber = Math.max(...Array.from(referenceNumberMap.values())) + 1;

        // CSL processor'daki numbering'i de sync et
        this.cslProcessor.setCitationNumbers(referenceNumberMap);

    }

    presetCitationNumbers(referenceNumberMap: Map<string, number>): void {

        // Kendi citation numbers map'ini güncelle
        this.citationNumbers.clear();
        referenceNumberMap.forEach((number, referenceId) => {
            this.citationNumbers.set(referenceId, number);
        });

        // Next number'ı güncel tut
        this.nextNumber = Math.max(...Array.from(referenceNumberMap.values())) + 1;

        // CSL Processor'da da aynı numbering'i set et
        this.cslProcessor.presetCitationNumbers(referenceNumberMap);

    }
}