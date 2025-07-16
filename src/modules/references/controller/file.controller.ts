import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, UseInterceptors, UploadedFile, Res } from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { FileService } from "../services/file.service";
import { CreateFileDto } from "../dto/file/create-file.dto";
import { FileResponse } from "../dto/file/file.response";
import { UpdateFileDto } from "../dto/file/update-file.dto";

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
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @Param('referenceId') referenceId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() createFileDto: CreateFileDto
    ): Promise<FileResponse> {
        console.log(file);
        
        return await this.fileService.create(file, referenceId, createFileDto);
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
    @ApiResponse({ status: 200, description: 'File downloaded successfully' })
    async downloadFile(
        @Param('fileId') fileId: string,
        @Res() response: Response
    ): Promise<void> {
        const { buffer, originalName, contentType } = await this.fileService.downloadFile(fileId);

        response.setHeader('Content-Type', contentType);
        response.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
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