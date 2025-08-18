// APA Style formatting
export function formatAPA(reference: any, options: { suppressAuthor: boolean; suppressDate: boolean; pageNumbers?: string; prefix: string; suffix: string; }): string {
    const { suppressAuthor, suppressDate, pageNumbers, prefix, suffix } = options;

    // Author
    let authorText = '';
    if (!suppressAuthor && reference.authors && reference.authors.length > 0) {
        const firstAuthor = reference.authors[0];

        if (reference.authors.length === 1) {
            // name field'ını parse et - "John Doe" -> "Doe"
            const fullName = firstAuthor.name || firstAuthor.lastName || 'Unknown Author';
            const lastName = extractLastName(fullName);
            authorText = lastName;
        } else if (reference.authors.length === 2) {
            const secondAuthor = reference.authors[1];
            const firstName = extractLastName(firstAuthor.name || firstAuthor.lastName || 'Unknown');
            const secondName = extractLastName(secondAuthor.name || secondAuthor.lastName || 'Unknown');
            authorText = `${firstName} & ${secondName}`;
        } else {
            const firstName = extractLastName(firstAuthor.name || firstAuthor.lastName || 'Unknown');
            authorText = `${firstName} et al.`;
        }
    }

    let yearText = '';
    if (!suppressDate && reference.year) {
        yearText = reference.year.toString();
    }

    let pageText = '';
    if (pageNumbers) {
        pageText = `, p. ${pageNumbers}`;
    }

    let citation = '';
    if (authorText && yearText) {
        citation = `(${authorText}, ${yearText}${pageText})`;
    } else if (authorText) {
        citation = `(${authorText}${pageText})`;
    } else if (yearText) {
        citation = `(${yearText}${pageText})`;
    } else {
        citation = pageText ? `(${pageText.substring(2)})` : '(n.d.)';
    }

    return `${prefix}${citation}${suffix}`;
}

// Helper function to extract last name from full name
function extractLastName(fullName: string): string {
    if (!fullName || fullName === 'Unknown Author') return 'Unknown';

    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) return nameParts[0];

    // Son kelimeyi lastName olarak al
    return nameParts[nameParts.length - 1];
}

// MLA Style formatting
export function formatMLA(reference: any, options: { suppressAuthor: boolean; suppressDate: boolean; pageNumbers?: string; prefix: string; suffix: string; }): string {
    const { suppressAuthor, suppressDate, pageNumbers, prefix, suffix } = options;

    let authorText = '';
    if (!suppressAuthor && reference.authors && reference.authors.length > 0) {
        const firstAuthor = reference.authors[0];
        authorText = firstAuthor.lastName || 'Unknown';
    }

    let pageText = '';
    if (pageNumbers) {
        pageText = ` ${pageNumbers}`;
    }

    let citation = '';
    if (authorText) {
        citation = `(${authorText}${pageText})`;
    } else {
        citation = pageNumbers ? `(${pageNumbers})` : '(Unknown)';
    }

    return `${prefix}${citation}${suffix}`;
}

// Chicago Style formatting
export function formatChicago(reference: any, options: any): string {
    const { suppressAuthor, suppressDate, pageNumbers, prefix, suffix } = options;

    let authorText = '';
    if (!suppressAuthor && reference.authors && reference.authors.length > 0) {
        const firstAuthor = reference.authors[0];
        authorText = firstAuthor.lastName || 'Unknown';
    }

    let yearText = '';
    if (!suppressDate && reference.year) {
        yearText = reference.year.toString();
    }

    let pageText = '';
    if (pageNumbers) {
        pageText = `, ${pageNumbers}`;
    }

    let citation = '';
    if (authorText && yearText) {
        citation = `(${authorText} ${yearText}${pageText})`;
    } else if (authorText) {
        citation = `(${authorText}${pageText})`;
    } else {
        citation = yearText ? `(${yearText}${pageText})` : '(n.d.)';
    }

    return `${prefix}${citation}${suffix}`;
}

// IEEE Style formatting
export function formatIEEE(reference: any, options: any): string {
    const { pageNumbers, prefix, suffix } = options;

    let pageText = '';
    if (pageNumbers) {
        pageText = `, p. ${pageNumbers}`;
    }

    const refNumber = Math.abs(reference.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)) % 1000;

    return `${prefix}[${refNumber}${pageText}]${suffix}`;
}