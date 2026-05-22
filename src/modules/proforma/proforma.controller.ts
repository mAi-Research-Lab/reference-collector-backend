import { Body, Controller, Post, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserType } from 'generated/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from 'src/common/guard/role.guard';
import { Roles } from 'src/common/decorators/roles.decorators';
import { ProformaService } from './proforma.service';
import { ProformaInvoiceDto } from './dto/proforma-invoice.dto';

@Controller('proforma')
@ApiTags('Proforma')
@UseGuards(JwtAuthGuard, RoleGuard)
@ApiSecurity('bearer')
@Roles(UserType.admin)
export class ProformaController {
    constructor(private readonly proformaService: ProformaService) {}

    @Post('generate')
    @ApiOperation({ summary: 'Generate proforma invoice PDF (admin)' })
    async generate(@Body() data: ProformaInvoiceDto, @Res() res: Response) {
        try {
            const pdfBuffer = await this.proformaService.generatePdf(data);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="proforma-${data.invoiceNumber || 'draft'}.pdf"`,
                'Content-Length': pdfBuffer.length,
            });

            res.status(HttpStatus.OK).send(pdfBuffer);
        } catch (error) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Proforma fatura oluşturulurken hata oluştu.',
                error: (error as Error).message,
            });
        }
    }
}
