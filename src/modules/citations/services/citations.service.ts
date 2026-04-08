import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { DocumentCollaboratorService } from 'src/modules/documents/services/document-collaborator.service';
import { DocumentsService } from 'src/modules/documents/services/documents.service';
import { ReferencesService } from 'src/modules/references/references.service';
import { UserService } from 'src/modules/user/user.service';
import { CitationStylesService } from './citation-styles.service'; // Style service'i import et
import { CitationResponse, CitationResponseWithReferences } from '../dto/citation.response';
import { CreateCitationDto } from '../dto/create-citation.dto';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { CITATIONS_MESSAGES } from '../constants/citation.messages';
import { UpdateCitationDto } from '../dto/update-citation.dto';
import { QuoteParaphraseDto, QuoteParaphraseResponse, QuoteParaphraseType } from '../dto/quote-paraphrase.dto';
import { isAllowedTargetLang } from '../constants/translation-target-languages';
import { GeminiService } from '../external/gemini.service';

@Injectable()
export class CitationsService {
    private readonly logger = new Logger(CitationsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly documentCollaboratorService: DocumentCollaboratorService,
        private readonly referenceService: ReferencesService,
        private readonly documentService: DocumentsService,
        private readonly citationStylesService: CitationStylesService,
        private readonly geminiService: GeminiService
    ) { }

    async create(userId: string, data: CreateCitationDto): Promise<CitationResponse> {
        await this.referenceService.getReference(data.referenceId);

        const sortOrder = data.documentId ? await this.getNextSortOrder(data.documentId) : 0;

        let styleId = data.styleId;
        if (!styleId) {
            const officeDoc = await this.prisma.officeDocuments.findUnique({
                where: { id: data.documentId }
            });
            if (officeDoc && officeDoc.styleId) {
                styleId = officeDoc.styleId;
            } else {
                styleId = await this.getDefaultStyleId();
            }
        }

        try {
            let citationText: string;

            // For numbered styles (Cell/Nature/IEEE), include all existing document
            // citations so citeproc assigns the correct sequential number.
            if (data.documentId) {
                const existingCitations = await this.prisma.citation.findMany({
                    where: { documentId: data.documentId },
                    orderBy: { sortOrder: 'asc' }
                });

                const allCitationData = [
                    ...existingCitations.map(c => ({
                        id: c.id,
                        referenceId: c.referenceId,
                        suppressAuthor: c.suppressAuthor,
                        suppressDate: c.suppressDate,
                        pageNumbers: c.pageNumbers || '',
                        prefix: c.prefix || '',
                        suffix: c.suffix || ''
                    })),
                    {
                        id: '__new__',
                        referenceId: data.referenceId,
                        suppressAuthor: data.suppressAuthor,
                        suppressDate: data.suppressDate,
                        pageNumbers: data.pageNumbers || '',
                        prefix: data.prefix || '',
                        suffix: data.suffix || ''
                    }
                ];

                const formattedTexts = await this.citationStylesService.formatCitationsBatchWithStyle(styleId, allCitationData);
                citationText = formattedTexts.get('__new__') || '';

                if (!citationText) {
                    citationText = await this.citationStylesService.formatCitationWithStyle(styleId, {
                        referenceId: data.referenceId, suppressAuthor: data.suppressAuthor,
                        suppressDate: data.suppressDate, pageNumbers: data.pageNumbers,
                        prefix: data.prefix, suffix: data.suffix
                    });
                }
            } else {
                citationText = await this.citationStylesService.formatCitationWithStyle(styleId, {
                    referenceId: data.referenceId, suppressAuthor: data.suppressAuthor,
                    suppressDate: data.suppressDate, pageNumbers: data.pageNumbers,
                    prefix: data.prefix, suffix: data.suffix
                });
            }

            const citation = await this.prisma.citation.create({
                data: {
                    referenceId: data.referenceId,
                    documentId: data.documentId,
                    citationText: citationText,
                    pageNumbers: data.pageNumbers || '',
                    prefix: data.prefix || '',
                    suffix: data.suffix || '',
                    suppressAuthor: data.suppressAuthor || false,
                    suppressDate: data.suppressDate || false,
                    sortOrder: sortOrder,
                    styleId: styleId,
                    fieldId: data.fieldId
                }
            });

            return citation;
        } catch (error) {
            console.error('❌ Citation creation failed:', error);
            throw new CustomHttpException('Failed to create citation', 500, 'Citation creation failed');
        }
    }

    async getCitationsByDocument(documentId: string, userId: string): Promise<CitationResponseWithReferences[]> {
        // ✅ Önce citation'ları kontrol et - eğer citation'lar varsa document access var demektir
        const citations = await this.prisma.citation.findMany({
            where: {
                documentId,
            },
            orderBy: {
                sortOrder: 'asc'
            },
            include: {
                reference: true
            }
        });

        // Eğer citation'lar varsa, document access var demektir (Word document'ler için)
        if (citations.length > 0) {
            return citations;
        }

        // Eğer citation yoksa ve documentId office_documents'te değilse, boş array döndür
        // (Hata fırlatma - kullanıcı henüz citation oluşturmamış olabilir)
        if (!documentId.startsWith('doc_')) {
            // Office document kontrolü yap (opsiyonel - sadece bilgi için)
            const officeDoc = await this.prisma.officeDocuments.findUnique({
                where: { id: documentId }
            });
            
            // Office document yoksa ve citation da yoksa, boş array döndür
            if (!officeDoc) {
                return [];
            }
            
            // Office document varsa owner kontrolü yap
            if (officeDoc.userId !== userId) {
                throw new CustomHttpException(CITATIONS_MESSAGES.USER_NOT_COLLABORATOR, 403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR);
            }
        }

        return citations;
    }

    async update(id: string, data: UpdateCitationDto): Promise<CitationResponse> {
        const citation = await this.prisma.citation.findUnique({
            where: { id }
        });

        if (!citation) {
            throw new CustomHttpException(CITATIONS_MESSAGES.CITATION_NOT_FOUND, 404, CITATIONS_MESSAGES.CITATION_NOT_FOUND);
        }

        // ✅ Eğer citationText data'da varsa, onu kullan (refresh'ten geliyor)
        let citation_text = data.citationText || citation.citationText;

        // Style değişmişse veya citation parametreleri değişmişse yeniden formatla
        // Ama eğer citationText zaten data'da varsa, formatlamaya gerek yok
        if (!data.citationText && this.needsReformatting(citation, data)) {
            try {
                const styleId = data.styleId || citation.styleId;

                citation_text = await this.citationStylesService.formatCitationWithStyle(styleId, {
                    referenceId: citation.referenceId,
                    suppressAuthor: data.suppressAuthor ?? citation.suppressAuthor,
                    suppressDate: data.suppressDate ?? citation.suppressDate,
                    pageNumbers: data.pageNumbers ?? citation.pageNumbers ?? '',
                    prefix: data.prefix ?? citation.prefix ?? '',
                    suffix: data.suffix ?? citation.suffix ?? ''
                });

            } catch (error) {
                console.error('❌ Citation update formatting failed:', error);
                // Eski citation text'i koru
            }
        }

        // ✅ pageNumbers, prefix, suffix korunmalı (undefined gelirse eski değer korunur)
        const updateData: any = {
            ...data,
            citationText: citation_text
        };
        
        // Eğer pageNumbers undefined gelirse, eski değeri koru
        if (data.pageNumbers === undefined) {
            updateData.pageNumbers = citation.pageNumbers ?? '';
        }
        if (data.prefix === undefined) {
            updateData.prefix = citation.prefix ?? '';
        }
        if (data.suffix === undefined) {
            updateData.suffix = citation.suffix ?? '';
        }

        const updatedCitation = await this.prisma.citation.update({
            where: { id },
            data: updateData
        });

        return updatedCitation;
    }

    private needsReformatting(existingCitation: any, updateData: UpdateCitationDto): boolean {
        return (
            (updateData.styleId && updateData.styleId !== existingCitation.styleId) ||
            updateData.suppressAuthor !== undefined ||
            updateData.suppressDate !== undefined ||
            updateData.pageNumbers !== undefined ||
            updateData.prefix !== undefined ||
            updateData.suffix !== undefined
        );
    }

    async delete(id: string): Promise<{ message: string }> {
        const citation = await this.prisma.citation.findUnique({
            where: { id }
        });

        if (!citation) {
            throw new CustomHttpException(CITATIONS_MESSAGES.CITATION_NOT_FOUND, 404, CITATIONS_MESSAGES.CITATION_NOT_FOUND);
        }

        await this.prisma.citation.delete({
            where: { id }
        });

        return { message: CITATIONS_MESSAGES.CITATION_DELETED_SUCCESSFULLY };
    }

    async deleteByDocumentAndReference(documentId: string, referenceId: string): Promise<{ count: number }> {
        const result = await this.prisma.citation.deleteMany({
            where: { documentId, referenceId }
        });
        return { count: result.count };
    }

    async updateFieldId(citationId: string, fieldId: string): Promise<CitationResponse> {
        const citation = await this.prisma.citation.findUnique({
            where: { id: citationId }
        });

        if (!citation) {
            throw new CustomHttpException(CITATIONS_MESSAGES.CITATION_NOT_FOUND, 404, CITATIONS_MESSAGES.CITATION_NOT_FOUND);
        }

        return await this.prisma.citation.update({
            where: { id: citationId },
            data: { fieldId }
        });
    }

    async updateSortOrder(citationId: string, sortOrder: number): Promise<void> {
        const citation = await this.prisma.citation.findUnique({
            where: { id: citationId }
        });

        if (!citation) {
            throw new CustomHttpException(CITATIONS_MESSAGES.CITATION_NOT_FOUND, 404, CITATIONS_MESSAGES.CITATION_NOT_FOUND);
        }

        await this.prisma.citation.update({
            where: { id: citationId },
            data: { sortOrder }
        });
    }

    async generateBibliography(documentId: string, userId: string, styleId?: string): Promise<any> {
        const citations = await this.prisma.citation.findMany({
            where: { documentId },
            orderBy: { sortOrder: 'asc' }
        });

        if (citations.length === 0) {
            return {
                bibliographyText: 'Kaynakça bulunamadı.',
                citationCount: 0,
                uniqueReferences: 0,
                style: 'none'
            };
        }

        // ✅ Silinmiş referansları filtrele - sadece var olanları al
        const allReferenceIds = [...new Set(citations.map(c => c.referenceId))];
        const existingReferences = await this.prisma.references.findMany({
            where: { id: { in: allReferenceIds } },
            select: { id: true }
        });
        const existingReferenceIds = new Set(existingReferences.map(r => r.id));
        
        // Silinmiş referanslara ait citation'ları da sil (opsiyonel - temizlik)
        const deletedReferenceIds = allReferenceIds.filter(id => !existingReferenceIds.has(id));
        if (deletedReferenceIds.length > 0) {
            console.log(`🗑️ Cleaning up ${deletedReferenceIds.length} citations with deleted references`);
            await this.prisma.citation.deleteMany({
                where: { 
                    documentId,
                    referenceId: { in: deletedReferenceIds }
                }
            });
        }

        // Sadece var olan referansları içeren citation'ları al
        const validCitations = citations.filter(c => existingReferenceIds.has(c.referenceId));
        
        if (validCitations.length === 0) {
            return {
                bibliographyText: 'Kaynakça bulunamadı.',
                citationCount: 0,
                uniqueReferences: 0,
                style: 'none'
            };
        }

        const finalStyleId = styleId || validCitations[0]?.styleId || await this.getDefaultStyleId();
        const style = await this.citationStylesService.getStyleById(finalStyleId);
        const styleShortName = style.shortName?.toLowerCase();

        try {
            if (styleShortName === 'ieee' || styleShortName === 'vancouver') {

                this.citationStylesService.resetCitationNumbers();

                const referenceNumberMap = new Map<string, number>();
                const uniqueReferenceIds: string[] = [];

                validCitations.forEach((citation) => {
                    if (!referenceNumberMap.has(citation.referenceId)) {
                        const nextNumber = uniqueReferenceIds.length + 1;
                        referenceNumberMap.set(citation.referenceId, nextNumber);
                        uniqueReferenceIds.push(citation.referenceId);
                    }
                });

                this.citationStylesService.presetCitationNumbers(referenceNumberMap);

                const bibliographyEntries = await this.citationStylesService.generateBibliography(
                    uniqueReferenceIds,
                    finalStyleId
                );

                const bibliographyText = this.formatFinalBibliography(bibliographyEntries, style);

                return {
                    bibliographyText,
                    bibliographyHtml: this.convertToHTML(bibliographyText, style),
                    citationCount: validCitations.length,
                    uniqueReferences: uniqueReferenceIds.length,
                    style: style.name,
                    entries: bibliographyEntries
                };
            }

            // Diğer stiller için normal flow
            const uniqueReferenceIds = [...new Set(validCitations.map(c => c.referenceId))];

            this.citationStylesService.resetCitationNumbers();

            const bibliographyEntries = await this.citationStylesService.generateBibliography(
                uniqueReferenceIds,
                finalStyleId
            );

            const bibliographyText = this.formatFinalBibliography(bibliographyEntries, style);

            return {
                bibliographyText,
                bibliographyHtml: this.convertToHTML(bibliographyText, style),
                citationCount: validCitations.length,
                uniqueReferences: uniqueReferenceIds.length,
                style: style.name,
                // entries: sortedEntries
            };

        } catch (error) {
            console.error('❌ Bibliography generation failed:', error);
            return {
                bibliographyText: 'Kaynakça oluşturulurken hata oluştu.',
                citationCount: validCitations.length,
                uniqueReferences: 0,
                style: style.name,
                error: error.message
            };
        }
    }

    private formatFinalBibliography(entries: string[], style: any): string {
        if (entries.length === 0) {
            return 'No references found.';
        }

        let bibliography = '';
        const styleShortName = style.shortName?.toLowerCase();

        // ✅ "References" başlığını kaldırdık - Word'de kullanıcı isterse ekler

        if (styleShortName === 'ieee' || styleShortName === 'vancouver') {
            entries.forEach((entry, index) => {
                const cleanEntry = entry.trim();
                if (cleanEntry) {
                    const hasNumber = cleanEntry.match(/^\[\d+\]/);

                    if (hasNumber) {
                        const numberMatch = cleanEntry.match(/^\[(\d+)\]/);
                        const number = numberMatch ? numberMatch[1] : (index + 1).toString();
                        const contentWithoutNumber = cleanEntry.replace(/^\[\d+\]\s*/, '').trim();

                        bibliography += `[${number}] ${contentWithoutNumber}\n\n`;
                    } else {
                        const processedEntry = cleanEntry
                            .replace(/^\[\d+\]\s*/, '')
                            .replace(/^[\d+]\s*/, '')
                            .replace(/^\([^)]+\)\s*/, '')
                            .trim();

                        bibliography += `[${index + 1}] ${processedEntry}\n\n`;
                    }
                }
            });
        } else {
            entries.forEach(entry => {
                const cleanEntry = entry.trim();
                if (cleanEntry) {
                    const processedEntry = cleanEntry
                        .replace(/^\[\d+\]\s*/, '')
                        .trim();

                    bibliography += `${processedEntry}\n\n`;
                }
            });
        }

        return bibliography.trim();
    }


    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async refreshCitationsByStyle(documentId: string, newStyleId: string, _userId: string): Promise<number> {
        const citations = await this.prisma.citation.findMany({
            where: { documentId },
            orderBy: { sortOrder: 'asc' }
        });

        if (citations.length === 0) return 0;

        // Batch formatting: single citeproc engine for correct numbering (Cell/Nature/IEEE)
        const citationData = citations.map(c => ({
            id: c.id,
            referenceId: c.referenceId,
            suppressAuthor: c.suppressAuthor,
            suppressDate: c.suppressDate,
            pageNumbers: c.pageNumbers || '',
            prefix: c.prefix || '',
            suffix: c.suffix || ''
        }));

        const formattedTexts = await this.citationStylesService.formatCitationsBatchWithStyle(newStyleId, citationData);

        let updatedCount = 0;
        for (const citation of citations) {
            try {
                const newText = formattedTexts.get(citation.id);
                if (newText) {
                    await this.prisma.citation.update({
                        where: { id: citation.id },
                        data: { citationText: newText, styleId: newStyleId }
                    });
                    updatedCount++;
                }
            } catch (error) {
                console.error(`❌ Failed to update citation ${citation.id}:`, error);
            }
        }

        // Keep officeDocuments.styleId in sync (updateMany won't throw if no record found)
        try {
            await this.prisma.officeDocuments.updateMany({
                where: { id: documentId },
                data: { styleId: newStyleId }
            });
        } catch { /* ignore */ }

        return updatedCount;
    }

    private async checkDocumentAccess(documentId: string, userId: string): Promise<boolean> {
        const document = await this.documentService.getDocument(documentId);

        if (document.createdBy === userId) return true;

        const collaborators = await this.documentCollaboratorService.getDocumentCollaborators(documentId);

        return collaborators.some((collaborator) =>
            collaborator.userId === userId && (collaborator.role === 'owner' || collaborator.role === 'editor')
        );
    }

    private async getNextSortOrder(documentId: string): Promise<number> {
        const lastCitation = await this.prisma.citation.findFirst({
            where: { documentId },
            orderBy: { sortOrder: 'desc' }
        });

        return (lastCitation?.sortOrder || 0) + 1;
    }

    private async getDefaultStyleId(): Promise<string> {
        const apaStyle = await this.prisma.citationStyle.findFirst({
            where: { shortName: 'apa' }
        });

        if (!apaStyle) {
            const firstStyle = await this.prisma.citationStyle.findFirst();
            if (!firstStyle) {
                throw new CustomHttpException('No citation styles available', 500, 'No citation styles available');
            }
            return firstStyle.id;
        }

        return apaStyle.id;
    }

    private convertToHTML(bibliographyText: string, style: any): string {
        const htmlText = bibliographyText
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');

        const lines = htmlText.split('<br>');
        let html = '<div class="bibliography">\n';

        const title = lines[0];
        html += `<h2 class="bibliography-title">${title}</h2>\n`;

        const entries = lines.slice(2);
        const styleClass = style.shortName.toLowerCase();

        entries.forEach((entry) => {
            if (entry.trim()) {
                const isNumbered = styleClass === 'ieee' || styleClass === 'vancouver' ||
                    styleClass === 'nature' || styleClass === 'science';
                const hasHangingIndent = !isNumbered;

                html += `<div class="bibliography-entry ${hasHangingIndent ? 'hanging-indent' : ''}" 
                      style="${hasHangingIndent ? 'text-indent: -36px; margin-left: 36px;' : ''} 
                             ${isNumbered ? 'margin-bottom: 12pt;' : 'line-height: 2.0;'}">${entry}</div>\n`;
            }
        });

        html += '</div>';
        return html;
    }

    async processQuoteParaphrase(data: QuoteParaphraseDto): Promise<QuoteParaphraseResponse> {
        let reference: any;
        let referenceId: string;
        let isRealReference = false;

        // Get reference from DB or create temporary from referenceData
        if (data.referenceId) {
            // Scenario 2: Existing reference from DB
            reference = await this.referenceService.getReference(data.referenceId);
            referenceId = data.referenceId;
            isRealReference = true;
        } else if (data.referenceData) {
            // Scenario 1: Temporary reference from Semantic Scholar
            reference = this.createTemporaryReference(data.referenceData);
            referenceId = 'temp-' + Date.now(); // Temporary ID for response
        } else {
            throw new CustomHttpException('Either referenceId or referenceData must be provided', 400, 'Missing reference information');
        }

        const rawTarget = data.targetLang?.trim().toLowerCase();
        if (rawTarget && !isAllowedTargetLang(rawTarget)) {
            throw new CustomHttpException('Invalid targetLang', 400, 'INVALID_TARGET_LANG');
        }

        let workingText = data.selectedText;
        if (rawTarget) {
            workingText = await this.geminiService.translateToLanguage(data.selectedText, rawTarget);
        }

        let content: string;

        if (data.type === QuoteParaphraseType.PARAPHRASE) {
            content = rawTarget
                ? await this.geminiService.paraphraseText(workingText, rawTarget)
                : await this.geminiService.paraphraseText(workingText);
            const same = (content || '').trim() === (workingText || '').trim();
            if (same) {
                this.logger.warn('Paraphrase output equals input (likely fallback or model echo)', {
                    selectedTextLen: (data.selectedText || '').length,
                    outputLen: (content || '').length,
                    hasReferenceId: !!data.referenceId,
                    hasReferenceData: !!data.referenceData,
                    targetLang: rawTarget || null,
                });
            } else {
                this.logger.debug('Paraphrase output differs from input', {
                    selectedTextLen: (data.selectedText || '').length,
                    outputLen: (content || '').length,
                    targetLang: rawTarget || null,
                });
            }
        } else {
            content = workingText;
        }

        // Get style ID (default to 'apa' if not provided)
        let styleId = data.styleId;
        if (!styleId) {
            styleId = await this.getDefaultStyleId();
        }

        // Format citation using temporary reference object
        const pageNumbers = data.pageNumber ? data.pageNumber.toString() : undefined;
        const citation = await this.formatCitationFromReference(styleId, reference, {
            pageNumbers: pageNumbers
        });

        // Save as Citation record if documentId and a real referenceId are available
        if (data.documentId && isRealReference) {
            try {
                const sortOrder = await this.getNextSortOrder(data.documentId);
                await this.prisma.citation.create({
                    data: {
                        referenceId: referenceId,
                        documentId: data.documentId,
                        citationText: citation,
                        pageNumbers: pageNumbers || '',
                        prefix: '',
                        suffix: '',
                        suppressAuthor: false,
                        suppressDate: false,
                        sortOrder,
                        styleId: styleId,
                    }
                });
            } catch (error) {
                // Non-critical — log and continue even if save fails
                console.error('Failed to save quote/paraphrase as citation record:', error);
            }
        }

        return {
            content,
            citation,
            referenceId: referenceId
        };
    }

    private createTemporaryReference(referenceData: any): any {
        // Convert referenceData to reference object format
        let authors: any[] = [];
        
        if (referenceData.authors) {
            if (Array.isArray(referenceData.authors)) {
                authors = referenceData.authors.map((author: string) => ({ name: author }));
            } else if (typeof referenceData.authors === 'string') {
                authors = [{ name: referenceData.authors }];
            }
        }

        return {
            id: 'temp-' + Date.now(),
            title: referenceData.title || '',
            authors: authors,
            year: referenceData.year || null,
            publication: referenceData.publication || '',
            doi: referenceData.doi || '',
            pages: referenceData.pages || '',
            volume: referenceData.volume || '',
            type: 'article', // Default type
        };
    }

    private async formatCitationFromReference(
        styleId: string,
        reference: any,
        options: { pageNumbers?: string; suppressAuthor?: boolean; suppressDate?: boolean; prefix?: string; suffix?: string }
    ): Promise<string> {
        return await this.citationStylesService.formatCitationWithReference(styleId, reference, options);
    }
}