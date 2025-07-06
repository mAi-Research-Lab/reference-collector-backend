import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsJSON, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateUserDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    fullName: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    institution: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    fieldOfStudy: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    orcidId: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    subscriptionPlan: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    avatarUrl: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsJSON()
    preferences: {
        [key: string]: any
    }
}