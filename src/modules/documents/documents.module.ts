import { Module } from '@nestjs/common';
import { DocumentsService } from './services/documents.service';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentTemplateService } from './services/document-template.service';
import { DocumentTemplatesController } from './controllers/document-template.controller';

@Module({
  providers: [
    DocumentsService,
    DocumentTemplateService
  ],
  controllers: [
    DocumentsController,
    DocumentTemplatesController
  ]
})
export class DocumentsModule {}
