// src/common/services/bootstrap.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CitationStyleSeeder } from 'src/scripts/init-citation-styles.script';

@Injectable()
export class BootstrapService implements OnModuleInit {
    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        if (process.env.NODE_ENV === 'production') {
            console.log('⏭️  Skipping bootstrap in production environment');
            return;
        }

        console.log('🚀 Running application bootstrap...');

        try {
            await this.checkDatabaseConnection();
            await this.seedMissingCitationStyles();
            console.log('✅ Bootstrap completed successfully!');
        } catch (error) {
            console.error('❌ Bootstrap failed:', error);
        }
    }

    /**
     * Eksik citation stilleri ekle (mevcut olanları tekrar ekleme)
     */
    private async seedMissingCitationStyles(): Promise<void> {
        try {
            console.log('📚 Checking for missing citation styles...');

            const seeder = new CitationStyleSeeder();
            
            // Seeder'dan mevcut tüm stil listesini al
            const allRequiredStyles = seeder.getAllStyleConfigs();
            
            // Veritabanında mevcut stilleri kontrol et
            const existingStyles = await this.prisma.citationStyle.findMany({
                where: {
                    isCustom: false // Sadece sistem stillerini kontrol et
                },
                select: {
                    shortName: true
                }
            });

            const existingShortNames = new Set(existingStyles.map(style => style.shortName));
            
            // Eksik stilleri tespit et
            const missingStyles = allRequiredStyles.filter(
                styleConfig => !existingShortNames.has(styleConfig.shortName)
            );

            if (missingStyles.length === 0) {
                console.log(`✅ All citation styles are up to date (${existingStyles.length} styles found)`);
                await seeder.disconnect();
                return;
            }

            console.log(`📥 Found ${missingStyles.length} missing styles out of ${allRequiredStyles.length} total styles`);
            console.log(`Missing styles: ${missingStyles.map(s => s.shortName).join(', ')}`);

            // Sadece eksik stilleri seed et
            await seeder.seedSpecificStyles(missingStyles);
            await seeder.disconnect();

            const finalCount = await this.prisma.citationStyle.count({
                where: { isCustom: false }
            });

            console.log(`✅ Citation styles updated successfully (${finalCount} system styles total)`);

        } catch (error) {
            console.error('❌ Failed to seed missing citation styles:', error);
            throw error;
        }
    }

    private async checkDatabaseConnection(): Promise<void> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            console.log('✅ Database connection successful');
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    private async runOtherBootstrapTasks(): Promise<void> {
    }
}