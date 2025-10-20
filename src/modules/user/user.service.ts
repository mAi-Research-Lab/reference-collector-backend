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
import { PrismaService } from 'src/database/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

@Injectable()
export class UserService {
    private readonly uploadPath: string;
    private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
    private readonly avatarSize = 400; // 400x400 px

    constructor(
        private readonly userRepository: UserRepository,
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        this.uploadPath = this.configService.get<string>('AVATAR_UPLOAD_PATH') || './uploads/avatars';
        this.ensureUploadDirectory();
    }

    async create(data: CreateUserDto): Promise<UserResponse> {
        const user = await this.userRepository.findByEmail(data.email);

        if (user) {
            throw new CustomHttpException(COMMON_MESSAGES.EMAIL_ALREADY_EXISTS, 409, COMMON_MESSAGES.EMAIL_ALREADY_EXISTS);
        }

        const [username, domain] = data.email.split('@');

        const institution = await this.prisma.institution.findUnique({ where: { domain } });

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const createUserData = {
            email: data.email,
            fullName: data.fullName,
            institutionId: institution ? institution.id : null,
            fieldOfStudy: data.fieldOfStudy,
            orcidId: data.orcidId,
            userType: institution ? UserType.institutional : data.userType as UserType || UserType.individual,
            subscriptionPlan: null,
            subscriptionStatus: 'inactive',
            avatarUrl: data.avatarUrl || '',
            preferences: formatPreferences(data.preferences) || {},
            emailVerified: false,
            isActive: false,
            passwordHash: hashedPassword,
            lastLogin: new Date(),
        };

        const newUser = await this.userRepository.create(createUserData as Prisma.UserCreateInput);

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

    async findAllByInstitutionId(institutionId: string): Promise<UserResponse[]> {
        const users = await this.prisma.user.findMany({ where: { institutionId } });

        return users.map(formatUserResponse);
    }

    async uploadAvatar(userId: string, file: Express.Multer.File): Promise<UserResponse> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new CustomHttpException(COMMON_MESSAGES.USER_NOT_FOUND, 404, COMMON_MESSAGES.USER_NOT_FOUND);
        }

        this.validateFile(file);

        if (user.avatarUrl) {
            this.deleteOldAvatar(user.avatarUrl);
        }

        const fileExtension = path.extname(file.originalname);
        const fileName = `${userId}-${fileExtension}`;
        const filePath = path.join(this.uploadPath, fileName);

        try {
            await this.processAndSaveImage(file.buffer, filePath);

            const avatarUrl = `/uploads/avatars/${fileName}`;

            await this.updateAvatarUrl(userId, avatarUrl);

            return formatUserResponse(user);
        } catch (error) {

            throw new CustomHttpException("Avatar upload error", 500, 'AVATAR_UPLOAD_ERROR');
        }
    }

    async deleteAvatar(userId: string): Promise<{ message: string }> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new CustomHttpException(COMMON_MESSAGES.USER_NOT_FOUND, 404, COMMON_MESSAGES.USER_NOT_FOUND);
        }

        if (!user.avatarUrl) {
            throw new CustomHttpException('Kullanıcının avatar fotoğrafı bulunmamaktadır', 400, 'NO_AVATAR_FOUND');
        }

        try {
            this.deleteOldAvatar(user.avatarUrl);

            await this.updateAvatarUrl(userId, null);

            return {
                message: 'Avatar başarıyla silindi'
            };
        } catch (error) {

            throw new CustomHttpException('An error occurred while deleting the avatar', 500, 'AVATAR_DELETE_ERROR');
        }
    }

    private async updateAvatarUrl(userId: string, avatarUrl: string | null): Promise<User> {
        try {
            const updatedUser = await this.userRepository.update(userId, { avatarUrl });
            return updatedUser;
        } catch (error) {

            throw new CustomHttpException("Avatar update error", 500, 'AVATAR_UPDATE_ERROR');
        }
    }

    private validateFile(file: Express.Multer.File): void {
        if (!file) {
            throw new CustomHttpException('Dosya bulunamadı', 400, 'FILE_NOT_FOUND');
        }

        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new CustomHttpException(
                "Invalid file type. Allowed types: " + this.allowedMimeTypes.join(', '),
                400,
                'INVALID_FILE_TYPE'
            );
        }

        if (file.size > this.maxFileSize) {
            throw new CustomHttpException(
                "File size is too large. Maximum size: " + this.maxFileSize / 1024 / 1024 + 'MB',
                400,
                'FILE_TOO_LARGE'
            );
        }
    }

    private async processAndSaveImage(buffer: Buffer, filePath: string): Promise<void> {
        await sharp(buffer)
            .resize(this.avatarSize, this.avatarSize, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 90 })
            .toFile(filePath);
    }

    private deleteOldAvatar(avatarUrl: string): void {
        try {
            const fileName = path.basename(avatarUrl);
            const filePath = path.join(this.uploadPath, fileName);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.warn('Eski avatar dosyası silinemedi:', error);
        }
    }

    private ensureUploadDirectory(): void {
        if (!fs.existsSync(this.uploadPath)) {
            fs.mkdirSync(this.uploadPath, { recursive: true });
        }
    }

    async getRemainingStorage(userId: string): Promise<number> {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        })

        if (!user) {
            throw new CustomHttpException(COMMON_MESSAGES.USER_NOT_FOUND, 404, COMMON_MESSAGES.USER_NOT_FOUND);
        }

        const currentStorageUsed = BigInt(user.storageUsed);
        const maxStorageLimit = BigInt(user.maxStorage);

        const remainingBytes = maxStorageLimit - currentStorageUsed;
        const remainingMB = Number(remainingBytes) / (1024 * 1024);

        return remainingMB
    }

    async incrementStorageUsage(userId: string, storageUsage: bigint): Promise<void> {
        await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                storageUsed: {
                    increment: storageUsage
                }
            }
        })
    }

    async decrementStorageUsage(userId: string, storageUsage: bigint): Promise<void> {
        await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                storageUsed: {
                    decrement: storageUsage
                }
            }
        })
    }
}