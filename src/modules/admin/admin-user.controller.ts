import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { UserType } from 'generated/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AdminUserService } from './admin-user.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdminCreateUserDto } from './dto/create-user.dto';

@Controller('admin/users')
@ApiTags('Admin - Users')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
@Roles(UserType.admin)
export class AdminUserController {
    constructor(private readonly adminUserService: AdminUserService) {}

    @Post()
    @ApiOperation({ summary: 'Create user (admin)' })
    async create(@Body() dto: AdminCreateUserDto): Promise<ResponseDto> {
        const user = await this.adminUserService.create(dto);

        return {
            success: true,
            message: 'User created successfully',
            statusCode: 201,
            timestamp: new Date().toISOString(),
            data: user,
        };
    }

    @Get()
    @ApiOperation({ summary: 'List all users (admin)' })
    async findAll(
        @Query() query: PaginationQueryDto,
        @Query('institutionId') institutionId?: string,
        @Query('userType') userType?: string,
    ): Promise<ResponseDto> {
        const result = await this.adminUserService.findAllPaginated({
            ...query,
            institutionId,
            userType,
        });

        return {
            success: true,
            message: 'Users retrieved',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: result,
        };
    }

    @Patch(':userId/status')
    @ApiOperation({ summary: 'Update user active/verified status (admin)' })
    async updateStatus(
        @Param('userId') userId: string,
        @Body() dto: UpdateUserStatusDto,
    ): Promise<ResponseDto> {
        const user = await this.adminUserService.updateStatus(userId, dto);

        return {
            success: true,
            message: 'User status updated',
            statusCode: 200,
            timestamp: new Date().toISOString(),
            data: user,
        };
    }
}
