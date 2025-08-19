import { Injectable } from "@nestjs/common";
import { AuthResponse } from "../dto/auth.response";
import { PrismaService } from "src/database/prisma/prisma.service";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { AUTH_MESSAGES } from "../constants/auth.messages";
import { UserService } from "src/modules/user/user.service";
import { generateVerificationToken } from "src/common/utils/generate-token";
import { MailService } from "src/modules/mail/mail.service";
import { formatUserResponse } from "src/common/utils/format-user-response";
import { MailMessages } from "src/common/constants/common.messages";

@Injectable()
export class EmailVerificationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly mailService: MailService
    ) { }

    async emailVerification(userId: string): Promise<AuthResponse | { message: string }> {
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new CustomHttpException(AUTH_MESSAGES.USER_NOT_FOUND, 404, AUTH_MESSAGES.USER_NOT_FOUND);
        }

        // Check if email is already verified
        if (user.emailVerified) {
            await this.prisma.emailVerification.deleteMany({ where: { userId: user.id } });
            return { message: AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED };
        }

        const verificationToken = generateVerificationToken();
        await this.prisma.emailVerification.create({
            data: {
                userId: user.id,
                token: verificationToken
            }
        });

        await this.mailService.sendVerificationEmail(user, verificationToken);
        return { message: MailMessages.EMAIL_SENT_SUCCESS };
    }
    async verifyEmail(token: string): Promise<AuthResponse | { message: string }> {
        // First find the verification record
        const verification = await this.prisma.emailVerification.findFirst({ where: { token } });
        if (!verification) {
            throw new CustomHttpException(AUTH_MESSAGES.INVALID_VERIFICATION_TOKEN, 400, AUTH_MESSAGES.INVALID_VERIFICATION_TOKEN);
        }

        // Then find and check the user
        const user = await this.userService.findById(verification.userId);
        if (!user) {
            throw new CustomHttpException(AUTH_MESSAGES.USER_NOT_FOUND, 404, AUTH_MESSAGES.USER_NOT_FOUND);
        }

        // Check if email is already verified
        if (user.emailVerified) {
            await this.prisma.emailVerification.deleteMany({ where: { userId: user.id } });
            return { message: AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED };
        }

        // If not verified, verify it now
        user.emailVerified = true;
        await this.userService.update(user.id, {
            ...user,
            emailVerified: true,
            preferences: user.preferences || {},
        });

        // Delete the verification token
        await this.prisma.emailVerification.deleteMany({ where: { userId: user.id } });

        return { message: AUTH_MESSAGES.EMAIL_VERIFIED_SUCCESSFULLY };
    }

    async resendVerificationEmail(userId: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new CustomHttpException(AUTH_MESSAGES.USER_NOT_FOUND, 404, AUTH_MESSAGES.USER_NOT_FOUND);
        }

        if (user.emailVerified) {
            return { message: AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED };
        }
        const transformedUser = formatUserResponse(user);

        try {
            // Delete any existing verification tokens
            await this.prisma.emailVerification.deleteMany({ where: { userId: user.id } });

            // Generate and save new verification token
            const token = generateVerificationToken();
            await this.prisma.emailVerification.create({
                data: {
                    userId: user.id,
                    token,
                }
            });

            // Send verification email
            await this.mailService.sendVerificationEmail(transformedUser, token);

            return { message: AUTH_MESSAGES.VERIFICATION_EMAIL_SENT };
        } catch (error) {
            console.error('Error in resendVerificationEmail:', error);
            throw new CustomHttpException(AUTH_MESSAGES.SOMETHING_WENT_WRONG, 500, AUTH_MESSAGES.SOMETHING_WENT_WRONG);
        }
    }
}