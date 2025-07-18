import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";
import { CollaboratorRoles } from "generated/prisma";

export class UpdateCollaboratorDto {
    @ApiProperty({ example: CollaboratorRoles.owner })
    @IsOptional()
    role: CollaboratorRoles

    @ApiProperty({ example: { read: true, write: true } })
    @IsOptional()
    permissions: Record<string, any>;
}