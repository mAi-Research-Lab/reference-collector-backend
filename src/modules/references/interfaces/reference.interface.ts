export interface Reference {
    authors: string[];
    title: string;
    journal?: string;
    year: number;
    doi?: string;
    url?: string;
    pages?: string;
    volume?: string;
    issue?: string;
    publisher?: string;
    isbn?: string;
}

export interface ValidationResult {
    reference: Reference;
    isValid: boolean;
    confidence: number;
    foundSources: any[];
    validationDetails: {
        titleMatch: boolean;
        authorMatch: boolean;
        yearMatch: boolean;
        doiValid: boolean;
        urlAccessible: boolean;
    };
    suggestions?: string[];
}

