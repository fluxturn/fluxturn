import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { PinterestOAuthService } from '../pinterest-oauth.service';
import {
  mockTokenExchange,
  mockUserInfo,
  mockOAuthError,
  MOCK_TOKENS,
  MOCK_USER_INFO,
  cleanupOAuthMocks,
} from '@test/helpers/oauth-mock.helper';

describe('PinterestOAuthService', () => {
  let service: PinterestOAuthService;
  let configService: ConfigService;

  const mockConfig: Record<string, string> = {
    PINTEREST_OAUTH_CLIENT_ID: 'test-pinterest-client-id',
    PINTEREST_OAUTH_CLIENT_SECRET: 'test-pinterest-client-secret',
    PINTEREST_OAUTH_REDIRECT_URI: 'http://localhost:3000/oauth/pinterest/callback',
    CONNECTOR_ENCRYPTION_KEY: 'a'.repeat(64), // 32 bytes hex
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinterestOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<PinterestOAuthService>(PinterestOAuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
    jest.clearAllMocks();
  });

  // =========================================================================
  // isConfigured
  // =========================================================================

  describe('isConfigured', () => {
    it('should return true when all OAuth credentials are configured', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when client ID is missing', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          PinterestOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'PINTEREST_OAUTH_CLIENT_ID') return undefined;
                return mockConfig[key];
              }),
            },
          },
        ],
      }).compile();

      const unconfiguredService = moduleWithMissingConfig.get<PinterestOAuthService>(PinterestOAuthService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });

    it('should return false when client secret is missing', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          PinterestOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'PINTEREST_OAUTH_CLIENT_SECRET') return undefined;
                return mockConfig[key];
              }),
            },
          },
        ],
      }).compile();

      const unconfiguredService = moduleWithMissingConfig.get<PinterestOAuthService>(PinterestOAuthService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });

    it('should return false when redirect URI is missing', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          PinterestOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'PINTEREST_OAUTH_REDIRECT_URI') return undefined;
                return mockConfig[key];
              }),
            },
          },
        ],
      }).compile();

      const unconfiguredService = moduleWithMissingConfig.get<PinterestOAuthService>(PinterestOAuthService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  // =========================================================================
  // getAuthorizationUrl
  // =========================================================================

  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL with default scopes', () => {
      const state = service.generateState('user-123', 'cred-456', 'pinterest');
      const url = service.getAuthorizationUrl(state);

      expect(url).toContain('https://www.pinterest.com/oauth/');
      expect(url).toContain('client_id=test-pinterest-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain(`state=${state}`);
    });

    it('should include default scopes in URL', () => {
      const url = service.getAuthorizationUrl('test-state');

      expect(url).toContain('boards%3Aread');
      expect(url).toContain('boards%3Awrite');
      expect(url).toContain('pins%3Aread');
      expect(url).toContain('pins%3Awrite');
      expect(url).toContain('user_accounts%3Aread');
    });

    it('should use custom scopes when provided', () => {
      const url = service.getAuthorizationUrl('test-state', {
        scopes: ['pins:read', 'boards:read'],
      });

      expect(url).toContain('scope=pins%3Aread%2Cboards%3Aread');
    });

    it('should throw error when OAuth is not configured', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          PinterestOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredService = moduleWithMissingConfig.get<PinterestOAuthService>(PinterestOAuthService);

      expect(() => unconfiguredService.getAuthorizationUrl('state')).toThrow(
        'Pinterest OAuth is not configured',
      );
    });
  });

  // =========================================================================
  // exchangeCodeForTokens
  // =========================================================================

  describe('exchangeCodeForTokens', () => {
    it('should exchange authorization code for tokens successfully', async () => {
      mockTokenExchange('pinterest', MOCK_TOKENS.pinterest);

      const tokens = await service.exchangeCodeForTokens('auth-code-123');

      expect(tokens.access_token).toBe(MOCK_TOKENS.pinterest.access_token);
      expect(tokens.refresh_token).toBe(MOCK_TOKENS.pinterest.refresh_token);
      expect(tokens.expires_in).toBe(MOCK_TOKENS.pinterest.expires_in);
      expect(tokens.scope).toBe(MOCK_TOKENS.pinterest.scope);
    });

    it('should include Basic Auth header with client credentials', async () => {
      let authHeader: string | undefined;

      nock('https://api.pinterest.com')
        .post('/v5/oauth/token')
        .matchHeader('authorization', (value) => {
          authHeader = value;
          return true;
        })
        .reply(200, MOCK_TOKENS.pinterest);

      await service.exchangeCodeForTokens('auth-code');

      // Verify Basic Auth format
      expect(authHeader).toContain('Basic ');
      const encodedCreds = authHeader?.replace('Basic ', '');
      const decodedCreds = Buffer.from(encodedCreds!, 'base64').toString();
      expect(decodedCreds).toBe('test-pinterest-client-id:test-pinterest-client-secret');
    });

    it('should send correct request body', async () => {
      let requestBody: Record<string, string> = {};

      nock('https://api.pinterest.com')
        .post('/v5/oauth/token', (body: Record<string, string>) => {
          requestBody = body;
          return true;
        })
        .reply(200, MOCK_TOKENS.pinterest);

      await service.exchangeCodeForTokens('test-auth-code');

      expect(requestBody.grant_type).toBe('authorization_code');
      expect(requestBody.code).toBe('test-auth-code');
      expect(requestBody.redirect_uri).toBeDefined();
    });

    it('should throw UnauthorizedException on invalid_grant error', async () => {
      mockOAuthError('pinterest', {
        error: 'invalid_grant',
        error_description: 'Authorization code has expired',
      });

      await expect(service.exchangeCodeForTokens('expired-code')).rejects.toThrow(
        'Failed to exchange authorization code',
      );
    });

    it('should throw UnauthorizedException on invalid_client error', async () => {
      mockOAuthError('pinterest', {
        error: 'invalid_client',
        error_description: 'Client authentication failed',
      });

      await expect(service.exchangeCodeForTokens('some-code')).rejects.toThrow(
        'Failed to exchange authorization code',
      );
    });

    it('should handle network errors gracefully', async () => {
      nock('https://api.pinterest.com')
        .post('/v5/oauth/token')
        .replyWithError('Network error');

      await expect(service.exchangeCodeForTokens('code')).rejects.toThrow();
    });

    it('should throw error when OAuth is not configured', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          PinterestOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredService = moduleWithMissingConfig.get<PinterestOAuthService>(PinterestOAuthService);

      await expect(unconfiguredService.exchangeCodeForTokens('code')).rejects.toThrow(
        'Pinterest OAuth is not configured',
      );
    });
  });

  // =========================================================================
  // refreshAccessToken
  // =========================================================================

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const newTokens = {
        ...MOCK_TOKENS.pinterest,
        access_token: 'new-refreshed-pinterest-token',
      };

      nock('https://api.pinterest.com')
        .post('/v5/oauth/token', (body: Record<string, string>) => body.grant_type === 'refresh_token')
        .reply(200, newTokens);

      const tokens = await service.refreshAccessToken('mock-refresh-token');

      expect(tokens.access_token).toBe('new-refreshed-pinterest-token');
    });

    it('should include Basic Auth header in refresh request', async () => {
      let authHeader: string | undefined;

      nock('https://api.pinterest.com')
        .post('/v5/oauth/token')
        .matchHeader('authorization', (value) => {
          authHeader = value;
          return true;
        })
        .reply(200, MOCK_TOKENS.pinterest);

      await service.refreshAccessToken('refresh-token');

      expect(authHeader).toContain('Basic ');
    });

    it('should send refresh_token in request body', async () => {
      let requestBody: Record<string, string> = {};

      nock('https://api.pinterest.com')
        .post('/v5/oauth/token', (body: Record<string, string>) => {
          requestBody = body;
          return true;
        })
        .reply(200, MOCK_TOKENS.pinterest);

      await service.refreshAccessToken('test-refresh-token');

      expect(requestBody.grant_type).toBe('refresh_token');
      expect(requestBody.refresh_token).toBe('test-refresh-token');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      nock('https://api.pinterest.com')
        .post('/v5/oauth/token')
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'Refresh token has been revoked',
        });

      await expect(service.refreshAccessToken('invalid-refresh-token')).rejects.toThrow(
        'Failed to refresh access token',
      );
    });

    it('should throw error when OAuth is not configured', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          PinterestOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredService = moduleWithMissingConfig.get<PinterestOAuthService>(PinterestOAuthService);

      await expect(unconfiguredService.refreshAccessToken('token')).rejects.toThrow(
        'Pinterest OAuth is not configured',
      );
    });
  });

  // =========================================================================
  // getUserInfo
  // =========================================================================

  describe('getUserInfo', () => {
    it('should fetch user info successfully', async () => {
      mockUserInfo('pinterest', MOCK_USER_INFO.pinterest);

      const userInfo = await service.getUserInfo('valid-access-token');

      expect(userInfo.username).toBe(MOCK_USER_INFO.pinterest.username);
      expect(userInfo.account_type).toBe(MOCK_USER_INFO.pinterest.account_type);
      expect(userInfo.website_url).toBe(MOCK_USER_INFO.pinterest.website_url);
    });

    it('should include Authorization header with Bearer token', async () => {
      let authHeader: string | undefined;

      nock('https://api.pinterest.com')
        .get('/v5/user_account')
        .matchHeader('authorization', (value) => {
          authHeader = value;
          return true;
        })
        .reply(200, MOCK_USER_INFO.pinterest);

      await service.getUserInfo('test-access-token');

      expect(authHeader).toBe('Bearer test-access-token');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      nock('https://api.pinterest.com')
        .get('/v5/user_account')
        .reply(401, {
          code: 401,
          message: 'Invalid access token',
        });

      await expect(service.getUserInfo('invalid-token')).rejects.toThrow(
        'Failed to get user info from Pinterest',
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      nock('https://api.pinterest.com')
        .get('/v5/user_account')
        .reply(401, {
          error: 'invalid_token',
          error_description: 'Access token has expired',
        });

      await expect(service.getUserInfo('expired-token')).rejects.toThrow(
        'Failed to get user info from Pinterest',
      );
    });
  });

  // =========================================================================
  // generateState / decodeState
  // =========================================================================

  describe('generateState', () => {
    it('should generate base64url encoded state with all required fields', () => {
      const state = service.generateState('user-123', 'cred-456', 'pinterest', {
        returnUrl: '/dashboard',
      });

      expect(state).toBeDefined();
      expect(typeof state).toBe('string');

      // Should be valid base64url
      expect(() => Buffer.from(state, 'base64url')).not.toThrow();
    });

    it('should include all fields in state', () => {
      const state = service.generateState('user-123', 'cred-456', 'pinterest', {
        returnUrl: '/return-url',
      });
      const decoded = service.decodeState(state);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.credentialId).toBe('cred-456');
      expect(decoded.connectorType).toBe('pinterest');
      expect(decoded.returnUrl).toBe('/return-url');
      expect(decoded.timestamp).toBeDefined();
    });

    it('should generate unique states (different nonce)', () => {
      const state1 = service.generateState('user-123', 'cred-456', 'pinterest');
      const state2 = service.generateState('user-123', 'cred-456', 'pinterest');

      expect(state1).not.toBe(state2);
    });
  });

  describe('decodeState', () => {
    it('should decode valid state correctly', () => {
      const state = service.generateState('user-123', 'cred-456', 'pinterest');
      const decoded = service.decodeState(state);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.credentialId).toBe('cred-456');
      expect(decoded.connectorType).toBe('pinterest');
    });

    it('should throw UnauthorizedException for expired state (> 10 minutes)', () => {
      const oldState = Buffer.from(
        JSON.stringify({
          userId: 'user-123',
          credentialId: 'cred-456',
          connectorType: 'pinterest',
          timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
          nonce: 'test-nonce',
        }),
      ).toString('base64url');

      expect(() => service.decodeState(oldState)).toThrow('Invalid state parameter');
    });

    it('should accept state within 10 minute window', () => {
      const validState = Buffer.from(
        JSON.stringify({
          userId: 'user-123',
          credentialId: 'cred-456',
          connectorType: 'pinterest',
          timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
          nonce: 'test-nonce',
        }),
      ).toString('base64url');

      const decoded = service.decodeState(validState);
      expect(decoded.userId).toBe('user-123');
    });

    it('should throw UnauthorizedException for invalid base64', () => {
      expect(() => service.decodeState('not-valid-base64!!!')).toThrow(
        'Invalid state parameter',
      );
    });

    it('should throw UnauthorizedException for invalid JSON', () => {
      const invalidState = Buffer.from('not-json').toString('base64url');
      expect(() => service.decodeState(invalidState)).toThrow('Invalid state parameter');
    });
  });

  // =========================================================================
  // encryptToken / decryptToken
  // =========================================================================

  describe('encryptToken', () => {
    it('should encrypt token when encryption key is configured', () => {
      const token = 'secret-pinterest-token';
      const encrypted = service.encryptToken(token);

      expect(encrypted).not.toBe(token);
      expect(encrypted).toContain(':'); // IV:ciphertext format
    });

    it('should produce different ciphertext for same token (random IV)', () => {
      const token = 'secret-pinterest-token';
      const encrypted1 = service.encryptToken(token);
      const encrypted2 = service.encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should return original token when encryption key is not configured', async () => {
      const moduleWithoutKey: TestingModule = await Test.createTestingModule({
        providers: [
          PinterestOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'CONNECTOR_ENCRYPTION_KEY') return undefined;
                return mockConfig[key];
              }),
            },
          },
        ],
      }).compile();

      const serviceWithoutKey = moduleWithoutKey.get<PinterestOAuthService>(PinterestOAuthService);
      const token = 'plain-token';
      const result = serviceWithoutKey.encryptToken(token);

      expect(result).toBe(token);
    });
  });

  describe('decryptToken', () => {
    it('should decrypt token correctly', () => {
      const originalToken = 'secret-pinterest-token';
      const encrypted = service.encryptToken(originalToken);
      const decrypted = service.decryptToken(encrypted);

      expect(decrypted).toBe(originalToken);
    });

    it('should handle long tokens', () => {
      const longToken = 'pina_' + 'a'.repeat(200);
      const encrypted = service.encryptToken(longToken);
      const decrypted = service.decryptToken(encrypted);

      expect(decrypted).toBe(longToken);
    });

    it('should throw error for invalid encrypted token format', () => {
      expect(() => service.decryptToken('invalid-no-colon')).toThrow();
    });

    it('should throw error for tampered ciphertext', () => {
      const token = 'secret-token';
      const encrypted = service.encryptToken(token);
      const [iv, ciphertext] = encrypted.split(':');

      // Corrupt the ciphertext by flipping characters (changing 'a' to 'b', etc.)
      const corruptedCiphertext = ciphertext
        .split('')
        .map((c, i) => (i < 4 ? (parseInt(c, 16) ^ 0xf).toString(16) : c))
        .join('');
      const tampered = `${iv}:${corruptedCiphertext}`;

      expect(() => service.decryptToken(tampered)).toThrow();
    });

    it('should return original when encryption key not configured', async () => {
      const moduleWithoutKey: TestingModule = await Test.createTestingModule({
        providers: [
          PinterestOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'CONNECTOR_ENCRYPTION_KEY') return undefined;
                return mockConfig[key];
              }),
            },
          },
        ],
      }).compile();

      const serviceWithoutKey = moduleWithoutKey.get<PinterestOAuthService>(PinterestOAuthService);
      const token = 'plain-token';
      const result = serviceWithoutKey.decryptToken(token);

      expect(result).toBe(token);
    });
  });

  // =========================================================================
  // Integration test - Full OAuth flow
  // =========================================================================

  describe('Full Pinterest OAuth Flow Integration', () => {
    it('should complete full OAuth flow successfully', async () => {
      // Step 1: Generate authorization URL
      const state = service.generateState('user-123', 'cred-456', 'pinterest', {
        returnUrl: '/dashboard',
      });
      const authUrl = service.getAuthorizationUrl(state);

      expect(authUrl).toContain('pinterest.com');
      expect(authUrl).toContain(state);

      // Step 2: Mock token exchange (simulating callback)
      mockTokenExchange('pinterest', MOCK_TOKENS.pinterest);
      const tokens = await service.exchangeCodeForTokens('auth-code-from-pinterest');

      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();

      // Step 3: Get user info with the access token
      mockUserInfo('pinterest', MOCK_USER_INFO.pinterest);
      const userInfo = await service.getUserInfo(tokens.access_token);

      expect(userInfo.username).toBe('testpinterestuser');

      // Step 4: Encrypt tokens for storage
      const encryptedAccess = service.encryptToken(tokens.access_token);
      const encryptedRefresh = service.encryptToken(tokens.refresh_token);

      expect(encryptedAccess).not.toBe(tokens.access_token);
      expect(encryptedRefresh).not.toBe(tokens.refresh_token);

      // Step 5: Decrypt tokens when needed
      const decryptedAccess = service.decryptToken(encryptedAccess);
      const decryptedRefresh = service.decryptToken(encryptedRefresh);

      expect(decryptedAccess).toBe(tokens.access_token);
      expect(decryptedRefresh).toBe(tokens.refresh_token);
    });

    it('should handle token refresh flow', async () => {
      // Initial tokens
      const initialTokens = MOCK_TOKENS.pinterest;

      // Mock refresh endpoint
      const refreshedTokens = {
        ...initialTokens,
        access_token: 'new-refreshed-pinterest-token',
      };

      nock('https://api.pinterest.com')
        .post('/v5/oauth/token', (body: Record<string, string>) => body.grant_type === 'refresh_token')
        .reply(200, refreshedTokens);

      // Refresh the token
      const newTokens = await service.refreshAccessToken(initialTokens.refresh_token!);

      expect(newTokens.access_token).toBe('new-refreshed-pinterest-token');

      // Verify new token works for API calls
      mockUserInfo('pinterest', MOCK_USER_INFO.pinterest);
      const userInfo = await service.getUserInfo(newTokens.access_token);

      expect(userInfo.username).toBe('testpinterestuser');
    });

    it('should decode state from callback', async () => {
      // Generate state for auth URL
      const state = service.generateState('user-123', 'cred-456', 'pinterest', {
        returnUrl: '/boards',
      });

      // Simulate callback - decode the state
      const decoded = service.decodeState(state);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.credentialId).toBe('cred-456');
      expect(decoded.connectorType).toBe('pinterest');
      expect(decoded.returnUrl).toBe('/boards');
    });
  });
});
