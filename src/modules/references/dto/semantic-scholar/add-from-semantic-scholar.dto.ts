import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsObject, IsOptional } from 'class-validator';

export class AddFromSemanticScholarDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    libraryId: string;

    @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsOptional()
    @IsString()
    @IsUUID()
    collectionId?: string;

    @ApiProperty({ example: '649def34f133a59a09d6f3d7', description: 'Semantic Scholar paper ID' })
    @IsString()
    @IsNotEmpty()
    paperId: string;

    @ApiProperty({ description: 'Complete paper data from Semantic Scholar' })
    @IsObject()
    @IsNotEmpty()
    paperData: any;

    @ApiPropertyOptional({ 
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d',
        description: 'User ID who adds the reference (automatically set from authentication token)'
    })
    @IsOptional()
    @IsString()
    @IsUUID()
    addedBy?: string;
}

