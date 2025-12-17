import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Reference } from '../../interfaces/reference.interface';

export interface OpenAlexResult {
    isValid: boolean;
    confidence: number;
    data?: any;
    error?: string;
}

@Injectable()
export class OpenAlexService {
    private readonly logger = new Logger(OpenAlexService.name);
    private readonly baseUrl = 'https://api.openalex.org';
    private lastRequestTimestamp = 0;
    private rateLimitChain: Promise<void> = Promise.resolve();
    private readonly minRequestIntervalMs = 6000;

    constructor(private readonly httpService: HttpService) {}

    async validateReference(reference: Reference): Promise<OpenAlexResult> {
        try {
            const query = this.buildQuery(reference);

            if (!query) {
                return {
                    isValid: false,
                    confidence: 0,
                    error: 'Insufficient reference information',
                };
            }

            this.logger.log(`Searching OpenAlex for: ${query.substring(0, 50)}...`);

            const endpoint = `${this.baseUrl}/works`;
            const params = {
                search: query,
                per_page: 5,
            };

            await this.waitForRateLimitWindow();

            const response = await firstValueFrom(
                this.httpService.get(endpoint, {
                    params,
                    headers: {
                        'User-Agent': 'CITEXT/1.0 (mailto:destek@citext.ai)',
                    },
                    timeout: 10000,
                }),
            );

            if (response.data && response.data.results && response.data.results.length > 0) {
                this.logger.debug(`[OpenAlex Response] Found ${response.data.results.length} results`);

                const bestMatch = this.findBestMatch(reference, response.data.results);

                if (bestMatch) {
                    const confidence = this.calculateConfidence(reference, bestMatch);

                    this.logger.log(`Found match in OpenAlex with confidence: ${confidence}% (id: ${bestMatch.id})`);

                    return {
                        isValid: confidence >= 50,
                        confidence,
                        data: bestMatch,
                    };
                } else {
                    this.logger.debug(`[OpenAlex Response] No suitable match found`);
                }
            } else {
                this.logger.log(`No results found in OpenAlex`);
            }

            return {
                isValid: false,
                confidence: 0,
                error: 'No match found',
            };
        } catch (error) {
            this.logger.error('OpenAlex validation error:', error.message);

            return {
                isValid: false,
                confidence: 0,
                error: error.message,
            };
        }
    }

    private buildQuery(reference: Reference): string {
        if (!reference.title || reference.title.length < 10) {
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

        if (cleanTitle.length > 150) {
            cleanTitle = cleanTitle.substring(0, 150).trim();
            this.logger.debug(`Query truncated to 150 chars: "${cleanTitle}"`);
        }

        if (cleanTitle.length < 10) {
            this.logger.debug(`Query too short after cleaning: "${cleanTitle}"`);
            return '';
        }

        this.logger.debug(`Final query: "${cleanTitle}"`);
        return cleanTitle;
    }

    private findBestMatch(reference: Reference, results: any[]): any {
        let bestMatch = null;
        let highestScore = 0;

        for (const result of results) {
            const score = this.calculateMatchScore(reference, result);
            if (score > highestScore) {
                highestScore = score;
                bestMatch = result;
            }
        }

        return highestScore >= 50 ? bestMatch : null;
    }

    private calculateMatchScore(reference: Reference, work: any): number {
        let score = 0;

        if (reference.title && work.title) {
            const titleSimilarity = this.calculateStringSimilarity(reference.title, work.title);
            score += titleSimilarity * 0.6;
        }

        if (reference.authors && work.authorships && work.authorships.length > 0) {
            const authorMatch = this.matchAuthors(reference.authors, work.authorships);
            if (authorMatch) {
                score += 25;
            }
        }

        if (reference.year && work.publication_year) {
            const yearDiff = Math.abs(reference.year - work.publication_year);
            if (yearDiff === 0) {
                score += 15;
            } else if (yearDiff === 1) {
                score += 10;
            }
        }

        return Math.round(score);
    }

    private calculateConfidence(reference: Reference, work: any): number {
        let confidence = 40;

        if (reference.title && work.title) {
            const titleSimilarity = this.calculateStringSimilarity(reference.title, work.title);
            confidence += titleSimilarity * 0.4;
        }

        if (reference.authors && work.authorships && work.authorships.length > 0) {
            const authorMatch = this.matchAuthors(reference.authors, work.authorships);
            if (authorMatch) {
                confidence += 20;
            }
        }

        if (reference.year && work.publication_year) {
            const yearDiff = Math.abs(reference.year - work.publication_year);
            if (yearDiff === 0) {
                confidence += 15;
            } else if (yearDiff === 1) {
                confidence += 10;
            }
        }

        if (work.cited_by_count && work.cited_by_count > 10) {
            confidence += 5;
        }

        if (work.open_access && work.open_access.is_oa) {
            confidence += 5;
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

    private matchAuthors(refAuthors: string[], authorships: any[]): boolean {
        for (const refAuthor of refAuthors) {
            for (const authorship of authorships) {
                const author = authorship.author;
                if (!author) continue;

                const authorName = author.display_name || '';
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
                    this.logger.warn(`[OpenAlex Rate Limit] Pausing ${waitTime}ms before next request`);
                    await new Promise((resolve) => setTimeout(resolve, waitTime));
                }

                this.lastRequestTimestamp = Date.now();
            })
            .catch((error) => {
                this.logger.error('[OpenAlex Rate Limit] Queue error:', error);
            });

        await this.rateLimitChain;
    }
}

