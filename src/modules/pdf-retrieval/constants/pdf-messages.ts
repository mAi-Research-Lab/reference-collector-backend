export const PDF_MESSAGES = {
    SUCCESS: {
        PDF_FOUND: 'PDF found successfully',
        PDF_DOWNLOADED: 'PDF downloaded successfully',
        SEARCH_COMPLETED: 'PDF search completed',
        VALIDATION_PASSED: 'PDF validation passed'
    },

    ERROR: {
        PDF_NOT_FOUND: 'PDF not found for this reference',
        DOWNLOAD_FAILED: 'Failed to download PDF',
        INVALID_DOI: 'Invalid DOI format',
        NO_SEARCH_CRITERIA: 'No search criteria provided',
        RATE_LIMIT_EXCEEDED: 'Rate limit exceeded for this source',
        AUTHENTICATION_REQUIRED: 'Authentication required for this source',
        FILE_TOO_LARGE: 'PDF file is too large',
        INVALID_PDF: 'Downloaded file is not a valid PDF',
        NETWORK_ERROR: 'Network error occurred during download',
        TIMEOUT: 'Request timeout exceeded',
        PERMISSION_DENIED: 'Permission denied to access PDF',
        SOURCE_UNAVAILABLE: 'PDF source is currently unavailable'
    },

    VALIDATION: {
        INVALID_FILE_FORMAT: 'File is not a valid PDF format',
        CORRUPTED_FILE: 'PDF file appears to be corrupted',
        EMPTY_FILE: 'PDF file is empty',
        NO_TEXT_CONTENT: 'PDF contains no extractable text',
        LOW_QUALITY: 'PDF quality is below acceptable threshold',
        MISSING_METADATA: 'PDF metadata is incomplete'
    },

    INFO: {
        SEARCHING_SOURCES: 'Searching PDF sources...',
        FOUND_MULTIPLE: 'Multiple PDF sources found',
        USING_CACHE: 'Using cached PDF result',
        VALIDATING_PDF: 'Validating downloaded PDF...',
        EXTRACTING_METADATA: 'Extracting PDF metadata...'
    }
};