import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CreateDocumentTemplateDto } from "../dto/document-template/create-document-template.dto";
import { Category } from "../enums/style.enums";
import { DocumentTemplateResponseDto } from "../dto/document-template/document-template.response";
import { StyleConfig } from "../interfaces/style.interface";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { DOCUMENT_TEMPLATE_MESSAGES } from "../constants/templates/document-templates.messages";
import { UpdateDocumentTemplateDto } from "../dto/document-template/update-document-template.dto";

@Injectable()
export class DocumentTemplateService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async create(data: CreateDocumentTemplateDto): Promise<DocumentTemplateResponseDto> {
        const documentTemplate = await this.prisma.documentTemplates.create({ data });

        return documentTemplate as DocumentTemplateResponseDto;
    }

    async getAll(category?: string): Promise<DocumentTemplateResponseDto[]> {
        const documentTemplates = await this.prisma.documentTemplates.findMany({ where: { category } });

        return documentTemplates.map((template) => ({
            ...template,
            styleConfig: template.styleConfig as StyleConfig | null,
            category: template.category as Category
        }));
    }

    async getById(id: string): Promise<DocumentTemplateResponseDto> {
        const documentTemplate = await this.prisma.documentTemplates.findUnique({ where: { id } });

        if (!documentTemplate) {
            throw new CustomHttpException(DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_NOT_FOUND, 404, DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_NOT_FOUND);
        }

        return documentTemplate as DocumentTemplateResponseDto;
    }

    async update(id: string, data: UpdateDocumentTemplateDto): Promise<DocumentTemplateResponseDto> {
        const documentTemplate = await this.prisma.documentTemplates.findUnique({ where: { id } });

        if (!documentTemplate) {
            throw new CustomHttpException(DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_NOT_FOUND, 404, DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_NOT_FOUND);
        }

        const updatedDocumentTemplate = await this.prisma.documentTemplates.update({ where: { id }, data });

        return updatedDocumentTemplate as DocumentTemplateResponseDto;
    }

    async delete(id: string): Promise<{ message: string }> {
        const documentTemplate = await this.prisma.documentTemplates.findUnique({ where: { id } });

        if (!documentTemplate) {
            throw new CustomHttpException(DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_NOT_FOUND, 404, DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_NOT_FOUND);
        }

        await this.prisma.documentTemplates.delete({ where: { id } });

        return { message: DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_DELETED_SUCCESSFULLY };
    }

    async getPopularTemplates(): Promise<DocumentTemplateResponseDto[]> {
        const documentTemplates = await this.prisma.documentTemplates.findMany({ where: { usageCount: { gt: 0 } }, orderBy: { usageCount: 'desc' } });

        return documentTemplates as DocumentTemplateResponseDto[];
    }
}