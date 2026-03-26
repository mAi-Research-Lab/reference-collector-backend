import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name);
    private readonly apiKey: string | null = null;
    private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || null;
        if (!this.apiKey) {
            this.logger.warn('GEMINI_API_KEY not found in environment variables');
        }
    }

    async paraphraseText(text: string): Promise<string> {
        const textLen = (text || '').length;
        const textHash = crypto.createHash('sha256').update(text || '').digest('hex').slice(0, 12);

        if (!this.apiKey) {
            this.logger.warn('Gemini API key not configured, returning original text', {
                textLen,
                textHash,
                fallback: 'no_api_key'
            });
            return text;
        }

        try {
            const startedAt = Date.now();
            const prompt = `You are an academic writing assistant. Paraphrase the following text while maintaining its academic tone and meaning. The paraphrase should be suitable for use in an academic paper.

Original text:
"${text}"

Provide only the paraphrased text, without any additional explanation or quotation marks.`;

            const response = await axios.post(
                `${this.baseUrl}/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
                {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            this.logger.debug('Gemini paraphrase response received', {
                elapsedMs: Date.now() - startedAt,
                textLen,
                textHash,
                candidatesCount: Array.isArray(response.data?.candidates) ? response.data.candidates.length : 0,
            });

            const candidates = response.data?.candidates;
            if (!candidates || candidates.length === 0) {
                throw new Error('No response from Gemini');
            }

            const content = candidates[0]?.content?.parts?.[0]?.text;
            if (!content) {
                throw new Error('Empty response from Gemini');
            }

            const paraphrasedText = content.trim();
            // Remove quotation marks if present
            const cleaned = paraphrasedText.replace(/^["']|["']$/g, '');
            const cleanedLen = cleaned.length;
            const sameAsInput = cleaned.trim() === (text || '').trim();

            if (sameAsInput) {
                this.logger.warn('Gemini paraphrase returned identical text', {
                    textLen,
                    textHash,
                    cleanedLen
                });
            } else {
                this.logger.debug('Gemini paraphrase produced output', {
                    textLen,
                    textHash,
                    cleanedLen
                });
            }

            return cleaned;
        } catch (error: any) {
            const status = error?.response?.status;
            const dataPreview = (() => {
                try { return JSON.stringify(error?.response?.data)?.slice(0, 300); } catch { return undefined; }
            })();

            this.logger.error('Gemini paraphrasing error (returning original text)', {
                textLen,
                textHash,
                status,
                message: error?.message,
                dataPreview
            });
            // Return original text on error
            return text;
        }
    }
}

