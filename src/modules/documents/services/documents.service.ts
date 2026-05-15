/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import * as JSZipModule from 'jszip';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CreateDocumentDto } from '../dto/document/create-document.dto';
import { DocumentResponse } from '../dto/document/document.response';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { LIBRARY_MESSAGES } from 'src/modules/libraries/constants/library.messages';
import { DOCUMENT_MESSAGES } from '../constants/document/document.messages';
import { UpdateDocumentDto } from '../dto/document/update-document.dto';
import { CollaboratorRoles } from 'generated/prisma';

type DocumentAccessMode = 'view' | 'edit' | 'manage';
type DocxRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };

@Injectable()
export class DocumentsService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async create(createdBy: string, data: CreateDocumentDto): Promise<DocumentResponse> {
        const { contentDelta, templateId, ...rest } = data;
        await this.ensureLibraryAccess(data.libraryId, createdBy, 'edit');
        const document = await this.prisma.documents.create({
            data: {
                ...rest,
                createdBy,
                contentDelta: contentDelta as any,
                ...(this.isUuid(templateId) ? { templateId } : {})
            }
        });

        await this.prisma.documentCollaborators.create({
            data: {
                documentId: document.id,
                userId: createdBy,
                role: CollaboratorRoles.owner,
                invitedBy: createdBy,
                acceptedAt: new Date(),
                permissions: {}
            }
        });

        return {
            ...document,
            contentDelta: document.contentDelta as any,
        } as DocumentResponse;
    }

    async getDocument(documentId: string, userId?: string): Promise<DocumentResponse> {
        const document = await this.prisma.documents.findUnique({
            where: {
                id: documentId
            }
        });

        if (!document) throw new CustomHttpException(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, 404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND);
        if (userId) await this.ensureDocumentAccess(document, userId, 'view');

        return {
            ...document,
            contentDelta: document.contentDelta as any,
        } as DocumentResponse;
    }

    async getUserDocuments(userId: string): Promise<DocumentResponse[]> {
        const documents = await this.prisma.documents.findMany({
            where: {
                createdBy: userId,
                isDeleted: false,
            },
            select: this.documentListSelect(),
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return this.toDocumentListResponses(documents);
    }

    async getLibraryDocuments(userId: string, libraryId: string): Promise<DocumentResponse[]> {
        const library = await this.prisma.libraries.findFirst({
            where: { id: libraryId, isDeleted: false },
            select: { ownerId: true, type: true },
        });

        if (!library) {
            throw new CustomHttpException(LIBRARY_MESSAGES.LIBRARY_NOT_FOUND, 404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND);
        }

        const isOwner = library.ownerId === userId;
        if (!isOwner) {
            if (library.type !== 'shared' && library.type !== 'group') {
                throw new CustomHttpException(DOCUMENT_MESSAGES.USER_NOT_OWNER, 403, DOCUMENT_MESSAGES.USER_NOT_OWNER);
            }
            const membership = await this.prisma.libraryMemberships.findUnique({
                where: {
                    libraryId_userId: {
                        libraryId,
                        userId,
                    },
                },
            });
            if (!membership) {
                throw new CustomHttpException(DOCUMENT_MESSAGES.USER_NOT_MEMBER, 403, DOCUMENT_MESSAGES.USER_NOT_MEMBER);
            }
        }

        const documents = await this.prisma.documents.findMany({
            where: {
                libraryId,
                isDeleted: false,
            },
            select: this.documentListSelect(),
            orderBy: {
                updatedAt: 'desc',
            },
        });

        return this.toDocumentListResponses(documents);
    }

    async updateDocument(documentId: string, userId: string, data: UpdateDocumentDto): Promise<DocumentResponse> {

        const document = await this.prisma.documents.findUnique({
            where: {
                id: documentId
            }
        });

        if (!document) throw new CustomHttpException(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, 404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND);

        await this.ensureDocumentAccess(document, userId, 'edit');

        const { contentDelta, templateId, ...rest } = data;
        const content = data.content ?? document.content;
        const updatedDocument = await this.prisma.documents.update({
            where: {
                id: documentId
            },
            data: {
                ...rest,
                ...(contentDelta !== undefined ? { contentDelta: contentDelta as any } : {}),
                ...(this.isUuid(templateId) ? { templateId } : {}),
                updatedAt: new Date(),
                wordCount: content.split(' ').filter(Boolean).length,
                charCount: content.length
            }
        });

        return {
            ...updatedDocument,
            contentDelta: updatedDocument.contentDelta as any,
        } as DocumentResponse;
    }

    async deleteDocument(documentId: string, userId: string): Promise<{ message: string }> {
        const document = await this.prisma.documents.findUnique({
            where: {
                id: documentId
            }
        });

        if (!document) throw new CustomHttpException(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, 404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND);

        await this.ensureDocumentAccess(document, userId, 'manage');

        await this.prisma.documents.delete({
            where: {
                id: documentId
            }
        });

        return { message: DOCUMENT_MESSAGES.DOCUMENT_DELETED_SUCCESSFULLY };
    }


    async updateContent(documentId: string, userId: string, content: string): Promise<DocumentResponse> {
        const document = await this.prisma.documents.findUnique({
            where: {
                id: documentId
            }
        });

        if (!document) throw new CustomHttpException(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, 404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND);
        await this.ensureDocumentAccess(document, userId, 'edit');

        const updatedDocument = await this.prisma.documents.update({
            where: {
                id: documentId
            },
            data: {
                content,
                wordCount: content.split(' ').length,
                charCount: content.length,
                contentDelta: document.contentDelta as any,
                updatedAt: new Date()
            }
        });

        return {
            ...updatedDocument,
            contentDelta: updatedDocument.contentDelta as any,
        } as DocumentResponse;
    }

    async publishDocument(documentId: string, userId: string): Promise<DocumentResponse> {
        const document = await this.prisma.documents.findUnique({
            where: {
                id: documentId
            }
        });

        if (!document) throw new CustomHttpException(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, 404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND);
        await this.ensureDocumentAccess(document, userId, 'manage');

        const publishedDocument = await this.prisma.documents.update({
            where: {
                id: documentId
            },
            data: {
                isPublished: true,
                publishedAt: new Date()
            }
        });

        return {
            ...publishedDocument,
            contentDelta: publishedDocument.contentDelta as any,
        } as DocumentResponse;
    }

    async exportDocumentAsDocx(documentId: string, userId: string): Promise<{ buffer: Buffer; filename: string }> {
        const document = await this.getDocument(documentId, userId);
        const JSZipCtor = (JSZipModule as unknown as { default?: new () => any }).default
            ?? (JSZipModule as unknown as new () => any);
        const zip = new JSZipCtor();
        const paragraphs = this.htmlToDocxParagraphs(document.content || '');
        const documentXml = this.buildDocumentXml(paragraphs.length > 0 ? paragraphs : [[{ text: document.title || '' }]]);

        zip.file('[Content_Types].xml', this.getDocxContentTypesXml());
        zip.folder('_rels')?.file('.rels', this.getDocxRootRelsXml());
        zip.folder('word')?.file('document.xml', documentXml);
        zip.folder('word')?.folder('_rels')?.file('document.xml.rels', this.getDocxDocumentRelsXml());
        zip.folder('word')?.file('styles.xml', this.getDocxStylesXml());

        const buffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });

        return {
            buffer,
            filename: `${this.sanitizeFilename(document.title || 'document')}.docx`,
        };
    }

    private async ensureLibraryAccess(libraryId: string, userId: string, mode: DocumentAccessMode): Promise<void> {
        const library = await this.prisma.libraries.findFirst({
            where: { id: libraryId, isDeleted: false },
            select: { ownerId: true, type: true },
        });

        if (!library) {
            throw new CustomHttpException(LIBRARY_MESSAGES.LIBRARY_NOT_FOUND, 404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND);
        }

        if (library.ownerId === userId) return;

        if (library.type !== 'shared' && library.type !== 'group') {
            throw new CustomHttpException(DOCUMENT_MESSAGES.USER_NOT_OWNER, 403, DOCUMENT_MESSAGES.USER_NOT_OWNER);
        }

        const membership = await this.prisma.libraryMemberships.findUnique({
            where: {
                libraryId_userId: {
                    libraryId,
                    userId,
                },
            },
        });

        if (!membership) {
            throw new CustomHttpException(DOCUMENT_MESSAGES.USER_NOT_MEMBER, 403, DOCUMENT_MESSAGES.USER_NOT_MEMBER);
        }

        if (mode === 'view') return;
        if (mode === 'edit' && ['owner', 'admin', 'editor', 'member'].includes(membership.role)) return;
        if (mode === 'manage' && ['owner', 'admin'].includes(membership.role)) return;

        throw new CustomHttpException(DOCUMENT_MESSAGES.USER_NOT_OWNER, 403, DOCUMENT_MESSAGES.USER_NOT_OWNER);
    }

    private async ensureDocumentAccess(document: { id: string; createdBy: string; libraryId: string }, userId: string, mode: DocumentAccessMode): Promise<void> {
        if (document.createdBy === userId) return;

        const collaborator = await this.prisma.documentCollaborators.findUnique({
            where: {
                documentId_userId: {
                    documentId: document.id,
                    userId,
                },
            },
        });

        if (collaborator) {
            if (mode === 'view') return;
            if (mode === 'edit' && ['owner', 'editor'].includes(collaborator.role)) return;
            if (mode === 'manage' && collaborator.role === 'owner') return;
        }

        await this.ensureLibraryAccess(document.libraryId, userId, mode);
    }

    private isUuid(value?: string): value is string {
        return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    }

    private documentListSelect() {
        return {
            id: true,
            title: true,
            libraryId: true,
            createdBy: true,
            citationStyle: true,
            documentType: true,
            templateId: true,
            wordCount: true,
            charCount: true,
            version: true,
            isPublished: true,
            publishedAt: true,
            isDeleted: true,
            createdAt: true,
            updatedAt: true,
        };
    }

    private toDocumentListResponses(documents: any[]): DocumentResponse[] {
        return documents.map((document) => ({
            ...document,
            content: '',
            contentDelta: null,
        })) as DocumentResponse[];
    }

    private htmlToDocxParagraphs(html: string): DocxRun[][] {
        const dom = new JSDOM(`<main>${html || ''}</main>`);
        const root = dom.window.document.querySelector('main');
        if (!root) return [];

        const blockSelector = 'h1,h2,h3,p,li,blockquote,div';
        const blocks = Array.from(root.querySelectorAll(blockSelector))
            .filter((node) => !Array.from(node.children).some((child) => blockSelector.split(',').includes(child.tagName.toLowerCase())));

        if (blocks.length === 0) {
            const runs = this.extractDocxRuns(root);
            return runs.length > 0 ? [runs] : [];
        }

        return blocks
            .map((block) => {
                const prefix = block.tagName.toLowerCase() === 'li' ? [{ text: '• ' }] : [];
                return [...prefix, ...this.extractDocxRuns(block)];
            })
            .filter((runs) => runs.some((run) => run.text.trim()));
    }

    private extractDocxRuns(node: Node, inherited: Omit<DocxRun, 'text'> = {}): DocxRun[] {
        if (node.nodeType === 3) {
            const text = node.textContent?.replace(/\s+/g, ' ') || '';
            return text ? [{ ...inherited, text }] : [];
        }

        if (node.nodeType !== 1) return [];

        const element = node as Element;
        const tag = element.tagName.toLowerCase();
        const next = {
            ...inherited,
            bold: inherited.bold || tag === 'strong' || tag === 'b',
            italic: inherited.italic || tag === 'em' || tag === 'i',
            underline: inherited.underline || tag === 'u',
        };

        return Array.from(element.childNodes).flatMap((child) => this.extractDocxRuns(child, next));
    }

    private buildDocumentXml(paragraphs: DocxRun[][]): string {
        const body = paragraphs.map((runs) => `<w:p>${runs.map((run) => this.buildDocxRunXml(run)).join('')}</w:p>`).join('');
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    }

    private buildDocxRunXml(run: DocxRun): string {
        const props = [
            run.bold ? '<w:b/>' : '',
            run.italic ? '<w:i/>' : '',
            run.underline ? '<w:u w:val="single"/>' : '',
        ].join('');
        return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${this.escapeXml(run.text)}</w:t></w:r>`;
    }

    private getDocxContentTypesXml(): string {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
    }

    private getDocxRootRelsXml(): string {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
    }

    private getDocxDocumentRelsXml(): string {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    }

    private getDocxStylesXml(): string {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>';
    }

    private escapeXml(value: string): string {
        return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    private sanitizeFilename(value: string): string {
        return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim().slice(0, 120) || 'document';
    }
}
