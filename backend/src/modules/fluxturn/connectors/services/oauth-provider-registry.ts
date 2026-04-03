/**
 * OAuth Provider Registry
 *
 * Centralized configuration for all OAuth providers, defining which providers
 * support token refresh and mapping connector types to their OAuth services.
 */

export interface OAuthProviderConfig {
  name: string;
  supportsRefreshToken: boolean;
  serviceClass: string;
  connectorTypes: string[];
}

/**
 * Registry of all OAuth providers and their configurations.
 * Used by the OAuthTokenRefreshService to determine how to handle each provider.
 */
export const OAUTH_PROVIDER_REGISTRY: Record<string, OAuthProviderConfig> = {
  // Google OAuth (supports multiple Google services)
  google: {
    name: 'Google',
    supportsRefreshToken: true,
    serviceClass: 'GoogleOAuthService',
    connectorTypes: [
      'gmail',
      'google_sheets',
      'google_drive',
      'google_docs',
      'google_calendar',
      'google_analytics',
      'youtube',
      'google_forms',
      'google_ads'
    ]
  },

  // Twitter OAuth 2.0 with PKCE
  twitter: {
    name: 'Twitter',
    supportsRefreshToken: true,
    serviceClass: 'TwitterOAuthService',
    connectorTypes: ['twitter']
  },

  // LinkedIn OAuth
  linkedin: {
    name: 'LinkedIn',
    supportsRefreshToken: true,
    serviceClass: 'LinkedInOAuthService',
    connectorTypes: ['linkedin']
  },

  // Facebook OAuth (includes Instagram)
  facebook: {
    name: 'Facebook',
    supportsRefreshToken: true,
    serviceClass: 'FacebookOAuthService',
    connectorTypes: ['facebook', 'instagram']
  },

  // Slack OAuth
  slack: {
    name: 'Slack',
    supportsRefreshToken: true,
    serviceClass: 'SlackOAuthService',
    connectorTypes: ['slack']
  },

  // Discord OAuth
  discord: {
    name: 'Discord',
    supportsRefreshToken: true,
    serviceClass: 'DiscordOAuthService',
    connectorTypes: ['discord']
  },

  // Zoom OAuth
  zoom: {
    name: 'Zoom',
    supportsRefreshToken: true,
    serviceClass: 'ZoomOAuthService',
    connectorTypes: ['zoom']
  },

  // HubSpot OAuth
  hubspot: {
    name: 'HubSpot',
    supportsRefreshToken: true,
    serviceClass: 'HubSpotOAuthService',
    connectorTypes: ['hubspot']
  },

  // Salesforce OAuth
  salesforce: {
    name: 'Salesforce',
    supportsRefreshToken: true,
    serviceClass: 'SalesforceOAuthService',
    connectorTypes: ['salesforce']
  },

  // Reddit OAuth
  reddit: {
    name: 'Reddit',
    supportsRefreshToken: true,
    serviceClass: 'RedditOAuthService',
    connectorTypes: ['reddit']
  },

  // Pinterest OAuth
  pinterest: {
    name: 'Pinterest',
    supportsRefreshToken: true,
    serviceClass: 'PinterestOAuthService',
    connectorTypes: ['pinterest']
  },

  // ClickUp OAuth
  clickup: {
    name: 'ClickUp',
    supportsRefreshToken: true,
    serviceClass: 'ClickUpOAuthService',
    connectorTypes: ['clickup']
  },

  // Microsoft Teams OAuth
  microsoft_teams: {
    name: 'Microsoft Teams',
    supportsRefreshToken: true,
    serviceClass: 'MicrosoftTeamsOAuthService',
    connectorTypes: ['microsoft_teams']
  },

  // ===== Providers WITHOUT refresh token support =====
  // These tokens either never expire or require user re-authentication

  // Shopify - tokens never expire
  shopify: {
    name: 'Shopify',
    supportsRefreshToken: false,
    serviceClass: 'ShopifyOAuthService',
    connectorTypes: ['shopify']
  },

  // Notion - tokens never expire
  notion: {
    name: 'Notion',
    supportsRefreshToken: false,
    serviceClass: 'NotionOAuthService',
    connectorTypes: ['notion']
  },

  // GitHub - long-lived tokens, no refresh
  github: {
    name: 'GitHub',
    supportsRefreshToken: false,
    serviceClass: 'GitHubOAuthService',
    connectorTypes: ['github']
  }
};

/**
 * Get provider configuration by connector type
 * @param connectorType The connector type (e.g., 'gmail', 'twitter')
 * @returns The provider config or null if not found
 */
export function getProviderByConnectorType(connectorType: string): (OAuthProviderConfig & { provider: string }) | null {
  for (const [provider, config] of Object.entries(OAUTH_PROVIDER_REGISTRY)) {
    if (config.connectorTypes.includes(connectorType)) {
      return { ...config, provider };
    }
  }
  return null;
}

/**
 * Check if a connector type supports token refresh
 * @param connectorType The connector type to check
 * @returns True if the provider supports refresh tokens
 */
export function supportsTokenRefresh(connectorType: string): boolean {
  const provider = getProviderByConnectorType(connectorType);
  return provider?.supportsRefreshToken ?? false;
}

/**
 * Get all connector types that support token refresh
 * @returns Array of connector types
 */
export function getRefreshableConnectorTypes(): string[] {
  const types: string[] = [];
  for (const config of Object.values(OAUTH_PROVIDER_REGISTRY)) {
    if (config.supportsRefreshToken) {
      types.push(...config.connectorTypes);
    }
  }
  return types;
}
