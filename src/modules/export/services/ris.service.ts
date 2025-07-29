import { Injectable } from "@nestjs/common";
import { ReferencesResponse } from "src/modules/references/dto/reference/references.response";

@Injectable()
export class RisExportService {
    exportToRis(references: ReferencesResponse[]): string {
        const risEntries = references.map(ref => this.formatRisEntry(ref));
        return risEntries.join('\n\n');
    }

    formatRisEntry(ref: ReferencesResponse): string {
        const fields: string[] = [];

        fields.push(`TY  - ${this.getRisType(ref.type)}`);
        const metadata = ref.metadata || {};

        if (ref.authors) {
            ref.authors.forEach(author => {
                fields.push(`AU  - ${author.lastName}, ${author.firstName}`);
            });
        }

        if (ref.title) fields.push(`TI  - ${ref.title}`);
        if (ref.year) fields.push(`PY  - ${ref.year}`);
        if (metadata.abstract) fields.push(`AB  - ${metadata.abstract}`);
        if (ref.doi) fields.push(`DO  - ${ref.doi}`);
        if (ref.url) fields.push(`UR  - ${ref.url}`);

        // Tip özel alanlar
        switch (ref.type) {
            case 'journal':
                if (metadata.journal) fields.push(`JO  - ${metadata.journal}`);
                if (ref.volume) fields.push(`VL  - ${ref.volume}`);
                if (ref.issue) fields.push(`IS  - ${ref.issue}`);
                if (ref.pages) fields.push(`SP  - ${ref.pages.split('-')[0]}`);
                if (ref.pages?.includes('-')) {
                    fields.push(`EP  - ${ref.pages.split('-')[1]}`);
                }
                break;

            case 'book':
                if (ref.publisher) fields.push(`PB  - ${ref.publisher}`);
                if (metadata.location) fields.push(`CY  - ${metadata.location}`);
                if (ref.isbn) fields.push(`SN  - ${ref.isbn}`);
                break;

            case 'conference':
                if (metadata.booktitle) fields.push(`BT  - ${metadata.booktitle}`);
                if (metadata.conference) fields.push(`T2  - ${metadata.conference}`);
                break;
        }

        if (metadata.keywords) {
            metadata.keywords.forEach(keyword => {
                fields.push(`KW  - ${keyword}`);
            });
        }

        fields.push('ER  - ');

        return fields.join('\n');
    }

    getRisType(type: string): string {
        const typeMap = {
            'journal': 'JOUR',
            'book': 'BOOK',
            'chapter': 'CHAP',
            'conference': 'CONF',
            'thesis': 'THES',
            'website': 'ELEC',
            'report': 'RPRT',
            'newspaper': 'NEWS'
        };
        return typeMap[type] || 'GEN';
    }
}