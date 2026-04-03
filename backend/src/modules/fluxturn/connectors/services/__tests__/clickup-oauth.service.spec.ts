/**
 * ClickUp OAuth Service Tests
 *
 * Tests for ClickUp OAuth flow including token exchange, state management, and encryption.
 */
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { ClickUpOAuthService } from '../clickup-oauth.service';
import { createExpiredOAuthState } from '@test/helpers/mock-credentials';

describe('ClickUpOAuthService', () => {
  let service: ClickUpOAuthService;
  let mockConfigService: ConfigService;

  // Define credentials directly to avoid union type issues from getOAuthMockCredentials
  const mockCredentials = {
    clientId: 'mock-clickup-client-id',
    clientSecret: 'mock-clickup-client-secret',
    accessToken: 'pk_mock_clickup_access_token_12345',
  };
  const MOCK_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes in hex

  beforeEach(() => {
    nock.cleanAll();

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'CLICKUP_OAUTH_CLIENT_ID':
            return mockCredentials.clientId;
          case 'CLICKUP_OAUTH_CLIENT_SECRET':
            return mockCredentials.clientSecret;
          case 'CLICKUP_OAUTH_REDIRECT_URI':
            return 'https://example.com/oauth/callback/clickup';
          case 'CONNECTOR_ENCRYPTION_KEY':
            return MOCK_ENCRYPTION_KEY;
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService;

    service = new ClickUpOAuthService(mockConfigService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Configuration Tests
  // ===========================================
  describe('isConfigured', () => {
    it('should return true when all OAuth credentials are configured', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when client ID is missing', () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'CLICKUP_OAUTH_CLIENT_ID') return undefined;
        if (key === 'CLICKUP_OAUTH_CLIENT_SECRET') return mockCredentials.clientSecret;
        if (key === 'CLICKUP_OAUTH_REDIRECT_URI') return 'https://example.com/callback';
        return undefined;
      });

      const unconfiguredService = new ClickUpOAuthService(mockConfigService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });

    it('should return false when client secret is missing', () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'CLICKUP_OAUTH_CLIENT_ID') return mockCredentials.clientId;
        if (key === 'CLICKUP_OAUTH_CLIENT_SECRET') return undefined;
        if (key === 'CLICKUP_OAUTH_REDIRECT_URI') return 'https://example.com/callback';
        return undefined;
      });

      const unconfiguredService = new ClickUpOAuthService(mockConfigService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });

    it('should return false when redirect URI is missing', () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'CLICKUP_OAUTH_CLIENT_ID') return mockCredentials.clientId;
        if (key === 'CLICKUP_OAUTH_CLIENT_SECRET') return mockCredentials.clientSecret;
        if (key === 'CLICKUP_OAUTH_REDIRECT_URI') return undefined;
        return undefined;
      });

      const unconfiguredService = new ClickUpOAuthService(mockConfigService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  // ===========================================
  // Authorization URL Tests
  // ===========================================
  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL', () => {
      const state = service.generateState('user-123', 'cred-456', 'clickup');
      const url = service.getAuthorizationUrl(state);

      expect(url).toContain('https://app.clickup.com/api');
      expect(url).toContain(`client_id=${mockCredentials.clientId}`);
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('state=');
    });

    it('should throw error when OAuth is not configured', () => {
      mockConfigService.get = jest.fn(() => undefined);
      const unconfiguredService = new ClickUpOAuthService(mockConfigService);

      expect(() => unconfiguredService.getAuthorizationUrl('test-state')).toThrow(
        'ClickUp OAuth is not configured',
      );
    });
  });

  // ===========================================
  // Token Exchange Tests
  // ===========================================
  describe('exchangeCodeForTokens', () => {
    it('should exchange authorization code for tokens successfully', async () => {
      nock('https://api.clickup.com')
        .post('/api/v2/oauth/token')
        .reply(200, {
          access_token: 'pk_test_access_token_12345',
          token_type: 'Bearer',
        });

      const tokens = await service.exchangeCodeForTokens('auth-code-123');

      expect(tokens.access_token).toBe('pk_test_access_token_12345');
      expect(tokens.token_type).toBe('Bearer');
    });

    it('should include client credentials in request body', async () => {
      nock('https://api.clickup.com')
        .post('/api/v2/oauth/token', (body) => {
          return (
            body.client_id === mockCredentials.clientId &&
            body.client_secret === mockCredentials.clientSecret &&
            body.code === 'test-code'
          );
        })
        .reply(200, {
          access_token: 'test-token',
          token_type: 'Bearer',
        });

      await service.exchangeCodeForTokens('test-code');
    });

    it('should throw UnauthorizedException on invalid code', async () => {
      nock('https://api.clickup.com')
        .post('/api/v2/oauth/token')
        .reply(401, {
          err: 'Code invalid',
          ECODE: 'OAUTH_019',
        });

      await expect(service.exchangeCodeForTokens('invalid-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle network errors gracefully', async () => {
      nock('https://api.clickup.com')
        .post('/api/v2/oauth/token')
        .replyWithError('Network error');

      await expect(service.exchangeCodeForTokens('test-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error when OAuth is not configured', async () => {
      mockConfigService.get = jest.fn(() => undefined);
      const unconfiguredService = new ClickUpOAuthService(mockConfigService);

      await expect(unconfiguredService.exchangeCodeForTokens('code')).rejects.toThrow(
        'ClickUp OAuth is not configured',
      );
    });
  });

  // ===========================================
  // State Management Tests
  // ===========================================
  describe('generateState', () => {
    it('should generate base64url encoded state with all required fields', () => {
      const state = service.generateState('user-123', 'cred-456', 'clickup', '/dashboard');

      // Should be valid base64url
      expect(() => Buffer.from(state, 'base64url')).not.toThrow();

      // Decode and verify contents
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
      expect(decoded.userId).toBe('user-123');
      expect(decoded.credentialId).toBe('cred-456');
      expect(decoded.connectorType).toBe('clickup');
      expect(decoded.returnUrl).toBe('/dashboard');
      expect(decoded.timestamp).toBeDefined();
      expect(decoded.nonce).toBeDefined();
    });

    it('should generate unique states (different nonce)', () => {
      const state1 = service.generateState('user', 'cred', 'clickup');
      const state2 = service.generateState('user', 'cred', 'clickup');

      expect(state1).not.toBe(state2);
    });
  });

  describe('decodeState', () => {
    it('should decode valid state correctly', () => {
      const originalState = service.generateState('user-123', 'cred-456', 'clickup', '/return');
      const decoded = service.decodeState(originalState);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.credentialId).toBe('cred-456');
      expect(decoded.connectorType).toBe('clickup');
      expect(decoded.returnUrl).toBe('/return');
    });

    it('should throw UnauthorizedException for expired state (> 10 minutes)', () => {
      const expiredState = createExpiredOAuthState();

      expect(() => service.decodeState(expiredState)).toThrow(UnauthorizedException);
    });

    it('should accept state within 10 minute window', () => {
      const recentState = service.generateState('user', 'cred', 'clickup');

      expect(() => service.decodeState(recentState)).not.toThrow();
    });

    it('should throw UnauthorizedException for invalid base64', () => {
      expect(() => service.decodeState('not-valid-base64!!!')).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid JSON', () => {
      const invalidJson = Buffer.from('not json').toString('base64url');

      expect(() => service.decodeState(invalidJson)).toThrow(UnauthorizedException);
    });
  });

  // ===========================================
  // Encryption Tests
  // ===========================================
  describe('encryptToken', () => {
    it('should encrypt token when encryption key is configured', () => {
      const token = 'pk_test_access_token';
      const encrypted = service.encryptToken(token);

      expect(encrypted).not.toBe(token);
      expect(encrypted).toContain(':'); // IV:ciphertext format
    });

    it('should produce different ciphertext for same token (random IV)', () => {
      const token = 'pk_test_access_token';
      const encrypted1 = service.encryptToken(token);
      const encrypted2 = service.encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should return original token when encryption key is not configured', () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'CONNECTOR_ENCRYPTION_KEY') return undefined;
        if (key === 'CLICKUP_OAUTH_CLIENT_ID') return mockCredentials.clientId;
        if (key === 'CLICKUP_OAUTH_CLIENT_SECRET') return mockCredentials.clientSecret;
        if (key === 'CLICKUP_OAUTH_REDIRECT_URI') return 'https://example.com/callback';
        return undefined;
      });

      const serviceNoEncryption = new ClickUpOAuthService(mockConfigService);
      const token = 'pk_test_access_token';
      const result = serviceNoEncryption.encryptToken(token);

      expect(result).toBe(token);
    });
  });

  describe('decryptToken', () => {
    it('should decrypt token correctly', () => {
      const originalToken = 'pk_test_access_token_12345';
      const encrypted = service.encryptToken(originalToken);
      const decrypted = service.decryptToken(encrypted);

      expect(decrypted).toBe(originalToken);
    });

    it('should handle long tokens', () => {
      const longToken = 'pk_' + 'a'.repeat(500);
      const encrypted = service.encryptToken(longToken);
      const decrypted = service.decryptToken(encrypted);

      expect(decrypted).toBe(longToken);
    });

    it('should throw error for invalid encrypted token format', () => {
      expect(() => service.decryptToken('no-colon-separator')).toThrow('Failed to decrypt token');
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = service.encryptToken('test-token');
      const [iv, ciphertext] = encrypted.split(':');
      const tampered = `${iv}:${ciphertext.slice(0, -4)}xxxx`;

      expect(() => service.decryptToken(tampered)).toThrow();
    });

    it('should return original when encryption key not configured', () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'CONNECTOR_ENCRYPTION_KEY') return undefined;
        if (key === 'CLICKUP_OAUTH_CLIENT_ID') return mockCredentials.clientId;
        if (key === 'CLICKUP_OAUTH_CLIENT_SECRET') return mockCredentials.clientSecret;
        if (key === 'CLICKUP_OAUTH_REDIRECT_URI') return 'https://example.com/callback';
        return undefined;
      });

      const serviceNoEncryption = new ClickUpOAuthService(mockConfigService);
      const token = 'unencrypted-token';
      const result = serviceNoEncryption.decryptToken(token);

      expect(result).toBe(token);
    });
  });

  // ===========================================
  // Full OAuth Flow Integration
  // ===========================================
  describe('Full ClickUp OAuth Flow Integration', () => {
    it('should complete full OAuth flow successfully', async () => {
      // 1. Generate state
      const state = service.generateState('user-123', 'cred-456', 'clickup', '/return');
      expect(state).toBeDefined();

      // 2. Get authorization URL
      const authUrl = service.getAuthorizationUrl(state);
      expect(authUrl).toContain('https://app.clickup.com/api');

      // 3. Mock token exchange
      nock('https://api.clickup.com')
        .post('/api/v2/oauth/token')
        .reply(200, {
          access_token: 'pk_live_access_token_abc123',
          token_type: 'Bearer',
        });

      // 4. Exchange code for tokens
      const tokens = await service.exchangeCodeForTokens('auth-code');
      expect(tokens.access_token).toBeDefined();

      // 5. Encrypt token for storage
      const encryptedToken = service.encryptToken(tokens.access_token);
      expect(encryptedToken).not.toBe(tokens.access_token);

      // 6. Decrypt token for use
      const decryptedToken = service.decryptToken(encryptedToken);
      expect(decryptedToken).toBe(tokens.access_token);
    });

    it('should decode state from callback', () => {
      // Generate state as if starting OAuth flow
      const originalState = service.generateState(
        'user-abc',
        'cred-xyz',
        'clickup',
        '/workflows',
      );

      // Simulate callback - decode state
      const decodedState = service.decodeState(originalState);

      expect(decodedState.userId).toBe('user-abc');
      expect(decodedState.credentialId).toBe('cred-xyz');
      expect(decodedState.connectorType).toBe('clickup');
      expect(decodedState.returnUrl).toBe('/workflows');
    });
  });
});
