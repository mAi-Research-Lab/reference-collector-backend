import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { ReferencesService } from "./references.service";
import { CreateReferenceDto } from "./dto/reference/create-reference.dto";
import { ReferencesResponse } from "./dto/reference/references.response";
import { UpdateReferenceDto } from "./dto/reference/update-reference.dto";

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
    @ApiBody({ type: CreateReferenceDto })
    @ApiResponse({ status: 201, description: 'Reference created successfully', type: ReferencesResponse })
    async createReference(
        @Param('libraryId') libraryId: string,
        @Body() createReferenceDto: CreateReferenceDto
    ): Promise<ReferencesResponse> {
        return await this.referencesService.create(libraryId, createReferenceDto);
    }

    @Get(':libraryId/search')
    @ApiOperation({ summary: 'Search references' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiQuery({ name: 'q', description: 'Search term', required: true })
    @ApiQuery({ name: 'page', description: 'Page number', required: false })
    @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
    @ApiResponse({
        status: 200, description: 'Search results retrieved successfully',
        schema: {
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
    })
    async searchReferences(
        @Param('libraryId') libraryId: string,
        @Query('q') searchTerm: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        return await this.referencesService.searchReferences(
            searchTerm,
            libraryId,
            page || 1,
            limit || 10
        );
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
    @ApiResponse({ status: 200, description: 'Filtered references retrieved successfully', type: [ReferencesResponse] })
    async filterReferences(
        @Param('libraryId') libraryId: string,
        @Query('tags') tags?: string,
        @Query('year') year?: number,
        @Query('yearFrom') yearFrom?: number,
        @Query('yearTo') yearTo?: number,
        @Query('journal') journal?: string,
        @Query('authors') authors?: string,
        @Query('referenceType') referenceType?: string
    ): Promise<ReferencesResponse[]> {
        const filters = {
            tags: tags ? tags.split(',') : undefined,
            year,
            yearFrom,
            yearTo,
            journal,
            authors,
            referenceType
        };

        return await this.referencesService.filterReferencesAdvanced(libraryId, filters);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get reference by ID' })
    @ApiParam({ name: 'id', description: 'Reference ID' })
    @ApiResponse({ status: 200, description: 'Reference retrieved successfully', type: ReferencesResponse })
    async getReference(
        @Param('id') referenceId: string
    ): Promise<ReferencesResponse> {
        return await this.referencesService.getReference(referenceId);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update reference' })
    @ApiParam({ name: 'id', description: 'Reference ID' })
    @ApiBody({ type: UpdateReferenceDto })
    @ApiResponse({ status: 200, description: 'Reference updated successfully', type: ReferencesResponse })
    async updateReference(
        @Param('id') referenceId: string,
        @Body() updateReferenceDto: UpdateReferenceDto
    ): Promise<ReferencesResponse> {
        return await this.referencesService.updateReference(referenceId, updateReferenceDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete reference' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Reference ID' })
    @ApiResponse({ status: 200, description: 'Reference deleted successfully' })
    async deleteReference(
        @Param('id') referenceId: string
    ): Promise<{ message: string }> {
        return await this.referencesService.deleteReference(referenceId);
    }

    @Get('doi/:doi')
    @ApiOperation({ summary: 'Get reference by DOI' })
    @ApiParam({ name: 'doi', description: 'DOI of the reference' })
    @ApiResponse({ status: 200, description: 'Reference retrieved successfully', type: ReferencesResponse })
    async getReferenceByDoi(
        @Param('doi') doi: string
    ): Promise<ReferencesResponse> {
        return await this.referencesService.getReferenceByDoi(doi);
    }

    @Post(':id/tags')
    @ApiOperation({ summary: 'Add tags to reference' })
    @ApiParam({ name: 'id', description: 'Reference ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of tags to add to the reference'
                }
            },
            required: ['tags']
        }
    })
    @ApiResponse({ status: 200, description: 'Tags added to reference successfully', type: ReferencesResponse })
    async addTagsToReference(
        @Param('id') referenceId: string,
        @Body('tags') tags: string[]
    ): Promise<ReferencesResponse> {
        return await this.referencesService.addTagsToReference(referenceId, tags);
    }

    @Delete(':id/tags')
    @ApiOperation({ summary: 'Remove tags from reference' })
    @ApiParam({ name: 'id', description: 'Reference ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of tags to remove from the reference'
                }
            },
            required: ['tags']
        }
    })
    @ApiResponse({ status: 200, description: 'Tags removed from reference successfully', type: ReferencesResponse })
    async removeTagsFromReference(
        @Param('id') referenceId: string,
        @Body('tags') tags: string[]
    ): Promise<ReferencesResponse> {
        return await this.referencesService.removeTagsFromReference(referenceId, tags);
    }


}