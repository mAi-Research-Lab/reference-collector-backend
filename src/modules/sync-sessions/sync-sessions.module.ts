import { Module } from '@nestjs/common';
import { SyncSessionsService } from './sync-sessions.service';
import { SyncSessionsController } from './sync-sessions.controller';
import { OfficeIntegrationModule } from '../office-integration/office-integration.module';
import { ConflictResolutionService } from './services/conflict-resolution.service';

@Module({
  imports:[
    OfficeIntegrationModule
  ],
  providers: [SyncSessionsService, ConflictResolutionService],
  controllers: [SyncSessionsController]
})
export class SyncSessionsModule {}
