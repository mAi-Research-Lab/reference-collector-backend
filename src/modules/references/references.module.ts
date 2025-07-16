import { Module } from '@nestjs/common';
import { ReferencesService } from './references.service';
import { ReferencesController } from './references.controller';
import { FileService } from './services/file.service';
import { FileController } from './controller/file.controller';

@Module({
  providers: [
    ReferencesService,
    FileService
  ],
  controllers: [
    ReferencesController,
    FileController
  ]
})
export class ReferencesModule {}
