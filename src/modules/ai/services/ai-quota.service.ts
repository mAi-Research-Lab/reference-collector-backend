import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';

type AiQuotaPeriod = 'daily' | 'monthly';

interface AiUsageBucket {
    period: AiQuotaPeriod;
    periodKey: string;
    requests: number;
    inputChars: number;
    outputChars: number;
}

export interface AiQuotaStatus extends AiUsageBucket {
    requestLimit: number;
    inputCharLimit: number;
    remainingRequests: number;
    remainingInputChars: number;
}

@Injectable()
export class AiQuotaService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) { }

    async assertCanUse(userId: string, inputChars: number): Promise<AiQuotaStatus> {
        const status = await this.getStatus(userId);
        if (status.remainingRequests <= 0) {
            throw new CustomHttpException('AI monthly request limit reached', 429, 'AI_QUOTA_EXCEEDED');
        }
        if (inputChars > status.remainingInputChars) {
            throw new CustomHttpException('AI context is too large for your remaining quota', 429, 'AI_CONTEXT_QUOTA_EXCEEDED');
        }
        return status;
    }

    async recordUsage(userId: string, inputChars: number, outputChars: number): Promise<AiQuotaStatus> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { preferences: true },
        });

        const preferences = this.asObject(user?.preferences);
        const current = this.normalizeBucket((preferences.aiUsage as Partial<AiUsageBucket> | undefined) || {});
        const next: AiUsageBucket = {
            ...current,
            requests: current.requests + 1,
            inputChars: current.inputChars + inputChars,
            outputChars: current.outputChars + outputChars,
        };

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                preferences: {
                    ...preferences,
                    aiUsage: next,
                } as any,
            },
        });

        return this.toStatus(next);
    }

    async getStatus(userId: string): Promise<AiQuotaStatus> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { preferences: true },
        });

        const preferences = this.asObject(user?.preferences);
        return this.toStatus(this.normalizeBucket((preferences.aiUsage as Partial<AiUsageBucket> | undefined) || {}));
    }

    getMaxInputChars(): number {
        return this.getNumber('CITEXT_AI_MAX_INPUT_CHARS', 3_000_000);
    }

    private normalizeBucket(bucket: Partial<AiUsageBucket>): AiUsageBucket {
        const period = this.getPeriod();
        const periodKey = this.getPeriodKey(period);
        if (bucket.period !== period || bucket.periodKey !== periodKey) {
            return { period, periodKey, requests: 0, inputChars: 0, outputChars: 0 };
        }

        return {
            period,
            periodKey,
            requests: Number(bucket.requests || 0),
            inputChars: Number(bucket.inputChars || 0),
            outputChars: Number(bucket.outputChars || 0),
        };
    }

    private toStatus(bucket: AiUsageBucket): AiQuotaStatus {
        const requestLimit = this.getNumber('CITEXT_AI_REQUEST_LIMIT', 300);
        const inputCharLimit = this.getNumber('CITEXT_AI_INPUT_CHAR_LIMIT', 30_000_000);
        return {
            ...bucket,
            requestLimit,
            inputCharLimit,
            remainingRequests: Math.max(0, requestLimit - bucket.requests),
            remainingInputChars: Math.max(0, inputCharLimit - bucket.inputChars),
        };
    }

    private getPeriod(): AiQuotaPeriod {
        const period = this.configService.get<string>('CITEXT_AI_QUOTA_PERIOD', 'monthly');
        return period === 'daily' ? 'daily' : 'monthly';
    }

    private getPeriodKey(period: AiQuotaPeriod): string {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
        const day = `${now.getUTCDate()}`.padStart(2, '0');
        return period === 'daily' ? `${year}-${month}-${day}` : `${year}-${month}`;
    }

    private getNumber(key: string, fallback: number): number {
        const value = Number(this.configService.get<string>(key));
        return Number.isFinite(value) && value > 0 ? value : fallback;
    }

    private asObject(value: unknown): Record<string, unknown> {
        return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    }
}
