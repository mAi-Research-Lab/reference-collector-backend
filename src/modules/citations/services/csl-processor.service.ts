import { Injectable } from '@nestjs/common';
import { ReferencesResponse } from 'src/modules/references/dto/reference/references.response';

/**
 * CSL Content'i parse edip citation formatting yapan servis
 */
@Injectable()
export class CSLProcessorService {

    /**
     * CSL content'e göre citation formatla
     */
    formatCitation(
        cslContent: string, 
        reference: ReferencesResponse, 
        options: {
            suppressAuthor?: boolean;
            suppressDate?: boolean;
            pageNumbers?: string;
            prefix?: string;
            suffix?: string;
        } = {}
    ): string {
        try {
            // CSL XML'i parse et
            const parser = new DOMParser();
            const doc = parser.parseFromString(cslContent, 'text/xml');

            // Citation layout'unu bul
            const citationElement = doc.querySelector('citation');
            if (!citationElement) {
                // Fallback: eğer citation yok ise basit format
                return this.fallbackCitationFormat(reference, options);
            }

            const layoutElement = citationElement.querySelector('layout');
            if (!layoutElement) {
                return this.fallbackCitationFormat(reference, options);
            }

            // Layout'u process et
            const formattedText = this.processLayout(layoutElement, reference, options);
            
            // Prefix ve suffix ekle
            const prefix = options.prefix || '';
            const suffix = options.suffix || '';
            
            return `${prefix}${formattedText}${suffix}`;

        } catch (error) {
            console.error('CSL processing error:', error);
            // Hata durumunda fallback format kullan
            return this.fallbackCitationFormat(reference, options);
        }
    }

    /**
     * CSL content'e göre bibliography formatla
     */
    formatBibliography(
        cslContent: string, 
        reference: ReferencesResponse
    ): string {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(cslContent, 'text/xml');

            // Bibliography layout'unu bul
            const bibliographyElement = doc.querySelector('bibliography');
            if (!bibliographyElement) {
                return this.fallbackBibliographyFormat(reference);
            }

            const layoutElement = bibliographyElement.querySelector('layout');
            if (!layoutElement) {
                return this.fallbackBibliographyFormat(reference);
            }

            return this.processLayout(layoutElement, reference, {});

        } catch (error) {
            console.error('CSL bibliography processing error:', error);
            return this.fallbackBibliographyFormat(reference);
        }
    }

    /**
     * Layout element'ini process et
     */
    private processLayout(
        layoutElement: Element, 
        reference: ReferencesResponse, 
        options: any
    ): string {
        let result = '';

        // Layout'un attributes'larını al
        const prefix = layoutElement.getAttribute('prefix') || '';
        const suffix = layoutElement.getAttribute('suffix') || '';
        const delimiter = layoutElement.getAttribute('delimiter') || '';

        // Child elementleri işle
        const children = Array.from(layoutElement.children);
        const processedParts: string[] = [];

        for (const child of children) {
            const processedPart = this.processElement(child, reference, options);
            if (processedPart.trim()) {
                processedParts.push(processedPart);
            }
        }

        // Delimiter ile birleştir
        result = processedParts.join(delimiter);

        // Prefix ve suffix ekle
        return `${prefix}${result}${suffix}`;
    }

    /**
     * CSL element'ini process et
     */
    private processElement(
        element: Element, 
        reference: ReferencesResponse, 
        options: any
    ): string {
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
            case 'names':
                return this.processNames(element, reference, options);
            
            case 'text':
                return this.processText(element, reference, options);
            
            case 'date':
                return this.processDate(element, reference);
            
            case 'number':
                return this.processNumber(element, reference);
            
            case 'group':
                return this.processGroup(element, reference, options);
            
            default:
                console.warn(`Unknown CSL element: ${tagName}`);
                return '';
        }
    }

    /**
     * Names element'ini process et (author, editor vb.)
     */
    private processNames(element: Element, reference: ReferencesResponse, options: any): string {
        const variable = element.getAttribute('variable');
        const elementPrefix = element.getAttribute('prefix') || '';
        const elementSuffix = element.getAttribute('suffix') || '';

        // Suppress author kontrolü
        if (variable === 'author' && options.suppressAuthor) {
            return '';
        }

        let names: any[] = [];

        // Variable'a göre uygun field'ı al
        switch (variable) {
            case 'author':
                names = reference.authors || [];
                break;
            case 'editor':
                names = reference.editors || [];
                break;
            default:
                return '';
        }

        if (names.length === 0) {
            return '';
        }

        // Name formatting kurallarını al
        const nameElement = element.querySelector('name');
        const etAlElement = element.querySelector('et-al');
        
        const formattedNames = this.formatNames(names, nameElement, etAlElement);
        
        return `${elementPrefix}${formattedNames}${elementSuffix}`;
    }

    /**
     * Text element'ini process et
     */
    private processText(element: Element, reference: ReferencesResponse, options: any): string {
        const variable = element.getAttribute('variable');
        const value = element.getAttribute('value');
        const prefix = element.getAttribute('prefix') || '';
        const suffix = element.getAttribute('suffix') || '';

        let text = '';

        // Value attribute varsa onu kullan
        if (value) {
            text = value;
        }
        // Variable attribute varsa reference'tan al
        else if (variable) {
            text = this.getVariableValue(variable, reference, options);
        }

        if (!text) {
            return '';
        }

        return `${prefix}${text}${suffix}`;
    }

    /**
     * Date element'ini process et
     */
    private processDate(element: Element, reference: ReferencesResponse): string {
        const variable = element.getAttribute('variable');
        const prefix = element.getAttribute('prefix') || '';
        const suffix = element.getAttribute('suffix') || '';
        const dateParts = element.getAttribute('date-parts');

        let dateValue = '';

        switch (variable) {
            case 'issued':
                if (dateParts === 'year') {
                    dateValue = reference.year?.toString() || '';
                } else {
                    // Full date formatting burada yapılabilir
                    dateValue = reference.year?.toString() || '';
                }
                break;
            default:
                return '';
        }

        if (!dateValue) {
            return '';
        }

        return `${prefix}${dateValue}${suffix}`;
    }

    /**
     * Number element'ini process et
     */
    private processNumber(element: Element, reference: ReferencesResponse): string {
        const variable = element.getAttribute('variable');
        const prefix = element.getAttribute('prefix') || '';
        const suffix = element.getAttribute('suffix') || '';

        let numberValue = '';

        switch (variable) {
            case 'volume':
                numberValue = reference.volume || '';
                break;
            case 'issue':
                numberValue = reference.issue || '';
                break;
            case 'page':
                numberValue = reference.pages || '';
                break;
            default:
                return '';
        }

        if (!numberValue) {
            return '';
        }

        return `${prefix}${numberValue}${suffix}`;
    }

    /**
     * Group element'ini process et
     */
    private processGroup(element: Element, reference: ReferencesResponse, options: any): string {
        // Group içindeki tüm elementleri işle
        const children = Array.from(element.children);
        const processedParts: string[] = [];

        for (const child of children) {
            const processedPart = this.processElement(child, reference, options);
            if (processedPart.trim()) {
                processedParts.push(processedPart);
            }
        }

        // Eğer group içinde hiç content yoksa boş döndür
        if (processedParts.length === 0) {
            return '';
        }

        const delimiter = element.getAttribute('delimiter') || '';
        const prefix = element.getAttribute('prefix') || '';
        const suffix = element.getAttribute('suffix') || '';

        const result = processedParts.join(delimiter);
        return `${prefix}${result}${suffix}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private formatNames(names: any[], nameElement: Element | null, etAlElement: Element | null): string {
        if (names.length === 0) return '';

        // Et-al kuralları
        const etAlMin = nameElement?.getAttribute('et-al-min');
        const etAlUseFirst = nameElement?.getAttribute('et-al-use-first');
        
        // Name formatting kuralları
        const delimiter = nameElement?.getAttribute('delimiter') || ', ';
        const and = nameElement?.getAttribute('and') || 'and';

        let namesToShow = names;
        let useEtAl = false;

        // Et-al kontrolü
        if (etAlMin && etAlUseFirst) {
            const minCount = parseInt(etAlMin);
            const useFirstCount = parseInt(etAlUseFirst);
            
            if (names.length >= minCount) {
                namesToShow = names.slice(0, useFirstCount);
                useEtAl = true;
            }
        }

        // Her name'i formatla
        const formattedNames = namesToShow.map(name => {
            return this.formatSingleName(name, nameElement);
        });

        // Birleştir
        let result = '';
        if (formattedNames.length === 1) {
            result = formattedNames[0];
        } else if (formattedNames.length === 2) {
            result = `${formattedNames[0]} ${and} ${formattedNames[1]}`;
        } else {
            const lastIndex = formattedNames.length - 1;
            const firstPart = formattedNames.slice(0, lastIndex).join(delimiter);
            result = `${firstPart}${delimiter}${and} ${formattedNames[lastIndex]}`;
        }

        // Et-al ekle
        if (useEtAl) {
            result += ' et al.';
        }

        return result;
    }

    /**
     * Tek bir name'i formatla
     */
    private formatSingleName(name: any, nameElement: Element | null): string {
        // Name'den lastName ve firstName'i al
        const lastName = name.lastName || this.extractLastName(name.name) || '';
        const firstName = name.firstName || this.extractFirstName(name.name) || '';

        const nameAsSort = nameElement?.getAttribute('name-as-sort-order');
        const initializeWith = nameElement?.getAttribute('initialize-with');

        if (nameAsSort === 'all' || nameAsSort === 'first') {
            // Surname first format: "Smith, J."
            let formatted = lastName;
            if (firstName) {
                if (initializeWith !== undefined) {
                    // Initialize: "Smith, J."
                    const initial = firstName.charAt(0).toUpperCase();
                    formatted += `, ${initial}${initializeWith}`;
                } else {
                    // Full first name: "Smith, John"
                    formatted += `, ${firstName}`;
                }
            }
            return formatted;
        } else {
            // Normal format: "John Smith"
            return `${firstName} ${lastName}`.trim();
        }
    }

    /**
     * Variable değerini al
     */
    private getVariableValue(variable: string, reference: ReferencesResponse, options: any): string {
        switch (variable) {
            case 'title':
                return reference.title || '';
            case 'container-title':
                return reference.publication || '';
            case 'volume':
                return reference.volume || '';
            case 'issue':
                return reference.issue || '';
            case 'page':
                return reference.pages || '';
            case 'DOI':
                return reference.doi || '';
            case 'URL':
                return reference.url || '';
            case 'locator':
                return options.pageNumbers || '';
            default:
                return '';
        }
    }

    /**
     * Name field'ından lastName çıkart
     */
    private extractLastName(fullName: string): string {
        if (!fullName) return '';
        const parts = fullName.trim().split(' ');
        return parts[parts.length - 1];
    }

    /**
     * Name field'ından firstName çıkart
     */
    private extractFirstName(fullName: string): string {
        if (!fullName) return '';
        const parts = fullName.trim().split(' ');
        return parts.length > 1 ? parts[0] : '';
    }

    /**
     * Fallback citation format (CSL işlenemediğinde)
     */
    private fallbackCitationFormat(reference: ReferencesResponse, options: any): string {
        let authorText = '';
        if (!options.suppressAuthor && reference.authors && reference.authors.length > 0) {
            const firstAuthor = reference.authors[0];
            authorText = firstAuthor.lastName || this.extractLastName(firstAuthor.name) || 'Unknown';
        }

        let yearText = '';
        if (!options.suppressDate && reference.year) {
            yearText = reference.year.toString();
        }

        let pageText = '';
        if (options.pageNumbers) {
            pageText = `, p. ${options.pageNumbers}`;
        }

        const prefix = options.prefix || '';
        const suffix = options.suffix || '';

        if (authorText && yearText) {
            return `${prefix}(${authorText}, ${yearText}${pageText})${suffix}`;
        } else if (authorText) {
            return `${prefix}(${authorText}${pageText})${suffix}`;
        } else if (yearText) {
            return `${prefix}(${yearText}${pageText})${suffix}`;
        } else {
            return `${prefix}(n.d.${pageText})${suffix}`;
        }
    }

    /**
     * Fallback bibliography format
     */
    private fallbackBibliographyFormat(reference: ReferencesResponse): string {
        let result = '';

        // Author
        if (reference.authors && reference.authors.length > 0) {
            const authorNames = reference.authors.map(author => 
                `${author.lastName || this.extractLastName(author.name) || 'Unknown'}, ${(author.firstName || this.extractFirstName(author.name) || '').charAt(0)}.`
            ).join(', ');
            result += authorNames;
        } else {
            result += 'Unknown Author';
        }

        // Year
        result += ` (${reference.year || 'n.d.'}).`;

        // Title
        result += ` ${reference.title}.`;

        // Publication
        if (reference.publication) {
            result += ` ${reference.publication}`;
            if (reference.volume) result += `, ${reference.volume}`;
            if (reference.issue) result += `(${reference.issue})`;
            if (reference.pages) result += `, ${reference.pages}`;
        }

        return result;
    }
}