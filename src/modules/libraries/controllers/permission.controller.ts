import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { PermissionService } from "../service/permission.service";
import { HasPermissionResponse, PermissionResponse } from "../dto/response/permission.response";
import { AddPermissionDto, MultiplePermissionsDto, SetAllPermissionsDto } from "../dto/create-permissions.dto";
import { ApiSuccessResponse, ApiErrorResponse } from "src/common/decorators/api-response-wrapper.decorator";
import { ResponseDto } from "src/common/dto/api-response.dto";
import { COMMON_MESSAGES } from "src/common/constants/common.messages";

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
    @ApiSuccessResponse(PermissionResponse, 200, "User permissions retrieved successfully")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "User or library not found")
    async getUserPermissions(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string
    ): Promise<ResponseDto> {
        const membership = await this.permissionService.getUserPermissions(libraryId, userId);
        const permissionData = {
            userId: membership.userId,
            libraryId: membership.libraryId,
            role: membership.role,
            permissions: membership.permissions as Record<string, any> || {}
        };

        return {
            message: "User permissions retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: permissionData
        };
    }

    @Post(':libraryId/:userId/add')
    @ApiOperation({ summary: 'Add permission to user' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiSuccessResponse({ message: String }, 201, "Permission added successfully")
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "User or library not found")
    async addPermission(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Body() addPermissionDto: AddPermissionDto
    ): Promise<ResponseDto> {
        await this.permissionService.addPermission(
            libraryId,
            userId,
            addPermissionDto.permission,
            addPermissionDto.value
        );

        return {
            message: "Permission added successfully",
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: { message: "Permission added successfully" }
        };
    }

    @Delete(':libraryId/:userId/remove')
    @ApiOperation({ summary: 'Remove permission from user' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'Permission removed successfully' })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "User, library or permission not found")
    async removePermission(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Body('permission') permission: string
    ): Promise<ResponseDto> {
        await this.permissionService.deletePermission(
            libraryId,
            userId,
            permission
        );

        return {
            message: "Permission removed successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: { message: "Permission removed successfully" }
        };
    }

    @Post(':libraryId/:userId/add-multiple')
    @ApiOperation({ summary: 'Add multiple permissions to user' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiSuccessResponse({ message: String }, 201, "Permissions added successfully")
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "User or library not found")
    async addMultiplePermissions(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Body() multiplePermissionsDto: MultiplePermissionsDto
    ): Promise<ResponseDto> {
        await this.permissionService.addMultiplePermissions(
            libraryId,
            userId,
            multiplePermissionsDto.permissions
        );

        return {
            message: "Permissions added successfully",
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: { message: "Permissions added successfully" }
        };
    }

    @Delete(':libraryId/:userId/remove-multiple')
    @ApiOperation({ summary: 'Remove multiple permissions from user' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'Permissions removed successfully' })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "User, library or permissions not found")
    async removeMultiplePermissions(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Body() body: { permissions: string[] }
    ): Promise<ResponseDto> {
        await this.permissionService.deleteMultiplePermissions(
            libraryId,
            userId,
            body.permissions
        );

        return {
            message: "Permissions removed successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: { message: "Permissions removed successfully" }
        };
    }

    @Put(':libraryId/:userId/set-all')
    @ApiOperation({ summary: 'Set all permissions for user (replace existing)' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiSuccessResponse({ message: String }, 200, "Permissions updated successfully")
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "User or library not found")
    async setAllPermissions(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Body() setAllPermissionsDto: SetAllPermissionsDto
    ): Promise<ResponseDto> {
        await this.permissionService.setAllPermissions(
            libraryId,
            userId,
            setAllPermissionsDto.permissions
        );

        return {
            message: "Permissions updated successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: { message: "Permissions updated successfully" }
        };
    }

    @Delete(':libraryId/:userId/clear-all')
    @ApiOperation({ summary: 'Clear all permissions for user' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'All permissions cleared successfully' })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "User or library not found")
    async clearAllPermissions(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string
    ): Promise<ResponseDto> {
        await this.permissionService.clearAllPermissions(libraryId, userId);

        return {
            message: "All permissions cleared successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: { message: "All permissions cleared successfully" }
        };
    }

    @Get(':libraryId/:userId/check/:permission')
    @ApiOperation({ summary: 'Check if user has specific permission' })
    @ApiParam({ name: 'libraryId', description: 'Library ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'permission', description: 'Permission name' })
    @ApiSuccessResponse(HasPermissionResponse, 200, "Permission check result")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, "User, library or permission not found")
    async hasPermission(
        @Param('libraryId') libraryId: string,
        @Param('userId') userId: string,
        @Param('permission') permission: string
    ): Promise<ResponseDto> {
        const hasPermission = await this.permissionService.hasPermission(libraryId, userId, permission);
        const value = await this.permissionService.getPermissionValue(libraryId, userId, permission);

        const permissionCheck = {
            userId,
            libraryId,
            permission,
            hasPermission,
            value
        };

        return {
            message: "Permission check result",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: permissionCheck
        };
    }
}