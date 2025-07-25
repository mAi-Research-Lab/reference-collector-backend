import { Module } from '@nestjs/common';
import { OfficeIntegrationController } from './controller/office-integration.controller';
import { OfficeDocumentsService } from './services/office-integration.service';
import { OfficeManifestService } from './services/office-manifest.service';
import { OfficeManifestController } from './controller/office-manifest.controller';
import { WordAdapter } from './adapters/word.adapter';

@Module({
  providers: [
    OfficeDocumentsService, 
    OfficeManifestService,
    WordAdapter
  ],
  controllers: [OfficeIntegrationController, OfficeManifestController],
  exports: [
    OfficeDocumentsService,
    OfficeManifestService,
    WordAdapter
  ],
})
export class OfficeIntegrationModule {}
