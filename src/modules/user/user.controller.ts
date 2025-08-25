import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiOperation, ApiResponse, ApiSecurity, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RemainingStorageResponse, UserResponse } from './dto/user.response';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { User as UserDecorator } from './decorators/user.decorator';
import { ErrorDto } from 'src/common/dto/error.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { ApiErrorResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

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

    @Post('avatar')
    @UseInterceptors(FileInterceptor('avatar'))
    @ApiOperation({ summary: 'Upload user avatar', description: 'Upload avatar image for current user' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                avatar: {
                    type: 'string',
                    format: 'binary',
                    description: 'Avatar image file (JPEG, PNG, WebP - Max 5MB)',
                },
            },
        },
    })
    @ApiSuccessResponse(UserResponse, 200, "Avatar uploaded successfully")
    @ApiErrorResponse(400, 'Invalid file or validation error')
    @ApiErrorResponse(404, COMMON_MESSAGES.USER_NOT_FOUND)
    @ApiErrorResponse(500, 'Server error')
    async uploadAvatar(
        @UploadedFile() file: Express.Multer.File,
        @UserDecorator('id') userId: string,
    ): Promise<ResponseDto> {
        const result = await this.userService.uploadAvatar(userId, file);

        return {
            message: "Avatar uploaded successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: result
        };
    }

    @Delete('avatar')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete user avatar', description: 'Delete avatar image of current user' })
    @ApiSuccessResponse(Object, 200, "Avatar deleted successfully")
    @ApiErrorResponse(400, 'No avatar found')
    @ApiErrorResponse(404, COMMON_MESSAGES.USER_NOT_FOUND)
    @ApiErrorResponse(500, 'Server error')
    async deleteAvatar(@UserDecorator('id') userId: string): Promise<ResponseDto> {
        const result = await this.userService.deleteAvatar(userId);

        return {
            message: result.message,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: null
        };
    }

    @Get('/remaining-storage')
    @ApiOperation({ summary: 'Get remaining storage', description: 'Returns the remaining storage of the user' })
    @ApiSuccessResponse(RemainingStorageResponse, 200, "Remaining storage retrieved successfully")
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, COMMON_MESSAGES.USER_NOT_FOUND)
    @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
    async getRemainingStorage(@UserDecorator() user: any): Promise<ResponseDto> {
        const remainingStorage = await this.userService.getRemainingStorage(user.id);
        return {
            message: "Remaining storage retrieved successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: remainingStorage
        }
    }
}