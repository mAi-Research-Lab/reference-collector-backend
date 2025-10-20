import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { OfficeDocumentsService } from '../services/office-integration.service';
import { User } from 'src/modules/user/decorators/user.decorator';
import { RegisterDocumentDto } from '../dto/register-document.dto';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { OFFICE_MESSAGES } from '../constants/office-messages';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponse, ApiSuccessArrayResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { OfficeDocumentResponse } from '../dto/office-document.response';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { Platforms, SyncStatus } from 'generated/prisma';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';

@Controller('office-integration')
@ApiTags('Office Integration')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class OfficeIntegrationController {
    constructor(
        private readonly officeDocumentsService: OfficeDocumentsService
    ) { }


    @Post()
    @ApiOperation({ summary: 'Register Document' })
    @ApiSuccessResponse(OfficeDocumentResponse, 201,
        OFFICE_MESSAGES.DOCUMENT_REGISTERED_SUCCESSFULLY
    )
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(409, OFFICE_MESSAGES.DOCUMENT_ALREADY_REGISTERED)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async registerDocument(@User() user: any, @Body() data: RegisterDocumentDto): Promise<ResponseDto> {
        const officeDocument = await this.officeDocumentsService.registerDocument(user.id, data);

        return {
            message: OFFICE_MESSAGES.DOCUMENT_REGISTERED_SUCCESSFULLY,
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: officeDocument
        }
    }

    @Get('user/documents')
    @ApiOperation({ summary: 'Get User Documents' })
    @ApiSuccessArrayResponse(OfficeDocumentResponse, 200,
        "User Documents",
    )
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async getUserDocuments(@User() user: any): Promise<ResponseDto> {
        const officeDocuments = await this.officeDocumentsService.getUserDocuments(user.id);

        return {
            message: "User Documents",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: officeDocuments
        }
    }


    @Get('platform')
    @ApiOperation({ summary: 'Get Platform' })
    @ApiSuccessArrayResponse(OfficeDocumentResponse, 200,
        "Get Platform",
    )
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(404, OFFICE_MESSAGES.DOCUMENT_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async getPlatform(@User() user: any, platform: Platforms): Promise<ResponseDto> {
        const officeDocuments = await this.officeDocumentsService.getDocumentsByPlatform(user.id, platform);

        return {
            message: "Get Platform",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: officeDocuments
        }

    }

    @Get(':officeDocumentId')
    @ApiOperation({ summary: 'Get Document By Id' })
    @ApiSuccessResponse(OfficeDocumentResponse, 200,
        "Get Document By Id",
    )
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(404, OFFICE_MESSAGES.DOCUMENT_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async getDocumentById(@User() user: any, @Param('officeDocumentId') officeDocumentId: string): Promise<ResponseDto> {
        const officeDocument = await this.officeDocumentsService.getDocumentById(officeDocumentId, user.id);

        return {
            message: "Get Document By Id",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: officeDocument
        }
    }

    @Put(':officeDocumentId/hash')
    @ApiOperation({ summary: 'Update Document By Id' })
    @ApiSuccessResponse(OfficeDocumentResponse, 200,
        "Update Document By Id",
    )
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(404, OFFICE_MESSAGES.DOCUMENT_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async updateDocumentHash(@User() user: any, @Param('officeDocumentId') officeDocumentId: string, @Body('newHash') newHash: string): Promise<ResponseDto> {
        const officeDocument = await this.officeDocumentsService.updateDocumentHash(officeDocumentId, user.id, newHash);

        return {
            message: "Update Document By Id",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: officeDocument
        }
    }

    @Put(':officeDocumentId/citation/:citationId/:referenceId')
    @ApiOperation({ summary: 'Update Citation By Id' })
    @ApiSuccessResponse(OfficeDocumentResponse, 200,
        "Update Citation By Id",
    )
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(404, OFFICE_MESSAGES.DOCUMENT_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async updateCitationMapping(
        @User() user: any,
        @Param('officeDocumentId') officeDocumentId: string,
        @Param('citationId') citationId: string,
        @Param('referenceId') referenceId: string
    )
        : Promise<ResponseDto> {
        const officeDocument = await this.officeDocumentsService.updateCitationMapping(officeDocumentId, user.id, citationId, referenceId);

        return {
            message: "Update Citation By Id",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: officeDocument
        }
    }

    @Delete(':officeDocumentId/:citationId')
    @ApiOperation({ summary: 'Delete Citation By Id' })
    @ApiSuccessResponse(OfficeDocumentResponse, 200,
        "Delete Citation By Id",
    )
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(404, OFFICE_MESSAGES.DOCUMENT_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async removeCitationMapping(@User() user: any, @Param('officeDocumentId') officeDocumentId: string, @Param('citationId') citationId: string): Promise<ResponseDto> {
        const officeDocument = await this.officeDocumentsService.removeCitationMapping(officeDocumentId, user.id, citationId);

        return {
            message: "Delete Citation By Id",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: officeDocument
        }
    }

    @Put(':officeDocumentId/status')
    @ApiOperation({ summary: 'Update Document Sync Status' })
    @ApiSuccessResponse(OfficeDocumentResponse, 200,
        "Update Document Sync Status",
    )
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(404, OFFICE_MESSAGES.DOCUMENT_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async updateSyncStatus(@User() user: any, @Param('officeDocumentId') officeDocumentId: string, @Body('status') status: SyncStatus): Promise<ResponseDto> {
        const officeDocument = await this.officeDocumentsService.updateSyncStatus(officeDocumentId, user.id, status);

        return {
            message: "Update Document Sync Status",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: officeDocument
        }
    }

    @Delete(':officeDocumentId')
    @ApiOperation({ summary: 'Delete Document By Id' })
    @ApiSuccessResponse(OfficeDocumentResponse, 200,
        "Delete Document By Id",
    )
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(404, OFFICE_MESSAGES.DOCUMENT_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async deleteDocument(@User() user: any, @Param('officeDocumentId') officeDocumentId: string): Promise<ResponseDto> {
        const officeDocument = await this.officeDocumentsService.deleteDocument(officeDocumentId, user.id);

        return {
            message: "Delete Document By Id",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: officeDocument
        }
    }


    @Get(':officeDocumentId/citation')
    @ApiOperation({ summary: 'Get Citation By Document Id' })
    @ApiSuccessResponse({}, 200,
        "Get Citation By Document Id",
    )
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(404, OFFICE_MESSAGES.DOCUMENT_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async getCitationByDocumentId(@User() user: any, @Param('officeDocumentId') officeDocumentId: string): Promise<ResponseDto> {
        const officeDocument = await this.officeDocumentsService.getDocumentCitations(officeDocumentId, user.id);

        return {
            message: "Get Citation By Document Id",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: officeDocument
        }
    }

    @Put(':officeDocumentId/style')
    @ApiOperation({ summary: 'Set Document Citation Style' })
    @ApiSuccessResponse(OfficeDocumentResponse, 200,
        "Document style updated successfully",
    )
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(404, OFFICE_MESSAGES.DOCUMENT_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async setDocumentStyle(
        @User() user: any, 
        @Param('officeDocumentId') officeDocumentId: string,
        @Body() data: { styleId: string; citationStyle?: string }
    ): Promise<ResponseDto> {
        const officeDocument = await this.officeDocumentsService.setDocumentStyle(
            officeDocumentId, 
            user.id, 
            data.styleId,
            data.citationStyle
        );

        return {
            message: "Document style updated successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: officeDocument
        }
    }

    @Get(':officeDocumentId/style')
    @ApiOperation({ summary: 'Get Document Citation Style' })
    @ApiSuccessResponse({}, 200,
        "Get Document Citation Style",
    )
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(404, OFFICE_MESSAGES.DOCUMENT_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async getDocumentStyle(@User() user: any, @Param('officeDocumentId') officeDocumentId: string): Promise<ResponseDto> {
        const styleInfo = await this.officeDocumentsService.getDocumentStyle(officeDocumentId, user.id);

        return {
            message: "Get Document Citation Style",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: styleInfo
        }
    }
}
