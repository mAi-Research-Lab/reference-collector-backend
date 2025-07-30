import { AuthType } from "../enums/auth.enum";
import { PublisherConfig } from "../interfaces/publisher-config.interface";

export const PUBLISHERS: Record<string, PublisherConfig> = {
    NATURE: {
        id: 'nature',
        name: 'Nature Publishing Group',
        baseUrl: 'https://www.nature.com',
        apiUrl: 'https://api.nature.com',
        rateLimit: {
            requestsPerMinute: 60,
            requestsPerHour: 1000
        },
        authentication: {
            type: AuthType.API_KEY,
            required: false
        },
        patterns: {
            doiPattern: /10\.1038\/.+/,
            pdfUrlPattern: /nature\.com\/articles\/(.+)\.pdf/,
            redirectPattern: /nature\.com\/articles\/(.+)/
        },
        endpoints: {
            search: '/search',
            download: '/articles/{articleId}.pdf',
            metadata: '/articles/{articleId}'
        }
    },

    SPRINGER: {
        id: 'springer',
        name: 'Springer Nature',
        baseUrl: 'https://link.springer.com',
        apiUrl: 'https://api.springernature.com',
        rateLimit: {
            requestsPerMinute: 30,
            requestsPerHour: 500
        },
        authentication: {
            type: AuthType.API_KEY,
            required: true
        },
        patterns: {
            doiPattern: /10\.1007\/.+/,
            pdfUrlPattern: /link\.springer\.com\/content\/pdf\/(.+)\.pdf/,
            redirectPattern: /link\.springer\.com\/article\/(.+)/
        },
        endpoints: {
            search: '/search',
            download: '/content/pdf/{doi}.pdf',
            metadata: '/metadata/doi/{doi}'
        }
    },

    ELSEVIER: {
        id: 'elsevier',
        name: 'Elsevier',
        baseUrl: 'https://www.sciencedirect.com',
        apiUrl: 'https://api.elsevier.com',
        rateLimit: {
            requestsPerMinute: 20,
            requestsPerHour: 200
        },
        authentication: {
            type: AuthType.API_KEY,
            required: true
        },
        patterns: {
            doiPattern: /10\.1016\/.+/,
            pdfUrlPattern: /sciencedirect\.com\/science\/article\/pii\/(.+)\/pdfft\?/,
            redirectPattern: /sciencedirect\.com\/science\/article\/pii\/(.+)/
        },
        endpoints: {
            search: '/content/search/sciencedirect',
            download: '/science/article/pii/{pii}/pdfft',
            metadata: '/content/article/doi/{doi}'
        }
    },

    IEEE: {
        id: 'ieee',
        name: 'IEEE Xplore',
        baseUrl: 'https://ieeexplore.ieee.org',
        apiUrl: 'https://ieeexploreapi.ieee.org',
        rateLimit: {
            requestsPerMinute: 30,
            requestsPerHour: 200
        },
        authentication: {
            type: AuthType.API_KEY,
            required: true
        },
        patterns: {
            doiPattern: /10\.1109\/.+/,
            pdfUrlPattern: /ieeexplore\.ieee\.org\/stamp\/stamp\.jsp\?tp=&arnumber=(.+)/,
            redirectPattern: /ieeexplore\.ieee\.org\/document\/(.+)/
        },
        endpoints: {
            search: '/api/v1/search/articles',
            download: '/stamp/stamp.jsp?tp=&arnumber={articleNumber}',
            metadata: '/api/v1/search/articles'
        }
    },

    WILEY: {
        id: 'wiley',
        name: 'Wiley Online Library',
        baseUrl: 'https://onlinelibrary.wiley.com',
        rateLimit: {
            requestsPerMinute: 30,
            requestsPerHour: 300
        },
        authentication: {
            type: AuthType.INSTITUTIONAL,
            required: false
        },
        patterns: {
            doiPattern: /10\.1002\/.+/,
            pdfUrlPattern: /onlinelibrary\.wiley\.com\/doi\/pdf\/(.+)/,
            redirectPattern: /onlinelibrary\.wiley\.com\/doi\/(.+)/
        },
        endpoints: {
            search: '/action/doSearch',
            download: '/doi/pdf/{doi}',
            metadata: '/doi/{doi}'
        }
    }
};