import { Module } from '@nestjs/common';
import { OfficeIntegrationController } from './controller/office-integration.controller';
import { OfficeDocumentsService } from './services/office-integration.service';

@Module({
  providers: [OfficeDocumentsService],
  controllers: [OfficeIntegrationController],
  exports: [OfficeDocumentsService],
})
export class OfficeIntegrationModule {}
