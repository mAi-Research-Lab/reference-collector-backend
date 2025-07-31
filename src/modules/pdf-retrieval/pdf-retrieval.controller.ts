import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PdfSearchService } from './pdf-retrieval.service';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { DownloadRequestDto, PdfSearchDto } from './dto/pdf-search.dto';
import { ResponseDto } from 'src/common/dto/api-response.dto';
import { ApiErrorResponse, ApiSuccessResponse } from 'src/common/decorators/api-response-wrapper.decorator';
import { PdfSearchResultDto } from './dto/pdf-search-result.dto';

@Controller('pdf-retrieval')
@ApiTags('PDF Retrieval')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
export class PdfRetrievalController {
    constructor(
        private readonly pdfSearchService: PdfSearchService
    ) { }

    @Post('search')
    @ApiSuccessResponse(PdfSearchResultDto, 200, 'PDF search completed successfully')
    @ApiErrorResponse(400, 'Bad request')
    @ApiErrorResponse(500, 'Internal server error')
    async searchPdf(@Body() query: PdfSearchDto): Promise<ResponseDto> {
        const result = await this.pdfSearchService.searchPdf(query);

        return {
            success: true,
            data: result,
            statusCode: 200,
            message: 'PDF search completed successfully',
            timestamp: new Date().toISOString()
        }
    }

    @Post('download')
    async downloadPdf(@Body() data: DownloadRequestDto) {
        const result = await this.pdfSearchService.downloadBestPdf(data.query, data.options);

        return result;
    }

}
