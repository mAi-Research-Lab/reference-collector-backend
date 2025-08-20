import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Res
} from "@nestjs/common";
import { ApiSecurity, ApiTags, ApiConsumes, ApiOperation, ApiBody } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from 'express';
import { RoleGuard } from "src/common/guard/role.guard";
import { JwtAuthGuard } from "src/modules/auth/guards/jwt-auth.guard";
import { CitationStylesService } from "../services/citation-styles.service";
import { ResponseDto } from "src/common/dto/api-response.dto";
import { ApiErrorResponse, ApiSuccessArrayResponse, ApiSuccessResponse } from "src/common/decorators/api-response-wrapper.decorator";
import { CitationStyleResponse } from "../dto/citation-style/citation-style.response";
import { CITATIONS_MESSAGES } from "../constants/citation.messages";
import { COMMON_MESSAGES } from "src/common/constants/common.messages";
import { FormatCitationDto } from "../dto/format-citation.dto";
import { User } from "src/modules/user/decorators/user.decorator";
import { CreateCitationStyleDto } from "../dto/citation-style/citation-style-create.dto";
import { CSLFileHandlerService } from "../services/citation-file.service";

@Controller('citations/styles')
@ApiTags('Citation Styles')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class CitationStylesController {
    constructor(
        private readonly citationStylesService: CitationStylesService,
        private readonly cslFileHandlerService: CSLFileHandlerService
    ) { }

    @Get('available')
    @ApiSuccessArrayResponse(CitationStyleResponse, 200, CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getAvailableStyles(): Promise<ResponseDto> {
        const styles = await this.citationStylesService.getAvailableStyles();

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY,
            data: styles,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Get('popular')
    @ApiSuccessArrayResponse(CitationStyleResponse, 200, CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async getPopularStyles(): Promise<ResponseDto> {
        const styles = await this.citationStylesService.getPopularStyles();

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY,
            data: styles,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Get('search')
    @ApiSuccessArrayResponse(CitationStyleResponse, 200, CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async searchStyles(@Query('q') searchTerm: string): Promise<ResponseDto> {
        const styles = await this.citationStylesService.searchStyles(searchTerm);

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.STYLES_FETCHED_SUCCESSFULLY,
            data: styles,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Post('upload')
    @ApiOperation({
        summary: 'Upload CSL file',
        description: 'Upload a Citation Style Language (.csl) file to create a new citation style. The file content will be stored and used for formatting citations.'
    })
    @ApiConsumes('multipart/form-data')
    @ApiSuccessResponse(CitationStyleResponse, 201, CITATIONS_MESSAGES.STYLE_CREATED_SUCCESSFULLY)
    @ApiErrorResponse(400, 'Invalid CSL file format or content')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @UseInterceptors(FileInterceptor('cslFile', {
        limits: {
            fileSize: 2 * 1024 * 1024
        },
        fileFilter: (req, file, callback) => {
            const allowedExtensions = ['.csl', '.xml'];
            const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

            if (allowedExtensions.includes(fileExtension)) {
                callback(null, true);
            } else {
                callback(new Error('Invalid file format. Only .csl and .xml files are allowed.'), false);
            }
        }
    }))
    @ApiBody({
        schema:{
            type: 'object',
            properties: {
                cslFile: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    async uploadCSLFile(
        @User() user: any,
        @UploadedFile() file: Express.Multer.File
    ): Promise<ResponseDto> {
        if (!file) {
            throw new Error('No CSL file uploaded. Please select a .csl or .xml file.');
        }

        const style = await this.cslFileHandlerService.uploadCSLFile(user.id, file);

        return {
            statusCode: 201,
            message: CITATIONS_MESSAGES.STYLE_CREATED_SUCCESSFULLY,
            data: style,
            success: true,
            timestamp: new Date().toISOString()
        };
    }

    @Post('import-url')
    @ApiOperation({
        summary: 'Import CSL from URL',
        description: 'Import a Citation Style Language file from a remote URL (e.g., Zotero Style Repository)'
    })
    @ApiSuccessResponse(CitationStyleResponse, 201, CITATIONS_MESSAGES.STYLE_CREATED_SUCCESSFULLY)
    @ApiErrorResponse(400, 'Invalid URL or CSL content')
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    format: 'url'
                }
            }
        }
    })
    async importCSLFromURL(
        @User() user: any,
        @Body() data: { url: string }
    ): Promise<ResponseDto> {
        if (!data.url) {
            throw new Error('URL is required');
        }

        const style = await this.cslFileHandlerService.importCSLFromURL(user.id, data.url);

        return {
            statusCode: 201,
            message: CITATIONS_MESSAGES.STYLE_CREATED_SUCCESSFULLY,
            data: style,
            success: true,
            timestamp: new Date().toISOString()
        };
    }

    @Get(':styleId/export')
    @ApiOperation({
        summary: 'Export CSL file',
        description: 'Download the original CSL file for a specific citation style'
    })
    @ApiSuccessResponse({}, 200, 'CSL file downloaded successfully')
    @ApiErrorResponse(404, CITATIONS_MESSAGES.STYLE_NOT_FOUND)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async exportCSLFile(
        @Param('styleId') styleId: string,
        @Res() res: Response
    ): Promise<void> {
        const { filename, content } = await this.cslFileHandlerService.exportCSLFile(styleId);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/xml');
        res.send(content);
    }

    @Post(':styleId/format')
    @ApiSuccessArrayResponse(CitationStyleResponse, 200, CITATIONS_MESSAGES.CITATION_FORMATTED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async formatStyles(@Param('styleId') styleId: string, @Body() data: FormatCitationDto): Promise<ResponseDto> {
        const formattedCitation = await this.citationStylesService.formatCitationWithStyle(styleId, data);

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.CITATION_FORMATTED_SUCCESSFULLY,
            data: formattedCitation,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Post(':styleId/generate-bibliography')
    @ApiSuccessArrayResponse(CitationStyleResponse, 200, CITATIONS_MESSAGES.BIBLIOGRAPHY_GENERATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async generateBibliography(@Param('styleId') styleId: string, @Body() data: { referenceIds: string[] }): Promise<ResponseDto> {
        const bibliography = await this.citationStylesService.generateBibliography(data.referenceIds, styleId);

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.BIBLIOGRAPHY_GENERATED_SUCCESSFULLY,
            data: bibliography,
            success: true,
            timestamp: new Date().toISOString()
        }
    }

    @Post()
    @ApiSuccessArrayResponse(CitationStyleResponse, 200, CITATIONS_MESSAGES.STYLE_CREATED_SUCCESSFULLY)
    @ApiErrorResponse(400, COMMON_MESSAGES.INVALID_CREDENTIALS)
    @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
    async createCitationStyle(@User() user: any, @Body() data: CreateCitationStyleDto): Promise<ResponseDto> {
        const style = await this.citationStylesService.createCustomStyle(user.id, data);

        return {
            statusCode: 200,
            message: CITATIONS_MESSAGES.STYLE_CREATED_SUCCESSFULLY,
            data: style,
            success: true,
            timestamp: new Date().toISOString()
        }
    }
}