import { Injectable } from "@nestjs/common";
import { ReferencesResponse } from "src/modules/references/dto/reference/references.response";

@Injectable()
export class CsvExportService {
    
    exportToCsv(references: ReferencesResponse[]): string {
        const headers = this.getCsvHeaders();
        const csvRows = [headers];
        
        references.forEach(ref => {
            const row = this.formatReferenceAsCsv(ref);
            csvRows.push(row);
        });
        
        return csvRows.map(row => this.formatCsvRow(row)).join('\n');
    }

    private getCsvHeaders(): string[] {
        return [
            'Type',
            'Title', 
            'Authors',
            'Year',
            'Journal/Publication',
            'Volume',
            'Issue',
            'Pages',
            'Publisher',
            'DOI',
            'URL',
            'Abstract',
            'ISBN',
            'ISSN',
            'Language',
            'Keywords',
            'Notes'
        ];
    }

    private formatReferenceAsCsv(ref: ReferencesResponse): string[] {
        const metadata = ref.metadata || {};
        
        // Authors formatting
        let authorsStr = '';
        if (ref.authors && Array.isArray(ref.authors) && ref.authors.length > 0) {
            authorsStr = ref.authors
                .filter(a => a && (a.firstName || a.lastName))
                .map(a => {
                    const firstName = a.firstName || '';
                    const lastName = a.lastName || '';
                    return `${firstName} ${lastName}`.trim();
                })
                .filter(author => author)
                .join('; ');
        }

        // Keywords formatting
        let keywordsStr = '';
        if (metadata.keywords && Array.isArray(metadata.keywords)) {
            keywordsStr = metadata.keywords.join('; ');
        }

        // Journal/Publication name
        const journalName = metadata.journal || ref.publication || '';

        return [
            ref.type || '',
            ref.title || '',
            authorsStr,
            ref.year?.toString() || '',
            journalName,
            ref.volume || '',
            ref.issue || '',
            ref.pages || '',
            ref.publisher || '',
            ref.doi || '',
            ref.url || '',
            ref.abstractText || '',
            ref.isbn || '',
            ref.issn || '',
            ref.language || '',
            keywordsStr,
            metadata.notes || ''
        ];
    }

    private formatCsvRow(row: string[]): string {
        return row.map(cell => this.escapeCsvCell(cell)).join(',');
    }

    private escapeCsvCell(cell: string): string {
        if (!cell) return '""';
        
        // Check if cell contains comma, quote, or newline
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
            // Escape quotes by doubling them
            const escaped = cell.replace(/"/g, '""');
            return `"${escaped}"`;
        }
        
        return `"${cell}"`;
    }
}