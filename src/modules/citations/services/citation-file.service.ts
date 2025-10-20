import { Injectable } from '@nestjs/common';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CreateCitationStyleDto } from '../dto/citation-style/citation-style-create.dto';
import { CitationStyleResponse } from '../dto/citation-style/citation-style.response';
import { CITATIONS_MESSAGES } from '../constants/citation.messages';
import { DOMParser } from 'xmldom';

@Injectable()
export class CSLFileHandlerService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    /**
     * CSL dosyasını upload et ve işle
     */
    async uploadCSLFile(userId: string, file: Express.Multer.File): Promise<CitationStyleResponse> {
        try {
            this.validateFileFormat(file);

            const cslContent = file.buffer.toString('utf-8');

            this.validateCSLContent(cslContent);

            const styleMetadata = this.extractStyleMetadata(cslContent);

            await this.checkStyleUniqueness(styleMetadata.id);

            const styleData: CreateCitationStyleDto = {
                name: styleMetadata.title,
                shortName: styleMetadata.titleShort || this.generateShortName(styleMetadata.title),
                description: styleMetadata.summary || `Custom style imported from ${file.originalname}`,
                cslContent: cslContent,
                category: this.determineCategory(styleMetadata.categories)
            };

            const createdStyle = await this.prisma.citationStyle.create({
                data: {
                    ...styleData,
                    isCustom: true,
                    createdBy: userId,
                    downloadCount: 0,
                    isDefault: false
                }
            });

            return createdStyle;

        } catch (error) {
            throw new CustomHttpException(
                `CSL file upload failed: ${error.message}`,
                400,
                'CSL_FILE_UPLOAD_FAILED'
            );
        }
    }

    private validateFileFormat(file: Express.Multer.File): void {
        if (!file) {
            throw new Error('No file provided');
        }

        const allowedExtensions = ['.csl', '.xml'];
        const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

        if (!allowedExtensions.includes(fileExtension)) {
            throw new Error(`Invalid file extension. Only .csl and .xml files are allowed.`);
        }

        if (file.size > 2 * 1024 * 1024) {
            throw new Error('File size too large. Maximum 2MB allowed.');
        }

        if (file.size === 0) {
            throw new Error('File is empty');
        }
    }

    private validateCSLContent(cslContent: string): void {
        try {
            const parser = new DOMParser({
                errorHandler: {
                    warning: () => { },
                    error: (error) => { throw new Error(error); },
                    fatalError: (error) => { throw new Error(error); }
                }
            });

            const doc = parser.parseFromString(cslContent, 'text/xml');

            const parserErrors = doc.getElementsByTagName('parsererror');
            if (parserErrors.length > 0) {
                throw new Error(`Invalid XML: ${parserErrors[0].textContent}`);
            }

            const styleElement = doc.documentElement;
            if (!styleElement || styleElement.tagName !== 'style') {
                throw new Error('Root element must be <style>');
            }

            const namespace = styleElement.getAttribute('xmlns');
            if (namespace !== 'http://purl.org/net/xbiblio/csl') {
                throw new Error('Invalid CSL namespace');
            }

            const infoElements = doc.getElementsByTagName('info');
            if (infoElements.length === 0) {
                throw new Error('Missing required <info> element');
            }

            const infoElement = infoElements[0];
            const titleElements = infoElement.getElementsByTagName('title');
            if (titleElements.length === 0 || !titleElements[0].textContent?.trim()) {
                throw new Error('Missing required <title> in <info>');
            }

            const idElements = infoElement.getElementsByTagName('id');
            if (idElements.length === 0 || !idElements[0].textContent?.trim()) {
                throw new Error('Missing required <id> in <info>');
            }

        } catch (error) {
            throw new Error(`CSL validation failed: ${error.message}`);
        }
    }

    private extractStyleMetadata(cslContent: string): {
        id: string;
        title: string;
        titleShort?: string;
        summary?: string;
        categories?: string[];
    } {
        const parser = new DOMParser();
        const doc = parser.parseFromString(cslContent, 'text/xml');

        const infoElements = doc.getElementsByTagName('info');
        const infoElement = infoElements[0];

        const idElements = infoElement.getElementsByTagName('id');
        const titleElements = infoElement.getElementsByTagName('title');
        const titleShortElements = infoElement.getElementsByTagName('title-short');
        const summaryElements = infoElement.getElementsByTagName('summary');

        const id = idElements[0]?.textContent?.trim();
        const title = titleElements[0]?.textContent?.trim();
        const titleShort = titleShortElements[0]?.textContent?.trim();
        const summary = summaryElements[0]?.textContent?.trim();

        const categoryElements = infoElement.getElementsByTagName('category');
        const categories: string[] = [];
        for (let i = 0; i < categoryElements.length; i++) {
            const cat = categoryElements[i];
            const field = cat.getAttribute('field');
            const citationFormat = cat.getAttribute('citation-format');
            if (field) categories.push(field);
            if (citationFormat) categories.push(citationFormat);
        }

        return {
            id: id!,
            title: title!,
            titleShort,
            summary,
            categories
        };
    }

    private async checkStyleUniqueness(styleId: string): Promise<void> {
        const existingStyles = await this.prisma.citationStyle.findMany({
            where: {
                cslContent: {
                    contains: `<id>${styleId}</id>`
                }
            }
        });

        if (existingStyles.length > 0) {
            throw new Error(`A style with ID '${styleId}' already exists`);
        }
    }

    private generateShortName(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 20);
    }

    private determineCategory(categories?: string[]): string {
        if (!categories || categories.length === 0) {
            return 'general';
        }

        const priorityMappings = {
            'apa': 'apa',
            'mla': 'mla',
            'chicago': 'chicago',
            'ieee': 'ieee',
            'harvard': 'harvard',
            'vancouver': 'vancouver'
        };

        for (const [key, value] of Object.entries(priorityMappings)) {
            if (categories.some(cat => cat.toLowerCase().includes(key))) {
                return value;
            }
        }

        const fieldMappings = {
            'medicine': 'science',
            'biology': 'science',
            'chemistry': 'science',
            'physics': 'science',
            'law': 'law',
            'political-science': 'social-science',
            'psychology': 'social-science',
            'history': 'humanities',
            'literature': 'humanities'
        };

        for (const [field, category] of Object.entries(fieldMappings)) {
            if (categories.includes(field)) {
                return category;
            }
        }

        return categories[0] || 'general';
    }

    async exportCSLFile(styleId: string): Promise<{ filename: string; content: string }> {
        const style = await this.prisma.citationStyle.findUnique({
            where: { id: styleId }
        });

        if (!style) {
            throw new CustomHttpException(
                CITATIONS_MESSAGES.STYLE_NOT_FOUND,
                404,
                CITATIONS_MESSAGES.STYLE_NOT_FOUND
            );
        }

        const filename = `${style.shortName}.csl`;
        return {
            filename,
            content: style.cslContent
        };
    }

    async importCSLFromURL(userId: string, url: string): Promise<CitationStyleResponse> {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch CSL from URL: ${response.statusText}`);
            }

            const cslContent = await response.text();

            let filename = url.split('/').pop() || 'imported-style';

            if (!filename.toLowerCase().endsWith('.csl') && !filename.toLowerCase().endsWith('.xml')) {
                filename = `${filename}.csl`;
            }

            const mockFile = {
                buffer: Buffer.from(cslContent, 'utf-8'),
                originalname: filename,
                mimetype: 'application/xml',
                size: Buffer.byteLength(cslContent, 'utf-8')
            } as Express.Multer.File;

            return await this.uploadCSLFile(userId, mockFile);

        } catch (error) {
            
            throw new CustomHttpException(
                `CSL import from URL failed: ${error.message}`,
                400,
                'CSL_URL_IMPORT_FAILED'
            );
        }
    }
}