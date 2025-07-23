import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class ResolveConflictDto {
    @ApiProperty({
        description: 'Unique identifier of the conflict to resolve',
        example: 'conflict_1642781234567'
    })
    @IsString()
    conflictId: string;

    @ApiProperty({
        description: 'How to resolve the conflict',
        enum: ['word', 'web', 'merged', 'custom'],
        example: 'merged'
    })
    @IsString()
    @IsIn(['word', 'web', 'merged', 'custom'])
    resolution: string;

    @ApiProperty({
        description: 'Custom value when resolution is "custom"',
        required: false,
        example: {
            authors: ['Smith, John', 'Doe, A.'],
            title: 'Machine Learning in Healthcare',
            year: 2023
        }
    })
    @IsOptional()
    customValue?: any;

    @ApiProperty({
        description: 'Reason for manual resolution choice',
        required: false,
        example: 'Web version has more complete author information'
    })
    @IsOptional()
    @IsString()
    reason?: string;
}