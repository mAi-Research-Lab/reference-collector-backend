import { Module } from '@nestjs/common';
import { CitationsController } from './controller/citations.controller';
import { UserModule } from '../user/user.module';
import { DocumentsModule } from '../documents/documents.module';
import { ReferencesModule } from '../references/references.module';
import { DocumentCollaboratorService } from '../documents/services/document-collaborator.service';
import { CitationsService } from './services/citations.service';
import { CitationStylesService } from './services/citation-styles.service';
import { CitationStylesController } from './controller/citation-styles.controller';

@Module({
  imports: [
    UserModule,
    DocumentsModule,
    ReferencesModule,
  ],
  providers: [
    CitationsService, 
    DocumentCollaboratorService,
    CitationStylesService
  ],
  controllers: [CitationsController, CitationStylesController]
})
export class CitationsModule {}
