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
import { QuickImportService } from './services/external/quick-import.service';
import { QuickImportController } from './controller/quick-import.controller';
import { ReportGenerationService } from './services/report-generation.service';
import { ReportGenerationController } from './controller/report-generation.controller';
import { BibliographyCreationService } from './services/bibliography-creation.service';
import { BibliographyCreationController } from './controller/bibliography-creation.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    HttpModule,
    UserModule
  ],
  providers: [
    ReferencesService,
    FileService,
    AnnotationService,
    DuplicateDetectionService,
    BulkOperationsService,
    ReferenceValidationService,
    MetadataEnhancementService,
    QuickImportService,
    ReportGenerationService,
    BibliographyCreationService
  ],
  controllers: [
    ReferencesController,
    FileController,
    AnnotationController,
    DuplicateDetectionController,
    BulkOperationsController,
    ReferenceValidationController,
    MetadataEnhancementController,
    QuickImportController,
    ReportGenerationController,
    BibliographyCreationController
  ],
  exports: [ReferencesService, DuplicateDetectionService, BulkOperationsService, ReferenceValidationService, MetadataEnhancementService]
})
export class ReferencesModule { }
