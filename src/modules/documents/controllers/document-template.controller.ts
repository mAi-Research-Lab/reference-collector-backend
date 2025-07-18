import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { RoleGuard } from 'src/common/guard/role.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { DocumentTemplateService } from '../services/document-template.service';
import { CreateDocumentTemplateDto } from '../dto/document-template/create-document-template.dto';
import { DocumentTemplateResponseDto } from '../dto/document-template/document-template.response';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { DOCUMENT_TEMPLATE_MESSAGES } from '../constants/templates/document-templates.messages';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { UpdateDocumentTemplateDto } from '../dto/document-template/update-document-template.dto';
import { ApiErrorResponse, ApiSuccessArrayResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';

@Controller('documents/templates')
@ApiTags('Document Templates')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class DocumentTemplatesController {
    constructor(
        private readonly documentTemplateService: DocumentTemplateService
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a document template' })
    @ApiSuccessResponse(DocumentTemplateResponseDto, 201, 'Document template created successfully')
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async createDocumentTemplate(@Body() data: CreateDocumentTemplateDto): Promise<ResponseDto> {
        const documentTemplate = await this.documentTemplateService.create(data);

        return {
            message: DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_CREATED_SUCCESSFULLY,
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: documentTemplate
        }
    }

    @Get()
    @ApiQuery({ name: 'category', required: false, type: String })
    @ApiOperation({ summary: 'Get all document templates' })
    @ApiSuccessArrayResponse(DocumentTemplateResponseDto, 200, DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getAllDocumentTemplates(@Query('category') category?: string): Promise<ResponseDto> {
        const documentTemplates = await this.documentTemplateService.getAll(category);

        return {
            message: DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATES_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: documentTemplates
        }
    }

    @Get(':id')
    @ApiParam({name: 'id', type: String})
    @ApiOperation({ summary: 'Get a document template by id' })
    @ApiSuccessResponse(DocumentTemplateResponseDto, 200, DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_NOT_FOUND)
    async getDocumentTemplateById(@Param('id') id: string): Promise<ResponseDto> {
        const documentTemplate = await this.documentTemplateService.getById(id);

        return {
            message: DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: documentTemplate
        }
    }

    @Put(':id')
    @ApiParam({name: 'id', type: String})
    @ApiOperation({ summary: 'Update a document template by id' })
    @ApiSuccessResponse(DocumentTemplateResponseDto, 200, DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_UPDATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_NOT_FOUND)
    async updateDocumentTemplate(@Param('id') id: string, @Body() data: UpdateDocumentTemplateDto): Promise<ResponseDto> {
        const documentTemplate = await this.documentTemplateService.update(id, data);

        return {
            message: DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_UPDATED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: documentTemplate
        }
    }

    @Delete(':id')
    @ApiParam({name: 'id', type: String})
    @ApiOperation({ summary: 'Delete a document template by id' })
    @ApiSuccessResponse({ message: String }, 200, DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_DELETED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async deleteDocumentTemplate(@Param('id') id: string): Promise<ResponseDto> {
        await this.documentTemplateService.delete(id);

        return {
            message: DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATE_DELETED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
        }
    }

    @Get('popular')
    @ApiOperation({ summary: 'Get popular document templates' })
    @ApiSuccessArrayResponse(DocumentTemplateResponseDto, 200, DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getPopularDocumentTemplates(): Promise<ResponseDto> {
        const documentTemplates = await this.documentTemplateService.getPopularTemplates();

        return {
            message: DOCUMENT_TEMPLATE_MESSAGES.DOCUMENT_TEMPLATES_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: documentTemplates
        }
    }


}