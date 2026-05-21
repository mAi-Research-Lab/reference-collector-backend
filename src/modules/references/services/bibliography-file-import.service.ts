import { Injectable, Logger } from '@nestjs/common';
import { ReferencesService } from '../references.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { FileService } from './file.service';
import { PdfSearchService } from '../../pdf-retrieval/pdf-retrieval.service';
import { BibliographyImportFormat, BibliographyFileImportDto } from '../dto/quick-import/quick-import.dto';
import {
    ParsedBibliographyEntry,
    parseBibtexFile,
    parseRisFile,
    ensureImportTitle,
} from '../utils/bibliography-file-import.parser';
import { CreateReferenceDto } from '../dto/reference/create-reference.dto';
import * as fs from 'fs/promises';

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
    pdfAttachmentQueued: number;
    libraryId: string;
    createdReferenceIds: string[];
    results: BibliographyFileImportItemResult[];
}

interface PdfAttachmentCandidate {
    referenceId: string;
    doi?: string;
    title: string;
    authors?: { name: string }[];
    year?: number;
    publication?: string;
}

@Injectable()
export class BibliographyFileImportService {
    private readonly logger = new Logger(BibliographyFileImportService.name);

    constructor(
        private readonly referencesService: ReferencesService,
        private readonly duplicateService: DuplicateDetectionService,
        private readonly fileService: FileService,
        private readonly pdfSearchService: PdfSearchService,
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

    private safePdfFilename(title: string): string {
        const base = title
            .replace(/[/\\?%*:|"<>]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120);
        return `${base || 'article'}.pdf`;
    }

    private queuePdfAttachment(candidates: PdfAttachmentCandidate[], userId: string): number {
        if (candidates.length === 0) return 0;

        setImmediate(() => {
            void this.runPdfAttachmentBatch(candidates, userId);
        });

        return candidates.length;
    }

    private async runPdfAttachmentBatch(candidates: PdfAttachmentCandidate[], userId: string): Promise<void> {
        let attached = 0;

        for (const candidate of candidates) {
            const ok = await this.attachPdfForReference(candidate, userId);
            if (ok) attached++;
            await new Promise((resolve) => setTimeout(resolve, 800));
        }

        this.logger.log(
            `Bibliography import PDF batch finished: ${attached}/${candidates.length} references received PDF attachments`,
        );
    }

    private async attachPdfForReference(
        candidate: PdfAttachmentCandidate,
        userId: string,
    ): Promise<boolean> {
        try {
            const existing = await this.fileService.getFilesByReference(candidate.referenceId);
            if (existing.length > 0) return false;

            if (!candidate.doi && !candidate.title) return false;

            const download = await this.pdfSearchService.downloadBestPdf(
                {
                    doi: candidate.doi,
                    title: candidate.title,
                    authors: candidate.authors?.map((author) => author.name).filter(Boolean),
                    year: candidate.year,
                    journal: candidate.publication,
                },
                {
                    referenceId: candidate.referenceId,
                    overwrite: false,
                    maxFileSize: 50,
                },
            );

            const filePath = download?.downloadResult?.filePath as string | undefined;
            if (!filePath) return false;

            const buffer = await fs.readFile(filePath);
            if (!buffer.length) return false;

            const filename = this.safePdfFilename(candidate.title);
            const file = {
                buffer,
                originalname: filename,
                mimetype: 'application/pdf',
                size: buffer.length,
            } as Express.Multer.File;

            await this.fileService.create(file, candidate.referenceId, userId);

            try {
                await fs.unlink(filePath);
            } catch {
                // best-effort cleanup
            }

            return true;
        } catch (error: any) {
            this.logger.debug(
                `PDF attach skipped for reference ${candidate.referenceId}: ${error?.message || error}`,
            );
            return false;
        }
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
        const attachPdfs = dto.attachPdfs !== false;
        const results: BibliographyFileImportItemResult[] = [];
        const createdReferenceIds: string[] = [];
        const pdfCandidates: PdfAttachmentCandidate[] = [];
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
                createdReferenceIds.push(ref.id);
                results.push({ success: true, title: titlePreview, referenceId: ref.id });

                if (attachPdfs) {
                    pdfCandidates.push({
                        referenceId: ref.id,
                        doi: entry.doi,
                        title: titlePreview,
                        authors: entry.authors,
                        year: entry.year,
                        publication: entry.publication,
                    });
                }
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

        const pdfAttachmentQueued = attachPdfs ? this.queuePdfAttachment(pdfCandidates, userId) : 0;

        return {
            totalParsed: entries.length,
            created,
            skippedDuplicates,
            failed,
            pdfAttachmentQueued,
            libraryId,
            createdReferenceIds,
            results,
        };
    }
}
