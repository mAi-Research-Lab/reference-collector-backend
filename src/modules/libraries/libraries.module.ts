import { Module } from '@nestjs/common';
import { LibrariesService } from './libraries.service';
import { LibrariesController } from './libraries.controller';
import { SharedService } from './service/shared.service';
import { SharedController } from './controllers/shared.controller';
import { PermissionService } from './service/permission.service';
import { PermissionController } from './controllers/permission.controller';
import { CollectionService } from './service/collection.service';
import { CollectionController } from './controllers/collection.controller';

@Module({
  providers: [
    LibrariesService, 
    SharedService,
    PermissionService,
    CollectionService
  ],
  controllers: [
    LibrariesController, 
    SharedController,
    PermissionController,
    CollectionController
  ]
})
export class LibrariesModule { }
