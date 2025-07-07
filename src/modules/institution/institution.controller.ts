import { Body, Controller, Delete, Get, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { InstitutionService } from './institution.service';
import { InstitutionResponse } from './dto/institution.response';
import { ErrorDto } from 'src/common/dto/error.dto';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { INSTUTION_MESSAGES } from './constants/institution.messages';
import { Roles } from 'src/common/decorators/roles.decorators';
import { UserType } from 'generated/prisma';

@Controller('institution')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class InstitutionController {
    constructor(
        private readonly institutionService: InstitutionService
    ) { }

    @Post()
    @Roles(UserType.admin)
    @ApiOperation({ summary: 'Create Institution', description: 'Returns created institution' })
    @ApiResponse({
        status: 200,
        description: INSTUTION_MESSAGES.INSTUTION_CREATED_SUCCESSFULLY,
        type: InstitutionResponse
    })
    @ApiResponse({ status: 400, type: ErrorDto, description: COMMON_MESSAGES.INVALID_CREDENTIALS })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    @ApiResponse({ status: 403, type: ErrorDto, description: COMMON_MESSAGES.FORBIDDEN })
    @ApiResponse({ status: 404, type: ErrorDto, description: INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND })
    @ApiResponse({ status: 409, type: ErrorDto, description: INSTUTION_MESSAGES.INSTITUTION_ALREADY_EXISTS })
    async create(@Body() data: CreateInstitutionDto): Promise<InstitutionResponse> {
        return await this.institutionService.create(data);
    }

    @Get()
    @Roles(UserType.admin)
    @ApiOperation({ summary: 'Get All Institutions', description: 'Returns all institutions' })
    @ApiResponse({
        status: 200,
        description: 'Institutions found successfully',
        type: [InstitutionResponse]
    })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    @ApiResponse({ status: 403, type: ErrorDto, description: COMMON_MESSAGES.FORBIDDEN })
    async getAll(): Promise<InstitutionResponse[]> {
        return await this.institutionService.getAll();
    }

    @Get(':institutionId')
    @Roles(UserType.admin, UserType.institutional, UserType.individual, UserType.institutional_admin)
    @ApiOperation({ summary: 'Get Institution By Id', description: 'Returns institution by id' })
    @ApiResponse({
        status: 200,
        description: 'Institution found successfully',
        type: InstitutionResponse
    })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    @ApiResponse({ status: 403, type: ErrorDto, description: COMMON_MESSAGES.FORBIDDEN })
    @ApiResponse({ status: 404, type: ErrorDto, description: INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND })
    async getInstitutionById(@Body() institutionId: string): Promise<InstitutionResponse> {
        return await this.institutionService.getInstitutionById(institutionId);
    }

    @Put(':institutionId')
    @Roles(UserType.admin, UserType.institutional_admin)
    @ApiOperation({ summary: 'Update Institution', description: 'Returns updated institution' })
    @ApiResponse({
        status: 200,
        description: INSTUTION_MESSAGES.INSTUTION_UPDATED_SUCCESSFULLY,
        type: InstitutionResponse
    })
    @ApiResponse({ status: 400, type: ErrorDto, description: COMMON_MESSAGES.INVALID_CREDENTIALS })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    @ApiResponse({ status: 403, type: ErrorDto, description: COMMON_MESSAGES.FORBIDDEN })
    @ApiResponse({ status: 404, type: ErrorDto, description: INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND })
    async update(@Body() institutionId: string, @Body() data: CreateInstitutionDto): Promise<InstitutionResponse> {
        return await this.institutionService.update(institutionId, data);
    }

    @Delete(':institutionId')
    @Roles(UserType.admin, UserType.institutional_admin)
    @ApiOperation({ summary: 'Delete Institution', description: 'Returns deleted institution' })
    @ApiResponse({
        status: 200,
        description: INSTUTION_MESSAGES.INSTITUTION_DELETED_SUCCESSFULLY,
        type: InstitutionResponse
    })
    @ApiResponse({ status: 401, type: ErrorDto, description: COMMON_MESSAGES.UNAUTHORIZED })
    @ApiResponse({ status: 403, type: ErrorDto, description: COMMON_MESSAGES.FORBIDDEN })
    @ApiResponse({ status: 404, type: ErrorDto, description: INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND })
    async delete(@Body() institutionId: string): Promise<InstitutionResponse> {
        return await this.institutionService.delete(institutionId);
    }
}
