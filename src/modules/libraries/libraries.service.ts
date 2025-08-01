import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CreateLibrariesDto } from './dto/create-libraries.dto';
import { LibraryResponse } from './dto/response/libraries.response';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { LIBRARY_MESSAGES } from './constants/library.messages';
import { UpdateLibrariesDto } from './dto/update-libraries.dto';
import { LibraryTypes, LibraryVisibility } from 'generated/prisma';

@Injectable()
export class LibrariesService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async create(data: CreateLibrariesDto): Promise<LibraryResponse> {
        const { ownerId, ...rest } = data;

        return await this.prisma.libraries.create({
            data: {
                ...rest,
                ownerId: ownerId,
            }
        });
    }

    async getAll(): Promise<LibraryResponse[]> {
        return await this.prisma.libraries.findMany({
            where: { isDeleted: false }
        });
    }

    async getLibraryById(id: string): Promise<LibraryResponse> {
        const library = await this.prisma.libraries.findUnique({
            where: { id, isDeleted: false }
        });

        if (!library) {
            throw new CustomHttpException(LIBRARY_MESSAGES.LIBRARY_NOT_FOUND, 404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND);
        }

        return library;
    }

    async update(id: string, data: UpdateLibrariesDto): Promise<LibraryResponse> {
        const library = await this.prisma.libraries.findUnique({
            where: { id, isDeleted: false }
        });

        if (!library) {
            throw new CustomHttpException(LIBRARY_MESSAGES.LIBRARY_NOT_FOUND, 404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND);
        }

        return await this.prisma.libraries.update({ where: { id }, data });
    }

    async delete(id: string): Promise<{ message: string }> {
        const library = await this.prisma.libraries.findUnique({
            where: { id, isDeleted: false }
        });

        
        if (!library) {
            throw new CustomHttpException(LIBRARY_MESSAGES.LIBRARY_NOT_FOUND, 404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND);
        }

        // Soft delete - sadece isDeleted flag'ini true yap
        await this.prisma.libraries.update({
            where: { id },
            data: { isDeleted: true, updatedAt: new Date() }
        });

        return { message: LIBRARY_MESSAGES.LIBRARY_DELETED_SUCCESSFULLY };
    }

    async getUserLibraries(userId: string): Promise<LibraryResponse[]> {
        return await this.prisma.libraries.findMany({
            where: { ownerId: userId, isDeleted: false }
        });
    }

    async createPersonalLibrary(userId: string, data: { name: string, description?: string, institutionId?: string }): Promise<LibraryResponse> {
        return await this.prisma.libraries.create({
            data: {
                ...data,
                ownerId: userId,
                type: LibraryTypes.personal,
                visibility: LibraryVisibility.private
            }
        });
    }
}
