/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { DOMParser } from 'xmldom';
import * as CSL from 'citeproc';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Türkçe dil terimleri
 */
const TURKISH_TERMS = {
    'et-al': 'vd.',
    'and': 've',
    'page': 's.',
    'pages': 'ss.',
    'volume': 'C.',
    'issue': 'S.',
    'edition': 'bs.',
    'editor': 'ed.',
    'editors': 'ed.',
    'translator': 'çev.',
    'accessed': 'erişim tarihi',
    'retrieved': 'erişildi',
    'from': 'kaynak',
    'no-date': 't.y.',
    'in-press': 'baskıda',
    'forthcoming': 'yayımlanacak',
    'chapter': 'böl.',
    'book': 'kt.',
    'article': 'makale'
};

const ENGLISH_TERMS = {
    'et-al': 'et al.',
    'and': 'and',
    'page': 'p.',
    'pages': 'pp.',
    'volume': 'Vol.',
    'issue': 'No.',
    'edition': 'ed.',
    'editor': 'Ed.',
    'editors': 'Eds.',
    'translator': 'Trans.',
    'accessed': 'accessed',
    'retrieved': 'retrieved',
    'from': 'from',
    'no-date': 'n.d.',
    'in-press': 'in press',
    'forthcoming': 'forthcoming',
    'chapter': 'chap.',
    'book': 'bk.',
    'article': 'article'
};

/**
 * CSL Content'i parse edip citation formatting yapan servis
 */
@Injectable()
export class CSLProcessorService {
    private citationNumbers = new Map<string, number>();
    private nextNumber = 1;
    private locale: 'tr-TR' | 'en-US' = 'tr-TR'; // Default Türkçe

    /**
     * Locale'i ayarla
     */
    setLocale(locale: 'tr-TR' | 'en-US') {
        this.locale = locale;
    }

    /**
     * Locale'e göre terim döndür (public - diğer servislerden kullanılabilir)
     */
    getTerm(term: keyof typeof TURKISH_TERMS): string {
        return this.locale === 'tr-TR' ? TURKISH_TERMS[term] : ENGLISH_TERMS[term];
    }

    /**
     * Citation oluştur - Citeproc-js kullanarak
     */
    formatCitation(
        cslContent: string,
        reference: any,
        options: {
            suppressAuthor?: boolean;
            suppressDate?: boolean;
            pageNumbers?: string;
            prefix?: string;
            suffix?: string;
        } = {}
    ): string {
        try {
            // Locale dosyalarının path'ini bul
            const projectRoot = process.cwd();
            let localesPath = path.join(projectRoot, 'src/resources/locales');
            
            if (!fs.existsSync(localesPath)) {
                localesPath = path.join(projectRoot, 'dist/resources/locales');
            }
            
            const trLocalePath = path.join(localesPath, 'locales-tr-TR.xml');
            const enLocalePath = path.join(localesPath, 'locales-en-US.xml');
            
            // Varsayılan locale'i yükle
            let defaultLocaleXml = '';
            if (fs.existsSync(trLocalePath)) {
                defaultLocaleXml = fs.readFileSync(trLocalePath, 'utf8');
            } else if (fs.existsSync(enLocalePath)) {
                defaultLocaleXml = fs.readFileSync(enLocalePath, 'utf8');
            } else {
                console.warn('⚠️ No locale files found, using fallback citation format');
                return this.fallbackCitationFormat(reference, options);
            }

            // Citeproc-js sistem objesi
            const sys = {
                retrieveLocale: (lang: string) => {
                    if ((lang === 'tr-TR' || lang === 'tr') && fs.existsSync(trLocalePath)) {
                        return fs.readFileSync(trLocalePath, 'utf8');
                    }
                    if ((lang === 'en-US' || lang === 'en') && fs.existsSync(enLocalePath)) {
                        return fs.readFileSync(enLocalePath, 'utf8');
                    }
                    return defaultLocaleXml;
                },
                retrieveItem: (id: string) => {
                    if (id === reference.id) {
                        return reference;
                    }
                    return null;
                },
            };

            // Citeproc engine oluştur — locale'i açıkça geç
            const engine = new CSL.Engine(sys, cslContent, this.locale, true);
            
            // Reference'ı engine'e ekle
            engine.updateItems([reference.id]);

            // Citation item oluştur
            const citationItem: any = {
                id: reference.id,
            };

            // Sayfa numarası varsa locator olarak ekle
            if (options.pageNumbers && options.pageNumbers.trim()) {
                citationItem.locator = options.pageNumbers;
                citationItem.label = 'page';
            }

            // Suppress author/date seçenekleri
            if (options.suppressAuthor) {
                citationItem['suppress-author'] = true;
            }
            if (options.suppressDate) {
                citationItem['suppress-date'] = true;
            }

            // Prefix/suffix
            if (options.prefix) {
                citationItem.prefix = options.prefix;
            }
            if (options.suffix) {
                citationItem.suffix = options.suffix;
            }

            // Citation cluster oluştur
            const citationCluster = {
                citationItems: [citationItem],
                properties: {
                    noteIndex: 0
                }
            };

            // Citation işle
            const [, citationResults] = engine.processCitationCluster(citationCluster, [], []);
            
            if (citationResults && citationResults.length > 0) {
                let result = citationResults[0][1]; // [[index, citationText], ...]
                
                // HTML tag'lerini temizle (citation'da genellikle italic yok ama yine de)
                result = result.replace(/<[^>]+>/g, '');
                
                // HTML entity'leri decode et
                result = result.replace(/&#38;/g, '&');
                result = result.replace(/&amp;/g, '&');
                result = result.replace(/&lt;/g, '<');
                result = result.replace(/&gt;/g, '>');
                result = result.replace(/&quot;/g, '"');
                result = result.replace(/&#39;/g, "'");
                result = result.replace(/&nbsp;/g, ' ');
                
                return result.trim();
            }

            console.warn('⚠️ Citeproc-js returned empty citation, using fallback');
            return this.fallbackCitationFormat(reference, options);

        } catch (error) {
            console.error('❌ Citeproc-js citation processing failed:', error.message);
            return this.fallbackCitationFormat(reference, options);
        }
    }

    /**
     * Numbered style için citation numarası al
     */
    getCitationNumber(referenceId: string): number {
        if (!this.citationNumbers.has(referenceId)) {
            this.citationNumbers.set(referenceId, this.nextNumber++);
        }
        return this.citationNumbers.get(referenceId)!;
    }

    resetCitationNumbers(): void {
        this.citationNumbers.clear();
        this.nextNumber = 1;
    }

    formatBibliography(cslContent: string, reference: any): string {
        try {
            // Locale dosyalarının path'ini bul (hem src hem dist için çalışır)
            const projectRoot = process.cwd();
            let localesPath = path.join(projectRoot, 'src/resources/locales');
            
            // Eğer src'de yoksa dist'te ara
            if (!fs.existsSync(localesPath)) {
                localesPath = path.join(projectRoot, 'dist/resources/locales');
            }
            
            const trLocalePath = path.join(localesPath, 'locales-tr-TR.xml');
            const enLocalePath = path.join(localesPath, 'locales-en-US.xml');
            
            // Varsayılan locale'i yükle (Türkçe varsa Türkçe, yoksa İngilizce)
            let defaultLocaleXml = '';
            if (fs.existsSync(trLocalePath)) {
                defaultLocaleXml = fs.readFileSync(trLocalePath, 'utf8');
            } else if (fs.existsSync(enLocalePath)) {
                defaultLocaleXml = fs.readFileSync(enLocalePath, 'utf8');
            } else {
                console.warn(`⚠️ No locale files found at ${localesPath}, using fallback`);
                return this.fallbackBibliographyFormat(reference);
            }

            // Citeproc-js kullan
            const sys = {
                retrieveLocale: (lang: string) => {
                    // İstenen dile göre locale döndür
                    if ((lang === 'tr-TR' || lang === 'tr') && fs.existsSync(trLocalePath)) {
                        return fs.readFileSync(trLocalePath, 'utf8');
                    }
                    if ((lang === 'en-US' || lang === 'en') && fs.existsSync(enLocalePath)) {
                        return fs.readFileSync(enLocalePath, 'utf8');
                    }
                    return defaultLocaleXml;
                },
                retrieveItem: (id: string) => {
                    if (id === reference.id) {
                        return reference;
                    }
                    return null;
                },
            };

            const engine = new CSL.Engine(sys, cslContent, this.locale, true);
            
            // Reference'ı engine'e ekle
            engine.updateItems([reference.id]);
            
            // Bibliography oluştur
            const [, bibliography] = engine.makeBibliography();
            
            if (bibliography && bibliography.length > 0) {
                let result = bibliography[0];
                
                // HTML italic/bold tag'lerini Word-uyumlu markup'a çevir
                // <i>text</i> → {i}text{/i}
                // <b>text</b> → {b}text{/b}
                result = result.replace(/<i>/gi, '{i}');
                result = result.replace(/<\/i>/gi, '{/i}');
                result = result.replace(/<b>/gi, '{b}');
                result = result.replace(/<\/b>/gi, '{/b}');
                result = result.replace(/<em>/gi, '{i}');
                result = result.replace(/<\/em>/gi, '{/i}');
                result = result.replace(/<strong>/gi, '{b}');
                result = result.replace(/<\/strong>/gi, '{/b}');
                
                // Diğer HTML tag'lerini temizle (div, span, p vb.)
                result = result.replace(/<[^>]+>/g, '');
                
                // HTML entity'leri decode et
                result = result.replace(/&#38;/g, '&');  // &#38; -> &
                result = result.replace(/&amp;/g, '&');
                result = result.replace(/&lt;/g, '<');
                result = result.replace(/&gt;/g, '>');
                result = result.replace(/&quot;/g, '"');
                result = result.replace(/&#39;/g, "'");
                result = result.replace(/&nbsp;/g, ' ');
                result = result.replace(/&#160;/g, ' '); // Non-breaking space
                
                return result.trim();
            }

            console.warn('⚠️ Citeproc-js returned empty bibliography, using fallback');
            return this.fallbackBibliographyFormat(reference);

        } catch (error) {
            console.error('❌ Citeproc-js bibliography processing failed:', error.message);
            return this.fallbackBibliographyFormat(reference);
        }
    }

    private loadLocales(): { trPath: string; enPath: string; defaultXml: string } | null {
        const projectRoot = process.cwd();
        let localesPath = path.join(projectRoot, 'src/resources/locales');
        if (!fs.existsSync(localesPath)) localesPath = path.join(projectRoot, 'dist/resources/locales');
        const trPath = path.join(localesPath, 'locales-tr-TR.xml');
        const enPath = path.join(localesPath, 'locales-en-US.xml');
        let defaultXml = '';
        if (fs.existsSync(trPath)) defaultXml = fs.readFileSync(trPath, 'utf8');
        else if (fs.existsSync(enPath)) defaultXml = fs.readFileSync(enPath, 'utf8');
        else return null;
        return { trPath, enPath, defaultXml };
    }

    private buildSys(locales: { trPath: string; enPath: string; defaultXml: string }, refMap: Map<string, any>) {
        return {
            retrieveLocale: (lang: string) => {
                if ((lang === 'tr-TR' || lang === 'tr') && fs.existsSync(locales.trPath))
                    return fs.readFileSync(locales.trPath, 'utf8');
                if ((lang === 'en-US' || lang === 'en') && fs.existsSync(locales.enPath))
                    return fs.readFileSync(locales.enPath, 'utf8');
                return locales.defaultXml;
            },
            retrieveItem: (id: string) => refMap.get(id) || null,
        };
    }

    private cleanCitationHtml(text: string): string {
        return text.replace(/<[^>]+>/g, '')
            .replace(/&#38;/g, '&').replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
    }

    private cleanBibliographyHtml(text: string): string {
        let r = text;
        r = r.replace(/<i>/gi, '{i}').replace(/<\/i>/gi, '{/i}');
        r = r.replace(/<b>/gi, '{b}').replace(/<\/b>/gi, '{/b}');
        r = r.replace(/<em>/gi, '{i}').replace(/<\/em>/gi, '{/i}');
        r = r.replace(/<strong>/gi, '{b}').replace(/<\/strong>/gi, '{/b}');
        r = r.replace(/<[^>]+>/g, '');
        r = r.replace(/&#38;/g, '&').replace(/&amp;/g, '&');
        r = r.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        r = r.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        r = r.replace(/&nbsp;/g, ' ').replace(/&#160;/g, ' ');
        return r.trim();
    }

    /**
     * Batch format all citations using a SINGLE citeproc engine (correct numbering for Cell/Nature/IEEE).
     * Returns Map<itemId, formattedText>.
     */
    formatCitationsBatch(
        cslContent: string,
        items: Array<{
            id: string;
            reference: any;
            options: { suppressAuthor?: boolean; suppressDate?: boolean; pageNumbers?: string; prefix?: string; suffix?: string; };
        }>
    ): Map<string, string> {
        try {
            const locales = this.loadLocales();
            if (!locales || items.length === 0) return new Map();

            const refMap = new Map<string, any>();
            for (const item of items) refMap.set(item.reference.id, item.reference);

            const engine = new CSL.Engine(this.buildSys(locales, refMap), cslContent, this.locale, true);
            engine.updateItems(Array.from(refMap.keys()));

            const results = new Map<string, string>();
            const prevClusters: Array<[string, number]> = [];
            const indexToItemId: string[] = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const citationID = `cite_${i}`;
                indexToItemId.push(item.id);

                const citationItem: any = { id: item.reference.id };
                if (item.options.pageNumbers?.trim()) { citationItem.locator = item.options.pageNumbers; citationItem.label = 'page'; }
                if (item.options.suppressAuthor) citationItem['suppress-author'] = true;
                if (item.options.suppressDate) citationItem['suppress-date'] = true;
                if (item.options.prefix) citationItem.prefix = item.options.prefix;
                if (item.options.suffix) citationItem.suffix = item.options.suffix;

                const [, citationResults] = engine.processCitationCluster(
                    { citationID, citationItems: [citationItem], properties: { noteIndex: i } },
                    [...prevClusters],
                    []
                );
                prevClusters.push([citationID, i]);

                if (citationResults) {
                    for (const [pos, text] of citationResults) {
                        if (pos < indexToItemId.length) {
                            results.set(indexToItemId[pos], this.cleanCitationHtml(text));
                        }
                    }
                }
            }
            return results;
        } catch (error) {
            console.error('❌ Batch citation formatting failed:', error.message);
            return new Map();
        }
    }

    /**
     * Batch format bibliography using a SINGLE citeproc engine (correct numbering).
     * References should be in document order.
     */
    formatBibliographyBatch(cslContent: string, references: any[]): string[] {
        try {
            const locales = this.loadLocales();
            if (!locales || references.length === 0) return [];

            const refMap = new Map<string, any>();
            for (const ref of references) refMap.set(ref.id, ref);

            const engine = new CSL.Engine(this.buildSys(locales, refMap), cslContent, this.locale, true);
            engine.updateItems(references.map(r => r.id));

            const prevClusters: Array<[string, number]> = [];
            for (let i = 0; i < references.length; i++) {
                const citationID = `bib_${i}`;
                engine.processCitationCluster(
                    { citationID, citationItems: [{ id: references[i].id }], properties: { noteIndex: i } },
                    [...prevClusters],
                    []
                );
                prevClusters.push([citationID, i]);
            }

            const bibResult = engine.makeBibliography();
            if (!bibResult || !bibResult[1]) return [];

            return (bibResult[1] as string[]).map((entry: string) => this.cleanBibliographyHtml(entry));
        } catch (error) {
            console.error('❌ Batch bibliography formatting failed:', error.message);
            return [];
        }
    }

    private processLayout(
        layoutElement: any,
        reference: any,
        options: any
    ): string {
        const prefix = layoutElement.getAttribute('prefix') || '';
        const suffix = layoutElement.getAttribute('suffix') || '';
        const delimiter = layoutElement.getAttribute('delimiter') || '';

        const children = layoutElement.childNodes;
        const processedParts: string[] = [];

        console.log(`📋 processLayout: ${children.length} children found`);

        for (let i = 0; i < children.length; i++) {
            const child = children[i];

            if (child.nodeType === 1) { // ELEMENT_NODE
                console.log(`  Processing child ${i}: ${child.tagName}`);
                const processedPart = this.processElement(child, reference, options);
                console.log(`  Result from ${child.tagName}: "${processedPart}"`);

                if (processedPart && processedPart.trim()) {
                    processedParts.push(processedPart);
                }
            } else {
                console.log(`  Skipping child ${i}: nodeType=${child.nodeType} (not ELEMENT_NODE)`);
            }
        }

        const result = processedParts.join(delimiter);
        const finalResult = `${prefix}${result}${suffix}`;

        console.log(`📋 processLayout result: "${finalResult}" (${processedParts.length} parts)`);

        return finalResult;
    }

    private processElement(
        element: any,
        reference: any,
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
            case 'choose':
                return this.processChoose(element, reference, options);
            case 'if':
                return this.processIf(element, reference, options);
            case 'else-if':
                return this.processElseIf(element, reference, options);
            case 'else':
                return this.processElse(element, reference, options);
            case 'label':
                return this.processLabel(element, reference, options);
            default:
                console.warn(`Unknown CSL element: ${tagName}`);
                return '';
        }
    }

    private processNames(element: any, reference: any, options: any): string {
        const variable = element.getAttribute('variable');
        const elementPrefix = element.getAttribute('prefix') || '';
        const elementSuffix = element.getAttribute('suffix') || '';

        let names: any[] = [];

        switch (variable) {
            case 'author':
                names = reference.author || reference.authors || [];
                break;
            case 'editor':
                names = reference.editor || reference.editors || [];
                break;
            default:
                return '';
        }

        if (!names || names.length === 0) {
            return '';
        }

        const nameElements = element.getElementsByTagName('name');
        const nameElement = nameElements.length > 0 ? nameElements[0] : null;

        const etAlElements = element.getElementsByTagName('et-al');
        const etAlElement = etAlElements.length > 0 ? etAlElements[0] : null;

        const formattedNames = this.formatNamesCorrectly(names, nameElement, etAlElement);

        return `${elementPrefix}${formattedNames}${elementSuffix}`;
    }

    private formatNamesCorrectly(names: any[], nameElement: any | null, etAlElement: any | null): string {
        if (!names || names.length === 0) return '';

        const etAlMin = parseInt(nameElement?.getAttribute('et-al-min') || '4');
        const etAlUseFirst = parseInt(nameElement?.getAttribute('et-al-use-first') || '3');
        const delimiter = nameElement?.getAttribute('delimiter') || ', ';
        const and = nameElement?.getAttribute('and') || 'and'; // CSL'den 'and' değerini al
        const nameAsSort = nameElement?.getAttribute('name-as-sort-order');
        const initializeWith = nameElement?.getAttribute('initialize-with');

        let namesToShow = names;
        let useEtAl = false;

        if (names.length >= etAlMin) {
            namesToShow = names.slice(0, etAlUseFirst);
            useEtAl = true;
        }

        const formattedNames = namesToShow.map((name, index) => {
            let family = '';
            let given = '';

            if (name && typeof name === 'object') {
                family = name.family || name.lastName || '';
                given = name.given || name.firstName || '';

                // Sizin data structure: {"name":"John Doe","affiliation":"MIT"}
                if (!family && !given && name.name) {
                    const parts = name.name.trim().split(' ');
                    family = parts[parts.length - 1];
                    given = parts.slice(0, -1).join(' ');
                }
            } else if (typeof name === 'string') {
                const parts = name.trim().split(' ');
                family = parts[parts.length - 1];
                given = parts.slice(0, -1).join(' ');
            }

            if (!family && !given) {
                return 'Unknown';
            }

            let formattedName = '';

            if (nameAsSort === 'all' || (nameAsSort === 'first' && index === 0)) {
                formattedName = family;
                if (given) {
                    if (initializeWith !== undefined && initializeWith !== null) {
                        const initials = given.split(' ')
                            .map(part => part.charAt(0).toUpperCase())
                            .join(initializeWith);
                        formattedName += `, ${initials}${initializeWith}`;
                    } else {
                        formattedName += `, ${given}`;
                    }
                }
            } else {
                if (given) {
                    if (initializeWith !== undefined && initializeWith !== null) {
                        const initials = given.split(' ')
                            .map(part => part.charAt(0).toUpperCase())
                            .join(initializeWith);
                        formattedName = `${initials}${initializeWith} ${family}`;
                    } else {
                        formattedName = `${given} ${family}`;
                    }
                } else {
                    formattedName = family;
                }
            }

            return formattedName;
        });

        let result = '';
        if (formattedNames.length === 1) {
            result = formattedNames[0];
        } else if (formattedNames.length === 2) {
            // CSL'den gelen 'and' değerini kullan
            const connector = and === 'symbol' ? '&' : and;
            result = `${formattedNames[0]} ${connector} ${formattedNames[1]}`;
        } else {
            const lastIndex = formattedNames.length - 1;
            const firstPart = formattedNames.slice(0, lastIndex).join(delimiter);
            const connector = and === 'symbol' ? '&' : and;
            result = `${firstPart}${delimiter}${connector} ${formattedNames[lastIndex]}`;
        }

        if (useEtAl) {
            result += ` ${this.getTerm('et-al')}`;
        }

        return result;
    }

    private processText(element: any, reference: any, options: any): string {
        const variable = element.getAttribute('variable');
        const value = element.getAttribute('value');
        const macro = element.getAttribute('macro');
        const term = element.getAttribute('term');
        const prefix = element.getAttribute('prefix') || '';
        const suffix = element.getAttribute('suffix') || '';

        let text = '';

        if (term && term.trim()) {
            text = this.processTerm(term);
        } else if (macro && macro.trim()) {
            text = this.processMacro(macro, reference, options);
        } else if (value && value.trim()) {
            text = value;
        } else if (variable && variable.trim()) {
            text = this.getVariableValue(variable, reference, options);
        } else {
            text = this.getElementTextContent(element);
        }

        if (!text || !text.trim()) {
            return '';
        }

        return `${prefix}${text}${suffix}`;
    }

    private processDate(element: any, reference: any): string {
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

    private processNumber(element: any, reference: any): string {
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

    private processGroup(element: any, reference: any, options: any): string {
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

        if (processedParts.length === 0) {
            return '';
        }

        const delimiter = element.getAttribute('delimiter') || '';
        const prefix = element.getAttribute('prefix') || '';
        const suffix = element.getAttribute('suffix') || '';

        const result = processedParts.join(delimiter);
        return `${prefix}${result}${suffix}`;
    }

    private processChoose(element: any, reference: any, options: any): string {
        const children = element.childNodes;
        let elseElement: any = null;

        console.log(`🔀 processChoose: ${children.length} children`);

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.nodeType === 1) { // ELEMENT_NODE
                const tagName = child.tagName.toLowerCase();
                console.log(`  Checking ${tagName} element`);

                if (tagName === 'if') {
                    const conditionMet = this.evaluateCondition(child, reference, options);
                    console.log(`    if condition: ${conditionMet}`);

                    if (conditionMet) {
                        const result = this.processElementChildren(child, reference, options);
                        console.log(`    if result: "${result}"`);
                        return result;
                    }
                } else if (tagName === 'else-if') {
                    const conditionMet = this.evaluateCondition(child, reference, options);
                    console.log(`    else-if condition: ${conditionMet}`);

                    if (conditionMet) {
                        const result = this.processElementChildren(child, reference, options);
                        console.log(`    else-if result: "${result}"`);
                        return result;
                    }
                } else if (tagName === 'else') {
                    // Store else element to process if no conditions are met
                    elseElement = child;
                    console.log(`    else element found, storing for later`);
                }
            }
        }

        // If no conditions were met, process else element if it exists
        if (elseElement) {
            console.log(`  Processing else element`);
            const result = this.processElementChildren(elseElement, reference, options);
            console.log(`  else result: "${result}"`);
            return result;
        }

        console.warn(`⚠️ processChoose: No conditions met and no else element, returning empty`);
        return '';
    }

    private processIf(element: any, reference: any, options: any): string {
        if (this.evaluateCondition(element, reference, options)) {
            return this.processElementChildren(element, reference, options);
        }
        return '';
    }

    private processElseIf(element: any, reference: any, options: any): string {
        if (this.evaluateCondition(element, reference, options)) {
            return this.processElementChildren(element, reference, options);
        }
        return '';
    }

    private processElse(element: any, reference: any, options: any): string {
        return this.processElementChildren(element, reference, options);
    }

    private evaluateCondition(element: any, reference: any, options: any): boolean {
        const variable = element.getAttribute('variable');
        const type = element.getAttribute('type');
        const isNumeric = element.getAttribute('is-numeric');

        console.log(`    evaluateCondition: variable="${variable}", type="${type}", isNumeric="${isNumeric}"`);

        // Variable condition
        if (variable) {
            const variables = variable.split(' ');
            for (const varName of variables) {
                const value = this.getVariableValue(varName.trim(), reference, options);
                console.log(`      Variable "${varName}": "${value}"`);
                if (value && value.trim()) {
                    return true;
                }
            }
            return false;
        }

        // Type condition - FIXED: Actually check reference type
        if (type) {
            const referenceType = this.mapReferenceTypeToCSL(reference.type || 'article');
            const allowedTypes = type.split(' ').map(t => t.trim());


            const matches = allowedTypes.includes(referenceType);
            return matches;
        }

        // Numeric condition
        if (isNumeric) {
            const variables = isNumeric.split(' ');
            for (const varName of variables) {
                const value = this.getVariableValue(varName.trim(), reference, options);
                if (value && !isNaN(parseInt(value))) {
                    return true;
                }
            }
            return false;
        }

        // Default: true
        return true;
    }

    private mapReferenceTypeToCSL(type: string): string {
        const typeMapping = {
            'journal': 'article-journal',
            'article': 'article-journal',
            'magazine': 'article-magazine',
            'newspaper': 'article-newspaper',
            'book': 'book',
            'chapter': 'chapter',
            'book-chapter': 'chapter',
            'conference': 'paper-conference',
            'proceedings': 'paper-conference',
            'thesis': 'thesis',
            'dissertation': 'thesis',
            'report': 'report',
            'webpage': 'webpage',
            'website': 'webpage',
            'blog': 'post-weblog',
            'patent': 'patent',
            'software': 'software',
            'dataset': 'dataset',
            'manuscript': 'manuscript',
            'map': 'map',
            'interview': 'interview',
            'personal-communication': 'personal_communication',
            'speech': 'speech',
            'preprint': 'article',
            'misc': 'document'
        };

        return typeMapping[type?.toLowerCase()] || 'article-journal';
    }

    private processElementChildren(element: any, reference: any, options: any): string {
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

    private getVariableValue(variable: string, reference: any, options: any): string {
        switch (variable) {
            case 'citation-number':
                return this.getCitationNumber(reference.id).toString();
            case 'title':
                return reference.title || '';
            case 'container-title':
                return reference['container-title'] || reference.publication || '';
            case 'publisher':
                return reference.publisher || '';
            case 'volume':
                return reference.volume || '';
            case 'issue':
                return reference.issue || '';
            case 'page':
                return reference.page || reference.pages || '';
            case 'DOI':
                return reference.DOI || reference.doi || '';
            case 'URL':
                return reference.URL || reference.url || '';
            case 'issued':
            case 'year':
                if (reference.issued && reference.issued['date-parts']) {
                    return reference.issued['date-parts'][0][0].toString();
                } else if (reference.year) {
                    return reference.year.toString();
                }
                return '';
            case 'author':
            case 'editor':
                return '';
            default:
                return '';
        }
    }

    private processMacro(macroName: string, reference: any, options: any): string {

        try {
            switch (macroName) {
                // Author macros - STYLE AWARE
                case 'author':
                case 'author-bib':
                case 'author-intext':
                case 'contributors':
                    return this.formatAuthorForStyle(reference, options);

                // Date macros  
                case 'date':
                case 'date-bib':
                    return this.formatBibliographyDate(reference);
                case 'date-intext':
                case 'year':
                case 'issued':
                    return this.formatDateForStyle(reference, options);

                // Title macros
                case 'title':
                case 'title-and-descriptions':
                case 'title-short':
                    return this.formatTitleForStyle(reference);

                // Container/Publication macros
                case 'container':
                case 'container-title':
                case 'publication':
                    return this.formatContainerForStyle(reference);

                // Publisher macros
                case 'publisher':
                case 'publisher-place':
                    return this.formatPublisherForStyle(reference);

                // Access macros (URL, DOI)
                case 'access':
                case 'url':
                case 'doi':
                    return this.formatAccessForStyle(reference);

                // Page/locator macros
                case 'locator':
                    // Citation-specific locator (sayfa numarası)
                    if (reference.locator) {
                        const pagePrefix = reference.locator.includes('-') || reference.locator.includes('–') 
                            ? this.getTerm('pages') 
                            : this.getTerm('page');
                        return `${pagePrefix} ${reference.locator}`;
                    }
                    return '';
                case 'page':
                case 'pages':
                    return this.formatPagesForStyle(reference);

                // Citation macros
                case 'citation-locator':
                    return this.formatCitationLocator(reference, options);
                case 'citation-author-date':
                    return this.formatGenericCitation(reference, options);
                case 'author-short':
                    return this.formatAuthorShort(reference, options);
                case 'citation-number-inline':
                case 'citation-number':
                    return this.getCitationNumber(reference.id).toString();

                // Event macros (conference vb.)
                case 'event':
                    return this.formatEventForStyle(reference);

                default:
                    return ''; // Don't throw error, just return empty
            }
        } catch (error) {
            console.warn(`⚠️ Macro processing failed for ${macroName}:`, error.message);
            return ''; // Return empty instead of throwing
        }
    }

    private formatAuthorForStyle(reference: any, options: any): string {
        if (options.suppressAuthor) return '';

        const authors = reference.authors || reference.author || [];
        if (!authors || authors.length === 0) return '';

        // In-text citation için sadece soyadlar
        if (authors.length === 1) {
            return this.extractLastName(authors[0]);
        } else if (authors.length === 2) {
            const lastName1 = this.extractLastName(authors[0]);
            const lastName2 = this.extractLastName(authors[1]);
            return `${lastName1} & ${lastName2}`;
        } else {
            const lastName = this.extractLastName(authors[0]);
            return `${lastName} ${this.getTerm('et-al')}`;
        }
    }

    private formatDateForStyle(reference: any, options: any): string {
        if (options.suppressDate) return '';
        
        // Birden fazla yıl kaynağını kontrol et
        let year = '';
        
        // 1. Direkt year alanı
        if (reference.year) {
            year = reference.year.toString();
        }
        // 2. issued.year
        else if (reference.issued?.year) {
            year = reference.issued.year.toString();
        }
        // 3. issued['date-parts']
        else if (reference.issued?.['date-parts']?.[0]?.[0]) {
            year = reference.issued['date-parts'][0][0].toString();
        }
        
        return year || this.getTerm('no-date');
    }

    private formatTitleForStyle(reference: any): string {
        const title = reference.title || '';

        if (reference.type === 'book') {
            return `<em>${title}</em>`;  // HTML em tag'i kullan
        }
        return title;
    }

    private formatContainerForStyle(reference: any): string {
        const container = reference.publication || reference['container-title'] || '';

        // Container title'ı italic yapmak için HTML em tag'i kullan
        return container ? `<em>${container}</em>` : '';
    }

    private formatPublisherForStyle(reference: any): string {
        return reference.publisher || '';
    }

    private formatAccessForStyle(reference: any): string {
        const doi = reference.doi || reference.DOI;
        const url = reference.url || reference.URL;

        if (doi) return `https://doi.org/${doi}`;
        if (url) return url;
        return '';
    }

    private formatPagesForStyle(reference: any): string {
        return reference.pages || reference.page || '';
    }

    private formatEventForStyle(reference: any): string {
        return reference.event || reference.conference || '';
    }

    private extractLastName(author: any): string {
        if (!author) return 'Unknown';

        if (typeof author === 'string') {
            const parts = author.trim().split(' ');
            return parts[parts.length - 1];
        }

        if (typeof author === 'object') {
            // Standard fields
            if (author.lastName || author.family) {
                return author.lastName || author.family;
            }

            // Your data structure: {"name":"John Doe","affiliation":"MIT"}
            if (author.name) {
                const parts = author.name.trim().split(' ');
                return parts[parts.length - 1];
            }
        }

        return 'Unknown';
    }

    private formatBibliographyDate(reference: any): string {

        // Try multiple sources for year - COMPREHENSIVE CHECK
        let year = '';

        // 1. Direct year field (en yaygın)
        if (reference.year && reference.year !== '') {
            const yearValue = reference.year.toString().trim();
            if (yearValue !== '' && !isNaN(parseInt(yearValue))) {
                year = yearValue;
            }
        }

        // 2. Issued object with year property
        if (!year && reference.issued && reference.issued.year) {
            const yearValue = reference.issued.year.toString().trim();
            if (yearValue !== '' && !isNaN(parseInt(yearValue))) {
                year = yearValue;
            }
        }

        // 3. Issued date-parts array
        if (!year && reference.issued && reference.issued['date-parts']) {
            const dateParts = reference.issued['date-parts'];
            if (Array.isArray(dateParts) && dateParts.length > 0 &&
                Array.isArray(dateParts[0]) && dateParts[0].length > 0) {
                const yearValue = dateParts[0][0];
                if (yearValue && !isNaN(parseInt(yearValue.toString()))) {
                    year = yearValue.toString();
                }
            }
        }

        // 4. publishedDate, publicationDate gibi alternatif alanlar
        if (!year) {
            const altDateFields = ['publishedDate', 'publicationDate', 'datePublished'];
            for (const field of altDateFields) {
                if (reference[field]) {
                    const dateStr = reference[field].toString();
                    const yearMatch = dateStr.match(/\d{4}/);
                    if (yearMatch) {
                        year = yearMatch[0];
                        break;
                    }
                }
            }
        }


        // Return year or Turkish fallback (t.y. = tarih yok)
        return year || this.getTerm('no-date');
    }

    private formatAuthorIntext(reference: any, options: any): string {
        if (options.suppressAuthor) {
            return '';
        }

        const authors = reference.authors || reference.author || [];

        if (!authors || authors.length === 0) {
            return '';
        }

        if (authors.length === 1) {
            const author = authors[0];
            const lastName = this.extractLastName(author);
            return lastName;
        } else if (authors.length === 2) {
            const author1 = authors[0];
            const author2 = authors[1];
            const lastName1 = this.extractLastName(author1);
            const lastName2 = this.extractLastName(author2);
            return `${lastName1} & ${lastName2}`;
        } else {
            const firstAuthor = authors[0];
            const lastName = this.extractLastName(firstAuthor);
            return `${lastName} ${this.getTerm('et-al')}`;
        }
    }

    private formatDateIntext(reference: any, options: any): string {
        if (options.suppressDate) {
            return '';
        }

        // Birden fazla yıl kaynağını kontrol et
        if (reference.year) {
            return reference.year.toString();
        } else if (reference.issued?.year) {
            return reference.issued.year.toString();
        } else if (reference.issued?.['date-parts']?.[0]?.[0]) {
            return reference.issued['date-parts'][0][0].toString();
        }
        
        return this.getTerm('no-date');
    }

    private formatCitationLocator(reference: any, options: any): string {
        if (options.pageNumbers && options.pageNumbers.trim()) {
            const pagePrefix = options.pageNumbers.includes('-') || options.pageNumbers.includes('–') 
                ? this.getTerm('pages') 
                : this.getTerm('page');
            return `${pagePrefix} ${options.pageNumbers}`;
        }
        return '';
    }

    private formatGenericCitation(reference: any, options: any): string {
        const parts: string[] = [];

        if (!options.suppressAuthor) {
            const authorPart = this.formatAuthorIntext(reference, options);
            if (authorPart) {
                parts.push(authorPart);
            }
        }

        if (!options.suppressDate) {
            const datePart = this.formatDateIntext(reference, options);
            if (datePart) {
                parts.push(datePart);
            }
        }

        return parts.join(', ');
    }

    private formatAuthorShort(reference: any, options: any): string {
        if (options.suppressAuthor) {
            return '';
        }

        const authors = reference.authors || reference.author || [];

        if (!authors || authors.length === 0) {
            return '';
        }

        if (authors.length === 1) {
            return this.extractLastName(authors[0]);
        } else if (authors.length === 2) {
            const lastName1 = this.extractLastName(authors[0]);
            const lastName2 = this.extractLastName(authors[1]);
            return `${lastName1} ${this.getTerm('and')} ${lastName2}`;
        } else {
            const lastName = this.extractLastName(authors[0]);
            return `${lastName} ${this.getTerm('et-al')}`;
        }
    }

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

    private processTerm(termName: string): string {
        if (this.locale === 'tr-TR') {
            switch (termName) {
                case 'ibid': return '';
                case 'and': return 've';
                case 'et-al': return 'vd.';
                case 'page': return 's.';
                case 'pages': return 'ss.';
                case 'at': return '';
                case 'editor': case 'editors': return 'ed.';
                case 'translator': case 'translators': return 'çev.';
                case 'volume': case 'volumes': return 'c.';
                case 'number': return 'no.';
                case 'issue': return 'sayı';
                case 'edition': return 'baskı';
                default: return '';
            }
        }
        // en-US
        switch (termName) {
            case 'ibid': return '';
            case 'and': return 'and';
            case 'et-al': return 'et al.';
            case 'page': return 'p.';
            case 'pages': return 'pp.';
            case 'at': return '';
            case 'editor': return 'Ed.';
            case 'editors': return 'Eds.';
            case 'translator': case 'translators': return 'Trans.';
            case 'volume': case 'volumes': return 'Vol.';
            case 'number': return 'No.';
            case 'issue': return 'No.';
            case 'edition': return 'ed.';
            default: return '';
        }
    }

    private processLabel(element: any, _reference: any, _options: any): string {
        const variable = element.getAttribute('variable');
        const form = element.getAttribute('form') || 'long';

        if (this.locale === 'tr-TR') {
            switch (variable) {
                case 'page': return form === 'short' ? 's.' : 'sayfa';
                case 'volume': return form === 'short' ? 'c.' : 'cilt';
                case 'issue': return form === 'short' ? 'no.' : 'sayı';
                default: return '';
            }
        }
        // en-US
        switch (variable) {
            case 'page': return form === 'short' ? 'p.' : 'page';
            case 'volume': return form === 'short' ? 'Vol.' : 'volume';
            case 'issue': return form === 'short' ? 'No.' : 'issue';
            default: return '';
        }
    }

    private fallbackCitationFormat(reference: any, options: any): string {
        // Fallback: author-date format kullan
        return this.formatAuthorDateCitation(reference, options);
    }

    /**
     * Numbered citation formatı (IEEE vb. için fallback)
     */
    private formatNumberedCitation(reference: any, options: any): string {
        const citationNumber = this.getCitationNumber(reference.id);

        let result = `[${citationNumber}]`;

        if (options.pageNumbers && options.pageNumbers.trim()) {
            const pagePrefix = options.pageNumbers.includes('-') || options.pageNumbers.includes('–') 
                ? this.getTerm('pages') 
                : this.getTerm('page');
            result += `, ${pagePrefix} ${options.pageNumbers}`;
        }

        const prefix = options.prefix || '';
        const suffix = options.suffix || '';

        return `${prefix}${result}${suffix}`;
    }

    private formatAuthorDateCitation(reference: any, options: any): string {
        let authorText = '';
        if (!options.suppressAuthor) {
            const authors = reference.authors || reference.author || [];
            if (authors && authors.length > 0) {
                if (authors.length === 1) {
                    authorText = this.extractLastName(authors[0]);
                } else if (authors.length === 2) {
                    const lastName1 = this.extractLastName(authors[0]);
                    const lastName2 = this.extractLastName(authors[1]);
                    authorText = `${lastName1} & ${lastName2}`;
                } else {
                    const lastName = this.extractLastName(authors[0]);
                    authorText = `${lastName} ${this.getTerm('et-al')}`;
                }
            }
        }

        // Yılı birden fazla kaynaktan al
        let yearText = '';
        if (!options.suppressDate) {
            if (reference.year) {
                yearText = reference.year.toString();
            } else if (reference.issued?.year) {
                yearText = reference.issued.year.toString();
            } else if (reference.issued?.['date-parts']?.[0]?.[0]) {
                yearText = reference.issued['date-parts'][0][0].toString();
            }
        }

        let pageText = '';
        if (options.pageNumbers) {
            const pagePrefix = options.pageNumbers.includes('-') || options.pageNumbers.includes('–') 
                ? this.getTerm('pages') 
                : this.getTerm('page');
            pageText = `, ${pagePrefix} ${options.pageNumbers}`;
        }

        const prefix = options.prefix || '';
        const suffix = options.suffix || '';

        if (authorText && yearText) {
            return `${prefix}(${authorText}, ${yearText}${pageText})${suffix}`;
        } else if (authorText) {
            return `${prefix}(${authorText}, ${this.getTerm('no-date')}${pageText})${suffix}`;
        } else if (yearText) {
            return `${prefix}(${yearText}${pageText})${suffix}`;
        } else {
            return `${prefix}(${this.getTerm('no-date')}${pageText})${suffix}`;
        }
    }

    private fallbackBibliographyFormat(reference: any): string {

        let result = '';

        // Author(s)
        const authors = reference.authors || reference.author || [];
        if (authors && authors.length > 0) {
            if (authors.length === 1) {
                const author = authors[0];
                const lastName = this.extractLastName(author);
                const firstName = this.extractFirstName(author);
                result += `${lastName}, ${firstName.charAt(0)}.`;
            } else if (authors.length <= 3) {
                const authorStrings = authors.map((author, index) => {
                    const lastName = this.extractLastName(author);
                    const firstName = this.extractFirstName(author);
                    if (index === 0) {
                        return `${lastName}, ${firstName.charAt(0)}.`;
                    } else {
                        return `${firstName.charAt(0)}. ${lastName}`;
                    }
                });
                result += authorStrings.join(', ');
            } else {
                const firstAuthor = authors[0];
                const lastName = this.extractLastName(firstAuthor);
                const firstName = this.extractFirstName(firstAuthor);
                result += `${lastName}, ${firstName.charAt(0)}., ${this.getTerm('et-al')}`;
            }
        } else {
            result += 'Unknown Author';
        }

        // Year
        const year = reference.year?.toString() || this.getTerm('no-date');
        result += ` (${year}).`;

        // Title
        const title = reference.title || 'Untitled';
        result += ` ${title}.`;

        // Publication details
        const publication = reference.publication || reference['container-title'] || '';
        if (publication) {
            result += ` *${publication}*`;

            if (reference.volume) {
                result += `, ${reference.volume}`;
            }

            if (reference.issue) {
                result += `(${reference.issue})`;
            }

            if (reference.pages) {
                result += `, ${reference.pages}`;
            }

            result += '.';
        }

        // DOI or URL
        const doi = reference.doi || reference.DOI;
        const url = reference.url || reference.URL;

        if (doi) {
            result += ` https://doi.org/${doi}`;
        } else if (url) {
            result += ` ${url}`;
        }


        return result;
    }

    private extractFirstName(author: any): string {
        if (!author) return '';

        if (typeof author === 'string') {
            const parts = author.trim().split(' ');
            return parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
        }

        if (typeof author === 'object') {
            if (author.firstName || author.given) {
                return author.firstName || author.given;
            }
            if (author.name) {
                const parts = author.name.trim().split(' ');
                return parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
            }
        }

        return '';
    }

    setCitationNumbers(referenceNumberMap: Map<string, number>): void {

        this.citationNumbers.clear();
        referenceNumberMap.forEach((number, referenceId) => {
            this.citationNumbers.set(referenceId, number);
        });

        this.nextNumber = Math.max(...Array.from(referenceNumberMap.values())) + 1;
    }
    
    presetCitationNumbers(referenceNumberMap: Map<string, number>): void {

        // Citation numbers map'ini temizle ve yeniden set et
        this.citationNumbers.clear();
        referenceNumberMap.forEach((number, referenceId) => {
            this.citationNumbers.set(referenceId, number);
        });

        // Next number'ı güncel tut
        this.nextNumber = Math.max(...Array.from(referenceNumberMap.values())) + 1;

    }
}