import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { LibraryPermission } from "../enums/permission.enum";

export class AddPermissionDto {
    @ApiProperty({ example: 'read' })
    @IsString()
    @IsNotEmpty()
    @IsEnum(LibraryPermission)
    permission: LibraryPermission;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    value?: boolean | string | number = true;
}

export class MultiplePermissionsDto {
    @ApiProperty({
        example: {
            read: true,
            write: false,
            export: true,
            downloadLimit: 100
        }
    })
    @IsObject()
    permissions: Record<string, boolean | string | number>;
}

export class SetAllPermissionsDto {
    @ApiProperty({
        example: {
            read: true,
            write: true,
            delete: false
        }
    })
    @IsObject()
    permissions: Record<string, boolean | string | number>;
}