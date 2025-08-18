import { Injectable } from "@nestjs/common";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CITATIONS_MESSAGES } from "../constants/citation.messages";
import { ReferencesService } from "src/modules/references/references.service";
import { formatAPA, formatChicago, formatIEEE, formatMLA } from "../utils/style-formatting";
import { formatAPABibliography, getFirstAuthorLastName } from "../utils/bibliography";
import { ReferencesResponse } from "src/modules/references/dto/reference/references.response";
import { CitationStyleResponse } from "../dto/citation-style/citation-style.response";
import { CreateCitationStyleDto } from "../dto/citation-style/citation-style-create.dto";
import { validateCSLSchema, validateCSLVersion, validateRequiredElements, validateXMLSyntax } from "../utils/csl-content";
import { FormatCitationDto } from "../dto/format-citation.dto";

@Injectable()
export class CitationStylesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly referenceService: ReferencesService
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

        return this.formatReferenceByStyle(reference, style, data);
    }


    private formatReferenceByStyle(reference: any, style: CitationStyleResponse, options?: FormatCitationDto): string {
        console.log('🔍 Formatting citation with style:', style.shortName);
        console.log('🔍 Reference data:', reference);
        console.log('🔍 Authors:', reference.authors);

        const suppressAuthor = options?.suppressAuthor || false;
        const suppressDate = options?.suppressDate || false;
        const pageNumbers = options?.pageNumbers;
        const prefix = options?.prefix || '';
        const suffix = options?.suffix || '';

        const styleShortName = style.shortName.toLowerCase();
        console.log('🔍 Style shortName (lowercase):', styleShortName);

        switch (styleShortName) {
            case 'apa':
                console.log('📝 Using APA format');
                return formatAPA(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            case 'mla':
                console.log('📝 Using MLA format');
                return formatMLA(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            case 'chicago':
                console.log('📝 Using Chicago format');
                return formatChicago(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            case 'ieee':
                console.log('📝 Using IEEE format');
                return formatIEEE(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
            default:
                console.log('⚠️ Unknown style, defaulting to APA. Style was:', styleShortName);
                return formatAPA(reference, { suppressAuthor, suppressDate, pageNumbers, prefix, suffix });
        }
    }

    async generateBibliography(referenceIds: string[], styleId: string): Promise<string[]> {
        const references = await Promise.all(
            referenceIds.map(id => this.referenceService.getReference(id))
        );

        const validReferences = references.filter(ref => ref !== undefined);

        const style = await this.getStyleById(styleId);

        const bibliographyEntries = validReferences.map(reference =>
            this.formatBibliographyEntry(reference, style)
        );

        bibliographyEntries.sort((a, b) => {
            const refA = validReferences.find(r =>
                this.formatBibliographyEntry(r, style) === a
            );
            const refB = validReferences.find(r =>
                this.formatBibliographyEntry(r, style) === b
            );

            const aAuthor = getFirstAuthorLastName(refA!);
            const bAuthor = getFirstAuthorLastName(refB!);
            return aAuthor.localeCompare(bAuthor);
        });

        return bibliographyEntries;
    }

    private formatBibliographyEntry(reference: ReferencesResponse, style: CitationStyleResponse): string {
        switch (style.shortName.toLowerCase()) {
            case 'apa':
                return formatAPABibliography(reference);
            case 'mla':
                return "formatMLABibliography(reference)";
            case 'chicago':
                return "formatChicagoBibliography(reference)";
            case 'ieee':
                return "formatIEEEBibliography(reference)";
            default:
                return formatAPABibliography(reference);
        }
    }

    async createCustomStyle(userId: string, data: CreateCitationStyleDto): Promise<CitationStyleResponse> {
        // if (data.cslContent) {
        //     this.validateCSLContent(data.cslContent);
        // }

        const createdStyle = await this.prisma.citationStyle.create({
            data: {
                ...data,
                isCustom: true,
                createdBy: userId
            }
        });

        return createdStyle;
    }

    private validateCSLContent(cslContent: string): void {
        validateXMLSyntax(cslContent);

        validateCSLSchema(cslContent);

        validateRequiredElements(cslContent);

        validateCSLVersion(cslContent);
    }

    async getPopularStyles(): Promise<CitationStyleResponse[]> {
        const styles = await this.getAvailableStyles();

        return styles.slice(0, 10);
    }

    async searchStyles(query: string): Promise<CitationStyleResponse[]> {
        const styles = await this.prisma.citationStyle.findMany(
            {
                where: {
                    OR: [
                        { name: { contains: query } },
                        { description: { contains: query } }
                    ],
                },
                orderBy: {
                    downloadCount: 'desc'
                }
            }
        );

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