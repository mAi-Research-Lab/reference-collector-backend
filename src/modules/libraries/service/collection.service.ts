import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CollectionResponse } from "../dto/collections/collection.response";
import { CreateCollectionDto } from "../dto/collections/create-collection.dto";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { LIBRARY_MESSAGES } from "../constants/library.messages";
import { UpdateCollectionDto } from "../dto/collections/update-collection.dto";

@Injectable()
export class CollectionService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async create(data: CreateCollectionDto): Promise<CollectionResponse> {
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

    async deleteCollection(collectionId: string): Promise<{message:string}> {
        const collection = await this.prisma.collections.findUnique({ where: { id: collectionId } })

        if (!collection) {
            throw new CustomHttpException(LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND, 404, LIBRARY_MESSAGES.COLLECTIONS_NOT_FOUND)
        }

        await this.prisma.collections.delete({ where: { id: collectionId } })

        return { message: LIBRARY_MESSAGES.COLLECTIONS_DELETED_SUCCESSFULLY }
    }

}