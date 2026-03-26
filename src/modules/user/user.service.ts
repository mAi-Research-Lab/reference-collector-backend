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
import { S3StorageService } from '../references/services/s3-storage.service';

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
        private readonly s3Storage: S3StorageService,
    ) {
        this.uploadPath = this.configService.get<string>('AVATAR_UPLOAD_PATH') || './uploads/avatars';
        this.ensureUploadDirectory();
    }

    private storageCache = new Map<string, { usedBytes: bigint; atMs: number }>();
    private readonly storageCacheTtlMs = 5 * 60 * 1000; // 5 minutes

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

    async getRemainingStorage(userId: string): Promise<{
        totalBytes: number;
        usedBytes: number;
        remainingBytes: number;
        totalMB: number;
        usedMB: number;
        remainingMB: number;
    }> {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        })

        if (!user) {
            throw new CustomHttpException(COMMON_MESSAGES.USER_NOT_FOUND, 404, COMMON_MESSAGES.USER_NOT_FOUND);
        }

        const totalBytesBig = BigInt(user.maxStorage);
        const usedBytesBig = await this.getCachedS3UsageBytes(userId);
        const remainingBytesBig = usedBytesBig >= totalBytesBig ? BigInt(0) : (totalBytesBig - usedBytesBig);

        // Return JSON-safe numbers (quota is 2GB by default, well within safe integer range)
        const totalBytes = Number(totalBytesBig);
        const usedBytes = Number(usedBytesBig);
        const remainingBytes = Number(remainingBytesBig);

        const totalMB = totalBytes / (1024 * 1024);
        const usedMB = usedBytes / (1024 * 1024);
        const remainingMB = remainingBytes / (1024 * 1024);

        return { totalBytes, usedBytes, remainingBytes, totalMB, usedMB, remainingMB };
    }

    private async getCachedS3UsageBytes(userId: string): Promise<bigint> {
        // If S3 isn't configured, fall back to DB counter (legacy behavior)
        if (!this.s3Storage.ready) {
            const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { storageUsed: true } });
            return BigInt(u?.storageUsed ?? 0);
        }

        const now = Date.now();
        const cached = this.storageCache.get(userId);
        if (cached && now - cached.atMs < this.storageCacheTtlMs) {
            return cached.usedBytes;
        }

        const prefix = `users/${userId}/`;
        const usedBytes = await this.s3Storage.getPrefixSizeBytes(prefix);
        this.storageCache.set(userId, { usedBytes, atMs: now });
        return usedBytes;
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

    invalidateStorageCache(userId: string): void {
        this.storageCache.delete(userId);
    }
}