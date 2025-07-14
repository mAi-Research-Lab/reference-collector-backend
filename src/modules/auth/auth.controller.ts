import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './services/email-verification.service';
import { PasswordService } from './services/password.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AUTH_MESSAGES } from './constants/auth.messages';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { AuthResponse } from './dto/auth.response';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../user/decorators/user.decorator';
import { ErrorDto } from 'src/common/dto/error.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly emailVerificationService: EmailVerificationService,
        private readonly passwordService: PasswordService
    ) { }

    @Post('signup')
    @ApiOperation({
        summary: 'Register a new user',
        description: 'Creates a new user account and sends a verification email'
    })
    @ApiResponse({
        status: 201,
        description: AUTH_MESSAGES.USER_CREATED_SUCCESSFULLY,
        type: CreateUserDto
    })
    @ApiResponse({ status: 400, type:ErrorDto,  description: AUTH_MESSAGES.EMAIL_ALREADY_REGISTERED })
    @ApiBody({
        type: CreateUserDto,
        description: 'User registration data'
    })
    async signup(@Body() createUserDto: CreateUserDto) {
        return this.authService.signup(createUserDto);
    }

    // @Post('picture')
    // @ApiOperation({
    //     summary: 'Upload a photo',
    //     description: 'Uploads a photo to Google Cloud Storage'
    // })
    // @ApiConsumes('multipart/form-data')
    // @ApiBody({
    //     schema: {
    //         type: 'object',
    //         properties: {
    //             userId: {
    //                 type: 'string',
    //                 description: 'User ID',
    //                 pattern: '^[0-9a-fA-F]{24}$',
    //             },
    //             picture: {
    //                 type: 'string',
    //                 format: 'binary',
    //                 description: 'Profile photo'
    //             },
    //         },
    //     },
    // })
    // @ApiResponse({ status: 201, description: 'Photo uploaded successfully' })
    // @ApiResponse({ status: 404, description: AuthMessages.USER_NOT_FOUND })
    // @UseInterceptors(FileInterceptor('picture'))
    // async uploadPhoto(@Body('userId') userId: string): Promise<{ message: string }> {
    //     const fileUrl = await this.authService.uploadProfileImage(userId);
    //     return fileUrl;
    // }

    @Get('verify-email')
    @ApiOperation({
        summary: 'Verify email address',
        description: 'Verifies a user\'s email address using the token sent to their email'
    })
    @ApiResponse({
        status: 200,
        description: AUTH_MESSAGES.EMAIL_VERIFIED_SUCCESS,
        schema: {
            oneOf: [
                { $ref: '#/components/schemas/AuthResponse' },
                {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED }
                    }
                }
            ]
        }
    })
    @ApiResponse({ status: 400, description: AUTH_MESSAGES.INVALID_VERIFICATION_TOKEN })
    @ApiQuery({
        name: 'token',
        required: true,
        description: 'Email verification token sent to user\'s email',
        type: 'string'
    })
    async verifyEmail(@Query('token') token: string): Promise<AuthResponse | { message: string }> {
        return await this.emailVerificationService.verifyEmail(token);
    }

    @Post('resend-verification-email')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Resend verification email',
        description: 'Resends the verification email to the user\'s email address. Requires authentication.'
    })
    @ApiResponse({
        status: 200,
        description: AUTH_MESSAGES.VERIFICATION_EMAIL_SENT,
        schema: {
            properties: {
                message: { type: 'string', example: AUTH_MESSAGES.VERIFICATION_EMAIL_SENT }
            }
        }
    })
    @ApiResponse({ status: 400, description: `${AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED} or ${AUTH_MESSAGES.USER_NOT_FOUND}` })
    @ApiResponse({ status: 401, description: `${AUTH_MESSAGES.UNAUTHORIZED_ACCESS}` })
    async resendVerificationEmail(@User('id') userId: string) {
        return await this.emailVerificationService.resendVerificationEmail(userId);
    }

    @Post('signin')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Sign in with email and password',
        description: 'Authenticates a user using their email and password'
    })
    @ApiResponse({
        status: 200,
        description: AUTH_MESSAGES.LOGIN_SUCCESS,
        type: AuthResponse
    })
    @ApiResponse({ status: 401, type:ErrorDto, description: AUTH_MESSAGES.INVALID_CREDENTIALS })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
                email: {
                    type: 'string',
                    format: 'email',
                    example: 'a@hotmail.com'
                },
                password: {
                    type: 'string',
                    format: 'password',
                    example: '123123'
                }
            }
        }
    })
    async signin(
        @Body('email') email: string,
        @Body('password') password: string,
    ): Promise<AuthResponse> {
        return await this.authService.login(email, password);
    }

    // @Post('social')
    // @HttpCode(HttpStatus.OK)
    // @ApiOperation({
    //   summary: 'Sign in with Google',
    //   description: 'Authenticates a user using their Google account. Creates a new user account if the email is not registered. The user information (email, name, etc.) will be extracted from the Google ID token.'
    // })
    // @ApiResponse({
    //   status: 200,
    //   description: AuthMessages.LOGIN_SUCCESS,
    //   type: AuthResponse
    // })
    // @ApiResponse({ status: 400, description: AuthMessages.SOCIAL_USER_EXISTS })
    // @ApiResponse({ status: 401, description: AuthMessages.INVALID_SOCIAL_TOKEN })
    // @ApiBody({
    //   type: SocialUserDto,
    //   description: 'Social authentication data containing provider type and ID token from Google'
    // })
    // async socialAuth(@Body() socialUserDto: SocialUserDto): Promise<AuthResponse> {
    //   return this.authService.socialSignup(socialUserDto);
    // }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Change password',
        description: 'Changes the password for the authenticated user. Only works for local accounts (not social login).'
    })
    @ApiResponse({
        status: 200,
        description: AUTH_MESSAGES.PASSWORD_CHANGED_SUCCESS,
        schema: {
            properties: {
                message: { type: 'string', example: AUTH_MESSAGES.PASSWORD_CHANGED_SUCCESS }
            }
        }
    })
    @ApiResponse({ status: 400, description: AUTH_MESSAGES.INVALID_PASSWORD })
    @ApiResponse({ status: 401, description: AUTH_MESSAGES.UNAUTHORIZED_ACCESS })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
                currentPassword: {
                    type: 'string',
                    format: 'password',
                    example: '123123'
                },
                newPassword: {
                    type: 'string',
                    format: 'password',
                    example: '321321*'
                }
            }
        },
        description: 'Current and new password'
    })
    @ApiBearerAuth()
    async changePassword(
        @User('id') userId: string,
        @Body('currentPassword') currentPassword: string,
        @Body('newPassword') newPassword: string
    ) {
        return this.passwordService.changePassword(userId, currentPassword, newPassword);
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'Request password reset email' })
    @ApiResponse({ status: 200, description: AUTH_MESSAGES.PASSWORD_RESET_EMAIL_SENT })
    @ApiResponse({ status: 404, description: AUTH_MESSAGES.USER_NOT_FOUND })
    async forgotPassword(@Body('email') email: string) {
        return await this.passwordService.forgotPassword(email);
    }

    @Get('verify-reset-token')
    @ApiOperation({ summary: 'Verify reset password token' })
    @ApiResponse({ status: 200, description: AUTH_MESSAGES.TOKEN_VALID })
    @ApiResponse({ status: 401, description: AUTH_MESSAGES.INVALID_RESET_TOKEN })
    async verifyResetToken(@Query('token') token: string) {
        return await this.passwordService.verifyResetToken(token);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password with token' })
    @ApiResponse({ status: 200, description: AUTH_MESSAGES.PASSWORD_RESET_SUCCESS })
    @ApiResponse({ status: 401, description: AUTH_MESSAGES.INVALID_RESET_TOKEN })
    async resetPassword(@Body('token') token: string, @Body('password') password: string) {
        return await this.passwordService.resetPassword(token, password);
    }
}
