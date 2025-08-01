import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    ParseUUIDPipe,
    ParseIntPipe,
    ParseBoolPipe
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
    ApiBody
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { GetUser } from 'src/modules/auth/decorators/get-user.decorator';
import { LibraryTemplateService } from '../services/library-template.service';
import {
    CreateLibraryTemplateDto,
    UpdateLibraryTemplateDto,
    CreateLibraryFromTemplateDto,
    TemplateCategory
} from '../dto/templates/library-template.dto';
import {
    LibraryTemplateResponseDto,
    TemplateUsageStatsDto,
    CreateLibraryFromTemplateResponseDto,
    TemplateSearchResultDto,
    TemplateRecommendationDto
} from '../dto/templates/library-template-response.dto';
import { ResponseDto } from 'src/common/dto/response.dto';

@ApiTags('Library Templates')
@Controller('library-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LibraryTemplateController {
    constructor(
        private readonly templateService: LibraryTemplateService
    ) {}

    @Post()
    @ApiOperation({ 
        summary: 'Create a new library template',
        description: 'Create a reusable library template with predefined collections and settings'
    })
    @ApiBody({ type: CreateLibraryTemplateDto })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'Template created successfully',
        type: LibraryTemplateResponseDto
    })
    @ApiResponse({ 
        status: HttpStatus.CONFLICT, 
        description: 'Template with this name already exists' 
    })
    async createTemplate(
        @GetUser('id') userId: string,
        @Body() createTemplateDto: CreateLibraryTemplateDto
    ): Promise<ResponseDto<LibraryTemplateResponseDto>> {
        const template = await this.templateService.createTemplate(userId, createTemplateDto);
        
        return {
            success: true,
            message: 'Template created successfully',
            data: template
        };
    }

    @Get()
    @ApiOperation({ 
        summary: 'Get all public library templates',
        description: 'Retrieve paginated list of public library templates with filtering options'
    })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
    @ApiQuery({ name: 'category', required: false, enum: TemplateCategory, description: 'Filter by category' })
    @ApiQuery({ name: 'isOfficial', required: false, type: Boolean, description: 'Filter by official templates' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in name, description, and tags' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Templates retrieved successfully',
        type: TemplateSearchResultDto
    })
    async getAllTemplates(
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
        @Query('category') category?: TemplateCategory,
        @Query('isOfficial', new ParseBoolPipe({ optional: true })) isOfficial?: boolean,
        @Query('search') search?: string
    ): Promise<ResponseDto<TemplateSearchResultDto>> {
        const result = await this.templateService.getAllTemplates(
            page, 
            limit, 
            category, 
            isOfficial, 
            search
        );
        
        return {
            success: true,
            message: 'Templates retrieved successfully',
            data: result
        };
    }

    @Get('recommendations')
    @ApiOperation({ 
        summary: 'Get template recommendations',
        description: 'Get personalized template recommendations based on user preferences'
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Recommendations retrieved successfully',
        type: TemplateRecommendationDto
    })
    async getRecommendations(
        @GetUser('id') userId: string
    ): Promise<ResponseDto<TemplateRecommendationDto>> {
        const recommendations = await this.templateService.getRecommendations(userId);
        
        return {
            success: true,
            message: 'Recommendations retrieved successfully',
            data: recommendations
        };
    }

    @Get(':id')
    @ApiOperation({ 
        summary: 'Get template by ID',
        description: 'Retrieve detailed information about a specific library template'
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Template retrieved successfully',
        type: LibraryTemplateResponseDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Template not found' 
    })
    async getTemplateById(
        @Param('id', ParseUUIDPipe) templateId: string
    ): Promise<ResponseDto<LibraryTemplateResponseDto>> {
        const template = await this.templateService.getTemplateById(templateId);
        
        return {
            success: true,
            message: 'Template retrieved successfully',
            data: template
        };
    }

    @Get(':id/stats')
    @ApiOperation({ 
        summary: 'Get template usage statistics',
        description: 'Retrieve detailed usage statistics for a specific template'
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Statistics retrieved successfully',
        type: TemplateUsageStatsDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Template not found' 
    })
    async getTemplateStats(
        @Param('id', ParseUUIDPipe) templateId: string
    ): Promise<ResponseDto<TemplateUsageStatsDto>> {
        const stats = await this.templateService.getTemplateUsageStats(templateId);
        
        return {
            success: true,
            message: 'Statistics retrieved successfully',
            data: stats
        };
    }

    @Put(':id')
    @ApiOperation({ 
        summary: 'Update library template',
        description: 'Update an existing library template (only by creator or admin)'
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    @ApiBody({ type: UpdateLibraryTemplateDto })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Template updated successfully',
        type: LibraryTemplateResponseDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Template not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'No permission to update this template' 
    })
    async updateTemplate(
        @Param('id', ParseUUIDPipe) templateId: string,
        @GetUser('id') userId: string,
        @Body() updateTemplateDto: UpdateLibraryTemplateDto
    ): Promise<ResponseDto<LibraryTemplateResponseDto>> {
        const template = await this.templateService.updateTemplate(
            templateId, 
            userId, 
            updateTemplateDto
        );
        
        return {
            success: true,
            message: 'Template updated successfully',
            data: template
        };
    }

    @Delete(':id')
    @ApiOperation({ 
        summary: 'Delete library template',
        description: 'Delete a library template (only by creator or admin)'
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Template deleted successfully' 
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Template not found' 
    })
    @ApiResponse({ 
        status: HttpStatus.FORBIDDEN, 
        description: 'No permission to delete this template' 
    })
    async deleteTemplate(
        @Param('id', ParseUUIDPipe) templateId: string,
        @GetUser('id') userId: string
    ): Promise<ResponseDto<{ message: string }>> {
        const result = await this.templateService.deleteTemplate(templateId, userId);
        
        return {
            success: true,
            message: result.message,
            data: result
        };
    }

    @Post(':id/create-library')
    @ApiOperation({ 
        summary: 'Create library from template',
        description: 'Create a new library using a template as the foundation'
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    @ApiBody({ type: CreateLibraryFromTemplateDto })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'Library created from template successfully',
        type: CreateLibraryFromTemplateResponseDto
    })
    @ApiResponse({ 
        status: HttpStatus.NOT_FOUND, 
        description: 'Template not found' 
    })
    async createLibraryFromTemplate(
        @Param('id', ParseUUIDPipe) templateId: string,
        @GetUser('id') userId: string,
        @Body() createLibraryDto: CreateLibraryFromTemplateDto
    ): Promise<ResponseDto<CreateLibraryFromTemplateResponseDto>> {
        // Set the template ID from the URL parameter
        createLibraryDto.templateId = templateId;
        
        const result = await this.templateService.createLibraryFromTemplate(
            userId, 
            createLibraryDto
        );
        
        return {
            success: true,
            message: 'Library created from template successfully',
            data: result
        };
    }
}
