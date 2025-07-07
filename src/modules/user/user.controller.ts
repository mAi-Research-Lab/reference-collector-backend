import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { UserResponse } from './dto/user.response';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { User as UserDecorator } from './decorators/user.decorator';
import { ErrorDto } from 'src/common/dto/error.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(
        private readonly userService: UserService
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create user', description: 'return created user' })
    @ApiResponse({
        status: 201,
        description: 'Returns created user',
        type: UserResponse
    })
    @ApiResponse({ 
        status: 409, 
        description: COMMON_MESSAGES.EMAIL_ALREADY_EXISTS,
        type: ErrorDto
    })
    @ApiResponse({ 
        status: 500, 
        description: COMMON_MESSAGES.INTERNAL_SERVER_ERROR,
        type: ErrorDto
    })
    async create(@Body() data: CreateUserDto) {
        return await this.userService.create(data);
    }

    @Get('current')
    @ApiOperation({ summary: 'Get current user', description: 'Returns the authenticated user\'s information' })
    @ApiResponse({
        status: 200,
        description: 'Returns current user information',
        type: UserResponse
    })
    @ApiResponse({ 
        status: 401,
        type: ErrorDto, 
        description: COMMON_MESSAGES.UNAUTHORIZED 
    })
    @ApiResponse({ 
        status: 403, 
        description: COMMON_MESSAGES.UNAUTHORIZED,
        type: ErrorDto
    })
    @ApiResponse({ 
        status: 404, 
        description: COMMON_MESSAGES.USER_NOT_FOUND,
        type: ErrorDto
    })
    getCurrent(@UserDecorator('id') id: string): Promise<UserResponse> {        
        return this.userService.findById(id);
    }

    @Put('current')
    @ApiOperation({ summary: 'Update current user', description: 'Returns the updated user\'s information' })
    @ApiResponse({
        status: 200,
        description: 'Returns updated user information',
        type: UserResponse
    })
    @ApiResponse({ 
        status: 401,
        type: ErrorDto, 
        description: COMMON_MESSAGES.UNAUTHORIZED 
    })
    @ApiResponse({ 
        status: 403, 
        description: COMMON_MESSAGES.UNAUTHORIZED,
        type: ErrorDto
    })
    @ApiResponse({ 
        status: 404, 
        description: COMMON_MESSAGES.USER_NOT_FOUND,
        type: ErrorDto
    })
    @ApiResponse({
        status: 500,
        description: COMMON_MESSAGES.INTERNAL_SERVER_ERROR,
        type: ErrorDto
    })
    updateCurrent(@UserDecorator('id') id: string, @Body() data: UpdateUserDto): Promise<UserResponse> {
        return this.userService.update(id, data);
    }
}
