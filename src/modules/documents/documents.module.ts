import { Module } from '@nestjs/common';
import { DocumentsService } from './services/documents.service';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentTemplateService } from './services/document-template.service';
import { DocumentTemplatesController } from './controllers/document-template.controller';
import { DocumentCollaboratorService } from './services/document-collaborator.service';
import { DocumentCollaboratorController } from './controllers/document-collaborator.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    UserModule
  ],
  providers: [
    DocumentsService,
    DocumentTemplateService,
    DocumentCollaboratorService,
  ],
  controllers: [
    DocumentsController,
    DocumentTemplatesController,
    DocumentCollaboratorController
  ],
  exports: [DocumentsService]
})
export class DocumentsModule {}
