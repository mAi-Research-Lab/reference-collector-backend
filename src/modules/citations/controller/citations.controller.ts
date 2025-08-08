import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CreateCitationDto } from '../dto/create-citation.dto';
import { User } from '../../user/decorators/user.decorator';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { ApiErrorResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { CitationResponse } from '../dto/citation.response';
import { CITATIONS_MESSAGES } from '../constants/citation.messages';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { CitationsService } from '../services/citations.service';
import { CitationStylesService } from '../services/citation-styles.service';

@Controller('citations')
@ApiTags('Citations')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class CitationsController {
    constructor(
        private readonly citationsService: CitationsService,
        private readonly citationStylesService: CitationStylesService
    ) { }

    @Post('insert')
    @ApiOperation({ summary: 'Insert citation for Word add-in' })
    @ApiSuccessResponse(CitationResponse, 201, 'Citation inserted successfully')
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, CITATIONS_MESSAGES.CITATION_NOT_FOUND)
    @ApiErrorResponse(403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR)
    async insertCitation(@Body() data: CreateCitationDto, @User() user: any): Promise<ResponseDto> {
        const citation = await this.citationsService.create(user.id, data);

        return {
            message: 'Citation inserted successfully',
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: citation
        };
    }

    @Get('document/:documentId')
    @ApiOperation({ summary: 'Get citations by document' })
    @ApiSuccessResponse(CitationResponse, 200, 'Citations retrieved successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR)
    async getCitationsByDocumentEndpoint(
        @Param('documentId') documentId: string,
        @User() user: any
    ): Promise<ResponseDto> {
        const citations = await this.citationsService.getCitationsByDocument(documentId, user.id);

        return {
            message: 'Citations retrieved successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: citations
        };
    }

    @Patch(':id/field')
    @ApiOperation({ summary: 'Update citation field ID' })
    @ApiSuccessResponse(CitationResponse, 200, 'Field ID updated successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, CITATIONS_MESSAGES.CITATION_NOT_FOUND)
    @ApiErrorResponse(403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR)
    async updateFieldId(
        @Param('id') id: string,
        @Body() data: { fieldId: string },
    ): Promise<ResponseDto> {
        const citation = await this.citationsService.updateFieldId(id, data.fieldId);

        return {
            message: 'Field ID updated successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: citation
        };
    }

    @Patch(':id/order')
    @ApiOperation({ summary: 'Update citation sort order' })
    @ApiSuccessResponse({}, 200, 'Sort order updated successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, CITATIONS_MESSAGES.CITATION_NOT_FOUND)
    @ApiErrorResponse(403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR)
    async updateSortOrder(
        @Param('id') id: string,
        @Body() data: { sortOrder: number },
    ): Promise<ResponseDto> {
        await this.citationsService.updateSortOrder(id, data.sortOrder);

        return {
            message: 'Sort order updated successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: null
        };
    }

    @Get('document/:documentId/bibliography')
    @ApiOperation({ summary: 'Generate bibliography for document' })
    @ApiSuccessResponse({}, 200, 'Bibliography generated successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR)
    async generateBibliography(
        @Param('documentId') documentId: string,
        @Query('style') style: string = 'apa',
        @User() user: any
    ): Promise<ResponseDto> {
        const bibliography = await this.citationsService.generateBibliography(documentId, user.id, style);

        return {
            message: 'Bibliography generated successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: bibliography
        };
    }


    @Get('document/:documentId/bibliography/:styleId')
    @ApiOperation({ summary: 'Generate bibliography with specific style' })
    @ApiSuccessResponse({}, 200, 'Style-specific bibliography generated successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR)
    @ApiErrorResponse(404, CITATIONS_MESSAGES.STYLE_NOT_FOUND)
    async generateBibliographyWithStyle(
        @Param('documentId') documentId: string,
        @Param('styleId') styleId: string,
        @User() user: any
    ): Promise<ResponseDto> {
        const bibliography = await this.citationsService.generateBibliography(documentId, user.id, styleId);

        return {
            message: 'Bibliography generated successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: bibliography
        };
    }

    @Patch('document/:documentId/style/:styleId')
    @ApiOperation({ summary: 'Update all citations in document to new style' })
    @ApiSuccessResponse({}, 200, 'Citations style updated successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR)
    @ApiErrorResponse(404, CITATIONS_MESSAGES.STYLE_NOT_FOUND)
    async updateDocumentCitationStyle(
        @Param('documentId') documentId: string,
        @Param('styleId') styleId: string,
        @User() user: any
    ): Promise<ResponseDto> {
        const updatedCount = await this.citationsService.refreshCitationsByStyle(documentId, styleId, user.id);

        return {
            message: `${updatedCount} citations updated successfully`,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: { updatedCount, newStyleId: styleId }
        };
    }

    @Get('styles')
    @ApiOperation({ summary: 'Get available citation styles' })
    @ApiSuccessResponse({}, 200, 'Citation styles retrieved successfully')
    async getAvailableCitationStyles(): Promise<ResponseDto> {
        const styles = await this.citationStylesService.getAvailableStyles();

        return {
            message: 'Citation styles retrieved successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: styles
        };
    }

    @Get('styles/popular')
    @ApiOperation({ summary: 'Get popular citation styles' })
    @ApiSuccessResponse({}, 200, 'Popular citation styles retrieved successfully')
    async getPopularCitationStyles(): Promise<ResponseDto> {
        const styles = await this.citationStylesService.getPopularStyles();

        return {
            message: 'Popular citation styles retrieved successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: styles
        };
    }
}
