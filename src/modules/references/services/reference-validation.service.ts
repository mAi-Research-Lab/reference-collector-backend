import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ValidationResult {
    isValid: boolean;
    field: string;
    value: string;
    error?: string;
    suggestion?: string;
    metadata?: any;
}

export interface ComprehensiveValidationResult {
    isValid: boolean;
    results: ValidationResult[];
    score: number; // 0-100
    warnings: string[];
    suggestions: string[];
}

@Injectable()
export class ReferenceValidationService {
    constructor(private readonly httpService: HttpService) {}

    /**
     * Comprehensive reference validation
     */
    async validateReference(referenceData: any): Promise<ComprehensiveValidationResult> {
        const results: ValidationResult[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // DOI validation
        if (referenceData.doi) {
            const doiResult = await this.validateDOI(referenceData.doi);
            results.push(doiResult);
            if (!doiResult.isValid) {
                warnings.push(`Invalid DOI: ${doiResult.error}`);
            }
        }

        // ISBN validation
        if (referenceData.isbn) {
            const isbnResult = this.validateISBN(referenceData.isbn);
            results.push(isbnResult);
            if (!isbnResult.isValid) {
                warnings.push(`Invalid ISBN: ${isbnResult.error}`);
            }
        }

        // ISSN validation
        if (referenceData.issn) {
            const issnResult = this.validateISSN(referenceData.issn);
            results.push(issnResult);
            if (!issnResult.isValid) {
                warnings.push(`Invalid ISSN: ${issnResult.error}`);
            }
        }

        // URL validation
        if (referenceData.url) {
            const urlResult = await this.validateURL(referenceData.url);
            results.push(urlResult);
            if (!urlResult.isValid) {
                warnings.push(`Invalid URL: ${urlResult.error}`);
            }
        }

        // Year validation
        if (referenceData.year) {
            const yearResult = this.validateYear(referenceData.year);
            results.push(yearResult);
            if (!yearResult.isValid) {
                warnings.push(`Invalid year: ${yearResult.error}`);
            }
        }

        // Title validation
        if (referenceData.title) {
            const titleResult = this.validateTitle(referenceData.title);
            results.push(titleResult);
            if (!titleResult.isValid) {
                warnings.push(`Title issue: ${titleResult.error}`);
            }
        }

        // Authors validation
        if (referenceData.authors) {
            const authorsResult = this.validateAuthors(referenceData.authors);
            results.push(authorsResult);
            if (!authorsResult.isValid) {
                warnings.push(`Authors issue: ${authorsResult.error}`);
            }
        }

        // Calculate validation score
        const validResults = results.filter(r => r.isValid).length;
        const score = results.length > 0 ? Math.round((validResults / results.length) * 100) : 0;

        // Generate suggestions
        if (!referenceData.doi && referenceData.title) {
            suggestions.push('Consider adding a DOI for better citation accuracy');
        }
        if (!referenceData.abstractText) {
            suggestions.push('Adding an abstract would improve searchability');
        }
        if (!referenceData.tags || referenceData.tags.length === 0) {
            suggestions.push('Adding tags would help with organization');
        }

        return {
            isValid: results.every(r => r.isValid),
            results,
            score,
            warnings,
            suggestions
        };
    }

    /**
     * DOI validation with CrossRef API check
     */
    async validateDOI(doi: string): Promise<ValidationResult> {
        const cleanDoi = doi.trim().toLowerCase();
        
        // Basic format validation
        const doiRegex = /^10\.\d{4,}\/[^\s]+$/;
        if (!doiRegex.test(cleanDoi)) {
            return {
                isValid: false,
                field: 'doi',
                value: doi,
                error: 'Invalid DOI format. Should be like: 10.1000/182',
                suggestion: 'Use format: 10.xxxx/xxxxxx'
            };
        }

        try {
            // Check with CrossRef API
            const response = await firstValueFrom(
                this.httpService.get(`https://api.crossref.org/works/${cleanDoi}`, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'Reference-Collector/1.0 (mailto:admin@example.com)'
                    }
                })
            );

            if (response.status === 200 && response.data.status === 'ok') {
                return {
                    isValid: true,
                    field: 'doi',
                    value: doi,
                    metadata: response.data.message
                };
            }
        } catch (error) {
            // If API fails, still consider format-valid DOI as valid
            if (doiRegex.test(cleanDoi)) {
                return {
                    isValid: true,
                    field: 'doi',
                    value: doi,
                    error: 'Could not verify DOI with CrossRef API, but format is valid'
                };
            }
        }

        return {
            isValid: false,
            field: 'doi',
            value: doi,
            error: 'DOI not found in CrossRef database'
        };
    }

    /**
     * ISBN validation with checksum
     */
    validateISBN(isbn: string): ValidationResult {
        const cleanIsbn = isbn.replace(/[-\s]/g, '');
        
        if (cleanIsbn.length === 10) {
            return this.validateISBN10(cleanIsbn, isbn);
        } else if (cleanIsbn.length === 13) {
            return this.validateISBN13(cleanIsbn, isbn);
        }

        return {
            isValid: false,
            field: 'isbn',
            value: isbn,
            error: 'ISBN must be 10 or 13 digits',
            suggestion: 'Use format: 978-0123456789 or 0123456789'
        };
    }

    private validateISBN10(isbn: string, originalValue: string): ValidationResult {
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            if (!/\d/.test(isbn[i])) {
                return {
                    isValid: false,
                    field: 'isbn',
                    value: originalValue,
                    error: 'ISBN-10 must contain only digits'
                };
            }
            sum += parseInt(isbn[i]) * (10 - i);
        }

        const checkDigit = isbn[9].toLowerCase();
        const calculatedCheck = (11 - (sum % 11)) % 11;
        const expectedCheck = calculatedCheck === 10 ? 'x' : calculatedCheck.toString();

        if (checkDigit === expectedCheck) {
            return {
                isValid: true,
                field: 'isbn',
                value: originalValue
            };
        }

        return {
            isValid: false,
            field: 'isbn',
            value: originalValue,
            error: `Invalid ISBN-10 checksum. Expected: ${expectedCheck}`,
            suggestion: `Correct ISBN might be: ${isbn.substring(0, 9)}${expectedCheck}`
        };
    }

    private validateISBN13(isbn: string, originalValue: string): ValidationResult {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            if (!/\d/.test(isbn[i])) {
                return {
                    isValid: false,
                    field: 'isbn',
                    value: originalValue,
                    error: 'ISBN-13 must contain only digits'
                };
            }
            sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
        }

        const checkDigit = parseInt(isbn[12]);
        const calculatedCheck = (10 - (sum % 10)) % 10;

        if (checkDigit === calculatedCheck) {
            return {
                isValid: true,
                field: 'isbn',
                value: originalValue
            };
        }

        return {
            isValid: false,
            field: 'isbn',
            value: originalValue,
            error: `Invalid ISBN-13 checksum. Expected: ${calculatedCheck}`,
            suggestion: `Correct ISBN might be: ${isbn.substring(0, 12)}${calculatedCheck}`
        };
    }

    /**
     * ISSN validation
     */
    validateISSN(issn: string): ValidationResult {
        const cleanIssn = issn.replace(/[-\s]/g, '');
        
        if (cleanIssn.length !== 8) {
            return {
                isValid: false,
                field: 'issn',
                value: issn,
                error: 'ISSN must be 8 characters',
                suggestion: 'Use format: 1234-5678'
            };
        }

        let sum = 0;
        for (let i = 0; i < 7; i++) {
            if (!/\d/.test(cleanIssn[i])) {
                return {
                    isValid: false,
                    field: 'issn',
                    value: issn,
                    error: 'ISSN must contain only digits'
                };
            }
            sum += parseInt(cleanIssn[i]) * (8 - i);
        }

        const checkDigit = cleanIssn[7].toLowerCase();
        const calculatedCheck = (11 - (sum % 11)) % 11;
        const expectedCheck = calculatedCheck === 10 ? 'x' : calculatedCheck.toString();

        if (checkDigit === expectedCheck) {
            return {
                isValid: true,
                field: 'issn',
                value: issn
            };
        }

        return {
            isValid: false,
            field: 'issn',
            value: issn,
            error: `Invalid ISSN checksum. Expected: ${expectedCheck}`
        };
    }

    /**
     * URL validation with accessibility check
     */
    async validateURL(url: string): Promise<ValidationResult> {
        try {
            const urlObj = new URL(url);
            
            // Basic format validation
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return {
                    isValid: false,
                    field: 'url',
                    value: url,
                    error: 'URL must use HTTP or HTTPS protocol'
                };
            }

            // Try to access the URL
            try {
                const response = await firstValueFrom(
                    this.httpService.head(url, { timeout: 5000 })
                );
                
                if (response.status >= 200 && response.status < 400) {
                    return {
                        isValid: true,
                        field: 'url',
                        value: url,
                        metadata: { statusCode: response.status }
                    };
                }
            } catch (error) {
                // URL format is valid but not accessible
                return {
                    isValid: true,
                    field: 'url',
                    value: url,
                    error: 'URL format is valid but not currently accessible'
                };
            }

            return {
                isValid: true,
                field: 'url',
                value: url
            };
        } catch (error) {
            return {
                isValid: false,
                field: 'url',
                value: url,
                error: 'Invalid URL format'
            };
        }
    }

    /**
     * Year validation
     */
    validateYear(year: number): ValidationResult {
        const currentYear = new Date().getFullYear();
        
        if (year < 1000 || year > currentYear + 5) {
            return {
                isValid: false,
                field: 'year',
                value: year.toString(),
                error: `Year should be between 1000 and ${currentYear + 5}`
            };
        }

        return {
            isValid: true,
            field: 'year',
            value: year.toString()
        };
    }

    /**
     * Title validation
     */
    validateTitle(title: string): ValidationResult {
        if (title.length < 5) {
            return {
                isValid: false,
                field: 'title',
                value: title,
                error: 'Title is too short (minimum 5 characters)'
            };
        }

        if (title.length > 500) {
            return {
                isValid: false,
                field: 'title',
                value: title,
                error: 'Title is too long (maximum 500 characters)'
            };
        }

        return {
            isValid: true,
            field: 'title',
            value: title
        };
    }

    /**
     * Authors validation
     */
    validateAuthors(authors: any): ValidationResult {
        if (!Array.isArray(authors) && typeof authors !== 'object') {
            return {
                isValid: false,
                field: 'authors',
                value: JSON.stringify(authors),
                error: 'Authors must be an array or object'
            };
        }

        const authorArray = Array.isArray(authors) ? authors : [authors];
        
        for (const author of authorArray) {
            if (typeof author === 'string') {
                if (author.length < 2) {
                    return {
                        isValid: false,
                        field: 'authors',
                        value: JSON.stringify(authors),
                        error: 'Author name too short'
                    };
                }
            } else if (typeof author === 'object') {
                if (!author.name || author.name.length < 2) {
                    return {
                        isValid: false,
                        field: 'authors',
                        value: JSON.stringify(authors),
                        error: 'Author object must have a valid name field'
                    };
                }
            }
        }

        return {
            isValid: true,
            field: 'authors',
            value: JSON.stringify(authors)
        };
    }
}
