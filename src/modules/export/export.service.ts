/* eslint-disable @typescript-eslint/await-thenable */
import { Injectable, BadRequestException } from '@nestjs/common';
import { ReferencesResponse } from 'src/modules/references/dto/reference/references.response';
import { BibtexExportService } from './services/bibtex.service';
import { RisExportService } from './services/ris.service';
import { RtfExportService } from './services/rtf.service';
import { HtmlExportService } from './services/html.service';
import { ExportFormat } from './enums/export-format.enum';
import { ExportOptions, ExportResult } from './enums/export-option.enum';
import { CitationStyle } from '../documents/enums/citation.enum';

@Injectable()
export class ExportService {
    constructor(
        private readonly bibtexService: BibtexExportService,
        private readonly risService: RisExportService,
        private readonly rtfService: RtfExportService,
        private readonly htmlService: HtmlExportService,
    ) { }

    exportReferences(
        references: ReferencesResponse[],
        format: ExportFormat,
        options: ExportOptions = {}
    ): ExportResult {
        try {
            if (!references || references.length === 0) {
                throw new BadRequestException('No references provided for export');
            }

            if (!Object.values(ExportFormat).includes(format)) {
                throw new BadRequestException(`Unsupported export format: ${format}`);
            }

            let content: string;
            let filename: string;
            let mimeType: string;

            switch (format) {
                case ExportFormat.BIBTEX:
                    content = this.bibtexService.exportToBibtex(references);
                    filename = this.generateFilename('bibliography', 'bib', options);
                    mimeType = 'application/x-bibtex';
                    break;

                case ExportFormat.RIS:
                    content = this.risService.exportToRis(references);
                    filename = this.generateFilename('bibliography', 'ris', options);
                    mimeType = 'application/x-research-info-systems';
                    break;

                case ExportFormat.RTF:
                    content = this.rtfService.exportToRtf(references, options.citationStyle as any);
                    filename = this.generateFilename('bibliography', 'rtf', options);
                    mimeType = 'application/rtf';
                    break;

                case ExportFormat.HTML:
                    content = this.htmlService.exportToHtml(references, {
                        title: options.title || 'Bibliography',
                        citationStyle: options.citationStyle as any || CitationStyle.APA,
                        customCss: options.customCss,
                    });
                    filename = this.generateFilename('bibliography', 'html', options);
                    mimeType = 'text/html';
                    break;

                // case ExportFormat.ZIP:
                //     {
                //         const zipBuffer = await this.backupService.createZipBackup(references, options);

                //         return {
                //             content: zipBuffer.toString('base64'),
                //             filename: this.generateFilename('references_backup', 'zip', options),
                //             mimeType: 'application/zip',
                //             size: zipBuffer.length,
                //             format,
                //             exportedAt: new Date(),
                //             totalReferences: references.length,
                //             isBase64: true
                //         };
                //     }

                default:
                    throw new BadRequestException(`Export format ${format} is not implemented`);
            }

            return {
                content,
                filename,
                mimeType,
                size: Buffer.byteLength(content, 'utf8'),
                format,
                exportedAt: new Date(),
                totalReferences: references.length,
                isBase64: false
            };

        } catch (error) {
            throw new BadRequestException(`Export failed: ${error.message}`);
        }
    }

    async exportMultipleFormats(
        references: ReferencesResponse[],
        formats: ExportFormat[],
        options: ExportOptions = {}
    ): Promise<ExportResult[]> {
        const results: ExportResult[] = [];

        for (const format of formats) {
            try {
                const result = await this.exportReferences(references, format, options);
                results.push(result);
            } catch (error) {
                console.error(`Failed to export format ${format}:`, error.message);
            }
        }

        return results;
    }

    // async exportCollection(
    //     collectionId: string,
    //     format: ExportFormat,
    //     options: ExportOptions = {}
    // ): Promise<ExportResult> {
    //     // Bu method ReferencesService'den collection'ın referanslarını alacak
    //     // Şimdilik placeholder bırakıyorum
    //     throw new Error('Collection export not implemented yet - requires ReferencesService integration');
    // }

    // async exportByTags(
    //     tags: string[],
    //     format: ExportFormat,
    //     options: ExportOptions = {}
    // ): Promise<ExportResult> {
    //     // Bu method ReferencesService'den tag'li referansları alacak
    //     // Şimdilik placeholder bırakıyorum
    //     throw new Error('Tag-based export not implemented yet - requires ReferencesService integration');
    // }

    private generateFilename(base: string, extension: string, options: ExportOptions): string {
        if (options.filename) {
            return options.filename.endsWith(`.${extension}`)
                ? options.filename
                : `${options.filename}.${extension}`;
        }

        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .split('.')[0];

        return `${base}_${timestamp}.${extension}`;
    }

    getSupportedFormats(): { format: ExportFormat; name: string; description: string }[] {
        return [
            {
                format: ExportFormat.BIBTEX,
                name: 'BibTeX',
                description: 'Academic citation format for LaTeX documents'
            },
            {
                format: ExportFormat.RIS,
                name: 'RIS',
                description: 'Research Information Systems format (EndNote, Mendeley compatible)'
            },
            {
                format: ExportFormat.RTF,
                name: 'Rich Text Format',
                description: 'Formatted bibliography for Word documents'
            },
            {
                format: ExportFormat.HTML,
                name: 'HTML',
                description: 'Web-viewable bibliography with styling'
            },
            // {
            //     format: ExportFormat.JSON,
            //     name: 'JSON',
            //     description: 'Machine-readable data format'
            // },
            // {
            //     format: ExportFormat.XML,
            //     name: 'XML',
            //     description: 'Structured markup format'
            // },
            {
                format: ExportFormat.ZIP,
                name: 'ZIP Archive',
                description: 'Complete backup with attachments'
            }
        ];
    }

    getSupportedCitationStyles(): { style: CitationStyle; name: string }[] {
        return [
            { style: CitationStyle.APA, name: 'APA (American Psychological Association)' },
            { style: CitationStyle.MLA, name: 'MLA (Modern Language Association)' },
            { style: CitationStyle.CHICAGO, name: 'Chicago Manual of Style' },
            { style: CitationStyle.HARVARD, name: 'Harvard Referencing' },
            { style: CitationStyle.IEEE, name: 'IEEE Citation Style' }
        ];
    }

    getExportStatistics(references: ReferencesResponse[]): {
        totalReferences: number;
        byType: Record<string, number>;
        byYear: Record<number, number>;
        withDoi: number;
        withAbstract: number;
    } {
        const stats = {
            totalReferences: references.length,
            byType: {} as Record<string, number>,
            byYear: {} as Record<number, number>,
            withDoi: 0,
            withAbstract: 0
        };

        for (const ref of references) {
            stats.byType[ref.type] = (stats.byType[ref.type] || 0) + 1;

            if (ref.year) {
                stats.byYear[ref.year] = (stats.byYear[ref.year] || 0) + 1;
            }

            if (ref.doi) stats.withDoi++;
            if (ref.abstractText) stats.withAbstract++;
        }

        return stats;
    }

    async generatePreview(
        references: ReferencesResponse[],
        format: ExportFormat,
        options: ExportOptions = {}
    ): Promise<{ preview: string; totalReferences: number }> {
        // Sadece ilk 3 referansı al
        const previewRefs = references.slice(0, 3);

        const result = await this.exportReferences(previewRefs, format, options);

        return {
            preview: result.content,
            totalReferences: references.length
        };
    }

    validateExportData(references: ReferencesResponse[]): {
        isValid: boolean;
        warnings: string[];
        errors: string[];
    } {
        const warnings: string[] = [];
        const errors: string[] = [];

        if (!references || references.length === 0) {
            errors.push('No references provided');
            return { isValid: false, warnings, errors };
        }

        for (let i = 0; i < references.length; i++) {
            const ref = references[i];
            const refIndex = `Reference ${i + 1}`;

            if (!ref.title || ref.title.trim() === '') {
                errors.push(`${refIndex}: Missing title`);
            }

            if (!ref.authors || ref.authors.length === 0) {
                warnings.push(`${refIndex}: Missing authors`);
            }

            if (!ref.year) {
                warnings.push(`${refIndex}: Missing publication year`);
            }

            switch (ref.type) {
                case 'journal':
                    { const metadata = ref.metadata || {};
                    if (!metadata.journal && !ref.publication) {
                        warnings.push(`${refIndex}: Journal article missing journal name`);
                    }
                    break; }

                case 'book':
                    if (!ref.publisher) {
                        warnings.push(`${refIndex}: Book missing publisher`);
                    }
                    break;

                case 'website':
                    if (!ref.url) {
                        warnings.push(`${refIndex}: Website missing URL`);
                    }
                    break;
            }
        }

        return {
            isValid: errors.length === 0,
            warnings,
            errors
        };
    }
}