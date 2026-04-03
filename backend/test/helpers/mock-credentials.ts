/**
 * Mock Credentials for Connector Testing
 *
 * Provides fake credentials for all connector types.
 * These credentials are used in tests to avoid needing real API keys.
 */

export const MOCK_CREDENTIALS: Record<string, any> = {
  // Marketing
  brevo: { apiKey: 'xkeysib-mock-key-12345' },
  mailchimp: { apiKey: 'mock-mailchimp-key-us1' },
  sendgrid: { apiKey: 'SG.mock-sendgrid-key' },
  hubspot: { accessToken: 'mock-hubspot-token' },
  klaviyo: { apiKey: 'pk_mock_klaviyo_key' },

  // Communication
  telegram: { botToken: '123456789:ABC-mock-telegram-token' },
  slack: { accessToken: 'xoxb-mock-slack-token' },
  discord: { botToken: 'mock-discord-bot-token' },
  twilio: { accountSid: 'ACmock', authToken: 'mock-auth-token' },
  mattermost: {
    accessToken: 'mock-mattermost-access-token',
    baseUrl: 'https://mattermost.example.com',
  },
  matrix: {
    accessToken: 'mock-matrix-access-token',
    homeserverUrl: 'https://matrix.example.com',
  },
  discourse: {
    url: 'https://discourse.example.com',
    apiKey: 'mock-discourse-api-key',
    username: 'mock-discourse-username',
  },
  medium: {
    accessToken: 'mock-medium-access-token',
  },
  ghost: {
    url: 'https://myblog.ghost.io',
    apiKey: 'mock-ghost-api-key:mock-secret-hex',
    source: 'adminApi',
  },
  posthog: {
    url: 'https://app.posthog.com',
    apiKey: 'phc_mock-posthog-api-key',
  },
  teams: {
    accessToken: 'mock-teams-access-token',
    refreshToken: 'mock-teams-refresh-token',
    clientId: 'mock-teams-client-id',
    clientSecret: 'mock-teams-client-secret',
    tenantId: 'mock-teams-tenant-id',
  },

  // Social
  twitter: {
    accessToken: 'mock-twitter-access-token',
    refreshToken: 'mock-twitter-refresh-token',
  },
  tiktok: {
    accessToken: 'mock-tiktok-access-token',
    refreshToken: 'mock-tiktok-refresh-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  },
  facebook: { accessToken: 'mock-facebook-token' },
  instagram: {
    access_token: 'mock-instagram-access-token',
    instagram_account_id: '17841400008460056',
    appId: 'mock-instagram-app-id',
    appSecret: 'mock-instagram-app-secret',
  },
  linkedin: { accessToken: 'mock-linkedin-token' },

  // Support
  freshdesk: {
    domain: 'mock-company',
    api_key: 'mock-freshdesk-api-key-12345',
  },
  intercom: {
    access_token: 'dG9rOm1vY2staW50ZXJjb20tYWNjZXNzLXRva2VuLTEyMzQ1',
  },
  pagerduty: {
    authType: 'api_token',
    apiToken: 'mock-pagerduty-api-token-12345',
  },

  // AI
  openai: { apiKey: 'sk-mock-openai-key' },
  anthropic: { apiKey: 'sk-ant-mock-key' },
  replicate: { apiToken: 'r8_mock_replicate_token' },
  aws_bedrock: {
    accessKeyId: 'AKIAMOCKBEDROCK12345',
    secretAccessKey: 'mock-bedrock-secret-access-key',
    region: 'us-east-1',
  },

  // Storage
  aws_s3: {
    accessKeyId: 'AKIAMOCK12345',
    secretAccessKey: 'mock-secret-key',
    region: 'us-east-1',
  },
  google_drive: { accessToken: 'mock-google-drive-token' },
  dropbox: { accessToken: 'sl.mock-dropbox-access-token', refreshToken: 'mock-dropbox-refresh-token' },

  // Marketing - Google Ads
  google_ads: {
    accessToken: 'ya29.mock-google-ads-access-token',
    developerToken: 'mock-developer-token-12345',
    customerId: '1234567890',
  },

  // CRM
  salesforce: {
    accessToken: 'mock-salesforce-token',
    refreshToken: 'mock-salesforce-refresh-token',
    instanceUrl: 'https://mock.salesforce.com',
    clientId: 'mock-salesforce-client-id',
    clientSecret: 'mock-salesforce-client-secret',
  },
  pipedrive: { apiToken: 'mock-pipedrive-token' },
  zoho_crm: { accessToken: 'mock-zoho-token' },

  // Forms
  jotform: {
    apiKey: 'mock-jotform-api-key-123456',
    apiDomain: 'api.jotform.com',
  },

  // Pinterest (OAuth2)
  pinterest: {
    accessToken: 'pina_mock-pinterest-access-token',
    refreshToken: 'pinr_mock-pinterest-refresh-token',
  },

  // Development
  github: { accessToken: 'ghp_mock_github_token' },
  gitlab: { accessToken: 'glpat-mock-token' },
  jira: {
    domain: 'test-company.atlassian.net',
    username: 'test@test.com',
    password: 'mock-jira-api-token',
    email: 'test@test.com',
    apiToken: 'mock-jira-token',
  },
  bitbucket: { username: 'mock-bitbucket-user', appPassword: 'mock-bitbucket-app-password' },
  netlify: { accessToken: 'mock-netlify-access-token-12345' },

  // Productivity
  figma: { accessToken: 'figd_mock_figma_token_12345' },

  // Project Management
  asana: { accessToken: 'mock-asana-access-token-123456789' },
  clickup: { accessToken: 'pk_mock_clickup_access_token_12345' },
  trello: { apiKey: 'mock-trello-api-key', apiToken: 'mock-trello-api-token' },

  // Analytics
  google_analytics: { accessToken: 'mock-ga-token' },
  mixpanel: { projectToken: 'mock-mixpanel-token' },
  segment: { writeKey: 'mock-segment-key' },
  splunk: {
    authToken: 'mock-splunk-auth-token',
    baseUrl: 'https://localhost:8089',
    allowUnauthorizedCerts: false,
  },
  metabase: {
    url: 'https://metabase.example.com',
    username: 'admin@example.com',
    password: 'mock-metabase-password',
  },
  grafana: {
    apiKey: 'glsa_mock-grafana-service-account-token-12345',
    baseUrl: 'https://grafana.example.com',
  },

  // Support
  sentry_io: {
    token: 'mock-sentry-auth-token-12345',
  },

  // Video
  zoom: {
    access_token: 'mock-zoom-access-token-xyz',
    clientId: 'mock-zoom-client-id',
    clientSecret: 'mock-zoom-client-secret',
  },

  // E-commerce
  shopify: {
    shopName: 'mock-shop',
    accessToken: 'shpat_mock_token',
  },
  stripe: { secretKey: 'sk_test_mock_key' },
  paypal: { clientId: 'mock-client-id', clientSecret: 'mock-secret' },
  paddle: {
    vendorId: 'mock-vendor-id-12345',
    vendorAuthCode: 'mock-vendor-auth-code-xyz789',
    sandbox: true,
  },
  gumroad: {
    accessToken: 'mock-gumroad-access-token-abc123',
  },

  // Finance
  plaid: {
    client_id: 'mock-plaid-client-id',
    secret: 'mock-plaid-secret',
    environment: 'sandbox',
  },
  quickbooks: {
    accessToken: 'mock-quickbooks-access-token-xyz',
    refreshToken: 'mock-quickbooks-refresh-token-xyz',
    realmId: '1234567890',
    environment: 'sandbox',
  },
  chargebee: {
    accountName: 'mock-account',
    apiKey: 'mock-chargebee-api-key-12345',
  },

  // Communication - Calendly
  calendly: {
    accessToken: 'mock-calendly-access-token-xyz',
    personalToken: 'mock-calendly-personal-token-xyz',
    authType: 'personalToken',
  },

  // Database
  mongodb: { connectionString: 'mongodb://localhost:27017/test' },
  mysql: { host: 'localhost', user: 'test', password: 'test' },
  postgres: { connectionString: 'postgres://localhost:5432/test' },
  elasticsearch: {
    baseUrl: 'http://localhost:9200',
    username: 'elastic',
    password: 'mock-elastic-password',
  },

  // Infrastructure
  cloudflare: { apiToken: 'mock-cloudflare-api-token-12345' },
  rabbitmq: {
    hostname: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
    vhost: '/',
    ssl: false,
  },
  kafka: {
    brokers: 'localhost:9092',
    clientId: 'mock-kafka-client',
    ssl: false,
    authentication: false,
  },
  graphql: {
    // GraphQL is stateless, uses endpoint and headers per-request
    endpoint: 'https://mock-graphql-api.com/graphql',
  },

  // Utility
  bitly: { accessToken: 'mock-bitly-access-token-abc123' },
  deepl: { apiKey: 'mock-deepl-api-key-12345:fx', apiPlan: 'pro' },
  ftp: {
    protocol: 'ftp',
    host: 'ftp.example.com',
    port: 21,
    username: 'testuser',
    password: 'testpass',
  },
  ssh: {
    host: 'mock-ssh-server.example.com',
    port: 22,
    username: 'testuser',
    authType: 'password',
    password: 'mock-ssh-password',
  },

  // Productivity
  spotify: {
    accessToken: 'mock-spotify-access-token-xyz789',
    refreshToken: 'mock-spotify-refresh-token-abc456',
    clientId: 'mock-spotify-client-id',
    clientSecret: 'mock-spotify-client-secret',
  },
  todoist: { apiKey: 'mock-todoist-api-key-0123456789abcdef' },

  // Development (no credentials needed, but included for consistency)
  npm: {},

  // Default fallback
  default: { apiKey: 'mock-default-key' },
};

/**
 * Get mock credentials for a specific connector
 */
export function getMockCredentials(connectorName: string): any {
  return MOCK_CREDENTIALS[connectorName] || MOCK_CREDENTIALS.default;
}

/**
 * Create a custom credential set for testing specific scenarios
 */
export function createCustomCredentials(
  connectorName: string,
  overrides: Record<string, any>,
): any {
  const baseCredentials = getMockCredentials(connectorName);
  return { ...baseCredentials, ...overrides };
}

// ============================================================================
// OAuth Testing Utilities
// ============================================================================

/**
 * Mock cipher for testing encryption without real keys.
 * Uses simple base64 encoding instead of AES encryption.
 * Useful for unit tests where you want to bypass real encryption.
 */
export const mockCipher = () => ({
  encrypt: (data: any): string => {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return Buffer.from(str).toString('base64');
  },
  decrypt: (data: string): string => {
    return Buffer.from(data, 'base64').toString('utf-8');
  },
});

/**
 * Create mock OAuth tokens for testing
 */
export function createMockOAuthTokens(
  overrides?: Partial<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    tokenType: string;
    scope: string;
  }>,
) {
  const now = Date.now();
  return {
    accessToken: `mock-access-token-${now}`,
    refreshToken: `mock-refresh-token-${now}`,
    expiresAt: new Date(now + 3600 * 1000), // 1 hour from now
    tokenType: 'Bearer',
    scope: 'read write',
    ...overrides,
  };
}

/**
 * Create mock OAuth tokens in snake_case format (as returned by OAuth providers)
 */
export function createMockOAuthTokenResponse(
  overrides?: Partial<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
  }>,
) {
  const now = Date.now();
  return {
    access_token: `mock-access-token-${now}`,
    refresh_token: `mock-refresh-token-${now}`,
    expires_in: 3600, // 1 hour
    token_type: 'Bearer',
    scope: 'read write',
    ...overrides,
  };
}

/**
 * Create expired OAuth tokens for testing refresh flows
 */
export function createExpiredOAuthTokens() {
  return createMockOAuthTokens({
    expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
  });
}

/**
 * Create OAuth tokens that expire soon (for testing pre-emptive refresh)
 */
export function createExpiringOAuthTokens(expiresInMs: number = 60000) {
  return createMockOAuthTokens({
    expiresAt: new Date(Date.now() + expiresInMs),
  });
}

/**
 * Mock OAuth state parameter for CSRF testing
 */
export function createMockOAuthState(
  overrides?: Partial<{
    userId: string;
    credentialId: string;
    connectorType: string;
    returnUrl: string;
    timestamp: number;
    nonce: string;
  }>,
): string {
  const state = {
    userId: 'mock-user-id',
    credentialId: 'mock-credential-id',
    connectorType: 'google',
    returnUrl: '/dashboard',
    timestamp: Date.now(),
    nonce: `nonce-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

/**
 * Create expired OAuth state for testing state expiration
 */
export function createExpiredOAuthState(): string {
  return createMockOAuthState({
    timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
  });
}

/**
 * OAuth provider specific mock credentials
 */
export const OAUTH_MOCK_CREDENTIALS = {
  google: {
    clientId: 'mock-google-client-id.apps.googleusercontent.com',
    clientSecret: 'mock-google-client-secret',
    accessToken: 'ya29.mock-google-access-token',
    refreshToken: '1//mock-google-refresh-token',
    expiresAt: new Date(Date.now() + 3600 * 1000),
  },
  slack: {
    clientId: 'mock-slack-client-id',
    clientSecret: 'mock-slack-client-secret',
    accessToken: 'xoxb-mock-slack-access-token',
    refreshToken: 'xoxr-mock-slack-refresh-token',
    botUserId: 'U12345678',
    teamId: 'T12345678',
  },
  github: {
    clientId: 'mock-github-client-id',
    clientSecret: 'mock-github-client-secret',
    accessToken: 'gho_mock-github-access-token',
    refreshToken: 'ghr_mock-github-refresh-token',
  },
  twitter: {
    clientId: 'mock-twitter-client-id',
    clientSecret: 'mock-twitter-client-secret',
    accessToken: 'mock-twitter-access-token',
    refreshToken: 'mock-twitter-refresh-token',
  },
  facebook: {
    clientId: 'mock-facebook-app-id',
    clientSecret: 'mock-facebook-app-secret',
    accessToken: 'EAAMock-facebook-access-token',
    pageAccessToken: 'EAAMock-facebook-page-token',
  },
  linkedin: {
    clientId: 'mock-linkedin-client-id',
    clientSecret: 'mock-linkedin-client-secret',
    accessToken: 'AQV-mock-linkedin-access-token',
    refreshToken: 'AQX-mock-linkedin-refresh-token',
  },
  zoom: {
    clientId: 'mock-zoom-client-id',
    clientSecret: 'mock-zoom-client-secret',
    accessToken: 'mock-zoom-access-token',
    refreshToken: 'mock-zoom-refresh-token',
  },
  shopify: {
    shop: 'mock-shop.myshopify.com',
    accessToken: 'shpat_mock-shopify-access-token',
    apiKey: 'mock-shopify-api-key',
    apiSecretKey: 'mock-shopify-api-secret',
  },
  pinterest: {
    clientId: 'mock-pinterest-client-id',
    clientSecret: 'mock-pinterest-client-secret',
    accessToken: 'pina_mock-pinterest-access-token',
    refreshToken: 'pinr_mock-pinterest-refresh-token',
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days
  },
  tiktok: {
    clientId: 'mock-tiktok-client-id',
    clientSecret: 'mock-tiktok-client-secret',
    accessToken: 'mock-tiktok-access-token',
    refreshToken: 'mock-tiktok-refresh-token',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000), // 24 hours
  },
  clickup: {
    clientId: 'mock-clickup-client-id',
    clientSecret: 'mock-clickup-client-secret',
    accessToken: 'pk_mock_clickup_access_token_12345',
  },
  dropbox: {
    clientId: 'mock-dropbox-client-id',
    clientSecret: 'mock-dropbox-client-secret',
    accessToken: 'sl.mock-dropbox-access-token',
    refreshToken: 'mock-dropbox-refresh-token',
    expiresAt: new Date(Date.now() + 4 * 3600 * 1000), // 4 hours
    accountId: 'dbid:mock-dropbox-account-id',
    uid: 'mock-dropbox-uid',
  },
  teams: {
    clientId: 'mock-teams-client-id',
    clientSecret: 'mock-teams-client-secret',
    accessToken: 'mock-teams-access-token',
    refreshToken: 'mock-teams-refresh-token',
    tenantId: 'mock-teams-tenant-id',
    expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
  },
  google_ads: {
    clientId: 'mock-google-ads-client-id.apps.googleusercontent.com',
    clientSecret: 'mock-google-ads-client-secret',
    accessToken: 'ya29.mock-google-ads-access-token',
    refreshToken: '1//mock-google-ads-refresh-token',
    developerToken: 'mock-developer-token-12345',
    customerId: '1234567890',
    loginCustomerId: '0987654321',
    expiresAt: new Date(Date.now() + 3600 * 1000),
  },
};

/**
 * Get OAuth mock credentials for a specific provider
 */
export function getOAuthMockCredentials(
  provider: keyof typeof OAUTH_MOCK_CREDENTIALS,
): (typeof OAUTH_MOCK_CREDENTIALS)[typeof provider] {
  return OAUTH_MOCK_CREDENTIALS[provider];
}
