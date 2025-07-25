import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { ReferencesService } from "./references.service";
import { CreateReferenceDto } from "./dto/reference/create-reference.dto";
import { ReferencesResponse } from "./dto/reference/references.response";
import { UpdateReferenceDto } from "./dto/reference/update-reference.dto";
import { ApiSuccessArrayResponse, ApiSuccessResponse, ApiErrorResponse } from "src/common/decorators/api-response-wrapper.decorator";
import { ResponseDto } from "src/common/dto/api-response.dto";
import { COMMON_MESSAGES } from "src/common/constants/common.messages";

@Controller('references')
@ApiTags('References')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class ReferencesController {
    constructor(
        private readonly referencesService: ReferencesService
    ) { }

    @Post(':libraryId')
    @ApiOperation({ summary: 'Create new reference' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiSuccessResponse(ReferencesResponse, 201, "Reference created successfully")
    @ApiErrorResponse(400, "Bad request - Invalid reference data")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Library not found")
    async createReference(
        @Param('libraryId') libraryId: string,
        @Body() createReferenceDto: CreateReferenceDto
    ): Promise<ResponseDto> {
        const reference = await this.referencesService.create(libraryId, createReferenceDto);

        return {
            message: "Reference created successfully",
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: reference
        };
    }

    @Get(':libraryId/search')
    @ApiOperation({ summary: 'Search references' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiQuery({ name: 'q', description: 'Search term', required: true })
    @ApiQuery({ name: 'page', description: 'Page number', required: false })
    @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
    @ApiResponse({
        status: 200, 
        description: 'Search results retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                statusCode: { type: 'number' },
                success: { type: 'boolean' },
                timestamp: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { $ref: getSchemaPath(ReferencesResponse) },
                        },
                        total: { type: 'number' },
                        page: { type: 'number' },
                        totalPages: { type: 'number' },
                    }
                }
            }
        }
    })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Library not found")
    async searchReferences(
        @Param('libraryId') libraryId: string,
        @Query('q') searchTerm: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ): Promise<ResponseDto> {
        const searchResults = await this.referencesService.searchReferences(
            searchTerm,
            libraryId,
            page || 1,
            limit || 10
        );

        return {
            message: "Search results retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: searchResults
        };
    }

    @Get(':libraryId/filter')
    @ApiOperation({ summary: 'Filter references' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiQuery({ name: 'tags', description: 'Filter by tags (comma-separated)', required: false })
    @ApiQuery({ name: 'year', description: 'Filter by year', required: false })
    @ApiQuery({ name: 'yearFrom', description: 'Filter from year', required: false })
    @ApiQuery({ name: 'yearTo', description: 'Filter to year', required: false })
    @ApiQuery({ name: 'journal', description: 'Filter by journal', required: false })
    @ApiQuery({ name: 'authors', description: 'Filter by authors', required: false })
    @ApiQuery({ name: 'referenceType', description: 'Filter by reference type', required: false })
    @ApiSuccessArrayResponse(ReferencesResponse, 200, "Filtered references retrieved successfully")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Library not found")
    async filterReferences(
        @Param('libraryId') libraryId: string,
        @Query('tags') tags?: string,
        @Query('year') year?: number,
        @Query('yearFrom') yearFrom?: number,
        @Query('yearTo') yearTo?: number,
        @Query('journal') journal?: string,
        @Query('authors') authors?: string,
        @Query('referenceType') referenceType?: string
    ): Promise<ResponseDto> {
        const filters = {
            tags: tags ? tags.split(',') : undefined,
            year,
            yearFrom,
            yearTo,
            journal,
            authors,
            referenceType
        };

        const filteredReferences = await this.referencesService.filterReferencesAdvanced(libraryId, filters);

        return {
            message: "Filtered references retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: filteredReferences
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get reference by ID' })
    @ApiParam({ name: 'id', description: 'Reference ID' })
    @ApiSuccessResponse(ReferencesResponse, 200, "Reference retrieved successfully")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Reference not found")
    async getReference(
        @Param('id') referenceId: string
    ): Promise<ResponseDto> {
        const reference = await this.referencesService.getReference(referenceId);

        return {
            message: "Reference retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: reference
        };
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update reference' })
    @ApiParam({ name: 'id', description: 'Reference ID' })
    @ApiSuccessResponse(ReferencesResponse, 200, "Reference updated successfully")
    @ApiErrorResponse(400, "Bad request - Invalid reference data")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Reference not found")
    async updateReference(
        @Param('id') referenceId: string,
        @Body() updateReferenceDto: UpdateReferenceDto
    ): Promise<ResponseDto> {
        const reference = await this.referencesService.updateReference(referenceId, updateReferenceDto);

        return {
            message: "Reference updated successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: reference
        };
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete reference' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Reference ID' })
    @ApiResponse({ status: 200, description: 'Reference deleted successfully' })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Reference not found")
    async deleteReference(
        @Param('id') referenceId: string
    ): Promise<ResponseDto> {
        const result = await this.referencesService.deleteReference(referenceId);

        return {
            message: "Reference deleted successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result.message
        };
    }

    @Get('doi/:doi')
    @ApiOperation({ summary: 'Get reference by DOI' })
    @ApiParam({ name: 'doi', description: 'DOI of the reference' })
    @ApiSuccessResponse(ReferencesResponse, 200, "Reference retrieved successfully")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Reference not found")
    async getReferenceByDoi(
        @Param('doi') doi: string
    ): Promise<ResponseDto> {
        const reference = await this.referencesService.getReferenceByDoi(doi);

        return {
            message: "Reference retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: reference
        };
    }

    @Post(':id/tags')
    @ApiOperation({ summary: 'Add tags to reference' })
    @ApiParam({ name: 'id', description: 'Reference ID' })
    @ApiSuccessResponse(ReferencesResponse, 200, "Tags added to reference successfully")
    @ApiErrorResponse(400, "Bad request - Invalid tags data")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Reference not found")
    async addTagsToReference(
        @Param('id') referenceId: string,
        @Body() tags: string[]
    ): Promise<ResponseDto> {
        const reference = await this.referencesService.addTagsToReference(referenceId, tags);

        return {
            message: "Tags added to reference successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: reference
        };
    }

    @Delete(':id/tags')
    @ApiOperation({ summary: 'Remove tags from reference' })
    @ApiParam({ name: 'id', description: 'Reference ID' })
    @ApiSuccessResponse(ReferencesResponse, 200, "Tags removed from reference successfully")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Reference not found")
    async removeTagsFromReference(
        @Param('id') referenceId: string,
        @Body('tags') tags: string[]
    ): Promise<ResponseDto> {
        const result = await this.referencesService.removeTagsFromReference(referenceId, tags);

        return {
            message: "Tags removed from reference successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }
}