import { Citation } from "generated/prisma";

export interface PlatformAdapter {
  // platform: DocumentPlatform;
  
  // // Document management
  // registerDocument(data: any): Promise<UniversalDocument>;
  // updateDocument(id: string, data: any): Promise<UniversalDocument>;
  
  // // Citation management  
  // insertCitation(documentId: string, citation: Citation, position: DocumentPosition): Promise<CitationMapping>;
  // updateCitation(mappingId: string, newData: any): Promise<CitationMapping>;
  // removeCitation(mappingId: string): Promise<void>;
  
  // // Sync operations
  // syncToDocument(documentId: string, citations: Citation[]): Promise<SyncResult>;
  // syncFromDocument(documentId: string): Promise<Citation[]>;
}