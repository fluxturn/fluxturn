/**
 * Dropbox OAuth Service Tests
 *
 * Tests for the Dropbox OAuth service including authorization URL generation,
 * token exchange, token refresh, and state management.
 */
import nock from 'nock';
import { ConfigService } from '@nestjs/config';
import { DropboxOAuthService } from '../../../services/dropbox-oauth.service';

describe('DropboxOAuthService', () => {
  let service: DropboxOAuthService;
  let mockConfigService: Partial<ConfigService>;

  const dropboxCreds = {
    clientId: 'mock-dropbox-client-id',
    clientSecret: 'mock-dropbox-client-secret',
    accessToken: 'sl.mock-dropbox-access-token',
    refreshToken: 'mock-dropbox-refresh-token',
  };
  const API_BASE_URL = 'https://api.dropboxapi.com';

  beforeEach(() => {
    nock.cleanAll();

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          DROPBOX_CLIENT_ID: dropboxCreds.clientId,
          DROPBOX_CLIENT_SECRET: dropboxCreds.clientSecret,
          DROPBOX_REDIRECT_URI: 'http://localhost:3000/api/oauth/dropbox/callback',
          CONNECTOR_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
        };
        return config[key];
      }),
    };

    service = new DropboxOAuthService(mockConfigService as ConfigService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Configuration Tests
  // ===========================================
  describe('isConfigured', () => {
    it('should return true when all OAuth credentials are set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when client ID is missing', () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'DROPBOX_CLIENT_ID') return undefined;
        return 'mock-value';
      });

      const unconfiguredService = new DropboxOAuthService(mockConfigService as ConfigService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });

    it('should return false when client secret is missing', () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'DROPBOX_CLIENT_SECRET') return undefined;
        return 'mock-value';
      });

      const unconfiguredService = new DropboxOAuthService(mockConfigService as ConfigService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  // ===========================================
  // Authorization URL Tests
  // ===========================================
  describe('getAuthorizationUrl', () => {
    it('should generate valid authorization URL', () => {
      const state = service.generateState('user-123', 'cred-456');
      const url = service.getAuthorizationUrl(state);

      expect(url).toContain('https://www.dropbox.com/oauth2/authorize');
      expect(url).toContain(`client_id=${dropboxCreds.clientId}`);
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('token_access_type=offline');
      expect(url).toContain(`state=${state}`);
    });

    it('should include scopes in authorization URL', () => {
      const state = service.generateState('user-123', 'cred-456');
      const scopes = ['files.metadata.read', 'files.content.read'];
      const url = service.getAuthorizationUrl(state, scopes);

      expect(url).toContain('scope=');
      expect(url).toContain('files.metadata.read');
      expect(url).toContain('files.content.read');
    });

    it('should throw error when OAuth is not configured', () => {
      mockConfigService.get = jest.fn(() => undefined);
      const unconfiguredService = new DropboxOAuthService(mockConfigService as ConfigService);

      expect(() => {
        unconfiguredService.getAuthorizationUrl('test-state');
      }).toThrow('Dropbox OAuth is not configured');
    });
  });

  // ===========================================
  // Token Exchange Tests
  // ===========================================
  describe('exchangeCodeForTokens', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockTokens = {
        access_token: 'sl.mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 14400,
        token_type: 'bearer',
        scope: 'files.metadata.read files.content.read',
        uid: 'mock-uid',
        account_id: 'dbid:mock-account-id',
      };

      nock(API_BASE_URL)
        .post('/oauth2/token')
        .reply(200, mockTokens);

      const result = await service.exchangeCodeForTokens('mock-auth-code');

      expect(result.access_token).toBe(mockTokens.access_token);
      expect(result.refresh_token).toBe(mockTokens.refresh_token);
      expect(result.expires_in).toBe(mockTokens.expires_in);
    });

    it('should handle invalid authorization code', async () => {
      nock(API_BASE_URL)
        .post('/oauth2/token')
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'Invalid authorization code',
        });

      await expect(service.exchangeCodeForTokens('invalid-code')).rejects.toThrow(
        'Failed to exchange authorization code',
      );
    });

    it('should throw error when OAuth is not configured', async () => {
      mockConfigService.get = jest.fn(() => undefined);
      const unconfiguredService = new DropboxOAuthService(mockConfigService as ConfigService);

      await expect(unconfiguredService.exchangeCodeForTokens('code')).rejects.toThrow(
        'Dropbox OAuth is not configured',
      );
    });
  });

  // ===========================================
  // Token Refresh Tests
  // ===========================================
  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const mockTokens = {
        access_token: 'sl.new-access-token',
        expires_in: 14400,
        token_type: 'bearer',
      };

      nock(API_BASE_URL)
        .post('/oauth2/token')
        .reply(200, mockTokens);

      const result = await service.refreshAccessToken('mock-refresh-token');

      expect(result.access_token).toBe(mockTokens.access_token);
      expect(result.expires_in).toBe(mockTokens.expires_in);
    });

    it('should handle invalid refresh token', async () => {
      nock(API_BASE_URL)
        .post('/oauth2/token')
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'Refresh token is invalid or expired',
        });

      await expect(service.refreshAccessToken('invalid-refresh-token')).rejects.toThrow(
        'Failed to refresh access token',
      );
    });
  });

  // ===========================================
  // User Info Tests
  // ===========================================
  describe('getUserInfo', () => {
    it('should get user info successfully', async () => {
      const mockUserInfo = {
        account_id: 'dbid:mock-account-id',
        name: {
          given_name: 'Test',
          surname: 'User',
          familiar_name: 'Test',
          display_name: 'Test User',
          abbreviated_name: 'TU',
        },
        email: 'test@example.com',
        email_verified: true,
        profile_photo_url: 'https://dropbox.com/avatar.jpg',
      };

      nock(API_BASE_URL)
        .post('/2/users/get_current_account')
        .reply(200, mockUserInfo);

      const result = await service.getUserInfo('mock-access-token');

      expect(result.account_id).toBe(mockUserInfo.account_id);
      expect(result.email).toBe(mockUserInfo.email);
      expect(result.name.display_name).toBe('Test User');
    });

    it('should handle invalid access token', async () => {
      nock(API_BASE_URL)
        .post('/2/users/get_current_account')
        .reply(401, {
          error_summary: 'invalid_access_token/...',
          error: {
            '.tag': 'invalid_access_token',
          },
        });

      await expect(service.getUserInfo('invalid-token')).rejects.toThrow(
        'Failed to get user info',
      );
    });
  });

  // ===========================================
  // Token Revocation Tests
  // ===========================================
  describe('revokeToken', () => {
    it('should revoke token successfully', async () => {
      nock(API_BASE_URL)
        .post('/2/auth/token/revoke')
        .reply(200, null);

      await expect(service.revokeToken('mock-access-token')).resolves.not.toThrow();
    });

    it('should handle revocation failure', async () => {
      nock(API_BASE_URL)
        .post('/2/auth/token/revoke')
        .reply(400, {
          error_summary: 'invalid_access_token/...',
        });

      await expect(service.revokeToken('invalid-token')).rejects.toThrow(
        'Failed to revoke token',
      );
    });
  });

  // ===========================================
  // State Management Tests
  // ===========================================
  describe('generateState', () => {
    it('should generate valid state parameter', () => {
      const state = service.generateState('user-123', 'cred-456');

      expect(state).toBeTruthy();
      expect(typeof state).toBe('string');
    });

    it('should include return URL in state', () => {
      const state = service.generateState('user-123', 'cred-456', '/dashboard');
      const decoded = service.decodeState(state);

      expect(decoded.returnUrl).toBe('/dashboard');
    });
  });

  describe('decodeState', () => {
    it('should decode valid state parameter', () => {
      const state = service.generateState('user-123', 'cred-456', '/dashboard');
      const decoded = service.decodeState(state);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.credentialId).toBe('cred-456');
      expect(decoded.connectorType).toBe('dropbox');
      expect(decoded.returnUrl).toBe('/dashboard');
      expect(decoded.timestamp).toBeDefined();
    });

    it('should reject expired state parameter', () => {
      // Create state with old timestamp
      const oldData = {
        userId: 'user-123',
        credentialId: 'cred-456',
        connectorType: 'dropbox',
        timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
        nonce: 'test-nonce',
      };
      const expiredState = Buffer.from(JSON.stringify(oldData)).toString('base64url');

      expect(() => service.decodeState(expiredState)).toThrow('Invalid state parameter');
    });

    it('should reject invalid state parameter', () => {
      expect(() => service.decodeState('invalid-state')).toThrow('Invalid state parameter');
    });
  });

  // ===========================================
  // Token Expiration Tests
  // ===========================================
  describe('isTokenExpiringSoon', () => {
    it('should return true for token expiring within 5 minutes', () => {
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
      expect(service.isTokenExpiringSoon(expiresAt)).toBe(true);
    });

    it('should return false for token not expiring soon', () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      expect(service.isTokenExpiringSoon(expiresAt)).toBe(false);
    });

    it('should return true for already expired token', () => {
      const expiresAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      expect(service.isTokenExpiringSoon(expiresAt)).toBe(true);
    });
  });

  // ===========================================
  // Default Scopes Tests
  // ===========================================
  describe('getDefaultScopes', () => {
    it('should return default scopes', () => {
      const scopes = service.getDefaultScopes();

      expect(scopes).toContain('files.metadata.read');
      expect(scopes).toContain('files.metadata.write');
      expect(scopes).toContain('files.content.read');
      expect(scopes).toContain('files.content.write');
      expect(scopes).toContain('account_info.read');
    });
  });
});
