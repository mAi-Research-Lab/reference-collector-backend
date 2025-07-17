import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { SharedService } from "../service/shared.service";
import { LIBRARY_MESSAGES } from "../constants/library.messages";
import { LibraryResponse } from "../dto/response/libraries.response";
import { COMMON_MESSAGES } from "src/common/constants/common.messages";
import { User } from "src/modules/user/decorators/user.decorator";
import { UserResponse } from "src/modules/user/dto/user.response";
import { InvitationDetailsResponse } from "../dto/response/invitation-details.response";
import { ApiSuccessArrayResponse, ApiSuccessResponse, ApiErrorResponse } from "src/common/decorators/api-response-wrapper.decorator";
import { ResponseDto } from "src/common/dto/api-response.dto";

@Controller('libraries/shared')
@ApiTags('Shared Library')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class SharedController {
    constructor(
        private readonly sharedService: SharedService
    ) { }

    @Get(':libraryId/members')
    @ApiOperation({ summary: 'Get library members' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiSuccessArrayResponse(UserResponse, 200, LIBRARY_MESSAGES.MEMBERSHIPS_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND)
    async getMembers(@Param('libraryId') libraryId: string): Promise<ResponseDto> {
        const members = await this.sharedService.getMembers(libraryId);

        return {
            message: LIBRARY_MESSAGES.MEMBERSHIPS_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: members
        };
    }

    @Get(':userId')
    @ApiOperation({ summary: 'Get user shared libraries' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiSuccessArrayResponse(LibraryResponse, 200, LIBRARY_MESSAGES.LIBRARIES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, COMMON_MESSAGES.USER_NOT_FOUND)
    async getUserSharedLibraries(@Param('userId') userId: string): Promise<ResponseDto> {
        const libraries = await this.sharedService.getUserSharedLibraries(userId);

        return {
            message: LIBRARY_MESSAGES.LIBRARIES_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: libraries
        };
    }

    @Post(':id/invite')
    @ApiOperation({ summary: 'Invite user to a shared library' })
    @ApiParam({ name: 'id', description: 'Library ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string' }
            }
        }
    })
    @ApiResponse({ 
        status: 200, 
        description: LIBRARY_MESSAGES.MEMBERSHIP_EMAIL_SENT_SUCCESSFULLY,
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND)
    @ApiErrorResponse(409, "User already member or invitation already sent")
    async inviteMember(
        @Param('id') libraryId: string, 
        @Body('email') email: string, 
        @User('id') invitedBy: string
    ): Promise<ResponseDto> {
        const result = await this.sharedService.inviteMember(libraryId, email, invitedBy);

        return {
            message: LIBRARY_MESSAGES.MEMBERSHIP_EMAIL_SENT_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result.message
        };
    }

    @Post('accept-invitation/:token')
    @ApiOperation({ summary: 'Accept invitation to a shared library' })
    @ApiParam({ name: 'token', description: 'Invitation token' })
    @ApiResponse({
        status: 200,
        description: LIBRARY_MESSAGES.MEMBERSHIP_ACCEPTED_SUCCESSFULLY,
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND)
    @ApiErrorResponse(409, "Invitation already accepted, expired or email mismatch")
    async acceptLibraryInvitation(
        @Param('token') token: string, 
        @User('id') userId: string
    ): Promise<ResponseDto> {
        const result = await this.sharedService.acceptLibraryInvitation(token, userId);

        return {
            message: LIBRARY_MESSAGES.MEMBERSHIP_ACCEPTED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result.message
        };
    }

    @Get('invitation/:token')
    @ApiOperation({ summary: 'Get invitation details' })
    @ApiParam({ name: 'token', description: 'Invitation token' })
    @ApiSuccessResponse(InvitationDetailsResponse, 200, "Invitation details retrieved successfully")
    @ApiErrorResponse(400, "Invalid invitation token or invitation expired or invitation already accepted")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "Invitation not found")
    async getInvitationDetails(@Param('token') token: string): Promise<ResponseDto> {
        const invitationDetails = await this.sharedService.getInvitationDetails(token);

        return {
            message: "Invitation details retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: invitationDetails
        };
    }
}