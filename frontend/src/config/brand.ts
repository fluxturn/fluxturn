/**
 * Brand configuration for FluxTurn.
 *
 * Fork maintainers: update these values to rebrand the application.
 * All brand-specific strings should reference this config rather than
 * being hardcoded throughout the codebase.
 */

export const BRAND = {
  // Core identity
  name: 'FluxTurn',
  tagline: 'AI-Powered Workflow Automation Platform',
  description:
    'Build, automate, and scale workflows with 80+ integrations and AI-powered generation.',

  // URLs
  website: 'https://fluxturn.com',
  docs: 'https://docs.fluxturn.com',
  cdn: 'https://cdn.fluxturn.com',
  github: 'https://github.com/fluxturn/fluxturn',

  // Community
  discord: 'https://discord.gg/tpJZ9J3q',
  twitter: 'https://twitter.com/fluxturn',

  // Contact
  supportEmail: 'support@fluxturn.com',
  securityEmail: 'security@fluxturn.com',
  noReplyEmail: 'noreply@fluxturn.com',

  // Legal
  companyName: 'FluxTurn Contributors',
  copyrightYear: 2025,

  // Local storage keys (changing these will reset user preferences)
  storagePrefix: 'fluxturn',
} as const;

export type Brand = typeof BRAND;
