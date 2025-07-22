export interface ConflictData {
    id: string;
    type: string;
    field: string;
    wordVersion?: any;
    webVersion?: any;
    timestamp?: {
        word?: string;
        web?: string;
    };
    resolved?: any;
    resolutionMethod?: string;
    status: 'pending' | 'resolved' | 'ignored';
}