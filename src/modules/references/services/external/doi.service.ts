/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface DOIValidationResult {
    isValid: boolean;
    metadata?: any;
}

@Injectable()
export class DOIService {
    private readonly logger = new Logger(DOIService.name);
    private readonly crossrefBaseUrl = 'https://api.crossref.org/works';

    constructor(private readonly httpService: HttpService) {}

    async validateDOI(doi: string): Promise<DOIValidationResult> {
        const cleanDoi = this.cleanDOI(doi);

        if (!this.isValidDOIFormat(cleanDoi)) {
            return { isValid: false };
        }

        const strategies = [
            { name: 'Crossref', fn: () => this.validateDOIWithCrossref(cleanDoi) },
            { name: 'DirectCheck', fn: () => this.validateDOIWithDirectCheck(cleanDoi) },
            { name: 'DataCite', fn: () => this.validateDOIWithDatacite(cleanDoi) },
        ];

        for (const strategy of strategies) {
            try {
                const result = await strategy.fn();
                if (result.isValid) {
                    return result;
                }
            } catch (error) {
                continue;
            }
        }

        return { isValid: false };
    }

    isValidDOIFormat(doi: string): boolean {
        if (!doi || typeof doi !== 'string') {
            return false;
        }

        const cleaned = doi.trim();
        const doiPattern = /^10\.\d{4,}\/[^\s<>]+$/;

        const basicMatch = doiPattern.test(cleaned);
        if (!basicMatch) {
            return false;
        }

        return (
            cleaned.length >= 10 &&
            cleaned.length < 200 &&
            !cleaned.includes('..') &&
            cleaned.split('/').length === 2 &&
            !cleaned.endsWith('/') &&
            !cleaned.endsWith('.')
        );
    }

    isValidISBN(isbn: string): boolean {
        const cleanISBN = isbn.replace(/[^\d]/g, '');
        return cleanISBN.length === 10 || cleanISBN.length === 13;
    }

    private cleanDOI(doi: string): string {
        let cleaned = doi
            .replace(/^doi:\s*/i, '')
            .replace(/^https?:\/\/doi\.org\//i, '')
            .replace(/^https?:\/\/dx\.doi\.org\//i, '')
            .trim();

        try {
            cleaned = decodeURIComponent(cleaned);
        } catch (e) {
            // If decoding fails, use original
        }

        return cleaned;
    }

    private async validateDOIWithCrossref(doi: string): Promise<DOIValidationResult> {
        const strategies = [
            () => this.tryCrossrefRequest(doi, true),
            () => this.tryCrossrefRequest(doi, false),
        ];

        for (const strategy of strategies) {
            try {
                const result = await strategy();
                if (result.isValid) {
                    return result;
                }
            } catch (error) {
                continue;
            }
        }

        return { isValid: false };
    }

    private async tryCrossrefRequest(doi: string, encodeSuffix: boolean): Promise<DOIValidationResult> {
        try {
            let doiPath: string;
            if (encodeSuffix) {
                const [prefix, suffix] = doi.split('/', 2);
                doiPath = prefix + '/' + encodeURIComponent(suffix);
            } else {
                doiPath = doi;
            }

            const response = await firstValueFrom(
                this.httpService.get(`${this.crossrefBaseUrl}/${doiPath}`, {
                    headers: {
                        'User-Agent': 'CITEXT/1.0 (https://citext.ai; mailto:support@citext.ai)',
                        'Accept': 'application/json',
                    },
                    timeout: 15000,
                    validateStatus: (status) => status < 500,
                }),
            );

            if (response.status === 200 && response.data && response.data.message) {
                return {
                    isValid: true,
                    metadata: {
                        ...response.data.message,
                        source: 'Crossref',
                    },
                };
            }

            if (response.status === 404) {
                return { isValid: false };
            }

            return { isValid: false };
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return { isValid: false };
            }
            throw new Error(`Crossref validation failed: ${error.message}`);
        }
    }

    private async validateDOIWithDirectCheck(doi: string): Promise<DOIValidationResult> {
        try {
            const [prefix, suffix] = doi.split('/', 2);
            const encodedSuffix = encodeURIComponent(suffix);
            const encodedDoi = prefix + '/' + encodedSuffix;
            const doiUrl = `https://doi.org/${encodedDoi}`;

            try {
                const headResponse = await firstValueFrom(
                    this.httpService.head(doiUrl, {
                        timeout: 10000,
                        maxRedirects: 10,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; CITEXT/1.0)',
                            'Accept': '*/*',
                        },
                        validateStatus: (status) => status < 500,
                    }),
                );

                if (headResponse.status >= 200 && headResponse.status < 400) {
                    return {
                        isValid: true,
                        metadata: {
                            title: [],
                            author: [],
                            source: 'Direct DOI Check',
                            note: 'DOI resolves but metadata not available',
                        },
                    };
                }
            } catch (headError) {
                // HEAD might not be supported, try GET
            }

            const getResponse = await firstValueFrom(
                this.httpService.get(doiUrl, {
                    timeout: 12000,
                    maxRedirects: 10,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; CITEXT/1.0)',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    },
                    validateStatus: (status) => status < 500,
                }),
            );

            if (getResponse.status >= 200 && getResponse.status < 400) {
                return {
                    isValid: true,
                    metadata: {
                        title: [],
                        author: [],
                        source: 'Direct DOI Check',
                        note: 'DOI resolves but metadata not available',
                    },
                };
            }

            if (getResponse.status === 404) {
                return { isValid: false };
            }

            throw new Error(`DOI check returned status ${getResponse.status}`);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return { isValid: false };
            }
            throw new Error(`Direct DOI check failed: ${error.message}`);
        }
    }

    private async validateDOIWithDatacite(doi: string): Promise<DOIValidationResult> {
        try {
            const [prefix, suffix] = doi.split('/', 2);
            const encodedDoi = prefix + '/' + encodeURIComponent(suffix);
            const response = await firstValueFrom(
                this.httpService.get(`https://api.datacite.org/dois/${encodedDoi}`, {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'CITEXT/1.0 (https://citext.ai)',
                    },
                    timeout: 12000,
                    validateStatus: (status) => status < 500,
                }),
            );

            if (response.status === 200 && response.data && response.data.data) {
                const attributes = response.data.data.attributes;
                const metadata = {
                    title: attributes.titles
                        ? attributes.titles.map((t: { title: string }) => t.title)
                        : [],
                    author: attributes.creators
                        ? attributes.creators.map((c: { givenName: string; familyName: string; name: string }) => ({
                              given: c.givenName || '',
                              family: c.familyName || c.name || '',
                          }))
                        : [],
                    published: attributes.publicationYear,
                    source: 'DataCite',
                    type: attributes.resourceType?.resourceTypeGeneral?.toLowerCase() || 'unknown',
                };

                return {
                    isValid: true,
                    metadata: metadata,
                };
            }

            if (response.status === 404) {
                return { isValid: false };
            }

            throw new Error(`DataCite returned status ${response.status}`);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return { isValid: false };
            }
            throw new Error(`DataCite validation failed: ${error.message}`);
        }
    }
}

