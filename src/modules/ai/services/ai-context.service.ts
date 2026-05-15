import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import * as fs from 'fs/promises';
import * as pdfParseModule from 'pdf-parse';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { LIBRARY_MESSAGES } from 'src/modules/libraries/constants/library.messages';
import { DOCUMENT_MESSAGES } from 'src/modules/documents/constants/document/document.messages';
import { S3StorageService } from 'src/modules/references/services/s3-storage.service';
import { AiChatDto } from '../dto/ai-chat.dto';

interface AiContextResult {
    context: string;
    inputChars: number;
}

@Injectable()
export class AiContextService {
    private readonly logger = new Logger(AiContextService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly s3Storage: S3StorageService,
    ) { }

    async buildContext(userId: string, dto: AiChatDto, maxInputChars: number): Promise<AiContextResult> {
        await this.ensureLibraryAccess(dto.libraryId, userId);
        if (dto.documentId) {
            await this.ensureDocumentAccess(dto.documentId, userId);
        }

        const parts: string[] = [
            '# Citext Context',
            `Mode: ${dto.mode || (dto.documentId ? 'document' : 'library')}`,
        ];

        const documentText = this.htmlToText(dto.documentHtml || '');
        if (documentText) {
            parts.push(`\n[OPEN_DOCUMENT:${dto.documentTitle || dto.documentId || 'Untitled'}]\n${documentText}`);
        }
        if (dto.selectedText?.trim()) {
            parts.push(`\n[SELECTED_TEXT]\n${this.cleanText(dto.selectedText)}`);
        }

        const references = await this.prisma.references.findMany({
            where: {
                libraryId: dto.libraryId,
                isDeleted: false,
                ...(dto.referenceIds?.length ? { id: { in: dto.referenceIds } } : {}),
            },
            select: {
                id: true,
                title: true,
                type: true,
                authors: true,
                year: true,
                publication: true,
                doi: true,
                url: true,
                abstractText: true,
                notes: true,
                Files: {
                    where: {
                        OR: [
                            { mimeType: { contains: 'pdf', mode: 'insensitive' } },
                            { originalFilename: { endsWith: '.pdf', mode: 'insensitive' } },
                        ],
                    },
                    select: {
                        id: true,
                        originalFilename: true,
                        storagePath: true,
                        storageProvider: true,
                        mimeType: true,
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        for (const reference of references) {
            parts.push(this.referenceToContext(reference));
            for (const file of reference.Files) {
                const pdfText = await this.extractPdfText(file.storagePath, String(file.storageProvider));
                if (pdfText) {
                    parts.push(`\n[PDF:${file.originalFilename};REFERENCE_ID:${reference.id};FILE_ID:${file.id}]\n${pdfText}`);
                }
            }
        }

        const context = this.cleanText(parts.join('\n\n'));
        if (context.length > maxInputChars) {
            throw new CustomHttpException('Bağlam çok geniş, lütfen daha az doküman veya referans seçin', 413, 'AI_CONTEXT_TOO_LARGE');
        }

        return { context, inputChars: context.length + dto.prompt.length };
    }

    private async ensureLibraryAccess(libraryId: string, userId: string): Promise<void> {
        const library = await this.prisma.libraries.findFirst({
            where: { id: libraryId, isDeleted: false },
            select: { ownerId: true, type: true },
        });

        if (!library) throw new CustomHttpException(LIBRARY_MESSAGES.LIBRARY_NOT_FOUND, 404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND);
        if (library.ownerId === userId) return;
        if (library.type !== 'shared' && library.type !== 'group') {
            throw new CustomHttpException(DOCUMENT_MESSAGES.USER_NOT_OWNER, 403, DOCUMENT_MESSAGES.USER_NOT_OWNER);
        }

        const membership = await this.prisma.libraryMemberships.findUnique({
            where: { libraryId_userId: { libraryId, userId } },
        });
        if (!membership) throw new CustomHttpException(DOCUMENT_MESSAGES.USER_NOT_MEMBER, 403, DOCUMENT_MESSAGES.USER_NOT_MEMBER);
    }

    private async ensureDocumentAccess(documentId: string, userId: string): Promise<void> {
        const document = await this.prisma.documents.findUnique({
            where: { id: documentId },
            select: { id: true, createdBy: true, libraryId: true },
        });

        if (!document) throw new CustomHttpException(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, 404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND);
        if (document.createdBy === userId) return;

        const collaborator = await this.prisma.documentCollaborators.findUnique({
            where: { documentId_userId: { documentId, userId } },
        });
        if (collaborator) return;

        await this.ensureLibraryAccess(document.libraryId, userId);
    }

    private referenceToContext(reference: any): string {
        const authors = Array.isArray(reference.authors)
            ? reference.authors.map((author: any) => author?.name || author).filter(Boolean).join(', ')
            : '';

        return [
            `[REFERENCE:${reference.id}]`,
            `Title: ${reference.title || 'Untitled'}`,
            `Type: ${reference.type || 'unknown'}`,
            reference.year ? `Year: ${reference.year}` : '',
            authors ? `Authors: ${authors}` : '',
            reference.publication ? `Publication: ${reference.publication}` : '',
            reference.doi ? `DOI: ${reference.doi}` : '',
            reference.url ? `URL: ${reference.url}` : '',
            reference.abstractText ? `Abstract: ${reference.abstractText}` : '',
            reference.notes ? `Notes: ${reference.notes}` : '',
            `[/REFERENCE:${reference.id}]`,
        ].filter(Boolean).join('\n');
    }

    private async extractPdfText(storagePath: string, storageProvider: string): Promise<string> {
        try {
            let buffer: Buffer;
            if (storageProvider === 's3') {
                if (!this.s3Storage.ready) {
                    this.logger.warn(`S3 PDF skipped because S3 is not configured: ${storagePath}`);
                    return '';
                }
                buffer = await this.s3Storage.downloadFile(storagePath);
            } else if (storageProvider === 'local') {
                buffer = await fs.readFile(storagePath);
            } else {
                return '';
            }
            const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
            const parsed = await pdfParse(buffer);
            return this.cleanText(parsed.text || '');
        } catch (error: any) {
            this.logger.warn(`PDF text extraction failed for ${storagePath}: ${error?.message || error}`);
            return '';
        }
    }

    private htmlToText(html: string): string {
        if (!html.trim()) return '';
        const dom = new JSDOM(`<main>${html}</main>`);
        dom.window.document.querySelectorAll('h1,h2,h3').forEach((node) => {
            node.textContent = `\n[SECTION:${node.textContent || 'Untitled'}]\n`;
        });
        return this.cleanText(dom.window.document.body.textContent || '');
    }

    private cleanText(value: string): string {
        return (value || '')
            .replace(/\r/g, '\n')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
}
