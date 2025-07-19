import { Module } from '@nestjs/common';
import { CitationsService } from './citations.service';
import { CitationsController } from './citations.controller';

@Module({
  providers: [CitationsService],
  controllers: [CitationsController]
})
export class CitationsModule {}
