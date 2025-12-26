import { Injectable } from '@nestjs/common';
import { DeeplService } from './services/deepl.service';
import { TranslateTextDto } from './dto/translate-text.dto';
import { TranslationResponse, TranslationItem } from './dto/translation.response';
import { SourceLanguageCode, TargetLanguageCode } from 'deepl-node';

@Injectable()
export class TranslateService {
  constructor(
    private deeplService: DeeplService,
  ) {}

  async translateText(translateTextDto: TranslateTextDto): Promise<TranslationResponse> {
    const result = await this.deeplService.translateText(
      translateTextDto.text,
      translateTextDto.targetLang,
      translateTextDto.sourceLang,
    );

    const translationsForResponse: TranslationItem[] = result.translations.map((translation) => ({
      detected_source_language: translation.detectedSourceLang,
      text: translation.text,
      billed_characters: translation.billedCharacters,
      model_type_used: translation.modelTypeUsed,
    }));

    return {
      translations: translationsForResponse,
    };
  }

  async translateDocument(
    file: Express.Multer.File,
    targetLang: TargetLanguageCode,
    sourceLang?: SourceLanguageCode,
  ) {
    const result = await this.deeplService.translateDocument(file, targetLang, sourceLang);

    return {
      buffer: result.buffer,
      originalName: result.originalName,
      mimeType: result.mimeType,
      detectedSourceLang: result.detectedSourceLang,
      billedCharacters: result.billedCharacters,
    };
  }
}

