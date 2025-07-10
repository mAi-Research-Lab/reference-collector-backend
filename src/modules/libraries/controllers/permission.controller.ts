import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { PermissionService } from "../service/permission.service";
import { HasPermissionResponse, PermissionResponse } from "../dto/response/permission.response";
import { AddPermissionDto, MultiplePermissionsDto, SetAllPermissionsDto } from "../dto/create-permissions.dto";

@Controller('libraries/permissions')
@ApiTags('Library Permissions')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class PermissionController {
    constructor(
        private readonly permissionService: PermissionService
    ) { }

    @Get(':libraryId/:userId')
    @ApiOperation({ summary: 'Get user permissions in library' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User permissions retrieved successfully', type: PermissionResponse })
    async getUserPermissions(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string
    ): Promise<PermissionResponse> {
        const membership = await this.permissionService.getUserPermissions(libraryId, userId);
        return {
            userId: membership.userId,
            libraryId: membership.libraryId,
            role: membership.role,
            permissions: membership.permissions as Record<string, any> || {}
        };
    }

    @Post(':libraryId/:userId/add')
    @ApiOperation({ summary: 'Add permission to user' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiBody({ type: AddPermissionDto })
    @ApiResponse({ status: 201, description: 'Permission added successfully' })
    async addPermission(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Body() addPermissionDto: AddPermissionDto
    ): Promise<{ message: string }> {
        await this.permissionService.addPermission(
            libraryId,
            userId,
            addPermissionDto.permission,
            addPermissionDto.value
        );
        return { message: 'Permission added successfully' };
    }

    @Delete(':userId/remove')
    @ApiOperation({ summary: 'Remove permission from user' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                permission: { type: 'string' }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Permission removed successfully' })
    async removePermission(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Body('permission') permission: string
    ): Promise<{ message: string }> {
        await this.permissionService.deletePermission(
            libraryId,
            userId,
            permission
        );
        return { message: 'Permission removed successfully' };
    }

    @Post(':userId/add-multiple')
    @ApiOperation({ summary: 'Add multiple permissions to user' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiBody({ type: MultiplePermissionsDto })
    @ApiResponse({ status: 201, description: 'Permissions added successfully' })
    async addMultiplePermissions(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Body() multiplePermissionsDto: MultiplePermissionsDto
    ): Promise<{ message: string }> {
        await this.permissionService.addMultiplePermissions(
            libraryId,
            userId,
            multiplePermissionsDto.permissions
        );
        return { message: 'Permissions added successfully' };
    }

    @Delete(':userId/remove-multiple')
    @ApiOperation({ summary: 'Remove multiple permissions from user' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                permissions: { type: 'array', items: { type: 'string' } }
            }
        }
    })
    @ApiResponse({ status: 200, description: 'Permissions removed successfully' })
    async removeMultiplePermissions(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Body() body: { permissions: string[] }
    ): Promise<{ message: string }> {
        await this.permissionService.deleteMultiplePermissions(
            libraryId,
            userId,
            body.permissions
        );
        return { message: 'Permissions removed successfully' };
    }

    @Put(':userId/set-all')
    @ApiOperation({ summary: 'Set all permissions for user (replace existing)' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiBody({ type: SetAllPermissionsDto })
    @ApiResponse({ status: 200, description: 'Permissions updated successfully' })
    async setAllPermissions(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Body() setAllPermissionsDto: SetAllPermissionsDto
    ): Promise<{ message: string }> {
        await this.permissionService.setAllPermissions(
            libraryId,
            userId,
            setAllPermissionsDto.permissions
        );
        return { message: 'Permissions updated successfully' };
    }

    @Delete(':userId/clear-all')
    @ApiOperation({ summary: 'Clear all permissions for user' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'All permissions cleared successfully' })
    async clearAllPermissions(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string
    ): Promise<{ message: string }> {
        await this.permissionService.clearAllPermissions(libraryId, userId);
        return { message: 'All permissions cleared successfully' };
    }

    @Get(':userId/check/:permission')
    @ApiOperation({ summary: 'Check if user has specific permission' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'permission', description: 'Permission name' })
    @ApiResponse({ status: 200, description: 'Permission check result', type: HasPermissionResponse })
    async hasPermission(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Param('permission') permission: string
    ): Promise<HasPermissionResponse> {
        const hasPermission = await this.permissionService.hasPermission(libraryId, userId, permission);
        const value = await this.permissionService.getPermissionValue(libraryId, userId, permission);

        return {
            userId,
            libraryId,
            permission,
            hasPermission,
            value
        };
    }
}