import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { SyncType } from "generated/prisma";
import { InputJsonValue, JsonValue } from "generated/prisma/runtime/library";

export class StartSyncDto {

    @ApiProperty({ example: 'word' })
    @IsString()
    @IsNotEmpty()
    platformType: string

    @ApiProperty({ example: SyncType.manual })
    @IsNotEmpty()
    @IsString()
    syncType: SyncType

    @ApiProperty({ example: { "key": "value" } })
    @IsOptional()
    syncData?: InputJsonValue

    @ApiProperty({ example: { "key": "value" } })
    @IsOptional()
    conflicts?: JsonValue[]

    @ApiProperty({ example:'last-writer-wins' })
    @IsString()
    @IsOptional()
    resolutionStrategy?: string
}