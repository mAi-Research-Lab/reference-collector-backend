import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { 
    BulkDeleteDto, 
    BulkMoveDto, 
    BulkTagDto, 
    BulkExportDto,
    BulkOperationResultDto 
} from '../dto/bulk/bulk-operations.dto';

@Injectable()
export class BulkOperationsService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Bulk delete references
     */
    async bulkDelete(libraryId: string, bulkDeleteDto: BulkDeleteDto): Promise<BulkOperationResultDto> {
        const { referenceIds, permanent = false } = bulkDeleteDto;
        
        const successfulIds: string[] = [];
        const failures: Array<{ id: string; error: string }> = [];

        for (const referenceId of referenceIds) {
            try {
                // Verify reference exists and belongs to library
                const reference = await this.prisma.references.findFirst({
                    where: { 
                        id: referenceId, 
                        libraryId,
                        isDeleted: false 
                    }
                });

                if (!reference) {
                    failures.push({ 
                        id: referenceId, 
                        error: 'Reference not found or already deleted' 
                    });
                    continue;
                }

                if (permanent) {
                    // Permanent delete - also delete related files and annotations
                    await this.prisma.$transaction(async (tx) => {
                        // Delete annotations first
                        await tx.annotations.deleteMany({
                            where: { 
                                file: { 
                                    referenceId: referenceId 
                                } 
                            }
                        });

                        // Delete files
                        await tx.files.deleteMany({
                            where: { referenceId: referenceId }
                        });

                        // Delete collection items
                        await tx.collectionItems.deleteMany({
                            where: { referenceId: referenceId }
                        });

                        // Delete citations
                        await tx.citation.deleteMany({
                            where: { referenceId: referenceId }
                        });

                        // Finally delete the reference
                        await tx.references.delete({
                            where: { id: referenceId }
                        });
                    });
                } else {
                    // Soft delete
                    await this.prisma.references.update({
                        where: { id: referenceId },
                        data: { 
                            isDeleted: true,
                            dateModified: new Date()
                        }
                    });
                }

                successfulIds.push(referenceId);
            } catch (error) {
                failures.push({ 
                    id: referenceId, 
                    error: error.message || 'Unknown error occurred' 
                });
            }
        }

        return {
            operation: 'delete',
            processedCount: referenceIds.length,
            successCount: successfulIds.length,
            failureCount: failures.length,
            successfulIds,
            failures,
            message: `Bulk delete completed. ${successfulIds.length} references ${permanent ? 'permanently deleted' : 'moved to trash'}.`
        };
    }

    /**
     * Bulk move references to another library
     */
    async bulkMove(libraryId: string, bulkMoveDto: BulkMoveDto): Promise<BulkOperationResultDto> {
        const { referenceIds, targetLibraryId, targetCollectionId } = bulkMoveDto;
        
        // Verify target library exists
        const targetLibrary = await this.prisma.libraries.findFirst({
            where: { id: targetLibraryId, isDeleted: false }
        });

        if (!targetLibrary) {
            throw new Error('Target library not found');
        }

        const successfulIds: string[] = [];
        const failures: Array<{ id: string; error: string }> = [];

        for (const referenceId of referenceIds) {
            try {
                const reference = await this.prisma.references.findFirst({
                    where: { 
                        id: referenceId, 
                        libraryId,
                        isDeleted: false 
                    }
                });

                if (!reference) {
                    failures.push({ 
                        id: referenceId, 
                        error: 'Reference not found' 
                    });
                    continue;
                }

                await this.prisma.$transaction(async (tx) => {
                    // Update reference library
                    await tx.references.update({
                        where: { id: referenceId },
                        data: { 
                            libraryId: targetLibraryId,
                            dateModified: new Date()
                        }
                    });

                    // Remove from current collections
                    await tx.collectionItems.deleteMany({
                        where: { referenceId: referenceId }
                    });

                    // Add to target collection if specified
                    if (targetCollectionId) {
                        await tx.collectionItems.create({
                            data: {
                                referenceId: referenceId,
                                collectionId: targetCollectionId
                            }
                        });
                    }
                });

                successfulIds.push(referenceId);
            } catch (error) {
                failures.push({ 
                    id: referenceId, 
                    error: error.message || 'Unknown error occurred' 
                });
            }
        }

        return {
            operation: 'move',
            processedCount: referenceIds.length,
            successCount: successfulIds.length,
            failureCount: failures.length,
            successfulIds,
            failures,
            message: `Bulk move completed. ${successfulIds.length} references moved to target library.`
        };
    }

    /**
     * Bulk tag operations
     */
    async bulkTag(libraryId: string, bulkTagDto: BulkTagDto): Promise<BulkOperationResultDto> {
        const { referenceIds, tags, action } = bulkTagDto;
        
        const successfulIds: string[] = [];
        const failures: Array<{ id: string; error: string }> = [];

        for (const referenceId of referenceIds) {
            try {
                const reference = await this.prisma.references.findFirst({
                    where: { 
                        id: referenceId, 
                        libraryId,
                        isDeleted: false 
                    }
                });

                if (!reference) {
                    failures.push({ 
                        id: referenceId, 
                        error: 'Reference not found' 
                    });
                    continue;
                }

                let newTags: string[] = [];
                const currentTags = reference.tags || [];

                switch (action) {
                    case 'add':
                        newTags = [...new Set([...currentTags, ...tags])];
                        break;
                    case 'remove':
                        newTags = currentTags.filter(tag => !tags.includes(tag));
                        break;
                    case 'replace':
                        newTags = tags;
                        break;
                }

                await this.prisma.references.update({
                    where: { id: referenceId },
                    data: { 
                        tags: newTags,
                        dateModified: new Date()
                    }
                });

                successfulIds.push(referenceId);
            } catch (error) {
                failures.push({ 
                    id: referenceId, 
                    error: error.message || 'Unknown error occurred' 
                });
            }
        }

        return {
            operation: `${action}_tags`,
            processedCount: referenceIds.length,
            successCount: successfulIds.length,
            failureCount: failures.length,
            successfulIds,
            failures,
            message: `Bulk tag ${action} completed. ${successfulIds.length} references updated.`
        };
    }

    /**
     * Bulk export references
     */
    async bulkExport(libraryId: string, bulkExportDto: BulkExportDto): Promise<BulkOperationResultDto> {
        const { referenceIds, format, filename, includeFiles = false } = bulkExportDto;
        
        const references = await this.prisma.references.findMany({
            where: { 
                id: { in: referenceIds },
                libraryId,
                isDeleted: false 
            },
            include: {
                Files: includeFiles
            }
        });

        if (references.length === 0) {
            throw new Error('No references found for export');
        }

        // Generate export data based on format
        let exportData: string;
        let mimeType: string;
        let fileExtension: string;

        switch (format) {
            case 'bibtex':
                exportData = this.generateBibTeX(references);
                mimeType = 'application/x-bibtex';
                fileExtension = 'bib';
                break;
            case 'ris':
                exportData = this.generateRIS(references);
                mimeType = 'application/x-research-info-systems';
                fileExtension = 'ris';
                break;
            case 'json':
                exportData = JSON.stringify(references, null, 2);
                mimeType = 'application/json';
                fileExtension = 'json';
                break;
            case 'csv':
                exportData = this.generateCSV(references);
                mimeType = 'text/csv';
                fileExtension = 'csv';
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }

        // Save export file (implement file storage logic)
        const exportFilename = `${filename || 'references'}.${fileExtension}`;
        const exportPath = await this.saveExportFile(exportData, exportFilename, mimeType);

        return {
            operation: 'export',
            processedCount: referenceIds.length,
            successCount: references.length,
            failureCount: referenceIds.length - references.length,
            successfulIds: references.map(ref => ref.id),
            failures: [],
            message: `Export completed. ${references.length} references exported to ${format.toUpperCase()}.`,
            additionalData: {
                exportPath,
                filename: exportFilename,
                format,
                mimeType
            }
        };
    }

    private generateBibTeX(references: any[]): string {
        // Implement BibTeX generation logic
        return references.map(ref => {
            const type = ref.type || 'article';
            const key = `${ref.authors?.[0]?.name?.split(' ').pop() || 'unknown'}${ref.year || ''}`;
            
            return `@${type}{${key},
  title={${ref.title}},
  author={${ref.authors?.map(a => a.name).join(' and ') || ''}},
  year={${ref.year || ''}},
  journal={${ref.publication || ''}},
  doi={${ref.doi || ''}},
  url={${ref.url || ''}}
}`;
        }).join('\n\n');
    }

    private generateRIS(references: any[]): string {
        // Implement RIS generation logic
        return references.map(ref => {
            return `TY  - JOUR
TI  - ${ref.title}
AU  - ${ref.authors?.map(a => a.name).join('\nAU  - ') || ''}
PY  - ${ref.year || ''}
JO  - ${ref.publication || ''}
DO  - ${ref.doi || ''}
UR  - ${ref.url || ''}
ER  - `;
        }).join('\n\n');
    }

    private generateCSV(references: any[]): string {
        // Implement CSV generation logic
        const headers = ['Title', 'Authors', 'Year', 'Publication', 'DOI', 'URL'];
        const rows = references.map(ref => [
            ref.title,
            ref.authors?.map(a => a.name).join('; ') || '',
            ref.year || '',
            ref.publication || '',
            ref.doi || '',
            ref.url || ''
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }

    private async saveExportFile(data: string, filename: string, mimeType: string): Promise<string> {
        // Implement file storage logic (local storage, S3, etc.)
        // For now, return a placeholder path
        return `/exports/${filename}`;
    }
}
