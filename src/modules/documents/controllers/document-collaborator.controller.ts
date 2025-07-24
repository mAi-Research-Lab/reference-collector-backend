import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { DocumentCollaboratorService } from "../services/document-collaborator.service";
import { ApiErrorResponse, ApiSuccessResponse } from "src/common/decorators/api-response-wrapper.decorator";
import { COLLABORATOR_MESSAGES } from "../constants/collaborator/collaborator.messages";
import { COMMON_MESSAGES } from "src/common/constants/common.messages";
import { CreateCollaboratorDto } from "../dto/collaborator/create-collaborator.dto";
import { ResponseDto } from "src/common/dto/api-response.dto";
import { User } from "src/modules/user/decorators/user.decorator";

@Controller('documents/collaborator')
@ApiTags('Document Collaborator')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class DocumentCollaboratorController {
    constructor(
        private readonly documentCollaboratorService: DocumentCollaboratorService
    ) { }

    @Post(':documentId/invite')
    @ApiOperation({ summary: 'Invite collaborator to document' })
    @ApiSuccessResponse(Object, 200, COLLABORATOR_MESSAGES.USER_INVITED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED || COLLABORATOR_MESSAGES.USER_NOT_OWNER)
    @ApiErrorResponse(409, COLLABORATOR_MESSAGES.USER_ALREADY_COLLABORATOR)
    async inviteCollaborator(@User() user: any, @Param('documentId') documentId: string, @Body() data: CreateCollaboratorDto): Promise<ResponseDto> {
        const result = await this.documentCollaboratorService.inviteCollaborator(user.id, documentId, data)

        return {
            message: COLLABORATOR_MESSAGES.USER_INVITED_SUCCESSFULLY,
            data: result,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        }
    }


    @Post(':documentId/accept')
    @ApiOperation({ summary: 'Accept invitation to document' })
    @ApiSuccessResponse({ message: 'Invitation accepted successfully' }, 200, COLLABORATOR_MESSAGES.USER_ACCEPTED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, COLLABORATOR_MESSAGES.COLLABORATOR_NOT_FOUND)
    async acceptInvitation(@Param('documentId') documentId: string, @User() user: any): Promise<ResponseDto> {
        const result = await this.documentCollaboratorService.acceptInvitation(documentId, user.id)

        return {
            message: COLLABORATOR_MESSAGES.USER_ACCEPTED_SUCCESSFULLY,
            data: result,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Get(':documentId')
    @ApiOperation({ summary: 'Get collaborators of document' })
    @ApiSuccessResponse({ message: 'Collaborators fetched successfully' }, 200, COLLABORATOR_MESSAGES.COLLABORATORS_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getCollaborators(@Param('documentId') documentId: string): Promise<ResponseDto> {
        const result = await this.documentCollaboratorService.getDocumentCollaborators(documentId)

        return {
            message: COLLABORATOR_MESSAGES.COLLABORATORS_FETCHED_SUCCESSFULLY,
            data: result,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Put(':documentId')
    @ApiOperation({ summary: 'Update collaborator role of document' })
    @ApiSuccessResponse({ message: 'Collaborator role updated successfully' }, 200, COLLABORATOR_MESSAGES.COLLABORATOR_ROLE_UPDATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, COLLABORATOR_MESSAGES.COLLABORATOR_NOT_FOUND)
    async updateCollaboratorRole(@User() user: any, @Param('documentId') documentId: string, @Body('userId') userId: string, @Body('role') role: string): Promise<ResponseDto> {
        const result = await this.documentCollaboratorService.updateCollaboratorRole(documentId, userId, role, user.id)

        return {
            message: COLLABORATOR_MESSAGES.COLLABORATOR_ROLE_UPDATED_SUCCESSFULLY,
            data: result,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Delete(':documentId/user/:userId')
    @ApiOperation({ summary: 'Remove collaborator from document' })
    @ApiSuccessResponse({ message: 'Collaborator removed successfully' }, 200, COLLABORATOR_MESSAGES.COLLABORATOR_REMOVED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, COLLABORATOR_MESSAGES.COLLABORATOR_NOT_FOUND)
    async removeCollaborator(@User() user: any, @Param('documentId') documentId: string, @Param('userId') userId: string): Promise<ResponseDto> {
        const result = await this.documentCollaboratorService.removeCollaborator(documentId, userId, user.id)

        return {
            message: COLLABORATOR_MESSAGES.COLLABORATOR_REMOVED_SUCCESSFULLY,
            data: result,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString()
        }
    }


}