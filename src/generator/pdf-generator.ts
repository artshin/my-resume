/**
 * PDF Generator using Puppeteer
 */

import puppeteer, { type Browser, type PDFOptions } from 'puppeteer';

export type PaperSize = 'letter' | 'a4';

export interface PdfGeneratorOptions {
  /** Paper size */
  paperSize?: PaperSize;
  /** Page margins */
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  /** Print background colors/images */
  printBackground?: boolean;
  /** Landscape orientation */
  landscape?: boolean;
  /** Scale (0.1 to 2) */
  scale?: number;
  /** Display header/footer */
  displayHeaderFooter?: boolean;
  /** Header template HTML */
  headerTemplate?: string;
  /** Footer template HTML */
  footerTemplate?: string;
}

const DEFAULT_OPTIONS: PdfGeneratorOptions = {
  paperSize: 'letter',
  margin: {
    top: '0.5in',
    bottom: '0.5in',
    left: '0.5in',
    right: '0.5in',
  },
  printBackground: true,
  landscape: false,
  scale: 1,
  displayHeaderFooter: false,
};

/**
 * PDF Generator class
 */
export class PdfGenerator {
  private browser: Browser | null = null;

  /**
   * Initialize browser (lazy)
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Generate PDF from HTML string
   */
  async generateFromHtml(
    html: string,
    outputPath: string,
    options: PdfGeneratorOptions = {}
  ): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Set content and wait for rendering
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Generate PDF
      const pdfOptions: PDFOptions = {
        path: outputPath,
        format: opts.paperSize === 'a4' ? 'A4' : 'Letter',
        margin: opts.margin,
        printBackground: opts.printBackground,
        landscape: opts.landscape,
        scale: opts.scale,
        displayHeaderFooter: opts.displayHeaderFooter,
        headerTemplate: opts.headerTemplate,
        footerTemplate: opts.footerTemplate,
      };

      await page.pdf(pdfOptions);

      return outputPath;
    } finally {
      await page.close();
    }
  }

  /**
   * Generate PDF and return as buffer
   */
  async generateBuffer(
    html: string,
    options: PdfGeneratorOptions = {}
  ): Promise<Buffer> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const pdfOptions: PDFOptions = {
        format: opts.paperSize === 'a4' ? 'A4' : 'Letter',
        margin: opts.margin,
        printBackground: opts.printBackground,
        landscape: opts.landscape,
        scale: opts.scale,
      };

      const buffer = await page.pdf(pdfOptions);
      return Buffer.from(buffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
let defaultGenerator: PdfGenerator | null = null;

/**
 * Get or create PDF generator instance
 */
export function getPdfGenerator(): PdfGenerator {
  if (!defaultGenerator) {
    defaultGenerator = new PdfGenerator();
  }
  return defaultGenerator;
}

/**
 * Generate PDF from HTML (convenience function)
 */
export async function generatePdf(
  html: string,
  outputPath: string,
  options?: PdfGeneratorOptions
): Promise<string> {
  const generator = getPdfGenerator();
  return generator.generateFromHtml(html, outputPath, options);
}

/**
 * Cleanup PDF generator resources
 */
export async function closePdfGenerator(): Promise<void> {
  if (defaultGenerator) {
    await defaultGenerator.close();
    defaultGenerator = null;
  }
}
