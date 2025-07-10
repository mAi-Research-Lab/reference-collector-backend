import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { LibrariesService } from './libraries.service';
import { CreateLibrariesDto } from './dto/create-libraries.dto';
import { LIBRARY_MESSAGES } from './constants/library.messages';
import { LibraryResponse } from './dto/response/libraries.response';
import { ErrorDto } from 'src/common/dto/error.dto';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { UpdateLibrariesDto } from './dto/update-libraries.dto';
import { User } from '../user/decorators/user.decorator';

@Controller('libraries')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class LibrariesController {
    constructor(
        private readonly librariesService: LibrariesService
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create library', description: 'Returns created library' })
    @ApiResponse({
        status: 201,
        description: LIBRARY_MESSAGES.LIBRARY_CREATED_SUCCESSFULLY,
        type: LibraryResponse
    })
    @ApiResponse({ status: 400, type: ErrorDto, description: COMMON_MESSAGES.INVALID_CREDENTIALS })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    async create(@Body() data: CreateLibrariesDto) {
        return await this.librariesService.create(data);
    }

    @Get()
    @ApiOperation({ summary: 'Get all libraries', description: 'Returns all libraries' })
    @ApiResponse({
        status: 200,
        description: LIBRARY_MESSAGES.LIBRARIES_FETCHED_SUCCESSFULLY,
        type: [LibraryResponse]
    })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    async getAll() {
        return await this.librariesService.getAll();
    }

    @Get('personal')
    @ApiOperation({ summary: 'Get user personal libraries', description: 'Returns user personal libraries' })
    @ApiResponse({
        status: 200,
        description: LIBRARY_MESSAGES.LIBRARIES_FETCHED_SUCCESSFULLY,
        type: [LibraryResponse]
    })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    async getUserLibraries(@User() user: any) {
        return await this.librariesService.getUserLibraries(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get library by id', description: 'Returns library by id' })
    @ApiResponse({
        status: 200,
        description: LIBRARY_MESSAGES.LIBRARY_FETCHED_SUCCESSFULLY,
        type: LibraryResponse
    })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    @ApiResponse({ status: 404, type: ErrorDto, description: LIBRARY_MESSAGES.LIBRARY_NOT_FOUND })
    async getLibraryById(@Param('id') id: string) {
        return await this.librariesService.getLibraryById(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update library by id', description: 'Returns updated library' })
    @ApiResponse({
        status: 200,
        description: LIBRARY_MESSAGES.LIBRARY_UPDATED_SUCCESSFULLY,
        type: LibraryResponse
    })
    @ApiResponse({ status: 400, type: ErrorDto, description: COMMON_MESSAGES.INVALID_CREDENTIALS })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    @ApiResponse({ status: 404, type: ErrorDto, description: LIBRARY_MESSAGES.LIBRARY_NOT_FOUND })
    async update(@Param('id') id: string, @Body() data: UpdateLibrariesDto) {
        return await this.librariesService.update(id, data);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete library by id', description: 'Returns deleted library' })
    @ApiResponse({
        status: 200,
        description: LIBRARY_MESSAGES.LIBRARY_DELETED_SUCCESSFULLY,
        type: LibraryResponse
    })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    @ApiResponse({ status: 404, type: ErrorDto, description: LIBRARY_MESSAGES.LIBRARY_NOT_FOUND })
    async delete(@Param() id: string) {
        return await this.librariesService.delete(id);
    }

    @Post('personal')
    @ApiOperation({ summary: 'Create personal library', description: 'Returns created personal library' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                institutionId: { type: 'string' }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: LIBRARY_MESSAGES.LIBRARY_CREATED_SUCCESSFULLY,
        type: LibraryResponse
    })
    @ApiResponse({ status: 400, type: ErrorDto, description: COMMON_MESSAGES.INVALID_CREDENTIALS })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    async createPersonalLibrary(@User() user: any, @Body() data: { name: string, description?: string, institutionId?: string }) {        
        return await this.librariesService.createPersonalLibrary(user.id, data);
    }
}
