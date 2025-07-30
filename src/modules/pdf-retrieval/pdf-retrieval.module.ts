import { Module } from '@nestjs/common';
import { PdfRetrievalService } from './pdf-retrieval.service';
import { PdfRetrievalController } from './pdf-retrieval.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule
  ],
  providers: [PdfRetrievalService],
  controllers: [PdfRetrievalController]
})
export class PdfRetrievalModule {}
