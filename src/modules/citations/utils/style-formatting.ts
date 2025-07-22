// APA Style formatting
export function formatAPA(reference: any, options: { suppressAuthor: boolean; suppressDate: boolean; pageNumbers?: string; prefix: string; suffix: string; }): string {
    const { suppressAuthor, suppressDate, pageNumbers, prefix, suffix } = options;

    // Author
    let authorText = '';
    if (!suppressAuthor && reference.authors && reference.authors.length > 0) {
        const firstAuthor = reference.authors[0];
        if (reference.authors.length === 1) {
            authorText = firstAuthor.lastName || 'Unknown';
        } else if (reference.authors.length === 2) {
            const secondAuthor = reference.authors[1];
            authorText = `${firstAuthor.lastName} & ${secondAuthor.lastName}`;
        } else {
            authorText = `${firstAuthor.lastName} et al.`;
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