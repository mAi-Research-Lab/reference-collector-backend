import { ApiProperty } from "@nestjs/swagger";

export class CollectionItemsResponse {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    collectionId: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    referenceId: string;

    @ApiProperty({ example: 1 })
    sortOrder: number | null;

    @ApiProperty({ })
    createdAt: Date;
}