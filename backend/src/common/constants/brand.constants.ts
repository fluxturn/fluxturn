/**
 * Brand configuration for FluxTurn.
 *
 * Fork maintainers: update these values to rebrand the application.
 * Email templates, notification text, and other brand-specific strings
 * should reference these constants.
 */

export const BRAND = {
  name: 'FluxTurn',
  tagline: 'AI-Powered Workflow Automation Platform',

  // Emails
  supportEmail: 'support@fluxturn.com',
  securityEmail: 'security@fluxturn.com',
  noReplyEmail: process.env.MAIL_FROM_ADDRESS || 'noreply@fluxturn.com',

  // URLs (override via env vars for self-hosted deployments)
  website: process.env.SITE_DOMAIN
    ? `https://${process.env.SITE_DOMAIN}`
    : 'https://fluxturn.com',
  docs: 'https://docs.fluxturn.com',

  // Legal
  companyName: 'FluxTurn Contributors',
  copyrightYear: 2025,
} as const;
