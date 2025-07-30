export const OPEN_ACCESS_APIS = {
    PUBMED_CENTRAL: {
        name: 'PubMed Central',
        baseUrl: 'https://eutils.ncbi.nlm.nih.gov',
        endpoints: {
            search: '/entrez/eutils/esearch.fcgi',
            fetch: '/entrez/eutils/efetch.fcgi',
            link: '/entrez/eutils/elink.fcgi'
        },
        rateLimit: {
            requestsPerSecond: 3,
            requestsPerMinute: 100
        }
    },

    ARXIV: {
        name: 'arXiv',
        baseUrl: 'http://export.arxiv.org',
        endpoints: {
            search: '/api/query',
            pdf: '/pdf/{arxivId}.pdf'
        },
        rateLimit: {
            requestsPerSecond: 1,
            requestsPerMinute: 30
        }
    },

    DOAJ: {
        name: 'Directory of Open Access Journals',
        baseUrl: 'https://doaj.org',
        endpoints: {
            search: '/api/v2/search/articles',
            journals: '/api/v2/search/journals'
        },
        rateLimit: {
            requestsPerSecond: 2,
            requestsPerMinute: 60
        }
    },

    CROSSREF: {
        name: 'Crossref',
        baseUrl: 'https://api.crossref.org',
        endpoints: {
            works: '/works/{doi}',
            search: '/works'
        },
        rateLimit: {
            requestsPerSecond: 10,
            requestsPerMinute: 600
        }
    },

    UNPAYWALL: {
        name: 'Unpaywall',
        baseUrl: 'https://api.unpaywall.org',
        endpoints: {
            doi: '/v2/{doi}?email={email}'
        },
        rateLimit: {
            requestsPerSecond: 10,
            requestsPerMinute: 600
        }
    },

    SEMANTIC_SCHOLAR: {
        name: 'Semantic Scholar',
        baseUrl: 'https://api.semanticscholar.org',
        endpoints: {
            paper: '/graph/v1/paper/{paperId}',
            search: '/graph/v1/paper/search'
        },
        rateLimit: {
            requestsPerSecond: 100,
            requestsPerMinute: 6000
        }
    },

    BIORXIV: {
        name: 'bioRxiv',
        baseUrl: 'https://api.biorxiv.org',
        endpoints: {
            details: '/details/{server}/{doi}',
            pdf: '/{server}/early/{year}/{month}/{day}/{doi}.full.pdf'
        },
        rateLimit: {
            requestsPerSecond: 1,
            requestsPerMinute: 30
        }
    }
};