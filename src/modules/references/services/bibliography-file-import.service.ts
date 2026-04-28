import { Injectable, Logger } from '@nestjs/common';
import { ReferencesService } from '../references.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { BibliographyImportFormat, BibliographyFileImportDto } from '../dto/quick-import/quick-import.dto';
import {
    ParsedBibliographyEntry,
    parseBibtexFile,
    parseRisFile,
    ensureImportTitle,
} from '../utils/bibliography-file-import.parser';
import { CreateReferenceDto } from '../dto/reference/create-reference.dto';

export interface BibliographyFileImportItemResult {
    success: boolean;
    title?: string;
    referenceId?: string;
    skippedDuplicate?: boolean;
    error?: string;
}

export interface BibliographyFileImportResultDto {
    totalParsed: number;
    created: number;
    skippedDuplicates: number;
    failed: number;
    results: BibliographyFileImportItemResult[];
}

@Injectable()
export class BibliographyFileImportService {
    private readonly logger = new Logger(BibliographyFileImportService.name);

    constructor(
        private readonly referencesService: ReferencesService,
        private readonly duplicateService: DuplicateDetectionService
    ) {}

    private toCreateDto(
        entry: ParsedBibliographyEntry,
        userId: string,
        collectionId?: string
    ): CreateReferenceDto {
        const title = ensureImportTitle(entry.title, 'Imported reference');
        return {
            collectionId,
            type: entry.type || 'misc',
            title,
            authors: entry.authors,
            publication: entry.publication,
            publisher: entry.publisher,
            year: entry.year,
            volume: entry.volume,
            issue: entry.issue,
            pages: entry.pages,
            doi: entry.doi,
            isbn: entry.isbn,
            issn: entry.issn,
            url: entry.url,
            abstractText: entry.abstractText,
            notes: entry.notes,
            metadata: {
                ...(entry.metadata || {}),
                importSource: 'bibliography_file',
                importDate: new Date().toISOString(),
            },
            addedBy: userId,
        };
    }

    async importBibliographyFile(
        libraryId: string,
        userId: string,
        dto: BibliographyFileImportDto
    ): Promise<BibliographyFileImportResultDto> {
        const maxLen = 2_000_000;
        const content = (dto.content || '').slice(0, maxLen);
        let entries: ParsedBibliographyEntry[] =
            dto.format === BibliographyImportFormat.RIS ? parseRisFile(content) : parseBibtexFile(content);

        const limit = dto.maxEntries ?? 2000;
        if (entries.length > limit) {
            entries = entries.slice(0, limit);
        }

        const checkDup = dto.checkDuplicates !== false;
        const results: BibliographyFileImportItemResult[] = [];
        let created = 0;
        let skippedDuplicates = 0;
        let failed = 0;

        for (const entry of entries) {
            const titlePreview = ensureImportTitle(entry.title, 'Imported reference');
            try {
                const payload = this.toCreateDto(entry, userId, dto.collectionId);
                if (checkDup) {
                    const dup = await this.duplicateService.detectDuplicates(libraryId, payload as any);
                    if (dup.isDuplicate) {
                        skippedDuplicates++;
                        results.push({
                            success: false,
                            title: titlePreview,
                            skippedDuplicate: true,
                        });
                        continue;
                    }
                }
                const ref = await this.referencesService.create(libraryId, payload);
                created++;
                results.push({ success: true, title: titlePreview, referenceId: ref.id });
            } catch (e: any) {
                failed++;
                this.logger.warn(`Bibliography import row failed: ${e?.message}`);
                results.push({
                    success: false,
                    title: titlePreview,
                    error: e?.message || 'Create failed',
                });
            }
        }

        return {
            totalParsed: entries.length,
            created,
            skippedDuplicates,
            failed,
            results,
        };
    }
}
