import { Injectable, Logger } from '@nestjs/common';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { DoiResolverService } from './services/doi-resolver.service';
import { OpenAccessFinderService } from './services/open-access-finder.service';
import { PdfDownloaderService } from './services/pdf-downloader.service';
import { SnapshotService } from './services/snapshot.service';
import { PdfSearchDto } from './dto/pdf-search.dto';
import { PdfSearchResult } from './interfaces/publisher-config.interface';
import { AccessLevel, PdfResultItem, PdfSourceType } from './interfaces/pdf-source.interface';
import { DownloadOptionsDto } from './dto/download-options.dto';
import { OpenAccessQuery, OpenAccessResult } from './interfaces/open-access-result.interface';
import { SnapshotOptions } from './interfaces/snapshot.interface';

@Injectable()
export class PdfSearchService {
    private readonly logger = new Logger(PdfSearchService.name);

    constructor(
        private readonly doiResolver: DoiResolverService,
        private readonly openAccessFinder: OpenAccessFinderService,
        private readonly pdfDownloader: PdfDownloaderService,
        private readonly snapshotService: SnapshotService,
    ) { }

    async searchPdf(query: PdfSearchDto): Promise<PdfSearchResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        const allResults: PdfResultItem[] = [];

        try {
            this.validateQuery(query);

            if (query.doi) {
                try {
                    const doiResults = await this.searchByDoi(query);
                    allResults.push(...doiResults);
                    this.logger.debug(`DOI search found ${doiResults.length} results`);
                } catch (error) {
                    this.logger.warn(`DOI search failed: ${error.message}`);
                    errors.push(`DOI search: ${error.message}`);
                }
            }

            try {
                const openAccessResults = await this.searchOpenAccess(query);
                allResults.push(...openAccessResults);
                this.logger.debug(`Open Access search found ${openAccessResults.length} results`);
            } catch (error) {
                this.logger.warn(`Open Access search failed: ${error.message}`);
                errors.push(`Open Access search: ${error.message}`);
            }

            if (query.sourceTypes?.includes(PdfSourceType.PUBLISHER_API)) {
                try {
                    const publisherResults = await this.searchPublisherAPIs(query);
                    allResults.push(...publisherResults);
                    this.logger.debug(`Publisher API search found ${publisherResults.length} results`);
                } catch (error) {
                    this.logger.warn(`Publisher API search failed: ${error.message}`);
                    errors.push(`Publisher APIs: ${error.message}`);
                }
            }

            if (query.sourceTypes?.includes(PdfSourceType.SNAPSHOT) && query.title) {
                try {
                    const snapshotResults = await this.searchWithSnapshot(query);
                    allResults.push(...snapshotResults);
                    this.logger.debug(`Snapshot search found ${snapshotResults.length} results`);
                } catch (error) {
                    this.logger.warn(`Snapshot search failed: ${error.message}`);
                    errors.push(`Web snapshot: ${error.message}`);
                }
            }
            
            const mergedResults = this.mergeAndScoreResults(allResults, query);

            // const maxResults = query.maxResults || 10;
            // const topResults = mergedResults.slice(0, maxResults);

            // const validatedResults = await this.validateResults(topResults);

            const searchTime = Date.now() - startTime;

            return {
                found: mergedResults.length > 0,
                results: mergedResults,
                totalSources: this.countUniqueSources(mergedResults),
                searchTime,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            this.logger.error(`PDF search failed: ${error.message}`, error.stack);
            return {
                found: false,
                results: [],
                totalSources: 0,
                searchTime: Date.now() - startTime,
                errors: [error.message]
            };
        }
    }

    async downloadBestPdf(query: PdfSearchDto, options?: DownloadOptionsDto): Promise<any> {
        const searchResult = await this.searchPdf(query);

        if (!searchResult.found || searchResult.results.length === 0) {
            throw new CustomHttpException('No PDF sources found', 404, 'PDF_NOT_FOUND');
        }

        const sortedResults = searchResult.results.sort((a, b) => b.confidence - a.confidence);

        for (const result of sortedResults) {
            try {
                const downloadOptions: DownloadOptionsDto = {
                    referenceId: options?.referenceId || `search_${Date.now()}`,
                    overwrite: options?.overwrite || false,
                    maxFileSize: options?.maxFileSize || 50,
                    timeout: options?.timeout || 120,
                    validatePdf: options?.validatePdf !== false,
                    ...options
                };

                const downloadResult = await this.pdfDownloader.downloadPdf(result.url, downloadOptions);

                if (downloadResult.success) {
                    return {
                        success: true,
                        source: result.source,
                        confidence: result.confidence,
                        accessLevel: result.accessLevel,
                        downloadResult
                    };
                }
            } catch (error) {
                this.logger.warn(`Failed to download from ${result.source}: ${error.message}`);
                continue;
            }
        }

        throw new CustomHttpException('All download attempts failed', 500, 'DOWNLOAD_FAILED');
    }

    private validateQuery(query: PdfSearchDto): void {
        if (!query.doi && !query.title && !query.pmid && !query.isbn) {
            throw new CustomHttpException(
                'Query must contain at least one identifier (DOI, title, PMID, or ISBN)',
                400,
                'INVALID_QUERY'
            );
        }

        if (query.doi && !this.isValidDoi(query.doi)) {
            throw new CustomHttpException('Invalid DOI format', 400, 'INVALID_DOI');
        }
    }

    private async searchByDoi(query: PdfSearchDto): Promise<PdfResultItem[]> {
        const results: PdfResultItem[] = [];

        try {
            const doiResult = await this.doiResolver.resolveDoi(query.doi!);

            if (doiResult.pdfUrl) {
                results.push({
                    source: 'DOI Resolver',
                    sourceType: PdfSourceType.PUBLISHER_API,
                    url: doiResult.pdfUrl,
                    confidence: 1.0,
                    accessLevel: AccessLevel.FREE,
                    lastChecked: new Date(),
                    metadata: {
                        title: doiResult.title,
                        authors: doiResult.authors,
                        publisher: doiResult.publisher,
                        year: doiResult.publicationDate ? new Date(doiResult.publicationDate).getFullYear() : undefined,
                        doi: doiResult.doi
                    }
                });
            }

            const pdfUrl = await this.doiResolver.findPdfFromDoi(query.doi!);
            if (pdfUrl && pdfUrl !== doiResult.pdfUrl) {
                results.push({
                    source: 'CrossRef',
                    sourceType: PdfSourceType.OPEN_ACCESS,
                    url: pdfUrl,
                    confidence: 0.95,
                    accessLevel: AccessLevel.FREE,
                    lastChecked: new Date(),
                    metadata: {
                        title: doiResult.title,
                        authors: doiResult.authors,
                        publisher: doiResult.publisher,
                        year: doiResult.publicationDate ? new Date(doiResult.publicationDate).getFullYear() : undefined,
                        doi: doiResult.doi
                    }
                });
            }

        } catch (error) {
            this.logger.debug(`DOI resolution failed: ${error.message}`);
        }

        return results;
    }

    private async searchOpenAccess(query: PdfSearchDto): Promise<PdfResultItem[]> {
        const openAccessQuery: OpenAccessQuery = {
            doi: query.doi,
            title: query.title,
            authors: query.authors,
            journal: query.journal,
            year: query.year,
            pmid: query.pmid
        };

        const openAccessResults = await this.openAccessFinder.findOpenAccessPdf(openAccessQuery);

        return openAccessResults.map(result => this.convertOpenAccessResult(result));
    }

    // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
    private async searchPublisherAPIs(query: PdfSearchDto): Promise<PdfResultItem[]> {
        const results: PdfResultItem[] = [];

        // This would integrate with publisher-specific APIs
        // For now, return empty array as this requires specific API implementations

        // Examples of what could be implemented:
        // - PubMed Central API (already covered in OpenAccessFinder)
        // - Springer API
        // - Elsevier API
        // - Wiley API
        // - IEEE Xplore API
        // - ACM Digital Library API

        this.logger.debug('Publisher API search not yet implemented');
        return results;
    }

    private async searchWithSnapshot(query: PdfSearchDto): Promise<PdfResultItem[]> {
        const results: PdfResultItem[] = [];

        if (!query.title) return results;

        try {
            const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(query.title)}`;

            const snapshotOptions: SnapshotOptions = {
                removeAds: true,
                optimizeForReading: true,
                extractMainContent: true,
                quality: 'medium',
                format: 'A4',
                timeout: 30000
            };

            const snapshotResult = await this.snapshotService.createPdfSnapshot(searchUrl, snapshotOptions);

            if (snapshotResult.success && snapshotResult.pdfBuffer) {
                results.push({
                    source: 'Web Snapshot',
                    sourceType: PdfSourceType.SNAPSHOT,
                    url: `snapshot://${Date.now()}`,
                    confidence: 0.3,
                    accessLevel: AccessLevel.FREE,
                    lastChecked: new Date(),
                    metadata: {
                        title: snapshotResult.metadata?.title || query.title,
                        authors: query.authors || [],
                        year: query.year,
                        contentType: snapshotResult.metadata?.contentType
                    },
                    snapshotData: snapshotResult.pdfBuffer
                });
            }

        } catch (error) {
            this.logger.debug(`Snapshot creation failed: ${error.message}`);
        }

        return results;
    }

    private mergeAndScoreResults(results: PdfResultItem[], query: PdfSearchDto): PdfResultItem[] {
        const uniqueResults = new Map<string, PdfResultItem>();

        for (const result of results) {
            const existing = uniqueResults.get(result.url);

            if (!existing || result.confidence > existing.confidence) {
                uniqueResults.set(result.url, result);
            }
        }

        const scoredResults = Array.from(uniqueResults.values())
            .map(result => this.calculateEnhancedScore(result, query))
            .sort((a, b) => b.confidence - a.confidence);

        return scoredResults;
    }

    private calculateEnhancedScore(result: PdfResultItem, query: PdfSearchDto): PdfResultItem {
        let score = result.confidence;

        switch (result.accessLevel) {
            case AccessLevel.FREE:
                score += 0.2;
                break;
            case AccessLevel.INSTITUTIONAL:
                score += 0.1;
                break;
            case AccessLevel.PURCHASE:
                score -= 0.1;
                break;
        }

        const sourceBoosts: Record<string, number> = {
            'PubMed Central': 0.15,
            'arXiv': 0.1,
            'Unpaywall': 0.1,
            'DOI Resolver': 0.1,
            'DOAJ': 0.05,
            'bioRxiv': 0.05
        };

        if (sourceBoosts[result.source]) {
            score += sourceBoosts[result.source];
        }

        if (query.title && result.metadata?.title) {
            const titleSimilarity = this.calculateStringSimilarity(
                query.title.toLowerCase(),
                result.metadata.title.toLowerCase()
            );
            score += titleSimilarity * 0.3;
        }

        if (query.doi && result.metadata?.doi === query.doi) {
            score += 0.25;
        }

        if (query.year && result.metadata?.year === query.year) {
            score += 0.1;
        }

        if (query.authors && result.metadata?.authors) {
            const authorMatches = this.countAuthorMatches(query.authors, result.metadata.authors);
            score += (authorMatches / Math.max(query.authors.length, 1)) * 0.2;
        }

        return {
            ...result,
            confidence: Math.min(1.0, Math.max(0.0, score))
        };
    }

    private async validateResults(results: PdfResultItem[]): Promise<PdfResultItem[]> {
        const validatedResults: PdfResultItem[] = [];

        for (const result of results) {
            try {
                if (result.url.startsWith('snapshot://')) {
                    validatedResults.push(result);
                    continue;
                }

                const contentCheck = await this.pdfDownloader.checkContentType(result.url);

                if (contentCheck.isValidPdf) {
                    // Update access level based on response
                    if (contentCheck.error?.includes('403') || contentCheck.error?.includes('401')) {
                        result.accessLevel = AccessLevel.INSTITUTIONAL;
                    } else if (contentCheck.error?.includes('paywall')) {
                        result.accessLevel = AccessLevel.PURCHASE;
                    } else if (result.accessLevel === AccessLevel.FREE) {
                        result.accessLevel = AccessLevel.FREE;
                    }

                    result.lastChecked = new Date();
                    validatedResults.push(result);
                } else {
                    this.logger.debug(`URL validation failed for ${result.url}: ${contentCheck.error}`);
                }

            } catch (error) {
                this.logger.debug(`URL validation error for ${result.url}: ${error.message}`);
            }
        }

        return validatedResults;
    }

    private convertOpenAccessResult(openAccessResult: OpenAccessResult): PdfResultItem {
        return {
            source: openAccessResult.source,
            sourceType: PdfSourceType.OPEN_ACCESS,
            url: openAccessResult.url,
            confidence: openAccessResult.confidence,
            accessLevel: openAccessResult.accessLevel,
            lastChecked: openAccessResult.lastChecked,
            metadata: openAccessResult.metadata
        };
    }

    private calculateStringSimilarity(str1: string, str2: string): number {
        const bigrams = (str: string) => {
            const bigrams = new Set<string>();
            for (let i = 0; i < str.length - 1; i++) {
                bigrams.add(str.slice(i, i + 2));
            }
            return bigrams;
        };

        const bigrams1 = bigrams(str1);
        const bigrams2 = bigrams(str2);

        const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
        return (2 * intersection.size) / (bigrams1.size + bigrams2.size);
    }

    private countAuthorMatches(queryAuthors: string[], resultAuthors: string[]): number {
        let matches = 0;

        for (const queryAuthor of queryAuthors) {
            for (const resultAuthor of resultAuthors) {
                if (this.calculateStringSimilarity(
                    queryAuthor.toLowerCase(),
                    resultAuthor.toLowerCase()
                ) > 0.8) {
                    matches++;
                    break;
                }
            }
        }

        return matches;
    }

    private countUniqueSources(results: PdfResultItem[]): number {
        const sources = new Set(results.map(r => r.source));
        return sources.size;
    }

    private isValidDoi(doi: string): boolean {
        const doiRegex = /^10\.\d{4,}\/[^\s]+$/;
        return doiRegex.test(doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, ''));
    }
}

