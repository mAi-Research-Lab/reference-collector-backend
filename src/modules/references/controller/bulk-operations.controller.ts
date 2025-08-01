import { 
    Body, 
    Controller, 
    Delete, 
    Param, 
    Post, 
    Put,
    UseGuards,
    Res
} from '@nestjs/common';
import { 
    ApiOperation, 
    ApiParam, 
    ApiResponse, 
    ApiSecurity, 
    ApiTags 
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { BulkOperationsService } from '../services/bulk-operations.service';
import { 
    BulkDeleteDto,
    BulkMoveDto,
    BulkTagDto,
    BulkExportDto,
    BulkOperationResultDto
} from '../dto/bulk/bulk-operations.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { ApiSuccessResponse, ApiErrorResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';

@ApiTags('Reference Bulk Operations')
@Controller('references/bulk')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class BulkOperationsController {
    constructor(
        private readonly bulkOperationsService: BulkOperationsService
    ) {}

    @Delete(':libraryId')
    @ApiOperation({ 
        summary: 'Bulk delete references',
        description: 'Delete multiple references at once (soft delete by default)'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiSuccessResponse(BulkOperationResultDto, 200, 'Bulk delete completed')
    @ApiErrorResponse(400, 'Bad request - Invalid reference IDs')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async bulkDelete(
        @Param('libraryId') libraryId: string,
        @Body() bulkDeleteDto: BulkDeleteDto
    ): Promise<ResponseDto> {
        const result = await this.bulkOperationsService.bulkDelete(libraryId, bulkDeleteDto);

        return {
            message: result.message,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Put('move/:libraryId')
    @ApiOperation({ 
        summary: 'Bulk move references',
        description: 'Move multiple references to another library'
    })
    @ApiParam({ name: 'libraryId', description: 'Source library ID' })
    @ApiSuccessResponse(BulkOperationResultDto, 200, 'Bulk move completed')
    @ApiErrorResponse(400, 'Bad request - Invalid reference IDs or target library')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async bulkMove(
        @Param('libraryId') libraryId: string,
        @Body() bulkMoveDto: BulkMoveDto
    ): Promise<ResponseDto> {
        const result = await this.bulkOperationsService.bulkMove(libraryId, bulkMoveDto);

        return {
            message: result.message,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Put('tags/:libraryId')
    @ApiOperation({ 
        summary: 'Bulk tag operations',
        description: 'Add, remove, or replace tags for multiple references'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiSuccessResponse(BulkOperationResultDto, 200, 'Bulk tag operation completed')
    @ApiErrorResponse(400, 'Bad request - Invalid reference IDs or tags')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async bulkTag(
        @Param('libraryId') libraryId: string,
        @Body() bulkTagDto: BulkTagDto
    ): Promise<ResponseDto> {
        const result = await this.bulkOperationsService.bulkTag(libraryId, bulkTagDto);

        return {
            message: result.message,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post('export/:libraryId')
    @ApiOperation({ 
        summary: 'Bulk export references',
        description: 'Export multiple references in various formats (BibTeX, RIS, JSON, CSV)'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiSuccessResponse(BulkOperationResultDto, 200, 'Bulk export completed')
    @ApiErrorResponse(400, 'Bad request - Invalid reference IDs or export format')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async bulkExport(
        @Param('libraryId') libraryId: string,
        @Body() bulkExportDto: BulkExportDto
    ): Promise<ResponseDto> {
        const result = await this.bulkOperationsService.bulkExport(libraryId, bulkExportDto);

        return {
            message: result.message,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post('export/:libraryId/download')
    @ApiOperation({ 
        summary: 'Download bulk export',
        description: 'Export and directly download multiple references'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiResponse({ status: 200, description: 'File download started' })
    @ApiErrorResponse(400, 'Bad request - Invalid reference IDs or export format')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async bulkExportDownload(
        @Param('libraryId') libraryId: string,
        @Body() bulkExportDto: BulkExportDto,
        @Res() res: Response
    ): Promise<void> {
        const result = await this.bulkOperationsService.bulkExport(libraryId, bulkExportDto);
        
        if (!result.additionalData?.exportPath) {
            throw new Error('Export file not generated');
        }

        // Set appropriate headers for file download
        const { filename, mimeType } = result.additionalData;
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // In a real implementation, you would stream the file from storage
        // For now, we'll send a placeholder response
        res.status(200).send('Export file content would be here');
    }

    @Put('collection/:libraryId')
    @ApiOperation({ 
        summary: 'Bulk update collection membership',
        description: 'Add or remove multiple references from collections'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiSuccessResponse(BulkOperationResultDto, 200, 'Bulk collection update completed')
    @ApiErrorResponse(400, 'Bad request - Invalid reference IDs or collection ID')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library or collection not found')
    async bulkUpdateCollection(
        @Param('libraryId') libraryId: string,
        @Body() updateDto: {
            referenceIds: string[];
            collectionId: string;
            action: 'add' | 'remove';
        }
    ): Promise<ResponseDto> {
        // TODO: Implement bulk collection update in service
        const { referenceIds, collectionId, action } = updateDto;
        
        // Placeholder implementation
        const result: BulkOperationResultDto = {
            operation: `${action}_to_collection`,
            processedCount: referenceIds.length,
            successCount: referenceIds.length,
            failureCount: 0,
            successfulIds: referenceIds,
            failures: [],
            message: `Bulk collection ${action} completed. ${referenceIds.length} references updated.`
        };

        return {
            message: result.message,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }
}
