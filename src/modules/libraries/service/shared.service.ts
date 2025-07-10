import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { LibraryResponse } from "../dto/libraries.response";
import { LibraryTypes, LibraryVisibility, MembershipRole } from "generated/prisma";
import { UserResponse } from "src/modules/user/dto/user.response";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { LIBRARY_MESSAGES } from "../constants/library.messages";
import { InvitationDetailsResponse } from "../dto/response/invitation-details.response";
import { randomBytes } from "crypto";

@Injectable()
export class SharedService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async getUserSharedLibraries(userId: string): Promise<LibraryResponse[]> {
        return await this.prisma.libraries.findMany({ where: { ownerId: userId, type: LibraryTypes.shared } });
    }

    async createSharedLibrary(userId: string, data: { name: string, description?: string, institutionId?: string, visibility: LibraryVisibility }): Promise<LibraryResponse> {
        return await this.prisma.libraries.create({
            data: {
                ...data,
                ownerId: userId,
                type: LibraryTypes.shared,
            }
        });
    }

    async getMembers(libraryId: string): Promise<UserResponse[]> {
        const libraryExists = await this.prisma.libraries.findUnique({
            where: { id: libraryId },
            select: { id: true }
        });

        if (!libraryExists) {
            throw new CustomHttpException(LIBRARY_MESSAGES.LIBRARY_NOT_FOUND, 404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND);
        }

        const memberships = await this.prisma.libraryMemberships.findMany({
            where: { libraryId },
            include: {
                user: true
            }
        });

        return memberships.map(({ user }) => ({
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            userType: user.userType,
            institution: user.institutionId,
            fieldOfStudy: user.fieldOfStudy,
            orcidId: user.orcidId,
            subscriptionPlan: user.subscriptionPlan,
            subscriptionStatus: user.subscriptionStatus,
            avatarUrl: user.avatarUrl,
            preferences: user.preferences as Record<string, any> | null,
            emailVerified: user.emailVerified,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }));
    }

    async deleteMember(libraryId: string, userId: string): Promise<{ message: string }> {
        const libraryExists = await this.prisma.libraries.findUnique({
            where: { id: libraryId },
            select: { id: true }
        });

        if (!libraryExists) {
            throw new CustomHttpException(LIBRARY_MESSAGES.LIBRARY_NOT_FOUND, 404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND);
        }

        await this.prisma.libraryMemberships.deleteMany({ where: { libraryId, userId } });

        return { message: LIBRARY_MESSAGES.MEMBERSHIP_DELETED_SUCCESSFULLY };
    }

    async inviteMember(
        libraryId: string,
        email: string,
        invitedBy: string,
        role: MembershipRole = MembershipRole.member
    ): Promise<{ message: string }> {
        const libraryExists = await this.prisma.libraries.findUnique({
            where: { id: libraryId },
            select: { id: true, name: true }
        });

        if (!libraryExists) {
            throw new CustomHttpException(LIBRARY_MESSAGES.LIBRARY_NOT_FOUND, 404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND);
        }

        const existingMembership = await this.prisma.libraryMemberships.findUnique({
            where: {
                libraryId_userId: {
                    libraryId,
                    userId: invitedBy
                }
            }
        });

        if (existingMembership) {
            throw new CustomHttpException(LIBRARY_MESSAGES.USER_ALREADY_MEMBER, 409, LIBRARY_MESSAGES.USER_ALREADY_MEMBER);
        }

        const existingInvitation = await this.prisma.libraryInvitations.findFirst({
            where: {
                libraryId,
                email,
                acceptedAt: null,
                expiresAt: { gt: new Date() },
                isExpired: false
            }
        });

        if (existingInvitation) {
            throw new CustomHttpException(LIBRARY_MESSAGES.INVITATION_ALREADY_SENT, 409, LIBRARY_MESSAGES.INVITATION_ALREADY_SENT);
        }

        try {
            const invitation = await this.prisma.libraryInvitations.create({
                data: {
                    libraryId,
                    email,
                    role,
                    invitedBy,
                    token: this.generateToken(),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const inviteLink = `${process.env.FRONTEND_URL}/accept-invitation/${invitation.token}`;

            // TODO: Email service i
            // await this.emailService.sendLibraryInvitation({
            //     to: email,
            //     libraryName: libraryExists.name,
            //     inviteLink,
            //     expiresAt: invitation.expiresAt
            // });

            return { message: LIBRARY_MESSAGES.MEMBERSHIP_EMAIL_SENT_SUCCESSFULLY };
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            throw new CustomHttpException(LIBRARY_MESSAGES.MEMBERSHIP_EMAIL_SENT_FAILED, 400, LIBRARY_MESSAGES.MEMBERSHIP_EMAIL_SENT_FAILED);
        }
    }

    async acceptLibraryInvitation(token: string, userId: string): Promise<{ message: string }> {
        const invitation = await this.prisma.libraryInvitations.findUnique({
            where: { token },
            include: {
                library: { select: { id: true, name: true } }
            }
        });

        if (!invitation) {
            throw new CustomHttpException(LIBRARY_MESSAGES.INVALID_INVITATION_TOKEN, 400, LIBRARY_MESSAGES.INVALID_INVITATION_TOKEN);
        }

        if (invitation.expiresAt < new Date() || invitation.isExpired) {
            throw new CustomHttpException(LIBRARY_MESSAGES.INVITATION_EXPIRED, 400, LIBRARY_MESSAGES.INVITATION_EXPIRED);
        }

        if (invitation.acceptedAt) {
            throw new CustomHttpException(LIBRARY_MESSAGES.INVITATION_ALREADY_ACCEPTED, 400, LIBRARY_MESSAGES.INVITATION_ALREADY_ACCEPTED);
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });

        if (!user || user.email !== invitation.email) {
            throw new CustomHttpException(LIBRARY_MESSAGES.INVITATION_EMAIL_MISMATCH, 400, LIBRARY_MESSAGES.INVITATION_EMAIL_MISMATCH);
        }

        const existingMembership = await this.prisma.libraryMemberships.findUnique({
            where: {
                libraryId_userId: {
                    libraryId: invitation.libraryId,
                    userId
                }
            }
        });

        if (existingMembership) {
            throw new CustomHttpException(LIBRARY_MESSAGES.USER_ALREADY_MEMBER, 400, LIBRARY_MESSAGES.USER_ALREADY_MEMBER);
        }

        try {
            await this.prisma.$transaction([
                this.prisma.libraryMemberships.create({
                    data: {
                        libraryId: invitation.libraryId,
                        userId,
                        role: invitation.role,
                        permissions: invitation.permissions || {},
                        invitedBy: invitation.invitedBy,
                        acceptedAt: new Date()
                    }
                }),
                this.prisma.libraryInvitations.update({
                    where: { id: invitation.id },
                    data: { acceptedAt: new Date() }
                })
            ]);

            return { message: LIBRARY_MESSAGES.MEMBERSHIP_ACCEPTED_SUCCESSFULLY };
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            throw new CustomHttpException(LIBRARY_MESSAGES.MEMBERSHIP_ACCEPT_FAILED, 400, LIBRARY_MESSAGES.MEMBERSHIP_ACCEPT_FAILED);
        }
    }

    async getInvitationDetails(token: string): Promise<InvitationDetailsResponse> {
        const invitation = await this.prisma.libraryInvitations.findUnique({
            where: { token },
            include: {
                library: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                inviter: {
                    select: {
                        fullName: true
                    }
                }
            }
        });

        if (!invitation) {
            throw new CustomHttpException(LIBRARY_MESSAGES.INVALID_INVITATION_TOKEN, 400, LIBRARY_MESSAGES.INVALID_INVITATION_TOKEN);
        }

        if (invitation.expiresAt < new Date() || invitation.isExpired) {
            throw new CustomHttpException(LIBRARY_MESSAGES.INVITATION_EXPIRED, 400, LIBRARY_MESSAGES.INVITATION_EXPIRED);
        }

        if (invitation.acceptedAt) {
            throw new CustomHttpException(LIBRARY_MESSAGES.INVITATION_ALREADY_ACCEPTED, 400, LIBRARY_MESSAGES.INVITATION_ALREADY_ACCEPTED);
        }

        return {
            libraryName: invitation.library.name,
            libraryDescription: invitation.library.description,
            inviterName: invitation.inviter.fullName,
            role: invitation.role,
            expiresAt: invitation.expiresAt
        };
    }

    private generateToken(): string {
        return randomBytes(32).toString('hex');
    }
}