import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import nock from 'nock';
import { SalesforceOAuthService, SalesforceOAuthTokens, SalesforceUserInfo } from '../salesforce-oauth.service';

describe('SalesforceOAuthService', () => {
  let service: SalesforceOAuthService;
  let configService: ConfigService;

  const mockConfig: Record<string, string> = {
    SALESFORCE_OAUTH_CLIENT_ID: 'test-salesforce-client-id',
    SALESFORCE_OAUTH_CLIENT_SECRET: 'test-salesforce-client-secret',
    SALESFORCE_OAUTH_REDIRECT_URI: 'http://localhost:3000/oauth/salesforce/callback',
    CONNECTOR_ENCRYPTION_KEY: 'a'.repeat(64), // 32 bytes hex (64 hex chars)
  };

  const mockTokens: SalesforceOAuthTokens = {
    access_token: 'mock-access-token-xyz',
    refresh_token: 'mock-refresh-token-abc',
    instance_url: 'https://na1.salesforce.com',
    id: 'https://login.salesforce.com/id/00D00000000000000/005000000000000',
    token_type: 'Bearer',
    issued_at: '1234567890000',
    signature: 'mock-signature',
  };

  const mockUserInfo: SalesforceUserInfo = {
    id: 'https://login.salesforce.com/id/00D00000000000000/005000000000000',
    asserted_user: true,
    user_id: '005000000000000',
    organization_id: '00D00000000000000',
    username: 'test@example.com',
    nick_name: 'Test',
    display_name: 'Test User',
    email: 'test@example.com',
    email_verified: true,
    first_name: 'Test',
    last_name: 'User',
    timezone: 'America/Los_Angeles',
    active: true,
    user_type: 'STANDARD',
    language: 'en_US',
    locale: 'en_US',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesforceOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<SalesforceOAuthService>(SalesforceOAuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    nock.cleanAll();
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
          SalesforceOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'SALESFORCE_OAUTH_CLIENT_ID') return undefined;
                return mockConfig[key];
              }),
            },
          },
        ],
      }).compile();

      const serviceWithMissingConfig = moduleWithMissingConfig.get<SalesforceOAuthService>(SalesforceOAuthService);
      expect(serviceWithMissingConfig.isConfigured()).toBe(false);
    });

    it('should return false when client secret is missing', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          SalesforceOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'SALESFORCE_OAUTH_CLIENT_SECRET') return undefined;
                return mockConfig[key];
              }),
            },
          },
        ],
      }).compile();

      const serviceWithMissingConfig = moduleWithMissingConfig.get<SalesforceOAuthService>(SalesforceOAuthService);
      expect(serviceWithMissingConfig.isConfigured()).toBe(false);
    });

    it('should return false when redirect URI is missing', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          SalesforceOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'SALESFORCE_OAUTH_REDIRECT_URI') return undefined;
                return mockConfig[key];
              }),
            },
          },
        ],
      }).compile();

      const serviceWithMissingConfig = moduleWithMissingConfig.get<SalesforceOAuthService>(SalesforceOAuthService);
      expect(serviceWithMissingConfig.isConfigured()).toBe(false);
    });
  });

  // =========================================================================
  // getAuthorizationUrl
  // =========================================================================

  describe('getAuthorizationUrl', () => {
    it('should generate correct production authorization URL', () => {
      const state = service.generateState('user-123', 'cred-456', 'salesforce');
      const url = service.getAuthorizationUrl(state, false);

      expect(url).toContain('https://login.salesforce.com/services/oauth2/authorize');
      expect(url).toContain(`client_id=${mockConfig.SALESFORCE_OAUTH_CLIENT_ID}`);
      expect(url).toContain('response_type=code');
      expect(url).toContain('prompt=consent');
      expect(url).toContain(encodeURIComponent('api'));
      expect(url).toContain(encodeURIComponent('refresh_token'));
      expect(url).toContain(encodeURIComponent('full'));
      expect(url).toContain(encodeURIComponent('chatter_api'));
    });

    it('should generate correct sandbox authorization URL', () => {
      const state = service.generateState('user-123', 'cred-456', 'salesforce', true);
      const url = service.getAuthorizationUrl(state, true);

      expect(url).toContain('https://test.salesforce.com/services/oauth2/authorize');
      expect(url).toContain(`client_id=${mockConfig.SALESFORCE_OAUTH_CLIENT_ID}`);
    });

    it('should include state parameter in URL', () => {
      const state = 'custom-state-xyz';
      const url = service.getAuthorizationUrl(state);

      expect(url).toContain(`state=${state}`);
    });

    it('should throw error when OAuth is not configured', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          SalesforceOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredService = moduleWithMissingConfig.get<SalesforceOAuthService>(SalesforceOAuthService);

      expect(() => unconfiguredService.getAuthorizationUrl('state')).toThrow(
        'Salesforce OAuth is not configured',
      );
    });
  });

  // =========================================================================
  // exchangeCodeForTokens
  // =========================================================================

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens successfully (production)', async () => {
      nock('https://login.salesforce.com')
        .post('/services/oauth2/token')
        .reply(200, mockTokens);

      const tokens = await service.exchangeCodeForTokens('test-auth-code', false);

      expect(tokens.access_token).toBe(mockTokens.access_token);
      expect(tokens.refresh_token).toBe(mockTokens.refresh_token);
      expect(tokens.instance_url).toBe(mockTokens.instance_url);
    });

    it('should exchange code for tokens successfully (sandbox)', async () => {
      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(200, mockTokens);

      const tokens = await service.exchangeCodeForTokens('test-auth-code', true);

      expect(tokens.access_token).toBe(mockTokens.access_token);
    });

    it('should throw UnauthorizedException on token exchange failure', async () => {
      nock('https://login.salesforce.com')
        .post('/services/oauth2/token')
        .reply(400, { error: 'invalid_grant', error_description: 'Invalid code' });

      await expect(service.exchangeCodeForTokens('invalid-code')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error when OAuth is not configured', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          SalesforceOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredService = moduleWithMissingConfig.get<SalesforceOAuthService>(SalesforceOAuthService);

      await expect(unconfiguredService.exchangeCodeForTokens('code')).rejects.toThrow(
        'Salesforce OAuth is not configured',
      );
    });
  });

  // =========================================================================
  // refreshAccessToken
  // =========================================================================

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully (production)', async () => {
      const refreshedTokens = {
        ...mockTokens,
        access_token: 'new-access-token-xyz',
      };

      nock('https://login.salesforce.com')
        .post('/services/oauth2/token')
        .reply(200, refreshedTokens);

      const tokens = await service.refreshAccessToken('mock-refresh-token', false);

      expect(tokens.access_token).toBe('new-access-token-xyz');
    });

    it('should refresh access token successfully (sandbox)', async () => {
      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(200, mockTokens);

      const tokens = await service.refreshAccessToken('mock-refresh-token', true);

      expect(tokens.access_token).toBe(mockTokens.access_token);
    });

    it('should throw UnauthorizedException on refresh failure', async () => {
      nock('https://login.salesforce.com')
        .post('/services/oauth2/token')
        .reply(400, { error: 'invalid_grant', error_description: 'Refresh token expired' });

      await expect(service.refreshAccessToken('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error when OAuth is not configured', async () => {
      const moduleWithMissingConfig: TestingModule = await Test.createTestingModule({
        providers: [
          SalesforceOAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const unconfiguredService = moduleWithMissingConfig.get<SalesforceOAuthService>(SalesforceOAuthService);

      await expect(unconfiguredService.refreshAccessToken('token')).rejects.toThrow(
        'Salesforce OAuth is not configured',
      );
    });
  });

  // =========================================================================
  // revokeToken
  // =========================================================================

  describe('revokeToken', () => {
    it('should revoke token successfully (production)', async () => {
      nock('https://login.salesforce.com')
        .post('/services/oauth2/revoke')
        .reply(200);

      await expect(service.revokeToken('access-token', false)).resolves.not.toThrow();
    });

    it('should revoke token successfully (sandbox)', async () => {
      nock('https://test.salesforce.com')
        .post('/services/oauth2/revoke')
        .reply(200);

      await expect(service.revokeToken('access-token', true)).resolves.not.toThrow();
    });

    it('should throw error on revocation failure', async () => {
      nock('https://login.salesforce.com')
        .post('/services/oauth2/revoke')
        .reply(400, { error: 'unsupported_token_type' });

      await expect(service.revokeToken('invalid-token')).rejects.toThrow('Failed to revoke token');
    });
  });

  // =========================================================================
  // getUserInfo
  // =========================================================================

  describe('getUserInfo', () => {
    it('should get user info successfully', async () => {
      const identityUrl = 'https://login.salesforce.com/id/00D00000000000000/005000000000000';

      nock('https://login.salesforce.com')
        .get('/id/00D00000000000000/005000000000000')
        .reply(200, mockUserInfo);

      const userInfo = await service.getUserInfo(
        'mock-access-token',
        'https://na1.salesforce.com',
        identityUrl,
      );

      expect(userInfo.email).toBe(mockUserInfo.email);
      expect(userInfo.display_name).toBe(mockUserInfo.display_name);
      expect(userInfo.user_id).toBe(mockUserInfo.user_id);
    });

    it('should throw UnauthorizedException on user info failure', async () => {
      nock('https://login.salesforce.com')
        .get('/id/00D00000000000000/005000000000000')
        .reply(401, { error: 'invalid_token' });

      await expect(
        service.getUserInfo(
          'invalid-token',
          'https://na1.salesforce.com',
          'https://login.salesforce.com/id/00D00000000000000/005000000000000',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // generateState / decodeState
  // =========================================================================

  describe('state parameter handling', () => {
    it('should generate and decode state correctly', () => {
      const state = service.generateState('user-123', 'cred-456', 'salesforce', false, '/dashboard');
      const decoded = service.decodeState(state);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.credentialId).toBe('cred-456');
      expect(decoded.connectorType).toBe('salesforce');
      expect(decoded.isSandbox).toBe(false);
      expect(decoded.returnUrl).toBe('/dashboard');
      expect(decoded.timestamp).toBeDefined();
    });

    it('should include sandbox flag in state', () => {
      const state = service.generateState('user-123', 'cred-456', 'salesforce', true);
      const decoded = service.decodeState(state);

      expect(decoded.isSandbox).toBe(true);
    });

    it('should throw UnauthorizedException for expired state', () => {
      // Create a state with an old timestamp
      const oldState = {
        userId: 'user-123',
        credentialId: 'cred-456',
        connectorType: 'salesforce',
        isSandbox: false,
        timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
        nonce: 'test-nonce',
      };
      const encodedState = Buffer.from(JSON.stringify(oldState)).toString('base64url');

      expect(() => service.decodeState(encodedState)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid state format', () => {
      expect(() => service.decodeState('invalid-base64!!!')).toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // Token encryption/decryption
  // =========================================================================

  describe('token encryption', () => {
    it('should encrypt and decrypt tokens correctly', () => {
      const originalToken = 'my-secret-access-token';
      const encrypted = service.encryptToken(originalToken);
      const decrypted = service.decryptToken(encrypted);

      expect(encrypted).not.toBe(originalToken);
      expect(encrypted).toContain(':'); // IV:encrypted format
      expect(decrypted).toBe(originalToken);
    });

    it('should return token as-is when encryption key is not set', async () => {
      const moduleWithoutEncryption: TestingModule = await Test.createTestingModule({
        providers: [
          SalesforceOAuthService,
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

      const serviceWithoutEncryption = moduleWithoutEncryption.get<SalesforceOAuthService>(SalesforceOAuthService);
      const token = 'unencrypted-token';

      expect(serviceWithoutEncryption.encryptToken(token)).toBe(token);
      expect(serviceWithoutEncryption.decryptToken(token)).toBe(token);
    });

    it('should throw error when decryption fails', () => {
      expect(() => service.decryptToken('invalid:encrypted:data')).toThrow('Failed to decrypt token');
    });
  });

  // =========================================================================
  // validateInstanceUrl
  // =========================================================================

  describe('validateInstanceUrl', () => {
    it('should validate standard Salesforce instance URLs', () => {
      expect(service.validateInstanceUrl('https://na1.salesforce.com')).toBe(true);
      expect(service.validateInstanceUrl('https://cs42.salesforce.com')).toBe(true);
      expect(service.validateInstanceUrl('https://ap1.salesforce.com')).toBe(true);
    });

    it('should validate My Domain URLs', () => {
      expect(service.validateInstanceUrl('https://mycompany.my.salesforce.com')).toBe(true);
      expect(service.validateInstanceUrl('https://my-company-name.my.salesforce.com')).toBe(true);
    });

    it('should validate sandbox My Domain URLs', () => {
      expect(
        service.validateInstanceUrl('https://mycompany--sandbox.sandbox.my.salesforce.com'),
      ).toBe(true);
      expect(
        service.validateInstanceUrl('https://my-company--dev.sandbox.my.salesforce.com'),
      ).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(service.validateInstanceUrl('https://invalid-domain.com')).toBe(false);
      expect(service.validateInstanceUrl('http://na1.salesforce.com')).toBe(false); // No HTTPS
      expect(service.validateInstanceUrl('https://salesforce.com')).toBe(false); // Missing subdomain
      expect(service.validateInstanceUrl('https://fake.salesforce.net')).toBe(false); // Wrong TLD
    });
  });
});
