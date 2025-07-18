import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
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

    @Get(':id')
    @ApiOperation({ summary: 'Get document by id' })
    @ApiSuccessResponse(DocumentResponse, 200, DOCUMENT_MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async getDocumentById(@Param('id') id: string): Promise<ResponseDto> {
        const document = await this.documentsService.getDocument(id);
        
        return {
            success: true,
            statusCode: 200,
            message: DOCUMENT_MESSAGES.DOCUMENT_FETCHED_SUCCESSFULLY,
            data: document,
            timestamp: new Date().toISOString()
        }
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update document by id' })
    @ApiSuccessResponse(DocumentResponse, 200, DOCUMENT_MESSAGES.DOCUMENT_UPDATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async updateDocument(@Param('id') id: string, @Body() data: UpdateDocumentDto): Promise<ResponseDto> {
        const document = await this.documentsService.updateDocument(id, data);
        
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
    async deleteDocument(@Param('id') id: string): Promise<ResponseDto> {
        const document = await this.documentsService.deleteDocument(id);
        
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
    async publishDocument(@Param('id') id: string): Promise<ResponseDto> {
        const document = await this.documentsService.publishDocument(id);
        
        return {
            success: true,
            statusCode: 200,
            message: DOCUMENT_MESSAGES.DOCUMENT_PUBLISHED_SUCCESSFULLY,
            data: document,
            timestamp: new Date().toISOString()
        }
    }
}
