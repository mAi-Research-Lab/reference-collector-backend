import { ApiProperty } from "@nestjs/swagger"

interface OPS {
    retain?: number,
    attributes?: Record<string, any>,
    insert?: string
    delete?: number
}

export class ContentDeltaDto {
    @ApiProperty({
        example: [
            {
                retain: 1,
                attributes: {
                    bold: true
                },
            },
            {
                insert: 'Hello World',
                attributes: {
                    bold: true
                },
            }
        ]
    })
    ops: OPS[]

    @ApiProperty({
        example: '2022-01-01T00:00:00.000Z'
    })
    timestamp: Date

    @ApiProperty({
        example: 1
    })
    version: number

    @ApiProperty({
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d'
    })
    userId: string
}