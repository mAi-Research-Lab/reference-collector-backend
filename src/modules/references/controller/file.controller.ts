import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, UseInterceptors, UploadedFile, Res, BadRequestException } from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { FileService } from "../services/file.service";
import { CreateFileDto } from "../dto/file/create-file.dto";
import { FileResponse } from "../dto/file/file.response";
import { UpdateFileDto } from "../dto/file/update-file.dto";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { memoryStorage } from "multer";

@Controller('references/files')
@ApiTags('References Files')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class FileController {
    constructor(
        private readonly fileService: FileService
    ) { }

    @Post(':referenceId')
    @ApiOperation({ summary: 'Upload file to reference' })
    @ApiParam({ name: 'referenceId', description: 'Reference ID' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'File to upload'
                },
                uploadedBy: {
                    type: 'string',
                    description: 'User ID who uploaded the file'
                },
            },
            required: ['file', 'uploadedBy']
        }
    })
    @ApiResponse({ status: 201, description: 'File uploaded successfully', type: FileResponse })
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: {
            fileSize: 50 * 1024 * 1024,
        },
        fileFilter: (req, file, cb) => {
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain',
                'text/csv'
            ];

            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`), false);
            }
        }
    }))
    async uploadFile(
        @Param('referenceId') referenceId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() createFileDto: CreateFileDto
    ): Promise<FileResponse> {
        if (!file) {
            throw new CustomHttpException('No file uploaded', 400, 'NO_FILE');
        }

        if (!file.buffer || file.buffer.length === 0) {
            throw new CustomHttpException('Uploaded file is empty', 400, 'EMPTY_FILE');
        }

        if (file.size === 0) {
            throw new CustomHttpException('Uploaded file has zero size', 400, 'ZERO_SIZE_FILE');
        }
        try {
            return await this.fileService.create(file, referenceId, createFileDto);
        } catch (error) {
            console.error('File upload error:', error);
            throw error;
        }
    }

    @Get(':fileId')
    @ApiOperation({ summary: 'Get file by ID' })
    @ApiParam({ name: 'fileId', description: 'File ID' })
    @ApiResponse({ status: 200, description: 'File retrieved successfully', type: FileResponse })
    async getFile(
        @Param('fileId') fileId: string
    ): Promise<FileResponse> {
        return await this.fileService.getFile(fileId);
    }

    @Get(':fileId/download')
    @ApiOperation({ summary: 'Download file' })
    @ApiParam({ name: 'fileId', description: 'File ID' })
    @ApiResponse({
        status: 200,
        description: 'File downloaded successfully',
        schema: {
            type: 'string',
            format: 'binary'
        },
        headers: {
            'Content-Type': {
                description: 'MIME type of the file',
                schema: {
                    type: 'string'
                }
            },
            'Content-Disposition': {
                description: 'Attachment header with filename',
                schema: {
                    type: 'string'
                }
            }
        }
    })
    @ApiProduces('application/octet-stream')
    async downloadFile(
        @Param('fileId') fileId: string,
        @Res() response: Response
    ): Promise<void> {
        const { buffer, originalName, contentType } = await this.fileService.downloadFile(fileId);
        
        const encodedFilename = encodeURIComponent(originalName);

        response.setHeader('Content-Type', contentType || 'application/octet-stream');
        response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
        response.setHeader('Content-Length', buffer.length.toString());

        response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        response.send(buffer);
    }

    @Put(':fileId')
    @ApiOperation({ summary: 'Update file' })
    @ApiParam({ name: 'fileId', description: 'File ID' })
    @ApiBody({ type: UpdateFileDto })
    @ApiResponse({ status: 200, description: 'File updated successfully', type: FileResponse })
    async updateFile(
        @Param('fileId') fileId: string,
        @Body() updateFileDto: UpdateFileDto
    ): Promise<FileResponse> {
        return await this.fileService.update(fileId, updateFileDto);
    }

    @Delete(':fileId')
    @ApiOperation({ summary: 'Delete file' })
    @ApiParam({ name: 'fileId', description: 'File ID' })
    @ApiResponse({ status: 200, description: 'File deleted successfully' })
    async deleteFile(
        @Param('fileId') fileId: string
    ): Promise<{ message: string }> {
        return await this.fileService.delete(fileId);
    }

    @Put(':fileId/set-primary')
    @ApiOperation({ summary: 'Set file as primary' })
    @ApiParam({ name: 'fileId', description: 'File ID' })
    @ApiResponse({ status: 200, description: 'File set as primary successfully', type: FileResponse })
    async setPrimaryFile(
        @Param('fileId') fileId: string
    ): Promise<FileResponse> {
        return await this.fileService.setPrimary(fileId);
    }
}