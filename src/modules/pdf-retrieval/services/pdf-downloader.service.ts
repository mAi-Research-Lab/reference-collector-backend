import { Injectable, Logger } from '@nestjs/common';
import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync, renameSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import axios, { AxiosResponse } from 'axios';
import { createHash } from 'crypto';
import * as pdf from 'pdf-parse';
import * as fs from 'fs'
import { ContentTypeResult, DownloadOptionsDto, ProxyConfig } from '../dto/download-options.dto';
import { DownloadResult, PdfValidationResult } from '../interfaces/publisher-config.interface';

@Injectable()
export class PdfDownloaderService {
    private readonly logger = new Logger(PdfDownloaderService.name);
    private readonly maxRedirects = 10;
    private readonly chunkSize = 64 * 1024;

    async downloadPdf(url: string, options: DownloadOptionsDto): Promise<DownloadResult> {
        const startTime = Date.now();
        let tempFilePath: string | undefined;

        try {
            this.validateUrl(url);

            const targetDir = options.targetDirectory || './downloads';
            this.ensureDirectoryExists(targetDir);

            tempFilePath = this.generateTempFilename(targetDir, options.referenceId);
            const finalFilePath = this.generateFinalFilename(targetDir, options.referenceId);

            if (existsSync(finalFilePath) && !options.overwrite) {
                return {
                    success: true,
                    filePath: finalFilePath,
                    fileSize: statSync(finalFilePath).size,
                    source: 'existing_file',
                    downloadTime: 0
                };
            }

            const finalUrl = await this.handleRedirects(url);

            const contentCheck = await this.checkContentType(finalUrl);
            if (!contentCheck.isValidPdf) {
                throw new Error(`Invalid content type: ${contentCheck.contentType}`);
            }

            if (contentCheck.contentLength && options.maxFileSize) {
                const maxSizeBytes = options.maxFileSize * 1024 * 1024;
                if (contentCheck.contentLength > maxSizeBytes) {
                    throw new Error(`File size ${contentCheck.contentLength} exceeds limit ${maxSizeBytes}`);
                }
            }

            const axiosConfig = this.configureHttpClient(options);

            const response = await axios.get(finalUrl, {
                ...axiosConfig,
                responseType: 'stream'
            });

            await this.streamDownload(response, tempFilePath, options);

            let validationResult: PdfValidationResult | undefined;
            if (options.validatePdf !== false) {
                validationResult = await this.validateAndSave(tempFilePath);
                if (validationResult && !validationResult.isValid) {
                    throw new Error(`PDF validation failed: ${validationResult.errors?.join(', ')}`);
                }
            }

            renameSync(tempFilePath, finalFilePath);

            const downloadTime = Date.now() - startTime;
            const fileSize = statSync(finalFilePath).size;

            return {
                success: true,
                filePath: finalFilePath,
                fileSize,
                contentType: contentCheck.contentType,
                downloadTime,
                source: finalUrl,
                validation: validationResult
            };

        } catch (error) {
            if (tempFilePath && existsSync(tempFilePath)) {
                try {
                    unlinkSync(tempFilePath);
                } catch (cleanupError) {
                    this.logger.warn(`Failed to cleanup temp file: ${cleanupError.message}`);
                }
            }

            this.logger.error(`PDF download failed: ${error.message}`, error.stack);
            return {
                success: false,
                error: error.message,
                source: url,
                downloadTime: Date.now() - startTime
            };
        }
    }

    async validateAndSave(filePath: string): Promise<PdfValidationResult> {
        try {
            if (!existsSync(filePath)) {
                throw new Error('File does not exist');
            }

            const fileSize = statSync(filePath).size;

            const buffer = fs.readFileSync(filePath);
            const header = buffer.toString('utf8', 0, 4);
            if (header !== '%PDF') {
                return {
                    isValid: false,
                    fileSize,
                    hasText: false,
                    quality: 'low',
                    errors: ['Invalid PDF header']
                };
            }

            if (fileSize < 100) {
                return {
                    isValid: false,
                    fileSize,
                    hasText: false,
                    quality: 'low',
                    errors: ['File too small to be a valid PDF']
                };
            }

            let pdfData;
            try {
                const fullBuffer = fs.readFileSync(filePath);
                pdfData = await pdf(fullBuffer);
            } catch (parseError) {
                return {
                    isValid: false,
                    fileSize,
                    hasText: false,
                    quality: 'low',
                    errors: [`PDF parsing failed: ${parseError.message}`]
                };
            }

            const hasText = pdfData.text && pdfData.text.trim().length > 0;
            const pageCount = pdfData.numpages;
            let quality: 'low' | 'medium' | 'high' = 'medium';

            if (!hasText || pageCount === 0) {
                quality = 'low';
            } else if (hasText && pageCount >= 1 && pdfData.text.length > 1000) {
                quality = 'high';
            }

            // await this.saveFileRecord(filePath, referenceId, fileSize, pageCount);

            // 7. Temp files temizle - handled by caller

            return {
                isValid: true,
                fileSize,
                pageCount,
                hasText,
                quality,
                errors: []
            };

        } catch (error) {
            this.logger.error(`Validation failed: ${error.message}`);
            return {
                isValid: false,
                fileSize: existsSync(filePath) ? statSync(filePath).size : 0,
                hasText: false,
                quality: 'low',
                errors: [error.message]
            };
        }
    }

    async handleRedirects(url: string): Promise<string> {
        let currentUrl = url;
        let redirectCount = 0;
        const visitedUrls = new Set<string>();

        while (redirectCount < this.maxRedirects) {
            if (visitedUrls.has(currentUrl)) {
                throw new Error('Circular redirect detected');
            }
            visitedUrls.add(currentUrl);

            try {
                const response = await axios.head(currentUrl, {
                    maxRedirects: 0,
                    validateStatus: (status) => status < 400
                });

                if (response.status >= 200 && response.status < 300) {
                    return currentUrl;
                }

                if (response.status >= 300 && response.status < 400) {
                    const location = response.headers.location;
                    if (!location) {
                        throw new Error('Redirect response missing Location header');
                    }

                    currentUrl = new URL(location, currentUrl).toString();
                    redirectCount++;
                } else {
                    throw new Error(`Unexpected status code: ${response.status}`);
                }
            } catch (error) {
                if (error.response?.status >= 300 && error.response?.status < 400) {
                    const location = error.response.headers.location;
                    if (location) {
                        currentUrl = new URL(location, currentUrl).toString();
                        redirectCount++;
                        continue;
                    }
                }
                throw error;
            }
        }

        throw new Error(`Too many redirects (max: ${this.maxRedirects})`);
    }

    async checkContentType(url: string): Promise<ContentTypeResult> {
        try {
            const response = await axios.head(url, {
                timeout: 10000,
                validateStatus: (status) => status < 500
            });

            const contentType = response.headers['content-type'] || '';

            const contentLength = response.headers['content-length']
                ? parseInt(response.headers['content-length'])
                : undefined;

            const isValidPdf = this.isValidPdfContentType(contentType, url);

            return {
                isValidPdf,
                contentType,
                contentLength
            };

        } catch (error) {
            return {
                isValidPdf: false,
                contentType: 'unknown',
                error: error.message
            };
        }
    }

    async resumeDownload(url: string, partialPath: string): Promise<DownloadResult> {
        const startTime = Date.now();

        try {
            if (!existsSync(partialPath)) {
                throw new Error('Partial file does not exist');
            }

            const partialSize = statSync(partialPath).size;

            const response = await axios.get(url, {
                responseType: 'stream',
                headers: {
                    'Range': `bytes=${partialSize}-`
                },
                timeout: 120000
            });

            if (response.status !== 206) {
                throw new Error(`Expected 206 Partial Content, got ${response.status}`);
            }

            const writeStream = createWriteStream(partialPath, { flags: 'a' });
            await pipeline(response.data, writeStream);

            const finalSize = statSync(partialPath).size;

            const validation = await this.validateAndSave(partialPath);

            return {
                success: true,
                filePath: partialPath,
                fileSize: finalSize,
                contentType: response.headers['content-type'],
                downloadTime: Date.now() - startTime,
                source: url,
                validation
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                source: url,
                downloadTime: Date.now() - startTime
            };
        }
    }

    async downloadWithProxy(url: string, proxyConfig: ProxyConfig): Promise<DownloadResult> {
        const options: DownloadOptionsDto = {
            referenceId: `proxy_${Date.now()}`,
            useProxy: true,
            proxyConfig
        };

        return this.downloadPdf(url, options);
    }

    private validateUrl(url: string): void {
        try {
            new URL(url);
        } catch {
            throw new Error('Invalid URL format');
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            throw new Error('URL must use HTTP or HTTPS protocol');
        }
    }

    private ensureDirectoryExists(dirPath: string): void {
        if (!existsSync(dirPath)) {
            mkdirSync(dirPath, { recursive: true });
        }
    }

    private generateTempFilename(targetDir: string, referenceId: string): string {
        const timestamp = Date.now();
        const hash = createHash('md5').update(referenceId).digest('hex').substring(0, 8);
        return join(targetDir, `temp_${hash}_${timestamp}.pdf`);
    }

    private generateFinalFilename(targetDir: string, referenceId: string): string {
        const hash = createHash('md5').update(referenceId).digest('hex').substring(0, 8);
        return join(targetDir, `${referenceId}_${hash}.pdf`);
    }

    private configureHttpClient(options: DownloadOptionsDto) {
        const config: any = {
            timeout: (options.timeout || 120) * 1000,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; PDFDownloader/1.0)',
                'Accept': 'application/pdf,*/*'
            }
        };

        if (options.useProxy && options.proxyConfig) {
            config.proxy = {
                host: options.proxyConfig.host,
                port: options.proxyConfig.port,
                ...(options.proxyConfig.auth && {
                    auth: options.proxyConfig.auth
                })
            };
        }

        return config;
    }

    private async streamDownload(
        response: AxiosResponse,
        filePath: string,
        options: DownloadOptionsDto
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const writeStream = createWriteStream(filePath);
            let downloadedBytes = 0;
            const totalBytes = parseInt(response.headers['content-length'] || '0');

            response.data.on('data', (chunk: Buffer) => {
                downloadedBytes += chunk.length;

                if (downloadedBytes % (1024 * 1024) === 0 || downloadedBytes === totalBytes) {
                    const progress = totalBytes > 0 ? (downloadedBytes / totalBytes * 100).toFixed(1) : 'unknown';
                    this.logger.debug(`Download progress: ${progress}% (${downloadedBytes}/${totalBytes} bytes)`);
                }

                if (options.maxFileSize) {
                    const maxSizeBytes = options.maxFileSize * 1024 * 1024;
                    if (downloadedBytes > maxSizeBytes) {
                        writeStream.destroy();
                        reject(new Error(`Download exceeded size limit: ${downloadedBytes} > ${maxSizeBytes}`));
                        return;
                    }
                }
            });

            response.data.on('error', (error: Error) => {
                writeStream.destroy();
                reject(error);
            });

            writeStream.on('error', (error: Error) => {
                reject(error);
            });

            writeStream.on('finish', () => {
                resolve();
            });

            pipeline(response.data, writeStream).catch(reject);
        });
    }

    private isValidPdfContentType(contentType: string, url: string): boolean {
        const normalizedContentType = contentType.toLowerCase();

        if (normalizedContentType.includes('application/pdf')) {
            return true;
        }

        if (normalizedContentType.includes('application/octet-stream') ||
            normalizedContentType.includes('binary/octet-stream')) {
            return url.toLowerCase().endsWith('.pdf');
        }

        return false;
    }
}