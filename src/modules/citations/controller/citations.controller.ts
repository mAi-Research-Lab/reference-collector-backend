import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CreateCitationDto } from '../dto/create-citation.dto';
import { User } from '../../user/decorators/user.decorator';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { ApiErrorResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { CitationResponse } from '../dto/citation.response';
import { CITATIONS_MESSAGES } from '../constants/citation.messages';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { UpdateCitationDto } from '../dto/update-citation.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { CitationsService } from '../services/citations.service';

@Controller('citations')
@ApiTags('Citations')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class CitationsController {
    constructor(
        private readonly citationsService: CitationsService
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create citation' })
    @ApiSuccessResponse(CitationResponse, 201, CITATIONS_MESSAGES.CITATION_CREATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, CITATIONS_MESSAGES.CITATION_NOT_FOUND)
    @ApiErrorResponse(403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR)
    async create(@Body() data: CreateCitationDto, @User() user: any): Promise<ResponseDto> {
        const citation = await this.citationsService.create(user.id, data);

        return {
            message: CITATIONS_MESSAGES.CITATION_CREATED_SUCCESSFULLY,
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: citation
        }
    }

    @Get('document/:documentId')
    @ApiOperation({ summary: 'Get citations by document id' })
    @ApiSuccessResponse(CitationResponse, 200, CITATIONS_MESSAGES.CITATION_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, CITATIONS_MESSAGES.CITATION_NOT_FOUND)
    @ApiErrorResponse(403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR)
    async getCitationsByDocumentId(@User() user: any, @Param('documentId') documentId: string): Promise<ResponseDto> {
        const citations = await this.citationsService.getCitationsByDocument(documentId, user.id);

        return {
            message: CITATIONS_MESSAGES.CITATION_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: citations
        }
    }

    @Put(':citationId')
    @ApiOperation({ summary: 'Update citation' })
    @ApiSuccessResponse(CitationResponse, 200, CITATIONS_MESSAGES.CITATION_UPDATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, CITATIONS_MESSAGES.CITATION_NOT_FOUND)
    @ApiErrorResponse(403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR)
    async update(@User() user: any, @Param('citationId') citationId: string, @Body() data: UpdateCitationDto): Promise<ResponseDto> {
        const citation = await this.citationsService.update(citationId, data, user.id);

        return {
            message: CITATIONS_MESSAGES.CITATION_UPDATED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: citation
        }
    }

    @Delete(':citationId')
    @ApiOperation({ summary: 'Delete citation' })
    @ApiSuccessResponse(CitationResponse, 200, CITATIONS_MESSAGES.CITATION_DELETED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, CITATIONS_MESSAGES.CITATION_NOT_FOUND)
    @ApiErrorResponse(403, CITATIONS_MESSAGES.USER_NOT_COLLABORATOR)
    async delete(@User() user: any, @Param('citationId') citationId: string): Promise<ResponseDto> {
        const citation = await this.citationsService.delete(citationId, user.id);

        return {
            message: CITATIONS_MESSAGES.CITATION_DELETED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: citation
        }
    }
}
