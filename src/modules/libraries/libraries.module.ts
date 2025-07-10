import { Module } from '@nestjs/common';
import { LibrariesService } from './libraries.service';
import { LibrariesController } from './libraries.controller';
import { SharedService } from './service/shared.service';
import { SharedController } from './controllers/shared.controller';

@Module({
  providers: [LibrariesService, SharedService],
  controllers: [LibrariesController, SharedController]
})
export class LibrariesModule {}
