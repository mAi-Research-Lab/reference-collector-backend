import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchPapersDto {
    @ApiProperty({
        example: 'Machine Learning in Healthcare',
        description: 'Search query (paper title or keywords)',
        minLength: 3,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    query: string;

    @ApiPropertyOptional({
        example: 20,
        description: 'Number of results to return (default: 20, max: 100)',
        minimum: 1,
        maximum: 100,
        default: 20,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @ApiPropertyOptional({
        example: 0,
        description: 'Number of results to skip for pagination (default: 0)',
        minimum: 0,
        default: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number;
}

