import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ReferencesService } from './references.service';
import { ReferencesController } from './references.controller';
import { FileService } from './services/file.service';
import { FileController } from './controller/file.controller';
import { AnnotationService } from './services/annotation.service';
import { AnnotationController } from './controller/annotation.controller';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { DuplicateDetectionController } from './controller/duplicate-detection.controller';
import { BulkOperationsService } from './services/bulk-operations.service';
import { BulkOperationsController } from './controller/bulk-operations.controller';
import { ReferenceValidationService } from './services/reference-validation.service';
import { ReferenceValidationController } from './controller/reference-validation.controller';
import { MetadataEnhancementService } from './services/metadata-enhancement.service';
import { MetadataEnhancementController } from './controller/metadata-enhancement.controller';

@Module({
  imports: [HttpModule],
  providers: [
    ReferencesService,
    FileService,
    AnnotationService,
    DuplicateDetectionService,
    BulkOperationsService,
    ReferenceValidationService,
    MetadataEnhancementService
  ],
  controllers: [
    ReferencesController,
    FileController,
    AnnotationController,
    DuplicateDetectionController,
    BulkOperationsController,
    ReferenceValidationController,
    MetadataEnhancementController
  ],
  exports: [ReferencesService, DuplicateDetectionService, BulkOperationsService, ReferenceValidationService, MetadataEnhancementService]
})
export class ReferencesModule {}
