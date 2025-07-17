import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { InstitutionService } from './institution.service';
import { InstitutionResponse } from './dto/institution.response';
import { ErrorDto } from 'src/common/dto/error.dto';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { INSTUTION_MESSAGES } from './constants/institution.messages';
import { Roles } from 'src/common/decorators/roles.decorators';
import { UserType } from 'generated/prisma';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { ApiErrorResponse, ApiSuccessArrayResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';

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
    @ApiSuccessResponse(InstitutionResponse, 200, INSTUTION_MESSAGES.INSTUTION_CREATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_MESSAGES.FORBIDDEN)
    @ApiErrorResponse(404, INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND)
    @ApiErrorResponse(409, INSTUTION_MESSAGES.INSTITUTION_ALREADY_EXISTS)
    async create(@Body() data: CreateInstitutionDto): Promise<ResponseDto> {
        const institution = await this.institutionService.create(data);

        return {
            message: INSTUTION_MESSAGES.INSTUTION_CREATED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: institution
        }
    }

    @Get()
    @Roles(UserType.admin)
    @ApiOperation({ summary: 'Get All Institutions', description: 'Returns all institutions' })
    @ApiSuccessArrayResponse(InstitutionResponse, 200, 'Institutions found successfully')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_MESSAGES.FORBIDDEN)
    async getAll(): Promise<ResponseDto> {
        const institutions = await this.institutionService.getAll();

        return {
            message: 'Institutions found successfully',
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: institutions
        }
    }

    @Get(':institutionId')
    @Roles(UserType.admin, UserType.institutional, UserType.individual, UserType.institutional_admin)
    @ApiOperation({ summary: 'Get Institution By Id', description: 'Returns institution by id' })
    @ApiSuccessResponse(InstitutionResponse, 200, "Institution found successfully")
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_MESSAGES.FORBIDDEN)
    @ApiErrorResponse(404, INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND)
    async getInstitutionById(@Body() institutionId: string): Promise<ResponseDto> {
        const institution = await this.institutionService.getInstitutionById(institutionId);

        return {
            message: "Institution found successfully",
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: institution
        }
    }

    @Put(':institutionId')
    @Roles(UserType.admin, UserType.institutional_admin)
    @ApiOperation({ summary: 'Update Institution', description: 'Returns updated institution' })
    @ApiSuccessResponse(InstitutionResponse, 200, INSTUTION_MESSAGES.INSTUTION_UPDATED_SUCCESSFULLY)
    @ApiResponse({ status: 400, type: ErrorDto, description: COMMON_MESSAGES.INVALID_CREDENTIALS })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_MESSAGES.FORBIDDEN)
    @ApiErrorResponse(404, INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND)
    async update(@Param('institutionId') institutionId: string, @Body() data: CreateInstitutionDto): Promise<ResponseDto> {
        const institution = await this.institutionService.update(institutionId, data);

        return {
            message: INSTUTION_MESSAGES.INSTUTION_UPDATED_SUCCESSFULLY,
            statusCode: 200,
            success: true,
            timestamp: new Date().toISOString(),
            data: institution
        }
    }

    @Delete(':institutionId')
    @Roles(UserType.admin, UserType.institutional_admin)
    @ApiParam({ name: 'institutionId', type: String })
    @ApiOperation({ summary: 'Delete Institution', description: 'Returns deleted institution' })
    @ApiResponse({
        status: 200,
        description: INSTUTION_MESSAGES.INSTITUTION_DELETED_SUCCESSFULLY,
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: INSTUTION_MESSAGES.INSTITUTION_DELETED_SUCCESSFULLY },
                statusCode: { type: 'number', example: 200 },
                timestamp: { type: 'string', example: '2025-07-17T13:16:33.966Z' },
                data: { type: 'object', nullable: true, example: null }
            }
        }
    })
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiErrorResponse(403, COMMON_MESSAGES.FORBIDDEN)
    @ApiErrorResponse(404, INSTUTION_MESSAGES.INSTITUTION_NOT_FOUND)
    async delete(@Param('institutionId') institutionId: string): Promise<ResponseDto> {
        await this.institutionService.delete(institutionId);

        return ResponseDto.success(INSTUTION_MESSAGES.INSTITUTION_DELETED_SUCCESSFULLY);
    }
}
