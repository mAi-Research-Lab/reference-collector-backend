import { Controller, Get, Post, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guard/role.guard';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { ApiSuccessResponse, ApiErrorResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { BibliographyCreationService, BibliographyOptions } from '../services/bibliography-creation.service';

class CreateBibliographyDto {
    referenceIds?: string[];
    options: BibliographyOptions;
}

@ApiTags('Bibliography Creation')
@Controller('references/bibliography')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class BibliographyCreationController {
    constructor(private readonly bibliographyCreationService: BibliographyCreationService) {}

    @Get('library/:libraryId')
    @ApiOperation({ 
        summary: 'Create bibliography from library',
        description: 'Creates a bibliography from all references in a library using the specified citation style'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                citationStyle: { 
                    type: 'string', 
                    enum: ['apa', 'apa-7th', 'chicago', 'chicago-manual', 'mla', 'mla-8th', 'harvard', 'ieee', 'vancouver'],
                    example: 'apa-7th'
                },
                language: { type: 'string', example: 'en-US' },
                displayCitationsAs: { type: 'string', enum: ['footnotes', 'endnotes'], example: 'footnotes' },
                outputMode: { type: 'string', enum: ['notes', 'bibliography'], example: 'bibliography' },
                outputMethod: { type: 'string', enum: ['rtf', 'html', 'clipboard', 'print'], example: 'rtf' },
                includeAbstract: { type: 'boolean', example: false },
                includeKeywords: { type: 'boolean', example: false },
                sortBy: { type: 'string', enum: ['author', 'title', 'date', 'custom'], example: 'author' },
                sortOrder: { type: 'string', enum: ['asc', 'desc'], example: 'asc' }
            },
            required: ['citationStyle']
        }
    })
    @ApiSuccessResponse(ResponseDto, 200, 'Bibliography created successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async createBibliographyFromLibrary(
        @Param('libraryId') libraryId: string,
        @Body() options: BibliographyOptions,
        @Res() res?: Response
    ): Promise<ResponseDto | void> {
        const result = await this.bibliographyCreationService.createBibliographyFromLibrary(libraryId, options);

        if (options.outputMethod === 'html' && res) {
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
            return;
        }

        if (options.outputMethod === 'rtf' && res) {
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
            return;
        }

        return {
            message: 'Bibliography created successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Get('collection/:collectionId')
    @ApiOperation({ 
        summary: 'Create bibliography from collection',
        description: 'Creates a bibliography from all references in a collection using the specified citation style'
    })
    @ApiParam({ name: 'collectionId', description: 'Collection ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                citationStyle: { 
                    type: 'string', 
                    enum: ['apa', 'apa-7th', 'chicago', 'chicago-manual', 'mla', 'mla-8th', 'harvard', 'ieee', 'vancouver'],
                    example: 'apa-7th'
                },
                language: { type: 'string', example: 'en-US' },
                displayCitationsAs: { type: 'string', enum: ['footnotes', 'endnotes'], example: 'footnotes' },
                outputMode: { type: 'string', enum: ['notes', 'bibliography'], example: 'bibliography' },
                outputMethod: { type: 'string', enum: ['rtf', 'html', 'clipboard', 'print'], example: 'rtf' },
                includeAbstract: { type: 'boolean', example: false },
                includeKeywords: { type: 'boolean', example: false },
                sortBy: { type: 'string', enum: ['author', 'title', 'date', 'custom'], example: 'author' },
                sortOrder: { type: 'string', enum: ['asc', 'desc'], example: 'asc' }
            },
            required: ['citationStyle']
        }
    })
    @ApiSuccessResponse(ResponseDto, 200, 'Bibliography created successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Collection not found')
    async createBibliographyFromCollection(
        @Param('collectionId') collectionId: string,
        @Body() options: BibliographyOptions,
        @Res() res?: Response
    ): Promise<ResponseDto | void> {
        const result = await this.bibliographyCreationService.createBibliographyFromCollection(collectionId, options);

        if (options.outputMethod === 'html' && res) {
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
            return;
        }

        if (options.outputMethod === 'rtf' && res) {
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
            return;
        }

        return {
            message: 'Bibliography created successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post('references')
    @ApiOperation({ 
        summary: 'Create bibliography from specific references',
        description: 'Creates a bibliography from specific references using the specified citation style'
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
                        citationStyle: { 
                            type: 'string', 
                            enum: ['apa', 'apa-7th', 'chicago', 'chicago-manual', 'mla', 'mla-8th', 'harvard', 'ieee', 'vancouver'],
                            example: 'apa-7th'
                        },
                        language: { type: 'string', example: 'en-US' },
                        displayCitationsAs: { type: 'string', enum: ['footnotes', 'endnotes'], example: 'footnotes' },
                        outputMode: { type: 'string', enum: ['notes', 'bibliography'], example: 'bibliography' },
                        outputMethod: { type: 'string', enum: ['rtf', 'html', 'clipboard', 'print'], example: 'rtf' },
                        includeAbstract: { type: 'boolean', example: false },
                        includeKeywords: { type: 'boolean', example: false },
                        sortBy: { type: 'string', enum: ['author', 'title', 'date', 'custom'], example: 'author' },
                        sortOrder: { type: 'string', enum: ['asc', 'desc'], example: 'asc' }
                    },
                    required: ['citationStyle']
                }
            },
            required: ['referenceIds', 'options']
        }
    })
    @ApiSuccessResponse(ResponseDto, 200, 'Bibliography created successfully')
    @ApiErrorResponse(400, 'Invalid reference IDs or options')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async createBibliographyFromReferences(
        @Body() createBibliographyDto: CreateBibliographyDto,
        @Res() res?: Response
    ): Promise<ResponseDto | void> {
        const result = await this.bibliographyCreationService.createBibliographyFromReferences(
            createBibliographyDto.referenceIds!, 
            createBibliographyDto.options
        );

        if (createBibliographyDto.options.outputMethod === 'html' && res) {
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
            return;
        }

        if (createBibliographyDto.options.outputMethod === 'rtf' && res) {
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.content);
            return;
        }

        return {
            message: 'Bibliography created successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Get('library/:libraryId/download/:format')
    @ApiOperation({ 
        summary: 'Download bibliography from library',
        description: 'Creates and downloads a bibliography from library in the specified format'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'format', description: 'Output format', enum: ['rtf', 'html'] })
    @ApiQuery({ name: 'style', required: true, description: 'Citation style', enum: ['apa', 'apa-7th', 'chicago', 'chicago-manual', 'mla', 'mla-8th', 'harvard', 'ieee', 'vancouver'] })
    @ApiResponse({ 
        status: 200, 
        description: 'Bibliography downloaded successfully',
        type: 'string'
    })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async downloadLibraryBibliography(
        @Param('libraryId') libraryId: string,
        @Param('format') format: 'rtf' | 'html',
        @Query('style') style: string,
        @Res() res: Response
    ): Promise<void> {
        const options: BibliographyOptions = {
            citationStyle: style,
            outputMethod: format,
            sortBy: 'author',
            sortOrder: 'asc'
        };

        const result = await this.bibliographyCreationService.createBibliographyFromLibrary(libraryId, options);
        
        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    }

    @Get('collection/:collectionId/download/:format')
    @ApiOperation({ 
        summary: 'Download bibliography from collection',
        description: 'Creates and downloads a bibliography from collection in the specified format'
    })
    @ApiParam({ name: 'collectionId', description: 'Collection ID' })
    @ApiParam({ name: 'format', description: 'Output format', enum: ['rtf', 'html'] })
    @ApiQuery({ name: 'style', required: true, description: 'Citation style', enum: ['apa', 'apa-7th', 'chicago', 'chicago-manual', 'mla', 'mla-8th', 'harvard', 'ieee', 'vancouver'] })
    @ApiResponse({ 
        status: 200, 
        description: 'Bibliography downloaded successfully',
        type: 'string'
    })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Collection not found')
    async downloadCollectionBibliography(
        @Param('collectionId') collectionId: string,
        @Param('format') format: 'rtf' | 'html',
        @Query('style') style: string,
        @Res() res: Response
    ): Promise<void> {
        const options: BibliographyOptions = {
            citationStyle: style,
            outputMethod: format,
            sortBy: 'author',
            sortOrder: 'asc'
        };

        const result = await this.bibliographyCreationService.createBibliographyFromCollection(collectionId, options);
        
        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.content);
    }

    @Get('styles')
    @ApiOperation({ 
        summary: 'Get available citation styles',
        description: 'Returns a list of available citation styles for bibliography creation'
    })
    @ApiSuccessResponse(ResponseDto, 200, 'Citation styles retrieved successfully')
    getCitationStyles(): ResponseDto {
        const styles = [
            { id: 'apa-7th', name: 'American Psychological Association (APA) 7th edition', description: 'APA style for psychology and social sciences' },
            { id: 'chicago-manual', name: 'Chicago Manual of Style 18th edition', description: 'Chicago style for humanities and social sciences' },
            { id: 'mla-8th', name: 'Modern Language Association (MLA) 8th edition', description: 'MLA style for literature and humanities' },
            { id: 'harvard', name: 'Harvard', description: 'Harvard referencing style' },
            { id: 'ieee', name: 'IEEE', description: 'Institute of Electrical and Electronics Engineers style' },
            { id: 'vancouver', name: 'Vancouver', description: 'Vancouver style for medical and scientific publications' }
        ];

        return {
            message: 'Citation styles retrieved successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: styles
        };
    }
}
