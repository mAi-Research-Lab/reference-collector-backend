import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CreateAnnotationDto } from "../dto/annotations/create-annotation.dto";
import { AnnotationResponse } from "../dto/annotations/annotation.response";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { ANNOTATION_MESSAGES } from "../constants/annotation.messages";
import { UpdateAnnotationDto } from "../dto/annotations/update-annotation.dto";
import { AnnotationsType } from "generated/prisma";

@Injectable()
export class AnnotationService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    private async validateAnnotationOwnership(fileId: string, id: string): Promise<AnnotationResponse> {
        const annotation = await this.prisma.annotations.findUnique({
            where: { id }
        });

        if (!annotation) {
            throw new CustomHttpException(
                ANNOTATION_MESSAGES.ANNOTATION_NOT_FOUND,
                404,
                'ANNOTATION_NOT_FOUND'
            );
        }

        if (annotation.fileId !== fileId) {
            throw new CustomHttpException(
                'Annotation does not belong to this file',
                403,
                'FORBIDDEN'
            );
        }

        return annotation;
    }

    async create(fileId: string, userId:string, data: CreateAnnotationDto): Promise<AnnotationResponse> {
        const annotation = await this.prisma.annotations.create({
            data: {
                ...data,
                fileId,
                userId,
                positionData: data.positionData || {}
            }
        });

        return annotation;
    }

    async getAll(
        fileId?: string,
        userId?: string,
        type?: AnnotationsType,
        isShared?: boolean
    ): Promise<{
        data: AnnotationResponse[];
        total: number;
        filters: any;
    }> {
        const whereClause = {
            ...(fileId && { fileId }),
            ...(userId && { userId }),
            ...(type && { type }),
            ...(typeof isShared === 'boolean' && { isShared })
        };

        const annotations = await this.prisma.annotations.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        return {
            data: annotations,
            total: annotations.length,
            filters: whereClause
        };
    }

    async getById(fileId: string, id: string): Promise<AnnotationResponse> {
        return await this.validateAnnotationOwnership(fileId, id);
    }

    async update(fileId: string, id: string, data: UpdateAnnotationDto): Promise<AnnotationResponse> {
        await this.validateAnnotationOwnership(fileId, id);

        return await this.prisma.annotations.update({
            where: { id },
            data
        });
    }

    async delete(fileId: string, id: string): Promise<{ message: string }> {
        await this.validateAnnotationOwnership(fileId, id);

        await this.prisma.annotations.delete({ where: { id } });

        return { message: ANNOTATION_MESSAGES.ANNOTATION_DELETED_SUCCESSFULLY };
    }

    async getByFileId(fileId: string): Promise<AnnotationResponse[]> {
        return await this.prisma.annotations.findMany({ where: { fileId } });
    }

    async bulkCreate(fileId: string, userId: string, data: CreateAnnotationDto[]): Promise<AnnotationResponse[]> {
        const result = await this.prisma.annotations.createMany({
            data: data.map(item => ({
                ...item,
                fileId,
                userId,
                positionData: item.positionData || {}
            }))
        });

        const createdAnnotations = await this.prisma.annotations.findMany({
            take: result.count,
            orderBy: { createdAt: 'desc' }
        });

        return createdAnnotations;
    }
}