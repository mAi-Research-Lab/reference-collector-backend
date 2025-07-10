import { Injectable } from "@nestjs/common";
import { LibraryMemberships } from "generated/prisma";
import { CustomHttpException } from "src/common/exceptions/custom-http-exception";
import { PrismaService } from "src/database/prisma/prisma.service";
import { LIBRARY_MESSAGES } from "../constants/library.messages";
import { LibraryPermission, PermissionData } from "../enums/permission.enum";

@Injectable()
export class PermissionService {
    constructor(
        private readonly prisma: PrismaService
    ) { }

    async getUserPermissions(libraryId: string, userId: string): Promise<LibraryMemberships> {
        const library = await this.prisma.libraries.findUnique({ where: { id: libraryId } });

        if (!library) throw new CustomHttpException(LIBRARY_MESSAGES.LIBRARY_NOT_FOUND, 404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND);

        const membership = await this.prisma.libraryMemberships.findUnique({ where: { libraryId_userId: { libraryId, userId } } });

        if (!membership) throw new CustomHttpException(LIBRARY_MESSAGES.USER_NOT_MEMBER, 404, LIBRARY_MESSAGES.USER_NOT_MEMBER);

        return membership;
    }

    async addPermission(
        libraryId: string,
        userId: string,
        permission: LibraryPermission | string,
        value: boolean | string | number = true
    ): Promise<LibraryMemberships> {
        const membership = await this.getUserPermissions(libraryId, userId);

        const currentPermissions = (membership.permissions as PermissionData) || {};

        const updatedPermissions = {
            ...currentPermissions,
            [permission]: value
        };

        const updatedMembership = await this.prisma.libraryMemberships.update({
            where: {
                libraryId_userId: { libraryId, userId }
            },
            data: {
                permissions: updatedPermissions
            }
        });

        return updatedMembership;
    }

    async deletePermission(
        libraryId: string,
        userId: string,
        permission: LibraryPermission | string
    ): Promise<LibraryMemberships> {
        const membership = await this.getUserPermissions(libraryId, userId);

        const currentPermissions = (membership.permissions as PermissionData) || {};

        const updatedPermissions = { ...currentPermissions };
        delete updatedPermissions[permission];

        const updatedMembership = await this.prisma.libraryMemberships.update({
            where: {
                libraryId_userId: { libraryId, userId }
            },
            data: {
                permissions: updatedPermissions
            }
        });

        return updatedMembership;
    }

    async addMultiplePermissions(
        libraryId: string,
        userId: string,
        permissions: Record<string, boolean | string | number>
    ): Promise<LibraryMemberships> {
        const membership = await this.getUserPermissions(libraryId, userId);

        const currentPermissions = (membership.permissions as PermissionData) || {};

        const updatedPermissions = {
            ...currentPermissions,
            ...permissions
        };

        const updatedMembership = await this.prisma.libraryMemberships.update({
            where: {
                libraryId_userId: { libraryId, userId }
            },
            data: {
                permissions: updatedPermissions
            }
        });

        return updatedMembership;
    }

    async deleteMultiplePermissions(
        libraryId: string,
        userId: string,
        permissions: string[]
    ): Promise<LibraryMemberships> {
        const membership = await this.getUserPermissions(libraryId, userId);

        const currentPermissions = (membership.permissions as PermissionData) || {};

        const updatedPermissions = { ...currentPermissions };
        permissions.forEach(permission => {
            delete updatedPermissions[permission];
        });

        const updatedMembership = await this.prisma.libraryMemberships.update({
            where: {
                libraryId_userId: { libraryId, userId }
            },
            data: {
                permissions: updatedPermissions
            }
        });

        return updatedMembership;
    }

    async setAllPermissions(
        libraryId: string,
        userId: string,
        permissions: Record<string, boolean | string | number>
    ): Promise<LibraryMemberships> {
        const updatedMembership = await this.prisma.libraryMemberships.update({
            where: {
                libraryId_userId: { libraryId, userId }
            },
            data: {
                permissions: permissions
            }
        });

        return updatedMembership;
    }

    async clearAllPermissions(
        libraryId: string,
        userId: string
    ): Promise<LibraryMemberships> {

        const updatedMembership = await this.prisma.libraryMemberships.update({
            where: {
                libraryId_userId: { libraryId, userId }
            },
            data: {
                permissions: {}
            }
        });

        return updatedMembership;
    }

    async hasPermission(
        libraryId: string,
        userId: string,
        permission: LibraryPermission | string
    ): Promise<boolean> {
        const membership = await this.getUserPermissions(libraryId, userId);

        const permissions = (membership.permissions as PermissionData) || {};
        return Boolean(permissions[permission]);
    }

    async getPermissionValue(
        libraryId: string,
        userId: string,
        permission: LibraryPermission | string
    ): Promise<boolean | string | number | null> {
        const membership = await this.getUserPermissions(libraryId, userId);

        const permissions = (membership.permissions as PermissionData) || {};
        return permissions[permission] || null;
    }
}