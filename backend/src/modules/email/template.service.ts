import { Injectable, Logger } from '@nestjs/common';
import * as handlebars from 'handlebars';

export interface TemplateData {
  [key: string]: any;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private compiledTemplates = new Map<string, handlebars.TemplateDelegate>();

  constructor() {
    this.registerHelpers();
  }

  /**
   * Render a template with the given data
   * Supports both HTML and text templates
   */
  async renderTemplate(
    template: string,
    type: 'html' | 'text' | 'mjml',
    data: TemplateData
  ): Promise<{ html?: string; text?: string }> {
    try {
      const compiled = this.compileTemplate(template);
      const rendered = compiled(data);

      if (type === 'html' || type === 'mjml') {
        return { html: rendered, text: this.htmlToText(rendered) };
      } else {
        return { text: rendered };
      }
    } catch (error) {
      this.logger.error('Template rendering error:', error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Compile a template string using Handlebars
   */
  private compileTemplate(template: string): handlebars.TemplateDelegate {
    try {
      return handlebars.compile(template);
    } catch (error) {
      this.logger.error('Template compilation error:', error);
      throw new Error(`Template compilation failed: ${error.message}`);
    }
  }

  /**
   * Simple HTML to text conversion
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Extract variables from a template
   */
  extractVariables(template: string): string[] {
    const variables = new Set<string>();
    const regex = /\{\{\{?([^}]+)\}?\}\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      const variable = match[1].trim();
      // Handle helpers like {{#if}} and {{/if}}
      if (!variable.startsWith('#') && !variable.startsWith('/')) {
        // Extract the variable name (before any spaces or helpers)
        const varName = variable.split(/\s+/)[0];
        variables.add(varName);
      }
    }

    return Array.from(variables);
  }

  /**
   * Register common Handlebars helpers
   */
  private registerHelpers(): void {
    // Comparison helpers
    handlebars.registerHelper('eq', (a, b) => a === b);
    handlebars.registerHelper('ne', (a, b) => a !== b);
    handlebars.registerHelper('gt', (a, b) => a > b);
    handlebars.registerHelper('lt', (a, b) => a < b);
    handlebars.registerHelper('gte', (a, b) => a >= b);
    handlebars.registerHelper('lte', (a, b) => a <= b);

    // Logical helpers
    handlebars.registerHelper('and', (a, b) => a && b);
    handlebars.registerHelper('or', (a, b) => a || b);
    handlebars.registerHelper('not', (a) => !a);

    // Date formatting
    handlebars.registerHelper('formatDate', (date, format) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString();
    });

    // Currency formatting
    handlebars.registerHelper('formatCurrency', (amount, currency = 'USD') => {
      if (!amount) return '';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // String helpers
    handlebars.registerHelper('capitalize', (str) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    handlebars.registerHelper('uppercase', (str) => {
      if (!str) return '';
      return str.toUpperCase();
    });

    handlebars.registerHelper('lowercase', (str) => {
      if (!str) return '';
      return str.toLowerCase();
    });

    handlebars.registerHelper('truncate', (str, length = 100) => {
      if (!str) return '';
      return str.length > length ? str.substring(0, length) + '...' : str;
    });

    // Default value helper
    handlebars.registerHelper('default', (value, defaultValue) => {
      return value || defaultValue;
    });
  }
}