import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsObject, IsOptional } from 'class-validator';

export class AddFromOpenAlexDto {
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

    @ApiProperty({ example: 'W2741809807', description: 'OpenAlex work ID' })
    @IsString()
    @IsNotEmpty()
    workId: string;

    @ApiProperty({ description: 'Complete work data from OpenAlex' })
    @IsObject()
    @IsNotEmpty()
    workData: any;

    @ApiPropertyOptional({
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d',
        description: 'User ID who adds the reference (automatically set from authentication token)',
    })
    @IsOptional()
    @IsString()
    @IsUUID()
    addedBy?: string;
}
