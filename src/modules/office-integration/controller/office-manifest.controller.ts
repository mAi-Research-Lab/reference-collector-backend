import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OfficeManifestService } from '../services/office-manifest.service';
import { OfficePlatform } from '../enums/platform.enum';

@Controller('office')
@ApiTags('Office Manifests')
export class OfficeManifestController {
    constructor(
        private readonly manifestService: OfficeManifestService
    ) { }

    @Get(':platform/manifest')
    @ApiOperation({
        summary: 'Get Office Add-in Manifest',
        description: 'Office uygulamasının add-in\'i nasıl yükleyeceğini belirten manifest dosyası'
    })
    @ApiParam({
        name: 'platform',
        enum: OfficePlatform,
        description: 'Office platformu (word, google_docs, libre_office)'
    })
    @ApiQuery({
        name: 'version',
        required: false,
        description: 'Add-in versiyonu'
    })
    getManifest(
        @Param('platform') platform: OfficePlatform,
        @Query('version') version: string = '1.0.0',
        @Res() res: Response
    ) {
        try {
            const manifest = this.manifestService.generateManifest(platform, {
                appId: process.env.OFFICE_APP_ID || '12345678-1234-1234-1234-123456789012',
                version,
                displayName: 'Reference Collector',
                description: 'Manage citations and references in your documents',
                baseUrl: process.env.BASE_URL || 'http://localhost:3000',
                permissions: ['ReadWriteDocument']
            });

            const contentType = platform === OfficePlatform.WORD ? 'application/xml' : 'application/json';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'no-cache');
            res.send(manifest);

        } catch (error) {
            res.status(400).json({
                error: 'Invalid platform or configuration',
                message: error.message
            });
        }
    }

    @Get(':platform/entry')
    @ApiOperation({
        summary: 'Get Office Add-in Entry Point',
        description: 'Add-in\'in açılacağı HTML sayfası. Frontend app buraya mount edilir.'
    })
    @ApiParam({
        name: 'platform',
        enum: OfficePlatform,
        description: 'Office platformu'
    })
    @ApiQuery({
        name: 'theme',
        required: false,
        enum: ['light', 'dark'],
        description: 'Tema tercihi'
    })
    @ApiQuery({
        name: 'locale',
        required: false,
        description: 'Dil kodu (en-US, tr-TR vs.)'
    })
    getEntryPoint(
        @Param('platform') platform: OfficePlatform,
        @Query('theme') theme: 'light' | 'dark' = 'light',
        @Query('locale') locale: string = 'en-US',
        @Res() res: Response
    ) {
        try {
            const entryPoint = this.manifestService.generateEntryPoint(platform, {
                baseUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
                theme,
                locale
            });

            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'no-cache');
            res.send(entryPoint);

        } catch (error) {
            res.status(400).json({
                error: 'Invalid platform or configuration',
                message: error.message
            });
        }
    }

    @Get('platforms')
    @ApiOperation({
        summary: 'Get Supported Platforms',
        description: 'Hangi office platformlarının desteklendiğini listeler'
    })
    getSupportedPlatforms() {
        const platforms = this.manifestService.getSupportedPlatforms();

        return {
            success: true,
            data: platforms,
            message: 'Supported platforms retrieved successfully'
        };
    }
}