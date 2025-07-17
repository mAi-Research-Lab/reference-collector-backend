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
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { ApiErrorResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';

@Controller('user')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(
        private readonly userService: UserService
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create user', description: 'return created user' })
    @ApiSuccessResponse(UserResponse, 201, "User created successfully")
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(409, COMMON_MESSAGES.EMAIL_ALREADY_EXISTS)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async create(@Body() data: CreateUserDto): Promise<ResponseDto> {
        const user = await this.userService.create(data);

        return {
            message: "User created successfully",
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: user
        }
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
    @ApiSuccessResponse(UserResponse, 200, "User updated successfully")
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, COMMON_MESSAGES.USER_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async updateCurrent(@UserDecorator('id') id: string, @Body() data: UpdateUserDto): Promise<ResponseDto> {
        const user = await this.userService.update(id, data);
        
        
        return {
            message: "User updated successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: user
        } as any
    }
}
