import { Injectable } from "@nestjs/common";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CITATIONS_MESSAGES } from "../constants/citation.messages";
import { ReferencesService } from "src/modules/references/references.service";
import { ReferencesResponse } from "src/modules/references/dto/reference/references.response";
import { CitationStyleResponse } from "../dto/citation-style/citation-style.response";
import { CreateCitationStyleDto } from "../dto/citation-style/citation-style-create.dto";
import { FormatCitationDto } from "../dto/format-citation.dto";
import { CSLProcessorService } from "./csl-processor.service";

import { formatAPA, formatChicago, formatIEEE, formatMLA } from "../utils/style-formatting";
import { formatAPABibliography, getFirstAuthorLastName } from "../utils/bibliography";

@Injectable()
export class CitationStylesService {
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
        const style = await this.prisma.citationStyle.findUnique({ where: { id } });

        if (!style) {
            throw new CustomHttpException(CITATIONS_MESSAGES.STYLE_NOT_FOUND, 404, CITATIONS_MESSAGES.STYLE_NOT_FOUND);
        }

        return style;
    }
    
    async formatCitationWithStyle(styleId: string, data: FormatCitationDto): Promise<string> {
        const reference = await this.referenceService.getReference(data.referenceId);
        const style = await this.getStyleById(styleId);

        await this.incrementDownloadCount(styleId);

        console.log('🔍 Formatting citation with CSL content for style:', style.name);

        if (style.cslContent) {
            try {
                console.log('📝 Using CSL Processor for formatting');
                
                const formattedCitation = this.cslProcessor.formatCitation(
                    style.cslContent,
                    reference,
                    {
                        suppressAuthor: data.suppressAuthor,
                        suppressDate: data.suppressDate,
                        pageNumbers: data.pageNumbers,
                        prefix: data.prefix,
                        suffix: data.suffix
                    }
                );

                console.log('✅ CSL formatting successful:', formattedCitation);
                return formattedCitation;

            } catch (error) {
                console.warn('⚠️ CSL processing failed, falling back to hardcoded format:', error.message);
                return this.formatReferenceByStyleFallback(reference, style, data);
            }
        } else {
            console.log('📝 Using fallback formatting (no valid CSL content)');
            return this.formatReferenceByStyleFallback(reference, style, data);
        }
    }

    async generateBibliography(referenceIds: string[], styleId: string): Promise<string[]> {
        const references = await Promise.all(
            referenceIds.map(id => this.referenceService.getReference(id))
        );

        const validReferences = references.filter(ref => ref !== undefined);
        const style = await this.getStyleById(styleId);

        console.log('📚 Generating bibliography with CSL content for style:', style.name);

        if (style.cslContent && this.isValidCSLContent(style.cslContent)) {
            try {
                console.log('📝 Using CSL Processor for bibliography');
                
                const bibliographyEntries = validReferences.map(reference =>
                    this.cslProcessor.formatBibliography(style.cslContent, reference)
                );

                bibliographyEntries.sort((a, b) => {
                    const refA = validReferences.find(r =>
                        this.cslProcessor.formatBibliography(style.cslContent, r) === a
                    );
                    const refB = validReferences.find(r =>
                        this.cslProcessor.formatBibliography(style.cslContent, r) === b
                    );

                    const aAuthor = getFirstAuthorLastName(refA!);
                    const bAuthor = getFirstAuthorLastName(refB!);
                    return aAuthor.localeCompare(bAuthor);
                });

                console.log('✅ CSL bibliography generation successful');
                return bibliographyEntries;

            } catch (error) {
                console.warn('⚠️ CSL bibliography processing failed, falling back:', error.message);
                return this.generateBibliographyFallback(validReferences, style);
            }
        } else {
            console.log('📝 Using fallback bibliography formatting');
            return this.generateBibliographyFallback(validReferences, style);
        }
    }

    
    private isValidCSLContent(cslContent: string): boolean {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(cslContent, 'text/xml');
            
            const parserError = doc.querySelector('parsererror');
            if (parserError) return false;

            const styleElement = doc.documentElement;
            if (styleElement.tagName !== 'style') return false;

            const namespace = styleElement.getAttribute('xmlns');
            if (namespace !== 'http://purl.org/net/xbiblio/csl') return false;

            return true;
        } catch {
            return false;
        }
    }

    private formatReferenceByStyleFallback(
        reference: any, 
        style: CitationStyleResponse, 
        options?: FormatCitationDto
    ): string {
        console.log('🔄 Using fallback formatting for style:', style.shortName);

        const suppressAuthor = options?.suppressAuthor || false;
        const suppressDate = options?.suppressDate || false;
        const pageNumbers = options?.pageNumbers;
        const prefix = options?.prefix || '';
        const suffix = options?.suffix || '';

        const styleShortName = style.shortName.toLowerCase();

        switch (styleShortName) {
            case 'apa':
                return formatAPA(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            case 'mla':
                return formatMLA(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            case 'chicago':
                return formatChicago(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            case 'ieee':
                return formatIEEE(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            default:
                console.log('⚠️ Unknown style, defaulting to APA');
                return formatAPA(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
        }
    }

    private generateBibliographyFallback(
        references: ReferencesResponse[], 
        style: CitationStyleResponse
    ): string[] {
        const bibliographyEntries = references.map(reference =>
            this.formatBibliographyEntryFallback(reference, style)
        );

        bibliographyEntries.sort((a, b) => {
            const refA = references.find(r =>
                this.formatBibliographyEntryFallback(r, style) === a
            );
            const refB = references.find(r =>
                this.formatBibliographyEntryFallback(r, style) === b
            );

            const aAuthor = getFirstAuthorLastName(refA!);
            const bAuthor = getFirstAuthorLastName(refB!);
            return aAuthor.localeCompare(bAuthor);
        });

        return bibliographyEntries;
    }

    private formatBibliographyEntryFallback(
        reference: ReferencesResponse, 
        style: CitationStyleResponse
    ): string {
        switch (style.shortName.toLowerCase()) {
            case 'apa':
                return formatAPABibliography(reference);
            case 'mla':
                return "formatMLABibliography(reference)"; // TODO: Implement
            case 'chicago':
                return "formatChicagoBibliography(reference)"; // TODO: Implement
            case 'ieee':
                return "formatIEEEBibliography(reference)"; // TODO: Implement
            default:
                return formatAPABibliography(reference);
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
}