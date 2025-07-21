export const OFFICE_MESSAGES = {
    // Document Registration
    DOCUMENT_REGISTERED_SUCCESSFULLY: 'Document registered successfully',
    DOCUMENT_REGISTRATION_FAILED: 'Failed to register document',
    DOCUMENT_ALREADY_REGISTERED: 'Document already registered',

    // Document Management
    DOCUMENT_UPDATED_SUCCESSFULLY: 'Document updated successfully',
    DOCUMENT_NOT_FOUND: 'Office document not found',
    DOCUMENT_DELETED_SUCCESSFULLY: 'Document deleted successfully',

    // Sync Operations
    SYNC_STARTED_SUCCESSFULLY: 'Sync started successfully',
    SYNC_COMPLETED_SUCCESSFULLY: 'Sync completed successfully',
    SYNC_FAILED: 'Sync operation failed',
    SYNC_IN_PROGRESS: 'Sync already in progress',

    // Citation Mapping
    CITATION_MAPPED_SUCCESSFULLY: 'Citation mapped successfully',
    CITATION_MAPPING_FAILED: 'Failed to map citation',
    CITATION_NOT_FOUND: 'Citation not found in document',

    // Platform Specific
    PLATFORM_NOT_SUPPORTED: 'Platform not supported',
    INVALID_PLATFORM_DATA: 'Invalid platform data provided',

    // Access Control
    DOCUMENT_ACCESS_DENIED: 'Access denied to this document',
    USER_NOT_OWNER: 'User is not the owner of this document'
} as const;