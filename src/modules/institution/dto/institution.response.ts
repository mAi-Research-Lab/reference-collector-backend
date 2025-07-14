import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { SubscriptionPlan } from "generated/prisma"

export class InstitutionResponse {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string

    @ApiProperty({ example: 'Institution Name' })
    name: string

    @ApiProperty({ example: 'example.com' })
    domain: string

    @ApiPropertyOptional({ example: SubscriptionPlan.INSTITUTIONAL })
    subscriptionPlan?: SubscriptionPlan | null

    @ApiPropertyOptional({ example: true })
    subscriptionStatus?: string

    @ApiPropertyOptional({ example: true })
    isActive?: boolean | null

    @ApiProperty({ example: 'Turkey' })
    country: string

    @ApiProperty({ example: 'Ankara' })
    city: string

    @ApiProperty({ example: 'A. Kemalpaşa Mh.' })
    address: string

    @ApiProperty({ example: '123' })
    postalCode: string

    @ApiProperty({ example: 'Ankara' })
    state: string

}