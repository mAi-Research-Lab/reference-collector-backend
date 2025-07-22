import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiSecurity, ApiTags } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { CitationStylesService } from "../services/citation-styles.service";
import { ResponseDto } from "src/common/dto/api-response.dto";
import { ApiErrorResponse, ApiSuccessArrayResponse } from "src/common/decorators/api-response-wrapper.decorator";
import { CitationStyleResponse } from "../dto/citation-style/citation-style.response";
import { CITATIONS_MESSAGES } from "../constants/citation.messages";
import { COMMON_MESSAGES } from "src/common/constants/common.messages";
import { FormatCitationDto } from "../dto/format-citation.dto";
import { User } from "src/modules/user/decorators/user.decorator";
import { CreateCitationStyleDto } from "../dto/citation-style/citation-style-create.dto";

@Controller('citations/styles')
@ApiTags('Citation Styles')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class CitationStylesController {
    constructor(
        private readonly citationStylesService: CitationStylesService
    ) { }

    @Get('available')
    @ApiSuccessArrayResponse(CitationStyleResponse,200, CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getAvailableStyles(): Promise<ResponseDto> {
        const stles = await this.citationStylesService.getAvailableStyles();

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY,
            data: stles,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Get('popular')
    @ApiSuccessArrayResponse(CitationStyleResponse,200, CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getPopularStyles(): Promise<ResponseDto> {
        const stles = await this.citationStylesService.getPopularStyles();

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY,
            data: stles,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Get('search')
    @ApiSuccessArrayResponse(CitationStyleResponse,200, CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async searchStyles(@Query('q') searchTerm: string): Promise<ResponseDto> {
        const stles = await this.citationStylesService.searchStyles(searchTerm);

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY,
            data: stles,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Post(':styleId/format')
    @ApiSuccessArrayResponse(CitationStyleResponse,200, CITATIONS_MESSAGES.CITATION_FORMATTED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async formatStyles(@Param('styleId') styleId: string, @Body() data: FormatCitationDto): Promise<ResponseDto> {
        const stles = await this.citationStylesService.formatCitationWithStyle(styleId, data);

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.CITATION_FORMATTED_SUCCESSFULLY,
            data: stles,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Post(':styleId/generate-bibliography')
    @ApiSuccessArrayResponse(CitationStyleResponse,200, CITATIONS_MESSAGES.BIBLIOGRAPHY_GENERATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async generateBibliography(@Param('styleId') styleId: string, @Body() data: { referenceIds: string[] }): Promise<ResponseDto> {
        const stles = await this.citationStylesService.generateBibliography(data.referenceIds, styleId);

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.BIBLIOGRAPHY_GENERATED_SUCCESSFULLY,
            data: stles,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Post()
    @ApiSuccessArrayResponse(CitationStyleResponse,200, CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async createCitationStyle(@User() user: any, @Body() data: CreateCitationStyleDto): Promise<ResponseDto> {
        const stles = await this.citationStylesService.createCustomStyle(user.id, data);

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY,
            data: stles,
            success: true,
            timestamp: new Date().toISOString()
        }
    }
}