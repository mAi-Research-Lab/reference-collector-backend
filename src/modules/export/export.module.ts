import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { BibtexExportService } from './services/bibtex.service';
import { RisExportService } from './services/ris.service';
import { RtfExportService } from './services/rtf.service';
import { HtmlExportService } from './services/html.service';
import { ReferencesModule } from '../references/references.module';
import { CsvExportService } from './services/csv.service';

@Module({
  imports: [
    ReferencesModule
  ],
  providers: [
    ExportService,
    BibtexExportService,
    RisExportService,
    RtfExportService,
    HtmlExportService,
    CsvExportService
  ],
  controllers: [ExportController]
})
export class ExportModule {}
