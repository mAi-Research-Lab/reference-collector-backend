import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { FileResponse } from "../dto/file/file.response";
import { StorageProvider } from "generated/prisma";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { FILE_MESSAGES } from "../constants/file.messages";
import { UpdateFileDto } from "../dto/file/update-file.dto";
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

@Injectable()
export class FileService {
    private readonly logger = new Logger(FileService.name)
    private readonly uploadsDir = 'uploads';

    constructor(
        private readonly prisma: PrismaService
    ) {
        this.ensureUploadsDirectory();
    }

    private ensureUploadsDirectory(): void {
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }

    async create(document: Express.Multer.File, referenceId: string, uploadedBy: string): Promise<FileResponse> {
        const localPath = await this.saveDocument(document, uploadedBy, referenceId);

        const fileData = {
            filename: document.originalname,
            originalFilename: document.originalname,
            fileType: document.mimetype,
            fileSize: BigInt(document.size),
            mimeType: document.mimetype,
            uploadedBy: uploadedBy,
            referenceId,
            storagePath: localPath,
            storageProvider: StorageProvider.local
        };

        const file = await this.prisma.files.create({
            data: fileData
        });

        return file;
    }

    async getFile(fileId: string): Promise<FileResponse> {
        const file = await this.prisma.files.findUnique({
            where: {
                id: fileId
            }
        })

        if (!file) {
            throw new CustomHttpException(FILE_MESSAGES.FILE_NOT_FOUND, 404, FILE_MESSAGES.FILE_NOT_FOUND);
        }

        return file
    }
    
    async getFilesByReference(referenceId: string): Promise<FileResponse[]> {
        return this.prisma.files.findMany({
            where: {
                referenceId
            }
        })
    }

    private async saveDocument(document: Express.Multer.File, userId: string, referenceId: string): Promise<string> {
        try {
            if (!document.buffer || document.buffer.length === 0) {
                this.logger.error('Document buffer is empty or undefined', {
                    originalname: document.originalname,
                    mimetype: document.mimetype,
                    size: document.size,
                    bufferLength: document.buffer?.length || 0
                });
                throw new CustomHttpException(
                    'Document buffer is empty',
                    400,
                    'INVALID_FILE'
                );
            }

            const timestamp = Date.now();
            const fileExtension = path.extname(document.originalname);
            const baseFileName = path.basename(document.originalname, fileExtension);
            const fileName = `${baseFileName}_${timestamp}_${userId}_${referenceId}${fileExtension}`;

            const filePath = path.join(this.uploadsDir, fileName);

            if (!fs.existsSync(this.uploadsDir)) {
                fs.mkdirSync(this.uploadsDir, { recursive: true });
            }

            this.logger.log(`Saving file: ${fileName}, Buffer size: ${document.buffer.length} bytes`);

            await writeFile(filePath, document.buffer);

            const savedFileStats = fs.statSync(filePath);
            if (savedFileStats.size === 0) {
                this.logger.error(`File saved but is empty: ${filePath}`);
                throw new CustomHttpException(
                    'File saved but is empty',
                    500,
                    'FILE_SAVE_ERROR'
                );
            }

            this.logger.log(`File saved successfully: ${filePath}, Size: ${savedFileStats.size} bytes`);

            return filePath;
        } catch (error) {
            this.logger.error('Failed to save file to local storage', {
                error: error.message,
                originalname: document.originalname,
                mimetype: document.mimetype,
                size: document.size,
                bufferLength: document.buffer?.length || 0
            });

            if (error instanceof CustomHttpException) {
                throw error;
            }

            throw new CustomHttpException(
                'Failed to save file to local storage',
                500,
                'INTERNAL_SERVER_ERROR'
            );
        }
    }

    async downloadFile(fileId: string): Promise<{ buffer: Buffer; originalName: string; contentType: string }> {
        const file = await this.prisma.files.findUnique({
            where: {
                id: fileId
            }
        });

        if (!file) {
            throw new CustomHttpException(FILE_MESSAGES.FILE_NOT_FOUND, 404, FILE_MESSAGES.FILE_NOT_FOUND);
        }

        try {
            const filePath = path.resolve(file.storagePath);

            if (!fs.existsSync(filePath)) {
                this.logger.error(`File not found at path: ${filePath}`);
                throw new CustomHttpException(
                    'Physical file not found',
                    404,
                    'FILE_NOT_FOUND'
                );
            }

            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
                this.logger.warn(`File is empty: ${filePath}`);
            }

            this.logger.log(`Reading file: ${filePath}, Size: ${stats.size} bytes`);

            const buffer = await readFile(filePath);

            if (buffer.length === 0) {
                this.logger.warn(`Empty buffer read from file: ${filePath}`);
            }

            return {
                buffer,
                originalName: file.originalFilename || file.filename,
                contentType: file.mimeType || 'application/octet-stream'
            };
        } catch (error) {

            this.logger.error(`Failed to read file from local storage: ${file.storagePath}`, error);

            if (error.code === 'ENOENT') {
                throw new CustomHttpException(
                    'File not found on disk',
                    404,
                    'FILE_NOT_FOUND'
                );
            } else if (error.code === 'EACCES') {
                throw new CustomHttpException(
                    'Permission denied to read file',
                    403,
                    'ACCESS_DENIED'
                );
            } else {
                throw new CustomHttpException(
                    'Failed to read file from local storage',
                    500,
                    'INTERNAL_SERVER_ERROR'
                );
            }
        }
    }

    async update(id: string, data: UpdateFileDto): Promise<FileResponse> {
        const file = await this.prisma.files.findUnique({
            where: {
                id: id
            }
        })

        if (!file) {
            throw new CustomHttpException(FILE_MESSAGES.FILE_NOT_FOUND, 404, FILE_MESSAGES.FILE_NOT_FOUND);
        }

        return this.prisma.files.update({
            where: {
                id: id
            },
            data: {
                ...data,
                updatedAt: new Date(),
                storagePath: file.storagePath,
                storageProvider: file.storageProvider
            }
        })
    }

    async delete(id: string): Promise<{ message: string }> {
        const file = await this.prisma.files.findUnique({
            where: {
                id: id
            }
        })

        if (!file) {
            throw new CustomHttpException(FILE_MESSAGES.FILE_NOT_FOUND, 404, FILE_MESSAGES.FILE_NOT_FOUND);
        }

        try {
            if (fs.existsSync(file.storagePath)) {
                await unlink(file.storagePath);
            }
        } catch (error) {
            console.warn(`Failed to delete physical file: ${file.storagePath}`, error);
        }

        await this.prisma.files.delete({
            where: {
                id: id
            }
        })

        return { message: FILE_MESSAGES.FILE_DELETED_SUCCESSFULLY }
    }

    async setPrimary(fileId: string): Promise<FileResponse> {
        const file = await this.prisma.files.findUnique({
            where: {
                id: fileId
            }
        })

        if (!file) {
            throw new CustomHttpException(FILE_MESSAGES.FILE_NOT_FOUND, 404, FILE_MESSAGES.FILE_NOT_FOUND);
        }

        return this.prisma.files.update({
            where: {
                id: fileId
            },
            data: {
                isPrimary: true,
                updatedAt: new Date(),
                storagePath: file.storagePath,
                storageProvider: file.storageProvider
            }
        })
    }
}