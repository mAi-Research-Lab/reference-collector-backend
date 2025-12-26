import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { SourceLanguageCode, TargetLanguageCode } from 'deepl-node';

// Valid source language codes (uppercase for validation after Transform)
const VALID_SOURCE_LANGUAGE_CODES = [
  'AR', 'BG', 'CS', 'DA', 'DE', 'EL', 'ES', 'ET', 'FI', 'FR', 'HE', 'HU', 'ID', 'IT', 'JA', 'KO', 
  'LT', 'LV', 'NB', 'NL', 'PL', 'RO', 'RU', 'SK', 'SL', 'SV', 'TH', 'TR', 'UK', 'VI', 'ZH',
  'EN', 'PT',
] as const;

// Valid target language codes (uppercase for validation after Transform)
const VALID_TARGET_LANGUAGE_CODES = [
 'AR', 'BG', 'CS', 'DA', 'DE', 'EL', 'ES', 'ET', 'FI', 'FR', 'HE', 'HU', 'ID', 'IT', 'JA', 'KO', 
  'LT', 'LV', 'NB', 'NL', 'PL', 'RO', 'RU', 'SK', 'SL', 'SV', 'TH', 'TR', 'UK', 'VI', 'ZH',
  'EN', 'PT',
] as const;

export class TranslateDocumentDto {
  @ApiPropertyOptional({
    example: 'EN',
    description: 'Source language code (optional, auto-detect if not provided)',
    enum: VALID_SOURCE_LANGUAGE_CODES
  })
  @Transform(({ value }) => value?.toUpperCase())
  @IsIn(VALID_SOURCE_LANGUAGE_CODES)
  @IsOptional()
  sourceLang?: SourceLanguageCode;

  @ApiProperty({
    example: 'TR',
    description: 'Target language code',
    enum: VALID_TARGET_LANGUAGE_CODES
  })
  @Transform(({ value }) => value?.toUpperCase())
  @IsIn(VALID_TARGET_LANGUAGE_CODES)
  @IsNotEmpty()
  targetLang: TargetLanguageCode;
}

