import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserResponse {
    @ApiProperty()
    id: string

    @ApiProperty()
    email: string

    @ApiProperty()
    fullName: string

    @ApiProperty()
    userType: string

    @ApiProperty()
    institutionId?: string | null

    @ApiPropertyOptional()
    fieldOfStudy?: string | null

    @ApiPropertyOptional()
    orcidId: string | null 

    @ApiPropertyOptional()
    subscriptionPlan: string | null 

    @ApiProperty()
    subscriptionStatus: string

    @ApiPropertyOptional()
    avatarUrl: string | null

    @ApiPropertyOptional()
    preferences: Record<string, any> | null;

    @ApiProperty()
    emailVerified: boolean

    @ApiProperty()
    isActive: boolean
    
    @ApiPropertyOptional()
    lastLogin: Date | null 

    @ApiProperty()
    createdAt: Date

    @ApiProperty()
    updatedAt: Date
}