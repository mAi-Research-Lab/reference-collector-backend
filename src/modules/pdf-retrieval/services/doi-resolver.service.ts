import { Injectable } from "@nestjs/common";
import { URL_PATTERNS } from "../constants/url-patterns";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { PDF_MESSAGES } from "../constants/pdf-messages";
import { OPEN_ACCESS_APIS } from "../constants/api-endpoints";
import { firstValueFrom } from "rxjs";
import { HttpService } from "@nestjs/axios";
import { ResolvedDoiResult } from "../interfaces/resolved-doi.interface";

@Injectable()
export class DoiResolverService {
    constructor(private readonly httpService: HttpService) { }


    async resolveDoi(doi: string): Promise<ResolvedDoiResult> {
        const isValid = this.validateDoi(doi);
        if (!isValid) {
            throw new CustomHttpException(PDF_MESSAGES.ERROR.INVALID_DOI, 400, PDF_MESSAGES.ERROR.INVALID_DOI);
        }

        const normalizedDoi = this.normalizeDoi(doi);
        console.log(normalizedDoi);

        const { baseUrl, endpoints } = OPEN_ACCESS_APIS.CROSSREF;
        const crossrefUrl = `${baseUrl}${endpoints.works.replace('{doi}', encodeURIComponent(normalizedDoi))}`;

        let response;
        try {
            const result = await firstValueFrom(this.httpService.get(crossrefUrl));
            response = result.data;
        } catch (error) {
            throw new CustomHttpException(error.message, 502, "CROSSREF_API_REQUEST_FAILED");
        }

        const metadata = response.message;

        const publisher = metadata.publisher || 'Unknown';

        const pdfUrl = this.extractPdfUrl(metadata);

        const resolvedData: ResolvedDoiResult = {
            doi: normalizedDoi,
            title: metadata.title?.[0] || '',
            authors: metadata.author?.map((a: any) => `${a.given} ${a.family}`) || [],
            publisher,
            publicationDate: metadata.created?.['date-time'] || '',
            pdfUrl,
            metadataRaw: metadata,
        };

        return resolvedData;
    }

    async getMetadataFromDoi(doi: string): Promise<any> {
        const isValid = this.validateDoi(doi);
        if (!isValid) {
            throw new CustomHttpException('Invalid DOI format', 400, 'INVALID_DOI');
        }

        const normalizedDoi = this.normalizeDoi(doi);

        const { baseUrl, endpoints } = OPEN_ACCESS_APIS.CROSSREF;
        const crossrefUrl = `${baseUrl}${endpoints.works.replace('{doi}', encodeURIComponent(normalizedDoi))}`;
        let response;
        try {
            const result = await firstValueFrom(this.httpService.get(crossrefUrl));
            response = result.data;
        } catch (error) {
            throw new CustomHttpException(error.message, 502, 'CROSSREF_REQUEST_FAILED');
        }

        const metadata = response?.message;
        if (!metadata) {
            throw new CustomHttpException('Metadata not found', 404, 'METADATA_NOT_FOUND');
        }

        const metadataResult = {
            doi: normalizedDoi,
            title: metadata.title?.[0] || '',
            authors: metadata.author?.map((a: any) => `${a.given} ${a.family}`) || [],
            publisher: metadata.publisher || 'Unknown',
            publicationDate: metadata.created?.['date-time'] || '',
            journal: metadata['container-title']?.[0] || '',
        };


        return metadataResult;
    }

    async findPdfFromDoi(doi: string): Promise<string | null> {
        const normalizedDoi = this.normalizeDoi(doi);

        const { baseUrl, endpoints } = OPEN_ACCESS_APIS.CROSSREF;
        const crossrefUrl = `${baseUrl}${endpoints.works.replace('{doi}', encodeURIComponent(normalizedDoi))}`;
        let response;
        try {
            const result = await firstValueFrom(this.httpService.get(crossrefUrl));
            response = result.data;
        } catch (error) {
            throw new CustomHttpException(error.message, 502, 'CROSSREF_REQUEST_FAILED');
        }

        const metadata = response?.message;
        if (!metadata) {
            throw new CustomHttpException('Metadata not found', 404, 'METADATA_NOT_FOUND');
        }

        const links = metadata.link || [];
        const pdfLink = links.find((link: any) => link['content-type'] === 'application/pdf');

        return pdfLink?.URL || null;
    }


    private normalizeDoi(doi: string): string {
        return doi
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
    }

    private validateDoi(doi: string): boolean {
        return URL_PATTERNS.DOI.STANDARD.test(doi);
    }

    private extractPdfUrl(metadata: any): string | null {
        // 1. Link array'den PDF URL'sini ara
        if (metadata.link && Array.isArray(metadata.link)) {
            const pdfLink = metadata.link.find((link: any) =>
                link['content-type'] === 'application/pdf' ||
                (link.URL && link.URL.toLowerCase().includes('.pdf'))
            );

            if (pdfLink?.URL) {
                return pdfLink.URL;
            }
        }

        // 2. Resource primary'den ara
        if (metadata.resource?.primary?.URL) {
            const url = metadata.resource.primary.URL;
            if (url.toLowerCase().includes('.pdf')) {
                return url;
            }
        }

        return this.getPublisherSpecificPdfUrl(metadata);
    }

    private getPublisherSpecificPdfUrl(metadata: any): string | null {
        const publisher = metadata.publisher?.toLowerCase() || '';
        const doi = metadata.DOI;

        if (publisher.includes('jmir') && doi) {
            try {
                const year = metadata.issued?.['date-parts']?.[0]?.[0] ||
                    new Date(metadata.created?.['date-time']).getFullYear();
                const issue = metadata.issue;
                const page = metadata.page; 

                if (year && issue && page) {
                    return `https://www.jmir.org/${year}/${issue}/${page}/PDF`;
                }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                if (doi.includes('jmir')) {
                    const parts = doi.split('/');
                    if (parts.length >= 2) {
                        const jmirPart = parts[parts.length - 1];
                        const id = jmirPart.split('.')[1];
                        return `https://www.jmir.org/2016/6/e${id}/PDF`;
                    }
                }
            }
        }

        if (doi && doi.includes('arxiv')) {
            const arxivId = doi.replace('10.48550/arxiv.', '');
            return `https://arxiv.org/pdf/${arxivId}.pdf`;
        }

        if (publisher.includes('biorxiv') || doi?.includes('biorxiv')) {
            const doiParts = doi.split('/');
            const id = doiParts[doiParts.length - 1];
            return `https://www.biorxiv.org/content/10.1101/${id}.full.pdf`;
        }

        return null;
    }
}