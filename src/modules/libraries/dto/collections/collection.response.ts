import { ApiProperty } from "@nestjs/swagger";

export class CollectionResponse {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    libraryId: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    parentId: string | null;

    @ApiProperty({ example: 'Collection Name' })
    name: string;

    @ApiProperty({ example: 'Collection Description' })
    description: string | null;

    @ApiProperty({ example: 'Collection Color' })
    color: string | null;

    @ApiProperty({ example: 1 })
    sortOrder: number | null;

    @ApiProperty({ example: false })
    isDeleted: boolean;

    @ApiProperty({ })
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}