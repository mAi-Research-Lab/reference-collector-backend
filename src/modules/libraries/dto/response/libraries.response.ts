import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LibraryTypes, LibraryVisibility } from "generated/prisma";

export class LibraryResponse {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string;

    @ApiProperty({ example: 'Library Name' })
    name: string;

    @ApiProperty()
    description?: string | null;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    ownerId: string | null; 

    @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    institutionId?: string | null

    @ApiProperty({ example: 'Library Type' })
    type: LibraryTypes

    @ApiProperty({ example: 'Library visibility' })
    visibility: LibraryVisibility

    @ApiProperty({ example: 500000 })
    storageUsed?: bigint | null

    @ApiProperty({ example: 500000 })
    maxStorage?: bigint | null

    @ApiProperty({ example: 500000 })
    itemCount?: number

    @ApiProperty({ example: false })
    isDeleted?: boolean

    @ApiProperty()
    createdAt: Date

    @ApiProperty()
    updatedAt: Date
}