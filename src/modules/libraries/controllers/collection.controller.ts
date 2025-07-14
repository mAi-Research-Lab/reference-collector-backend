import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { CollectionService } from "../service/collection.service";
import { CollectionResponse } from "../dto/collections/collection.response";
import { CreateCollectionDto } from "../dto/collections/create-collection.dto";
import { UpdateCollectionDto } from "../dto/collections/update-collection.dto";
import { CollectionItemsResponse } from "../dto/collections/collection-items.response";
import { ReferencesResponse } from "../dto/references/references.response";

@Controller('libraries/:libraryId/collections')
@ApiTags('Library Collections')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class CollectionController {
    constructor(
        private readonly collectionService: CollectionService
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get all collections in library' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiResponse({ status: 200, description: 'Collections retrieved successfully', type: [CollectionResponse] })
    async getCollections(
        @Param('libraryId') libraryId: string
    ): Promise<CollectionResponse[]> {
        return await this.collectionService.getCollections(libraryId);
    }

    @Post()
    @ApiOperation({ summary: 'Create new collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiBody({ type: CreateCollectionDto })
    @ApiResponse({ status: 201, description: 'Collection created successfully', type: CollectionResponse })
    async createCollection(
        @Param('libraryId') libraryId: string,
        @Body() createCollectionDto: CreateCollectionDto
    ): Promise<CollectionResponse> {
        const collectionData = { ...createCollectionDto, libraryId };
        return await this.collectionService.create(collectionData);
    }

    // @Get('tree')
    // @ApiOperation({ summary: 'Get hierarchical collection tree' })
    // @ApiParam({ name: 'libraryId', description: 'Library ID' })
    // @ApiResponse({ status: 200, description: 'Collection tree retrieved successfully', type: [CollectionResponse] })
    // async getCollectionTree(
    //     @Param('libraryId') libraryId: string
    // ): Promise<CollectionResponse[]> {
    //     return await this.collectionService.getCollectionTree(libraryId);
    // }

    @Get('search')
    @ApiOperation({ summary: 'Search collections by name' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiQuery({ name: 'q', description: 'Search term', required: true })
    @ApiResponse({ status: 200, description: 'Search results retrieved successfully', type: [CollectionResponse] })
    async searchCollections(
        @Param('libraryId') libraryId: string,
        @Query('q') searchTerm: string
    ): Promise<CollectionResponse[]> {
        return await this.collectionService.searchCollections(searchTerm);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get collection by ID' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID' })
    @ApiResponse({ status: 200, description: 'Collection retrieved successfully', type: CollectionResponse })
    async getCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string
    ): Promise<CollectionResponse> {
        return await this.collectionService.getCollection(collectionId);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID' })
    @ApiBody({ type: UpdateCollectionDto })
    @ApiResponse({ status: 200, description: 'Collection updated successfully', type: CollectionResponse })
    async updateCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string,
        @Body() updateCollectionDto: UpdateCollectionDto
    ): Promise<CollectionResponse> {
        return await this.collectionService.updateCollection(collectionId, updateCollectionDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID' })
    @ApiResponse({ status: 200, description: 'Collection deleted successfully' })
    async deleteCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string
    ): Promise<{ message: string }> {
        return await this.collectionService.deleteCollection(collectionId);
    }

    @Get(':id/items')
    @ApiOperation({ summary: 'Get references in collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID' })
    @ApiResponse({ status: 200, description: 'Collection items retrieved successfully', type: [ReferencesResponse] })
    async getCollectionItems(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string
    ): Promise<ReferencesResponse[]> {
        return await this.collectionService.getCollectionItems(collectionId);
    }

    @Post(':id/items')
    @ApiOperation({ summary: 'Add reference to collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                referenceId: { type: 'string', description: 'Reference ID to add' }
            },
            required: ['referenceId']
        }
    })
    @ApiResponse({ status: 201, description: 'Reference added to collection successfully', type: CollectionItemsResponse })
    async addReferenceToCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string,
        @Body('referenceId') referenceId: string
    ): Promise<CollectionItemsResponse> {
        return await this.collectionService.addReference(collectionId, referenceId);
    }

    @Delete(':id/items/:referenceId')
    @ApiOperation({ summary: 'Remove reference from collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID' })
    @ApiParam({ name: 'referenceId', description: 'Reference ID to remove' })
    @ApiResponse({ status: 200, description: 'Reference removed from collection successfully' })
    async removeReferenceFromCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string,
        @Param('referenceId') referenceId: string
    ): Promise<{ message: string }> {
        return await this.collectionService.deleteReference(collectionId, referenceId);
    }

    @Get(':id/subcollections')
    @ApiOperation({ summary: 'Get subcollections' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Parent Collection ID' })
    @ApiResponse({ status: 200, description: 'Subcollections retrieved successfully', type: [CollectionResponse] })
    async getSubCollections(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string
    ): Promise<CollectionResponse[]> {
        return await this.collectionService.getSubCollections(collectionId);
    }

    @Post(':id/subcollections')
    @ApiOperation({ summary: 'Create subcollection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Parent Collection ID' })
    @ApiBody({ type: CreateCollectionDto })
    @ApiResponse({ status: 201, description: 'Subcollection created successfully', type: CollectionResponse })
    async createSubCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') parentId: string,
        @Body() createCollectionDto: CreateCollectionDto
    ): Promise<CollectionResponse> {
        const collectionData = { ...createCollectionDto, libraryId, parentId };
        return await this.collectionService.create(collectionData);
    }

    @Post(':id/move')
    @ApiOperation({ summary: 'Move collection to different parent' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID to move' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                parentId: { type: 'string', description: 'New parent collection ID (null for root level)', nullable: true }
            },
            required: ['parentId']
        }
    })
    @ApiResponse({ status: 200, description: 'Collection moved successfully', type: CollectionResponse })
    async moveCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string,
        @Body('parentId') parentId: string
    ): Promise<CollectionResponse> {
        return await this.collectionService.moveCollection(collectionId, parentId);
    }

    @Post(':id/copy')
    @ApiOperation({ summary: 'Copy collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID to copy' })
    @ApiResponse({ status: 201, description: 'Collection copied successfully', type: CollectionResponse })
    async copyCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string
    ): Promise<CollectionResponse> {
        return await this.collectionService.copyCollection(collectionId);
    }
}