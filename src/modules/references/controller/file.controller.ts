import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, UseInterceptors, UploadedFile, Res, BadRequestException } from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { FileService } from "../services/file.service";
import { FileResponse } from "../dto/file/file.response";
import { UpdateFileDto } from "../dto/file/update-file.dto";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { memoryStorage } from "multer";
import { ApiSuccessResponse, ApiErrorResponse } from "src/common/decorators/api-response-wrapper.decorator";
import { ResponseDto } from "src/common/dto/api-response.dto";
import { COMMON_MESSAGES } from "src/common/constants/common.messages";
import { User } from "src/modules/user/decorators/user.decorator";

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
        description: 'File upload',
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiSuccessResponse(FileResponse, 201, "File uploaded successfully")
    @ApiErrorResponse(400, "Bad request - Invalid file or file data")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Reference not found")
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
                'text/csv',

                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',

                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/bmp',
                'image/tiff',
                'image/svg+xml'
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
        @User() user: any
    ): Promise<ResponseDto> {
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
            const uploadedFile = await this.fileService.create(file, referenceId, user.id);

            return {
                message: "File uploaded successfully",
                statusCode: 201,
                success: true,
                timestamp: new Date().toISOString(),
                data: uploadedFile
            };
        } catch (error) {
            console.error('File upload error:', error);
            throw error;
        }
    }

    @Get('all/:referenceId')
    @ApiOperation({ summary: 'Get all files for a reference' })
    @ApiParam({ name: 'referenceId', description: 'Reference ID' })
    @ApiSuccessResponse(FileResponse, 200, "Files retrieved successfully")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Reference not found")
    async getFilesByReference(
        @Param('referenceId') referenceId: string
    ): Promise<ResponseDto> {
        const files = await this.fileService.getFilesByReference(referenceId);

        return {
            message: "Files retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: files
        };
    }

    @Get(':fileId')
    @ApiOperation({ summary: 'Get file by ID' })
    @ApiParam({ name: 'fileId', description: 'File ID' })
    @ApiSuccessResponse(FileResponse, 200, "File retrieved successfully")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "File not found")
    async getFile(
        @Param('fileId') fileId: string
    ): Promise<ResponseDto> {
        const file = await this.fileService.getFile(fileId);

        return {
            message: "File retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: file
        };
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
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "File not found")
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
    @ApiSuccessResponse(FileResponse, 200, "File updated successfully")
    @ApiErrorResponse(400, "Bad request - Invalid file data")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "File not found")
    async updateFile(
        @Param('fileId') fileId: string,
        @Body() updateFileDto: UpdateFileDto
    ): Promise<ResponseDto> {
        const file = await this.fileService.update(fileId, updateFileDto);

        return {
            message: "File updated successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: file
        };
    }

    @Delete(':fileId')
    @ApiOperation({ summary: 'Delete file' })
    @ApiParam({ name: 'fileId', description: 'File ID' })
    @ApiResponse({ status: 200, description: 'File deleted successfully' })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "File not found")
    async deleteFile(
        @Param('fileId') fileId: string
    ): Promise<ResponseDto> {
        const result = await this.fileService.delete(fileId);

        return {
            message: result.message,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: { message: "File deleted successfully" }
        };
    }

    @Put(':fileId/set-primary')
    @ApiOperation({ summary: 'Set file as primary' })
    @ApiParam({ name: 'fileId', description: 'File ID' })
    @ApiSuccessResponse(FileResponse, 200, "File set as primary successfully")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "File not found")
    async setPrimaryFile(
        @Param('fileId') fileId: string
    ): Promise<ResponseDto> {
        const file = await this.fileService.setPrimary(fileId);

        return {
            message: "File set as primary successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: file
        };
    }
}