import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TranslationItem {
  @ApiProperty({ 
    example: 'EN', 
    description: 'The language detected in the source text' 
  })
  detected_source_language: string;

  @ApiProperty({ 
    example: 'Merhaba, Dünya!', 
    description: 'The translated text' 
  })
  text: string;

  @ApiPropertyOptional({ 
    example: 13, 
    description: 'Number of characters counted for billing purposes' 
  })
  billed_characters?: number;

  @ApiPropertyOptional({ 
    example: 'quality_optimized', 
    description: 'Translation model used' 
  })
  model_type_used?: string;
}

export class TranslationResponse {
  @ApiProperty({ 
    type: [TranslationItem],
    description: 'Array of translations'
  })
  translations: TranslationItem[];
}

