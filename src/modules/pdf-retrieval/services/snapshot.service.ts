import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Browser, Page, PDFOptions } from 'puppeteer';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { PageMetadata, SnapshotOptions, SnapshotResult } from '../interfaces/snapshot.interface';

@Injectable()
export class SnapshotService {
    private readonly logger = new Logger(SnapshotService.name);
    private browser: Browser | null = null;
    private readonly adBlockSelectors = [
        '[class*="ad-"]', '[id*="ad-"]', '[class*="ads-"]', '[id*="ads-"]',
        '[class*="advertisement"]', '[class*="sponsored"]', '[class*="banner"]',
        '.google-ads', '.adsystem', '.ad-container', '.advertisement',
        'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
        'iframe[src*="amazon-adsystem"]', '[data-ad-slot]', '.adsbygoogle'
    ];

    async createPdfSnapshot(url: string, options: SnapshotOptions = {}): Promise<SnapshotResult> {
        const startTime = Date.now();
        let page: Page | null = null;

        try {
            this.validateUrl(url);

            await this.ensureBrowser();

            page = await this.browser!.newPage();
            await this.configurePage(page, options);

            const pdfBuffer = await this.captureWithBrowser(url, page, options);

            const quality = this.assessPdfQuality(pdfBuffer, options);

            const metadata = await this.extractPageMetadata(page, url);

            const processingTime = Date.now() - startTime;

            return {
                success: true,
                pdfBuffer,
                metadata,
                processingTime,
                quality
            };

        } catch (error) {
            this.logger.error(`Snapshot creation failed for ${url}: ${error.message}`);
            return {
                success: false,
                error: error.message,
                processingTime: Date.now() - startTime,
                quality: 'low'
            };
        } finally {
            if (page) {
                await page.close().catch(e => this.logger.warn(`Failed to close page: ${e.message}`));
            }
        }
    }

    async captureWithBrowser(url: string, page: Page, options: SnapshotOptions = {}): Promise<Buffer> {
        try {
            await page.setViewport({
                width: 1200,
                height: 800,
                deviceScaleFactor: options.quality === 'high' ? 2 : 1
            });

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: options.timeout || 30000
            });

            await page.waitForFunction(() => document.readyState === 'complete', {
                timeout: 10000
            }).catch(() => {
                this.logger.debug('DOM ready state timeout, continuing...');
            });

            if (options.waitForJS) {
                await new Promise(resolve => setTimeout(resolve, options.waitForJS));
            }

            await this.waitForDynamicContent(page);

            await this.scrollToLoadContent(page);

            if (options.removeAds || options.optimizeForReading || options.extractMainContent) {
                await this.optimizePageContent(page, options);
            }

            const pdfOptions = this.getPdfOptions(options);

            const pdfUint8Array = await page.pdf(pdfOptions);
            const pdfBuffer = Buffer.from(pdfUint8Array);

            return pdfBuffer;

        } catch (error) {
            throw new Error(`Browser capture failed: ${error.message}`);
        }
    }

    optimizeForReading(htmlContent: string): string {
        try {
            const $ = cheerio.load(htmlContent);

            $('nav, .nav, .navigation, .navbar, .menu, .breadcrumb').remove();

            $('aside, .sidebar, .side-bar, .widget, .widgets-area').remove();

            $('footer, .footer, .site-footer').remove();


            $('*').css({
                'font-family': 'Arial, sans-serif',
                'line-height': '1.6'
            });

            $('h1').css({ 'font-size': '24px', 'margin': '20px 0 10px 0', 'font-weight': 'bold' });
            $('h2').css({ 'font-size': '20px', 'margin': '18px 0 8px 0', 'font-weight': 'bold' });
            $('h3').css({ 'font-size': '18px', 'margin': '16px 0 6px 0', 'font-weight': 'bold' });
            $('h4, h5, h6').css({ 'font-size': '16px', 'margin': '14px 0 4px 0', 'font-weight': 'bold' });

            $('p').css({
                'margin': '0 0 15px 0',
                'line-height': '1.6',
                'font-size': '14px'
            });

            $('ul, ol').css({ 'margin': '10px 0', 'padding-left': '20px' });
            $('li').css({ 'margin': '5px 0', 'line-height': '1.5' });

            $('*').each((_, element) => {
                const $el = $(element);
                const style = $el.attr('style');
                if (style) {
                    const keepStyles = ['display', 'width', 'height', 'margin', 'padding'];
                    const styles = style.split(';').filter(s =>
                        keepStyles.some(keep => s.trim().startsWith(keep))
                    );
                    $el.attr('style', styles.join(';'));
                }
            });

            return $.html();

        } catch (error) {
            this.logger.warn(`HTML optimization failed: ${error.message}`);
            return htmlContent;
        }
    }

    removeAds(htmlContent: string): string {
        try {
            const $ = cheerio.load(htmlContent);

            this.adBlockSelectors.forEach(selector => {
                $(selector).remove();
            });

            $('iframe, script, img').each((_, element) => {
                const $el = $(element);
                const src = $el.attr('src') || '';

                if (this.isAdDomain(src)) {
                    $el.remove();
                }
            });

            $('div').each((_, element) => {
                const $el = $(element);
                const className = $el.attr('class') || '';
                const id = $el.attr('id') || '';

                if (this.isSuspiciousAdContainer(className, id)) {
                    $el.remove();
                }
            });

            $('script').each((_, element) => {
                const $el = $(element);
                const src = $el.attr('src') || '';
                const content = $el.html() || '';

                if (this.isTrackingScript(src, content)) {
                    $el.remove();
                }
            });

            $('.fb-like, .twitter-share-button, .linkedin-share, .social-share, .social-media').remove();
            $('iframe[src*="facebook.com"], iframe[src*="twitter.com"], iframe[src*="linkedin.com"]').remove();

            $('div:empty, span:empty, p:empty').remove();

            return $.html();

        } catch (error) {
            this.logger.warn(`Ad removal failed: ${error.message}`);
            return htmlContent;
        }
    }

    extractMainContent(htmlContent: string): string {
        try {
            const dom = new JSDOM(htmlContent, { url: 'https://example.com' });
            const document = dom.window.document;

            const reader = new Readability(document, {
                charThreshold: 500,
                classesToPreserve: ['highlight', 'important', 'note']
            });

            const article = reader.parse();

            if (!article) {
                return this.fallbackContentExtraction(htmlContent);
            }

            const $ = cheerio.load(article.content!);

            $('script, style, noscript').remove();

            $('div').each((_, element) => {
                const $el = $(element);
                if ($el.children().length === 0 && $el.text().trim()) {
                    $el.replaceWith(`<p>${$el.text()}</p>`);
                }
            });

            const structuredContent = `
        <html>
          <head>
            <title>${article.title}</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
              p { line-height: 1.6; margin-bottom: 15px; }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <h1>${article.title}</h1>
            <div class="reading-time">Estimated reading time: ${Math.ceil(article.length! / 200)} minutes</div>
            <div class="content">${$.html()}</div>
          </body>
        </html>
      `;

            return structuredContent;

        } catch (error) {
            this.logger.warn(`Content extraction failed: ${error.message}`);
            return this.fallbackContentExtraction(htmlContent);
        }
    }

    private async ensureBrowser(): Promise<void> {
        if (!this.browser || !this.browser.isConnected()) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ]
            });

            this.browser.on('disconnected', () => {
                this.logger.warn('Browser disconnected');
                this.browser = null;
            });
        }
    }

    private validateUrl(url: string): void {
        try {
            const parsedUrl = new URL(url);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('URL must use HTTP or HTTPS protocol');
            }
        } catch {
            throw new Error('Invalid URL format');
        }
    }

    private async configurePage(page: Page, options: SnapshotOptions): Promise<void> {
        await page.setRequestInterception(true);

        page.on('request', (request) => {
            const resourceType = request.resourceType();
            const url = request.url();

            if (this.isAdDomain(url) || this.isTrackingScript(url, '')) {
                request.abort();
                return;
            }

            if (!options.includeImages && ['image', 'stylesheet', 'font'].includes(resourceType)) {
                request.abort();
                return;
            }

            request.continue();
        });

        await page.setUserAgent('Mozilla/5.0 (compatible; ZoteroSnapshot/1.0)');

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9'
        });
    }

    private async waitForDynamicContent(page: Page): Promise<void> {
        try {
            await Promise.race([
                page.waitForSelector('article, .article, .content, .main-content', { timeout: 5000 }),
                new Promise(resolve => setTimeout(resolve, 3000)) // Fixed: use setTimeout instead of waitForTimeout
            ]);

            await page.evaluate(() => {
                return Promise.all(Array.from(document.images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                        setTimeout(resolve, 2000);
                    });
                }));
            });

        } catch (error) {
            this.logger.debug(`Dynamic content wait completed with: ${error.message}`);
        }
    }

    private async scrollToLoadContent(page: Page): Promise<void> {
        try {
            await page.evaluate(async () => {
                await new Promise<void>((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;

                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);

                    setTimeout(() => {
                        clearInterval(timer);
                        resolve();
                    }, 5000);
                });
            });

            await page.evaluate(() => window.scrollTo(0, 0));

        } catch (error) {
            this.logger.debug(`Scroll loading completed: ${error.message}`);
        }
    }

    private async optimizePageContent(page: Page, options: SnapshotOptions): Promise<void> {
        await page.evaluate((opts, adSelectors) => {

            if (opts.removeAds) {
                adSelectors.forEach((selector: string) => {
                    document.querySelectorAll(selector).forEach(el => el.remove());
                });
            }

            if (opts.optimizeForReading) {
                document.querySelectorAll('nav, .nav, .navigation, aside, .sidebar, footer, .footer').forEach(el => el.remove());

                const style = document.createElement('style');
                style.textContent = `
          body { font-family: Arial, sans-serif !important; line-height: 1.6 !important; }
          p { margin-bottom: 15px !important; }
          h1, h2, h3, h4, h5, h6 { margin-top: 20px !important; margin-bottom: 10px !important; }
        `;
                document.head.appendChild(style);
            }

        }, options, this.adBlockSelectors);
    }

    private getPdfOptions(options: SnapshotOptions): PDFOptions {
        const baseOptions: PDFOptions = {
            format: options.format || 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        };

        if (options.quality === 'high') {
            return {
                ...baseOptions,
                preferCSSPageSize: true,
                displayHeaderFooter: true,
                headerTemplate: '<div></div>',
                footerTemplate: '<div style="font-size: 10px; margin: 0 auto;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
            };
        }

        return baseOptions;
    }

    private async extractPageMetadata(page: Page, url: string): Promise<PageMetadata> {
        const metadata = await page.evaluate(() => {
            const getMetaContent = (name: string) => {
                const element = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
                return element?.getAttribute('content') || undefined;
            };

            return {
                title: document.title || 'Untitled',
                author: getMetaContent('author') || getMetaContent('article:author'),
                publishDate: getMetaContent('article:published_time') || getMetaContent('publish-date'),
                language: document.documentElement.lang || getMetaContent('language'),
                wordCount: document.body.innerText.split(/\s+/).length
            };
        });

        return {
            ...metadata,
            url,
            contentType: this.detectContentType(metadata.title, url),
            extractedAt: new Date()
        };
    }

    private assessPdfQuality(pdfBuffer: Buffer, options: SnapshotOptions): 'low' | 'medium' | 'high' {
        const size = pdfBuffer.length;

        if (size < 50000) return 'low';
        if (size > 500000 && options.quality === 'high') return 'high';
        return 'medium';
    }

    private detectContentType(title: string, url: string): 'article' | 'blog' | 'news' | 'academic' | 'other' {
        const lowerTitle = title.toLowerCase();
        const lowerUrl = url.toLowerCase();

        if (lowerUrl.includes('arxiv.org') || lowerUrl.includes('scholar.google') ||
            lowerTitle.includes('research') || lowerTitle.includes('study')) {
            return 'academic';
        }

        if (lowerUrl.includes('news') || lowerUrl.includes('cnn') || lowerUrl.includes('bbc')) {
            return 'news';
        }

        if (lowerUrl.includes('blog') || lowerUrl.includes('medium.com')) {
            return 'blog';
        }

        if (lowerTitle.includes('article') || lowerUrl.includes('article')) {
            return 'article';
        }

        return 'other';
    }

    private isAdDomain(url: string): boolean {
        const adDomains = [
            'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
            'amazon-adsystem.com', 'facebook.com/tr', 'google-analytics.com',
            'googletagmanager.com', 'outbrain.com', 'taboola.com'
        ];

        return adDomains.some(domain => url.includes(domain));
    }

    private isSuspiciousAdContainer(className: string, id: string): boolean {
        const suspiciousPatterns = ['ad', 'banner', 'sponsor', 'promo', 'commercial'];
        const text = `${className} ${id}`.toLowerCase();

        return suspiciousPatterns.some(pattern => text.includes(pattern));
    }

    private isTrackingScript(src: string, content: string): boolean {
        const trackingPatterns = ['analytics', 'tracking', 'gtag', 'fbevents', '_gaq'];
        const text = `${src} ${content}`.toLowerCase();

        return trackingPatterns.some(pattern => text.includes(pattern));
    }

    private fallbackContentExtraction(htmlContent: string): string {
        const $ = cheerio.load(htmlContent);

        const contentSelectors = [
            'article', '.article', '.content', '.main-content',
            '.post-content', '.entry-content', 'main', '.main'
        ];

        for (const selector of contentSelectors) {
            const content = $(selector).first();
            if (content.length && content.text().trim().length > 500) {
                return content.html() || htmlContent;
            }
        }

        return htmlContent;
    }

    async onModuleDestroy(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
        }
    }
}