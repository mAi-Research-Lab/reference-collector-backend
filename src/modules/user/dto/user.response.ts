import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserResponse {
    @ApiProperty()
    id: string

    @ApiProperty()
    email: string

    @ApiProperty()
    fullName: string

    @ApiPropertyOptional({ description: 'Telefon numarası', nullable: true })
    phoneNumber?: string | null

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

    @ApiProperty({ enum: ["not_started", "completed", "skipped"] })
    introGuideStatus: "not_started" | "completed" | "skipped"
    
    @ApiPropertyOptional()
    lastLogin: Date | null 

    @ApiProperty()
    createdAt: Date

    @ApiProperty()
    updatedAt: Date

    @ApiPropertyOptional()
    storageUsed: bigint

    @ApiPropertyOptional()
    maxStorage: bigint
}

export class RemainingStorageResponse {
    @ApiProperty()
    totalBytes: number

    @ApiProperty()
    usedBytes: number

    @ApiProperty()
    remainingBytes: number

    @ApiProperty({ description: "Total quota in MB" })
    totalMB: number

    @ApiProperty({ description: "Used storage in MB" })
    usedMB: number

    @ApiProperty({ description: "Remaining storage in MB" })
    remainingMB: number
}