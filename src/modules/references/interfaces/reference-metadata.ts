export interface ReferenceMetadata {
    // Journal
    journal?: string;
    
    // Book/Chapter
    edition?: string;
    location?: string;
    series?: string;
    seriesNumber?: string;
    chapter?: string;
    booktitle?: string;
    
    // Conference
    conference?: string;
    organization?: string;
    
    // Thesis
    school?: string;
    degree?: string;
    department?: string;
    
    // Website
    accessDate?: string;
    websiteTitle?: string;
    
    // Report
    reportNumber?: string;
    
    // Common
    keywords?: string[];
    customFields?: Record<string, any>;
}