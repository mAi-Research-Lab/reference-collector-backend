import { Injectable } from '@nestjs/common';
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

@Injectable()
export class CitationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly documentCollaboratorService: DocumentCollaboratorService,
        private readonly referenceService: ReferencesService,
        private readonly documentService: DocumentsService,
        private readonly citationStylesService: CitationStylesService
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
            const citation_text = await this.citationStylesService.formatCitationWithStyle(styleId, {
                referenceId: data.referenceId,
                suppressAuthor: data.suppressAuthor,
                suppressDate: data.suppressDate,
                pageNumbers: data.pageNumbers,
                prefix: data.prefix,
                suffix: data.suffix
            });


            const citation = await this.prisma.citation.create({
                data: {
                    referenceId: data.referenceId,
                    documentId: data.documentId,
                    citationText: citation_text,
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
            
            // Office document varsa access kontrolü yap
            if (!await this.checkDocumentAccess(documentId, userId)) {
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


    async refreshCitationsByStyle(documentId: string, newStyleId: string, userId: string): Promise<number> {
        const whereClause: any = { documentId };

        // Document access kontrolü
        if (documentId.startsWith('doc_')) {
            whereClause.userId = userId;
        } else {
            if (!await this.checkDocumentAccess(documentId, userId)) {
                throw new CustomHttpException(CITATIONS_MESSAGES.USER_NOT_COLLABORATOR, 403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR);
            }
        }

        const citations = await this.prisma.citation.findMany({
            where: whereClause
        });


        this.citationStylesService.resetCitationNumbers();

        let updatedCount = 0;

        for (const citation of citations) {
            try {
                const newCitationText = await this.citationStylesService.formatCitationWithStyle(newStyleId, {
                    referenceId: citation.referenceId,
                    suppressAuthor: citation.suppressAuthor,
                    suppressDate: citation.suppressDate,
                    pageNumbers: citation.pageNumbers!,
                    prefix: citation.prefix!,
                    suffix: citation.suffix!
                });

                await this.prisma.citation.update({
                    where: { id: citation.id },
                    data: {
                        citationText: newCitationText,
                        styleId: newStyleId
                    }
                });

                updatedCount++;
            } catch (error) {
                console.error(`❌ Failed to update citation ${citation.id}:`, error);
            }
        }

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
}