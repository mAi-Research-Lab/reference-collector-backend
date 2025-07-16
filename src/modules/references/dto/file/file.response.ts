import { ApiProperty } from "@nestjs/swagger"
import { IsEnum } from "class-validator"
import { StorageProvider } from "generated/prisma"

export class FileResponse {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    referenceId: string

    @ApiProperty({ example: 'file.pdf' })
    filename: string

    @ApiProperty({ example: 'file.pdf' })
    originalFilename: string

    @ApiProperty({ example: 'file.pdf' })
    fileType: string

    @ApiProperty({ example: 'file.pdf' })
    fileSize: bigint

    @ApiProperty({ example: 'application/pdf' })
    mimetype?: string | null

    @ApiProperty({ example: 'file.pdf' })
    storagePath: string

    @ApiProperty({ example: StorageProvider.local })
    @IsEnum(StorageProvider)
    storageProvider: string

    @ApiProperty({ example: 1 })
    version: number | null

    @ApiProperty({ example: 'checksum' })
    checksum: string | null

    @ApiProperty({ example: 1 })
    downloadCount: number

    @ApiProperty({ example: true })
    isPrimary: boolean

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    uploadedBy: string

    @ApiProperty({ example: new Date() })
    createdAt: Date

    @ApiProperty({ example: new Date() })
    updatedAt: Date
}