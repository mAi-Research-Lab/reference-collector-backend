import { Module } from '@nestjs/common';
import { PdfRetrievalController } from './pdf-retrieval.controller';
import { HttpModule } from '@nestjs/axios';
import { PdfSearchService } from './pdf-retrieval.service';
import { DoiResolverService } from './services/doi-resolver.service';
import { OpenAccessFinderService } from './services/open-access-finder.service';
import { PdfDownloaderService } from './services/pdf-downloader.service';
import { PublisherApiService } from './services/publisher-api.service';
import { SnapshotService } from './services/snapshot.service';

@Module({
  imports: [
    HttpModule
  ],
  providers: [
    PdfSearchService,
    DoiResolverService,
    OpenAccessFinderService,
    PdfDownloaderService,
    PublisherApiService,
    SnapshotService
  ],
  controllers: [PdfRetrievalController],
  exports: [
    DoiResolverService,
    OpenAccessFinderService
  ]
})
export class PdfRetrievalModule {}
