import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/database/repositories/user/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponse } from './dto/user.response';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import * as bcrypt from 'bcrypt';
import { Prisma, User, UserType } from 'generated/prisma';
import { UpdateUserDto } from './dto/update-user.dto';
import { formatPreferences, formatUserResponse } from 'src/common/utils/format-user-response';

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
            userType: data.userType as UserType || UserType.individual,
            subscriptionPlan: null,
            subscriptionStatus: 'inactive',
            avatarUrl: data.avatarUrl || '',
            preferences: formatPreferences(data.preferences) || {},
            emailVerified: false,
            isActive: false,
            passwordHash: hashedPassword,
            lastLogin: new Date(),
        };

        const newUser = await this.userRepository.create(createUserData);

        return formatUserResponse(newUser);
    }



    async findById(id: string): Promise<UserResponse> {
        const user = await this.userRepository.findById(id);

        if (!user) {
            throw new CustomHttpException(COMMON_MESSAGES.USER_NOT_FOUND, 404, COMMON_MESSAGES.USER_NOT_FOUND);
        }

        return formatUserResponse(user);
    }

    async update(id: string, data: UpdateUserDto): Promise<UserResponse> {
        const user = await this.userRepository.findById(id);

        if (!user) {
            throw new CustomHttpException(COMMON_MESSAGES.USER_NOT_FOUND, 404, COMMON_MESSAGES.USER_NOT_FOUND);
        }

        const updatedUser = await this.userRepository.update(id, data);

        return formatUserResponse(updatedUser);

    }

    async findByEmail(email: string): Promise<User | null> {
        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            throw new CustomHttpException(COMMON_MESSAGES.USER_NOT_FOUND, 404, COMMON_MESSAGES.USER_NOT_FOUND);
        }

        return user
    }

}
