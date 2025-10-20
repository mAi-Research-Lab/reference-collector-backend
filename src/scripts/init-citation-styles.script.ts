// scripts/init-citation-styles.script.ts
import { PrismaClient } from 'generated/prisma';
import { DOMParser } from 'xmldom';

interface StyleData {
  name: string;
  shortName: string;
  description?: string;
  cslContent: string;
  category: string;
  url: string;
  isPopular: boolean;
}

interface StyleConfig {
  shortName: string;
  url: string;
  category: string;
  isPopular: boolean;
}

export class CitationStyleSeeder {
  private prisma: PrismaClient;

  // Popüler citation stilleri ve URL'leri
  private readonly POPULAR_STYLES: StyleConfig[] = [
    {
      shortName: 'apa',
      url: 'https://www.zotero.org/styles/apa',
      category: 'apa',
      isPopular: true
    },
    {
      shortName: 'mla',
      url: 'https://www.zotero.org/styles/modern-language-association',
      category: 'mla',
      isPopular: true
    },
    {
      shortName: 'chicago-author-date',
      url: 'https://www.zotero.org/styles/chicago-author-date',
      category: 'chicago',
      isPopular: true
    },
    {
      shortName: 'chicago-note-bibliography',
      url: 'https://www.zotero.org/styles/chicago-note-bibliography',
      category: 'chicago',
      isPopular: true
    },
    {
      shortName: 'ieee',
      url: 'https://www.zotero.org/styles/ieee',
      category: 'ieee',
      isPopular: true
    },
    {
      shortName: 'harvard-cite-them-right',
      url: 'https://www.zotero.org/styles/harvard-cite-them-right',
      category: 'harvard',
      isPopular: true
    },
    {
      shortName: 'vancouver',
      url: 'https://www.zotero.org/styles/vancouver',
      category: 'vancouver',
      isPopular: true
    },
    {
      shortName: 'nature',
      url: 'https://www.zotero.org/styles/nature',
      category: 'science',
      isPopular: true
    },
    {
      shortName: 'science',
      url: 'https://www.zotero.org/styles/science',
      category: 'science',
      isPopular: true
    },
    {
      shortName: 'cell',
      url: 'https://www.zotero.org/styles/cell',
      category: 'science',
      isPopular: true
    },
    {
      shortName: 'elsevier-harvard',
      url: 'https://www.zotero.org/styles/elsevier-harvard',
      category: 'harvard',
      isPopular: false
    },
    {
      shortName: 'springer-basic-author-date',
      url: 'https://www.zotero.org/styles/springer-basic-author-date',
      category: 'science',
      isPopular: false
    },
    {
      shortName: 'american-medical-association',
      url: 'https://www.zotero.org/styles/american-medical-association',
      category: 'medicine',
      isPopular: false
    },
    {
      shortName: 'bluebook-law-review',
      url: 'https://www.zotero.org/styles/bluebook-law-review',
      category: 'law',
      isPopular: false
    },
    {
      shortName: 'asm-journals',
      url: 'https://www.zotero.org/styles/american-society-for-microbiology',
      category: 'science',
      isPopular: false
    }
  ];

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Tüm stil konfigürasyonlarını döndür (bootstrap service için)
   */
  getAllStyleConfigs(): StyleConfig[] {
    return [...this.POPULAR_STYLES];
  }

  /**
   * Belirli stilleri seed et (bootstrap service için)
   */
  async seedSpecificStyles(styleConfigs: StyleConfig[]): Promise<void> {

    let successCount = 0;
    let failureCount = 0;

    for (const styleConfig of styleConfigs) {
      try {
        
        // Double-check: stil gerçekten yok mu?
        const existingStyle = await this.checkIfStyleExists(styleConfig.shortName);
        if (existingStyle) {
          continue;
        }

        // CSL dosyasını indir
        const cslContent = await this.downloadCSLFile(styleConfig.url);
        
        // Metadata'yı çıkart
        const styleData = this.extractStyleMetadata(cslContent, styleConfig);
        
        // Veritabanına kaydet
        await this.saveStyleToDatabase(styleData);
        
        successCount++;
        
        // Rate limiting için kısa bekleme
        await this.delay(500);
        
      } catch (error) {
        console.error(`❌ Failed to process ${styleConfig.shortName}:`, error.message);
        failureCount++;
      }
    }

  }

  /**
   * Tüm stilleri seed et (manuel çalıştırma için)
   */
  async seedCitationStyles(): Promise<void> {

    let successCount = 0;
    let failureCount = 0;

    for (const styleConfig of this.POPULAR_STYLES) {
      try {
        
        // Stil zaten var mı kontrol et
        const existingStyle = await this.checkIfStyleExists(styleConfig.shortName);
        if (existingStyle) {
          continue;
        }

        // CSL dosyasını indir
        const cslContent = await this.downloadCSLFile(styleConfig.url);
        
        // Metadata'yı çıkart
        const styleData = this.extractStyleMetadata(cslContent, styleConfig);
        
        // Veritabanına kaydet
        await this.saveStyleToDatabase(styleData);
        
        successCount++;
        
        // Rate limiting için kısa bekleme
        await this.delay(500);
        
      } catch (error) {
        console.error(`❌ Failed to process ${styleConfig.shortName}:`, error.message);
        failureCount++;
      }
    }

  }

  /**
   * CSL dosyasını URL'den indir
   */
  private async downloadCSLFile(url: string): Promise<string> {
    try {
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      
      // İçeriğin geçerli olup olmadığını kontrol et
      this.validateCSLContent(content);
      
      return content;
      
    } catch (error) {
      throw new Error(`Failed to download CSL from ${url}: ${error.message}`);
    }
  }

  /**
   * CSL içeriğini validate et
   */
  private validateCSLContent(cslContent: string): void {
    try {
      const parser = new DOMParser({
        errorHandler: {
          warning: () => {},
          error: (error) => { throw new Error(error); },
          fatalError: (error) => { throw new Error(error); }
        }
      });

      const doc = parser.parseFromString(cslContent, 'text/xml');

      // Parser error kontrolü
      const parserErrors = doc.getElementsByTagName('parsererror');
      if (parserErrors.length > 0) {
        throw new Error(`Invalid XML: ${parserErrors[0].textContent}`);
      }

      // Root element kontrolü
      const styleElement = doc.documentElement;
      if (!styleElement || styleElement.tagName !== 'style') {
        throw new Error('Root element must be <style>');
      }

      // Namespace kontrolü
      const namespace = styleElement.getAttribute('xmlns');
      if (namespace !== 'http://purl.org/net/xbiblio/csl') {
        throw new Error('Invalid CSL namespace');
      }

      // Info element kontrolü
      const infoElements = doc.getElementsByTagName('info');
      if (infoElements.length === 0) {
        throw new Error('Missing required <info> element');
      }

    } catch (error) {
      throw new Error(`CSL validation failed: ${error.message}`);
    }
  }

  /**
   * CSL dosyasından metadata çıkart
   */
  private extractStyleMetadata(cslContent: string, config: StyleConfig): StyleData {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cslContent, 'text/xml');

    const infoElement = doc.getElementsByTagName('info')[0];

    // Title
    const titleElements = infoElement.getElementsByTagName('title');
    const title = titleElements[0]?.textContent?.trim() || config.shortName;

    // Title-short
    const titleShortElements = infoElement.getElementsByTagName('title-short');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const titleShort = titleShortElements[0]?.textContent?.trim() || this.generateShortName(title);

    // Summary/Description
    const summaryElements = infoElement.getElementsByTagName('summary');
    const summary = summaryElements[0]?.textContent?.trim();

    return {
      name: title,
      shortName: config.shortName,
      description: summary || `${title} citation style from Zotero Style Repository`,
      cslContent: cslContent,
      category: config.category,
      url: config.url,
      isPopular: config.isPopular
    };
  }

  /**
   * Short name generate et
   */
  private generateShortName(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);
  }

  /**
   * Stil zaten var mı kontrol et
   */
  private async checkIfStyleExists(shortName: string): Promise<boolean> {
    const existingStyle = await this.prisma.citationStyle.findFirst({
      where: {
        shortName: shortName
      }
    });

    return !!existingStyle;
  }

  /**
   * Stili veritabanına kaydet
   */
  private async saveStyleToDatabase(styleData: StyleData): Promise<void> {
    await this.prisma.citationStyle.create({
      data: {
        name: styleData.name,
        shortName: styleData.shortName,
        description: styleData.description,
        cslContent: styleData.cslContent,
        category: styleData.category,
        isDefault: styleData.shortName === 'apa', // APA'yı default yap
        isCustom: false, // Bu otomatik eklenen stiller
        createdBy: null, // System tarafından eklendi
        downloadCount: styleData.isPopular ? 100 : 0 // Popüler olanlara başlangıç sayısı ver
      }
    });
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Connection'ı kapat
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Script'i doğrudan çalıştırmak için
if (require.main === module) {
  const seeder = new CitationStyleSeeder();
  
  seeder.seedCitationStyles()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Citation styles seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      seeder.disconnect();
    });
}