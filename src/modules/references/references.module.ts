import { Module } from '@nestjs/common';
import { ReferencesService } from './references.service';
import { ReferencesController } from './references.controller';
import { FileService } from './services/file.service';
import { FileController } from './controller/file.controller';
import { AnnotationService } from './services/annotation.service';
import { AnnotationController } from './controller/annotation.controller';

@Module({
  providers: [
    ReferencesService,
    FileService,
    AnnotationService
  ],
  controllers: [
    ReferencesController,
    FileController,
    AnnotationController
  ],
  exports: [ReferencesService]
})
export class ReferencesModule {}
