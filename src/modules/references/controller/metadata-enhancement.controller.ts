import { 
    Body, 
    Controller, 
    Get, 
    Param, 
    Post, 
    UseGuards 
} from '@nestjs/common';
import { 
    ApiOperation, 
    ApiParam, 
    ApiResponse, 
    ApiSecurity, 
    ApiTags 
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { MetadataEnhancementService } from '../services/metadata-enhancement.service';
import { 
    EnhanceReferenceDto,
    BatchEnhanceDto,
    EnhanceByQueryDto,
    AutoEnhanceLibraryDto,
    EnhancementResultDto,
    BatchEnhancementResultDto,
    MetadataSourceDto,
    SourceAvailabilityDto
} from '../dto/metadata/metadata-enhancement.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { ApiSuccessResponse, ApiErrorResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';

@ApiTags('Metadata Enhancement')
@Controller('references/metadata')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class MetadataEnhancementController {
    constructor(
        private readonly metadataService: MetadataEnhancementService
    ) {}

    @Post('enhance')
    @ApiOperation({ 
        summary: 'Enhance reference metadata',
        description: 'Enhance a single reference using external metadata sources'
    })
    @ApiSuccessResponse(EnhancementResultDto, 200, 'Reference enhanced successfully')
    @ApiErrorResponse(400, 'Bad request - Invalid reference ID or options')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Reference not found')
    async enhanceReference(
        @Body() enhanceDto: EnhanceReferenceDto
    ): Promise<ResponseDto> {
        const { referenceId, sources, fields, overwriteExisting, confidenceThreshold } = enhanceDto;
        
        const result = await this.metadataService.enhanceReference(referenceId, {
            sources,
            fields,
            overwriteExisting,
            confidenceThreshold
        });

        return {
            message: 'Reference enhancement completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post('enhance/batch')
    @ApiOperation({ 
        summary: 'Batch enhance references',
        description: 'Enhance multiple references in a single operation'
    })
    @ApiSuccessResponse(BatchEnhancementResultDto, 200, 'Batch enhancement completed')
    @ApiErrorResponse(400, 'Bad request - Invalid reference IDs or options')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async batchEnhance(
        @Body() batchDto: BatchEnhanceDto
    ): Promise<ResponseDto> {
        const { referenceIds, sources, fields, overwriteExisting, confidenceThreshold, autoSave = true } = batchDto;
        
        const results = await this.metadataService.batchEnhance(referenceIds, {
            sources,
            fields,
            overwriteExisting,
            confidenceThreshold
        });

        const successfulEnhancements = results.filter(r => r.success).length;
        const failedEnhancements = results.length - successfulEnhancements;
        const successRate = results.length > 0 ? successfulEnhancements / results.length : 0;

        // Generate summary
        const sourceCounts = new Map<string, number>();
        results.forEach(result => {
            if (result.success) {
                const count = sourceCounts.get(result.source) || 0;
                sourceCounts.set(result.source, count + 1);
            }
        });

        const summary: string[] = [];
        sourceCounts.forEach((count, source) => {
            summary.push(`${count} references enhanced from ${source}`);
        });

        if (failedEnhancements > 0) {
            summary.push(`${failedEnhancements} references could not be enhanced`);
        }

        const batchResult: BatchEnhancementResultDto = {
            totalProcessed: results.length,
            successfulEnhancements,
            failedEnhancements,
            results,
            successRate,
            summary
        };

        return {
            message: 'Batch enhancement completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: batchResult
        };
    }

    @Post('enhance/query')
    @ApiOperation({ 
        summary: 'Enhance by query',
        description: 'Find and enhance metadata based on partial reference information'
    })
    @ApiSuccessResponse(EnhancementResultDto, 200, 'Query enhancement completed')
    @ApiErrorResponse(400, 'Bad request - Insufficient query information')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async enhanceByQuery(
        @Body() queryDto: EnhanceByQueryDto
    ): Promise<ResponseDto> {
        const { title, doi, isbn, authors, sources, confidenceThreshold } = queryDto;
        
        const referenceData = {
            title,
            doi,
            isbn,
            authors
        };

        const result = await this.metadataService.enhanceReferenceData(referenceData, {
            sources,
            confidenceThreshold
        });

        return {
            message: 'Query enhancement completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post('enhance/auto/:referenceId')
    @ApiOperation({ 
        summary: 'Auto-enhance missing fields',
        description: 'Automatically enhance only the missing fields of a reference'
    })
    @ApiParam({ name: 'referenceId', description: 'Reference ID' })
    @ApiSuccessResponse(EnhancementResultDto, 200, 'Auto-enhancement completed')
    @ApiErrorResponse(400, 'Bad request - Invalid reference ID')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Reference not found')
    async autoEnhanceMissingFields(
        @Param('referenceId') referenceId: string
    ): Promise<ResponseDto> {
        const result = await this.metadataService.autoEnhanceMissingFields(referenceId);

        return {
            message: 'Auto-enhancement completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post('enhance/library')
    @ApiOperation({ 
        summary: 'Auto-enhance library',
        description: 'Enhance all references in a library that have missing metadata'
    })
    @ApiSuccessResponse(BatchEnhancementResultDto, 200, 'Library enhancement completed')
    @ApiErrorResponse(400, 'Bad request - Invalid library ID or options')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async autoEnhanceLibrary(
        @Body() libraryDto: AutoEnhanceLibraryDto
    ): Promise<ResponseDto> {
        const { libraryId, fieldsToEnhance, overwriteExisting = false, maxReferences = 100, dryRun = false } = libraryDto;
        
        // TODO: Implement library-wide enhancement
        // For now, return a placeholder response
        const result: BatchEnhancementResultDto = {
            totalProcessed: 0,
            successfulEnhancements: 0,
            failedEnhancements: 0,
            results: [],
            successRate: 0,
            summary: ['Library enhancement not yet implemented']
        };

        return {
            message: dryRun ? 'Library enhancement preview completed' : 'Library enhancement completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Get('sources')
    @ApiOperation({ 
        summary: 'Get available metadata sources',
        description: 'List all available metadata enhancement sources and their status'
    })
    @ApiSuccessResponse([MetadataSourceDto], 200, 'Sources retrieved successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getAvailableSources(): Promise<ResponseDto> {
        const sources = this.metadataService.getAvailableSources();

        return {
            message: 'Available sources retrieved',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: sources
        };
    }

    @Get('sources/test')
    @ApiOperation({ 
        summary: 'Test source availability',
        description: 'Test the availability and response time of all metadata sources'
    })
    @ApiSuccessResponse([SourceAvailabilityDto], 200, 'Source availability tested')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async testSourceAvailability(): Promise<ResponseDto> {
        const sources = this.metadataService.getAvailableSources();
        const results: SourceAvailabilityDto[] = [];

        for (const source of sources) {
            const startTime = Date.now();
            let isAvailable = false;
            let error: string | undefined;

            try {
                isAvailable = await this.metadataService.testSourceAvailability(source.name);
            } catch (err) {
                error = err.message;
            }

            const responseTime = Date.now() - startTime;

            results.push({
                source: source.name,
                isAvailable,
                responseTime,
                error,
                lastChecked: new Date().toISOString()
            });
        }

        return {
            message: 'Source availability tested',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: results
        };
    }

    @Get('health')
    @ApiOperation({ 
        summary: 'Check metadata service health',
        description: 'Check the health status of the metadata enhancement service'
    })
    @ApiResponse({ status: 200, description: 'Service health status' })
    async checkHealth(): Promise<ResponseDto> {
        const sources = this.metadataService.getAvailableSources();
        const availableCount = sources.filter(s => s.isAvailable).length;

        return {
            message: 'Metadata service health check completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                status: availableCount > 0 ? 'healthy' : 'degraded',
                totalSources: sources.length,
                availableSources: availableCount,
                features: {
                    crossRefEnhancement: sources.some(s => s.name === 'crossref' && s.isAvailable),
                    pubMedEnhancement: sources.some(s => s.name === 'pubmed' && s.isAvailable),
                    arXivEnhancement: sources.some(s => s.name === 'arxiv' && s.isAvailable),
                    openLibraryEnhancement: sources.some(s => s.name === 'openlibrary' && s.isAvailable),
                    batchEnhancement: true,
                    autoEnhancement: true
                }
            }
        };
    }
}
