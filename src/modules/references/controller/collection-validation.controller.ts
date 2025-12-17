import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { CollectionValidationService } from '../services/collection-validation.service';
import { CollectionValidationResponse } from '../dto/collection-validation/collection-validation.response';
import { ResponseDto } from 'src/common/dto/response.dto';
import { ApiSuccessResponse, ApiErrorResponse } from 'src/common/decorators/api-response-wrapper.decorator';

@Controller('collections/:collectionId/validate')
@ApiTags('Collection Validation')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class CollectionValidationController {
    constructor(private readonly collectionValidationService: CollectionValidationService) {}

    @Get()
    @ApiOperation({ summary: 'Validate all references in a collection' })
    @ApiParam({ name: 'collectionId', description: 'Collection ID' })
    @ApiSuccessResponse(CollectionValidationResponse, 200, 'Collection references validated successfully')
    @ApiErrorResponse(404, 'Collection not found')
    async validateCollection(@Param('collectionId') collectionId: string): Promise<ResponseDto<CollectionValidationResponse>> {
        const result = await this.collectionValidationService.validateCollectionReferences(collectionId);

        return {
            message: 'Collection references validated successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result,
        };
    }
}

