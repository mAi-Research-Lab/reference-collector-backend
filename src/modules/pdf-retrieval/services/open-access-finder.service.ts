import { Injectable } from "@nestjs/common";
import { OpenAccessQuery, OpenAccessResult } from "../interfaces/open-access-result.interface";
import { OPEN_ACCESS_APIS } from "../constants/api-endpoints";
import { HttpService } from "@nestjs/axios";
import { AccessLevel } from "../interfaces/pdf-source.interface";
import { firstValueFrom } from "rxjs";
import * as xml2js from 'xml2js';
import { URL_PATTERNS } from "../constants/url-patterns";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { PDF_MESSAGES } from "../constants/pdf-messages";
import { AxiosResponse } from "axios";

@Injectable()
export class OpenAccessFinderService {
    constructor(private readonly httpService: HttpService) { }

    async findOpenAccessPdf(query: OpenAccessQuery): Promise<OpenAccessResult[]> {
        if (!query.doi && !query.title) {
            throw new CustomHttpException("Query must contain either DOI or title.", 400, "INVALID_QUERY");
        }

        const searchPromises: Promise<OpenAccessResult[] | OpenAccessResult | null>[] = [
            this.searchUnpaywall(query.doi ?? ''),
            this.searchPubMedCentral(query),
            this.searchArxiv(query),
            this.searchDoaj(query),
            this.searchBiorxiv(query),
        ];

        const results = await Promise.allSettled(searchPromises);

        let combinedResults: OpenAccessResult[] = [];

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                if (Array.isArray(result.value)) {
                    combinedResults.push(...result.value);
                } else {
                    combinedResults.push(result.value);
                }
            }
        }

        const seenUrls = new Set<string>();
        combinedResults = combinedResults.filter(result => {
            if (!result.url || seenUrls.has(result.url)) return false;
            seenUrls.add(result.url);
            return true;
        });

        combinedResults.sort((a, b) => b.confidence - a.confidence);

        return combinedResults;
    }


    async searchPubMedCentral(query: OpenAccessQuery): Promise<OpenAccessResult[]> {
        const { baseUrl, endpoints } = OPEN_ACCESS_APIS.PUBMED_CENTRAL;

        const searchParams = new URLSearchParams({
            db: 'pmc',
            retmax: '10',
            retmode: 'json',
            term: this.buildSearchTerm(query),
        });

        const searchUrl = `${baseUrl}${endpoints.search}?${searchParams.toString()}`;
        const searchResponse = await firstValueFrom(this.httpService.get(searchUrl));
        const ids = searchResponse.data?.esearchresult?.idlist || [];

        if (ids.length === 0) return [];

        const fetchParams = new URLSearchParams({
            db: 'pmc',
            retmode: 'xml',
            id: ids.join(','),
        });

        const fetchUrl = `${baseUrl}${endpoints.fetch}?${fetchParams.toString()}`;
        const fetchResponse = await firstValueFrom(this.httpService.get(fetchUrl));
        const parsedXml = await xml2js.parseStringPromise(fetchResponse.data, { explicitArray: false });

        const articles = parsedXml?.pmcarticleset?.article || [];
        const resultList: OpenAccessResult[] = [];

        const articleArray = Array.isArray(articles) ? articles : [articles];

        for (const article of articleArray) {
            const pmcid = article.front?.['article-meta']?.['article-id']?.find?.((id: any) => id?.['$']?.['pub-id-type'] === 'pmc')?._ || null;
            const doi = article.front?.['article-meta']?.['article-id']?.find?.((id: any) => id?.['$']?.['pub-id-type'] === 'doi')?._ || undefined;
            const title = article.front?.['article-meta']?.['title-group']?.['article-title'] || '';
            const journal = article.front?.['journal-meta']?.['journal-title'] || '';
            const year = parseInt(article.front?.['article-meta']?.['pub-date']?.['year'] || '0');
            const authors = this.extractAuthors(article.front?.['article-meta']?.['contrib-group']?.['contrib']);

            const pdfUrl = pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcid}/pdf/` : null;

            if (pdfUrl) {
                resultList.push({
                    source: 'PubMed Central',
                    url: pdfUrl,
                    confidence: 1.0,
                    accessLevel: AccessLevel.FREE,
                    lastChecked: new Date(),
                    metadata: {
                        title,
                        authors,
                        journal,
                        year,
                        doi,
                    },
                });
            }
        }

        return resultList;
    }

    async searchArxiv(query: OpenAccessQuery): Promise<OpenAccessResult[]> {
        const { baseUrl, endpoints } = OPEN_ACCESS_APIS.ARXIV;

        const searchTerm = this.buildSearchTerm(query);
        const searchUrl = `${baseUrl}${endpoints.search}?search_query=${encodeURIComponent(searchTerm)}&start=0&max_results=5`;

        const response = await firstValueFrom(this.httpService.get(searchUrl));
        const parsed = await xml2js.parseStringPromise(response.data, { explicitArray: false });

        const entries = parsed.feed.entry;
        if (!entries) return [];

        const entryArray = Array.isArray(entries) ? entries : [entries];

        const results: OpenAccessResult[] = entryArray.map((entry: any) => {
            const idUrl = entry.id;
            const arxivId = idUrl.split('/abs/')[1];
            const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;

            const authors = Array.isArray(entry.author)
                ? entry.author.map((a: any) => a.name)
                : [entry.author.name];

            const publishedYear = new Date(entry.published).getFullYear();

            return {
                source: 'arXiv',
                url: pdfUrl,
                confidence: 0.9,
                accessLevel: AccessLevel.FREE,
                lastChecked: new Date(),
                metadata: {
                    title: entry.title?.trim(),
                    authors,
                    journal: 'arXiv',
                    year: publishedYear,
                    doi: entry?.arxivdoi || undefined,
                },
            };
        });

        return results;
    }

    async searchUnpaywall(doi: string): Promise<OpenAccessResult | null> {
        const isValid = URL_PATTERNS.DOI.STANDARD.test(doi);
        if (!isValid) {
            throw new CustomHttpException(
                PDF_MESSAGES.ERROR.INVALID_DOI,
                400,
                PDF_MESSAGES.ERROR.INVALID_DOI,
            );
        }

        const { baseUrl } = OPEN_ACCESS_APIS.UNPAYWALL;
        const email = 'unpaywall_01@example.com';
        const unpaywallUrl = `${baseUrl}/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`;

        let response: AxiosResponse<any, any>;
        try {
            response = await firstValueFrom(this.httpService.get(unpaywallUrl));
        } catch (error) {
            throw new CustomHttpException(error.message, 502, 'UNPAYWALL_API_FAILED');
        }

        const data = response.data;

        if (!data.is_oa || !Array.isArray(data.oa_locations)) {
            return null;
        }

        const pdfLocation = data.oa_locations.find((loc: { pdf_url: string; }) => loc.pdf_url);
        if (!pdfLocation) return null;

        const metadata = {
            title: data.title ?? '',
            authors: Array.isArray(data.authors)
                ? data.authors.map((a: any) => a.family || a.name).filter(Boolean)
                : [],
            journal: data.journal_name ?? '',
            year: data.year ?? null,
            doi: data.doi ?? doi,
        };

        const result: OpenAccessResult = {
            source: 'Unpaywall',
            url: pdfLocation.pdf_url,
            confidence: 1.0,
            accessLevel: AccessLevel.FREE,
            lastChecked: new Date(),
            metadata,
        };

        return result;
    }

    async searchBiorxiv(query: OpenAccessQuery): Promise<OpenAccessResult[]> {
        const { title, doi } = query;
        if (!title && !doi) return [];

        const { baseUrl, endpoints } = OPEN_ACCESS_APIS.BIORXIV;

        const results: OpenAccessResult[] = [];

        if (doi) {
            const server = doi.startsWith('10.1101') ? 'biorxiv' : 'medrxiv';
            const detailsUrl = `${baseUrl}${endpoints.details
                .replace('{server}', server)
                .replace('{doi}', encodeURIComponent(doi))}`;

            try {
                const response = await firstValueFrom(this.httpService.get(detailsUrl));
                const record = response.data.collection?.[0];
                if (!record) return [];

                const [year, month, day] = record.date.split('-');
                const pdfUrl = `${baseUrl}${endpoints.pdf
                    .replace('{server}', server)
                    .replace('{year}', year)
                    .replace('{month}', month)
                    .replace('{day}', day)
                    .replace('{doi}', encodeURIComponent(doi))}`;

                results.push({
                    source: 'bioRxiv',
                    url: pdfUrl,
                    confidence: 1.0,
                    accessLevel: AccessLevel.FREE,
                    lastChecked: new Date(),
                    metadata: {
                        title: record.title,
                        authors: record.authors?.split(';').map(a => a.trim()) ?? [],
                        journal: record.journal,
                        year: parseInt(year),
                        doi,
                    },
                });
            } catch (error) {
                console.warn('biorxiv fetch error:', error.message);
                return [];
            }
        }

        else if (title) {
            const searchUrl = `${baseUrl}/details/biorxiv/${encodeURIComponent(title)}`;
            try {
                const response = await firstValueFrom(this.httpService.get(searchUrl));
                const records = response.data.collection ?? [];

                for (const record of records) {
                    const pubDoi = record.doi;
                    const [year, month, day] = record.date.split('-');
                    const pdfUrl = `${baseUrl}${endpoints.pdf
                        .replace('{server}', 'biorxiv')
                        .replace('{year}', year)
                        .replace('{month}', month)
                        .replace('{day}', day)
                        .replace('{doi}', encodeURIComponent(pubDoi))}`;

                    results.push({
                        source: 'bioRxiv',
                        url: pdfUrl,
                        confidence: 0.8,
                        accessLevel: AccessLevel.FREE,
                        lastChecked: new Date(),
                        metadata: {
                            title: record.title,
                            authors: record.authors?.split(';').map(a => a.trim()) ?? [],
                            journal: record.journal,
                            year: parseInt(year),
                            doi: pubDoi,
                        },
                    });
                }
            } catch (error) {
                console.warn('biorxiv title search error:', error.message);
                return [];
            }
        }

        return results;
    }

    async searchDoaj(query: OpenAccessQuery): Promise<OpenAccessResult[]> {
        const { title, doi, authors } = query;

        const { baseUrl, endpoints } = OPEN_ACCESS_APIS.DOAJ;
        const searchUrl = `${baseUrl}${endpoints.search}`;

        const searchTerms: string[] = [];

        if (doi) {
            searchTerms.push(`doi:"${doi}"`);
        } else {
            if (title) searchTerms.push(`title:"${title}"`);
            if (authors?.length) {
                const authorTerms = authors.map(author => `author:"${author}"`);
                searchTerms.push(...authorTerms);
            }
        }

        const queryStr = searchTerms.join(' AND ');
        const fullUrl = `${searchUrl}?pageSize=10&q=${encodeURIComponent(queryStr)}`;

        try {
            const response = await firstValueFrom(this.httpService.get(fullUrl));
            const results = response.data?.results ?? [];

            return results
                .map((result: any): OpenAccessResult | null => {
                    const bibjson = result.bibjson;
                    if (!bibjson) return null;

                    const pdfLink = bibjson.link?.find((l: any) => l.type === 'fulltext' && l.url?.endsWith('.pdf'));
                    if (!pdfLink) return null;

                    const publicationYear = parseInt(bibjson.year);

                    return {
                        source: 'DOAJ',
                        url: pdfLink.url,
                        confidence: 0.9,
                        accessLevel: AccessLevel.FREE,
                        lastChecked: new Date(),
                        metadata: {
                            title: bibjson.title,
                            authors: bibjson.author?.map((a: any) => `${a.name}`) ?? [],
                            journal: bibjson.journal?.title,
                            year: publicationYear,
                            doi: bibjson.identifier?.find((id: any) => id.type === 'doi')?.id,
                        },
                    };
                })
                .filter((r): r is OpenAccessResult => r !== null);
        } catch (error) {
            console.error('DOAJ API error:', error.message);
            return [];
        }
    }

    private buildSearchTerm(query: OpenAccessQuery): string {
        const terms: string[] = [];
        if (query.doi) terms.push(`${query.doi?.toString()}[DOI]`);
        if (query.title) terms.push(`${query.title}[Title]`);
        if (query.authors?.length) terms.push(`${query.authors.join(' ')}[Author]`);
        if (query.journal) terms.push(`${query.journal}[Journal]`);
        if (query.year) terms.push(`${query.year}[Date - Publication]`);
        if (query.pmid) terms.push(`${query.pmid}[PMID]`);
        return terms.join(' AND ');
    }

    private extractAuthors(contribs: any): string[] {
        if (!contribs) return [];
        const contribArray = Array.isArray(contribs) ? contribs : [contribs];

        return contribArray
            .filter((c: any) => c?.['$']?.['contrib-type'] === 'author')
            .map((a: any) => {
                const name = a?.name;
                return name ? `${name.given} ${name.surname}` : '';
            })
            .filter(Boolean);
    }

}