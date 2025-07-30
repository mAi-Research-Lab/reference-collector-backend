export interface PdfSource {
    id: string;
    name: string;
    type: PdfSourceType;
    url: string;
    accessLevel: AccessLevel;
    reliability: number;
    responseTime: number;
    isActive: boolean;
}

export enum PdfSourceType {
    OPEN_ACCESS = 'open_access',
    PUBLISHER_API = 'publisher_api',
    INSTITUTIONAL = 'institutional',
    PREPRINT = 'preprint',
    REPOSITORY = 'repository',
    SNAPSHOT = 'snapshot'
}

export enum AccessLevel {
    FREE = 'free',
    SUBSCRIPTION = 'subscription',
    PURCHASE = 'purchase',
    INSTITUTIONAL = 'institutional'
}