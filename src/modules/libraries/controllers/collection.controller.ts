import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { CollectionService } from "../service/collection.service";
import { CollectionResponse } from "../dto/collections/collection.response";
import { CreateCollectionDto } from "../dto/collections/create-collection.dto";
import { UpdateCollectionDto } from "../dto/collections/update-collection.dto";
import { CollectionItemsResponse } from "../dto/collections/collection-items.response";
import { ReferencesResponse } from "../../references/dto/reference/references.response";
import { ApiSuccessArrayResponse, ApiSuccessResponse } from "src/common/decorators/api-response-wrapper.decorator";
import { LIBRARY_MESSAGES } from "../constants/library.messages";
import { ResponseDto } from "src/common/dto/api-response.dto";

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
    @ApiSuccessArrayResponse(CollectionResponse, 200, LIBRARY_MESSAGES.COLLECTIONS_FETCHED_SUCCESSFULLY)
    async getCollections(
        @Param('libraryId') libraryId: string
    ): Promise<ResponseDto> {
        const collections = await this.collectionService.getCollections(libraryId);

        return {
            message: LIBRARY_MESSAGES.COLLECTIONS_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: collections
        }
    }

    @Post()
    @ApiOperation({ summary: 'Create new collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiBody({ type: CreateCollectionDto })
    @ApiSuccessResponse(CollectionResponse, 201, "Collection created successfully")
    @ApiSecurity('bearer')
    async createCollection(
        @Param('libraryId') libraryId: string,
        @Body() createCollectionDto: CreateCollectionDto
    ): Promise<ResponseDto> {
        const collectionData = { ...createCollectionDto, libraryId };
        const collection = await this.collectionService.create(collectionData);

        return {
            message: "Collection created successfully",
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: collection
        }
    }

    // @Get('tree')
    // @ApiOperation({ summary: 'Get hierarchical collection tree' })
    // @ApiParam({ name: 'libraryId', description: 'Library ID' })
    // @ApiSuccessArrayResponse(CollectionResponse, 200, LIBRARY_MESSAGES.COLLECTIONS_FETCHED_SUCCESSFULLY)
    // async getCollectionTree(
    //     @Param('libraryId') libraryId: string
    // ): Promise<ResponseDto> {
    //     const collections = await this.collectionService.getCollectionTree(libraryId);
    //     
    //     return {
    //         message: LIBRARY_MESSAGES.COLLECTIONS_FETCHED_SUCCESSFULLY,
    //         statusCode: 200,
    //         success: true,
    //         timestamp: new Date().toISOString(),
    //         data: collections
    //     }
    // }

    @Get('search')
    @ApiOperation({ summary: 'Search collections by name' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiQuery({ name: 'q', description: 'Search term', required: true })
    @ApiSuccessArrayResponse(CollectionResponse, 200, LIBRARY_MESSAGES.COLLECTIONS_FETCHED_SUCCESSFULLY)
    async searchCollections(
        @Param('libraryId') libraryId: string,
        @Query('q') searchTerm: string
    ): Promise<ResponseDto> {
        const collections = await this.collectionService.searchCollections(searchTerm);

        return {
            message: LIBRARY_MESSAGES.COLLECTIONS_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: collections
        }
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get collection by ID' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID' })
    @ApiSuccessResponse(CollectionResponse, 200, LIBRARY_MESSAGES.COLLECTION_FETCHED_SUCCESSFULLY)
    async getCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string
    ): Promise<ResponseDto> {
        const collection = await this.collectionService.getCollection(collectionId);

        return {
            message: LIBRARY_MESSAGES.COLLECTION_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: collection
        }
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID' })
    @ApiBody({ type: UpdateCollectionDto })
    @ApiSuccessResponse(CollectionResponse, 200, "Collection updated successfully")
    async updateCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string,
        @Body() updateCollectionDto: UpdateCollectionDto
    ): Promise<ResponseDto> {
        const collection = await this.collectionService.updateCollection(collectionId, updateCollectionDto);

        return {
            message: "Collection updated successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: collection
        }
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID' })
    @ApiResponse({ status: 200, description: 'Collection deleted successfully' })
    async deleteCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string
    ): Promise<ResponseDto> {
        await this.collectionService.deleteCollection(collectionId);

        return {
            message: "Collection deleted successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: null
        }
    }

    @Get(':id/items')
    @ApiOperation({ summary: 'Get references in collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID' })
    @ApiSuccessArrayResponse(ReferencesResponse, 200, "Collection items retrieved successfully")
    async getCollectionItems(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string
    ): Promise<ResponseDto> {
        const items = await this.collectionService.getCollectionItems(collectionId);

        return {
            message: "Collection items retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: items
        }
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
    @ApiSuccessResponse(CollectionItemsResponse, 201, "Reference added to collection successfully")
    async addReferenceToCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string,
        @Body('referenceId') referenceId: string
    ): Promise<ResponseDto> {
        const collectionItem = await this.collectionService.addReference(collectionId, referenceId);

        return {
            message: "Reference added to collection successfully",
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: collectionItem
        }
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
    ): Promise<ResponseDto> {
        await this.collectionService.deleteReference(collectionId, referenceId);

        return {
            message: "Reference removed from collection successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: null
        }
    }

    @Get(':id/subcollections')
    @ApiOperation({ summary: 'Get subcollections' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Parent Collection ID' })
    @ApiSuccessArrayResponse(CollectionResponse, 200, "Subcollections retrieved successfully")
    async getSubCollections(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string
    ): Promise<ResponseDto> {
        const subcollections = await this.collectionService.getSubCollections(collectionId);

        return {
            message: "Subcollections retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: subcollections
        }
    }

    @Post(':id/subcollections')
    @ApiOperation({ summary: 'Create subcollection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Parent Collection ID' })
    @ApiBody({ type: CreateCollectionDto })
    @ApiSuccessResponse(CollectionResponse, 201, "Subcollection created successfully")
    async createSubCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') parentId: string,
        @Body() createCollectionDto: CreateCollectionDto
    ): Promise<ResponseDto> {
        const collectionData = { ...createCollectionDto, libraryId, parentId };
        const subcollection = await this.collectionService.create(collectionData);

        return {
            message: "Subcollection created successfully",
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: subcollection
        }
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
    @ApiSuccessResponse(CollectionResponse, 200, "Collection moved successfully")
    async moveCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string,
        @Body('parentId') parentId: string
    ): Promise<ResponseDto> {
        const collection = await this.collectionService.moveCollection(collectionId, parentId);

        return {
            message: "Collection moved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: collection
        }
    }

    @Post(':id/copy')
    @ApiOperation({ summary: 'Copy collection' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'id', description: 'Collection ID to copy' })
    @ApiSuccessResponse(CollectionResponse, 201, "Collection copied successfully")
    async copyCollection(
        @Param('libraryId') libraryId: string,
        @Param('id') collectionId: string
    ): Promise<ResponseDto> {
        const collection = await this.collectionService.copyCollection(collectionId);

        return {
            message: "Collection copied successfully",
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: collection
        }
    }
}