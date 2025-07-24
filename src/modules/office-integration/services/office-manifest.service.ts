import { Injectable } from '@nestjs/common';
import { OfficePlatform } from '../enums/platform.enum';
import { WordAdapter } from '../adapters/word.adapter';
import { EntryPointConfig, ManifestConfig } from '../interfaces/office-adapter.interface';

@Injectable()
export class OfficeManifestService {
    constructor(
        private readonly wordAdapter: WordAdapter
    ) { }

    generateManifest(platform: OfficePlatform, config: ManifestConfig): string {
        const adapter = this.getAdapter(platform);
        return adapter.generateManifest(config);
    }

    generateEntryPoint(platform: OfficePlatform, config: EntryPointConfig): string {
        const adapter = this.getAdapter(platform);
        return adapter.generateEntryPoint(config);
    }

    private getAdapter(platform: OfficePlatform) {
        switch (platform) {
            case OfficePlatform.WORD:
                return this.wordAdapter;

            case OfficePlatform.GOOGLE_DOCS:
                // TODO: GoogleDocsAdapter eklenecek
                throw new Error('Google Docs adapter not implemented yet');

            case OfficePlatform.LIBRE_OFFICE:
                // TODO: LibreOfficeAdapter eklenecek
                throw new Error('LibreOffice adapter not implemented yet');

            default:
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    getSupportedPlatforms(): OfficePlatform[] {
        return [OfficePlatform.WORD];
    }
}