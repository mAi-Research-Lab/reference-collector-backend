// src/common/services/bootstrap.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CitationStyleSeeder } from 'src/scripts/init-citation-styles.script';

@Injectable()
export class BootstrapService implements OnModuleInit {
    private readonly logger = new Logger(BootstrapService.name);

    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        this.logger.log('🚀 Bootstrap service initializing...');
        try {
            await this.checkDatabaseConnection();
            // Production'da da eksik citation style'ları seed et
            await this.seedMissingCitationStyles();
            this.logger.log('✅ Bootstrap completed successfully');
        } catch (error) {
            this.logger.error('❌ Bootstrap failed:', error);
            // Production'da hata olsa bile uygulama çalışmaya devam etsin
            if (process.env.NODE_ENV !== 'production') {
                throw error;
            }
        }
    }

    /**
     * Eksik citation stilleri ekle (mevcut olanları tekrar ekleme)
     */
    private async seedMissingCitationStyles(): Promise<void> {
        try {
            this.logger.log('📋 Checking citation styles...');

            const seeder = new CitationStyleSeeder();
            
            // Seeder'dan mevcut tüm stil listesini al
            const allRequiredStyles = seeder.getAllStyleConfigs();
            this.logger.log(`📚 Found ${allRequiredStyles.length} required citation styles`);
            
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
            this.logger.log(`✅ Found ${existingStyles.length} existing citation styles in database`);
            
            // Eksik stilleri tespit et
            const missingStyles = allRequiredStyles.filter(
                styleConfig => !existingShortNames.has(styleConfig.shortName)
            );

            if (missingStyles.length === 0) {
                this.logger.log('✅ All citation styles are up to date');
                await seeder.disconnect();
                return;
            }

            this.logger.log(`🌱 Seeding ${missingStyles.length} missing citation styles...`);

            // Sadece eksik stilleri seed et
            await seeder.seedSpecificStyles(missingStyles);
            await seeder.disconnect();

            const finalCount = await this.prisma.citationStyle.count({
                where: { isCustom: false }
            });

            this.logger.log(`✅ Citation styles seeding completed. Total styles: ${finalCount}`);

        } catch (error) {
            this.logger.error('❌ Failed to seed missing citation styles:', error);
            throw error;
        }
    }

    private async checkDatabaseConnection(): Promise<void> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            this.logger.log('✅ Database connection verified');
        } catch (error) {
            this.logger.error('❌ Database connection failed:', error);
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    private async runOtherBootstrapTasks(): Promise<void> {
    }
}