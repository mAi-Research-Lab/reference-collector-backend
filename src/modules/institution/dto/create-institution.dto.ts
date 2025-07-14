import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { SubscriptionPlan } from "generated/prisma";

export class CreateInstitutionDto {
    @ApiProperty({ example: 'Institution Name' })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({ example: 'example.com' })
    @IsNotEmpty()
    @IsString()
    domain: string

    @ApiPropertyOptional({ example : SubscriptionPlan.INSTITUTIONAL })
    @IsOptional()
    @IsEnum(SubscriptionPlan)
    subscriptionPlan?: SubscriptionPlan

    @ApiProperty({ example: 'Turkey' })
    @IsNotEmpty()
    @IsString()
    country: string

    @ApiProperty({ example: 'Ankara' })
    @IsNotEmpty()
    @IsString()
    city: string

    @ApiProperty({ example: 'A. Kemalpaşa Mh.' })
    @IsNotEmpty()
    @IsString()
    address: string

    @ApiProperty({ example: '123' })
    @IsNotEmpty()
    @IsString()
    postalCode: string

    @ApiProperty({ example: 'Ankara' })
    @IsNotEmpty()
    @IsString()
    state: string

}