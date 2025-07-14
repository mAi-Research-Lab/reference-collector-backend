import { ApiProperty } from "@nestjs/swagger";

export class InvitationDetailsResponse {
    @ApiProperty({ example:'Library Name' })
    libraryName: string
    @ApiProperty({ example:'Library description' })
    libraryDescription?: string | null
    @ApiProperty({ example:'John Doe' })
    inviterName: string
    @ApiProperty({ example:'member' })
    role: string
    @ApiProperty({ example:'2023-01-01T00:00:00.000Z' })
    expiresAt: Date
}