import { Controller, Get, Post, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guard/role.guard';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { ApiSuccessResponse, ApiErrorResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { ReportGenerationService, ZoteroReportOptions } from '../services/report-generation.service';

class GenerateReportDto {
    referenceIds?: string[];
    options?: ZoteroReportOptions;
}

@ApiTags('Report Generation')
@Controller('references/reports')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class ReportGenerationController {
    constructor(private readonly reportGenerationService: ReportGenerationService) {}

    @Get('library/:libraryId')
    @ApiOperation({ 
        summary: 'Generate Zotero-like report from library',
        description: 'Generates a detailed report of all references in a library, similar to Zotero reports'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiQuery({ name: 'includeAbstract', required: false, type: Boolean, description: 'Include abstracts in report' })
    @ApiQuery({ name: 'includeTags', required: false, type: Boolean, description: 'Include tags in report' })
    @ApiQuery({ name: 'includeAttachments', required: false, type: Boolean, description: 'Include attachments in report' })
    @ApiQuery({ name: 'includeNotes', required: false, type: Boolean, description: 'Include notes in report' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['dateAdded', 'dateModified', 'title', 'author'], description: 'Sort criteria' })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
    @ApiQuery({ name: 'format', required: false, enum: ['json', 'html', 'text'], description: 'Output format' })
    @ApiSuccessResponse(ResponseDto, 200, 'Library report generated successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async generateLibraryReport(
        @Param('libraryId') libraryId: string,
        @Query('includeAbstract') includeAbstract?: boolean,
        @Query('includeTags') includeTags?: boolean,
        @Query('includeAttachments') includeAttachments?: boolean,
        @Query('includeNotes') includeNotes?: boolean,
        @Query('sortBy') sortBy?: 'dateAdded' | 'dateModified' | 'title' | 'author',
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('format') format?: 'json' | 'html' | 'text',
        @Res() res?: Response
    ): Promise<ResponseDto | void> {
        const options: ZoteroReportOptions = {
            includeAbstract: includeAbstract ?? true,
            includeTags: includeTags ?? true,
            includeAttachments: includeAttachments ?? true,
            includeNotes: includeNotes ?? false,
            sortBy: sortBy ?? 'dateAdded',
            sortOrder: sortOrder ?? 'desc',
            format: format ?? 'json'
        };

        const report = await this.reportGenerationService.generateLibraryReport(libraryId, options);

        if (format === 'html' && res) {
            const htmlReport = this.reportGenerationService.generateHtmlReport(report, 'Library Report');
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', 'attachment; filename="library-report.html"');
            res.send(htmlReport);
            return;
        }

        return {
            message: 'Library report generated successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: report
        };
    }

    @Get('collection/:collectionId')
    @ApiOperation({ 
        summary: 'Generate Zotero-like report from collection',
        description: 'Generates a detailed report of all references in a collection, similar to Zotero reports'
    })
    @ApiParam({ name: 'collectionId', description: 'Collection ID' })
    @ApiQuery({ name: 'includeAbstract', required: false, type: Boolean, description: 'Include abstracts in report' })
    @ApiQuery({ name: 'includeTags', required: false, type: Boolean, description: 'Include tags in report' })
    @ApiQuery({ name: 'includeAttachments', required: false, type: Boolean, description: 'Include attachments in report' })
    @ApiQuery({ name: 'includeNotes', required: false, type: Boolean, description: 'Include notes in report' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['dateAdded', 'dateModified', 'title', 'author'], description: 'Sort criteria' })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
    @ApiQuery({ name: 'format', required: false, enum: ['json', 'html', 'text'], description: 'Output format' })
    @ApiSuccessResponse(ResponseDto, 200, 'Collection report generated successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Collection not found')
    async generateCollectionReport(
        @Param('collectionId') collectionId: string,
        @Query('includeAbstract') includeAbstract?: boolean,
        @Query('includeTags') includeTags?: boolean,
        @Query('includeAttachments') includeAttachments?: boolean,
        @Query('includeNotes') includeNotes?: boolean,
        @Query('sortBy') sortBy?: 'dateAdded' | 'dateModified' | 'title' | 'author',
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
        @Query('format') format?: 'json' | 'html' | 'text',
        @Res() res?: Response
    ): Promise<ResponseDto | void> {
        const options: ZoteroReportOptions = {
            includeAbstract: includeAbstract ?? true,
            includeTags: includeTags ?? true,
            includeAttachments: includeAttachments ?? true,
            includeNotes: includeNotes ?? false,
            sortBy: sortBy ?? 'dateAdded',
            sortOrder: sortOrder ?? 'desc',
            format: format ?? 'json'
        };

        const report = await this.reportGenerationService.generateCollectionReport(collectionId, options);

        if (format === 'html' && res) {
            const htmlReport = this.reportGenerationService.generateHtmlReport(report, 'Collection Report');
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', 'attachment; filename="collection-report.html"');
            res.send(htmlReport);
            return;
        }

        return {
            message: 'Collection report generated successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: report
        };
    }

    @Post('references')
    @ApiOperation({ 
        summary: 'Generate Zotero-like report from specific references',
        description: 'Generates a detailed report for specific references, similar to Zotero reports'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                referenceIds: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['ref-id-1', 'ref-id-2']
                },
                options: {
                    type: 'object',
                    properties: {
                        includeAbstract: { type: 'boolean' },
                        includeTags: { type: 'boolean' },
                        includeAttachments: { type: 'boolean' },
                        includeNotes: { type: 'boolean' },
                        sortBy: { type: 'string', enum: ['dateAdded', 'dateModified', 'title', 'author'] },
                        sortOrder: { type: 'string', enum: ['asc', 'desc'] },
                        format: { type: 'string', enum: ['json', 'html', 'text'] }
                    }
                }
            },
            required: ['referenceIds']
        }
    })
    @ApiSuccessResponse(ResponseDto, 200, 'References report generated successfully')
    @ApiErrorResponse(400, 'Invalid reference IDs')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async generateReferencesReport(
        @Body() generateReportDto: GenerateReportDto,
        @Res() res?: Response
    ): Promise<ResponseDto | void> {
        const options: ZoteroReportOptions = {
            includeAbstract: generateReportDto.options?.includeAbstract ?? true,
            includeTags: generateReportDto.options?.includeTags ?? true,
            includeAttachments: generateReportDto.options?.includeAttachments ?? true,
            includeNotes: generateReportDto.options?.includeNotes ?? false,
            sortBy: generateReportDto.options?.sortBy ?? 'dateAdded',
            sortOrder: generateReportDto.options?.sortOrder ?? 'desc',
            format: generateReportDto.options?.format ?? 'json'
        };

        const report = await this.reportGenerationService.generateReferencesReport(
            generateReportDto.referenceIds!, 
            options
        );

        if (options.format === 'html' && res) {
            const htmlReport = this.reportGenerationService.generateHtmlReport(report, 'References Report');
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', 'attachment; filename="references-report.html"');
            res.send(htmlReport);
            return;
        }

        return {
            message: 'References report generated successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: report
        };
    }

    @Get('library/:libraryId/html')
    @ApiOperation({ 
        summary: 'Generate and download HTML report from library',
        description: 'Generates a Zotero-like HTML report and downloads it as a file'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiResponse({ 
        status: 200, 
        description: 'HTML report downloaded successfully',
        type: 'string'
    })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async downloadLibraryHtmlReport(
        @Param('libraryId') libraryId: string,
        @Res() res: Response
    ): Promise<void> {
        const options: ZoteroReportOptions = {
            includeAbstract: true,
            includeTags: true,
            includeAttachments: true,
            includeNotes: false,
            sortBy: 'dateAdded',
            sortOrder: 'desc',
            format: 'html'
        };

        const report = await this.reportGenerationService.generateLibraryReport(libraryId, options);
        const htmlReport = this.reportGenerationService.generateHtmlReport(report, 'Library Report');
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', 'attachment; filename="library-report.html"');
        res.send(htmlReport);
    }

    @Get('collection/:collectionId/html')
    @ApiOperation({ 
        summary: 'Generate and download HTML report from collection',
        description: 'Generates a Zotero-like HTML report and downloads it as a file'
    })
    @ApiParam({ name: 'collectionId', description: 'Collection ID' })
    @ApiResponse({ 
        status: 200, 
        description: 'HTML report downloaded successfully',
        type: 'string'
    })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Collection not found')
    async downloadCollectionHtmlReport(
        @Param('collectionId') collectionId: string,
        @Res() res: Response
    ): Promise<void> {
        const options: ZoteroReportOptions = {
            includeAbstract: true,
            includeTags: true,
            includeAttachments: true,
            includeNotes: false,
            sortBy: 'dateAdded',
            sortOrder: 'desc',
            format: 'html'
        };

        const report = await this.reportGenerationService.generateCollectionReport(collectionId, options);
        const htmlReport = this.reportGenerationService.generateHtmlReport(report, 'Collection Report');
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', 'attachment; filename="collection-report.html"');
        res.send(htmlReport);
    }
}
