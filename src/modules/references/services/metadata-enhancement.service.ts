import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/database/prisma/prisma.service';

export interface MetadataSource {
    name: string;
    priority: number;
    isAvailable: boolean;
}

export interface EnhancementResult {
    success: boolean;
    source: string;
    fieldsEnhanced: string[];
    originalData: any;
    enhancedData: any;
    confidence: number;
    warnings: string[];
}

export interface MetadataEnhancementOptions {
    sources?: string[]; // ['crossref', 'pubmed', 'arxiv', 'openlibrary']
    fields?: string[]; // specific fields to enhance
    overwriteExisting?: boolean;
    confidenceThreshold?: number; // 0-1
}

@Injectable()
export class MetadataEnhancementService {
    private readonly logger = new Logger(MetadataEnhancementService.name);
    
    private readonly sources: MetadataSource[] = [
        { name: 'crossref', priority: 1, isAvailable: true },
        { name: 'pubmed', priority: 2, isAvailable: true },
        { name: 'arxiv', priority: 3, isAvailable: true },
        { name: 'openlibrary', priority: 4, isAvailable: true }
    ];

    constructor(
        private readonly httpService: HttpService,
        private readonly prisma: PrismaService
    ) {}

    /**
     * Enhance reference metadata using multiple sources
     */
    async enhanceReference(
        referenceId: string, 
        options: MetadataEnhancementOptions = {}
    ): Promise<EnhancementResult> {
        const reference = await this.prisma.references.findUnique({
            where: { id: referenceId }
        });

        if (!reference) {
            throw new Error('Reference not found');
        }

        return this.enhanceReferenceData(reference, options);
    }

    /**
     * Enhance reference data object
     */
    async enhanceReferenceData(
        referenceData: any,
        options: MetadataEnhancementOptions = {}
    ): Promise<EnhancementResult> {
        const {
            sources = ['crossref', 'pubmed', 'arxiv'],
            fields = ['title', 'authors', 'abstractText', 'year', 'publication', 'doi', 'isbn'],
            overwriteExisting = false,
            confidenceThreshold = 0.7
        } = options;

        let bestResult: EnhancementResult = {
            success: false,
            source: 'none',
            fieldsEnhanced: [],
            originalData: referenceData,
            enhancedData: { ...referenceData },
            confidence: 0,
            warnings: []
        };

        // Try each source in priority order
        for (const sourceName of sources) {
            try {
                let result: EnhancementResult;

                switch (sourceName) {
                    case 'crossref':
                        result = await this.enhanceFromCrossRef(referenceData, fields, overwriteExisting);
                        break;
                    case 'pubmed':
                        result = await this.enhanceFromPubMed(referenceData, fields, overwriteExisting);
                        break;
                    case 'arxiv':
                        result = await this.enhanceFromArXiv(referenceData, fields, overwriteExisting);
                        break;
                    case 'openlibrary':
                        result = await this.enhanceFromOpenLibrary(referenceData, fields, overwriteExisting);
                        break;
                    default:
                        continue;
                }

                if (result.success && result.confidence > bestResult.confidence) {
                    bestResult = result;
                    
                    // If confidence is high enough, use this result
                    if (result.confidence >= confidenceThreshold) {
                        break;
                    }
                }
            } catch (error) {
                this.logger.warn(`Failed to enhance from ${sourceName}: ${error.message}`);
                bestResult.warnings.push(`${sourceName}: ${error.message}`);
            }
        }

        return bestResult;
    }

    /**
     * Enhance from CrossRef API
     */
    private async enhanceFromCrossRef(
        referenceData: any,
        fields: string[],
        overwriteExisting: boolean
    ): Promise<EnhancementResult> {
        let query = '';
        let confidence = 0;

        // Build query based on available data
        if (referenceData.doi) {
            query = referenceData.doi;
            confidence = 0.95;
        } else if (referenceData.title) {
            query = `title:"${referenceData.title}"`;
            confidence = 0.7;
            
            if (referenceData.authors && referenceData.authors.length > 0) {
                const firstAuthor = Array.isArray(referenceData.authors) 
                    ? referenceData.authors[0]?.name || referenceData.authors[0]
                    : referenceData.authors;
                query += ` author:"${firstAuthor}"`;
                confidence = 0.8;
            }
        } else {
            throw new Error('Insufficient data for CrossRef query');
        }

        const response = await firstValueFrom(
            this.httpService.get('https://api.crossref.org/works', {
                params: { query, rows: 1 },
                headers: {
                    'User-Agent': 'Reference-Collector/1.0 (mailto:admin@example.com)'
                },
                timeout: 10000
            })
        );

        if (!response.data.message.items || response.data.message.items.length === 0) {
            throw new Error('No results found in CrossRef');
        }

        const item = response.data.message.items[0];
        const enhancedData = { ...referenceData };
        const fieldsEnhanced: string[] = [];

        // Map CrossRef data to our schema
        if (fields.includes('title') && (overwriteExisting || !referenceData.title)) {
            enhancedData.title = item.title?.[0];
            if (enhancedData.title) fieldsEnhanced.push('title');
        }

        if (fields.includes('authors') && (overwriteExisting || !referenceData.authors)) {
            enhancedData.authors = item.author?.map(author => ({
                name: `${author.given || ''} ${author.family || ''}`.trim(),
                affiliation: author.affiliation?.[0]?.name
            }));
            if (enhancedData.authors) fieldsEnhanced.push('authors');
        }

        if (fields.includes('year') && (overwriteExisting || !referenceData.year)) {
            enhancedData.year = item.published?.['date-parts']?.[0]?.[0];
            if (enhancedData.year) fieldsEnhanced.push('year');
        }

        if (fields.includes('publication') && (overwriteExisting || !referenceData.publication)) {
            enhancedData.publication = item['container-title']?.[0];
            if (enhancedData.publication) fieldsEnhanced.push('publication');
        }

        if (fields.includes('doi') && (overwriteExisting || !referenceData.doi)) {
            enhancedData.doi = item.DOI;
            if (enhancedData.doi) fieldsEnhanced.push('doi');
        }

        if (fields.includes('abstractText') && (overwriteExisting || !referenceData.abstractText)) {
            enhancedData.abstractText = item.abstract;
            if (enhancedData.abstractText) fieldsEnhanced.push('abstractText');
        }

        return {
            success: fieldsEnhanced.length > 0,
            source: 'crossref',
            fieldsEnhanced,
            originalData: referenceData,
            enhancedData,
            confidence,
            warnings: []
        };
    }

    /**
     * Enhance from PubMed API
     */
    private async enhanceFromPubMed(
        referenceData: any,
        fields: string[],
        overwriteExisting: boolean
    ): Promise<EnhancementResult> {
        // Build PubMed query
        let query = '';
        let confidence = 0.6;

        if (referenceData.title) {
            query = `"${referenceData.title}"[Title]`;
            confidence = 0.7;
        } else {
            throw new Error('Title required for PubMed search');
        }

        // Search PubMed
        const searchResponse = await firstValueFrom(
            this.httpService.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi', {
                params: {
                    db: 'pubmed',
                    term: query,
                    retmode: 'json',
                    retmax: 1
                },
                timeout: 10000
            })
        );

        const pmids = searchResponse.data.esearchresult.idlist;
        if (!pmids || pmids.length === 0) {
            throw new Error('No results found in PubMed');
        }

        // Fetch details
        const detailResponse = await firstValueFrom(
            this.httpService.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi', {
                params: {
                    db: 'pubmed',
                    id: pmids[0],
                    retmode: 'xml'
                },
                timeout: 10000
            })
        );

        // Parse XML and extract metadata (simplified)
        const enhancedData = { ...referenceData };
        const fieldsEnhanced: string[] = [];

        // Note: In a real implementation, you would parse the XML response
        // For now, we'll return a placeholder result
        
        return {
            success: false,
            source: 'pubmed',
            fieldsEnhanced,
            originalData: referenceData,
            enhancedData,
            confidence: 0,
            warnings: ['PubMed integration not fully implemented']
        };
    }

    /**
     * Enhance from arXiv API
     */
    private async enhanceFromArXiv(
        referenceData: any,
        fields: string[],
        overwriteExisting: boolean
    ): Promise<EnhancementResult> {
        let query = '';
        let confidence = 0.6;

        if (referenceData.title) {
            query = `ti:"${referenceData.title}"`;
            confidence = 0.7;
        } else {
            throw new Error('Title required for arXiv search');
        }

        const response = await firstValueFrom(
            this.httpService.get('http://export.arxiv.org/api/query', {
                params: {
                    search_query: query,
                    max_results: 1
                },
                timeout: 10000
            })
        );

        // Parse Atom XML response (simplified)
        const enhancedData = { ...referenceData };
        const fieldsEnhanced: string[] = [];

        // Note: In a real implementation, you would parse the Atom XML response
        
        return {
            success: false,
            source: 'arxiv',
            fieldsEnhanced,
            originalData: referenceData,
            enhancedData,
            confidence: 0,
            warnings: ['arXiv integration not fully implemented']
        };
    }

    /**
     * Enhance from Open Library API
     */
    private async enhanceFromOpenLibrary(
        referenceData: any,
        fields: string[],
        overwriteExisting: boolean
    ): Promise<EnhancementResult> {
        let query = '';
        let confidence = 0.5;

        if (referenceData.isbn) {
            query = `isbn:${referenceData.isbn}`;
            confidence = 0.9;
        } else if (referenceData.title) {
            query = `title:"${referenceData.title}"`;
            confidence = 0.6;
        } else {
            throw new Error('ISBN or title required for Open Library search');
        }

        const response = await firstValueFrom(
            this.httpService.get('https://openlibrary.org/search.json', {
                params: { q: query, limit: 1 },
                timeout: 10000
            })
        );

        if (!response.data.docs || response.data.docs.length === 0) {
            throw new Error('No results found in Open Library');
        }

        const doc = response.data.docs[0];
        const enhancedData = { ...referenceData };
        const fieldsEnhanced: string[] = [];

        // Map Open Library data
        if (fields.includes('title') && (overwriteExisting || !referenceData.title)) {
            enhancedData.title = doc.title;
            if (enhancedData.title) fieldsEnhanced.push('title');
        }

        if (fields.includes('authors') && (overwriteExisting || !referenceData.authors)) {
            enhancedData.authors = doc.author_name?.map(name => ({ name }));
            if (enhancedData.authors) fieldsEnhanced.push('authors');
        }

        if (fields.includes('year') && (overwriteExisting || !referenceData.year)) {
            enhancedData.year = doc.first_publish_year;
            if (enhancedData.year) fieldsEnhanced.push('year');
        }

        if (fields.includes('isbn') && (overwriteExisting || !referenceData.isbn)) {
            enhancedData.isbn = doc.isbn?.[0];
            if (enhancedData.isbn) fieldsEnhanced.push('isbn');
        }

        return {
            success: fieldsEnhanced.length > 0,
            source: 'openlibrary',
            fieldsEnhanced,
            originalData: referenceData,
            enhancedData,
            confidence,
            warnings: []
        };
    }

    /**
     * Batch enhance multiple references
     */
    async batchEnhance(
        referenceIds: string[],
        options: MetadataEnhancementOptions = {}
    ): Promise<EnhancementResult[]> {
        const results: EnhancementResult[] = [];

        for (const referenceId of referenceIds) {
            try {
                const result = await this.enhanceReference(referenceId, options);
                results.push(result);

                // Update reference if enhancement was successful
                if (result.success && result.fieldsEnhanced.length > 0) {
                    await this.prisma.references.update({
                        where: { id: referenceId },
                        data: {
                            ...result.enhancedData,
                            dateModified: new Date()
                        }
                    });
                }
            } catch (error) {
                results.push({
                    success: false,
                    source: 'error',
                    fieldsEnhanced: [],
                    originalData: null,
                    enhancedData: null,
                    confidence: 0,
                    warnings: [error.message]
                });
            }
        }

        return results;
    }

    /**
     * Auto-enhance missing fields for a reference
     */
    async autoEnhanceMissingFields(referenceId: string): Promise<EnhancementResult> {
        const reference = await this.prisma.references.findUnique({
            where: { id: referenceId }
        });

        if (!reference) {
            throw new Error('Reference not found');
        }

        // Identify missing fields
        const missingFields: string[] = [];
        if (!reference.abstractText) missingFields.push('abstractText');
        if (!reference.doi) missingFields.push('doi');
        if (!reference.year) missingFields.push('year');
        if (!reference.publication) missingFields.push('publication');
        if (!reference.authors || (Array.isArray(reference.authors) && reference.authors.length === 0)) {
            missingFields.push('authors');
        }

        if (missingFields.length === 0) {
            return {
                success: true,
                source: 'none',
                fieldsEnhanced: [],
                originalData: reference,
                enhancedData: reference,
                confidence: 1,
                warnings: ['No missing fields to enhance']
            };
        }

        return this.enhanceReferenceData(reference, {
            fields: missingFields,
            overwriteExisting: false,
            confidenceThreshold: 0.6
        });
    }

    /**
     * Get available metadata sources
     */
    getAvailableSources(): MetadataSource[] {
        return this.sources.filter(source => source.isAvailable);
    }

    /**
     * Test source availability
     */
    async testSourceAvailability(sourceName: string): Promise<boolean> {
        try {
            switch (sourceName) {
                case 'crossref':
                    await firstValueFrom(
                        this.httpService.get('https://api.crossref.org/works?rows=1', { timeout: 5000 })
                    );
                    return true;
                case 'pubmed':
                    await firstValueFrom(
                        this.httpService.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/einfo.fcgi', { timeout: 5000 })
                    );
                    return true;
                default:
                    return false;
            }
        } catch (error) {
            return false;
        }
    }
}
