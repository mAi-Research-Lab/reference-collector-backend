import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { ConflictData } from "../interfaces/conflict-data";

@Injectable()
export class ConflictResolutionService {
    constructor(private readonly prisma: PrismaService) { }

    resolveConflicts(
        conflicts: ConflictData[],
        strategy: string
    ): ConflictData[] {

        switch (strategy) {
            case 'last-writer-wins':
                return this.resolveByTimestamp(conflicts);
            case 'manual-resolution':
                return this.markForManualResolution(conflicts);
            case 'platform-priority':
                return this.resolveByPlatformPriority(conflicts);
            case 'merge-compatible':
                return this.attemptSmartMerge(conflicts);
            case 'field-specific':
                return this.resolveByFieldRules(conflicts);
            default:
                return this.resolveByTimestamp(conflicts);
        }
    }

    private resolveByTimestamp(conflicts: ConflictData[]): ConflictData[] {
        return conflicts.map(conflict => {
            if (!conflict.timestamp?.word || !conflict.timestamp?.web) {
                return { ...conflict, status: 'resolved', resolved: conflict.wordVersion };
            }

            const wordTime = new Date(conflict.timestamp.word);
            const webTime = new Date(conflict.timestamp.web);

            return {
                ...conflict,
                status: 'resolved',
                resolved: wordTime > webTime ? conflict.wordVersion : conflict.webVersion,
                resolutionMethod: 'last-writer-wins'
            };
        });
    }

    private markForManualResolution(conflicts: ConflictData[]): ConflictData[] {
        return conflicts.map(conflict => ({
            ...conflict,
            status: 'pending',
            resolutionMethod: 'manual-resolution'
        }));
    }

    private resolveByPlatformPriority(conflicts: ConflictData[], priority: string = 'word'): ConflictData[] {
        return conflicts.map(conflict => ({
            ...conflict,
            status: 'resolved',
            resolved: priority === 'word' ? conflict.wordVersion : conflict.webVersion,
            resolutionMethod: `platform-priority-${priority}`
        }));
    }

    private attemptSmartMerge(conflicts: ConflictData[]): ConflictData[] {
        return conflicts.map(conflict => {
            if (typeof conflict.wordVersion === 'object' && typeof conflict.webVersion === 'object') {
                const merged = this.mergeObjects(conflict.wordVersion, conflict.webVersion);
                return {
                    ...conflict,
                    status: 'resolved',
                    resolved: merged,
                    resolutionMethod: 'smart-merge'
                };
            }

            if (Array.isArray(conflict.wordVersion) && Array.isArray(conflict.webVersion)) {
                const merged = [...new Set([...conflict.wordVersion, ...conflict.webVersion])];
                return {
                    ...conflict,
                    status: 'resolved',
                    resolved: merged,
                    resolutionMethod: 'array-merge'
                };
            }

            return this.resolveByTimestamp([conflict])[0];
        });
    }

    private mergeObjects(obj1: any, obj2: any): any {
        const merged = { ...obj1 };

        Object.keys(obj2).forEach(key => {
            if (obj2[key] !== null && obj2[key] !== undefined) {
                if (merged[key] === null || merged[key] === undefined) {
                    merged[key] = obj2[key];
                } else if (typeof merged[key] === 'object' && typeof obj2[key] === 'object') {
                    merged[key] = this.mergeObjects(merged[key], obj2[key]);
                }
            }
        });

        return merged;
    }

    private resolveByFieldRules(conflicts: ConflictData[]): ConflictData[] {
        const fieldRules = {
            'citation_format': 'last-writer-wins',
            'tags': 'array-merge',
            'notes': 'append-both',
            'metadata': 'smart-merge',
            'bibliography_order': 'platform-priority'
        };

        return conflicts.map(conflict => {
            const rule = fieldRules[conflict.field] || 'last-writer-wins';

            switch (rule) {
                case 'array-merge':
                    return this.attemptSmartMerge([conflict])[0];
                case 'append-both':
                    return {
                        ...conflict,
                        status: 'resolved',
                        resolved: `${conflict.wordVersion}\n---\n${conflict.webVersion}`,
                        resolutionMethod: 'append-both'
                    };
                default:
                    return this.resolveByTimestamp([conflict])[0];
            }
        });
    }

    // async getUserConflictPreferences(userId: string): Promise<any> {
    //     // User'ın conflict resolution tercihlerini getir
    //     return await this.prisma.userSettings.findFirst({
    //         where: { userId },
    //         select: { conflictResolutionPreferences: true }
    //     });
    // }

    // async saveConflictResolution(
    //     sessionId: string,
    //     conflictId: string,
    //     resolution: ResolveConflictDto
    // ): Promise<void> {

    //     await this.prisma.syncSessions.update({
    //         where: { id: sessionId },
    //         data: {
    //             conflicts: {

    //             }
    //         }
    //     });
    // }
}