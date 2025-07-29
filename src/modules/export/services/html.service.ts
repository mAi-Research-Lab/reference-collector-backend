import { Injectable } from "@nestjs/common";
import { CitationStyle } from "src/modules/documents/enums/citation.enum";
import { ReferencesResponse } from "src/modules/references/dto/reference/references.response";

interface HtmlExportOptions {
    title?: string;
    citationStyle?: CitationStyle;
    customCss?: string;
}

@Injectable()
export class HtmlExportService {

    exportToHtml(references: ReferencesResponse[], options: HtmlExportOptions): string {
        const title = options.title || 'Bibliography';
        const style = options.citationStyle || CitationStyle.APA;
        const customCss = options.customCss || this.getDefaultCss();

        const formattedRefs = references.map(ref =>
            this.formatReferenceAsHtml(ref, style)
        );

        return this.generateHtmlDocument(title, formattedRefs, customCss);
    }

    generateHtmlDocument(title: string, references: string[], css: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${css}</style>
</head>
<body>
    <div class="container">
        <h1 class="bibliography-title">${title}</h1>
        <div class="references">
            ${references.map(ref => `<div class="reference-item">${ref}</div>`).join('\n            ')}
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Tek referansı HTML formatında formatla
     */
    formatReferenceAsHtml(ref: ReferencesResponse, style: CitationStyle): string {
        let formatted = '';

        switch (style) {
            case CitationStyle.APA:
                formatted = this.formatApaHtml(ref);
                break;
            case CitationStyle.MLA:
                formatted = this.formatMlaHtml(ref);
                break;
            case CitationStyle.CHICAGO:
                formatted = this.formatChicagoHtml(ref);
                break;
        }

        return formatted;
    }

    formatApaHtml(ref: ReferencesResponse): string {
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
                result += `<span class="authors">${authors}</span>`;
            }
        }

        // Year
        if (ref.year) {
            result += ` <span class="year">(${ref.year})</span>.`;
        }

        // Title
        if (ref.title) {
            if (ref.type === 'journal') {
                result += ` <span class="title">${this.escapeHtml(ref.title)}</span>.`;
            } else {
                result += ` <span class="title"><em>${this.escapeHtml(ref.title)}</em></span>.`;
            }
        }

        // Journal info
        if (metadata.journal || ref.publication) {
            const journalName = metadata.journal || ref.publication;
            result += ` <span class="journal"><em>${this.escapeHtml(journalName)}</em></span>`;
            if (ref.volume) result += `, <span class="volume">${ref.volume}</span>`;
            if (ref.issue) result += `(<span class="issue">${ref.issue}</span>)`;
            if (ref.pages) result += `, <span class="pages">${ref.pages}</span>`;
        }

        // DOI/URL
        if (ref.doi) {
            result += ` <a href="https://doi.org/${ref.doi}" class="doi">https://doi.org/${ref.doi}</a>`;
        } else if (ref.url) {
            result += ` <a href="${ref.url}" class="url">${ref.url}</a>`;
        }

        return result || `<span class="title">${this.escapeHtml(ref.title || 'Untitled')}</span>`;
    }

    formatMlaHtml(ref: ReferencesResponse): string {
        let result = '';
        const metadata = ref.metadata || {};

        // ✅ FIXED: Authors kontrolü
        if (ref.authors && Array.isArray(ref.authors) && ref.authors.length > 0) {
            const firstAuthor = ref.authors[0];
            if (firstAuthor && (firstAuthor.firstName || firstAuthor.lastName)) {
                result += `${firstAuthor.lastName || ''}, ${firstAuthor.firstName || ''}`;
                if (ref.authors.length > 1) result += ', et al';
            }
        }

        if (ref.title) result += `. "${this.escapeHtml(ref.title)}"`;
        if (metadata.journal || ref.publication) {
            const journalName = metadata.journal || ref.publication;
            result += ` <em>${this.escapeHtml(journalName)}</em>`;
        }
        if (ref.year) result += `, ${ref.year}`;

        return result + '.' || `"${this.escapeHtml(ref.title || 'Untitled')}"`;
    }

    formatChicagoHtml(ref: ReferencesResponse): string {
        return this.formatApaHtml(ref);
    }

    /**
     * HTML karakterlerini escape et
     */
    private escapeHtml(text: string): string {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    getDefaultCss(): string {
        return `
body {
    font-family: 'Times New Roman', serif;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: #fff;
}

.container {
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.bibliography-title {
    text-align: center;
    color: #333;
    border-bottom: 2px solid #333;
    padding-bottom: 10px;
    margin-bottom: 30px;
}

.references {
    line-height: 1.8;
}

.reference-item {
    margin-bottom: 1.5em;
    padding-left: 2em;
    text-indent: -2em;
    text-align: justify;
}

.authors {
    font-weight: normal;
}

.year {
    font-weight: normal;
}

.title {
    font-weight: normal;
}

.journal {
    font-style: italic;
}

.doi, .url {
    color: #0066cc;
    text-decoration: none;
}

.doi:hover, .url:hover {
    text-decoration: underline;
}

@media print {
    body { margin: 0; }
    .container { box-shadow: none; }
}`;
    }
}
