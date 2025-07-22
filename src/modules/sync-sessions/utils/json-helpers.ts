import { Prisma } from 'generated/prisma';
import { ConflictData } from '../interfaces/conflict-data';

export function conflictsToJson(conflicts: ConflictData[] | undefined): Prisma.InputJsonValue {
    if (!conflicts || !Array.isArray(conflicts)) {
        return [];
    }
    return JSON.parse(JSON.stringify(conflicts));
}

export function jsonToConflicts(jsonData: any): ConflictData[] {
    if (!jsonData || !Array.isArray(jsonData)) {
        return [];
    }
    return jsonData as ConflictData[];
}