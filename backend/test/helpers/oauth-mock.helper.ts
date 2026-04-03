/**
 * OAuth Mock Helper for Testing
 *
 * Provides utilities to mock OAuth provider endpoints (Google, Slack, GitHub, etc.)
 * without needing real credentials.
 */

import nock from 'nock';

// Mock OAuth provider configurations
export const OAUTH_PROVIDERS = {
  google: {
    tokenUrl: 'https://oauth2.googleapis.com',
    tokenPath: '/token',
    userInfoUrl: 'https://www.googleapis.com',
    userInfoPath: '/oauth2/v2/userinfo',
  },
  slack: {
    tokenUrl: 'https://slack.com',
    tokenPath: '/api/oauth.v2.access',
    userInfoUrl: 'https://slack.com',
    userInfoPath: '/api/users.identity',
  },
  github: {
    tokenUrl: 'https://github.com',
    tokenPath: '/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com',
    userInfoPath: '/user',
  },
  twitter: {
    tokenUrl: 'https://api.twitter.com',
    tokenPath: '/2/oauth2/token',
    userInfoUrl: 'https://api.twitter.com',
    userInfoPath: '/2/users/me',
  },
  facebook: {
    tokenUrl: 'https://graph.facebook.com',
    tokenPath: '/v18.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com',
    userInfoPath: '/me',
  },
  linkedin: {
    tokenUrl: 'https://www.linkedin.com',
    tokenPath: '/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com',
    userInfoPath: '/v2/userinfo',
  },
  zoom: {
    tokenUrl: 'https://zoom.us',
    tokenPath: '/oauth/token',
    userInfoUrl: 'https://api.zoom.us',
    userInfoPath: '/v2/users/me',
  },
  shopify: {
    tokenUrl: 'https://{shop}.myshopify.com',
    tokenPath: '/admin/oauth/access_token',
    userInfoUrl: 'https://{shop}.myshopify.com',
    userInfoPath: '/admin/api/2024-01/shop.json',
  },
  pinterest: {
    tokenUrl: 'https://api.pinterest.com',
    tokenPath: '/v5/oauth/token',
    userInfoUrl: 'https://api.pinterest.com',
    userInfoPath: '/v5/user_account',
  },
} as const;

export type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

export interface MockTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  refresh_token_expires_in?: number; // Pinterest specific
}

export interface MockOAuthConfig {
  provider: OAuthProvider;
  customTokenUrl?: string;
  customUserInfoUrl?: string;
}

/**
 * Mock OAuth token exchange endpoint
 */
export const mockTokenExchange = (
  provider: OAuthProvider,
  response: MockTokenResponse,
  status = 200,
): nock.Scope => {
  const config = OAUTH_PROVIDERS[provider];
  return nock(config.tokenUrl).post(config.tokenPath).reply(status, response);
};

/**
 * Mock OAuth token refresh endpoint
 */
export const mockTokenRefresh = (
  provider: OAuthProvider,
  response: MockTokenResponse,
  status = 200,
): nock.Scope => {
  const config = OAUTH_PROVIDERS[provider];
  return nock(config.tokenUrl)
    .post(config.tokenPath, (body: string) =>
      body.includes('grant_type=refresh_token'),
    )
    .reply(status, response);
};

/**
 * Mock OAuth user info endpoint
 */
export const mockUserInfo = (
  provider: OAuthProvider,
  response: any,
  status = 200,
): nock.Scope => {
  const config = OAUTH_PROVIDERS[provider];
  return nock(config.userInfoUrl)
    .get(config.userInfoPath)
    .reply(status, response);
};

/**
 * Mock OAuth error response
 */
export const mockOAuthError = (
  provider: OAuthProvider,
  error: { error: string; error_description: string },
  status = 400,
): nock.Scope => {
  const config = OAUTH_PROVIDERS[provider];
  return nock(config.tokenUrl).post(config.tokenPath).reply(status, error);
};

/**
 * Mock custom OAuth endpoint (for providers not in the list)
 */
export const mockCustomOAuthEndpoint = (
  baseUrl: string,
  path: string,
  method: 'get' | 'post' = 'post',
  response: any,
  status = 200,
): nock.Scope => {
  const scope = nock(baseUrl);
  if (method === 'get') {
    return scope.get(path).reply(status, response);
  }
  return scope.post(path).reply(status, response);
};

/**
 * Mock token revocation endpoint
 */
export const mockTokenRevocation = (
  provider: OAuthProvider,
  status = 200,
): nock.Scope => {
  const config = OAUTH_PROVIDERS[provider];
  // Most providers use a /revoke endpoint
  const revokePath =
    provider === 'google' ? '/revoke' : config.tokenPath.replace('token', 'revoke');
  return nock(config.tokenUrl).post(revokePath).reply(status, { success: true });
};

// ============================================================================
// Fake tokens for testing
// ============================================================================

export const MOCK_TOKENS: Record<OAuthProvider, MockTokenResponse> = {
  google: {
    access_token: 'ya29.mock-google-access-token-xyz',
    refresh_token: '1//mock-google-refresh-token-abc',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
    id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-id-token',
  },
  slack: {
    access_token: 'xoxb-mock-slack-token-123456789',
    refresh_token: 'xoxr-mock-slack-refresh-987654321',
    token_type: 'bearer',
    scope: 'channels:read,chat:write,users:read',
  },
  github: {
    access_token: 'gho_mock_github_token_abcdef123456',
    refresh_token: 'ghr_mock_github_refresh_xyz789',
    token_type: 'bearer',
    scope: 'repo,user',
  },
  twitter: {
    access_token: 'mock-twitter-access-token-xyz',
    refresh_token: 'mock-twitter-refresh-token-abc',
    expires_in: 7200,
    token_type: 'Bearer',
    scope: 'tweet.read tweet.write users.read offline.access',
  },
  facebook: {
    access_token: 'EAAMock_facebook_access_token_xyz',
    expires_in: 5184000,
    token_type: 'bearer',
  },
  linkedin: {
    access_token: 'AQVmock_linkedin_access_token_xyz',
    refresh_token: 'AQXmock_linkedin_refresh_token_abc',
    expires_in: 5184000,
    token_type: 'Bearer',
    scope: 'r_liteprofile r_emailaddress w_member_social',
  },
  zoom: {
    access_token: 'mock-zoom-access-token-xyz123',
    refresh_token: 'mock-zoom-refresh-token-abc456',
    expires_in: 3600,
    token_type: 'bearer',
    scope: 'meeting:write user:read',
  },
  shopify: {
    access_token: 'shpat_mock_shopify_access_token',
    scope: 'read_products,write_products,read_orders',
  },
  pinterest: {
    access_token: 'pina_mock_pinterest_access_token_xyz',
    refresh_token: 'pinr_mock_pinterest_refresh_token_abc',
    expires_in: 2592000, // 30 days
    token_type: 'bearer',
    scope: 'boards:read,boards:write,pins:read,pins:write,user_accounts:read',
    refresh_token_expires_in: 31536000, // 1 year
  },
};

// ============================================================================
// Mock user info responses
// ============================================================================

export const MOCK_USER_INFO = {
  google: {
    id: '123456789012345678901',
    email: 'test@example.com',
    verified_email: true,
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://lh3.googleusercontent.com/mock-photo',
    locale: 'en',
  },
  slack: {
    ok: true,
    user: {
      id: 'U1234567890',
      name: 'testuser',
      email: 'test@example.com',
    },
    team: {
      id: 'T1234567890',
      name: 'Test Workspace',
    },
  },
  github: {
    id: 12345678,
    login: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
  },
  twitter: {
    data: {
      id: '1234567890',
      name: 'Test User',
      username: 'testuser',
    },
  },
  facebook: {
    id: '1234567890',
    name: 'Test User',
    email: 'test@example.com',
  },
  linkedin: {
    sub: 'mock-linkedin-id',
    email: 'test@example.com',
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://media.licdn.com/mock-photo',
  },
  zoom: {
    id: 'mock-zoom-user-id',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    type: 2,
    status: 'active',
  },
  shopify: {
    shop: {
      id: 123456789,
      name: 'Test Shop',
      email: 'test@example.com',
      domain: 'test-shop.myshopify.com',
    },
  },
  pinterest: {
    account_type: 'BUSINESS',
    profile_image: 'https://i.pinimg.com/mock-profile-image.jpg',
    website_url: 'https://example.com',
    username: 'testpinterestuser',
  },
};

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Create a complete OAuth mock setup for a provider
 */
export const setupOAuthMocks = (
  provider: OAuthProvider,
  options?: {
    tokenResponse?: Partial<MockTokenResponse>;
    userInfoResponse?: any;
  },
): { tokenScope: nock.Scope; userInfoScope: nock.Scope } => {
  const tokenResponse = {
    ...MOCK_TOKENS[provider],
    ...options?.tokenResponse,
  };
  const userInfoResponse = options?.userInfoResponse || MOCK_USER_INFO[provider];

  return {
    tokenScope: mockTokenExchange(provider, tokenResponse),
    userInfoScope: mockUserInfo(provider, userInfoResponse),
  };
};

/**
 * Clean up all nock mocks
 */
export const cleanupOAuthMocks = (): void => {
  nock.cleanAll();
};

/**
 * Verify all mocks were called
 */
export const verifyOAuthMocksCalled = (): boolean => {
  return nock.isDone();
};

/**
 * Get pending mocks (for debugging)
 */
export const getPendingOAuthMocks = (): string[] => {
  return nock.pendingMocks();
};
