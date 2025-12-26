import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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
        if (!this.apiKey) {
            this.logger.warn('Gemini API key not configured, returning original text');
            return text;
        }

        try {
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

            console.log("🔵 Response:", response.data);

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
            return paraphrasedText.replace(/^["']|["']$/g, '');
        } catch (error: any) {
            console.log("🔵 Error:", error);
            this.logger.error('Gemini paraphrasing error:', error.message);
            // Return original text on error
            return text;
        }
    }
}

