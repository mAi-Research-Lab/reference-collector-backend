import { Module } from '@nestjs/common';
import { LibrariesService } from './libraries.service';
import { LibrariesController } from './libraries.controller';
import { SharedService } from './service/shared.service';
import { SharedController } from './controllers/shared.controller';
import { PermissionService } from './service/permission.service';
import { PermissionController } from './controllers/permission.controller';

@Module({
  providers: [
    LibrariesService, 
    SharedService,
    PermissionService
  ],
  controllers: [
    LibrariesController, 
    SharedController,
    PermissionController
  ]
})
export class LibrariesModule { }
