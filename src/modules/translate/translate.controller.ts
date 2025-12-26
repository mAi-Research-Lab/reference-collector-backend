import { Controller, Post, Body, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { TranslateService } from './translate.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { TranslateTextDto } from './dto/translate-text.dto';
import { TranslateDocumentDto } from './dto/translate-document.dto';
import { TranslationResponse } from './dto/translation.response';
import { ApiSuccessResponse, ApiErrorResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { COMMON_MESSAGES } from 'src/common/constants/common.messages';
import { memoryStorage } from 'multer';

@ApiTags('Translation')
@Controller('translate')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiBearerAuth()
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Post('text')
  @ApiOperation({ 
    summary: 'Translate text',
    description: 'Translate one or more texts using DeepL API. Supports multiple languages.'
  })
  @ApiSuccessResponse(TranslationResponse, 200, 'Translation completed successfully')
  @ApiErrorResponse(400, 'Bad request - Invalid input')
  @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
  @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
  async translateText(
    @Body() translateTextDto: TranslateTextDto,
  ): Promise<ResponseDto<TranslationResponse>> {
    const result = await this.translateService.translateText(translateTextDto);
    
    return {
      success: true,
      statusCode: 200,
      message: 'Translation completed successfully',
      data: result,
      timestamp: new Date().toISOString()
    };
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Translate document',
    description: 'Upload a document and translate it. Supported formats: PDF, DOCX, PPTX, XLSX, etc.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'targetLang'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file to translate'
        },
        targetLang: {
          type: 'string',
          example: 'TR',
          description: 'Target language code',
          enum: ['AR', 'BG', 'CS', 'DA', 'DE', 'EL', 'EN-GB', 'EN-US', 'ES', 'ES-419', 'ET', 'FI', 'FR', 'HE', 'HU', 'ID', 'IT', 'JA', 'KO', 'LT', 'LV', 'NB', 'NL', 'PL', 'PT-BR', 'PT-PT', 'RO', 'RU', 'SK', 'SL', 'SV', 'TH', 'TR', 'UK', 'VI', 'ZH', 'ZH-HANS', 'ZH-HANT']
        },
        sourceLang: {
          type: 'string',
          example: 'EN',
          description: 'Source language code (optional, auto-detect if not provided)',
          enum: ['AR', 'BG', 'CS', 'DA', 'DE', 'EL', 'EN', 'ES', 'ET', 'FI', 'FR', 'HE', 'HU', 'ID', 'IT', 'JA', 'KO', 'LT', 'LV', 'NB', 'NL', 'PL', 'PT', 'RO', 'RU', 'SK', 'SL', 'SV', 'TH', 'TR', 'UK', 'VI', 'ZH']
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Document translated successfully',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    },
    headers: {
      'Content-Disposition': {
        description: 'File download header with translated filename',
        schema: { type: 'string' }
      }
    }
  })
  @ApiErrorResponse(400, 'Bad request - Invalid file or parameters')
  @ApiErrorResponse(401, COMMON_MESSAGES.UNAUTHORIZED)
  @ApiErrorResponse(500, COMMON_MESSAGES.INTERNAL_SERVER_ERROR)
  async translateDocument(
    @Body() translateDocumentDto: TranslateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'No file uploaded',
        timestamp: new Date().toISOString()
      });
    }

    const result = await this.translateService.translateDocument(
      file,
      translateDocumentDto.targetLang,
      translateDocumentDto.sourceLang
    );

    const encodedFilename = encodeURIComponent(`translated_${result.originalName}`);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', result.buffer.length.toString());

    res.send(result.buffer);
  }
}

