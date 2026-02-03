// src/common/services/bootstrap.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { CitationStyleSeeder } from 'src/scripts/init-citation-styles.script';

@Injectable()
export class BootstrapService implements OnModuleInit {
    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        try {
            await this.checkDatabaseConnection();
            // Production'da da eksik citation style'ları seed et
            await this.seedMissingCitationStyles();
        } catch (error) {
            console.error('❌ Bootstrap failed:', error);
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
                await seeder.disconnect();
                return;
            }


            // Sadece eksik stilleri seed et
            await seeder.seedSpecificStyles(missingStyles);
            await seeder.disconnect();

            const finalCount = await this.prisma.citationStyle.count({
                where: { isCustom: false }
            });


        } catch (error) {
            console.error('❌ Failed to seed missing citation styles:', error);
            throw error;
        }
    }

    private async checkDatabaseConnection(): Promise<void> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    private async runOtherBootstrapTasks(): Promise<void> {
    }
}