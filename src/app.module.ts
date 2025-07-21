import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { InstitutionModule } from './modules/institution/institution.module';
import { LibrariesModule } from './modules/libraries/libraries.module';
import { ReferencesModule } from './modules/references/references.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CitationsModule } from './modules/citations/citations.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { OfficeIntegrationModule } from './modules/office-integration/office-integration.module';

@Module({
  imports: [DatabaseModule, UserModule, AuthModule, InstitutionModule, LibrariesModule, ReferencesModule, DocumentsModule, CitationsModule, CollaborationModule, OfficeIntegrationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
