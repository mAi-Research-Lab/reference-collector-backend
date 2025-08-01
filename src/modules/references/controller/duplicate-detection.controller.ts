import { 
    Body, 
    Controller, 
    Get, 
    Param, 
    Post, 
    UseGuards,
    Delete,
    Query
} from '@nestjs/common';
import { 
    ApiOperation, 
    ApiParam, 
    ApiResponse, 
    ApiSecurity, 
    ApiTags,
    ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { DuplicateDetectionService } from '../services/duplicate-detection.service';
import {
    CheckDuplicateDto,
    DuplicateDetectionResultDto,
    LibraryDuplicatesDto,
    MergeDuplicatesDto,
    MergeResultDto,
    MatchType
} from '../dto/duplicate/duplicate-detection.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { ApiSuccessResponse, ApiErrorResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';

@ApiTags('Reference Duplicate Detection')
@Controller('references/duplicates')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class DuplicateDetectionController {
    constructor(
        private readonly duplicateDetectionService: DuplicateDetectionService
    ) {}

    private getMatchType(similarity: number): MatchType {
        if (similarity >= 0.95) return MatchType.EXACT;
        if (similarity >= 0.8) return MatchType.HIGH;
        if (similarity >= 0.6) return MatchType.MEDIUM;
        return MatchType.LOW;
    }

    @Post('check/:libraryId')
    @ApiOperation({ 
        summary: 'Check for duplicate references',
        description: 'Check if a reference has potential duplicates in the library'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiSuccessResponse(DuplicateDetectionResultDto, 200, 'Duplicate check completed')
    @ApiErrorResponse(400, 'Bad request - Invalid reference data')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async checkDuplicates(
        @Param('libraryId') libraryId: string,
        @Body() checkDuplicateDto: CheckDuplicateDto
    ): Promise<ResponseDto> {
        const result = await this.duplicateDetectionService.detectDuplicates(
            libraryId, 
            checkDuplicateDto
        );

        const response: DuplicateDetectionResultDto = {
            isDuplicate: result.isDuplicate,
            confidence: result.confidence,
            matches: result.matches.map(match => ({
                referenceId: match.reference.id,
                title: match.reference.title,
                similarity: match.similarity,
                matchType: this.getMatchType(match.similarity),
                matchFields: match.matchFields,
                doi: match.reference.doi || undefined,
                isbn: match.reference.isbn || undefined,
                year: match.reference.year || undefined,
                createdAt: match.reference.createdAt.toISOString()
            }))
        };

        return {
            message: result.isDuplicate ? 'Potential duplicates found' : 'No duplicates found',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: response
        };
    }

    @Get('library/:libraryId')
    @ApiOperation({ 
        summary: 'Find all duplicates in library',
        description: 'Scan entire library for duplicate references'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiQuery({ 
        name: 'minSimilarity', 
        required: false, 
        description: 'Minimum similarity threshold (0-1)',
        example: 0.8
    })
    @ApiSuccessResponse(LibraryDuplicatesDto, 200, 'Library duplicates found')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async findLibraryDuplicates(
        @Param('libraryId') libraryId: string,
        @Query('minSimilarity') minSimilarity?: string
    ): Promise<ResponseDto> {
        const threshold = minSimilarity ? parseFloat(minSimilarity) : 0.8;
        const duplicateGroups = await this.duplicateDetectionService.findAllDuplicatesInLibrary(libraryId);

        // Filter by similarity threshold and format response
        const filteredGroups = duplicateGroups
            .map((group, index) => {
                const validMatches = group.filter(match => match.similarity >= threshold);
                if (validMatches.length === 0) return null;

                const averageSimilarity = validMatches.reduce((sum, match) => sum + match.similarity, 0) / validMatches.length;

                return {
                    groupId: `group_${index + 1}`,
                    averageSimilarity,
                    references: validMatches.map(match => ({
                        referenceId: match.reference.id,
                        title: match.reference.title,
                        similarity: match.similarity,
                        matchType: this.getMatchType(match.similarity),
                        matchFields: match.matchFields,
                        doi: match.reference.doi || undefined,
                        isbn: match.reference.isbn || undefined,
                        year: match.reference.year || undefined,
                        createdAt: match.reference.createdAt.toISOString()
                    }))
                };
            })
            .filter(group => group !== null);

        const totalDuplicates = filteredGroups.reduce((sum, group) => sum + group.references.length, 0);

        const response: LibraryDuplicatesDto = {
            duplicateGroups: filteredGroups,
            totalGroups: filteredGroups.length,
            totalDuplicates
        };

        return {
            message: `Found ${filteredGroups.length} duplicate groups with ${totalDuplicates} references`,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: response
        };
    }

    @Post('merge/:libraryId')
    @ApiOperation({ 
        summary: 'Merge duplicate references',
        description: 'Merge multiple duplicate references into a single master reference'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiSuccessResponse(MergeResultDto, 200, 'References merged successfully')
    @ApiErrorResponse(400, 'Bad request - Invalid merge data')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Reference not found')
    async mergeDuplicates(
        @Param('libraryId') libraryId: string,
        @Body() mergeDuplicatesDto: MergeDuplicatesDto
    ): Promise<ResponseDto> {
        // TODO: Implement merge logic in service
        const result = await this.duplicateDetectionService.mergeDuplicateReferences(
            libraryId,
            mergeDuplicatesDto
        );

        return {
            message: 'References merged successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Delete('auto-remove/:libraryId')
    @ApiOperation({ 
        summary: 'Auto-remove exact duplicates',
        description: 'Automatically remove exact duplicate references (similarity > 0.95)'
    })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiQuery({ 
        name: 'dryRun', 
        required: false, 
        description: 'Preview changes without actually deleting',
        example: true
    })
    @ApiSuccessResponse(Object, 200, 'Auto-removal completed')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, 'Library not found')
    async autoRemoveDuplicates(
        @Param('libraryId') libraryId: string,
        @Query('dryRun') dryRun?: string
    ): Promise<ResponseDto> {
        const isDryRun = dryRun === 'true';
        
        // TODO: Implement auto-removal logic in service
        const result = await this.duplicateDetectionService.autoRemoveExactDuplicates(
            libraryId,
            isDryRun
        );

        return {
            message: isDryRun ? 'Dry run completed - no changes made' : 'Auto-removal completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }
}
