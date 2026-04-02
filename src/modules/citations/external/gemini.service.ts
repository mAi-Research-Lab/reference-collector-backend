import { GoogleGenAI } from '@google/genai';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const LANG_CODE_TO_ENGLISH_NAME: Record<string, string> = {
    tr: 'Turkish',
    en: 'English',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    pl: 'Polish',
    ru: 'Russian',
    ar: 'Arabic',
    zh: 'Chinese (Simplified)',
    ja: 'Japanese',
    ko: 'Korean',
};

@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name);
    private readonly ai: GoogleGenAI;

    constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            this.logger.warn('GEMINI_API_KEY not found in environment variables');
        }

        this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
    }


    async translateToLanguage(text: string, targetLangCode: string): Promise<string> {
        const lang = (targetLangCode || 'en').toLowerCase();
        const langName = LANG_CODE_TO_ENGLISH_NAME[lang] || lang;
        const textLen = (text || '').length;
        const textHash = crypto.createHash('sha256').update(text || '').digest('hex').slice(0, 12);

        if (!this.configService.get<string>('GEMINI_API_KEY')) {
            this.logger.warn('Gemini API key not configured, returning original text for translation');
            return text;
        }

        try {
            const startedAt = Date.now();
            const prompt = `You are an academic translation assistant. Translate the following text into ${langName}.
Preserve the meaning and an appropriate academic register for scholarly writing.
Do not add explanations, notes, or quotation marks around the entire output.

Text to translate:
"""
${text}
"""

Provide only the translated text.`;

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            const content = response.text?.trim();
            if (!content) {
                throw new Error('Empty response from Gemini');
            }

            const cleaned = content.replace(/^["']|["']$/g, '');
            this.logger.debug('Gemini translate response', {
                elapsedMs: Date.now() - startedAt,
                textLen,
                textHash,
                targetLang: lang,
            });
            return cleaned;
        } catch (error: any) {
            this.logger.error('Gemini translation error (returning original text)', {
                textLen,
                textHash,
                message: error?.message,
                targetLang: lang,
            });
            return text;
        }
    }

    async paraphraseText(text: string, outputLang?: string): Promise<string> {
        const textLen = (text || '').length;
        const textHash = crypto.createHash('sha256').update(text || '').digest('hex').slice(0, 12);

        if (!this.configService.get<string>('GEMINI_API_KEY')) {
            this.logger.warn('Gemini API key not configured, returning original text', {
                textLen,
                textHash,
                fallback: 'no_api_key',
            });
            return text;
        }

        const langName = outputLang
            ? LANG_CODE_TO_ENGLISH_NAME[outputLang.toLowerCase()] || outputLang
            : null;

        try {
            const startedAt = Date.now();
            const langInstruction = langName
                ? `The paraphrase must be written in ${langName}, suitable for an academic paper.`
                : 'The paraphrase should be suitable for use in an academic paper.';

            const prompt = `You are an academic writing assistant. Paraphrase the following text while maintaining its academic tone and meaning. ${langInstruction}

Original text:
"${text}"

Provide only the paraphrased text, without any additional explanation or quotation marks.`;

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });

            const content = response.text?.trim();
            if (!content) {
                throw new Error('Empty response from Gemini');
            }

            this.logger.debug('Gemini paraphrase response received', {
                elapsedMs: Date.now() - startedAt,
                textLen,
                textHash,
                outputLang: outputLang || 'default',
            });

            const cleaned = content.replace(/^["']|["']$/g, '');
            const cleanedLen = cleaned.length;
            const sameAsInput = cleaned.trim() === (text || '').trim();

            if (sameAsInput) {
                this.logger.warn('Gemini paraphrase returned identical text', {
                    textLen,
                    textHash,
                    cleanedLen,
                });
            } else {
                this.logger.debug('Gemini paraphrase produced output', {
                    textLen,
                    textHash,
                    cleanedLen,
                });
            }

            return cleaned;
        } catch (error: any) {
            this.logger.error('Gemini paraphrasing error (returning original text)', {
                textLen,
                textHash,
                message: error?.message,
            });
            return text;
        }
    }
}
