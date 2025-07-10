import { ApiProperty } from "@nestjs/swagger";

export class PermissionResponse {
    @ApiProperty()
    userId: string;

    @ApiProperty()
    libraryId: string;

    @ApiProperty()
    role: string;

    @ApiProperty()
    permissions: Record<string, any>;
}

export class HasPermissionResponse {
    @ApiProperty()
    userId: string;

    @ApiProperty()
    libraryId: string;

    @ApiProperty()
    permission: string;

    @ApiProperty()
    hasPermission: boolean;

    @ApiProperty()
    value: boolean | string | number | null;
}