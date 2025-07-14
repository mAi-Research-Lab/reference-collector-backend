import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CollectionResponse } from "../dto/collections/collection.response";
import { CreateCollectionData } from "../dto/collections/create-collection.dto";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { LIBRARY_MESSAGES } from "../constants/library.messages";
import { UpdateCollectionDto } from "../dto/collections/update-collection.dto";
import { CollectionItemsResponse } from "../dto/collections/collection-items.response";
import { ReferencesResponse } from "../dto/references/references.response";

@Injectable()
export class CollectionService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async create(data: CreateCollectionData): Promise<CollectionResponse> {
        const isExistCollection = await this.prisma.collections.findFirst({ where: { name: data.name } })
        
        if (isExistCollection) {
            throw new CustomHttpException(LIBRARY_MESSAGES.COLLECTIONS_ALREADY_EXISTS, 409, LIBRARY_MESSAGES.COLLECTIONS_ALREADY_EXISTS)
        }

        const collection = await this.prisma.collections.create({ data })

        return collection
    }

    async getCollections(libraryId: string): Promise<CollectionResponse[]> {
        const collections = await this.prisma.collections.findMany({ where: { libraryId } })

        return collections
    }

    async getCollection(collectionId: string): Promise<CollectionResponse> {
        const collection = await this.prisma.collections.findUnique({ where: { id: collectionId } })

        if (!collection) {
            throw new CustomHttpException(LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND, 404, LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND)
        }

        return collection
    }

    async updateCollection(collectionId: string, data: UpdateCollectionDto): Promise<CollectionResponse> {
        const collection = await this.prisma.collections.findUnique({ where: { id: collectionId } })

        if (!collection) {
            throw new CustomHttpException(LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND, 404, LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND)
        }

        return await this.prisma.collections.update({ where: { id: collectionId }, data })
    }

    async deleteCollection(collectionId: string): Promise<{ message: string }> {
        const collection = await this.prisma.collections.findUnique({ where: { id: collectionId } })

        if (!collection) {
            throw new CustomHttpException(LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND, 404, LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND)
        }

        await this.prisma.collections.delete({ where: { id: collectionId } })

        return { message: LIBRARY_MESSAGES.COLLECTIONS_DELETED_SUCCESSFULLY }
    }

    async addReference(collectionId: string, referenceId: string): Promise<CollectionItemsResponse> {
        const collection = await this.prisma.collections.findUnique({ where: { id: collectionId } })

        if (!collection) {
            throw new CustomHttpException(LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND, 404, LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND)
        }

        const isExistReference = await this.prisma.collectionItems.findFirst({ where: { collectionId, referenceId } })

        if (isExistReference) {
            throw new CustomHttpException(LIBRARY_MESSAGES.REFERENCE_ALREADY_EXISTS, 409, LIBRARY_MESSAGES.REFERENCE_ALREADY_EXISTS)
        }

        return await this.prisma.collectionItems.create({ data: { collectionId, referenceId } })
    }

    async getCollectionItems(collectionId: string): Promise<ReferencesResponse[]> {
        const collectionItems = await this.prisma.collectionItems.findMany({
            where: { collectionId },
            include: {
                reference: true
            },
            orderBy: {
                sortOrder: 'asc'
            }
        });

        return collectionItems.map(item => item.reference);
    }

    async deleteReference(collectionId: string, referenceId: string): Promise<{ message: string }> {
        const collection = await this.prisma.collections.findUnique({ where: { id: collectionId } })

        if (!collection) {
            throw new CustomHttpException(LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND, 404, LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND)
        }

        await this.prisma.collectionItems.deleteMany({ where: { collectionId, referenceId } })

        return { message: LIBRARY_MESSAGES.REFERENCE_DELETED_SUCCESSFULLY }
    }

    async moveCollection(collectionId: string, parentId: string): Promise<CollectionResponse> {
        const collection = await this.prisma.collections.findUnique({ where: { id: collectionId } })

        if (!collection) {
            throw new CustomHttpException(LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND, 404, LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND)
        }

        const updatedCollection = await this.prisma.collections.update({ where: { id: collectionId }, data: { parentId } })

        return updatedCollection
    }

    async copyCollection(collectionId: string): Promise<CollectionResponse> {
        const collection = await this.prisma.collections.findUnique({ where: { id: collectionId } })

        if (!collection) {
            throw new CustomHttpException(LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND, 404, LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND)
        }

        return await this.prisma.collections.create({ data: { ...collection, name: `${collection.name} (copy)` } })
    }

    async getSubCollections(collectionId: string): Promise<CollectionResponse[]> {
        return await this.prisma.collections.findMany({ where: { parentId: collectionId } })
    }

    async searchCollections(searchTerm: string): Promise<CollectionResponse[]> {
        return await this.prisma.collections.findMany({ where: { name: { contains: searchTerm } } })
    }
}