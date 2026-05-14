import { Body, Controller, Delete, Get, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { RoleGuard } from 'src/common/guard/role.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { DocumentsService } from '../services/documents.service';
import { ApiErrorResponse, ApiSuccessArrayResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { DocumentResponse } from '../dto/document/document.response';
import { DOCUMENT_MESSAGES } from '../constants/document/document.messages';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { CreateDocumentDto } from '../dto/document/create-document.dto';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { User } from 'src/modules/user/decorators/user.decorator';
import { UpdateDocumentDto } from '../dto/document/update-document.dto';

@Controller('documents')
@ApiTags('Document')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class DocumentsController {
    constructor(
        private readonly documentsService: DocumentsService
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create document' })
    @ApiSuccessResponse(DocumentResponse, 201, DOCUMENT_MESSAGES.DOCUMENT_CREATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async createDocument(@User() user: any, @Body() createDocumentDto: CreateDocumentDto): Promise<ResponseDto> {
        const document = await this.documentsService.create(user.id, createDocumentDto);
        
        return {
            success: true,
            statusCode: 201,
            message: DOCUMENT_MESSAGES.DOCUMENT_CREATED_SUCCESSFULLY,
            data: document,
            timestamp: new Date().toISOString()
        }
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Get documents by user id' })
    @ApiSuccessArrayResponse(DocumentResponse, 200, DOCUMENT_MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async getDocumentsByUserId(@User() user: any): Promise<ResponseDto> {
        const documents = await this.documentsService.getUserDocuments(user.id);
        
        return {
            success: true,
            statusCode: 200,
            message: DOCUMENT_MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY,
            data: documents,
            timestamp: new Date().toISOString()
        }
    }

    @Get('library/:libraryId')
    @ApiOperation({ summary: 'Get documents by library id' })
    @ApiSuccessArrayResponse(DocumentResponse, 200, DOCUMENT_MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async getDocumentsByLibraryId(
        @User() user: any,
        @Param('libraryId') libraryId: string
    ): Promise<ResponseDto> {
        const documents = await this.documentsService.getLibraryDocuments(user.id, libraryId);

        return {
            success: true,
            statusCode: 200,
            message: DOCUMENT_MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY,
            data: documents,
            timestamp: new Date().toISOString()
        }
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get document by id' })
    @ApiSuccessResponse(DocumentResponse, 200, DOCUMENT_MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async getDocumentById(@User() user: any, @Param('id') id: string): Promise<ResponseDto> {
        const document = await this.documentsService.getDocument(id, user.id);
        
        return {
            success: true,
            statusCode: 200,
            message: DOCUMENT_MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY,
            data: document,
            timestamp: new Date().toISOString()
        }
    }

    @Get(':id/download/docx')
    @ApiOperation({ summary: 'Download document as Word file' })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, DOCUMENT_MESSAGES.USER_NOT_MEMBER)
    @ApiErrorResponse(404, DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND)
    async downloadDocumentAsDocx(
        @User() user: any,
        @Param('id') id: string,
        @Res() res: Response
    ): Promise<void> {
        const result = await this.documentsService.exportDocumentAsDocx(id, user.id);
        const encodedFilename = encodeURIComponent(result.filename);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
        res.setHeader('Content-Length', result.buffer.length.toString());
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.send(result.buffer);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update document by id' })
    @ApiSuccessResponse(DocumentResponse, 200, DOCUMENT_MESSAGES.DOCUMENT_UPDATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async updateDocument(@User() user: any, @Param('id') id: string, @Body() data: UpdateDocumentDto): Promise<ResponseDto> {
        const document = await this.documentsService.updateDocument(id, user.id, data);
        
        return {
            success: true,
            statusCode: 200,
            message: DOCUMENT_MESSAGES.DOCUMENT_UPDATED_SUCCESSFULLY,
            data: document,
            timestamp: new Date().toISOString()
        }
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete document by id' })
    @ApiSuccessResponse(DocumentResponse, 200, DOCUMENT_MESSAGES.DOCUMENT_DELETED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async deleteDocument(@User() user: any, @Param('id') id: string): Promise<ResponseDto> {
        const document = await this.documentsService.deleteDocument(id, user.id);
        
        return {
            success: true,
            statusCode: 200,
            message: DOCUMENT_MESSAGES.DOCUMENT_DELETED_SUCCESSFULLY,
            data: document,
            timestamp: new Date().toISOString()
        }
    }

    @Put('publish/:id')
    @ApiOperation({ summary: 'Publish document by id' })
    @ApiSuccessResponse(DocumentResponse, 200, DOCUMENT_MESSAGES.DOCUMENT_PUBLISHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async publishDocument(@User() user: any, @Param('id') id: string): Promise<ResponseDto> {
        const document = await this.documentsService.publishDocument(id, user.id);
        
        return {
            success: true,
            statusCode: 200,
            message: DOCUMENT_MESSAGES.DOCUMENT_PUBLISHED_SUCCESSFULLY,
            data: document,
            timestamp: new Date().toISOString()
        }
    }
}
