export class CaptureStatsResponse {
    summary: {
        total: number;
        successful: number;
        failed: number;
        successRate: number;
    };
    translators: {
        mostUsed: Array<{
            name: string;
            count: number;
            percentage: number;
        }>;
    };
    recentActivity: Array<{
        id: string;
        url: string;
        title: string;
        success: boolean;
        translator: string;
        domain: string;
        createdAt: Date;
        error?: string;
    }>;
    dailyStats?: Array<{
        date: string;
        captures: number;
        successful: number;
        failed: number;
    }>;
    siteStats?: Array<{
        domain: string;
        captures: number;
        successful: number;
        success_rate: number;
    }>;
}