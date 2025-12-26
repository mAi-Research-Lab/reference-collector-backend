import { Injectable } from '@nestjs/common';
import * as deepl from 'deepl-node';
import {
  SourceLanguageCode,
  TargetLanguageCode,
  TextResult,
} from 'deepl-node';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class DeeplService {
  private readonly deeplClient: deepl.DeepLClient;

  constructor() {
    const authKey = process.env.DEEPL_API_KEY;
    if (!authKey) {
      throw new Error('DEEPL_API_KEY is not set');
    }
    this.deeplClient = new deepl.DeepLClient(authKey);
  }

  async translateText(
    texts: string[],
    targetLang: TargetLanguageCode,
    sourceLang?: SourceLanguageCode,
  ): Promise<{ translations: TextResult[]; totalCharacters: number }> {
    // ❗ undefined yerine null gönderiyoruz
    const src = (sourceLang ?? null) as SourceLanguageCode | null;

    const translations = await this.deeplClient.translateText(
      texts,
      src,
      targetLang,
    );

    const normalized = Array.isArray(translations)
      ? translations
      : [translations];

    const totalCharacters = normalized.reduce(
      (sum, t) => sum + (t.billedCharacters ?? 0),
      0,
    );

    return {
      translations: normalized,
      totalCharacters,
    };
  }

  async translateDocument(
    file: Express.Multer.File,
    targetLang: TargetLanguageCode,
    sourceLang?: SourceLanguageCode,
  ): Promise<{
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    detectedSourceLang: SourceLanguageCode | null;
    billedCharacters: number;
  }> {
    const normalizedTarget = targetLang.toLowerCase() as TargetLanguageCode;
    const normalizedSource = sourceLang
      ? (sourceLang.toLowerCase() as SourceLanguageCode)
      : null;

    // 1) Dokümanı yükle – DocumentHandle dönüyor
    const handle = await this.deeplClient.uploadDocument(
      file.buffer,
      normalizedSource,
      normalizedTarget,
      { filename: file.originalname }, // buffer kullandığımız için zorunlu
    );

    // 2) Çeviri bitene kadar bekle
    const { status } = await this.deeplClient.isDocumentTranslationComplete(
      handle,
    );

    if (!status.ok() || !status.done()) {
      throw new Error(
        `DeepL document translation failed: ${status.errorMessage ?? 'Unknown error'}`,
      );
    }

    // 3) Çıktıyı geçici dosyaya indir
    const tempOut = join(
      process.cwd(),
      `deepl_${Date.now()}_${file.originalname}`,
    );

    await this.deeplClient.downloadDocument(handle, tempOut);

    // 4) Dosyayı oku ve sil
    const buffer = fs.readFileSync(tempOut);
    fs.unlinkSync(tempOut);

    return {
      buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      // DocumentStatus içinde detectedSourceLang YOK, o yüzden bizim bildiğimiz değeri dönüyoruz
      detectedSourceLang: normalizedSource,
      billedCharacters: status.billedCharacters ?? 0,
    };
  }
}

