import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { References } from 'generated/prisma';
import { InputJsonValue, JsonValue } from 'generated/prisma/runtime/library';

export interface DuplicateMatch {
    reference: References;
    similarity: number;
    matchType: 'exact' | 'high' | 'medium' | 'low';
    matchFields: string[];
}

export interface DuplicateDetectionResult {
    isDuplicate: boolean;
    matches: DuplicateMatch[];
    confidence: number;
}

@Injectable()
export class DuplicateDetectionService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Ana duplicate detection metodu
     */
    async detectDuplicates(
        libraryId: string,
        referenceData: Partial<References>
    ): Promise<DuplicateDetectionResult> {
        const potentialDuplicates = await this.findPotentialDuplicates(libraryId, referenceData);
        const matches: DuplicateMatch[] = [];

        for (const candidate of potentialDuplicates) {
            const similarity = this.calculateSimilarity(referenceData, candidate);
            if (similarity > 0.3) { // Minimum threshold
                matches.push({
                    reference: candidate,
                    similarity,
                    matchType: this.getMatchType(similarity),
                    matchFields: this.getMatchingFields(referenceData, candidate)
                });
            }
        }

        // Similarity'e göre sırala
        matches.sort((a, b) => b.similarity - a.similarity);

        return {
            isDuplicate: matches.length > 0 && matches[0].similarity > 0.8,
            matches,
            confidence: matches.length > 0 ? matches[0].similarity : 0
        };
    }

    /**
     * Potansiyel duplicate'ları bul
     */
    private async findPotentialDuplicates(
        libraryId: string,
        referenceData: Partial<References>
    ): Promise<References[]> {
        const conditions: any[] = [];

        // DOI ile exact match
        if (referenceData.doi) {
            conditions.push({
                libraryId,
                doi: referenceData.doi,
                isDeleted: false
            });
        }

        // ISBN ile exact match
        if (referenceData.isbn) {
            conditions.push({
                libraryId,
                isbn: referenceData.isbn,
                isDeleted: false
            });
        }

        // Title similarity (PostgreSQL full-text search)
        if (referenceData.title) {
            conditions.push({
                libraryId,
                isDeleted: false,
                title: {
                    contains: referenceData.title.substring(0, 50),
                    mode: 'insensitive'
                }
            });
        }

        // Tüm koşulları birleştir
        if (conditions.length === 0) return [];

        return await this.prisma.references.findMany({
            where: {
                OR: conditions
            },
            take: 50 // Performans için limit
        });
    }

    /**
     * İki referans arasındaki similarity'yi hesapla
     */
    private calculateSimilarity(ref1: Partial<References>, ref2: References): number {
        let totalWeight = 0;
        let matchedWeight = 0;

        // DOI match (en yüksek ağırlık)
        if (ref1.doi && ref2.doi) {
            totalWeight += 0.4;
            if (ref1.doi.toLowerCase() === ref2.doi.toLowerCase()) {
                matchedWeight += 0.4;
            }
        }

        // ISBN match
        if (ref1.isbn && ref2.isbn) {
            totalWeight += 0.3;
            if (ref1.isbn.replace(/[-\s]/g, '') === ref2.isbn.replace(/[-\s]/g, '')) {
                matchedWeight += 0.3;
            }
        }

        // Title similarity
        if (ref1.title && ref2.title) {
            totalWeight += 0.25;
            const titleSimilarity = this.calculateStringSimilarity(ref1.title, ref2.title);
            matchedWeight += 0.25 * titleSimilarity;
        }

        // Authors similarity
        if (ref1.authors && ref2.authors) {
            totalWeight += 0.2;
            const authorSimilarity = this.calculateAuthorSimilarity(ref1.authors, ref2.authors);
            matchedWeight += 0.2 * authorSimilarity;
        }

        // Year match
        if (ref1.year && ref2.year) {
            totalWeight += 0.1;
            if (ref1.year === ref2.year) {
                matchedWeight += 0.1;
            }
        }

        // Publication match
        if (ref1.publication && ref2.publication) {
            totalWeight += 0.15;
            const pubSimilarity = this.calculateStringSimilarity(ref1.publication, ref2.publication);
            matchedWeight += 0.15 * pubSimilarity;
        }

        return totalWeight > 0 ? matchedWeight / totalWeight : 0;
    }

    /**
     * String similarity hesapla (Levenshtein distance based)
     */
    private calculateStringSimilarity(str1: string, str2: string): number {
        if (!str1 || !str2) return 0;

        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();

        if (s1 === s2) return 1;

        const distance = this.levenshteinDistance(s1, s2);
        const maxLength = Math.max(s1.length, s2.length);

        return 1 - (distance / maxLength);
    }

    /**
     * Author similarity hesapla
     */
    private calculateAuthorSimilarity(authors1: any, authors2: any): number {
        if (!authors1 || !authors2) return 0;

        const auth1 = Array.isArray(authors1) ? authors1 : [authors1];
        const auth2 = Array.isArray(authors2) ? authors2 : [authors2];

        let matches = 0;
        const maxAuthors = Math.max(auth1.length, auth2.length);

        for (const a1 of auth1) {
            for (const a2 of auth2) {
                const name1 = typeof a1 === 'string' ? a1 : a1.name || '';
                const name2 = typeof a2 === 'string' ? a2 : a2.name || '';

                if (this.calculateStringSimilarity(name1, name2) > 0.8) {
                    matches++;
                    break;
                }
            }
        }

        return maxAuthors > 0 ? matches / maxAuthors : 0;
    }

    /**
     * Levenshtein distance algoritması
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Match type'ını belirle
     */
    private getMatchType(similarity: number): 'exact' | 'high' | 'medium' | 'low' {
        if (similarity >= 0.95) return 'exact';
        if (similarity >= 0.8) return 'high';
        if (similarity >= 0.6) return 'medium';
        return 'low';
    }

    /**
     * Matching field'ları belirle
     */
    private getMatchingFields(ref1: Partial<References>, ref2: References): string[] {
        const matchingFields: string[] = [];

        if (ref1.doi && ref2.doi && ref1.doi.toLowerCase() === ref2.doi.toLowerCase()) {
            matchingFields.push('doi');
        }

        if (ref1.isbn && ref2.isbn && ref1.isbn.replace(/[-\s]/g, '') === ref2.isbn.replace(/[-\s]/g, '')) {
            matchingFields.push('isbn');
        }

        if (ref1.title && ref2.title && this.calculateStringSimilarity(ref1.title, ref2.title) > 0.8) {
            matchingFields.push('title');
        }

        if (ref1.year && ref2.year && ref1.year === ref2.year) {
            matchingFields.push('year');
        }

        return matchingFields;
    }

    /**
     * Library'deki tüm duplicate'ları bul
     */
    async findAllDuplicatesInLibrary(libraryId: string): Promise<DuplicateMatch[][]> {
        const references = await this.prisma.references.findMany({
            where: { libraryId, isDeleted: false },
            orderBy: { createdAt: 'asc' }
        });

        const duplicateGroups: DuplicateMatch[][] = [];
        const processed = new Set<string>();

        for (const ref of references) {
            if (processed.has(ref.id)) continue;

            const result = await this.detectDuplicates(libraryId, ref);
            if (result.matches.length > 0) {
                const group = result.matches.filter(match => !processed.has(match.reference.id));
                if (group.length > 0) {
                    duplicateGroups.push(group);
                    group.forEach(match => processed.add(match.reference.id));
                    processed.add(ref.id);
                }
            }
        }

        return duplicateGroups;
    }

    /**
     * Duplicate referansları merge et
     */
    async mergeDuplicateReferences(
        libraryId: string,
        mergeData: { referenceIds: string[]; masterReferenceId: string; fieldsToMerge?: string[] }
    ): Promise<any> {
        const { referenceIds, masterReferenceId, fieldsToMerge = ['tags', 'notes'] } = mergeData;

        // Master reference'ı al
        const masterRef = await this.prisma.references.findFirst({
            where: { id: masterReferenceId, libraryId, isDeleted: false }
        });

        if (!masterRef) {
            throw new Error('Master reference not found');
        }

        // Merge edilecek referansları al
        const referencesToMerge = await this.prisma.references.findMany({
            where: {
                id: { in: referenceIds.filter(id => id !== masterReferenceId) },
                libraryId,
                isDeleted: false
            }
        });

        // Helper fonksiyon - JsonValue'yu string array'e çevir
        const normalizeTagsToStringArray = (tags: JsonValue | null): string[] => {
            if (!tags) return [];

            if (Array.isArray(tags)) {
                return tags
                    .map(tag => {
                        if (typeof tag === 'string') return tag;
                        if (typeof tag === 'object' && tag !== null && 'name' in tag) {
                            return String(tag.name);
                        }
                        return String(tag);
                    })
                    .filter(tag => tag.length > 0);
            }

            return [];
        };

        // Merge işlemi
        const mergedData: any = { ...masterRef };

        for (const ref of referencesToMerge) {
            // Tags merge
            if (fieldsToMerge.includes('tags') && ref.tags) {
                const existingTags = normalizeTagsToStringArray(mergedData.tags);
                const refTags = normalizeTagsToStringArray(ref.tags);

                // Duplicate tag'leri filtrele
                const newTags = refTags.filter(tag => !existingTags.includes(tag));
                mergedData.tags = [...existingTags, ...newTags];
            }

            // Notes merge
            if (fieldsToMerge.includes('notes') && ref.notes) {
                const existingNotes = mergedData.notes || '';
                mergedData.notes = existingNotes + (existingNotes ? '\n\n' : '') +
                    `[Merged from duplicate]: ${ref.notes}`;
            }

            // Metadata merge
            if (fieldsToMerge.includes('metadata') && ref.metadata) {
                const existingMetadata = mergedData.metadata;
                const refMetadata = ref.metadata;

                // Her iki metadata da object olduğundan emin ol
                if (typeof existingMetadata === 'object' && existingMetadata !== null &&
                    typeof refMetadata === 'object' && refMetadata !== null) {
                    mergedData.metadata = {
                        ...existingMetadata,
                        ...refMetadata
                    };
                } else if (typeof refMetadata === 'object' && refMetadata !== null) {
                    mergedData.metadata = refMetadata;
                }
            }
        }

        // Master reference'ı güncelle
        await this.prisma.references.update({
            where: { id: masterReferenceId },
            data: {
                tags: mergedData.tags as InputJsonValue,
                notes: mergedData.notes,
                metadata: mergedData.metadata as InputJsonValue,
                dateModified: new Date()
            }
        });

        // Duplicate referansları soft delete
        await this.prisma.references.updateMany({
            where: {
                id: { in: referencesToMerge.map(ref => ref.id) }
            },
            data: { isDeleted: true }
        });

        return {
            masterReferenceId,
            mergedReferenceIds: referencesToMerge.map(ref => ref.id),
            message: 'References merged successfully'
        };
    }

    /**
     * Exact duplicate'ları otomatik olarak kaldır
     */
    async autoRemoveExactDuplicates(libraryId: string, dryRun: boolean = false): Promise<any> {
        const duplicateGroups = await this.findAllDuplicatesInLibrary(libraryId);
        const exactDuplicates = duplicateGroups.filter(group =>
            group.some(match => match.similarity >= 0.95)
        );

        const toRemove: string[] = [];
        const toKeep: string[] = [];

        for (const group of exactDuplicates) {
            // En eski referansı tut, diğerlerini kaldır
            const sortedByDate = group.sort((a, b) =>
                new Date(a.reference.createdAt).getTime() - new Date(b.reference.createdAt).getTime()
            );

            toKeep.push(sortedByDate[0].reference.id);
            toRemove.push(...sortedByDate.slice(1).map(match => match.reference.id));
        }

        if (!dryRun && toRemove.length > 0) {
            await this.prisma.references.updateMany({
                where: { id: { in: toRemove } },
                data: { isDeleted: true }
            });
        }

        return {
            totalGroups: exactDuplicates.length,
            referencesToRemove: toRemove.length,
            referencesToKeep: toKeep.length,
            removedIds: dryRun ? [] : toRemove,
            keptIds: toKeep,
            dryRun
        };
    }
}
