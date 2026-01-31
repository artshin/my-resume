/**
 * Template renderer using Handlebars
 */

import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, '..', 'templates');

/**
 * Resume data structure for template rendering
 */
export interface ResumeTemplateData {
  profile: {
    name: string;
    email: string;
    phone?: string;
    location: string;
    linkedin?: string;
    github?: string;
    website?: string;
    websiteLabel?: string;
  };

  summary: string;

  skills: {
    highlighted: string[];
    additional?: string[];
    grouped?: boolean;
    categories?: { label: string; items: string }[];
  };

  experience: Array<{
    company: string;
    title: string;
    location?: string;
    dates: string;
    companyDescription?: string;
    technologies?: string[];
    bullets: string[];
  }>;

  projects?: Array<{
    name: string;
    description?: string;
    technologies?: string;
    impact?: string;
  }>;

  education: Array<{
    degree: string;
    field?: string;
    institution: string;
    year: number;
  }>;

  certifications?: Array<{
    name: string;
    issuer?: string;
    year?: number;
  }>;

  options?: {
    twoPage?: boolean;
    compact?: boolean;
    showProjects?: boolean;
  };
}

/**
 * Template renderer class
 */
export class TemplateRenderer {
  private template: Handlebars.TemplateDelegate;
  private styles: string;

  constructor(templateName = 'default') {
    // Load CSS
    this.styles = readFileSync(join(TEMPLATES_DIR, 'styles', 'resume.css'), 'utf-8');

    // Register partials
    this.registerPartials();

    // Compile main template
    const templatePath = join(TEMPLATES_DIR, `${templateName}.hbs`);
    const templateSource = readFileSync(templatePath, 'utf-8');
    this.template = Handlebars.compile(templateSource);
  }

  /**
   * Register all partials
   */
  private registerPartials(): void {
    const partials = ['header', 'summary', 'skills', 'experience', 'education', 'projects'];

    for (const partial of partials) {
      const partialPath = join(TEMPLATES_DIR, 'partials', `${partial}.hbs`);
      try {
        const partialSource = readFileSync(partialPath, 'utf-8');
        Handlebars.registerPartial(partial, partialSource);
      } catch {
        // Partial not found, skip
      }
    }
  }

  /**
   * Render resume HTML
   */
  render(data: ResumeTemplateData): string {
    return this.template({
      ...data,
      styles: this.styles,
    });
  }

  /**
   * Get just the CSS styles
   */
  getStyles(): string {
    return this.styles;
  }
}

/**
 * Register custom Handlebars helpers
 */
Handlebars.registerHelper('join', function (array: string[], separator: string) {
  if (!Array.isArray(array)) return '';
  return array.join(separator);
});

Handlebars.registerHelper('ifEquals', function (this: unknown, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('truncate', function (str: string, length: number) {
  if (typeof str !== 'string') return '';
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
});

/**
 * Create a renderer instance
 */
let defaultRenderer: TemplateRenderer | undefined;

export function getTemplateRenderer(templateName = 'default'): TemplateRenderer {
  if (!defaultRenderer || templateName !== 'default') {
    defaultRenderer = new TemplateRenderer(templateName);
  }
  return defaultRenderer;
}

/**
 * Quick render function
 */
export function renderResume(data: ResumeTemplateData, templateName = 'default'): string {
  const renderer = getTemplateRenderer(templateName);
  return renderer.render(data);
}
