import { Body, Controller, Get, Header, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ExportService } from './export.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiProduces, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReferencesService } from '../references/references.service';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { Response } from 'express';
import { ExportPreviewResponseDto, ExportStatisticsResponseDto, ExportValidationResponseDto, MultipleExportDto, MultipleExportResponseDto, ReferenceIdsDto, SingleExportDto, SupportedCitationStylesResponseDto, SupportedFormatsResponseDto } from './dto/export.dto';
import { ApiErrorResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { ExportResult } from './enums/export-option.enum';
import { ExportFormat } from './enums/export-format.enum';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('export')
export class ExportController {
    constructor(
        private readonly exportService: ExportService,
        private readonly referencesService: ReferencesService,
    ) { }

    @Post('references')
    @ApiOperation({ summary: 'Export references' })
    @ApiSuccessResponse(ExportResult, 200, 'References exported successfully')
    @ApiErrorResponse(400, 'İnvalid request')
    @ApiErrorResponse(500, 'Export failed')
    async exportReferences(
        @Body() exportDto: SingleExportDto,
        @Res() res: Response
    ) {
        try {
            const references = await this.referencesService.getReferencesByIds(
                exportDto.referenceIds,
            );

            if (!references.length) {
                throw new CustomHttpException('No references found', 404, 'NO_REFERENCES_FOUND');
            }

            const result = this.exportService.exportReferences(
                references,
                exportDto.format,
                exportDto.options as any || {},
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                message: 'References exported successfully',
                data: result
            });

        } catch (error) {
            console.log(error);

            throw new CustomHttpException(`Export failed: ${error.message}`, 500, 'EXPORT_FAILED');
        }
    }

    @Post('references/download')
    @ApiOperation({
        summary: 'Export and download references as file',
        description: 'Exports references and directly downloads the file in specified format'
    })
    @ApiProduces('application/octet-stream')
    @Header('Content-Type', 'application/octet-stream')
    @ApiErrorResponse(400, 'Invalid request')
    @ApiErrorResponse(500, 'Export failed')
    async downloadExportedReferences(
        @Body() exportDto: SingleExportDto,
        @Res() res: Response
    ): Promise<void> {
        try {
            const references = await this.referencesService.getReferencesByIds(
                exportDto.referenceIds,
            );

            if (!references.length) {
                throw new CustomHttpException('No references found', 404, 'NO_REFERENCES_FOUND');
            }

            const result = this.exportService.exportReferences(
                references,
                exportDto.format,
                exportDto.options as any || {},
            );

            // Set appropriate headers for file download
            const encodedFilename = encodeURIComponent(result.filename);
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
            res.setHeader('Content-Length', result.size.toString());
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

            // Send file content
            if (result.isBase64) {
                const buffer = Buffer.from(result.content, 'base64');
                res.send(buffer);
            } else {
                res.send(result.content);
            }

        } catch (error) {
            console.log(error);
            res.status(500).json({
                success: false,
                message: `Export download failed: ${error.message}`,
                error: 'EXPORT_DOWNLOAD_FAILED'
            });
        }
    }

    @Get('library/:libraryId/download/:format')
    @ApiOperation({
        summary: 'Export and download entire library',
        description: 'Export all references in a library and download as file in specified format'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'format', description: 'Export format (bibtex, ris, rtf, html, csv)', enum: ExportFormat })
    @ApiQuery({ name: 'includeDeleted', description: 'Include deleted references', required: false, type: Boolean })
    @ApiQuery({ name: 'filename', description: 'Custom filename', required: false, type: String })
    @ApiProduces('application/octet-stream')
    @Header('Content-Type', 'application/octet-stream')
    @ApiErrorResponse(400, 'Invalid request')
    @ApiErrorResponse(500, 'Export failed')
    async downloadLibrary(
        @Param('libraryId') libraryId: string,
        @Param('format') format: ExportFormat,
        @Res() res: Response,
        @Query('includeDeleted') includeDeleted?: boolean,
        @Query('filename') filename?: string,
    ): Promise<void> {
        try {
            const references = await this.referencesService.getReferencesByLibrary(libraryId);

            if (!references.length) {
                throw new CustomHttpException('No references found in library', 404, 'NO_REFERENCES_FOUND');
            }

            const filteredReferences = includeDeleted
                ? references
                : references.filter(ref => !ref.isDeleted);

            if (!filteredReferences.length) {
                throw new CustomHttpException('No active references found in library', 404, 'NO_ACTIVE_REFERENCES_FOUND');
            }

            const result = this.exportService.exportReferences(
                filteredReferences,
                format,
                { filename: filename || `library_${libraryId}` }
            );

            const encodedFilename = encodeURIComponent(result.filename);
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
            res.setHeader('Content-Length', result.size.toString());
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

            if (result.isBase64) {
                const buffer = Buffer.from(result.content, 'base64');
                res.send(buffer);
            } else {
                res.send(result.content);
            }

        } catch (error) {
            console.log(error);
            res.status(500).json({
                success: false,
                message: `Library export download failed: ${error.message}`,
                error: 'LIBRARY_EXPORT_DOWNLOAD_FAILED'
            });
        }
    }

    @Get('collection/:collectionId/download/:format')
    @ApiOperation({
        summary: 'Export and download entire collection',
        description: 'Export all references in a collection and download as file in specified format'
    })
    @ApiParam({ name: 'collectionId', description: 'Collection ID' })
    @ApiParam({ name: 'format', description: 'Export format (bibtex, ris, rtf, html,csv)', enum: ExportFormat })
    @ApiQuery({ name: 'includeDeleted', description: 'Include deleted references', required: false, type: Boolean })
    @ApiQuery({ name: 'filename', description: 'Custom filename', required: false, type: String })
    @ApiProduces('application/octet-stream')
    @Header('Content-Type', 'application/octet-stream')
    @ApiErrorResponse(400, 'Invalid request')
    @ApiErrorResponse(500, 'Export failed')
    async downloadCollection(
        @Param('collectionId') collectionId: string,
        @Param('format') format: ExportFormat,
        @Res() res: Response,
        @Query('includeDeleted') includeDeleted?: boolean,
        @Query('filename') filename?: string,
    ): Promise<void> {
        try {
            const references = await this.referencesService.getReferencesByCollection(collectionId);

            if (!references.length) {
                throw new CustomHttpException('No references found in collection', 404, 'NO_REFERENCES_FOUND');
            }

            const filteredReferences = includeDeleted
                ? references
                : references.filter(ref => !ref.isDeleted);

            if (!filteredReferences.length) {
                throw new CustomHttpException('No active references found in collection', 404, 'NO_ACTIVE_REFERENCES_FOUND');
            }

            const result = this.exportService.exportReferences(
                filteredReferences,
                format,
                { filename: filename || `collection_${collectionId}` }
            )

            const encodedFilename = encodeURIComponent(result.filename);
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
            res.setHeader('Content-Length', result.size.toString());
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

            if (result.isBase64) {
                const buffer = Buffer.from(result.content, 'base64');
                res.send(buffer);
            } else {
                res.send(result.content);
            }
        } catch (error) {
            console.log(error);
            res.status(500).json({
                success: false,
                message: `Library export download failed: ${error.message}`,
                error: 'LIBRARY_EXPORT_DOWNLOAD_FAILED'
            });
        }
    }

    @Post('references/multiple')
    @ApiOperation({
        summary: 'Export references in multiple formats',
        description: 'Export the same references in multiple formats simultaneously'
    })
    @ApiSuccessResponse(MultipleExportResponseDto, 200, 'References exported successfully')
    @ApiErrorResponse(400, 'Invalid request')
    async exportMultipleFormats(
        @Body() exportDto: MultipleExportDto,
    ) {
        try {
            const references = await this.referencesService.getReferencesByIds(
                exportDto.referenceIds
            );

            if (!references.length) {
                throw new CustomHttpException('No references found', 404, 'NO_REFERENCES_FOUND');
            }

            const results = await this.exportService.exportMultipleFormats(
                references,
                exportDto.formats,
                exportDto.options as any || {}
            );

            const statistics = {
                totalFormats: exportDto.formats.length,
                successfulExports: results.length,
                failedExports: exportDto.formats.length - results.length,
                totalReferences: references.length
            };

            return {
                success: true,
                message: 'Multiple format export completed',
                data: { results, statistics }
            };

        } catch (error) {
            throw new CustomHttpException(`Export failed: ${error.message}`, 500, 'EXPORT_FAILED');
        }
    }

    @Post('preview')
    @ApiOperation({
        summary: 'Generate export preview',
        description: 'Generate a preview of the first few references in the selected format'
    })
    @ApiSuccessResponse(ExportPreviewResponseDto, 200, 'Preview generated successfully')
    async generatePreview(
        @Body() exportDto: SingleExportDto
    ) {
        try {
            const references = await this.referencesService.getReferencesByIds(
                exportDto.referenceIds
            );

            if (!references.length) {
                throw new CustomHttpException('No references found', 404, 'NO_REFERENCES_FOUND');
            }

            const preview = await this.exportService.generatePreview(
                references,
                exportDto.format,
                exportDto.options as any || {}
            );

            return {
                success: true,
                message: 'Export preview generated',
                data: preview
            };

        } catch (error) {
            throw new CustomHttpException(`Preview generation failed: ${error.message}`, 500, 'PREVIEW_GENERATION_FAILED');
        }
    }

    @Post('validate')
    @ApiOperation({
        summary: 'Validate export data',
        description: 'Validate references before export and return warnings/errors'
    })
    @ApiSuccessResponse(ExportValidationResponseDto, 200, 'Validation completed')
    async validateExportData(
        @Body() body: ReferenceIdsDto,
    ) {
        try {
            const references = await this.referencesService.getReferencesByIds(
                body.referenceIds
            );

            if (!references.length) {
                throw new CustomHttpException('No references found', 404, 'NO_REFERENCES_FOUND');
            }

            const validation = this.exportService.validateExportData(references);

            return {
                success: true,
                message: 'Validation completed',
                data: validation
            };

        } catch (error) {
            throw new CustomHttpException(`Validation failed: ${error.message}`, 500, 'VALIDATION_FAILED');
        }
    }

    @Post('statistics')
    @ApiOperation({
        summary: 'Get export statistics',
        description: 'Get statistics about the references to be exported'
    })
    @ApiSuccessResponse(ExportStatisticsResponseDto, 200, 'Statistics retrieved')

    async getExportStatistics(
        @Body() body: ReferenceIdsDto
    ) {
        try {
            const references = await this.referencesService.getReferencesByIds(
                body.referenceIds
            );

            if (!references.length) {
                throw new CustomHttpException('No references found', 404, 'NO_REFERENCES_FOUND');
            }

            const statistics = this.exportService.getExportStatistics(references);

            return {
                success: true,
                message: 'Statistics retrieved',
                data: statistics
            };

        } catch (error) {
            throw new CustomHttpException(`Statistics retrieval failed: ${error.message}`, 500, 'STATISTICS_RETRIEVAL_FAILED');
        }
    }

    @Get('formats')
    @ApiOperation({
        summary: 'Get supported export formats',
        description: 'List all supported export formats with descriptions'
    })
    @ApiSuccessResponse(SupportedFormatsResponseDto, 200, 'Supported formats retrieved')
    getSupportedFormats() {
        const formats = this.exportService.getSupportedFormats();

        return {
            success: true,
            message: 'Supported formats retrieved',
            data: formats
        };
    }

    @Get('citation-styles')
    @ApiOperation({
        summary: 'Get supported citation styles',
        description: 'List all supported citation styles'
    })
    @ApiSuccessResponse(SupportedCitationStylesResponseDto, 200, 'Citation styles retrieved')
    getSupportedCitationStyles() {
        const styles = this.exportService.getSupportedCitationStyles();

        return {
            success: true,
            message: 'Citation styles retrieved',
            data: styles
        };
    }
}
