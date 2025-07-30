export const URL_PATTERNS = {
    DOI: {
        STANDARD: /^10\.\d{4,}\/[^\s]+$/,
        FULL_URL: /^https?:\/\/(dx\.)?doi\.org\/10\.\d{4,}\/[^\s]+$/,
        EXTRACT: /(?:doi\.org\/|doi:?\s*)(10\.\d{4,}\/[^\s\]]+)/i
    },

    ARXIV: {
        ID: /^(arXiv:)?(\d{4}\.\d{4,5})(v\d+)?$/i,
        URL: /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i,
        PDF: /arxiv\.org\/pdf\/(\d{4}\.\d{4,5}(?:v\d+)?)(?:\.pdf)?/i
    },

    PMID: {
        ID: /^(\d{8,9})$/,
        URL: /pubmed\.ncbi\.nlm\.nih\.gov\/(\d{8,9})/i,
        PMC: /pmc\/articles\/PMC(\d+)/i
    },

    PDF_DIRECT: {
        EXTENSION: /\.pdf(\?[^#]*)?(?:#.*)?$/i,
        CONTENT_TYPE: /application\/pdf/i,
        FILENAME: /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i
    },

    PUBLISHER_SPECIFIC: {
        NATURE: /nature\.com\/articles\/([^/?#]+)/i,
        SPRINGER: /link\.springer\.com\/(?:article|chapter)\/([^/?#]+)/i,
        ELSEVIER: /sciencedirect\.com\/science\/article\/(?:pii\/)?([^/?#]+)/i,
        IEEE: /ieeexplore\.ieee\.org\/(?:document|abstract)\/(\d+)/i,
        WILEY: /onlinelibrary\.wiley\.com\/doi\/(?:abs\/)?([^/?#]+)/i,
        SAGE: /journals\.sagepub\.com\/doi\/(?:abs\/)?([^/?#]+)/i,
        TAYLOR_FRANCIS: /tandfonline\.com\/doi\/(?:abs\/)?([^/?#]+)/i
    }
};