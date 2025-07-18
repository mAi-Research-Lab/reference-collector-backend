
import { ApiProperty } from "@nestjs/swagger";
import { CollaboratorRoles } from "generated/prisma";
import { UserResponse } from "src/modules/user/dto/user.response";

export class CollaboratorResponse {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    documentId: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    userId: string;

    @ApiProperty({ example: CollaboratorRoles.owner })
    role: CollaboratorRoles

    @ApiProperty({ example: { read: true, write: true } })
    permissions: Record<string, any>;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    invitedBy?: string

    @ApiProperty({ example: '2022-01-01T00:00:00.000Z' })
    acceptedAt?: Date

    @ApiProperty({ example: '2022-01-01T00:00:00.000Z' })
    lastAccessed?: Date

    @ApiProperty({ example: '2022-01-01T00:00:00.000Z' })
    createdAt: Date
}

export class CollaboratorResponseWithUser extends CollaboratorResponse {
    user: UserResponse
}