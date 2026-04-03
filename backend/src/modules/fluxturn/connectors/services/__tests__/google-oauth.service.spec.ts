import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { GoogleOAuthService } from '../google-oauth.service';
import {
  mockTokenExchange,
  mockTokenRefresh,
  mockUserInfo,
  mockOAuthError,
  MOCK_TOKENS,
  MOCK_USER_INFO,
  cleanupOAuthMocks,
} from '@test/helpers/oauth-mock.helper';

describe('GoogleOAuthService', () => {
  let service: GoogleOAuthService;
  let configService: ConfigService;

  const mockConfig: Record<string, string> = {
    GOOGLE_OAUTH_CLIENT_ID: 'test-client-id-123',
    GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret-456',
    GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3000/oauth/google/callback',
    CONNECTOR_ENCRYPTION_KEY: 'a'.repeat(64), // 32 bytes hex (64 hex chars)
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<GoogleOAuthService>(GoogleOAuthService);
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
          GoogleOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'GOOGLE_OAUTH_CLIENT_ID') return undefined;
                return mockConfig[key];
              }),
            },
          },
        ],
      }).compile();

      const serviceWithMissingConfig = moduleWithMissingConfig.get<GoogleOAuthService>(GoogleOAuthService);
      expect(serviceWithMissingConfig.isConfigured()).toBe(false);
    });
  });

  // =========================================================================
  // getAuthorizationUrl
  // =========================================================================

  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL for gmail', () => {
      const state = service.generateState('user-123', 'cred-456', 'gmail');
      const url = service.getAuthorizationUrl('gmail', state);

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id-123');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
      expect(url).toContain(encodeURIComponent('https://www.googleapis.com/auth/gmail'));
    });

    it('should include correct scopes for google_sheets', () => {
      const url = service.getAuthorizationUrl('google_sheets', 'test-state');

      expect(url).toContain(encodeURIComponent('spreadsheets'));
      expect(url).toContain(encodeURIComponent('drive'));
    });

    it('should include correct scopes for google_drive', () => {
      const url = service.getAuthorizationUrl('google_drive', 'test-state');

      expect(url).toContain(encodeURIComponent('https://www.googleapis.com/auth/drive'));
    });

    it('should include correct scopes for google_calendar', () => {
      const url = service.getAuthorizationUrl('google_calendar', 'test-state');

      expect(url).toContain(encodeURIComponent('calendar'));
    });

    it('should include correct scopes for youtube', () => {
      const url = service.getAuthorizationUrl('youtube', 'test-state');

      expect(url).toContain(encodeURIComponent('youtube'));
    });

    it('should always include base profile scopes', () => {
      const url = service.getAuthorizationUrl('gmail', 'test-state');

      expect(url).toContain(encodeURIComponent('userinfo.email'));
      expect(url).toContain(encodeURIComponent('userinfo.profile'));
    });

    it('should include state parameter in URL', () => {
      const state = 'custom-state-xyz';
      const url = service.getAuthorizationUrl('gmail', state);

      expect(url).toContain(`state=${state}`);
    });

    it('should throw error when OAuth is not configured', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredService = moduleWithMissingConfig.get<GoogleOAuthService>(GoogleOAuthService);

      expect(() => unconfiguredService.getAuthorizationUrl('gmail', 'state')).toThrow(
        'Google OAuth is not configured',
      );
    });
  });

  // =========================================================================
  // exchangeCodeForTokens
  // =========================================================================

  describe('exchangeCodeForTokens', () => {
    it('should exchange authorization code for tokens successfully', async () => {
      mockTokenExchange('google', MOCK_TOKENS.google);

      const tokens = await service.exchangeCodeForTokens('auth-code-123');

      expect(tokens.access_token).toBe(MOCK_TOKENS.google.access_token);
      expect(tokens.refresh_token).toBe(MOCK_TOKENS.google.refresh_token);
      expect(tokens.expires_in).toBe(MOCK_TOKENS.google.expires_in);
      expect(tokens.token_type).toBe(MOCK_TOKENS.google.token_type);
    });

    it('should throw UnauthorizedException on invalid_grant error', async () => {
      mockOAuthError('google', {
        error: 'invalid_grant',
        error_description: 'Code has expired or been used',
      });

      await expect(service.exchangeCodeForTokens('invalid-code')).rejects.toThrow(
        'Failed to exchange authorization code',
      );
    });

    it('should throw UnauthorizedException on invalid_client error', async () => {
      mockOAuthError('google', {
        error: 'invalid_client',
        error_description: 'The OAuth client was not found',
      });

      await expect(service.exchangeCodeForTokens('some-code')).rejects.toThrow(
        'Failed to exchange authorization code',
      );
    });

    it('should handle network errors gracefully', async () => {
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .replyWithError('Network error');

      await expect(service.exchangeCodeForTokens('code')).rejects.toThrow();
    });
  });

  // =========================================================================
  // refreshAccessToken
  // =========================================================================

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const newTokens = {
        ...MOCK_TOKENS.google,
        access_token: 'new-refreshed-access-token',
      };

      nock('https://oauth2.googleapis.com')
        .post('/token', (body: string) => body.includes('grant_type=refresh_token'))
        .reply(200, newTokens);

      const tokens = await service.refreshAccessToken('mock-refresh-token');

      expect(tokens.access_token).toBe('new-refreshed-access-token');
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'Token has been revoked',
        });

      await expect(service.refreshAccessToken('invalid-refresh-token')).rejects.toThrow(
        'Failed to refresh access token',
      );
    });

    it('should include client credentials in refresh request', async () => {
      let requestBody: string = '';

      nock('https://oauth2.googleapis.com')
        .post('/token', (body: string) => {
          requestBody = body;
          return true;
        })
        .reply(200, MOCK_TOKENS.google);

      await service.refreshAccessToken('refresh-token');

      expect(requestBody).toContain('client_id=test-client-id-123');
      expect(requestBody).toContain('client_secret=test-client-secret-456');
      expect(requestBody).toContain('grant_type=refresh_token');
    });
  });

  // =========================================================================
  // getUserInfo
  // =========================================================================

  describe('getUserInfo', () => {
    it('should fetch user info successfully', async () => {
      mockUserInfo('google', MOCK_USER_INFO.google);

      const userInfo = await service.getUserInfo('valid-access-token');

      expect(userInfo.id).toBe(MOCK_USER_INFO.google.id);
      expect(userInfo.email).toBe(MOCK_USER_INFO.google.email);
      expect(userInfo.name).toBe(MOCK_USER_INFO.google.name);
      expect(userInfo.verified_email).toBe(true);
    });

    it('should include Authorization header in request', async () => {
      let authHeader: string | undefined;

      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .matchHeader('authorization', (value) => {
          authHeader = value;
          return true;
        })
        .reply(200, MOCK_USER_INFO.google);

      await service.getUserInfo('test-token');

      expect(authHeader).toBe('Bearer test-token');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(401, {
          error: {
            code: 401,
            message: 'Invalid Credentials',
          },
        });

      await expect(service.getUserInfo('invalid-token')).rejects.toThrow(
        'Failed to get user info',
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(401, {
          error: 'invalid_token',
          error_description: 'Token has expired',
        });

      await expect(service.getUserInfo('expired-token')).rejects.toThrow(
        'Failed to get user info',
      );
    });
  });

  // =========================================================================
  // generateState / decodeState
  // =========================================================================

  describe('generateState', () => {
    it('should generate base64url encoded state with all required fields', () => {
      const state = service.generateState('user-123', 'cred-456', 'gmail', '/return-url');

      expect(state).toBeDefined();
      expect(typeof state).toBe('string');

      // Should be valid base64url
      expect(() => Buffer.from(state, 'base64url')).not.toThrow();
    });

    it('should include timestamp in state', () => {
      const beforeTime = Date.now();
      const state = service.generateState('user-123', 'cred-456', 'gmail');
      const afterTime = Date.now();

      const decoded = service.decodeState(state);

      expect(decoded.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(decoded.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should generate unique states (different nonce)', () => {
      const state1 = service.generateState('user-123', 'cred-456', 'gmail');
      const state2 = service.generateState('user-123', 'cred-456', 'gmail');

      expect(state1).not.toBe(state2);
    });
  });

  describe('decodeState', () => {
    it('should decode valid state correctly', () => {
      const state = service.generateState('user-123', 'cred-456', 'gmail', '/return');
      const decoded = service.decodeState(state);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.credentialId).toBe('cred-456');
      expect(decoded.connectorType).toBe('gmail');
      expect(decoded.returnUrl).toBe('/return');
    });

    it('should throw UnauthorizedException for expired state (> 10 minutes)', () => {
      // Create state with old timestamp
      const oldState = Buffer.from(
        JSON.stringify({
          userId: 'user-123',
          credentialId: 'cred-456',
          connectorType: 'gmail',
          timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
          nonce: 'test-nonce',
        }),
      ).toString('base64url');

      expect(() => service.decodeState(oldState)).toThrow('Invalid state parameter');
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

    it('should accept state within 10 minute window', () => {
      // Create state with timestamp 5 minutes ago (within window)
      const validState = Buffer.from(
        JSON.stringify({
          userId: 'user-123',
          credentialId: 'cred-456',
          connectorType: 'gmail',
          timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
          nonce: 'test-nonce',
        }),
      ).toString('base64url');

      const decoded = service.decodeState(validState);
      expect(decoded.userId).toBe('user-123');
    });
  });

  // =========================================================================
  // encryptToken / decryptToken
  // =========================================================================

  describe('encryptToken', () => {
    it('should encrypt token when encryption key is configured', () => {
      const token = 'secret-access-token';
      const encrypted = service.encryptToken(token);

      expect(encrypted).not.toBe(token);
      expect(encrypted).toContain(':'); // IV:ciphertext format
    });

    it('should produce different ciphertext for same token (random IV)', () => {
      const token = 'secret-access-token';
      const encrypted1 = service.encryptToken(token);
      const encrypted2 = service.encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should return original token when encryption key is not configured', async () => {
      const moduleWithoutKey: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleOAuthService,
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

      const serviceWithoutKey = moduleWithoutKey.get<GoogleOAuthService>(GoogleOAuthService);
      const token = 'plain-token';
      const result = serviceWithoutKey.encryptToken(token);

      expect(result).toBe(token);
    });
  });

  describe('decryptToken', () => {
    it('should decrypt token correctly', () => {
      const originalToken = 'secret-access-token';
      const encrypted = service.encryptToken(originalToken);
      const decrypted = service.decryptToken(encrypted);

      expect(decrypted).toBe(originalToken);
    });

    it('should handle long tokens', () => {
      const longToken = 'ya29.' + 'a'.repeat(200);
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
      const tampered = `${iv}:${ciphertext}tampered`;

      expect(() => service.decryptToken(tampered)).toThrow();
    });

    it('should return original when encryption key not configured', async () => {
      const moduleWithoutKey: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleOAuthService,
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

      const serviceWithoutKey = moduleWithoutKey.get<GoogleOAuthService>(GoogleOAuthService);
      const token = 'plain-token';
      const result = serviceWithoutKey.decryptToken(token);

      expect(result).toBe(token);
    });
  });

  // =========================================================================
  // Integration test - Full OAuth flow
  // =========================================================================

  describe('Full OAuth Flow Integration', () => {
    it('should complete full OAuth flow successfully', async () => {
      // Step 1: Generate authorization URL
      const state = service.generateState('user-123', 'cred-456', 'gmail');
      const authUrl = service.getAuthorizationUrl('gmail', state);

      expect(authUrl).toContain('accounts.google.com');
      expect(authUrl).toContain(state);

      // Step 2: Mock token exchange (simulating callback)
      mockTokenExchange('google', MOCK_TOKENS.google);
      const tokens = await service.exchangeCodeForTokens('auth-code-from-google');

      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();

      // Step 3: Get user info with the access token
      mockUserInfo('google', MOCK_USER_INFO.google);
      const userInfo = await service.getUserInfo(tokens.access_token);

      expect(userInfo.email).toBe('test@example.com');

      // Step 4: Encrypt tokens for storage
      const encryptedAccess = service.encryptToken(tokens.access_token);
      const encryptedRefresh = service.encryptToken(tokens.refresh_token!);

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
      const initialTokens = MOCK_TOKENS.google;

      // Mock refresh endpoint
      const refreshedTokens = {
        ...initialTokens,
        access_token: 'new-refreshed-token-xyz',
      };

      nock('https://oauth2.googleapis.com')
        .post('/token', (body: string) => body.includes('grant_type=refresh_token'))
        .reply(200, refreshedTokens);

      // Refresh the token
      const newTokens = await service.refreshAccessToken(initialTokens.refresh_token!);

      expect(newTokens.access_token).toBe('new-refreshed-token-xyz');

      // Verify new token works for API calls
      mockUserInfo('google', MOCK_USER_INFO.google);
      const userInfo = await service.getUserInfo(newTokens.access_token);

      expect(userInfo.email).toBe('test@example.com');
    });
  });
});
