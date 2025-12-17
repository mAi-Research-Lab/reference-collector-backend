import { ApiProperty } from '@nestjs/swagger';

export class ReferenceValidationResultItem {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    referenceId: string;

    @ApiProperty({ example: 'Machine Learning in Healthcare: A Comprehensive Review' })
    title: string;

    @ApiProperty({ example: true })
    isValid: boolean;

    @ApiProperty({ example: 85 })
    confidence: number;

    @ApiProperty({ example: false })
    needsReview: boolean;

    @ApiProperty({ example: ['✅ DOI başarıyla doğrulandı'], required: false })
    suggestions?: string[];

    @ApiProperty({ type: 'array', required: false })
    foundSources: any[];
}

export class CollectionValidationResponse {
    @ApiProperty({ example: 10 })
    totalReferences: number;

    @ApiProperty({ example: 7 })
    validReferences: number;

    @ApiProperty({ example: 3 })
    needsReview: number;

    @ApiProperty({ type: [ReferenceValidationResultItem] })
    results: ReferenceValidationResultItem[];
}

