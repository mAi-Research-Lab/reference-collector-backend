/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { ReferencesResponse } from 'src/modules/references/dto/reference/references.response';
import { DOMParser } from 'xmldom';

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
            // CSL XML'i parse et - ✅ DÜZELTME: new DOMParser() şeklinde
            const parser = new DOMParser();
            const doc = parser.parseFromString(cslContent, 'text/xml');

            // xmldom parse error kontrolü
            if (!doc || !doc.documentElement) {
                console.warn('Failed to parse CSL XML');
                return this.fallbackCitationFormat(reference, options);
            }

            // Citation layout'unu bul - ✅ DÜZELTME: getElementsByTagName kullan
            const citationElements = doc.getElementsByTagName('citation');
            if (citationElements.length === 0) {
                console.warn('No citation element found in CSL');
                return this.fallbackCitationFormat(reference, options);
            }

            const citationElement = citationElements[0];
            const layoutElements = citationElement.getElementsByTagName('layout');
            if (layoutElements.length === 0) {
                console.warn('No layout element found in citation');
                return this.fallbackCitationFormat(reference, options);
            }

            const layoutElement = layoutElements[0];

            // Layout'u process et
            const formattedText = this.processLayout(layoutElement, reference, options);
            
            // Prefix ve suffix ekle
            const prefix = options.prefix || '';
            const suffix = options.suffix || '';
            
            console.log('✅ CSL processing successful:', formattedText);
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

            if (!doc || !doc.documentElement) {
                return this.fallbackBibliographyFormat(reference);
            }

            // Bibliography layout'unu bul
            const bibliographyElements = doc.getElementsByTagName('bibliography');
            if (bibliographyElements.length === 0) {
                return this.fallbackBibliographyFormat(reference);
            }

            const bibliographyElement = bibliographyElements[0];
            const layoutElements = bibliographyElement.getElementsByTagName('layout');
            if (layoutElements.length === 0) {
                return this.fallbackBibliographyFormat(reference);
            }

            const layoutElement = layoutElements[0];
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
        layoutElement: any, // xmldom Element type
        reference: ReferencesResponse, 
        options: any
    ): string {
        let result = '';

        // Layout'un attributes'larını al
        const prefix = layoutElement.getAttribute('prefix') || '';
        const suffix = layoutElement.getAttribute('suffix') || '';
        const delimiter = layoutElement.getAttribute('delimiter') || '';

        console.log('🔍 Layout attributes:', { prefix, suffix, delimiter });

        // Child elementleri işle
        const children = layoutElement.childNodes;
        const processedParts: string[] = [];

        console.log('🔍 Layout children count:', children.length);

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            console.log(`🔍 Child ${i}:`, {
                nodeType: child.nodeType,
                tagName: child.tagName,
                nodeName: child.nodeName
            });

            // Sadece element node'ları işle (text node'ları değil)
            if (child.nodeType === 1) { // ELEMENT_NODE
                console.log(`📝 Processing element: ${child.tagName}`);
                const processedPart = this.processElement(child, reference, options);
                console.log(`✅ Processed result: "${processedPart}"`);
                
                if (processedPart && processedPart.trim()) {
                    processedParts.push(processedPart);
                }
            }
        }

        console.log('🔍 Processed parts:', processedParts);

        // Delimiter ile birleştir
        result = processedParts.join(delimiter);

        console.log('🔍 Result before prefix/suffix:', result);

        // Prefix ve suffix ekle
        const finalResult = `${prefix}${result}${suffix}`;
        console.log('🔍 Final result:', finalResult);

        return finalResult;
    }

    /**
     * CSL element'ini process et
     */
    private processElement(
        element: any, // xmldom Element
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
            
            case 'choose':  // ✅ YENİ: Choose element support
                return this.processChoose(element, reference, options);
            
            case 'if':      // ✅ YENİ: If element support
                return this.processIf(element, reference, options);
            
            case 'else-if': // ✅ YENİ: Else-if element support
                return this.processElseIf(element, reference, options);
            
            case 'else':    // ✅ YENİ: Else element support
                return this.processElse(element, reference, options);
            
            case 'label':   // ✅ YENİ: Label element support
                return this.processLabel(element, reference, options);
            
            default:
                console.warn(`Unknown CSL element: ${tagName}`);
                return '';
        }
    }

    /**
     * Names element'ini process et (author, editor vb.)
     */
    private processNames(element: any, reference: ReferencesResponse, options: any): string {
        const variable = element.getAttribute('variable');
        const elementPrefix = element.getAttribute('prefix') || '';
        const elementSuffix = element.getAttribute('suffix') || '';

        console.log('👥 Processing names:', { variable, elementPrefix, elementSuffix });
        console.log('👥 Options:', options);
        console.log('👥 Reference authors:', reference.authors);

        // Suppress author kontrolü
        if (variable === 'author' && options.suppressAuthor) {
            console.log('❌ Author suppressed');
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
                console.log(`❌ Unknown variable: ${variable}`);
                return '';
        }

        console.log('👥 Found names:', names);

        if (names.length === 0) {
            console.log('❌ No names found');
            return '';
        }

        // Name formatting kurallarını al
        const nameElements = element.getElementsByTagName('name');
        const nameElement = nameElements.length > 0 ? nameElements[0] : null;
        
        const etAlElements = element.getElementsByTagName('et-al');
        const etAlElement = etAlElements.length > 0 ? etAlElements[0] : null;
        
        console.log('👥 Name element:', nameElement ? 'found' : 'not found');
        console.log('👥 Et-al element:', etAlElement ? 'found' : 'not found');
        
        const formattedNames = this.formatNames(names, nameElement, etAlElement);
        
        console.log('👥 Formatted names:', formattedNames);

        const result = `${elementPrefix}${formattedNames}${elementSuffix}`;
        console.log('👥 Final names result:', result);
        
        return result;
    }

    /**
     * Text element'ini process et
     */
    private processText(element: any, reference: ReferencesResponse, options: any): string {
        // ✅ Tüm attribute'ları debug et
        console.log('📝 Processing TEXT element attributes:');
        if (element.attributes) {
            for (let i = 0; i < element.attributes.length; i++) {
                const attr = element.attributes[i];
                console.log(`  ${attr.name} = "${attr.value}"`);
            }
        }

        const variable = element.getAttribute('variable');
        const value = element.getAttribute('value');
        const macro = element.getAttribute('macro'); // ✅ YENİ: Macro support
        const term = element.getAttribute('term'); // ✅ YENİ: Term support
        const prefix = element.getAttribute('prefix') || '';
        const suffix = element.getAttribute('suffix') || '';

        console.log('📝 Parsed attributes:', { variable, value, macro, term, prefix, suffix });

        let text = '';

        // ✅ YENİ: Term attribute varsa onu işle
        if (term && term.trim()) {
            text = this.processTerm(term);
            console.log('📝 Got term value for', term, ':', text);
        }
        // ✅ YENİ: Macro attribute varsa onu işle
        else if (macro && macro.trim()) {
            text = this.processMacro(macro, reference, options);
            console.log('📝 Got macro value for', macro, ':', text);
        }
        // Value attribute varsa onu kullan (boş string değilse)
        else if (value && value.trim()) {
            text = value;
            console.log('📝 Using value attribute:', text);
        }
        // Variable attribute varsa reference'tan al (boş string değilse)
        else if (variable && variable.trim()) {
            text = this.getVariableValue(variable, reference, options);
            console.log('📝 Got variable value for', variable, ':', text);
        }
        // Eğer ikisi de yoksa element'in textContent'ini al
        else {
            // Text node'lardan içeriği al
            text = this.getElementTextContent(element);
            console.log('📝 Using element text content:', text);
        }

        if (!text || !text.trim()) {
            console.log('❌ Text element has no content');
            return '';
        }

        const result = `${prefix}${text}${suffix}`;
        console.log('📝 Text final result:', result);

        return result;
    }

    /**
     * Date element'ini process et
     */
    private processDate(element: any, reference: ReferencesResponse): string {
        const variable = element.getAttribute('variable');
        const prefix = element.getAttribute('prefix') || '';
        const suffix = element.getAttribute('suffix') || '';
        const dateParts = element.getAttribute('date-parts');

        console.log('📅 Processing DATE element:', { variable, prefix, suffix, dateParts });
        console.log('📅 Reference year:', reference.year);

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
                console.log(`❌ Unknown date variable: ${variable}`);
                return '';
        }

        console.log('📅 Date value:', dateValue);

        if (!dateValue) {
            console.log('❌ Date element has no value');
            return '';
        }

        const result = `${prefix}${dateValue}${suffix}`;
        console.log('📅 Date final result:', result);

        return result;
    }

    /**
     * Number element'ini process et
     */
    private processNumber(element: any, reference: ReferencesResponse): string {
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
    private processGroup(element: any, reference: ReferencesResponse, options: any): string {
        console.log('🎯 Processing GROUP element');
        
        // Group içindeki tüm elementleri işle
        const children = element.childNodes;
        const processedParts: string[] = [];

        console.log('🎯 Group children count:', children.length);

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            console.log(`🎯 Group child ${i}:`, {
                nodeType: child.nodeType,
                tagName: child.tagName,
                nodeName: child.nodeName
            });

            if (child.nodeType === 1) { // ELEMENT_NODE
                console.log(`🎯 Processing group child: ${child.tagName}`);
                const processedPart = this.processElement(child, reference, options);
                console.log(`🎯 Group child result: "${processedPart}"`);
                
                if (processedPart && processedPart.trim()) {
                    processedParts.push(processedPart);
                }
            }
        }

        console.log('🎯 Group processed parts:', processedParts);

        // Eğer group içinde hiç content yoksa boş döndür
        if (processedParts.length === 0) {
            console.log('❌ Group has no content');
            return '';
        }

        const delimiter = element.getAttribute('delimiter') || '';
        const prefix = element.getAttribute('prefix') || '';
        const suffix = element.getAttribute('suffix') || '';

        console.log('🎯 Group attributes:', { delimiter, prefix, suffix });

        const result = processedParts.join(delimiter);
        const finalResult = `${prefix}${result}${suffix}`;
        
        console.log('🎯 Group final result:', finalResult);
        
        return finalResult;
    }

    /**
     * Names'leri formatla
     */
    private formatNames(names: any[], nameElement: any | null, etAlElement: any | null): string {
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
    private formatSingleName(name: any, nameElement: any | null): string {
        // Name'den lastName ve firstName'i al
        let lastName = '';
        let firstName = '';

        // Önce direct field'ları kontrol et
        if (name.lastName && name.firstName) {
            lastName = name.lastName;
            firstName = name.firstName;
        } 
        // Name field'ından parse et
        else if (name.name) {
            lastName = this.extractLastName(name.name);
            firstName = this.extractFirstName(name.name);
        }
        // Direct field'ları kullan
        else {
            lastName = name.lastName || '';
            firstName = name.firstName || '';
        }

        // ✅ DÜZELTME: Boş değerleri temizle
        lastName = (lastName || '').trim();
        firstName = (firstName || '').trim();

        console.log(`👤 Formatting name: "${firstName}" "${lastName}"`);

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
            const fullName = `${firstName} ${lastName}`.trim();
            return fullName || 'Unknown';
        }
    }

    /**
     * Variable değerini al
     */
    private getVariableValue(variable: string, reference: ReferencesResponse, options: any): string {
        console.log(`🔍 Getting variable value for: "${variable}"`);
        console.log('🔍 Reference data:', {
            title: reference.title,
            year: reference.year,
            authors: reference.authors?.length || 0,
            publication: reference.publication
        });

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
            case 'issued': // Tarih için
                return reference.year?.toString() || '';
            
            // IEEE specific variables
            case 'citation-number':
                { const citationNumber = this.generateCitationNumber(reference.id || '');
                return citationNumber.toString(); }
            
            // Numeric citation (Science, Nature, Cell)
            case 'citation-label':
                return this.generateCitationNumber(reference.id || '').toString();
            
            // Author variables
            case 'author':
                return this.formatAuthorIntext(reference, options);
            
            // Title variables
            case 'title-short':
                { const title = reference.title || '';
                return title.length > 50 ? title.substring(0, 47) + '...' : title; }
            
            // Publisher info
            case 'publisher':
                return reference.publisher || '';
            
            // Date parts
            case 'year':
                return reference.year?.toString() || '';
            
            default:
                console.log(`❌ Unknown variable: "${variable}"`);
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
     * Element'in text content'ini al (xmldom için)
     */
    private getElementTextContent(element: any): string {
        let text = '';
        
        if (element.childNodes) {
            for (let i = 0; i < element.childNodes.length; i++) {
                const child = element.childNodes[i];
                if (child.nodeType === 3) { // TEXT_NODE
                    text += child.nodeValue || '';
                }
            }
        }
        
        return text.trim();
    }

    /**
     * CSL Macro'ları işle
     */
    private processMacro(macroName: string, reference: ReferencesResponse, options: any): string {
        console.log(`🔧 Processing macro: ${macroName}`);

        // Genel macro implementations (tüm style'lar için)
        switch (macroName) {
            // APA Macros
            case 'author-intext':
                return this.formatAuthorIntext(reference, options);
            
            case 'date-intext':
                return this.formatDateIntext(reference, options);
            
            case 'citation-locator':
                return this.formatCitationLocator(reference, options);
            
            // Chicago Macros
            case 'citation-author-date':
                return this.formatChicagoCitation(reference, options);
            
            // MLA Macros  
            case 'author-short':
                return this.formatAuthorShort(reference, options);
            
            // IEEE Macros
            case 'citation-number-inline':
                return this.formatIEEECitationNumber(reference, options);
            
            // ✅ YENİ: Springer ve diğer eksik macro'lar
            case 'year':
            case 'date':
                return this.formatDateIntext(reference, options);
            
            case 'at_page':
                return this.formatGenericCitation(reference, options);
            
            case 'title-short':
                { const title = reference.title || '';
                return title.length > 50 ? title.substring(0, 47) + '...' : title; }
            
            // Genel fallback macro'lar
            case 'author':
            case 'contributors':
                return this.formatAuthorIntext(reference, options);
            
            case 'issued':
            case 'year-date':
                return this.formatDateIntext(reference, options);
            
            case 'locator':
            case 'page':
                return this.formatCitationLocator(reference, options);
            
            default:
                console.log(`❌ Unknown macro: ${macroName}, trying generic format`);
                // Generic fallback: author + date
                return this.formatGenericCitation(reference, options);
        }
    }

    /**
     * Author intext formatting (macro)
     */
    private formatAuthorIntext(reference: ReferencesResponse, options: any): string {
        if (options.suppressAuthor) {
            return '';
        }

        if (!reference.authors || reference.authors.length === 0) {
            return '';
        }

        const authors = reference.authors;
        
        if (authors.length === 1) {
            const author = authors[0];
            const lastName = author.lastName || this.extractLastName(author.name) || 'Unknown';
            return lastName;
        } else if (authors.length === 2) {
            const author1 = authors[0];
            const author2 = authors[1];
            const lastName1 = author1.lastName || this.extractLastName(author1.name) || 'Unknown';
            const lastName2 = author2.lastName || this.extractLastName(author2.name) || 'Unknown';
            return `${lastName1} & ${lastName2}`;
        } else {
            const firstAuthor = authors[0];
            const lastName = firstAuthor.lastName || this.extractLastName(firstAuthor.name) || 'Unknown';
            return `${lastName} et al.`;
        }
    }

    /**
     * Date intext formatting (macro)
     */
    private formatDateIntext(reference: ReferencesResponse, options: any): string {
        if (options.suppressDate) {
            return '';
        }

        return reference.year?.toString() || 'n.d.';
    }

    /**
     * Citation locator formatting (macro)
     */
    private formatCitationLocator(reference: ReferencesResponse, options: any): string {
        if (options.pageNumbers && options.pageNumbers.trim()) {
            return `p. ${options.pageNumbers}`;
        }
        return '';
    }

    /**
     * Chicago author-date citation formatting
     */
    private formatChicagoCitation(reference: ReferencesResponse, options: any): string {
        const parts: string[] = [];

        // Author kısmı
        if (!options.suppressAuthor) {
            const authorPart = this.formatAuthorIntext(reference, options);
            if (authorPart) {
                parts.push(authorPart);
            }
        }

        // Date kısmı
        if (!options.suppressDate) {
            const datePart = this.formatDateIntext(reference, options);
            if (datePart) {
                parts.push(datePart);
            }
        }

        // Page kısmı
        const locatorPart = this.formatCitationLocator(reference, options);
        if (locatorPart) {
            parts.push(locatorPart);
        }

        return parts.join(', ');
    }

    /**
     * Author short name formatting (MLA style)
     */
    private formatAuthorShort(reference: ReferencesResponse, options: any): string {
        if (options.suppressAuthor || !reference.authors || reference.authors.length === 0) {
            return '';
        }

        const authors = reference.authors;
        
        // ✅ DÜZELTME: MLA multiple author support
        if (authors.length === 1) {
            const author = authors[0];
            return author.lastName || this.extractLastName(author.name) || 'Unknown';
        } else if (authors.length === 2) {
            const author1 = authors[0];
            const author2 = authors[1];
            const lastName1 = author1.lastName || this.extractLastName(author1.name) || 'Unknown';
            const lastName2 = author2.lastName || this.extractLastName(author2.name) || 'Unknown';
            
            // ✅ DÜZELTME: Style'a göre farklı format
            // MLA: "Doe and Smith"  
            // Springer: "Doe and Smith" (aynı)
            return `${lastName1} and ${lastName2}`;
        } else {
            const firstAuthor = authors[0];
            const lastName = firstAuthor.lastName || this.extractLastName(firstAuthor.name) || 'Unknown';
            return `${lastName} et al.`;
        }
    }

    /**
     * IEEE citation number formatting
     */
    private formatIEEECitationNumber(reference: ReferencesResponse, options: any): string {
        // IEEE style için citation number'ı reference ID'sinden üret
        const citationNumber = this.generateCitationNumber(reference.id || '');
        return `[${citationNumber}]`;
    }

    /**
     * Generic citation formatting (fallback)
     */
    private formatGenericCitation(reference: ReferencesResponse, options: any): string {
        const parts: string[] = [];

        // Author
        if (!options.suppressAuthor) {
            const authorPart = this.formatAuthorIntext(reference, options);
            if (authorPart) {
                parts.push(authorPart);
            }
        }

        // Date
        if (!options.suppressDate) {
            const datePart = this.formatDateIntext(reference, options);
            if (datePart) {
                parts.push(datePart);
            }
        }

        return parts.join(', ');
    }

    /**
     * Numeric citation formatting (Science, Nature, Cell vb. için)
     */
    private formatNumericCitation(reference: ReferencesResponse, options: any): string {
        const citationNumber = this.generateCitationNumber(reference.id || '');
        return citationNumber.toString();
    }

    /**
     * Citation number generate et (IEEE için)
     */
    private generateCitationNumber(referenceId: string): number {
        // Reference ID'sinden deterministic number üret
        let hash = 0;
        for (let i = 0; i < referenceId.length; i++) {
            const char = referenceId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit integer'a convert et
        }
        return Math.abs(hash) % 1000 + 1; // 1-1000 arası
    }

    /**
     * Choose element'ini process et (conditional logic)
     */
    private processChoose(element: any, reference: ReferencesResponse, options: any): string {
        console.log('🔀 Processing CHOOSE element');
        
        const children = element.childNodes;
        
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.nodeType === 1) { // ELEMENT_NODE
                const tagName = child.tagName.toLowerCase();
                
                if (tagName === 'if') {
                    const result = this.processIf(child, reference, options);
                    if (result) {
                        console.log('✅ IF condition met, using result:', result);
                        return result;
                    }
                } else if (tagName === 'else-if') {
                    const result = this.processElseIf(child, reference, options);
                    if (result) {
                        console.log('✅ ELSE-IF condition met, using result:', result);
                        return result;
                    }
                } else if (tagName === 'else') {
                    const result = this.processElse(child, reference, options);
                    console.log('✅ Using ELSE result:', result);
                    return result;
                }
            }
        }
        
        console.log('❌ No choose condition met');
        return '';
    }

    /**
     * If element'ini process et
     */
    private processIf(element: any, reference: ReferencesResponse, options: any): string {
        console.log('🔀 Processing IF element');
        
        // If condition'ı evaluate et
        if (this.evaluateCondition(element, reference, options)) {
            console.log('✅ IF condition is true');
            return this.processElementChildren(element, reference, options);
        }
        
        console.log('❌ IF condition is false');
        return '';
    }

    /**
     * Else-if element'ini process et
     */
    private processElseIf(element: any, reference: ReferencesResponse, options: any): string {
        console.log('🔀 Processing ELSE-IF element');
        
        // Else-if condition'ı evaluate et
        if (this.evaluateCondition(element, reference, options)) {
            console.log('✅ ELSE-IF condition is true');
            return this.processElementChildren(element, reference, options);
        }
        
        console.log('❌ ELSE-IF condition is false');
        return '';
    }

    /**
     * Else element'ini process et
     */
    private processElse(element: any, reference: ReferencesResponse, options: any): string {
        console.log('🔀 Processing ELSE element');
        return this.processElementChildren(element, reference, options);
    }

    /**
     * Condition evaluate et
     */
    private evaluateCondition(element: any, reference: ReferencesResponse, options: any): boolean {
        const variable = element.getAttribute('variable');
        const type = element.getAttribute('type');
        const isNumeric = element.getAttribute('is-numeric');
        
        console.log('🔍 Evaluating condition:', { variable, type, isNumeric });
        
        // Variable condition
        if (variable) {
            const variables = variable.split(' ');
            for (const varName of variables) {
                const value = this.getVariableValue(varName.trim(), reference, options);
                if (value && value.trim()) {
                    console.log(`✅ Variable ${varName} has value: ${value}`);
                    return true;
                }
            }
            console.log(`❌ No variables have values: ${variable}`);
            return false;
        }
        
        // Type condition
        if (type) {
            // Basit type check - tüm reference'lar için true döndür
            console.log(`✅ Type condition met for: ${type}`);
            return true;
        }
        
        // Numeric condition
        if (isNumeric) {
            console.log(`✅ Numeric condition met for: ${isNumeric}`);
            return true;
        }
        
        // Default: true
        console.log('✅ Default condition: true');
        return true;
    }

    /**
     * Element'in child'larını process et
     */
    private processElementChildren(element: any, reference: ReferencesResponse, options: any): string {
        const children = element.childNodes;
        const processedParts: string[] = [];

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.nodeType === 1) { // ELEMENT_NODE
                const processedPart = this.processElement(child, reference, options);
                if (processedPart && processedPart.trim()) {
                    processedParts.push(processedPart);
                }
            }
        }

        const delimiter = element.getAttribute('delimiter') || '';
        const prefix = element.getAttribute('prefix') || '';
        const suffix = element.getAttribute('suffix') || '';

        const result = processedParts.join(delimiter);
        return `${prefix}${result}${suffix}`;
    }

    /**
     * Term işle (Bluebook gibi legal citation'lar için)
     */
    private processTerm(termName: string): string {
        console.log(`📖 Processing term: ${termName}`);
        
        switch (termName) {
            case 'ibid':
                // Ibid sadece repeated citation'larda kullanılır
                // Şimdilik boş döndür
                return '';
            case 'and':
                return 'and';
            case 'et-al':
                return 'et al.';
            case 'page':
                return 'p.';
            case 'pages':
                return 'pp.';
            case 'at':
                return 'at';
            default:
                console.log(`❌ Unknown term: ${termName}`);
                return '';
        }
    }

    /**
     * Label element işle
     */
    private processLabel(element: any, reference: ReferencesResponse, options: any): string {
        console.log('🏷️ Processing LABEL element');
        
        const variable = element.getAttribute('variable');
        const form = element.getAttribute('form') || 'long';
        const plural = element.getAttribute('plural') || 'contextual';
        
        console.log('🏷️ Label attributes:', { variable, form, plural });
        
        switch (variable) {
            case 'page':
                return form === 'short' ? 'p.' : 'page';
            case 'volume':
                return form === 'short' ? 'vol.' : 'volume';
            case 'issue':
                return form === 'short' ? 'no.' : 'number';
            default:
                return '';
        }
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