import { Injectable } from "@nestjs/common";
import { ReferencesResponse } from "src/modules/references/dto/reference/references.response";

@Injectable()
export class BibtexExportService {
    exportToBibtex(references: ReferencesResponse[]): string {
        const bibtexEntries = references.map(ref => this.formatReference(ref));
        return bibtexEntries.join('\n\n');
    }

    formatReference(ref: ReferencesResponse): string {
        const citeKey = this.generateCiteKey(ref);
        const type = this.mapReferenceType(ref.type);

        const metadata = ref.metadata || {};

        const fields: string[] = [];

        if (ref.title) fields.push(`  title = {${this.escapeSpecialChars(ref.title)}}`);
        if (ref.authors) fields.push(`  author = {${this.formatAuthors(ref.authors)}}`);
        if (ref.year) fields.push(`  year = {${ref.year}}`);

        switch (ref.type) {
            case 'journal':
                { const journal = metadata.journal || ref.publication;
                if (journal) fields.push(`  journal = {${this.escapeSpecialChars(journal)}}`);
                if (ref.volume) fields.push(`  volume = {${ref.volume}}`);
                if (ref.issue) fields.push(`  number = {${ref.issue}}`);
                if (ref.pages) fields.push(`  pages = {${ref.pages}}`);
                break; }

            case 'book':
                if (ref.publisher) fields.push(`  publisher = {${this.escapeSpecialChars(ref.publisher)}}`);
                if (metadata.location) fields.push(`  address = {${this.escapeSpecialChars(metadata.location)}}`);
                if (metadata.edition) fields.push(`  edition = {${metadata.edition}}`);
                if (ref.isbn) fields.push(`  isbn = {${ref.isbn}}`);
                if (metadata.series) fields.push(`  series = {${this.escapeSpecialChars(metadata.series)}}`);
                if (metadata.seriesNumber) fields.push(`  number = {${metadata.seriesNumber}}`);
                break;

            case 'chapter':
                if (ref.publisher) fields.push(`  publisher = {${this.escapeSpecialChars(ref.publisher)}}`);
                if (metadata.booktitle) fields.push(`  booktitle = {${this.escapeSpecialChars(metadata.booktitle)}}`);
                if (metadata.location) fields.push(`  address = {${this.escapeSpecialChars(metadata.location)}}`);
                if (metadata.edition) fields.push(`  edition = {${metadata.edition}}`);
                if (ref.pages) fields.push(`  pages = {${ref.pages}}`);
                if (metadata.chapter) fields.push(`  chapter = {${metadata.chapter}}`);
                break;

            case 'conference':
                if (metadata.booktitle) fields.push(`  booktitle = {${this.escapeSpecialChars(metadata.booktitle)}}`);
                if (metadata.organization) fields.push(`  organization = {${this.escapeSpecialChars(metadata.organization)}}`);
                if (metadata.conference) fields.push(`  note = {Conference: ${this.escapeSpecialChars(metadata.conference)}}`);
                if (metadata.location) fields.push(`  address = {${this.escapeSpecialChars(metadata.location)}}`);
                if (ref.pages) fields.push(`  pages = {${ref.pages}}`);
                break;

            case 'thesis':
                if (metadata.school) fields.push(`  school = {${this.escapeSpecialChars(metadata.school)}}`);
                if (metadata.degree) fields.push(`  type = {${metadata.degree}}`);
                if (metadata.department) fields.push(`  note = {Department: ${this.escapeSpecialChars(metadata.department)}}`);
                break;

            case 'website':
                if (ref.url) fields.push(`  url = {${ref.url}}`);
                if (metadata.accessDate) fields.push(`  note = {Accessed: ${metadata.accessDate}}`);
                if (metadata.websiteTitle) fields.push(`  journal = {${this.escapeSpecialChars(metadata.websiteTitle)}}`);
                break;

            case 'report':
                if (ref.publisher) fields.push(`  institution = {${this.escapeSpecialChars(ref.publisher)}}`);
                if (metadata.reportNumber) fields.push(`  number = {${metadata.reportNumber}}`);
                if (metadata.location) fields.push(`  address = {${this.escapeSpecialChars(metadata.location)}}`);
                break;
        }

        if (ref.doi) fields.push(`  doi = {${ref.doi}}`);
        if (ref.abstractText) fields.push(`  abstract = {${this.escapeSpecialChars(ref.abstractText)}}`);

        if (metadata.keywords && Array.isArray(metadata.keywords)) {
            fields.push(`  keywords = {${metadata.keywords.join(', ')}}`);
        }

        if (ref.language) fields.push(`  language = {${ref.language}}`);

        if (ref.issn) fields.push(`  issn = {${ref.issn}}`);

        return `@${type}{${citeKey},\n${fields.join(',\n')}\n}`;
    }
    escapeSpecialChars(text: string): string {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\textbackslash{}')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\$/g, '\\$')
            .replace(/&/g, '\\&')
            .replace(/%/g, '\\%')
            .replace(/#/g, '\\#')
            .replace(/\^/g, '\\textasciicircum{}')
            .replace(/_/g, '\\_')
            .replace(/~/g, '\\textasciitilde{}');
    }

    generateCiteKey(ref: ReferencesResponse): string {
        const firstAuthor = ref.authors?.[0]?.lastName || 'Unknown';
        const year = ref.year || 'NoYear';
        const firstWord = ref.title?.split(' ')[0]?.replace(/[^a-zA-Z0-9]/g, '') || 'Untitled';

        return `${firstAuthor}_${year}_${firstWord}`;
    }

    formatAuthors(authors: any[]): string {
        if (!authors || !Array.isArray(authors)) return '';

        return authors
            .map(author => {
                if (typeof author === 'object') {
                    return `${author.lastName || author.last_name || ''}, ${author.firstName || author.first_name || ''}`;
                }
                return author;
            })
            .filter(author => author.trim() !== ', ')
            .join(' and ');
    }

    mapReferenceType(type: string): string {
        const typeMap = {
            'journal': 'article',
            'book': 'book',
            'chapter': 'inbook',
            'conference': 'inproceedings',
            'thesis': 'phdthesis',
            'website': 'misc',
            'report': 'techreport',
            'newspaper': 'article',
            'magazine': 'article',
            'patent': 'misc',
            'software': 'misc'
        };
        return typeMap[type] || 'misc';
    }
}