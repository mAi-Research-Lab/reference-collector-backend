import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Query } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { AnnotationService } from "../services/annotation.service";
import { CreateAnnotationDto } from "../dto/annotations/create-annotation.dto";
import { AnnotationResponse } from "../dto/annotations/annotation.response";
import { UpdateAnnotationDto } from "../dto/annotations/update-annotation.dto";
import { ErrorDto } from "src/common/dto/error.dto";
import { AnnotationsType } from "generated/prisma";

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
    @ApiResponse({
        status: 201,
        description: 'Annotation created successfully',
        type: AnnotationResponse
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid annotation data',
        type: ErrorDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing authentication token',
        type: ErrorDto
    })
    @ApiResponse({
        status: 404,
        description: 'File not found',
        type: ErrorDto
    })
    async createAnnotation(
        @Param('fileId') fileId: string,
        @Body() createAnnotationDto: CreateAnnotationDto
    ): Promise<AnnotationResponse> {
        console.log(createAnnotationDto);

        return await this.annotationService.create(fileId, createAnnotationDto);
    }

    @Post('bulk')
    @ApiOperation({
        summary: 'Create multiple annotations',
        description: 'Create multiple annotations at once for better performance. Useful for importing annotations or batch operations.'
    })
    @ApiBody({
        type: [CreateAnnotationDto],
        description: 'Array of annotation data to create'
    })
    @ApiResponse({
        status: 201,
        description: 'Annotations created successfully',
        type: [AnnotationResponse]
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid annotation data in array',
        type: ErrorDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing authentication token',
        type: ErrorDto
    })
    async bulkCreateAnnotations(
        @Param('fileId') fileId: string,
        @Body() createAnnotationDtos: CreateAnnotationDto[]
    ): Promise<AnnotationResponse[]> {
        return await this.annotationService.bulkCreate(fileId, createAnnotationDtos);
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
    @ApiResponse({
        status: 200,
        description: 'Annotation retrieved successfully',
        type: AnnotationResponse
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing authentication token',
        type: ErrorDto
    })
    @ApiResponse({
        status: 404,
        description: 'Annotation not found',
        type: ErrorDto

    })
    async getAnnotationById(
        @Param('fileId') fileId: string,
        @Param('id') id: string
    ): Promise<AnnotationResponse> {
        return await this.annotationService.getById(fileId, id);
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
    @ApiBody({
        type: UpdateAnnotationDto,
        description: 'Updated annotation data'
    })
    @ApiResponse({
        status: 200,
        description: 'Annotation updated successfully',
        type: AnnotationResponse
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid update data',
        type: ErrorDto

    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing authentication token',
        type: ErrorDto
    })
    @ApiResponse({
        status: 404,
        description: 'Annotation not found',
        type: ErrorDto
    })
    async updateAnnotation(
        @Param('fileId') fileId: string,
        @Param('id') id: string,
        @Body() updateAnnotationDto: UpdateAnnotationDto
    ): Promise<AnnotationResponse> {
        return await this.annotationService.update(fileId, id, updateAnnotationDto);
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
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing authentication token',
        type: ErrorDto
    })
    @ApiResponse({
        status: 404,
        description: 'Annotation not found',
        type: ErrorDto
    })
    async deleteAnnotation(
        @Param('fileId') fileId: string,
        @Param('id') id: string
    ): Promise<{ message: string }> {
        return await this.annotationService.delete(fileId, id);
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
        type: [AnnotationResponse]
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing authentication token',
        type: ErrorDto
    })
    async getAllAnnotations(
        @Param('fileId') fileId?: string,
        @Query('userId') userId?: string,
        @Query('type') type?: string,
        @Query('isShared') isShared?: boolean
    ): Promise<{ data: AnnotationResponse[]; total: number; filters: any }> {
        return await this.annotationService.getAll(fileId, userId, type as AnnotationsType, isShared);
    }
}