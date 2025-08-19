import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { AUTH_MESSAGES } from "../constants/auth.messages";
import { generateResetToken } from "src/common/utils/generate-token";
import { MailService } from "src/modules/mail/mail.service";

@Injectable()
export class PasswordService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailService
    ) { }
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new CustomHttpException(AUTH_MESSAGES.USER_NOT_FOUND, 404, AUTH_MESSAGES.USER_NOT_FOUND);
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user?.passwordHash);
        if (!isPasswordValid) {
            throw new CustomHttpException(AUTH_MESSAGES.INVALID_CREDENTIALS, 401, AUTH_MESSAGES.INVALID_CREDENTIALS);
        }

        // Check if new password is same as current password
        const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
        if (isSamePassword) {
            throw new CustomHttpException(AUTH_MESSAGES.SAME_PASSWORD, 400, AUTH_MESSAGES.SAME_PASSWORD);
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hashedPassword } });

        return { message: AUTH_MESSAGES.PASSWORD_CHANGED_SUCCESS };
    }


    async forgotPassword(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email: email } });

        if (!user) {
            throw new CustomHttpException(AUTH_MESSAGES.USER_NOT_FOUND, 404, AUTH_MESSAGES.USER_NOT_FOUND);
        }

        // Generate reset token
        const token = generateResetToken();

        // Delete any existing reset tokens for this user
        await this.prisma.passwordReset.deleteMany({ where: { userId: user.id } });

        // Create new reset token
        await this.prisma.passwordReset.create({
            data: {
                userId: user.id,
                token
            }
        });

        // Send reset password email
        await this.mailService.sendPasswordResetEmail(user.email, user.fullName, token);

        return { message: AUTH_MESSAGES.PASSWORD_RESET_EMAIL_SENT };
    }

    async verifyResetToken(token: string) {
        try {
            const resetToken = await this.prisma.passwordReset.findFirst({ where: { token } });
            if (!resetToken) {
                throw new CustomHttpException(AUTH_MESSAGES.INVALID_RESET_TOKEN, 400, AUTH_MESSAGES.INVALID_RESET_TOKEN);
            }

            return { valid: true };
        } catch (error) {
            console.log(error);

            throw new CustomHttpException(AUTH_MESSAGES.INVALID_RESET_TOKEN, 400, AUTH_MESSAGES.INVALID_RESET_TOKEN);
        }
    }

    async resetPassword(token: string, password: string) {
        try {
            // Find reset token and validate
            const resetToken = await this.prisma.passwordReset.findFirst({ where: { token } });
            if (!resetToken) {
                throw new CustomHttpException(AUTH_MESSAGES.INVALID_RESET_TOKEN, 400, AUTH_MESSAGES.INVALID_RESET_TOKEN);
            }
            // Find user
            const user = await this.prisma.user.findUnique({ where: { id: resetToken.userId } });

            if (!user) {
                throw new CustomHttpException(AUTH_MESSAGES.USER_NOT_FOUND, 404, AUTH_MESSAGES.USER_NOT_FOUND);
            }

            // Check if new password is same as current password (if exists)
            if (user.passwordHash) {
                const isSamePassword = await bcrypt.compare(password, user.passwordHash);
                if (isSamePassword) {
                    throw new CustomHttpException(AUTH_MESSAGES.SAME_PASSWORD, 400, AUTH_MESSAGES.SAME_PASSWORD);
                }
            }

            // Hash and update password
            const hashedPassword = await bcrypt.hash(password, 10);

            await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashedPassword } });

            // Delete the used reset token
            await this.prisma.passwordReset.deleteMany({ where: { userId: user.id } });

            return { message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESSFULLY };
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new CustomHttpException(AUTH_MESSAGES.SOMETHING_WENT_WRONG, 500, AUTH_MESSAGES.SOMETHING_WENT_WRONG);
        }
    }

}