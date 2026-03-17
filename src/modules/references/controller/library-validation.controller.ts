import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { CollectionValidationService } from '../services/collection-validation.service';
import { CollectionValidationResponse } from '../dto/collection-validation/collection-validation.response';
import { ResponseDto } from 'src/common/dto/response.dto';
import { ApiErrorResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';

@Controller('libraries/:libraryId/validate')
@ApiTags('Library Validation')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class LibraryValidationController {
    constructor(private readonly collectionValidationService: CollectionValidationService) {}

    @Get()
    @ApiOperation({ summary: 'Validate all references in a library' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiSuccessResponse(CollectionValidationResponse, 200, 'Library references validated successfully')
    @ApiErrorResponse(404, 'Library not found')
    async validateLibrary(@Param('libraryId') libraryId: string): Promise<ResponseDto<CollectionValidationResponse>> {
        const result = await this.collectionValidationService.validateLibraryReferences(libraryId);

        return {
            message: 'Library references validated successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result,
        };
    }
}

