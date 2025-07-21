import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject, IsArray, IsUrl, IsBoolean } from 'class-validator';

export class CaptureWebPageDto {
    @ApiProperty({
        example: 'https://www.nature.com/articles/s41586-023-12345-6',
        description: 'URL of the web page being captured'
    })
    @IsUrl()
    @IsNotEmpty()
    url: string;

    @ApiProperty({ example: 'journal', description: 'Type of reference (journal, book, conference, etc.)' })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({
        example: 'Machine learning advances in climate prediction',
        description: 'Title extracted from the web page'
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({
        example: 'This study presents novel machine learning approaches for climate prediction...',
        description: 'Abstract or description extracted from the page'
    })
    @IsOptional()
    @IsString()
    abstractText?: string;

    @ApiPropertyOptional({
        example: [
            { firstName: 'John', lastName: 'Smith', affiliation: 'MIT' },
            { firstName: 'Jane', lastName: 'Doe', affiliation: 'Stanford' }
        ],
        description: 'Authors extracted from the page'
    })
    @IsOptional()
    @IsArray()
    authors?: Array<{
        firstName?: string;
        lastName?: string;
        affiliation?: string;
        email?: string;
    }>;

    @ApiPropertyOptional({
        example: 'Nature',
        description: 'Publication/Journal name'
    })
    @IsOptional()
    @IsString()
    publication?: string;

    @ApiPropertyOptional({
        example: 2023,
        description: 'Publication year'
    })
    @IsOptional()
    @IsString()
    year?: number;

    @ApiPropertyOptional({
        example: '10.1038/s41586-023-12345-6',
        description: 'DOI if available'
    })
    @IsOptional()
    @IsString()
    doi?: string;

    @ApiPropertyOptional({
        example: '1234-5678',
        description: 'ISSN if available'
    })
    @IsOptional()
    @IsString()
    issn?: string;

    @ApiPropertyOptional({
        example: '45',
        description: 'Volume number'
    })
    @IsOptional()
    @IsString()
    volume?: string;

    @ApiPropertyOptional({
        example: '3',
        description: 'Issue number'
    })
    @IsOptional()
    @IsString()
    issue?: string;

    @ApiPropertyOptional({
        example: '123-145',
        description: 'Page numbers'
    })
    @IsOptional()
    @IsString()
    pages?: string;

    @ApiPropertyOptional({
        example: 'en',
        description: 'Language of the content'
    })
    @IsOptional()
    @IsString()
    language?: string;

    @ApiPropertyOptional({
        example: {
            htmlTitle: '<title>Machine learning advances in climate prediction</title>',
            metaTags: {
                'citation_title': 'Machine learning advances',
                'citation_author': 'Smith, John',
                'citation_publication_date': '2023-01-15',
                'citation_journal_title': 'Nature',
                'citation_doi': '10.1038/s41586-023-12345-6'
            },
            openGraph: {
                'og:title': 'Machine learning advances',
                'og:description': 'This study presents...',
                'og:type': 'article'
            },
            jsonLd: {
                '@type': 'ScholarlyArticle',
                'headline': 'Machine learning advances',
                'author': [{ 'name': 'John Smith' }]
            }
        },
        description: 'Raw metadata extracted from HTML'
    })
    @IsOptional()
    @IsObject()
    rawMetadata?: {
        htmlTitle?: string;
        metaTags?: Record<string, string>;
        openGraph?: Record<string, string>;
        jsonLd?: Record<string, any>;
        dublinCore?: Record<string, string>;
        highwire?: Record<string, string>;
    };

    @ApiPropertyOptional({
        example: {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            extensionVersion: '2.1.0',
            browserName: 'Chrome',
            browserVersion: '118.0.0.0',
            timestamp: '2023-12-01T10:30:00.000Z'
        },
        description: 'Browser and extension information'
    })
    @IsOptional()
    @IsObject()
    browserInfo?: {
        userAgent?: string;
        extensionVersion?: string;
        browserName?: string;
        browserVersion?: string;
        timestamp?: string;
    };

    @ApiPropertyOptional({
        example: 'zotero-translator',
        description: 'Which translator was used for extraction'
    })
    @IsOptional()
    @IsString()
    translatorUsed?: string;

    @ApiPropertyOptional({
        example: 'manual',
        description: 'How the capture was initiated'
    })
    @IsOptional()
    @IsString()
    captureMethod?: 'automatic' | 'manual' | 'bulk' | 'api';

    @ApiPropertyOptional({
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d',
        description: 'Target library ID for the captured reference'
    })
    @IsOptional()
    @IsString()
    libraryId?: string;

    @ApiPropertyOptional({
        example: ['machine-learning', 'climate', 'prediction'],
        description: 'Tags to be added to the reference'
    })
    @IsOptional()
    @IsArray()
    tags?: string[];

    @ApiPropertyOptional({
        example: 'Interesting paper for climate research project',
        description: 'User notes about the captured reference'
    })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({
        example: true,
        description: 'Whether to auto-create the reference immediately'
    })
    @IsOptional()
    @IsBoolean()
    autoCreate?: boolean;
}