export interface FormattedText {
    text: string;
    formatting: {
        italic?: boolean;
        bold?: boolean;
        underline?: boolean;
        smallCaps?: boolean;
    };
}

export interface BibliographyEntry {
    text: string;
    formattedText: FormattedText[];
    hangingIndent?: boolean;
    lineSpacing?: number;
    entrySpacing?: number;
}

export interface BibliographyOutput {
    entries: BibliographyEntry[];
    globalFormatting: {
        hangingIndent: boolean;
        lineSpacing: number;
        entrySpacing: number;
        subsequentAuthorSubstitute?: string;
    };
}