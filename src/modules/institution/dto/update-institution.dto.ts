import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { SubscriptionPlan, SubscriptionStatus } from "generated/prisma";

export class UpdateInstitutionDto {
    @ApiProperty({ example: 'Institution Name' })
    @IsString()
    @IsNotEmpty()
    name?: string

    @ApiPropertyOptional({ example: SubscriptionPlan.INSTITUTIONAL })
    @IsOptional()
    @IsEnum(SubscriptionPlan)
    subscriptionPlan?: SubscriptionPlan

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    subscriptionStatus?: SubscriptionStatus

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    isActive?: boolean

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