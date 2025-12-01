import * as fs from 'fs/promises';
import * as path from 'path';
import { PdfValidationResult } from '../interfaces/publisher-config.interface';

export class PdfValidator {

    static async validatePdf(filePath: string): Promise<PdfValidationResult> {
        try {
            const stats = await fs.stat(filePath);
            const fileSize = stats.size;

            // Minimum size check - allow very small PDFs (100 bytes minimum)
            if (fileSize < 100) {
                return {
                    isValid: false,
                    fileSize,
                    hasText: false,
                    quality: 'low',
                    errors: ['File is too small to be a valid PDF']
                };
            }

            const headerValid = await this.checkPdfHeader(filePath);
            if (!headerValid) {
                return {
                    isValid: false,
                    fileSize,
                    hasText: false,
                    quality: 'low',
                    errors: ['File does not have a valid PDF header']
                };
            }

            const structureValid = await this.checkPdfStructure(filePath);
            const hasText = await this.checkTextContent(filePath);
            const pageCount = await this.getPageCount(filePath);
            const quality = this.assessQuality(fileSize, pageCount, hasText);

            return {
                isValid: structureValid,
                fileSize,
                pageCount,
                hasText,
                quality,
                errors: structureValid ? undefined : ['PDF structure validation failed']
            };

        } catch (error) {
            return {
                isValid: false,
                fileSize: 0,
                hasText: false,
                quality: 'low',
                errors: [`Validation error: ${error.message}`]
            };
        }
    }

    private static async checkPdfHeader(filePath: string): Promise<boolean> {
        try {
            const fd = await fs.open(filePath, 'r');
            const buffer = Buffer.alloc(8);
            await fd.read(buffer, 0, 8, 0);
            await fd.close();

            const header = buffer.toString('ascii');
            return header.startsWith('%PDF-');
        } catch {
            return false;
        }
    }

    private static async checkPdfStructure(filePath: string): Promise<boolean> {
        try {
            const content = await fs.readFile(filePath);
            const contentStr = content.toString('binary');

            const hasXref = contentStr.includes('xref');
            const hasTrailer = contentStr.includes('trailer');
            const hasEof = contentStr.includes('%%EOF');

            return hasXref && hasTrailer && hasEof;
        } catch {
            return false;
        }
    }

    private static async checkTextContent(filePath: string): Promise<boolean> {
        try {
            const content = await fs.readFile(filePath);
            const contentStr = content.toString('binary');

            const hasTextObjects = contentStr.includes('/Type /Font') ||
                contentStr.includes('BT') ||
                contentStr.includes('ET');

            return hasTextObjects;
        } catch {
            return false;
        }
    }

    private static async getPageCount(filePath: string): Promise<number> {
        try {
            const content = await fs.readFile(filePath);
            const contentStr = content.toString('binary');

            const pageMatches = contentStr.match(/\/Type\s*\/Page(?!\w)/g);
            return pageMatches ? pageMatches.length : 1;
        } catch {
            return 1;
        }
    }

    private static assessQuality(
        fileSize: number,
        pageCount?: number,
        hasText?: boolean
    ): 'low' | 'medium' | 'high' {
        const avgSizePerPage = pageCount ? fileSize / pageCount : fileSize;

        if (avgSizePerPage < 50000) {
            return 'low';
        }

        if (!hasText) {
            return 'medium';
        }

        if (avgSizePerPage > 200000) {
            return 'high';
        }

        return 'medium';
    }

    static async isPdfFile(filePath: string): Promise<boolean> {
        try {
            const ext = path.extname(filePath).toLowerCase();
            if (ext !== '.pdf') {
                return false;
            }

            return await this.checkPdfHeader(filePath);
        } catch {
            return false;
        }
    }

    static async checkFileSize(filePath: string, maxSizeBytes: number): Promise<boolean> {
        try {
            const stats = await fs.stat(filePath);
            return stats.size <= maxSizeBytes;
        } catch {
            return false;
        }
    }
}