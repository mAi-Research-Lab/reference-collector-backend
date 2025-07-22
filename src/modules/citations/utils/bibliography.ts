import { ReferencesResponse } from "src/modules/references/dto/reference/references.response";

export function formatAPABibliography(reference: ReferencesResponse): string {
    let entry = '';

    if (reference.authors && reference.authors.length > 0) {
        const authorNames = reference.authors.map((author: any) =>
            `${author.lastName}, ${author.firstName?.charAt(0)}.`
        ).join(', ');
        entry += authorNames;
    } else {
        entry += 'Unknown Author';
    }

    entry += ` (${reference.year || 'n.d.'}).`;

    entry += ` ${reference.title}.`;

    if (reference.publication) {
        entry += ` ${reference.publication}`;

        if (reference.volume) {
            entry += `, ${reference.volume}`;
        }

        if (reference.issue) {
            entry += `(${reference.issue})`;
        }

        if (reference.pages) {
            entry += `, ${reference.pages}`;
        }
    }

    if (reference.doi) {
        entry += ` https://doi.org/${reference.doi}`;
    }

    return entry;
}

export function getFirstAuthorLastName(reference: ReferencesResponse): string {
    if (reference?.authors && reference.authors.length > 0) {
        return reference.authors[0].lastName || 'Unknown';
    }
    return 'Unknown';
}