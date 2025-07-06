import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/database/repositories/user/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponse } from './dto/user.response';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from 'generated/prisma';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository
    ) { }

    async create(data: CreateUserDto): Promise<UserResponse> {
        const user = await this.userRepository.findByEmail(data.email);

        if (user) {
            throw new CustomHttpException(COMMON_MESSAGES.EMAIL_ALREADY_EXISTS, 409, COMMON_MESSAGES.EMAIL_ALREADY_EXISTS);
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const createUserData: Prisma.UserCreateInput = {
            email: data.email,
            fullName: data.fullName,
            institution: data.institution,
            fieldOfStudy: data.fieldOfStudy,
            orcidId: data.orcidId,
            subscriptionPlan: data.subscriptionPlan as any,
            avatarUrl: data.avatarUrl || '',
            preferences: this.formatPreferences(data.preferences) || {},
            emailVerified: false,
            isActive: false,
            passwordHash: hashedPassword,
            lastLogin: new Date(),
        };

        const newUser = await this.userRepository.create(createUserData);

        return this.formatUserResponse(newUser);
    }

    private formatPreferences(preferences?: any): Record<string, any> | null {
        if (!preferences) {
            return null;
        }

        if (typeof preferences === 'object') {
            return preferences;
        } else {
            return { value: preferences };
        }
    }

    private formatUserResponse(user: User): UserResponse {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...userResponse } = user;
        return {
            ...userResponse,
            preferences: this.formatPreferences(user.preferences) || {},
        };
    }

    async findById(id: string): Promise<UserResponse> {
        const user = await this.userRepository.findById(id);

        if (!user) {
            throw new CustomHttpException(COMMON_MESSAGES.USER_NOT_FOUND, 404, COMMON_MESSAGES.USER_NOT_FOUND);
        }

        return this.formatUserResponse(user);
    }

    async update(id: string, data: UpdateUserDto): Promise<UserResponse> {
        const user = await this.userRepository.findById(id);

        if (!user) {
            throw new CustomHttpException(COMMON_MESSAGES.USER_NOT_FOUND, 404, COMMON_MESSAGES.USER_NOT_FOUND);
        }

        const updatedUser = await this.userRepository.update(id, data);

        return this.formatUserResponse(updatedUser);

    }

}
