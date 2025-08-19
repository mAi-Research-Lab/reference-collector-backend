import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { AuthResponse } from './dto/auth.response';
import { JwtService } from '@nestjs/jwt';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import * as bcrypt from 'bcrypt';
import { formatUserResponse } from 'src/common/utils/format-user-response';
import { UserResponse } from '../user/dto/user.response';
import { LibrariesService } from '../libraries/libraries.service';
import { EmailVerificationService } from './services/email-verification.service';

@Injectable()
export class AuthService {

    protected passwordResetModel = 'passwordreset';

    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly libraryService: LibrariesService,
        private readonly emailVerificationService: EmailVerificationService
    ) { }

    async signup(data: CreateUserDto): Promise<AuthResponse> {
        const user = await this.userService.create({
            ...data,
            emailVerified: false
        });

        // notification to user
        await this.emailVerificationService.emailVerification(user.id);
        await this.libraryService.createDefaultLibraries(user.id);

        const token = await this.generateAccessToken(user);

        return {
            user: user,
            access_token: token
        }
    }

    async login(email: string, password: string): Promise<AuthResponse> {
        const user = await this.userService.findByEmail(email);

        if (!user) {
            throw new CustomHttpException(COMMON_MESSAGES.USER_NOT_FOUND, 404, COMMON_MESSAGES.USER_NOT_FOUND);
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            throw new CustomHttpException(COMMON_MESSAGES.INVALID_CREDENTIALS, 401, COMMON_MESSAGES.INVALID_CREDENTIALS);
        }

        const formatUser = formatUserResponse(user);
        const token = await this.generateAccessToken(formatUser);

        return {
            user: formatUser,
            access_token: token
        }
    }


    private async generateAccessToken(user: UserResponse): Promise<string> {
        const jwtPayload = {
            sub: user.id,
        };

        const token = await this.jwtService.signAsync(jwtPayload);

        return token;
    }

}
