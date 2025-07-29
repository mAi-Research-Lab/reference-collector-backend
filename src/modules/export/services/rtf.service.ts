import { Injectable } from "@nestjs/common";
import { CitationStyle } from "src/modules/documents/enums/citation.enum";
import { ReferencesResponse } from "src/modules/references/dto/reference/references.response";

@Injectable()
export class RtfExportService {

    exportToRtf(references: ReferencesResponse[], style: CitationStyle = CitationStyle.APA): string {
        const rtfHeader = this.generateRtfHeader();
        const formattedRefs = references.map(ref => this.formatReferenceAsRtf(ref, style));
        const rtfBody = formattedRefs.join('\\par\\par\n');
        const rtfFooter = '}';

        return `${rtfHeader}\n${rtfBody}\n${rtfFooter}`;
    }

    generateRtfHeader(): string {
        return `{\\rtf1\\ansi\\deff0 
{\\fonttbl 
{\\f0 Times New Roman;}
{\\f1 Arial;}
}
{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;}
\\f0\\fs24`;
    }

    formatReferenceAsRtf(ref: ReferencesResponse, style: CitationStyle): string {
        let formatted = '';

        switch (style) {
            case CitationStyle.APA:
                formatted = this.formatApaStyle(ref);
                break;
            case CitationStyle.MLA:
                formatted = this.formatMlaStyle(ref);
                break;
            case CitationStyle.CHICAGO:
                formatted = this.formatChicagoStyle(ref);
                break;
            default:
                formatted = this.formatApaStyle(ref);
        }

        return this.applyRtfFormatting(formatted);
    }

    formatApaStyle(ref: ReferencesResponse): string {
        let result = '';
        const metadata = ref.metadata || {};

        // ✅ FIXED: Authors kontrolü
        if (ref.authors && Array.isArray(ref.authors) && ref.authors.length > 0) {
            const authors = ref.authors
                .filter(a => a && (a.firstName || a.lastName)) // Boş yazarları filtrele
                .map(a => {
                    const firstName = a.firstName || '';
                    const lastName = a.lastName || '';
                    const firstInitial = firstName ? firstName.charAt(0) + '.' : '';
                    return lastName ? `${lastName}, ${firstInitial}` : firstInitial;
                })
                .filter(author => author.trim() !== ', ') // Boş yazarları temizle
                .join(', ');
            
            if (authors) {
                result += authors;
            }
        }

        // Year
        if (ref.year) {
            result += ` (${ref.year}).`;
        }

        // Title
        if (ref.title) {
            if (ref.type === 'journal') {
                result += ` ${this.escapeRtf(ref.title)}.`;
            } else {
                result += ` {\\i ${this.escapeRtf(ref.title)}}.`;
            }
        }

        // Type-specific formatting
        switch (ref.type) {
            case 'journal':
                { const journalName = metadata.journal || ref.publication;
                if (journalName) result += ` {\\i ${this.escapeRtf(journalName)}}`;
                if (ref.volume) result += `, ${ref.volume}`;
                if (ref.issue) result += `(${ref.issue})`;
                if (ref.pages) result += `, ${ref.pages}`;
                break; }

            case 'book':
                if (ref.publisher) result += ` ${this.escapeRtf(ref.publisher)}`;
                if (metadata.location) result += `, ${this.escapeRtf(metadata.location)}`;
                break;
        }

        // DOI
        if (ref.doi) result += ` https://doi.org/${ref.doi}`;

        return result + '.' || this.escapeRtf(ref.title || 'Untitled') + '.';
    }

    formatMlaStyle(ref: ReferencesResponse): string {
        let result = '';
        const metadata = ref.metadata || {};

        // ✅ FIXED: Authors kontrolü
        if (ref.authors && Array.isArray(ref.authors) && ref.authors.length > 0) {
            const firstAuthor = ref.authors[0];
            if (firstAuthor && (firstAuthor.firstName || firstAuthor.lastName)) {
                const firstName = firstAuthor.firstName || '';
                const lastName = firstAuthor.lastName || '';
                result += `${lastName}, ${firstName}`;
                if (ref.authors.length > 1) result += ', et al';
            }
        }

        if (ref.title) result += `. "${this.escapeRtf(ref.title)}"`;
        
        const journalName = metadata.journal || ref.publication;
        if (journalName) result += ` {\\i ${this.escapeRtf(journalName)}}`;
        
        if (ref.year) result += `, ${ref.year}`;

        return result + '.' || `"${this.escapeRtf(ref.title || 'Untitled')}"`;
    }
    
    formatChicagoStyle(ref: ReferencesResponse): string {
        return this.formatApaStyle(ref);
    }

    /**
     * RTF için özel karakterleri escape et
     */
    private escapeRtf(text: string): string {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\n/g, '\\par ')
            .replace(/\r/g, '');
    }

    applyRtfFormatting(text: string): string {
        return text
            .replace(/\{\\i ([^}]+)\}/g, '{\\i $1}')
            .replace(/\{\\b ([^}]+)\}/g, '{\\b $1}');
    }
}