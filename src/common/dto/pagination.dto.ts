import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;
}

export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalCount: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

export function buildPaginatedResult<T>(
    data: T[],
    totalCount: number,
    page: number,
    limit: number,
): PaginatedResult<T> {
    const totalPages = Math.ceil(totalCount / limit) || 1;
    return {
        data,
        pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        },
    };
}
