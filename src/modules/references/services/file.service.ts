import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/database/prisma/prisma.service";
import { FileResponse } from "../dto/file/file.response";
import { StorageProvider } from "generated/prisma";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { FILE_MESSAGES } from "../constants/file.messages";
import { UpdateFileDto } from "../dto/file/update-file.dto";
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { UserService } from "src/modules/user/user.service";
import { S3StorageService } from "./s3-storage.service";

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

export interface DownloadResult {
    buffer?: Buffer;
    signedUrl?: string;
    originalName: string;
    contentType: string;
    storageProvider: StorageProvider;
}

@Injectable()
export class FileService {
    private readonly logger = new Logger(FileService.name)
    private readonly uploadsDir = 'uploads';

    constructor(
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly s3Storage: S3StorageService,
        private readonly configService: ConfigService,
    ) {
        this.ensureUploadsDirectory();
    }

    private get defaultProvider(): StorageProvider {
        const envProvider = this.configService.get<string>('STORAGE_PROVIDER', 'local');
        if (envProvider === 's3' && this.s3Storage.ready) {
            return StorageProvider.s3;
        }
        return StorageProvider.local;
    }

    private ensureUploadsDirectory(): void {
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }

    async create(document: Express.Multer.File, referenceId: string, uploadedBy: string): Promise<FileResponse> {
        await this.checkStorage(document, uploadedBy);

        const checksum = crypto.createHash('md5').update(document.buffer).digest('hex');
        const provider = this.defaultProvider;

        let storagePath: string;

        if (provider === StorageProvider.s3) {
            storagePath = await this.saveToS3(document, uploadedBy, referenceId);
        } else {
            storagePath = await this.saveToLocal(document, uploadedBy, referenceId);
        }

        const fileData = {
            filename: document.originalname,
            originalFilename: document.originalname,
            fileType: document.mimetype,
            fileSize: BigInt(document.size),
            mimeType: document.mimetype,
            uploadedBy,
            referenceId,
            storagePath,
            storageProvider: provider,
            checksum,
        };

        const file = await this.prisma.files.create({
            data: fileData
        });

        await this.userService.incrementStorageUsage(uploadedBy, file.fileSize);

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

    async getFilesByUser(userId: string): Promise<FileResponse[]> {
        return this.prisma.files.findMany({
            where: { uploadedBy: userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ── Upload helpers ──────────────────────────────────────────────────

    private async saveToS3(document: Express.Multer.File, userId: string, referenceId: string): Promise<string> {
        const timestamp = Date.now();
        const ext = path.extname(document.originalname);
        const base = path.basename(document.originalname, ext);
        const filename = `${base}_${timestamp}${ext}`;

        const key = this.s3Storage.buildKey(userId, referenceId, filename);

        await this.s3Storage.uploadFile(document.buffer, key, document.mimetype);

        return key;
    }

    private async saveToLocal(document: Express.Multer.File, userId: string, referenceId: string): Promise<string> {
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

    // ── Download ────────────────────────────────────────────────────────

    async downloadFile(fileId: string): Promise<DownloadResult> {
        const file = await this.prisma.files.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            throw new CustomHttpException(FILE_MESSAGES.FILE_NOT_FOUND, 404, FILE_MESSAGES.FILE_NOT_FOUND);
        }

        const result: DownloadResult = {
            originalName: file.originalFilename || file.filename,
            contentType: file.mimeType || 'application/octet-stream',
            storageProvider: file.storageProvider,
        };

        if (file.storageProvider === StorageProvider.s3) {
            result.signedUrl = await this.s3Storage.getSignedUrl(file.storagePath);
            return result;
        }

        // Local file
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

            result.buffer = await readFile(filePath);

            if (result.buffer.length === 0) {
                this.logger.warn(`Empty buffer read from file: ${filePath}`);
            }

            return result;
        } catch (error) {
            this.logger.error(`Failed to read file from local storage: ${file.storagePath}`, error);

            if (error instanceof CustomHttpException) throw error;

            if (error.code === 'ENOENT') {
                throw new CustomHttpException('File not found on disk', 404, 'FILE_NOT_FOUND');
            } else if (error.code === 'EACCES') {
                throw new CustomHttpException('Permission denied to read file', 403, 'ACCESS_DENIED');
            } else {
                throw new CustomHttpException('Failed to read file from local storage', 500, 'INTERNAL_SERVER_ERROR');
            }
        }
    }

    // ── Update / Delete / Misc ──────────────────────────────────────────

    async update(id: string, data: UpdateFileDto): Promise<FileResponse> {
        const file = await this.prisma.files.findUnique({
            where: { id }
        });

        if (!file) {
            throw new CustomHttpException(FILE_MESSAGES.FILE_NOT_FOUND, 404, FILE_MESSAGES.FILE_NOT_FOUND);
        }

        return this.prisma.files.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
                storagePath: file.storagePath,
                storageProvider: file.storageProvider
            }
        });
    }

    async delete(id: string): Promise<{ message: string }> {
        const file = await this.prisma.files.findUnique({
            where: { id }
        });

        if (!file) {
            throw new CustomHttpException(FILE_MESSAGES.FILE_NOT_FOUND, 404, FILE_MESSAGES.FILE_NOT_FOUND);
        }

        try {
            if (file.storageProvider === StorageProvider.s3) {
                await this.s3Storage.deleteFile(file.storagePath);
            } else if (fs.existsSync(file.storagePath)) {
                await unlink(file.storagePath);
            }
        } catch (error) {
            this.logger.warn(`Failed to delete physical file: ${file.storagePath}`, error);
        }

        await this.userService.decrementStorageUsage(file.uploadedBy, file.fileSize);

        await this.prisma.files.delete({
            where: { id }
        });

        return { message: FILE_MESSAGES.FILE_DELETED_SUCCESSFULLY }
    }

    async setPrimary(fileId: string): Promise<FileResponse> {
        const file = await this.prisma.files.findUnique({
            where: { id: fileId }
        });

        if (!file) {
            throw new CustomHttpException(FILE_MESSAGES.FILE_NOT_FOUND, 404, FILE_MESSAGES.FILE_NOT_FOUND);
        }

        return this.prisma.files.update({
            where: { id: fileId },
            data: {
                isPrimary: true,
                updatedAt: new Date(),
                storagePath: file.storagePath,
                storageProvider: file.storageProvider
            }
        });
    }

    async checkStorage(document: Express.Multer.File, userId: string): Promise<boolean> {
        const user = await this.userService.findById(userId);

        const currentStorageUsed = BigInt(user.storageUsed);
        const maxStorageLimit = BigInt(user.maxStorage);
        const documentSize = BigInt(document.size);

        const newTotalSize = currentStorageUsed + documentSize;

        if (newTotalSize > maxStorageLimit) {
            const remainingBytes = maxStorageLimit - currentStorageUsed;
            const remainingMB = Number(remainingBytes) / (1024 * 1024);

            throw new CustomHttpException(
                `Storage limit exceeded. You have ${remainingMB.toFixed(2)}MB remaining.`,
                413,
                'STORAGE_LIMIT_EXCEEDED'
            );
        }

        return true;
    }
}
