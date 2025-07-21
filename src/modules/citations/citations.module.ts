import { Module } from '@nestjs/common';
import { CitationsService } from './citations.service';
import { CitationsController } from './citations.controller';
import { UserModule } from '../user/user.module';
import { DocumentsModule } from '../documents/documents.module';
import { ReferencesModule } from '../references/references.module';
import { DocumentCollaboratorService } from '../documents/services/document-collaborator.service';

@Module({
  imports: [
    UserModule,
    DocumentsModule,
    ReferencesModule,
  ],
  providers: [CitationsService, DocumentCollaboratorService],
  controllers: [CitationsController]
})
export class CitationsModule {}
