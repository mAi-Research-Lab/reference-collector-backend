import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { SharedService } from "../service/shared.service";
import { LIBRARY_MESSAGES } from "../constants/library.messages";
import { LibraryResponse } from "../dto/libraries.response";
import { ErrorDto } from "src/common/dto/error.dto";
import { COMMON_MESSAGES } from "src/common/constants/common.messages";
import { User } from "src/modules/user/decorators/user.decorator";
import { UserResponse } from "src/modules/user/dto/user.response";
import { InvitationDetailsResponse } from "../dto/response/invitation-details.response";

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
    @ApiResponse({
        status: 200,
        description: LIBRARY_MESSAGES.MEMBERSHIPS_FETCHED_SUCCESSFULLY,
        type: [UserResponse]
    })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    async getMembers(@Param('libraryId') libraryId: string) {
        return await this.sharedService.getMembers(libraryId);
    }

    @Get(':userId')
    @ApiOperation({ summary: 'Get user shared libraries' })
    @ApiResponse({
        status: 200,
        description: LIBRARY_MESSAGES.LIBRARIES_FETCHED_SUCCESSFULLY,
        type: [LibraryResponse]
    })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    async getUserSharedLibraries(@Param('userId') userId: string) {
        return await this.sharedService.getUserSharedLibraries(userId);
    }

    @Post(':id/invite')
    @ApiOperation({ summary: 'Invite user to a shared library' })
    @ApiResponse({
        status: 200,
        description: LIBRARY_MESSAGES.MEMBERSHIP_EMAIL_SENT_SUCCESSFULLY,
        schema:{
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        }
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string' }
            }
        }
    })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    @ApiResponse({ status: 404, type: ErrorDto, description: LIBRARY_MESSAGES.LIBRARY_NOT_FOUND })
    @ApiResponse({ status: 409, type: ErrorDto, description: LIBRARY_MESSAGES.USER_ALREADY_MEMBER || LIBRARY_MESSAGES.INVITATION_ALREADY_SENT })
    async inviteMember(@Param('id') libraryId: string, @Body('email') email: string, @User('id') invitedBy: string) {
        return await this.sharedService.inviteMember(libraryId, email, invitedBy);
    }

    @Post('accept-invitation/:token')
    @ApiOperation({ summary: 'Accept invitation to a shared library' })
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
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    @ApiResponse({ status: 404, type: ErrorDto, description: LIBRARY_MESSAGES.LIBRARY_NOT_FOUND })
    @ApiResponse({ status: 409, type: ErrorDto, description: LIBRARY_MESSAGES.INVITATION_ALREADY_ACCEPTED || LIBRARY_MESSAGES.INVITATION_EXPIRED || LIBRARY_MESSAGES.INVITATION_EMAIL_MISMATCH })
    async acceptLibraryInvitation(@Param('token') token: string, @User('id') userId: string) {
        return await this.sharedService.acceptLibraryInvitation(token, userId);
    }

    @Get('invitation/:token')
    @ApiOperation({ summary: 'Get invitation details' })
    @ApiResponse({
        status: 200,
        description: "Invitation details",
        type: InvitationDetailsResponse
    })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    @ApiResponse({ status: 404, type: ErrorDto, description: LIBRARY_MESSAGES.LIBRARY_NOT_FOUND })
    async getInvitationDetails(@Param('token') token: string) {
        return await this.sharedService.getInvitationDetails(token);
    }
}