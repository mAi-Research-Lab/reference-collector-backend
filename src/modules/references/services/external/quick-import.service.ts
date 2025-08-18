/* eslint-disable no-useless-catch */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/database/prisma/prisma.service';
import * as xml2js from 'xml2js';
import { MetadataEnhancementService } from '../metadata-enhancement.service';
import { DuplicateDetectionService } from '../duplicate-detection.service';
import { ReferencesService } from '../../references.service';
import { BatchQuickImportDto, BatchQuickImportResultDto, IdentifierType, QuickImportDto, QuickImportResultDto } from '../../dto/quick-import/quick-import.dto';

@Injectable()
export class QuickImportService {
    private readonly logger = new Logger(QuickImportService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly prisma: PrismaService,
        private readonly metadataService: MetadataEnhancementService,
        private readonly duplicateService: DuplicateDetectionService,
        private readonly referencesService: ReferencesService
    ) { }

    /**
     * Quick import a single reference by identifier
     */
    async quickImport(
        libraryId: string,
        quickImportDto: QuickImportDto,
        userId: string
    ): Promise<QuickImportResultDto> {
        const startTime = Date.now();
        const {
            identifier,
            identifierType,
            collectionId,
            tags = [],
            notes,
            checkDuplicates = true,
            overwriteIfDuplicate = false
        } = quickImportDto;

        try {
            // Step 1: Detect and validate identifier type
            const detectedType = identifierType || this.detectIdentifierType(identifier);
            const normalizedIdentifier = this.normalizeIdentifier(identifier, detectedType);

            if (!this.validateIdentifier(normalizedIdentifier, detectedType)) {
                return {
                    success: false,
                    identifierType: detectedType,
                    identifier: normalizedIdentifier,
                    source: 'none',
                    confidence: 0,
                    importedFields: [],
                    warnings: [],
                    error: `Invalid ${detectedType.toUpperCase()} format: ${identifier}`
                };
            }

            // Step 2: Fetch metadata from appropriate source
            const metadataResult = await this.fetchMetadataByIdentifier(
                normalizedIdentifier,
                detectedType
            );

            if (!metadataResult.success) {
                return {
                    success: false,
                    identifierType: detectedType,
                    identifier: normalizedIdentifier,
                    source: metadataResult.source,
                    confidence: 0,
                    importedFields: [],
                    warnings: metadataResult.warnings,
                    error: metadataResult.error
                };
            }

            // Step 3: Check for duplicates
            let duplicateInfo = { duplicate: false };
            if (checkDuplicates) {
                const duplicateResult = await this.duplicateService.detectDuplicates(
                    libraryId,
                    metadataResult.data
                );

                if (duplicateResult.isDuplicate) {
                    duplicateInfo = {
                        duplicate: true
                    };

                    if (!overwriteIfDuplicate) {
                        return {
                            success: false,
                            identifierType: detectedType,
                            identifier: normalizedIdentifier,
                            source: metadataResult.source,
                            confidence: metadataResult.confidence,
                            importedFields: Object.keys(metadataResult.data),
                            warnings: [`Duplicate reference found (similarity: ${(duplicateResult.confidence * 100).toFixed(1)}%)`],
                            error: 'Reference already exists in library',
                            duplicateInfo
                        };
                    }
                }
            }

            // Step 4: Create reference
            const referenceData = {
                ...metadataResult.data,
                collectionId,
                tags: [...tags, ...(metadataResult.data.tags || [])],
                notes: notes ? (metadataResult.data.notes ? `${metadataResult.data.notes}\n\n${notes}` : notes) : metadataResult.data.notes,
                addedBy: userId,
                metadata: {
                    ...metadataResult.data.metadata,
                    importSource: metadataResult.source,
                    importIdentifier: normalizedIdentifier,
                    importIdentifierType: detectedType,
                    importDate: new Date().toISOString(),
                    processingTime: Date.now() - startTime
                }
            };

            let reference;
            if (duplicateInfo.duplicate && overwriteIfDuplicate) {
                // Update existing reference
                reference = await this.referencesService.updateReference(
                    referenceData.id,
                    {
                        ...referenceData,

                    }
                );
            } else {
                reference = await this.referencesService.create(libraryId, referenceData);
            }

            return {
                success: true,
                identifierType: detectedType,
                identifier: normalizedIdentifier,
                source: metadataResult.source,
                reference,
                referenceId: reference.id,
                confidence: metadataResult.confidence,
                importedFields: Object.keys(metadataResult.data).filter(key =>
                    metadataResult.data[key] !== null && metadataResult.data[key] !== undefined
                ),
                warnings: metadataResult.warnings,
                duplicateInfo
            };

        } catch (error) {
            this.logger.error(`Quick import failed for ${identifier}:`, error);
            return {
                success: false,
                identifierType: identifierType || 'unknown',
                identifier,
                source: 'error',
                confidence: 0,
                importedFields: [],
                warnings: [],
                error: error.message
            };
        }
    }

    /**
     * Batch import multiple references
     */
    async batchQuickImport(
        libraryId: string,
        batchDto: BatchQuickImportDto,
        userId: string
    ): Promise<BatchQuickImportResultDto> {
        const startTime = Date.now();
        const {
            identifiers,
            collectionId,
            commonTags = [],
            checkDuplicates = true,
            continueOnError = true,
            maxConcurrent = 5
        } = batchDto;

        const results: QuickImportResultDto[] = [];
        let successfulImports = 0;
        let failedImports = 0;
        let duplicatesFound = 0;

        // Process in batches to avoid overwhelming external APIs
        for (let i = 0; i < identifiers.length; i += maxConcurrent) {
            const batch = identifiers.slice(i, i + maxConcurrent);
            const batchPromises = batch.map(identifier =>
                this.quickImport(libraryId, {
                    identifier,
                    collectionId,
                    tags: commonTags,
                    checkDuplicates
                }, userId)
            );

            try {
                const batchResults = await Promise.allSettled(batchPromises);

                for (const result of batchResults) {
                    if (result.status === 'fulfilled') {
                        results.push(result.value);
                        if (result.value.success) {
                            successfulImports++;
                        } else {
                            failedImports++;
                            if (result.value.duplicateInfo?.duplicate) {
                                duplicatesFound++;
                            }
                        }
                    } else {
                        failedImports++;
                        results.push({
                            success: false,
                            identifierType: 'unknown',
                            identifier: batch[batchResults.indexOf(result)],
                            source: 'error',
                            confidence: 0,
                            importedFields: [],
                            warnings: [],
                            error: result.reason?.message || 'Unknown error'
                        });
                    }
                }

                // Stop on first error if continueOnError is false
                if (!continueOnError && failedImports > 0) {
                    break;
                }

                // Add delay between batches to be respectful to APIs
                if (i + maxConcurrent < identifiers.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                this.logger.error('Batch processing error:', error);
                if (!continueOnError) break;
            }
        }

        const processingTime = Date.now() - startTime;
        const successRate = identifiers.length > 0 ? successfulImports / identifiers.length : 0;

        // Generate summary
        const summary: string[] = [];
        summary.push(`${successfulImports} references imported successfully`);
        if (failedImports > 0) {
            summary.push(`${failedImports} references failed to import`);
        }
        if (duplicatesFound > 0) {
            summary.push(`${duplicatesFound} duplicates detected`);
        }

        const sourceCounts = new Map<string, number>();
        results.filter(r => r.success).forEach(result => {
            const count = sourceCounts.get(result.source) || 0;
            sourceCounts.set(result.source, count + 1);
        });

        sourceCounts.forEach((count, source) => {
            summary.push(`${count} references from ${source}`);
        });

        return {
            totalProcessed: identifiers.length,
            successfulImports,
            failedImports,
            duplicatesFound,
            results,
            successRate,
            summary,
            processingTime
        };
    }

    /**
     * Validate identifier and return preview
     */
    async validateAndPreview(
        libraryId: string,
        quickImportDto: QuickImportDto
    ): Promise<QuickImportResultDto> {
        const { identifier, identifierType } = quickImportDto;

        try {
            const detectedType = identifierType || this.detectIdentifierType(identifier);
            const normalizedIdentifier = this.normalizeIdentifier(identifier, detectedType);

            if (!this.validateIdentifier(normalizedIdentifier, detectedType)) {
                return {
                    success: false,
                    identifierType: detectedType,
                    identifier: normalizedIdentifier,
                    source: 'none',
                    confidence: 0,
                    importedFields: [],
                    warnings: [],
                    error: `Invalid ${detectedType.toUpperCase()} format`
                };
            }

            const metadataResult = await this.fetchMetadataByIdentifier(
                normalizedIdentifier,
                detectedType
            );

            return {
                success: metadataResult.success,
                identifierType: detectedType,
                identifier: normalizedIdentifier,
                source: metadataResult.source,
                reference: metadataResult.success ? metadataResult.data : undefined,
                confidence: metadataResult.confidence,
                importedFields: metadataResult.success ? Object.keys(metadataResult.data) : [],
                warnings: metadataResult.warnings,
                error: metadataResult.error
            };
        } catch (error) {
            return {
                success: false,
                identifierType: identifierType || 'unknown',
                identifier,
                source: 'error',
                confidence: 0,
                importedFields: [],
                warnings: [],
                error: error.message
            };
        }
    }

    /**
     * Search and import by title/author
     */
    async searchAndImport(
        libraryId: string,
        searchData: {
            title: string;
            author?: string;
            year?: number;
            journal?: string;
            confirmImport?: boolean;
        },
        userId: string
    ): Promise<QuickImportResultDto> {
        try {
            // Try CrossRef search first
            const searchResult = await this.searchCrossRef(searchData);

            if (searchResult.success && searchResult.confidence > 0.7) {
                // Import the found reference
                const referenceData = {
                    ...searchResult.data,
                    addedBy: userId,
                    metadata: {
                        ...searchResult.data.metadata,
                        importSource: 'crossref_search',
                        importQuery: searchData,
                        importDate: new Date().toISOString()
                    }
                };

                const reference = await this.referencesService.create(libraryId, referenceData);

                return {
                    success: true,
                    identifierType: 'search',
                    identifier: searchData.title,
                    source: 'crossref_search',
                    reference,
                    referenceId: reference.id,
                    confidence: searchResult.confidence,
                    importedFields: Object.keys(searchResult.data),
                    warnings: searchResult.warnings
                };
            }

            return {
                success: false,
                identifierType: 'search',
                identifier: searchData.title,
                source: 'crossref_search',
                confidence: searchResult.confidence,
                importedFields: [],
                warnings: searchResult.warnings,
                error: 'No suitable match found'
            };
        } catch (error) {
            return {
                success: false,
                identifierType: 'search',
                identifier: searchData.title,
                source: 'error',
                confidence: 0,
                importedFields: [],
                warnings: [],
                error: error.message
            };
        }
    }

    /**
     * Detect identifier type from string
     */
    private detectIdentifierType(identifier: string): IdentifierType {
        const cleanId = identifier.trim().toLowerCase();

        // DOI patterns
        if (/^10\.\d{4,}\/[^\s]+$/.test(cleanId)) {
            return IdentifierType.DOI;
        }

        // ISBN patterns (10 or 13 digits with optional hyphens)
        if (/^(?:97[89][-\s]?)?(?:\d[-\s]?){9}[\dx]$/i.test(cleanId.replace(/[-\s]/g, ''))) {
            return IdentifierType.ISBN;
        }

        // PubMed ID (PMID) - numeric
        if (/^\d{6,8}$/.test(cleanId)) {
            return IdentifierType.PMID;
        }

        // arXiv patterns
        if (/^arxiv:/i.test(cleanId) || /^\d{4}\.\d{4,5}(v\d+)?$/i.test(cleanId)) {
            return IdentifierType.ARXIV;
        }

        // ADS Bibcode pattern
        if (/^\d{4}[a-z&]{5}[0-9.]{4}[a-z0-9]{4}[a-z]$/i.test(cleanId.replace(/\s/g, ''))) {
            return IdentifierType.ADS_BIBCODE;
        }

        // URL pattern
        if (/^https?:\/\//.test(cleanId)) {
            return IdentifierType.URL;
        }

        // Default to DOI if contains slash and starts with numbers
        if (/^\d+\.\d+\//.test(cleanId)) {
            return IdentifierType.DOI;
        }

        // Default fallback
        return IdentifierType.DOI;
    }

    /**
     * Normalize identifier format
     */
    private normalizeIdentifier(identifier: string, type: IdentifierType): string {
        const cleanId = identifier.trim();

        switch (type) {
            case IdentifierType.DOI:
                return cleanId.toLowerCase().replace(/^doi:\s*/i, '');

            case IdentifierType.ISBN:
                return cleanId.replace(/[-\s]/g, '').toUpperCase();

            case IdentifierType.PMID:
                return cleanId.replace(/^pmid:\s*/i, '');

            case IdentifierType.ARXIV:
                return cleanId.toLowerCase().replace(/^arxiv:\s*/i, '');

            case IdentifierType.ADS_BIBCODE:
                return cleanId.replace(/\s/g, '');

            case IdentifierType.URL:
                return cleanId;

            default:
                return cleanId;
        }
    }

    /**
     * Validate identifier format
     */
    private validateIdentifier(identifier: string, type: IdentifierType): boolean {
        switch (type) {
            case IdentifierType.DOI:
                return /^10\.\d{4,}\/[^\s]+$/.test(identifier);

            case IdentifierType.ISBN:
                return this.validateISBNChecksum(identifier);

            case IdentifierType.PMID:
                return /^\d{6,8}$/.test(identifier);

            case IdentifierType.ARXIV:
                return /^\d{4}\.\d{4,5}(v\d+)?$/i.test(identifier) ||
                    /^[a-z-]+(\.[A-Z]{2})?\/\d{7}(v\d+)?$/i.test(identifier);

            case IdentifierType.ADS_BIBCODE:
                return /^\d{4}[a-z&]{5}[0-9.]{4}[a-z0-9]{4}[a-z]$/i.test(identifier);

            case IdentifierType.URL:
                try {
                    new URL(identifier);
                    return true;
                } catch {
                    return false;
                }

            default:
                return false;
        }
    }

    /**
     * Validate ISBN checksum
     */
    private validateISBNChecksum(isbn: string): boolean {
        const digits = isbn.replace(/[^\dX]/gi, '');

        if (digits.length === 10) {
            let sum = 0;
            for (let i = 0; i < 9; i++) {
                sum += parseInt(digits[i]) * (10 - i);
            }
            const checkDigit = digits[9].toLowerCase();
            const calculatedCheck = (11 - (sum % 11)) % 11;
            const expectedCheck = calculatedCheck === 10 ? 'x' : calculatedCheck.toString();
            return checkDigit === expectedCheck;
        }

        if (digits.length === 13) {
            let sum = 0;
            for (let i = 0; i < 12; i++) {
                sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
            }
            const checkDigit = parseInt(digits[12]);
            const calculatedCheck = (10 - (sum % 10)) % 10;
            return checkDigit === calculatedCheck;
        }

        return false;
    }

    /**
     * Fetch metadata by identifier type
     */
    private async fetchMetadataByIdentifier(
        identifier: string,
        type: IdentifierType
    ): Promise<{
        success: boolean;
        data?: any;
        source: string;
        confidence: number;
        warnings: string[];
        error?: string;
    }> {
        try {
            switch (type) {
                case IdentifierType.DOI:
                    return await this.fetchFromCrossRefByDOI(identifier);

                case IdentifierType.ISBN:
                    return await this.fetchFromOpenLibraryByISBN(identifier);

                case IdentifierType.PMID:
                    return await this.fetchFromPubMedByPMID(identifier);

                case IdentifierType.ARXIV:
                    return await this.fetchFromArXivById(identifier);

                // case IdentifierType.ADS_BIBCODE:
                //     return await this.fetchFromADSByBibcode(identifier);

                case IdentifierType.URL:
                    return await this.fetchFromURL(identifier);

                default:
                    return {
                        success: false,
                        source: 'unknown',
                        confidence: 0,
                        warnings: [],
                        error: `Unsupported identifier type: ${type}`
                    };
            }
        } catch (error) {
            return {
                success: false,
                source: 'error',
                confidence: 0,
                warnings: [],
                error: error.message
            };
        }
    }

    /**
     * Fetch from CrossRef by DOI
     */
    private async fetchFromCrossRefByDOI(doi: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`https://api.crossref.org/works/${doi}`, {
                    headers: {
                        'User-Agent': 'Reference-Collector/1.0 (mailto:admin@example.com)'
                    },
                    timeout: 10000
                })
            );

            if (response.data.status !== 'ok') {
                throw new Error('DOI not found in CrossRef');
            }

            const item = response.data.message;

            return {
                success: true,
                data: this.mapCrossRefToReference(item),
                source: 'crossref',
                confidence: 0.95,
                warnings: []
            };
        } catch (error) {
            if (error.response?.status === 404) {
                return {
                    success: false,
                    source: 'crossref',
                    confidence: 0,
                    warnings: [],
                    error: 'DOI not found in CrossRef database'
                };
            }
            throw error;
        }
    }

    /**
     * Fetch from Open Library by ISBN
     */
    private async fetchFromOpenLibraryByISBN(isbn: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`https://openlibrary.org/api/books`, {
                    params: {
                        bibkeys: `ISBN:${isbn}`,
                        jscmd: 'data',
                        format: 'json'
                    },
                    timeout: 10000
                })
            );

            const bookKey = `ISBN:${isbn}`;
            if (!response.data[bookKey]) {
                return {
                    success: false,
                    source: 'openlibrary',
                    confidence: 0,
                    warnings: [],
                    error: 'ISBN not found in Open Library'
                };
            }

            const book = response.data[bookKey];

            return {
                success: true,
                data: this.mapOpenLibraryToReference(book, isbn),
                source: 'openlibrary',
                confidence: 0.9,
                warnings: []
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Fetch from PubMed by PMID
     */
    private async fetchFromPubMedByPMID(pmid: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi', {
                    params: {
                        db: 'pubmed',
                        id: pmid,
                        retmode: 'xml'
                    },
                    timeout: 10000
                })
            );

            const xmlData = response.data;

            if (!xmlData.includes('<PubmedArticle>')) {
                return {
                    success: false,
                    source: 'pubmed',
                    confidence: 0,
                    warnings: [],
                    error: 'PMID not found in PubMed'
                };
            }

            const parsedData = await this.parsePubMedXML(xmlData);

            return {
                success: true,
                data: this.mapPubMedToReference(parsedData, pmid),
                source: 'pubmed',
                confidence: 0.85,
                warnings: []
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Fetch from arXiv by ID
     */
    private async fetchFromArXivById(arxivId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get('http://export.arxiv.org/api/query', {
                    params: {
                        id_list: arxivId,
                        max_results: 1
                    },
                    timeout: 10000
                })
            );

            const xmlData = response.data;

            if (!xmlData.includes('<entry>')) {
                return {
                    success: false,
                    source: 'arxiv',
                    confidence: 0,
                    warnings: [],
                    error: 'arXiv ID not found'
                };
            }

            const parsedData = await this.parseArXivXML(xmlData);

            return {
                success: true,
                data: this.mapArXivToReference(parsedData, arxivId),
                source: 'arxiv',
                confidence: 0.85,
                warnings: []
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Fetch from ADS by Bibcode
     */
    // private async fetchFromADSByBibcode(bibcode: string): Promise<any> {
    //     // Note: ADS API requires authentication
    //     // This is a placeholder implementation
    //     return {
    //         success: false,
    //         source: 'ads',
    //         confidence: 0,
    //         warnings: ['ADS integration requires API key'],
    //         error: 'ADS integration not implemented'
    //     };
    // }

    /**
     * Fetch from URL (attempt to extract metadata)
     */
    private async fetchFromURL(url: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Reference-Collector/1.0)'
                    }
                })
            );

            const html = response.data;
            const metadata = this.extractMetadataFromHTML(html, url);

            if (!metadata.title) {
                return {
                    success: false,
                    source: 'url',
                    confidence: 0,
                    warnings: [],
                    error: 'Could not extract metadata from URL'
                };
            }

            return {
                success: true,
                data: metadata,
                source: 'url',
                confidence: 0.6,
                warnings: ['URL metadata extraction is basic']
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Search CrossRef by title/author
     */
    private async searchCrossRef(searchData: {
        title: string;
        author?: string;
        year?: number;
        journal?: string;
    }): Promise<any> {
        try {
            let query = `title:"${searchData.title}"`;

            if (searchData.author) {
                query += ` author:"${searchData.author}"`;
            }

            if (searchData.year) {
                query += ` published:${searchData.year}`;
            }

            if (searchData.journal) {
                query += ` container-title:"${searchData.journal}"`;
            }

            const response = await firstValueFrom(
                this.httpService.get('https://api.crossref.org/works', {
                    params: {
                        query,
                        rows: 1,
                        sort: 'score',
                        order: 'desc'
                    },
                    headers: {
                        'User-Agent': 'Reference-Collector/1.0 (mailto:admin@example.com)'
                    },
                    timeout: 10000
                })
            );

            if (!response.data.message.items || response.data.message.items.length === 0) {
                return {
                    success: false,
                    confidence: 0,
                    warnings: ['No results found'],
                    error: 'No matching references found'
                };
            }

            const item = response.data.message.items[0];
            const confidence = this.calculateSearchConfidence(searchData, item);

            return {
                success: true,
                data: this.mapCrossRefToReference(item),
                confidence,
                warnings: confidence < 0.8 ? ['Low confidence match'] : []
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Parse PubMed XML response
     */
    private async parsePubMedXML(xmlData: string): Promise<any> {
        try {
            const parser = new xml2js.Parser({ explicitArray: false });
            const result = await parser.parseStringPromise(xmlData);

            return result.PubmedArticleSet?.PubmedArticle || result;
        } catch (error) {
            this.logger.error('Error parsing PubMed XML:', error);
            throw new Error('Failed to parse PubMed response');
        }
    }

    /**
     * Parse arXiv XML response
     */
    private async parseArXivXML(xmlData: string): Promise<any> {
        try {
            const parser = new xml2js.Parser({ explicitArray: false });
            const result = await parser.parseStringPromise(xmlData);

            return result.feed?.entry || result;
        } catch (error) {
            this.logger.error('Error parsing arXiv XML:', error);
            throw new Error('Failed to parse arXiv response');
        }
    }

    /**
     * Calculate search confidence based on match quality
     */
    private calculateSearchConfidence(searchData: any, crossrefItem: any): number {
        let confidence = 0.5; // Base confidence

        // Title similarity
        const titleSimilarity = this.calculateStringSimilarity(
            searchData.title,
            crossrefItem.title?.[0] || ''
        );
        confidence += titleSimilarity * 0.4;

        // Author match
        if (searchData.author && crossrefItem.author) {
            const authorMatch = crossrefItem.author.some(author =>
                this.calculateStringSimilarity(
                    searchData.author,
                    `${author.given || ''} ${author.family || ''}`.trim()
                ) > 0.7
            );
            if (authorMatch) confidence += 0.2;
        }

        // Year match
        if (searchData.year && crossrefItem.published) {
            const pubYear = crossrefItem.published['date-parts']?.[0]?.[0];
            if (pubYear === searchData.year) confidence += 0.1;
        }

        return Math.min(confidence, 1.0);
    }

    /**
     * Calculate string similarity (simple implementation)
     */
    private calculateStringSimilarity(str1: string, str2: string): number {
        if (!str1 || !str2) return 0;

        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();

        if (s1 === s2) return 1;

        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;

        if (longer.length === 0) return 1;

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Levenshtein distance calculation
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Map CrossRef data to reference format
     */
    private mapCrossRefToReference(item: any): any {
        return {
            type: this.mapCrossRefType(item.type),
            title: item.title?.[0],
            authors: item.author?.map(author => ({
                name: `${author.given || ''} ${author.family || ''}`.trim(),
                affiliation: author.affiliation?.[0]?.name
            })),
            editors: item.editor?.map(editor => ({
                name: `${editor.given || ''} ${editor.family || ''}`.trim(),
                affiliation: editor.affiliation?.[0]?.name
            })),
            publication: item['container-title']?.[0],
            publisher: item.publisher,
            year: item.published?.['date-parts']?.[0]?.[0],
            volume: item.volume,
            issue: item.issue,
            pages: item.page,
            doi: item.DOI,
            issn: item.ISSN?.[0],
            url: item.URL,
            abstractText: item.abstract,
            language: item.language,
            tags: item.subject || [],
            metadata: {
                crossrefType: item.type,
                citationCount: item['is-referenced-by-count'],
                license: item.license?.[0],
                funder: item.funder,
                references: item['references-count'],
                score: item.score
            }
        };
    }

    /**
     * Map CrossRef type to our reference type
     */
    private mapCrossRefType(crossrefType: string): string {
        const typeMapping = {
            'journal-article': 'journal',
            'book': 'book',
            'book-chapter': 'book-chapter',
            'proceedings-article': 'conference',
            'monograph': 'book',
            'report': 'report',
            'thesis': 'thesis',
            'dataset': 'dataset',
            'component': 'misc',
            'reference-entry': 'reference',
            'posted-content': 'preprint'
        };

        return typeMapping[crossrefType] || 'misc';
    }

    /**
     * Map Open Library data to reference format
     */
    private mapOpenLibraryToReference(book: any, isbn: string): any {
        return {
            type: 'book',
            title: book.title,
            authors: book.authors?.map(author => ({
                name: author.name
            })),
            // publishers: book.publishers?.map(pub => pub.name),
            publisher: book.publishers?.[0]?.name,
            year: book.publish_date ? this.extractYearFromDate(book.publish_date) : undefined,
            pages: book.number_of_pages ? book.number_of_pages.toString() : undefined,
            isbn: isbn,
            url: book.url,
            language: book.languages?.[0]?.name,
            tags: book.subjects?.map(s => s.name) || [],
            notes: book.notes,
            metadata: {
                openLibraryKey: book.key,
                covers: book.cover,
                subjects: book.subjects?.map(s => s.name),
                classifications: book.classifications,
                identifiers: book.identifiers,
                physicalFormat: book.physical_format,
                edition: book.edition_name
            }
        };
    }

    /**
     * Map PubMed data to reference format
     */
    private mapPubMedToReference(parsedData: any, pmid: string): any {
        const article = parsedData.MedlineCitation?.Article || parsedData.Article;
        const journal = article?.Journal;

        return {
            type: 'journal',
            title: article?.ArticleTitle,
            authors: this.extractPubMedAuthors(article?.AuthorList?.Author),
            publication: journal?.Title || journal?.ISOAbbreviation,
            publisher: journal?.Title,
            year: this.extractPubMedYear(article?.ArticleDate || journal?.JournalIssue?.PubDate),
            volume: journal?.JournalIssue?.Volume,
            issue: journal?.JournalIssue?.Issue,
            pages: article?.Pagination?.MedlinePgn,
            abstractText: article?.Abstract?.AbstractText,
            language: article?.Language,
            tags: this.extractPubMedKeywords(parsedData.MedlineCitation?.KeywordList),
            metadata: {
                pmid: pmid,
                meshTerms: this.extractMeshTerms(parsedData.MedlineCitation?.MeshHeadingList),
                publicationTypes: article?.PublicationTypeList?.PublicationType,
                medlineJournalInfo: parsedData.MedlineCitation?.MedlineJournalInfo,
                citationSubset: parsedData.MedlineCitation?.CitationSubset
            }
        };
    }

    /**
     * Map arXiv data to reference format
     */
    private mapArXivToReference(parsedData: any, arxivId: string): any {
        return {
            type: 'preprint',
            title: parsedData.title,
            authors: this.extractArXivAuthors(parsedData.author),
            year: parsedData.published ? new Date(parsedData.published).getFullYear() : undefined,
            url: `https://arxiv.org/abs/${arxivId}`,
            abstractText: parsedData.summary,
            tags: this.extractArXivCategories(parsedData.category),
            metadata: {
                arxivId: arxivId,
                categories: parsedData.category,
                updated: parsedData.updated,
                published: parsedData.published,
                doi: parsedData['arxiv:doi']?._,
                journalRef: parsedData['arxiv:journal_ref']?._,
                comment: parsedData['arxiv:comment']?._
            }
        };
    }

    /**
     * Extract metadata from HTML (basic implementation)
     */
    private extractMetadataFromHTML(html: string, url: string): any {
        const metadata: any = {
            type: 'webpage',
            url: url,
            metadata: {
                source: 'url_extraction'
            }
        };

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
            metadata.title = titleMatch[1].trim();
        }

        // Extract meta tags
        const metaTags = html.match(/<meta[^>]+>/gi) || [];

        metaTags.forEach(tag => {
            // OpenGraph tags
            const ogProperty = tag.match(/property=["']og:([^"']+)["'][^>]*content=["']([^"']+)["']/i);
            if (ogProperty) {
                const [, property, content] = ogProperty;
                switch (property) {
                    case 'title':
                        metadata.title = content;
                        break;
                    case 'description':
                        metadata.abstractText = content;
                        break;
                    case 'url':
                        metadata.url = content;
                        break;
                    case 'type':
                        metadata.type = content;
                        break;
                }
            }

            // Dublin Core tags
            const dcName = tag.match(/name=["']DC\.([^"']+)["'][^>]*content=["']([^"']+)["']/i);
            if (dcName) {
                const [, property, content] = dcName;
                switch (property.toLowerCase()) {
                    case 'title':
                        metadata.title = content;
                        break;
                    case 'creator':
                        metadata.authors = [{ name: content }];
                        break;
                    case 'date':
                        metadata.year = this.extractYearFromDate(content);
                        break;
                    case 'publisher':
                        metadata.publisher = content;
                        break;
                }
            }

            // Standard meta tags
            const metaName = tag.match(/name=["']([^"']+)["'][^>]*content=["']([^"']+)["']/i);
            if (metaName) {
                const [, name, content] = metaName;
                switch (name.toLowerCase()) {
                    case 'description':
                        if (!metadata.abstractText) metadata.abstractText = content;
                        break;
                    case 'author':
                        metadata.authors = [{ name: content }];
                        break;
                    case 'keywords':
                        metadata.tags = content.split(',').map(tag => tag.trim());
                        break;
                }
            }
        });

        return metadata;
    }

    /**
     * Helper function to extract PubMed authors
     */
    private extractPubMedAuthors(authorList: any): any[] {
        if (!authorList) return [];

        const authors = Array.isArray(authorList) ? authorList : [authorList];

        return authors.map(author => ({
            name: author.LastName && author.ForeName
                ? `${author.ForeName} ${author.LastName}`
                : author.CollectiveName || 'Unknown Author',
            affiliation: author.AffiliationInfo?.Affiliation
        }));
    }

    /**
     * Helper function to extract PubMed year
     */
    private extractPubMedYear(dateInfo: any): number | undefined {
        if (!dateInfo) return undefined;

        if (dateInfo.Year) {
            return parseInt(dateInfo.Year);
        }

        if (Array.isArray(dateInfo) && dateInfo[0]?.Year) {
            return parseInt(dateInfo[0].Year);
        }

        return undefined;
    }

    /**
     * Helper function to extract PubMed keywords
     */
    private extractPubMedKeywords(keywordList: any): string[] {
        if (!keywordList) return [];

        const keywords = Array.isArray(keywordList) ? keywordList : [keywordList];

        return keywords.flatMap(kwList =>
            Array.isArray(kwList.Keyword) ? kwList.Keyword : [kwList.Keyword]
        ).filter(Boolean);
    }

    /**
     * Helper function to extract MeSH terms
     */
    private extractMeshTerms(meshList: any): string[] {
        if (!meshList) return [];

        const meshTerms = Array.isArray(meshList.MeshHeading)
            ? meshList.MeshHeading
            : [meshList.MeshHeading];

        return meshTerms.map(mesh => mesh.DescriptorName?._).filter(Boolean);
    }

    /**
     * Helper function to extract arXiv authors
     */
    private extractArXivAuthors(authorList: any): any[] {
        if (!authorList) return [];

        const authors = Array.isArray(authorList) ? authorList : [authorList];

        return authors.map(author => ({
            name: author.name || author
        }));
    }

    /**
     * Helper function to extract arXiv categories
     */
    private extractArXivCategories(categoryList: any): string[] {
        if (!categoryList) return [];

        const categories = Array.isArray(categoryList) ? categoryList : [categoryList];

        return categories.map(cat => cat.term || cat).filter(Boolean);
    }

    /**
     * Helper function to extract year from various date formats
     */
    private extractYearFromDate(dateString: string): number | undefined {
        if (!dateString) return undefined;

        const yearMatch = dateString.match(/(\d{4})/);
        return yearMatch ? parseInt(yearMatch[1]) : undefined;
    }

    /**
     * Helper function to clean and normalize text
     */
    private cleanText(text: string): string {
        if (!text) return '';

        return text
            .replace(/\s+/g, ' ')
            .replace(/\n/g, ' ')
            .trim();
    }

    /**
     * Helper function to validate and clean URL
     */
    private validateAndCleanUrl(url: string): string | undefined {
        if (!url) return undefined;

        try {
            const cleanUrl = url.trim();
            new URL(cleanUrl);
            return cleanUrl;
        } catch {
            return undefined;
        }
    }

    /**
     * Helper function to format page ranges
     */
    private formatPageRange(pages: string): string | undefined {
        if (!pages) return undefined;

        // Handle various page formats: "123-456", "123--456", "123-6", etc.
        return pages
            .replace(/--/g, '-')
            .replace(/\s+/g, '')
            .trim();
    }

    /**
     * Helper function to extract and validate ISSN
     */
    private extractISSN(issnArray: any[]): string | undefined {
        if (!issnArray || !Array.isArray(issnArray)) return undefined;

        for (const issn of issnArray) {
            if (typeof issn === 'string' && /^\d{4}-\d{3}[\dX]$/.test(issn)) {
                return issn;
            }
        }

        return undefined;
    }
}