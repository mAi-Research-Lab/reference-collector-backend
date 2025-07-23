import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { LibrariesService } from './libraries.service';
import { CreateLibrariesDto } from './dto/create-libraries.dto';
import { LIBRARY_MESSAGES } from './constants/library.messages';
import { LibraryResponse } from './dto/response/libraries.response';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { UpdateLibrariesDto } from './dto/update-libraries.dto';
import { User } from '../user/decorators/user.decorator';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { ApiErrorResponse, ApiSuccessArrayResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { ReferencesService } from '../references/references.service';
import { ReferencesResponse } from '../references/dto/reference/references.response';

@Controller('libraries')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class LibrariesController {
    constructor(
        private readonly librariesService: LibrariesService,
        private readonly referencesService: ReferencesService
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create library', description: 'Returns created library' })
    @ApiSuccessResponse(LibraryResponse, 201, LIBRARY_MESSAGES.LIBRARY_CREATED_SUCCESSFULLY)
    @ApiErrorResponse(400, LIBRARY_MESSAGES.LIBRARY_ALREADY_EXISTS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async create(@Body() data: CreateLibrariesDto): Promise<ResponseDto> {
        const libraries = await this.librariesService.create(data);

        return {
            message: LIBRARY_MESSAGES.LIBRARY_CREATED_SUCCESSFULLY,
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: libraries
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get all libraries', description: 'Returns all libraries' })
    @ApiSuccessArrayResponse(LibraryResponse, 200, LIBRARY_MESSAGES.LIBRARIES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getAll(): Promise<ResponseDto> {
        const libraries = await this.librariesService.getAll();

        return {
            message: LIBRARY_MESSAGES.LIBRARIES_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: libraries
        };
    }

    @Get('personal')
    @ApiOperation({ summary: 'Get user personal libraries', description: 'Returns user personal libraries' })
    @ApiSuccessResponse(LibraryResponse, 200, LIBRARY_MESSAGES.LIBRARIES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getUserLibraries(@User() user: any): Promise<ResponseDto> {
        const libraries = await this.librariesService.getUserLibraries(user.id);

        return {
            message: LIBRARY_MESSAGES.LIBRARIES_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: libraries
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get library by id', description: 'Returns library by id' })
    @ApiSuccessResponse(LibraryResponse, 200, LIBRARY_MESSAGES.LIBRARY_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND)
    async getLibraryById(@Param('id') id: string): Promise<ResponseDto> {
        const library = await this.librariesService.getLibraryById(id);

        return {
            message: LIBRARY_MESSAGES.LIBRARY_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: library
        };
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update library by id', description: 'Returns updated library' })
    @ApiSuccessResponse(LibraryResponse, 200, LIBRARY_MESSAGES.LIBRARY_UPDATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND)
    async update(@Param('id') id: string, @Body() data: UpdateLibrariesDto): Promise<ResponseDto> {
        const library = await this.librariesService.update(id, data);

        return {
            message: LIBRARY_MESSAGES.LIBRARY_UPDATED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: library
        };
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete library by id', description: 'Returns deleted library' })
    @ApiSuccessResponse(LibraryResponse, 200, LIBRARY_MESSAGES.LIBRARY_DELETED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(404, LIBRARY_MESSAGES.LIBRARY_NOT_FOUND)
    async delete(@Param() id: string): Promise<ResponseDto> {
        const message = await this.librariesService.delete(id);

        return {
            message: message.message,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: null
        };
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
    @ApiSuccessResponse(LibraryResponse, 201, LIBRARY_MESSAGES.LIBRARY_CREATED_SUCCESSFULLY)
    @ApiErrorResponse(400, LIBRARY_MESSAGES.LIBRARY_ALREADY_EXISTS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async createPersonalLibrary(@User() user: any, @Body() data: { name: string, description?: string, institutionId?: string }): Promise<ResponseDto> {
        const library = await this.librariesService.createPersonalLibrary(user.id, data);

        return {
            message: LIBRARY_MESSAGES.LIBRARY_CREATED_SUCCESSFULLY,
            statusCode: 201,
            success: true,
            timestamp: new Date().toISOString(),
            data: library
        };
    }

    @Get('library/:libraryId')
    @ApiSuccessArrayResponse(ReferencesResponse, 200, LIBRARY_MESSAGES.LIBRARY_REFERENCES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getLibraryReferences(@Param('libraryId') libraryId: string):Promise<ResponseDto> {
        const references = await this.referencesService.getReferencesByLibrary(libraryId);

        return {
            message: LIBRARY_MESSAGES.LIBRARY_REFERENCES_FETCHED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: references
        }
    }
}
