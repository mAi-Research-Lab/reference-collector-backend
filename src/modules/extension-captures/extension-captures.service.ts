import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ReferencesService } from '../references/references.service';
import { CaptureWebPageDto } from './dto/capture-web-page.dto';
import { ExtensionCaptureResponse } from './dto/extension-capture.response';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { EXTENSION_CAPTURES_MESSAGES } from './constants/extension-captures.messages';
import { CaptureStatsResponse } from './dto/capture-stats.response';

@Injectable()
export class ExtensionCapturesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly referenceService: ReferencesService
    ) { }

    async captureWebPage(userId: string, libraryId: string, data: CaptureWebPageDto): Promise<ExtensionCaptureResponse> {
        let captureRecord: any;
        let referenceId: string | null = null;
        let success = false;
        let errorMessage: string | null = null;
        let processedMetadata: any

        try {
            const translator = this.determineTranslator(data.url, data.translatorUsed);

            processedMetadata = this.processRawMetadata(data.rawMetadata, translator);

            const referenceData = this.buildReferenceData(data, processedMetadata, userId);

            if (data.autoCreate !== false) {
                try {
                    const createdReference = await this.referenceService.create(libraryId, referenceData);
                    referenceId = createdReference.id;
                    success = true;
                } catch (refError) {
                    errorMessage = `Reference creation failed: ${refError.message}`;
                    success = false;
                }
            } else {
                success = true;
            }

        } catch (processingError) {
            errorMessage = `Metadata processing failed: ${processingError.message}`;
            success = false;
        }

        try {
            captureRecord = await this.prisma.extensionCapture.create({
                data: {
                    userId,
                    url: data.url,
                    title: data.title,
                    rawMetadata: data.rawMetadata || {},
                    processedMetadata: processedMetadata || {},
                    captureMethod: data.captureMethod || 'manual',
                    browserInfo: data.browserInfo || {},
                    translatorUsed: data.translatorUsed || 'generic',
                    success,
                    errorMessage,
                    referenceId,
                }
            });
        } catch (dbError) {
            throw new CustomHttpException(
                `Failed to save capture record: ${dbError.message}`,
                500,
                'CAPTURE_SAVE_FAILED'
            );
        }

        return captureRecord as ExtensionCaptureResponse;
    }

    async getUserCaptures(userId: string, status?: 'success' | 'failed'): Promise<ExtensionCaptureResponse[]> {
        const whereClause: any = { userId };

        if (status === 'success') {
            whereClause.success = true;
        } else if (status === 'failed') {
            whereClause.success = false;
        }

        return await this.prisma.extensionCapture.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                reference: true
            }
        });
    }

    async reprocessCapture(captureId: string, userId: string): Promise<ExtensionCaptureResponse> {
        const capture = await this.prisma.extensionCapture.findFirst({
            where: { id: captureId, userId }
        });

        if (!capture) {
            throw new CustomHttpException(
                'Capture not found',
                404,
                'CAPTURE_NOT_FOUND'
            );
        }

        const alternativeTranslator = this.getAlternativeTranslator(capture.translatorUsed || 'generic');

        try {
            const reprocessedMetadata = this.processRawMetadata(
                capture.rawMetadata,
                alternativeTranslator
            );

            const updatedCapture = await this.prisma.extensionCapture.update({
                where: { id: captureId },
                data: {
                    processedMetadata: reprocessedMetadata,
                    translatorUsed: alternativeTranslator,
                    success: true,
                    errorMessage: null
                }
            });

            return updatedCapture as ExtensionCaptureResponse;

        } catch (error) {
            await this.prisma.extensionCapture.update({
                where: { id: captureId },
                data: {
                    errorMessage: `Reprocessing failed: ${error.message}`
                }
            });

            throw new CustomHttpException(
                `Reprocessing failed: ${error.message}`,
                400,
                'REPROCESSING_FAILED'
            );
        }
    }

    async deleteCapture(captureId: string): Promise<{ message: string }> {
        const capture = await this.prisma.extensionCapture.findFirst({
            where: { id: captureId }
        });

        if (!capture) {
            throw new CustomHttpException(
                EXTENSION_CAPTURES_MESSAGES.EXTENSION_CAPTURE_NOT_FOUND,
                404,
                'CAPTURE_NOT_FOUND'
            );
        }

        await this.prisma.extensionCapture.delete({
            where: { id: captureId }
        });

        return { message: EXTENSION_CAPTURES_MESSAGES.EXTENSION_CAPTURE_DELETED_SUCCESSFULLY };
    }

    async getCaptureStats(userId: string): Promise<CaptureStatsResponse> {
        const stats = await this.prisma.extensionCapture.groupBy({
            by: ['success', 'translatorUsed'],
            where: { userId },
            _count: {
                _all: true
            }
        });

        const recentCaptures = await this.prisma.extensionCapture.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                url: true,
                title: true,
                success: true,
                translatorUsed: true,
                createdAt: true
            }
        });

        let successfulCount = 0;
        let failedCount = 0;
        const translatorCounts: Record<string, number> = {};

        stats.forEach(stat => {
            const count = stat._count._all;

            if (stat.success) {
                successfulCount += count;
            } else {
                failedCount += count;
            }

            translatorCounts[stat.translatorUsed || 'unknown'] =
                (translatorCounts[stat.translatorUsed || 'unknown'] || 0) + count;
        });

        const totalCount = successfulCount + failedCount;

        return {
            summary: {
                total: totalCount,
                successful: successfulCount,
                failed: failedCount,
                successRate: totalCount > 0 ? Math.round((successfulCount / totalCount) * 100) : 0
            },
            translators: {
                mostUsed: Object.keys(translatorCounts)
                    .map(translator => ({
                        name: translator,
                        count: translatorCounts[translator],
                        percentage: Math.round((translatorCounts[translator] / totalCount) * 100)
                    }))
                    .sort((a, b) => b.count - a.count)
            },
            recentActivity: recentCaptures.map(capture => ({
                id: capture.id,
                url: capture.url,
                title: capture.title,
                success: capture.success,
                translator: capture.translatorUsed || 'unknown',
                domain: this.extractDomain(capture.url),
                createdAt: capture.createdAt
            }))
        };
    }

    private extractDomain(url: string): string {
        try {
            return new URL(url).hostname;
        } catch {
            return 'Unknown';
        }
    }

    private determineTranslator(url: string, requestedTranslator?: string): string {
        if (requestedTranslator) return requestedTranslator;

        const domain = new URL(url).hostname;

        const translatorMap: Record<string, string> = {
            'pubmed.ncbi.nlm.nih.gov': 'pubmed',
            'www.nature.com': 'nature',
            'nature.com': 'nature',
            'arxiv.org': 'arxiv',
            'scholar.google.com': 'google-scholar',
            'www.jstor.org': 'jstor',
            'ieeexplore.ieee.org': 'ieee'
        };

        return translatorMap[domain] || 'generic';
    }

    private processRawMetadata(rawMetadata: any, translator: string): any {
        if (!rawMetadata) return {};

        switch (translator) {
            case 'pubmed':
                return this.processPubMedMetadata(rawMetadata);
            case 'nature':
                return this.processNatureMetadata(rawMetadata);
            case 'arxiv':
                return this.processArxivMetadata(rawMetadata);
            default:
                return this.processGenericMetadata(rawMetadata);
        }
    }

    private processPubMedMetadata(rawMetadata: any): any {
        const metaTags = rawMetadata.metaTags || {};

        return {
            title: metaTags['citation_title'] || rawMetadata.htmlTitle,
            authors: this.parseAuthors(metaTags['citation_author']),
            journal: metaTags['citation_journal_title'],
            year: metaTags['citation_publication_date']?.split('-')[0],
            doi: metaTags['citation_doi'],
            pmid: metaTags['citation_pmid'],
            abstract: metaTags['citation_abstract']
        };
    }

    private processNatureMetadata(rawMetadata: any): any {
        const metaTags = rawMetadata.metaTags || {};

        return {
            title: metaTags['citation_title'],
            authors: this.parseAuthors(metaTags['citation_author']),
            journal: metaTags['citation_journal_title'] || 'Nature',
            year: metaTags['citation_publication_date']?.split('-')[0],
            doi: metaTags['citation_doi'],
            volume: metaTags['citation_volume'],
            issue: metaTags['citation_issue'],
            pages: metaTags['citation_firstpage'] && metaTags['citation_lastpage']
                ? `${metaTags['citation_firstpage']}-${metaTags['citation_lastpage']}`
                : undefined
        };
    }

    private processArxivMetadata(rawMetadata: any): any {
        return {
            title: rawMetadata.metaTags?.['citation_title'],
            authors: this.parseAuthors(rawMetadata.metaTags?.['citation_author']),
            year: rawMetadata.metaTags?.['citation_date']?.split('-')[0],
            arxivId: this.extractArxivId(rawMetadata.metaTags?.['citation_arxiv_id']),
            abstract: rawMetadata.metaTags?.['citation_abstract']
        };
    }

    private processGenericMetadata(rawMetadata: any): any {
        const metaTags = rawMetadata.metaTags || {};
        const openGraph = rawMetadata.openGraph || {};

        return {
            title: metaTags['citation_title'] || openGraph['og:title'] || rawMetadata.htmlTitle,
            authors: this.parseAuthors(metaTags['citation_author']),
            description: metaTags['citation_abstract'] || openGraph['og:description'],
            url: openGraph['og:url']
        };
    }

    private parseAuthors(authorString: string): any[] {
        if (!authorString) return [];

        return authorString.split(';').map(author => {
            const [lastName, firstName] = author.trim().split(', ');
            return { firstName, lastName };
        });
    }

    private extractArxivId(arxivString: string): string | undefined {
        if (!arxivString) return undefined;

        return arxivString.replace('arXiv:', '');
    }

    private buildReferenceData(data: CaptureWebPageDto, processedMetadata: any, userId: string): any {
        return {
            title: processedMetadata.title || data.title,
            authors: processedMetadata.authors || data.authors || [],
            publication: processedMetadata.journal || data.publication,
            year: parseInt(processedMetadata.year || data.year || '0') || undefined,
            doi: processedMetadata.doi || data.doi,
            url: data.url,
            abstractText: processedMetadata.abstract || data.abstractText,
            volume: processedMetadata.volume || data.volume,
            issue: processedMetadata.issue || data.issue,
            pages: processedMetadata.pages || data.pages,
            language: data.language || 'en',
            tags: data.tags || [],
            notes: data.notes,
            addedBy: userId,
            metadata: processedMetadata
        };
    }

    private getAlternativeTranslator(currentTranslator: string): string {
        const alternatives: Record<string, string> = {
            'pubmed': 'generic',
            'nature': 'generic',
            'arxiv': 'generic',
            'generic': 'fallback'
        };

        return alternatives[currentTranslator] || 'generic';
    }
}