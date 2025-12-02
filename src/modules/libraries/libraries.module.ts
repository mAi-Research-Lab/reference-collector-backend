import { Module } from '@nestjs/common';
import { LibrariesService } from './libraries.service';
import { LibrariesController } from './libraries.controller';
import { SharedService } from './service/shared.service';
import { SharedController } from './controllers/shared.controller';
import { PermissionService } from './service/permission.service';
import { PermissionController } from './controllers/permission.controller';
import { CollectionService } from './service/collection.service';
import { CollectionController } from './controllers/collection.controller';
import { LibraryTemplateService } from './services/library-template.service';
import { LibraryTemplateController } from './controllers/library-template.controller';
import { AdvancedSharingService } from './services/advanced-sharing.service';
import { AdvancedSharingController } from './controllers/advanced-sharing.controller';
import { CollaborationService } from './services/collaboration.service';
import { CollaborationController } from './controllers/collaboration.controller';
import { ReferencesModule } from '../references/references.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ReferencesModule,
    MailModule
  ],
  providers: [
    LibrariesService,
    SharedService,
    PermissionService,
    CollectionService,
    LibraryTemplateService,
    AdvancedSharingService,
    CollaborationService,
  ],
  controllers: [
    LibrariesController,
    SharedController,
    PermissionController,
    CollectionController,
    LibraryTemplateController,
    AdvancedSharingController,
    CollaborationController
  ],
  exports: [
    LibrariesService
  ]
})
export class LibrariesModule { }
