import { GoogleGenAI } from '@google/genai';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { AiChatDto } from '../dto/ai-chat.dto';
import { CITEXT_AI_SYSTEM_PROMPT } from './ai-prompt';
import { AiContextService } from './ai-context.service';
import { AiQuotaService, AiQuotaStatus } from './ai-quota.service';

export interface AiStreamResult {
    chunk: string;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly ai: GoogleGenAI;

    constructor(
        @Inject(ConfigService) private readonly configService: ConfigService,
        private readonly contextService: AiContextService,
        private readonly quotaService: AiQuotaService,
    ) {
        this.ai = new GoogleGenAI({ apiKey: this.configService.get<string>('GEMINI_API_KEY') || '' });
    }

    async *streamChat(userId: string, dto: AiChatDto): AsyncGenerator<AiStreamResult, AiQuotaStatus, unknown> {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            throw new CustomHttpException('Gemini API key is not configured', 503, 'AI_NOT_CONFIGURED');
        }

        const context = await this.contextService.buildContext(userId, dto, this.quotaService.getMaxInputChars());
        await this.quotaService.assertCanUse(userId, context.inputChars);

        const model = this.configService.get<string>('CITEXT_AI_MODEL', 'gemini-2.5-flash');
        const contents = this.buildPrompt(dto, context.context);
        let output = '';

        try {
            const stream = await this.ai.models.generateContentStream({
                model,
                contents,
                config: {
                    systemInstruction: CITEXT_AI_SYSTEM_PROMPT,
                },
            });

            for await (const chunk of stream) {
                const text = chunk.text || '';
                if (!text) continue;
                output += text;
                yield { chunk: text };
            }
        } catch (error: unknown) {
            this.logger.error('Gemini stream failed', {
                message: error instanceof Error ? error.message : String(error),
                userId,
                libraryId: dto.libraryId,
                documentId: dto.documentId,
            });
            throw this.mapGeminiStreamError(error);
        }

        return await this.quotaService.recordUsage(userId, context.inputChars, output.length);
    }

    getQuota(userId: string): Promise<AiQuotaStatus> {
        return this.quotaService.getStatus(userId);
    }

    private mapGeminiStreamError(error: unknown): CustomHttpException {
        const raw = error instanceof Error ? error.message : String(error ?? '');
        const lowered = raw.toLowerCase();

        const providerTransient =
            lowered.includes('503') ||
            lowered.includes('unavailable') ||
            lowered.includes('high demand') ||
            lowered.includes('overloaded') ||
            lowered.includes('resource exhausted') ||
            lowered.includes('try again later') ||
            lowered.includes('429') ||
            lowered.includes('too many requests');

        if (providerTransient) {
            return new CustomHttpException(
                'Şu anda AI servisinde yoğunluk veya kesinti var. Lütfen daha sonra tekrar deneyin.',
                503,
                'AI_PROVIDER_UNAVAILABLE',
            );
        }

        return new CustomHttpException(
            'AI yanıtı alınamadı. Lütfen daha sonra tekrar deneyin.',
            503,
            'AI_STREAM_FAILED',
        );
    }

    private buildPrompt(dto: AiChatDto, context: string): string {
        const modeInstruction = dto.mode === 'document' || dto.documentId
            ? 'The user is writing inside a Citext document. Use the library context and the open document context when relevant.'
            : 'The user is asking about Citext library references and attached PDFs.';

        return `${modeInstruction}

Citext context:
"""
${context}
"""

User instruction:
"""
${dto.prompt}
"""`;
    }
}
