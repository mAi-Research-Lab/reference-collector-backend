import { Injectable, Logger } from '@nestjs/common';
import { SemanticScholarService } from './external/semantic-scholar.service';
import { OpenAlexService } from './external/openalex.service';

export type AcademicSearchSource = 'semantic_scholar' | 'openalex';

export interface AcademicSearchPaper {
    resultId: string;
    source: AcademicSearchSource;
    title: string;
    abstract?: string;
    authors: Array<{ name: string; authorId?: string }>;
    venue?: string;
    year?: number;
    citationCount?: number;
    doi?: string;
    hasPdf: boolean;
    pdfUrl?: string;
    isOpenAccess?: boolean;
    fieldsOfStudy?: string[];
    semanticScholar?: {
        paperId: string;
        paperData: Record<string, unknown>;
    };
    openAlex?: {
        workId: string;
        workData: Record<string, unknown>;
    };
}

export interface AcademicSearchResponse {
    papers: AcademicSearchPaper[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    sourceCounts: {
        semanticScholar: number;
        openAlex: number;
        withPdf: number;
    };
}

@Injectable()
export class AcademicSearchService {
    private readonly logger = new Logger(AcademicSearchService.name);

    constructor(
        private readonly semanticScholarService: SemanticScholarService,
        private readonly openAlexService: OpenAlexService,
    ) {}

    async search(query: string, limit: number = 20, offset: number = 0): Promise<AcademicSearchResponse> {
        const requestedLimit = Math.min(Math.max(1, limit), 100);
        const requestedOffset = Math.max(0, offset);

        const [semanticResult, openAlexResult] = await Promise.allSettled([
            this.semanticScholarService.searchPapers(query, requestedLimit, requestedOffset),
            this.openAlexService.searchWorks(query, requestedLimit, requestedOffset),
        ]);

        const semanticPapers =
            semanticResult.status === 'fulfilled' ? semanticResult.value.papers : [];
        const openAlexWorks =
            openAlexResult.status === 'fulfilled' ? openAlexResult.value.works : [];

        if (semanticResult.status === 'rejected') {
            this.logger.warn(`Semantic Scholar search failed: ${semanticResult.reason?.message || semanticResult.reason}`);
        }
        if (openAlexResult.status === 'rejected') {
            this.logger.warn(`OpenAlex search failed: ${openAlexResult.reason?.message || openAlexResult.reason}`);
        }

        const merged = this.mergeResults(semanticPapers, openAlexWorks);

        const semanticHasMore =
            semanticResult.status === 'fulfilled' ? semanticResult.value.hasMore : false;
        const openAlexHasMore =
            openAlexResult.status === 'fulfilled' ? openAlexResult.value.hasMore : false;

        return {
            papers: merged,
            total: merged.length,
            limit: requestedLimit,
            offset: requestedOffset,
            hasMore: semanticHasMore || openAlexHasMore,
            sourceCounts: {
                semanticScholar: merged.filter((paper) => paper.source === 'semantic_scholar').length,
                openAlex: merged.filter((paper) => paper.source === 'openalex').length,
                withPdf: merged.filter((paper) => paper.hasPdf).length,
            },
        };
    }

    private mergeResults(semanticPapers: any[], openAlexWorks: any[]): AcademicSearchPaper[] {
        const byDoi = new Map<string, AcademicSearchPaper>();
        const byTitle = new Map<string, AcademicSearchPaper>();
        const ordered: AcademicSearchPaper[] = [];

        for (const paper of semanticPapers) {
            const mapped = this.mapSemanticScholarPaper(paper);
            this.registerPaper(mapped, byDoi, byTitle, ordered);
        }

        for (const work of openAlexWorks) {
            const mapped = this.mapOpenAlexWork(work);
            this.mergeOrRegisterPaper(mapped, byDoi, byTitle, ordered);
        }

        return ordered.sort((a, b) => {
            if (a.hasPdf !== b.hasPdf) {
                return a.hasPdf ? -1 : 1;
            }
            return 0;
        });
    }

    private registerPaper(
        paper: AcademicSearchPaper,
        byDoi: Map<string, AcademicSearchPaper>,
        byTitle: Map<string, AcademicSearchPaper>,
        ordered: AcademicSearchPaper[],
    ) {
        ordered.push(paper);
        if (paper.doi) {
            byDoi.set(this.normalizeDoi(paper.doi), paper);
        }
        byTitle.set(this.normalizeTitle(paper.title), paper);
    }

    private mergeOrRegisterPaper(
        paper: AcademicSearchPaper,
        byDoi: Map<string, AcademicSearchPaper>,
        byTitle: Map<string, AcademicSearchPaper>,
        ordered: AcademicSearchPaper[],
    ) {
        const doiKey = paper.doi ? this.normalizeDoi(paper.doi) : null;
        const titleKey = this.normalizeTitle(paper.title);

        const existing =
            (doiKey && byDoi.get(doiKey)) ||
            byTitle.get(titleKey);

        if (existing) {
            if (!existing.hasPdf && paper.hasPdf) {
                existing.hasPdf = true;
                existing.pdfUrl = paper.pdfUrl;
                existing.isOpenAccess = existing.isOpenAccess || paper.isOpenAccess;
            }
            if (!existing.openAlex && paper.openAlex) {
                existing.openAlex = paper.openAlex;
            }
            return;
        }

        this.registerPaper(paper, byDoi, byTitle, ordered);
    }

    private mapSemanticScholarPaper(paper: any): AcademicSearchPaper {
        const doi = paper.externalIds?.DOI;
        const pdfUrl = paper.openAccessPdf?.url;

        return {
            resultId: `ss:${paper.paperId}`,
            source: 'semantic_scholar',
            title: paper.title || '',
            abstract: paper.abstract,
            authors:
                paper.authors?.map((author: any) => ({
                    name: author.name || `${author.givenName || ''} ${author.familyName || ''}`.trim(),
                    authorId: author.authorId,
                })) || [],
            venue: paper.venue || paper.journal?.name,
            year: paper.year,
            citationCount: paper.citationCount,
            doi,
            hasPdf: Boolean(pdfUrl),
            pdfUrl,
            isOpenAccess: paper.isOpenAccess,
            fieldsOfStudy: paper.fieldsOfStudy,
            semanticScholar: {
                paperId: paper.paperId,
                paperData: paper,
            },
        };
    }

    private mapOpenAlexWork(work: any): AcademicSearchPaper {
        const doi = this.extractDoi(work.doi);
        const pdfUrl =
            work.best_oa_location?.pdf_url ||
            work.primary_location?.pdf_url ||
            work.open_access?.oa_url ||
            undefined;

        const authors =
            work.authorships?.map((authorship: any) => ({
                name: authorship.author?.display_name || '',
            })).filter((author: { name: string }) => author.name) || [];

        const workId = this.extractOpenAlexId(work.id);

        return {
            resultId: `oa:${workId}`,
            source: 'openalex',
            title: work.display_name || work.title || '',
            abstract: this.openAlexService.reconstructAbstract(work.abstract_inverted_index),
            authors,
            venue: work.primary_location?.source?.display_name,
            year: work.publication_year,
            citationCount: work.cited_by_count,
            doi,
            hasPdf: Boolean(pdfUrl),
            pdfUrl,
            isOpenAccess: work.open_access?.is_oa,
            fieldsOfStudy: work.concepts?.slice(0, 3).map((concept: any) => concept.display_name).filter(Boolean),
            openAlex: {
                workId,
                workData: work,
            },
        };
    }

    private extractDoi(doi?: string | null): string | undefined {
        if (!doi) return undefined;
        return doi.replace(/^https?:\/\/doi\.org\//i, '').trim();
    }

    private extractOpenAlexId(id?: string | null): string {
        if (!id) return '';
        const parts = id.split('/');
        return parts[parts.length - 1] || id;
    }

    private normalizeDoi(doi: string): string {
        return doi.replace(/^https?:\/\/doi\.org\//i, '').trim().toLowerCase();
    }

    private normalizeTitle(title: string): string {
        return title.trim().toLowerCase().replace(/\s+/g, ' ');
    }
}
