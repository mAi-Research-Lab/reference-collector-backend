import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Reference } from '../../interfaces/reference.interface';

export interface SemanticScholarResult {
    isValid: boolean;
    confidence: number;
    data?: any;
    error?: string;
}

@Injectable()
export class SemanticScholarService {
    private readonly logger = new Logger(SemanticScholarService.name);
    private readonly baseUrl = 'https://api.semanticscholar.org/graph/v1';
    private readonly apiKey: string;
    private lastRequestTimestamp = 0;
    private rateLimitChain: Promise<void> = Promise.resolve();
    private readonly minRequestIntervalMs = 6000;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {
        this.apiKey = this.configService.get<string>('SEMANTIC_SCHOLAR_API_KEY') || '';
        if (!this.apiKey) {
            this.logger.warn('SEMANTIC_SCHOLAR_API_KEY not found in environment variables');
        }
    }

    async validateReference(reference: Reference, retryCount: number = 0): Promise<SemanticScholarResult> {
        if (!this.apiKey) {
            this.logger.warn('Semantic Scholar API key not configured');
            return {
                isValid: false,
                confidence: 0,
                error: 'API key not configured',
            };
        }

        try {
            const query = this.buildQuery(reference);

            if (!query) {
                this.logger.warn('Cannot build query: insufficient reference information');
                return {
                    isValid: false,
                    confidence: 0,
                    error: 'Insufficient reference information',
                };
            }

            if (query.length < 10) {
                this.logger.warn(`Query too short: "${query}"`);
                return {
                    isValid: false,
                    confidence: 0,
                    error: 'Query too short (minimum 10 characters)',
                };
            }

            this.logger.log(`Searching Semantic Scholar for: ${query.substring(0, 50)}...`);

            const endpoint = `${this.baseUrl}/paper/search/bulk`;
            const params = {
                query,
                limit: 5,
                fields:
                    'paperId,corpusId,externalIds,title,abstract,venue,year,referenceCount,citationCount,influentialCitationCount,isOpenAccess,openAccessPdf,fieldsOfStudy,publicationTypes,publicationDate,journal,authors',
            };

            await this.waitForRateLimitWindow();

            const response = await firstValueFrom(
                this.httpService.get(endpoint, {
                    params,
                    headers: {
                        'x-api-key': this.apiKey,
                    },
                    timeout: 10000,
                }),
            );

            if (!response.data) {
                this.logger.warn('[Response] Empty response from Semantic Scholar');
                return {
                    isValid: false,
                    confidence: 0,
                    error: 'Empty response from API',
                };
            }

            const { data, total } = response.data;

            if (!data || !Array.isArray(data) || data.length === 0) {
                this.logger.log(`No results found in Semantic Scholar (total: ${total || 0})`);
                return {
                    isValid: false,
                    confidence: 0,
                    error: 'No match found',
                };
            }

            this.logger.log(`Found ${data.length} results from Semantic Scholar (total available: ${total || 'unknown'})`);

            const bestMatch = this.findBestMatch(reference, data);

            if (bestMatch) {
                const confidence = this.calculateConfidence(reference, bestMatch);

                this.logger.log(`Best match found with confidence: ${confidence}% (paperId: ${bestMatch.paperId})`);

                return {
                    isValid: confidence >= 50,
                    confidence,
                    data: bestMatch,
                };
            }

            return {
                isValid: false,
                confidence: 0,
                error: 'No suitable match found',
            };
        } catch (error) {
            if (error.response?.status === 429 && retryCount < 2) {
                const waitTime = (retryCount + 1) * 2000;
                this.logger.warn(`[Rate Limit] Waiting ${waitTime}ms before retry ${retryCount + 1}/2`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                return this.validateReference(reference, retryCount + 1);
            }

            this.logger.error('Semantic Scholar validation error:', error.message);

            return {
                isValid: false,
                confidence: 0,
                error: error.response?.status === 429 ? 'Rate limit exceeded' : error.message,
            };
        }
    }

    private buildQuery(reference: Reference): string {
        if (!reference.title) {
            return '';
        }

        let cleanTitle = reference.title.trim();

        const quotedMatch = cleanTitle.match(/[""]([^"""]+)[""]|"([^"]+)"/);
        if (quotedMatch) {
            cleanTitle = quotedMatch[1] || quotedMatch[2];
            this.logger.debug(`Extracted quoted title: "${cleanTitle}"`);
        }

        cleanTitle = cleanTitle
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/Erişim Tarihi[:\s].*/gi, '')
            .replace(/\d{1,2}[./]\d{1,2}[./]\d{2,4}/g, '')
            .replace(/https?:\/\/[^\s]+/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (cleanTitle.length < 10) {
            this.logger.debug(`Query too short after cleaning: "${cleanTitle}"`);
            return '';
        }

        if (cleanTitle.length > 150) {
            cleanTitle = cleanTitle.substring(0, 150).trim();
            this.logger.debug(`Query truncated to 150 chars: "${cleanTitle}"`);
        }

        const sanitized = cleanTitle
            .replace(/[\p{C}]/gu, '')
            .replace(/[^\w\s\-.,;:!?()'"\u00C0-\u024F\u1E00-\u1EFF\u0100-\u017F\u0180-\u024F]/g, '')
            .trim();

        if (sanitized.length < 10) {
            this.logger.debug(`Query too short after sanitization: "${sanitized}"`);
            return '';
        }

        this.logger.debug(`Final query: "${sanitized}"`);
        return sanitized;
    }

    private findBestMatch(reference: Reference, papers: any[]): any {
        let bestMatch = null;
        let highestScore = 0;

        for (const paper of papers) {
            const score = this.calculateMatchScore(reference, paper);
            if (score > highestScore) {
                highestScore = score;
                bestMatch = paper;
            }
        }

        return highestScore >= 40 ? bestMatch : null;
    }

    private calculateMatchScore(reference: Reference, paper: any): number {
        let score = 0;

        if (reference.title && paper.title) {
            const titleSimilarity = this.calculateStringSimilarity(reference.title, paper.title);
            score += titleSimilarity * 0.6;
        }

        if (reference.authors && paper.authors && paper.authors.length > 0) {
            const authorMatch = this.matchAuthors(reference.authors, paper.authors);
            if (authorMatch) {
                score += 25;
            }
        }

        if (reference.year && paper.year) {
            const yearDiff = Math.abs(reference.year - paper.year);
            if (yearDiff === 0) {
                score += 15;
            } else if (yearDiff === 1) {
                score += 10;
            }
        }

        return Math.round(score);
    }

    private calculateConfidence(reference: Reference, paper: any): number {
        let confidence = 50;

        if (reference.title && paper.title) {
            const titleSimilarity = this.calculateStringSimilarity(reference.title, paper.title);
            confidence += titleSimilarity * 0.4;
        }

        if (reference.authors && paper.authors && paper.authors.length > 0) {
            const authorMatch = this.matchAuthors(reference.authors, paper.authors);
            if (authorMatch) {
                confidence += 20;
            }
        }

        if (reference.year && paper.year) {
            const yearDiff = Math.abs(reference.year - paper.year);
            if (yearDiff === 0) {
                confidence += 15;
            } else if (yearDiff === 1) {
                confidence += 10;
            } else if (yearDiff === 2) {
                confidence += 5;
            }
        }

        if (paper.citationCount) {
            if (paper.citationCount > 100) {
                confidence += 5;
            } else if (paper.citationCount > 10) {
                confidence += 3;
            }
        }

        if (paper.influentialCitationCount && paper.influentialCitationCount > 5) {
            confidence += 2;
        }

        if (paper.isOpenAccess) {
            confidence += 2;
        }

        if (paper.externalIds) {
            if (paper.externalIds.DOI) confidence += 3;
            if (paper.externalIds.ArXiv) confidence += 1;
        }

        return Math.min(Math.round(confidence), 100);
    }

    private calculateStringSimilarity(str1: string, str2: string): number {
        if (!str1 || !str2) return 0;

        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();

        if (s1 === s2) return 100;
        if (s1.includes(s2) || s2.includes(s1)) return 85;

        const words1 = s1.split(/\s+/);
        const words2 = s2.split(/\s+/);

        const commonWords = words1.filter((w) => words2.includes(w)).length;
        const totalWords = Math.max(words1.length, words2.length);

        return Math.round((commonWords / totalWords) * 100);
    }

    private matchAuthors(refAuthors: string[], paperAuthors: any[]): boolean {
        if (!refAuthors || !paperAuthors || refAuthors.length === 0 || paperAuthors.length === 0) {
            return false;
        }

        for (const refAuthor of refAuthors) {
            if (!refAuthor || refAuthor.trim().length < 2) continue;

            for (const paperAuthor of paperAuthors) {
                const authorName = paperAuthor?.name || '';
                if (!authorName) continue;

                const similarity = this.calculateStringSimilarity(refAuthor, authorName);
                if (similarity >= 70) {
                    return true;
                }
            }
        }
        return false;
    }

    private async waitForRateLimitWindow(): Promise<void> {
        this.rateLimitChain = this.rateLimitChain
            .then(async () => {
                const now = Date.now();
                const elapsed = now - this.lastRequestTimestamp;
                const waitTime = Math.max(0, this.minRequestIntervalMs - elapsed);

                if (waitTime > 0) {
                    this.logger.warn(`[Semantic Scholar Rate Limit] Pausing ${waitTime}ms before next request`);
                    await new Promise((resolve) => setTimeout(resolve, waitTime));
                }

                this.lastRequestTimestamp = Date.now();
            })
            .catch((error) => {
                this.logger.error('[Semantic Scholar Rate Limit] Queue error:', error);
            });

        await this.rateLimitChain;
    }
}

