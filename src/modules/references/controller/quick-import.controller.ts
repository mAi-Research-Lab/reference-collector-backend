import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import {
    QuickImportDto,
    QuickImportResultDto,
    BatchQuickImportDto,
    BatchQuickImportResultDto,
    IdentifierValidationDto,
    SearchImportDto,
    IdentifierType
} from "../dto/quick-import/quick-import.dto";
import { ApiSuccessResponse, ApiErrorResponse } from "src/common/decorators/api-response-wrapper.decorator";
import { ResponseDto } from "src/common/dto/api-response.dto";
import { COMMON_MESSAGES } from "src/common/constants/common.messages";
import { QuickImportService } from "../services/external/quick-import.service";
import { User } from "src/modules/user/decorators/user.decorator";

@Controller('quick-import')
@ApiTags('Quick Import')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class QuickImportController {
    constructor(
        private readonly quickImportService: QuickImportService
    ) { }

    @Post(':libraryId/import')
    @ApiOperation({
        summary: 'Quick import a single reference by identifier',
        description: 'Import a reference using DOI, ISBN, PMID, arXiv ID, ADS Bibcode, or URL'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID to import the reference into' })
    @ApiSuccessResponse(QuickImportResultDto, 201, "Reference imported successfully")
    @ApiErrorResponse(400, "Bad request - Invalid identifier or import data")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Library not found or identifier not found in external sources")
    @ApiErrorResponse(409, "Duplicate reference found (when checkDuplicates=true and overwriteIfDuplicate=false)")
    async quickImport(
        @Param('libraryId') libraryId: string,
        @Body() quickImportDto: QuickImportDto,
        @User('id') userId: string
    ): Promise<ResponseDto> {
        const result = await this.quickImportService.quickImport(libraryId, quickImportDto, userId);

        return {
            message: result.success ? "Reference imported successfully" : "Import failed",
            statusCode: result.success ? 201 : 400,
            success: result.success,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post(':libraryId/batch-import')
    @ApiOperation({
        summary: 'Batch import multiple references',
        description: 'Import multiple references at once using various identifier types'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID to import the references into' })
    @ApiSuccessResponse(BatchQuickImportResultDto, 201, "Batch import completed")
    @ApiErrorResponse(400, "Bad request - Invalid batch import data")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Library not found")
    async batchQuickImport(
        @Param('libraryId') libraryId: string,
        @Body() batchDto: BatchQuickImportDto,
        @User('id') userId: string
    ): Promise<ResponseDto> {
        const result = await this.quickImportService.batchQuickImport(libraryId, batchDto, userId);

        return {
            message: "Batch import completed",
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post(':libraryId/validate-preview')
    @ApiOperation({
        summary: 'Validate identifier and preview metadata',
        description: 'Validate an identifier and preview the metadata that would be imported without actually importing'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID for context' })
    @ApiSuccessResponse(QuickImportResultDto, 200, "Identifier validated and metadata preview retrieved")
    @ApiErrorResponse(400, "Bad request - Invalid identifier")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Library not found or identifier not found in external sources")
    async validateAndPreview(
        @Param('libraryId') libraryId: string,
        @Body() quickImportDto: QuickImportDto
    ): Promise<ResponseDto> {
        const result = await this.quickImportService.validateAndPreview(libraryId, quickImportDto);

        return {
            message: result.success ? "Identifier validated and metadata preview retrieved" : "Validation failed",
            statusCode: result.success ? 200 : 400,
            success: result.success,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post(':libraryId/search-import')
    @ApiOperation({
        summary: 'Search and import by title/author',
        description: 'Search for references by title, author, and other metadata, then import the best match'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID to import the reference into' })
    @ApiSuccessResponse(QuickImportResultDto, 201, "Reference found and imported successfully")
    @ApiErrorResponse(400, "Bad request - Invalid search data")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Library not found or no suitable match found")
    async searchAndImport(
        @Param('libraryId') libraryId: string,
        @Body() searchData: SearchImportDto,
        @User('id') userId: string
    ): Promise<ResponseDto> {
        const result = await this.quickImportService.searchAndImport(
            libraryId,
            {
                title: searchData.title,
                author: searchData.author,
                year: searchData.year,
                journal: searchData.journal,
                confirmImport: searchData.autoImport
            },
            userId
        );

        return {
            message: result.success ? "Reference found and imported successfully" : "Search failed or no suitable match found",
            statusCode: result.success ? 201 : 404,
            success: result.success,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Get('validate-identifier')
    @ApiOperation({
        summary: 'Validate identifier format',
        description: 'Check if an identifier is valid and detect its type without fetching metadata'
    })
    @ApiQuery({ name: 'identifier', description: 'Identifier to validate', required: true })
    @ApiQuery({
        name: 'type',
        description: 'Expected identifier type (optional, will auto-detect if not provided)',
        required: false,
        enum: IdentifierType
    })
    @ApiResponse({
        status: 200,
        description: 'Identifier validation result',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                statusCode: { type: 'number' },
                success: { type: 'boolean' },
                timestamp: { type: 'string' },
                data: { $ref: getSchemaPath(IdentifierValidationDto) }
            }
        }
    })
    @ApiErrorResponse(400, "Bad request - Missing identifier")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async validateIdentifier(
        @Query('identifier') identifier: string,
        @Query('type') type?: IdentifierType
    ): Promise<ResponseDto> {
        if (!identifier) {
            return {
                message: "Identifier is required",
                statusCode: 400,
                success: false,
                timestamp: new Date().toISOString(),
                data: null
            };
        }

        // Since the service doesn't have a dedicated validation method, 
        // we'll use the validateAndPreview method with a dummy library ID
        const dummyLibraryId = '00000000-0000-0000-0000-000000000000';
        const result = await this.quickImportService.validateAndPreview(dummyLibraryId, {
            identifier,
            identifierType: type
        });

        const validationResult: IdentifierValidationDto = {
            isValid: result.success,
            detectedType: result.identifierType,
            normalizedIdentifier: result.identifier,
            recommendedSource: result.source !== 'none' && result.source !== 'error' ? result.source : undefined,
            error: result.error,
            metadataPreview: result.reference
        };

        return {
            message: "Identifier validation completed",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: validationResult
        };
    }

    @Get('supported-sources')
    @ApiOperation({
        summary: 'Get supported identifier types and sources',
        description: 'Returns information about supported identifier types and their corresponding data sources'
    })
    @ApiResponse({
        status: 200,
        description: 'Supported sources information',
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
                        supportedTypes: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string' },
                                    description: { type: 'string' },
                                    sources: { type: 'array', items: { type: 'string' } },
                                    examples: { type: 'array', items: { type: 'string' } }
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    getSupportedSources(): ResponseDto {
        const supportedTypes = [
            {
                type: IdentifierType.DOI,
                description: 'Digital Object Identifier',
                sources: ['CrossRef'],
                examples: ['10.1038/s41591-023-02394-0', '10.1126/science.abc1234']
            },
            {
                type: IdentifierType.ISBN,
                description: 'International Standard Book Number',
                sources: ['Open Library'],
                examples: ['978-0123456789', '0-123-45678-9']
            },
            {
                type: IdentifierType.PMID,
                description: 'PubMed Identifier',
                sources: ['PubMed'],
                examples: ['12345678', '23456789']
            },
            {
                type: IdentifierType.ARXIV,
                description: 'arXiv Identifier',
                sources: ['arXiv'],
                examples: ['2301.12345', 'math-ph/0112345v2']
            },
            {
                type: IdentifierType.ADS_BIBCODE,
                description: 'Astrophysics Data System Bibcode',
                sources: ['ADS (Not implemented)'],
                examples: ['2023Sci...379..123S', '1995ApJ...442..726M']
            },
            {
                type: IdentifierType.URL,
                description: 'Web URL for metadata extraction',
                sources: ['Web scraping'],
                examples: ['https://example.com/paper.html', 'https://journal.com/article/123']
            }
        ];

        return {
            message: "Supported sources retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                supportedTypes
            }
        };
    }

    // @Get(':libraryId/import-history')
    // @ApiOperation({
    //     summary: 'Get quick import history for a library',
    //     description: 'Retrieve the history of quick imports for a specific library'
    // })
    // @ApiParam({ name: 'libraryId', description: 'Library ID' })
    // @ApiQuery({ name: 'page', description: 'Page number', required: false })
    // @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
    // @ApiQuery({ name: 'source', description: 'Filter by import source', required: false })
    // @ApiQuery({ name: 'dateFrom', description: 'Filter from date (ISO string)', required: false })
    // @ApiQuery({ name: 'dateTo', description: 'Filter to date (ISO string)', required: false })
    // @ApiResponse({
    //     status: 200,
    //     description: 'Import history retrieved successfully',
    //     schema: {
    //         type: 'object',
    //         properties: {
    //             message: { type: 'string' },
    //             statusCode: { type: 'number' },
    //             success: { type: 'boolean' },
    //             timestamp: { type: 'string' },
    //             data: {
    //                 type: 'object',
    //                 properties: {
    //                     imports: {
    //                         type: 'array',
    //                         items: {
    //                             type: 'object',
    //                             properties: {
    //                                 referenceId: { type: 'string' },
    //                                 identifier: { type: 'string' },
    //                                 identifierType: { type: 'string' },
    //                                 source: { type: 'string' },
    //                                 importDate: { type: 'string' },
    //                                 userId: { type: 'string' },
    //                                 success: { type: 'boolean' }
    //                             }
    //                         }
    //                     },
    //                     total: { type: 'number' },
    //                     page: { type: 'number' },
    //                     totalPages: { type: 'number' },
    //                     statistics: {
    //                         type: 'object',
    //                         properties: {
    //                             totalImports: { type: 'number' },
    //                             successfulImports: { type: 'number' },
    //                             failedImports: { type: 'number' },
    //                             sourceBreakdown: { type: 'object' }
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // })
    // @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    // @ApiErrorResponse(404, "Library not found")
    // async getImportHistory(
    //     @Param('libraryId') libraryId: string,
    //     @Query('page') page?: number,
    //     @Query('limit') limit?: number,
    //     @Query('source') source?: string,
    //     @Query('dateFrom') dateFrom?: string,
    //     @Query('dateTo') dateTo?: string
    // ): Promise<ResponseDto> {
    //     // Note: This would require implementing a method in the service to track import history
    //     // For now, we'll return a placeholder response
    //     const mockHistory = {
    //         imports: [],
    //         total: 0,
    //         page: page || 1,
    //         totalPages: 0,
    //         statistics: {
    //             totalImports: 0,
    //             successfulImports: 0,
    //             failedImports: 0,
    //             sourceBreakdown: {}
    //         }
    //     };

    //     return {
    //         message: "Import history retrieved successfully",
    //         statusCode: 200,
    //         success: true,
    //         timestamp: new Date().toISOString(),
    //         data: mockHistory
    //     };
    // }
}