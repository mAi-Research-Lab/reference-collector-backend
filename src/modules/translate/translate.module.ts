import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TranslateService } from './translate.service';
import { TranslateController } from './translate.controller';
import { DeeplService } from './services/deepl.service';

@Module({
  imports: [
    HttpModule,
  ],
  controllers: [TranslateController],
  providers: [TranslateService, DeeplService],
  exports: [TranslateService],
})
export class TranslateModule {}

