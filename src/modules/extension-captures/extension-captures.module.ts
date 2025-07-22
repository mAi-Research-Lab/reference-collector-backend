import { Module } from '@nestjs/common';
import { ExtensionCapturesService } from './extension-captures.service';
import { ExtensionCapturesController } from './extension-captures.controller';
import { ReferencesModule } from '../references/references.module';

@Module({
  imports: [
    ReferencesModule
  ],
  providers: [ExtensionCapturesService],
  controllers: [ExtensionCapturesController]
})
export class ExtensionCapturesModule {}
