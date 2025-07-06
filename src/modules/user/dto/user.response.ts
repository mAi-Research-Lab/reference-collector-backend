import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserResponse {
    @ApiProperty()
    id: string

    @ApiProperty()
    email: string

    @ApiProperty()
    fullName: string

    @ApiProperty()
    institution: string

    @ApiProperty()
    fieldOfStudy: string

    @ApiProperty()
    orcidId: string

    @ApiProperty()
    subscriptionPlan: string

    @ApiPropertyOptional()
    avatarUrl: string

    @ApiPropertyOptional()
    preferences: Record<string, any> | null;

    @ApiProperty()
    emailVerified: boolean

    @ApiProperty()
    isActive: boolean
    
    @ApiProperty()
    lastLogin: Date

    @ApiProperty()
    createdAt: Date

    @ApiProperty()
    updatedAt: Date
}