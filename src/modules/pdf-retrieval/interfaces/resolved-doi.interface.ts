export interface ResolvedDoiResult {
    doi: string;
    title: string;
    authors: string[];
    publisher: string;
    publicationDate: string;
    pdfUrl?: string | null;
    metadataRaw?: any;
}
