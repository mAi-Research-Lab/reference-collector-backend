/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { DOIService } from './external/doi.service';
import { SemanticScholarService } from './external/semantic-scholar.service';
import { OpenAlexService } from './external/openalex.service';
import { Reference, ValidationResult } from '../interfaces/reference.interface';

@Injectable()
export class CollectionValidationService {
    private readonly logger = new Logger(CollectionValidationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly doiService: DOIService,
        private readonly semanticScholarService: SemanticScholarService,
        private readonly openAlexService: OpenAlexService,
    ) {}

    async validateCollectionReferences(collectionId: string): Promise<{
        totalReferences: number;
        validReferences: number;
        needsReview: number;
        results: Array<{
            referenceId: string;
            title: string;
            isValid: boolean;
            confidence: number;
            needsReview: boolean;
            suggestions?: string[];
            foundSources: any[];
        }>;
    }> {
        this.logger.log(`Starting validation for collection ${collectionId}`);

        // Collection'dan tüm referansları al - References tablosundan collectionId ile
        const referencesData = await this.prisma.references.findMany({
            where: {
                collectionId: collectionId,
                isDeleted: false,
            },
            orderBy: {
                dateAdded: 'desc',
            },
        });

        if (referencesData.length === 0) {
            this.logger.warn(`No references found in collection ${collectionId}`);
            return {
                totalReferences: 0,
                validReferences: 0,
                needsReview: 0,
                results: [],
            };
        }

        this.logger.log(`Found ${referencesData.length} references in collection`);

        // Referansları Reference interface'ine dönüştür
        const references = referencesData.map((ref) => {
            const authors = this.extractAuthors(ref.authors);

            return {
                referenceId: ref.id,
                reference: {
                    authors,
                    title: ref.title || '',
                    journal: ref.publication || undefined,
                    year: ref.year || 0,
                    doi: ref.doi || undefined,
                    url: ref.url || undefined,
                    pages: ref.pages || undefined,
                    volume: ref.volume || undefined,
                    issue: ref.issue || undefined,
                    publisher: ref.publisher || undefined,
                    isbn: ref.isbn || undefined,
                } as Reference,
            };
        });

        // Her referansı doğrula
        const validationResults = await Promise.all(
            references.map(async ({ referenceId, reference }) => {
                const result = await this.validateSingleReference(reference);
                return {
                    referenceId,
                    title: reference.title,
                    isValid: result.isValid,
                    confidence: result.confidence,
                    needsReview: !result.isValid || result.confidence < 70,
                    suggestions: result.suggestions,
                    foundSources: result.foundSources,
                };
            }),
        );

        const validReferences = validationResults.filter((r) => r.isValid && r.confidence >= 70).length;
        const needsReview = validationResults.filter((r) => r.needsReview).length;

        this.logger.log(
            `Validation completed: ${validReferences} valid, ${needsReview} need review out of ${validationResults.length} total`,
        );

        return {
            totalReferences: validationResults.length,
            validReferences,
            needsReview,
            results: validationResults,
        };
    }

    private async validateSingleReference(reference: Reference): Promise<ValidationResult> {
        const validationDetails = {
            titleMatch: false,
            authorMatch: false,
            yearMatch: false,
            doiValid: false,
            urlAccessible: false,
        };

        let confidence = 0;
        const foundSources: any[] = [];

        // 1. DOI Validation (ilk öncelik)
        if (reference.doi && this.doiService.isValidDOIFormat(reference.doi)) {
            try {
                const doiResult = await this.doiService.validateDOI(reference.doi);
                if (doiResult.isValid) {
                    validationDetails.doiValid = true;
                    const doiBonus = this.calculateDOIBonus(doiResult);
                    confidence += doiBonus;

                    foundSources.push({
                        source: doiResult.metadata?.source || 'DOI Registry',
                        data: doiResult.metadata,
                        confidence: 95,
                    });

                    const matchingResults = this.performCrossReferenceMatching(reference, foundSources);
                    validationDetails.titleMatch = matchingResults.titleMatch;
                    validationDetails.authorMatch = matchingResults.authorMatch;
                    validationDetails.yearMatch = matchingResults.yearMatch;

                    if (confidence >= 70) {
                        return {
                            reference,
                            isValid: true,
                            confidence,
                            foundSources,
                            validationDetails,
                            suggestions: ['✅ DOI başarıyla doğrulandı'],
                        };
                    }
                }
            } catch (error) {
                this.logger.debug('DOI validation failed, trying OpenAlex');
            }
        }

        // 2. OpenAlex Validation (Rate limit yok, öncelikli)
        try {
            const openAlexResult = await this.openAlexService.validateReference(reference);

            if (openAlexResult.isValid && openAlexResult.confidence >= 50) {
                confidence += openAlexResult.confidence * 0.85;
                foundSources.push({
                    source: 'OpenAlex',
                    data: openAlexResult.data,
                    confidence: openAlexResult.confidence,
                });

                validationDetails.titleMatch = openAlexResult.data?.title ? true : false;
                validationDetails.authorMatch = openAlexResult.data?.authorships?.length > 0;
                validationDetails.yearMatch = openAlexResult.data?.publication_year ? true : false;

                if (confidence >= 70) {
                    return {
                        reference,
                        isValid: true,
                        confidence,
                        foundSources,
                        validationDetails,
                        suggestions: [
                            `🌐 OpenAlex: ${this.getConfidenceLevel(openAlexResult.confidence)}`,
                            openAlexResult.data?.cited_by_count ? `📊 ${openAlexResult.data.cited_by_count} alıntı` : '',
                            openAlexResult.data?.open_access?.is_oa ? '🔓 Açık Erişim' : '',
                        ].filter((s) => s),
                    };
                }
            }
        } catch (error) {
            this.logger.debug('OpenAlex validation failed, trying Semantic Scholar');
        }

        // 3. Semantic Scholar Validation (Backup)
        try {
            const semanticResult = await this.semanticScholarService.validateReference(reference);

            if (semanticResult.isValid && semanticResult.confidence >= 50) {
                confidence += semanticResult.confidence * 0.85;
                foundSources.push({
                    source: 'Semantic Scholar',
                    data: semanticResult.data,
                    confidence: semanticResult.confidence,
                });

                validationDetails.titleMatch = semanticResult.data?.title ? true : false;
                validationDetails.authorMatch = semanticResult.data?.authors?.length > 0;
                validationDetails.yearMatch = semanticResult.data?.year ? true : false;

                if (confidence >= 70) {
                    return {
                        reference,
                        isValid: true,
                        confidence,
                        foundSources,
                        validationDetails,
                        suggestions: [
                            `🔬 Semantic Scholar: ${this.getConfidenceLevel(semanticResult.confidence)}`,
                            semanticResult.data?.citationCount ? `📊 ${semanticResult.data.citationCount} alıntı` : '',
                        ].filter((s) => s),
                    };
                }
            }
        } catch (error) {
            this.logger.debug('Semantic Scholar validation failed');
        }

        // Hiçbir servis başarılı olmadı
        const isValid = confidence >= 70;

        return {
            reference,
            isValid,
            confidence,
            foundSources,
            validationDetails,
            suggestions:
                foundSources.length > 0
                    ? ['⚠️ Kısmi doğrulama yapıldı', '🔍 Kontrol ediniz']
                    : ['❌ Veritabanlarında bulunamadı', '🔍 Kontrol ediniz'],
        };
    }

    private extractAuthors(authorsJson: any): string[] {
        if (!authorsJson) return [];

        try {
            if (Array.isArray(authorsJson)) {
                return authorsJson.map((author) => {
                    if (typeof author === 'string') {
                        return author;
                    }
                    if (author && typeof author === 'object' && author.name) {
                        return author.name;
                    }
                    return '';
                }).filter((name) => name.length > 0);
            }

            if (typeof authorsJson === 'string') {
                try {
                    const parsed = JSON.parse(authorsJson);
                    if (Array.isArray(parsed)) {
                        return parsed.map((author) => (typeof author === 'string' ? author : author?.name || '')).filter((name) => name.length > 0);
                    }
                } catch {
                    // If parsing fails, treat as single author string
                    return [authorsJson];
                }
            }

            return [];
        } catch (error) {
            this.logger.warn('Error extracting authors:', error);
            return [];
        }
    }

    private performCrossReferenceMatching(reference: Reference, foundSources: any[]): {
        titleMatch: boolean;
        authorMatch: boolean;
        yearMatch: boolean;
    } {
        let titleMatch = false;
        let authorMatch = false;
        let yearMatch = false;

        for (const source of foundSources) {
            if (source.data) {
                if (reference.title && source.data.title) {
                    const similarity = this.calculateStringSimilarity(
                        reference.title,
                        Array.isArray(source.data.title) ? source.data.title[0] : source.data.title,
                    );
                    if (similarity > 70) titleMatch = true;
                }

                if (reference.authors && source.data.author) {
                    const authorSim = this.calculateAuthorSimilarity(reference.authors, source.data.author);
                    if (authorSim > 70) authorMatch = true;
                }

                if (reference.year && source.data.published) {
                    const year = typeof source.data.published === 'number' ? source.data.published : parseInt(source.data.published);
                    if (!isNaN(year)) {
                        const yearDiff = Math.abs(reference.year - year);
                        if (yearDiff <= 1) yearMatch = true;
                    }
                }
            }
        }

        return { titleMatch, authorMatch, yearMatch };
    }

    private calculateStringSimilarity(str1: string, str2: string): number {
        if (!str1 || !str2) return 0;

        const cleanStr1 = typeof str1 === 'string' ? str1 : String(str1);
        const cleanStr2 = Array.isArray(str2) ? str2[0] : String(str2);

        if (!cleanStr1 || !cleanStr2) return 0;

        const s1 = cleanStr1.toLowerCase().trim();
        const s2 = cleanStr2.toLowerCase().trim();

        if (s1 === s2) return 100;
        if (s1.includes(s2) || s2.includes(s1)) return 85;

        const words1 = s1.split(/\s+/);
        const words2 = s2.split(/\s+/);

        const commonWords = words1.filter((w) => words2.includes(w)).length;
        const totalWords = Math.max(words1.length, words2.length);

        return Math.round((commonWords / totalWords) * 100);
    }

    private calculateAuthorSimilarity(refAuthors: string[], sourceAuthors: any[]): number {
        if (!refAuthors || !sourceAuthors) return 0;

        let bestMatch = 0;

        for (const refAuthor of refAuthors) {
            for (const sourceAuthor of sourceAuthors) {
                const authorName =
                    typeof sourceAuthor === 'string'
                        ? sourceAuthor
                        : `${sourceAuthor.given || ''} ${sourceAuthor.family || ''}`.trim();

                const similarity = this.calculateStringSimilarity(refAuthor, authorName);
                bestMatch = Math.max(bestMatch, similarity);
            }
        }

        return bestMatch;
    }

    private calculateDOIBonus(doiResult: any): number {
        let bonus = 70;

        if (doiResult.metadata) {
            if (doiResult.metadata.title && doiResult.metadata.author) {
                bonus = 80;
            }

            if (doiResult.metadata.source === 'Crossref') {
                bonus += 5;
            }
        }

        return bonus;
    }

    private getConfidenceLevel(confidence: number): string {
        if (confidence >= 85) return '🌟 Çok yüksek güvenilirlik';
        if (confidence >= 70) return '✅ Yüksek güvenilirlik';
        if (confidence >= 55) return '👍 Orta güvenilirlik';
        if (confidence >= 35) return '⚠️ Düşük güvenilirlik';
        return '❌ Çok düşük güvenilirlik';
    }
}

