/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CreateFileDto } from "../dto/file/create-file.dto";
import { FileResponse } from "../dto/file/file.response";
import { StorageProvider } from "generated/prisma";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { FILE_MESSAGES } from "../constants/file.messages";
import { UpdateFileDto } from "../dto/file/update-file.dto";

@Injectable()
export class FileService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async create(document: Express.Multer.File, referenceId: string, data: CreateFileDto): Promise<FileResponse> {
        const s3Url = await this.saveDocument(document, data.uploadedBy, referenceId); 
        
        const fileData = {
            filename: document.originalname,
            originalFilename: document.originalname,
            fileType: document.mimetype,
            fileSize: BigInt(document.size),
            mimeType: document.mimetype,
            uploadedBy: data.uploadedBy,
            referenceId,
            storagePath: s3Url || "",
            storageProvider: s3Url ? StorageProvider.s3 : StorageProvider.local
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

    private async saveDocument(document: Express.Multer.File, userId: string, referenceId: string): Promise<string> {
        // try {
        //     const s3Url = await this.S3Service.uploadInputDocument(userId, document, document.originalname);
        //     this.logger.log(`Input document uploaded to S3: ${s3Url}`);
        //     return s3Url;
        // } catch (error) {
        //     this.logger.error('Failed to save input document to S3:', error);
        //     throw new HttpException(
        //         { message: 'Failed to save input document' },
        //         HttpStatus.INTERNAL_SERVER_ERROR
        //     );
        // }
        return `${document.originalname} - ${userId} - ${referenceId}`;
    }

    async downloadFile(fileId: string): Promise<{ buffer: Buffer; originalName: string; contentType: string }> {
        // const analysis = await this.analysisModel.findById(analysisId).lean();

        // if (!analysis || !analysis.inputDocument) {
        //     throw new HttpException(
        //         { message: 'Input document not found' },
        //         HttpStatus.NOT_FOUND
        //     );
        // }

        // try {
        //     const key = this.S3Service.extractKeyFromUrl(analysis.inputDocument);
        //     if (!key) {
        //         throw new Error('Invalid S3 URL');
        //     }

        //     const buffer = await this.S3Service.getFile(key);

        //     const metadata = await this.S3Service.getFileMetadata(key);

        //     return {
        //         buffer,
        //         originalName: this.extractOriginalName(key),
        //         contentType: metadata.contentType
        //     };
        // } catch (error) {
        //     this.logger.error(`Failed to get input document from S3: ${error.message}`);
        //     throw new HttpException(
        //         { message: 'Input document file not found' },
        //         HttpStatus.NOT_FOUND
        //     );
        // }

        return { buffer: Buffer.from(''), originalName: fileId, contentType: '' };
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