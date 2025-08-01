import { 
    Body, 
    Controller, 
    Post, 
    UseGuards,
    Get,
    Param
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
import { ReferenceValidationService } from '../services/reference-validation.service';
import { 
    ValidateReferenceDto,
    ValidateFieldDto,
    BatchValidationDto,
    ComprehensiveValidationResultDto,
    ValidationResultDto,
    BatchValidationResultDto
} from '../dto/validation/reference-validation.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { ApiSuccessResponse, ApiErrorResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';

@ApiTags('Reference Validation')
@Controller('references/validation')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class ReferenceValidationController {
    constructor(
        private readonly validationService: ReferenceValidationService
    ) {}

    @Post('reference')
    @ApiOperation({ 
        summary: 'Validate a complete reference',
        description: 'Perform comprehensive validation on all fields of a reference'
    })
    @ApiSuccessResponse(ComprehensiveValidationResultDto, 200, 'Reference validation completed')
    @ApiErrorResponse(400, 'Bad request - Invalid reference data')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async validateReference(
        @Body() validateReferenceDto: ValidateReferenceDto
    ): Promise<ResponseDto> {
        const result = await this.validationService.validateReference(validateReferenceDto);

        return {
            message: 'Reference validation completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post('field')
    @ApiOperation({ 
        summary: 'Validate a specific field',
        description: 'Validate a single field value (DOI, ISBN, URL, etc.)'
    })
    @ApiSuccessResponse(ValidationResultDto, 200, 'Field validation completed')
    @ApiErrorResponse(400, 'Bad request - Invalid field type or value')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async validateField(
        @Body() validateFieldDto: ValidateFieldDto
    ): Promise<ResponseDto> {
        const { fieldType, value } = validateFieldDto;
        let result: ValidationResultDto;

        switch (fieldType) {
            case 'doi':
                result = await this.validationService.validateDOI(value);
                break;
            case 'isbn':
                result = this.validationService.validateISBN(value);
                break;
            case 'issn':
                result = this.validationService.validateISSN(value);
                break;
            case 'url':
                result = await this.validationService.validateURL(value);
                break;
            case 'year':
                result = this.validationService.validateYear(parseInt(value));
                break;
            case 'title':
                result = this.validationService.validateTitle(value);
                break;
            case 'authors':
                try {
                    const authors = JSON.parse(value);
                    result = this.validationService.validateAuthors(authors);
                } catch (error) {
                    result = {
                        isValid: false,
                        field: 'authors',
                        value,
                        error: 'Invalid JSON format for authors'
                    };
                }
                break;
            default:
                throw new Error(`Unsupported field type: ${fieldType}`);
        }

        return {
            message: 'Field validation completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post('batch')
    @ApiOperation({ 
        summary: 'Validate multiple references',
        description: 'Perform batch validation on multiple references'
    })
    @ApiSuccessResponse(BatchValidationResultDto, 200, 'Batch validation completed')
    @ApiErrorResponse(400, 'Bad request - Invalid references data')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async validateBatch(
        @Body() batchValidationDto: BatchValidationDto
    ): Promise<ResponseDto> {
        const { references, fieldsToValidate, stopOnError = false } = batchValidationDto;
        const results: ComprehensiveValidationResultDto[] = [];
        let validCount = 0;
        let invalidCount = 0;

        for (const reference of references) {
            try {
                const result = await this.validationService.validateReference(reference);
                
                // Filter results if specific fields requested
                if (fieldsToValidate && fieldsToValidate.length > 0) {
                    result.results = result.results.filter(r => 
                        fieldsToValidate.includes(r.field)
                    );
                    // Recalculate validation status and score
                    result.isValid = result.results.every(r => r.isValid);
                    result.score = result.results.length > 0 ? 
                        Math.round((result.results.filter(r => r.isValid).length / result.results.length) * 100) : 0;
                }

                results.push(result);
                
                if (result.isValid) {
                    validCount++;
                } else {
                    invalidCount++;
                    if (stopOnError) {
                        break;
                    }
                }
            } catch (error) {
                invalidCount++;
                results.push({
                    isValid: false,
                    results: [],
                    score: 0,
                    warnings: [error.message],
                    suggestions: []
                });
                
                if (stopOnError) {
                    break;
                }
            }
        }

        // Calculate overall score
        const overallScore = results.length > 0 ? 
            Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0;

        // Generate summary
        const summary: string[] = [];
        const errorCounts = new Map<string, number>();
        
        results.forEach(result => {
            result.warnings.forEach(warning => {
                const count = errorCounts.get(warning) || 0;
                errorCounts.set(warning, count + 1);
            });
        });

        errorCounts.forEach((count, error) => {
            summary.push(`${count} references: ${error}`);
        });

        const batchResult: BatchValidationResultDto = {
            totalReferences: references.length,
            validReferences: validCount,
            invalidReferences: invalidCount,
            results,
            overallScore,
            summary
        };

        return {
            message: 'Batch validation completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: batchResult
        };
    }

    @Post('doi/:doi')
    @ApiOperation({ 
        summary: 'Validate DOI and fetch metadata',
        description: 'Validate a DOI and return metadata from CrossRef if available'
    })
    @ApiParam({ name: 'doi', description: 'DOI to validate (URL encoded)' })
    @ApiSuccessResponse(ValidationResultDto, 200, 'DOI validation completed')
    @ApiErrorResponse(400, 'Bad request - Invalid DOI')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async validateDOI(
        @Param('doi') doi: string
    ): Promise<ResponseDto> {
        const decodedDoi = decodeURIComponent(doi);
        const result = await this.validationService.validateDOI(decodedDoi);

        return {
            message: 'DOI validation completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Post('isbn/:isbn')
    @ApiOperation({ 
        summary: 'Validate ISBN',
        description: 'Validate an ISBN-10 or ISBN-13 with checksum verification'
    })
    @ApiParam({ name: 'isbn', description: 'ISBN to validate' })
    @ApiSuccessResponse(ValidationResultDto, 200, 'ISBN validation completed')
    @ApiErrorResponse(400, 'Bad request - Invalid ISBN')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async validateISBN(
        @Param('isbn') isbn: string
    ): Promise<ResponseDto> {
        const result = this.validationService.validateISBN(isbn);

        return {
            message: 'ISBN validation completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Get('health')
    @ApiOperation({ 
        summary: 'Check validation service health',
        description: 'Check if external validation APIs are accessible'
    })
    @ApiResponse({ status: 200, description: 'Service health status' })
    async checkHealth(): Promise<ResponseDto> {
        // Test CrossRef API
        let crossRefStatus = 'unknown';
        try {
            const testResult = await this.validationService.validateDOI('10.1000/test');
            crossRefStatus = 'accessible';
        } catch (error) {
            crossRefStatus = 'error';
        }

        return {
            message: 'Validation service health check completed',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                status: 'healthy',
                externalServices: {
                    crossRef: crossRefStatus
                },
                features: {
                    doiValidation: true,
                    isbnValidation: true,
                    issnValidation: true,
                    urlValidation: true,
                    metadataFetching: crossRefStatus === 'accessible'
                }
            }
        };
    }
}
