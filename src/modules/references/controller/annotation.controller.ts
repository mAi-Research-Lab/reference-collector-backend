import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { AnnotationService } from "../services/annotation.service";
import { CreateAnnotationDto } from "../dto/annotations/create-annotation.dto";
import { AnnotationResponse } from "../dto/annotations/annotation.response";
import { UpdateAnnotationDto } from "../dto/annotations/update-annotation.dto";
import { AnnotationsType } from "generated/prisma";
import { ApiSuccessArrayResponse, ApiSuccessResponse, ApiErrorResponse } from "src/common/decorators/api-response-wrapper.decorator";
import { ResponseDto } from "src/common/dto/api-response.dto";
import { COMMON_MESSAGES } from "src/common/constants/common.messages";
import { User } from "src/modules/user/decorators/user.decorator";

@Controller('references/files/:fileId/annotations')
@ApiTags('References Files Annotations')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class AnnotationController {
    constructor(
        private readonly annotationService: AnnotationService
    ) { }

    @Post()
    @ApiOperation({
        summary: 'Create new annotation',
        description: 'Create a new annotation for a specific file. Supports highlights, notes, drawings, and other annotation types.'
    })
    @ApiParam({
        name: 'fileId',
        type: 'string',
    })
    @ApiSuccessResponse(AnnotationResponse, 201, "Annotation created successfully")
    @ApiErrorResponse(400, "Bad request - Invalid annotation data")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "File not found")
    async createAnnotation(
        @Param('fileId') fileId: string,
        @User() user: any,
        @Body() createAnnotationDto: CreateAnnotationDto
    ): Promise<ResponseDto> {
        console.log(createAnnotationDto);

        const annotation = await this.annotationService.create(fileId, user.id,createAnnotationDto);

        return {
            message: "Annotation created successfully",
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: annotation
        };
    }

    @Post('bulk')
    @ApiOperation({
        summary: 'Create multiple annotations',
        description: 'Create multiple annotations at once for better performance. Useful for importing annotations or batch operations.'
    })
    @ApiParam({
        name: 'fileId',
        type: 'string',
        description: 'File ID'
    })
    @ApiSuccessArrayResponse(AnnotationResponse, 201, "Annotations created successfully")
    @ApiErrorResponse(400, "Bad request - Invalid annotation data in array")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "File not found")
    async bulkCreateAnnotations(
        @Param('fileId') fileId: string,
        @User() user: any,
        @Body() createAnnotationDtos: CreateAnnotationDto[]
    ): Promise<ResponseDto> {
        const annotations = await this.annotationService.bulkCreate(fileId, user.id, createAnnotationDtos);

        return {
            message: "Annotations created successfully",
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: annotations
        };
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get annotation by ID',
        description: 'Retrieve a specific annotation by its unique identifier. Returns detailed annotation information including position data.'
    })
    @ApiParam({
        name: 'fileId',
        type: 'string',
        description: 'File ID'
    })
    @ApiParam({
        name: 'id',
        description: 'Annotation ID',
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d'
    })
    @ApiSuccessResponse(AnnotationResponse, 200, "Annotation retrieved successfully")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Annotation not found")
    async getAnnotationById(
        @Param('fileId') fileId: string,
        @Param('id') id: string
    ): Promise<ResponseDto> {
        const annotation = await this.annotationService.getById(fileId, id);

        return {
            message: "Annotation retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: annotation
        };
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update annotation',
        description: 'Update an existing annotation. You can modify content, position, color, tags, and other annotation properties.'
    })
    @ApiParam({
        name: 'fileId',
        type: 'string',
        description: 'File ID'
    })
    @ApiParam({
        name: 'id',
        description: 'Annotation ID to update',
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d'
    })
    @ApiSuccessResponse(AnnotationResponse, 200, "Annotation updated successfully")
    @ApiErrorResponse(400, "Bad request - Invalid update data")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Annotation not found")
    async updateAnnotation(
        @Param('fileId') fileId: string,
        @Param('id') id: string,
        @Body() updateAnnotationDto: UpdateAnnotationDto
    ): Promise<ResponseDto> {
        const annotation = await this.annotationService.update(fileId, id, updateAnnotationDto);

        return {
            message: "Annotation updated successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: annotation
        };
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete annotation',
        description: 'Permanently delete an annotation. This action cannot be undone.'
    })
    @ApiParam({
        name: 'fileId',
        description: 'File ID to delete',
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d'
    })
    @ApiParam({
        name: 'id',
        description: 'Annotation ID to delete',
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d'
    })
    @ApiResponse({
        status: 200,
        description: 'Annotation deleted successfully',
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    example: 'Annotation deleted successfully'
                }
            }
        }
    })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Annotation not found")
    async deleteAnnotation(
        @Param('fileId') fileId: string,
        @Param('id') id: string
    ): Promise<ResponseDto> {
        const result = await this.annotationService.delete(fileId, id);

        return {
            message: result.message,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: null
        };
    }

    @Get()
    @ApiOperation({
        summary: 'Get all annotations with optional filtering',
        description: 'Retrieve annotations with optional filtering by file ID, user ID, type, or other criteria.'
    })
    @ApiParam({
        name: 'fileId',
        required: false,
        description: 'Filter by file ID - If only this is used, all annotations on the file will come directly.',
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d'
    })
    @ApiQuery({
        name: 'userId',
        required: false,
        description: 'Filter by user ID',
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d'
    })
    @ApiQuery({
        name: 'type',
        required: false,
        description: 'Filter by annotation type',
        enum: ['highlight', 'note', 'drawing', 'strikethrough', 'underline', 'text', 'ink']
    })
    @ApiQuery({
        name: 'isShared',
        required: false,
        description: 'Filter by shared status',
        type: 'boolean'
    })
    @ApiResponse({
        status: 200,
        description: 'Annotations retrieved successfully',
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
                            items: { $ref: '#/components/schemas/AnnotationResponse' }
                        },
                        total: { type: 'number' },
                        filters: { type: 'object' }
                    }
                }
            }
        }
    })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "File not found")
    async getAllAnnotations(
        @Param('fileId') fileId?: string,
        @Query('userId') userId?: string,
        @Query('type') type?: string,
        @Query('isShared') isShared?: boolean
    ): Promise<ResponseDto> {
        const result = await this.annotationService.getAll(fileId, userId, type as AnnotationsType, isShared);

        return {
            message: "Annotations retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }
}