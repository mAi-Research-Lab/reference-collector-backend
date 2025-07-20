import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CollaboratorRoles } from "generated/prisma";

export class CreateCollaboratorDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    @IsNotEmpty()
    documentId: string;

    @ApiProperty({ example: 'example@example.com' })
    @IsString()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: CollaboratorRoles.owner })
    @IsNotEmpty()
    role: CollaboratorRoles

    @ApiProperty({ example: { read: true, write: true } })
    @IsOptional()
    permissions: Record<string, any>;
}