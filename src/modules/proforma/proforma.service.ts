import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { ProformaInvoiceDto } from './dto/proforma-invoice.dto';

@Injectable()
export class ProformaService {
    private readonly logger = new Logger(ProformaService.name);
    private readonly templatePath = path.join(
        process.cwd(),
        fs.existsSync(path.join(process.cwd(), 'dist', 'modules', 'proforma', 'templates', 'proforma-invoice-template.html'))
            ? 'dist/modules/proforma/templates'
            : 'src/modules/proforma/templates',
        'proforma-invoice-template.html',
    );

    private populateTemplate(template: string, data: ProformaInvoiceDto): string {
        const replacements: Record<string, string> = {
            invoiceNumber: data.invoiceNumber || 'DRAFT',
            invoiceDate: data.invoiceDate || new Date().toLocaleDateString('tr-TR'),
            customerName: data.customerName || '-',
            customerAddress: data.customerAddress || '-',
            serviceName: data.serviceName || 'Citext Abonelik Hizmeti',
            servicePeriod: data.servicePeriod || '-',
            unitPrice: data.unitPrice || '-',
            kdvRate: data.kdvRate || '0',
            totalAmount: data.totalAmount || '-',
            notes: data.notes || '',
            signatureName: data.signatureName || '',
        };

        let html = template;
        for (const [key, value] of Object.entries(replacements)) {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        if (!data.notes) {
            html = html.replace(/{{#if notes}}[\s\S]*?{{\/if}}/g, '');
        } else {
            html = html.replace(/{{#if notes}}/g, '').replace(/{{\/if}}/g, '');
        }

        return html;
    }

    async generatePdf(data: ProformaInvoiceDto): Promise<Buffer> {
        let browser: puppeteer.Browser | null = null;

        try {
            const template = fs.readFileSync(this.templatePath, 'utf8');
            const html = this.populateTemplate(template, data);

            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });

            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
            });

            this.logger.log(`Proforma PDF generated: ${data.invoiceNumber}`);
            return Buffer.from(pdfBuffer);
        } catch (error) {
            this.logger.error('Proforma PDF generation failed', error);
            throw error;
        } finally {
            if (browser) await browser.close();
        }
    }
}
