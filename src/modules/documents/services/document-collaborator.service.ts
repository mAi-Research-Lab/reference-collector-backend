import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CreateCollaboratorDto } from "../dto/collaborator/create-collaborator.dto";
import { UserService } from "src/modules/user/user.service";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { COMMON_MESSAGES } from "src/common/constants/common.messages";
import { COLLABORATOR_MESSAGES } from "../constants/collaborator/collaborator.messages";
import { CollaboratorResponse, CollaboratorResponseWithUser } from "../dto/collaborator/collaborator.response";
import { CollaboratorRoles } from "generated/prisma";
import { DocumentsService } from "./documents.service";
import { MailService } from "src/modules/mail/mail.service";

@Injectable()
export class DocumentCollaboratorService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly documentService: DocumentsService,
        private readonly mailService: MailService
    ) { }

    async inviteCollaborator(invitedBy: string, documentId:string, data: CreateCollaboratorDto): Promise<{ message: string }> {
        const { email, role, permissions } = data;

        const user = await this.userService.findByEmail(email)

        if (!user) {
            throw new CustomHttpException(
                COMMON_MESSAGES.USER_NOT_FOUND,
                404,
                COMMON_MESSAGES.USER_NOT_FOUND
            )
        }

        if (! await this.checkOwner(documentId, invitedBy)) {
            throw new CustomHttpException(
                COLLABORATOR_MESSAGES.USER_NOT_OWNER,
                401,
                COLLABORATOR_MESSAGES.USER_NOT_OWNER
            )
        }


        const collaborator = await this.prisma.documentCollaborators.findUnique({
            where: {
                documentId_userId: {
                    documentId,
                    userId: user.id
                }
            }
        })

        if (collaborator) {
            throw new CustomHttpException(
                COLLABORATOR_MESSAGES.USER_ALREADY_COLLABORATOR,
                409,
                COLLABORATOR_MESSAGES.USER_ALREADY_COLLABORATOR
            )
        }

        await this.prisma.documentCollaborators.create({
            data: {
                documentId,
                userId: user.id,
                role,
                permissions,
                invitedBy: invitedBy
            }
        })

        // Send email to user
        try {
            const document = await this.documentService.getDocument(documentId);
            const inviter = await this.userService.findById(invitedBy);
            
            await this.mailService.sendCollaborationInvitationEmail(
                user.email,
                user.fullName,
                inviter.fullName,
                document.title,
                documentId
            );
        } catch (error) {
            console.error('Error sending collaboration invitation email:', error);
            // Email gönderme hatası olsa bile davet başarılı sayılır
        }

        return { message: COLLABORATOR_MESSAGES.USER_INVITED_SUCCESSFULLY }
    }

    async acceptInvitation(documentId: string, userId: string): Promise<{ message: string }> {
        const collaborator = await this.prisma.documentCollaborators.findUnique({
            where: {
                documentId_userId: {
                    documentId,
                    userId
                }
            }
        })

        if (!collaborator) {
            throw new CustomHttpException(
                COLLABORATOR_MESSAGES.COLLABORATOR_NOT_FOUND,
                404,
                COLLABORATOR_MESSAGES.COLLABORATOR_NOT_FOUND
            )
        }

        await this.prisma.documentCollaborators.update({
            where: {
                documentId_userId: {
                    documentId,
                    userId
                }
            },
            data: {
                acceptedAt: new Date()
            }
        })

        return { message: COLLABORATOR_MESSAGES.USER_ACCEPTED_SUCCESSFULLY }
    }

    async getDocumentCollaborators(documentId: string): Promise<CollaboratorResponseWithUser[]> {
        const collaborators = await this.prisma.documentCollaborators.findMany({
            where: {
                documentId
            },
            include: {
                user: true
            }
        });

        return collaborators as CollaboratorResponseWithUser[];
    }

    async updateCollaboratorRole(documentId: string, userId: string, role: string, updatedBy: string): Promise<CollaboratorResponse> {
        const collaborator = await this.prisma.documentCollaborators.findUnique({
            where: {
                documentId_userId: {
                    documentId,
                    userId
                }
            }
        })

        if (!collaborator) {
            throw new CustomHttpException(
                COLLABORATOR_MESSAGES.COLLABORATOR_NOT_FOUND,
                404,
                COLLABORATOR_MESSAGES.COLLABORATOR_NOT_FOUND
            )
        }

        if (! await this.checkOwner(documentId, updatedBy)) {
            throw new CustomHttpException(
                COLLABORATOR_MESSAGES.USER_NOT_OWNER,
                400,
                COLLABORATOR_MESSAGES.USER_NOT_OWNER
            )
        }


        await this.prisma.documentCollaborators.update({
            where: {
                documentId_userId: {
                    documentId,
                    userId
                }
            },
            data: {
                role: role as CollaboratorRoles
            }
        })

        return collaborator as CollaboratorResponse
    }

    async removeCollaborator(documentId: string, userId: string, removedBy: string): Promise<{ message: string }> {
        const collaborator = await this.prisma.documentCollaborators.findUnique({
            where: {
                documentId_userId: {
                    documentId,
                    userId
                }
            }
        })

        if (!collaborator) {
            throw new CustomHttpException(
                COLLABORATOR_MESSAGES.COLLABORATOR_NOT_FOUND,
                404,
                COLLABORATOR_MESSAGES.COLLABORATOR_NOT_FOUND
            )
        }

        if (! await this.checkOwner(documentId, removedBy)) {
            throw new CustomHttpException(
                COLLABORATOR_MESSAGES.USER_NOT_OWNER,
                400,
                COLLABORATOR_MESSAGES.USER_NOT_OWNER
            )
        }

        await this.prisma.documentCollaborators.delete({
            where: {
                documentId_userId: {
                    documentId,
                    userId
                }
            }
        })

        return { message: COLLABORATOR_MESSAGES.COLLABORATOR_REMOVED_SUCCESSFULLY }
    }

    private async checkOwner(documentId: string, userId: string): Promise<boolean> {
        const document = await this.documentService.getDocument(documentId);
        if (document.createdBy === userId) return true;

        const collaborator = await this.prisma.documentCollaborators.findUnique({
            where: { documentId_userId: { documentId, userId } }
        });

        return collaborator?.role === CollaboratorRoles.owner;
    }
}