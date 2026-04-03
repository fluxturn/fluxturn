import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import nock from 'nock';
import { AuthUtils, OAuthConfig } from '../auth.utils';
import { AuthType } from '../../types';

describe('AuthUtils', () => {
  let authUtils: AuthUtils;
  let httpService: HttpService;

  const mockOAuthConfig: OAuthConfig = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    authorizationUrl: 'https://auth.example.com/authorize',
    tokenUrl: 'https://auth.example.com/token',
    scope: 'read write',
    redirectUri: 'http://localhost:3000/callback',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthUtils,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    authUtils = module.get<AuthUtils>(AuthUtils);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  // =========================================================================
  // generateOAuthUrl
  // =========================================================================

  describe('generateOAuthUrl', () => {
    it('should generate correct OAuth URL with all parameters', () => {
      const url = authUtils.generateOAuthUrl(mockOAuthConfig);

      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('scope=read+write');
    });

    it('should generate state parameter when not provided', () => {
      const url = authUtils.generateOAuthUrl(mockOAuthConfig);
      expect(url).toContain('state=');
    });

    it('should use provided state parameter', () => {
      const configWithState = { ...mockOAuthConfig, state: 'custom-state-123' };
      const url = authUtils.generateOAuthUrl(configWithState);
      expect(url).toContain('state=custom-state-123');
    });

    it('should encode special characters in scope', () => {
      const configWithSpecialScope = {
        ...mockOAuthConfig,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
      };
      const url = authUtils.generateOAuthUrl(configWithSpecialScope);
      expect(url).toContain(encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly'));
    });
  });

  // =========================================================================
  // exchangeOAuthCode
  // =========================================================================

  describe('exchangeOAuthCode', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
        status: 200,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse as AxiosResponse));

      const tokens = await authUtils.exchangeOAuthCode(mockOAuthConfig, 'auth-code-123');

      expect(tokens.accessToken).toBe('mock-access-token');
      expect(tokens.refreshToken).toBe('mock-refresh-token');
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresAt).toBeDefined();
      expect(tokens.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error on failed token exchange', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        throwError(() => ({ message: 'Invalid code' })),
      );

      await expect(
        authUtils.exchangeOAuthCode(mockOAuthConfig, 'invalid-code'),
      ).rejects.toMatchObject({
        code: 'OAUTH_TOKEN_EXCHANGE_FAILED',
      });
    });

    it('should handle tokens without refresh_token', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: {
          access_token: 'mock-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
        status: 200,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse as AxiosResponse));

      const tokens = await authUtils.exchangeOAuthCode(mockOAuthConfig, 'auth-code-123');

      expect(tokens.accessToken).toBe('mock-access-token');
      expect(tokens.refreshToken).toBeUndefined();
    });
  });

  // =========================================================================
  // refreshOAuthTokens
  // =========================================================================

  describe('refreshOAuthTokens', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
        status: 200,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse as AxiosResponse));

      const tokens = await authUtils.refreshOAuthTokens(mockOAuthConfig, 'old-refresh-token');

      expect(tokens.accessToken).toBe('new-access-token');
      expect(tokens.refreshToken).toBe('new-refresh-token');
    });

    it('should throw error on failed refresh', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        throwError(() => ({ message: 'Invalid refresh token' })),
      );

      await expect(
        authUtils.refreshOAuthTokens(mockOAuthConfig, 'invalid-refresh-token'),
      ).rejects.toMatchObject({
        code: 'OAUTH_TOKEN_REFRESH_FAILED',
      });
    });
  });

  // =========================================================================
  // validateOAuthTokens
  // =========================================================================

  describe('validateOAuthTokens', () => {
    it('should return true for valid non-expired tokens', async () => {
      const tokens = {
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      const isValid = await authUtils.validateOAuthTokens(tokens);
      expect(isValid).toBe(true);
    });

    it('should return false for expired tokens', async () => {
      const tokens = {
        accessToken: 'expired-token',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      };

      const isValid = await authUtils.validateOAuthTokens(tokens);
      expect(isValid).toBe(false);
    });

    it('should return true for tokens without expiration', async () => {
      const tokens = {
        accessToken: 'valid-token',
      };

      const isValid = await authUtils.validateOAuthTokens(tokens);
      expect(isValid).toBe(true);
    });
  });

  // =========================================================================
  // createAuthHeaders
  // =========================================================================

  describe('createAuthHeaders', () => {
    it('should create Bearer token header for OAUTH2', () => {
      const headers = authUtils.createAuthHeaders(AuthType.OAUTH2, {
        accessToken: 'test-token',
      });

      expect(headers['Authorization']).toBe('Bearer test-token');
    });

    it('should support snake_case access_token for backward compatibility', () => {
      const headers = authUtils.createAuthHeaders(AuthType.OAUTH2, {
        access_token: 'test-token-snake',
      });

      expect(headers['Authorization']).toBe('Bearer test-token-snake');
    });

    it('should create Basic auth header', () => {
      const headers = authUtils.createAuthHeaders(AuthType.BASIC_AUTH, {
        username: 'user',
        password: 'pass',
      });

      const expected = 'Basic ' + Buffer.from('user:pass').toString('base64');
      expect(headers['Authorization']).toBe(expected);
    });

    it('should create API key header with default header name', () => {
      const headers = authUtils.createAuthHeaders(AuthType.API_KEY, {
        apiKey: 'my-api-key',
      });

      expect(headers['X-API-Key']).toBe('my-api-key');
    });

    it('should create API key header with custom header name', () => {
      const headers = authUtils.createAuthHeaders(AuthType.API_KEY, {
        apiKey: 'my-api-key',
        headerName: 'X-Custom-Key',
      });

      expect(headers['X-Custom-Key']).toBe('my-api-key');
    });

    it('should create API key header with prefix', () => {
      const headers = authUtils.createAuthHeaders(AuthType.API_KEY, {
        apiKey: 'my-api-key',
        prefix: 'Bearer',
      });

      expect(headers['X-API-Key']).toBe('Bearer my-api-key');
    });

    it('should create Bearer token header for BEARER_TOKEN auth type', () => {
      const headers = authUtils.createAuthHeaders(AuthType.BEARER_TOKEN, {
        accessToken: 'bearer-token',
      });

      expect(headers['Authorization']).toBe('Bearer bearer-token');
    });

    it('should return empty headers for CUSTOM auth type', () => {
      const headers = authUtils.createAuthHeaders(AuthType.CUSTOM, {
        customField: 'value',
      });

      expect(headers).toEqual({});
    });
  });

  // =========================================================================
  // createApiKeyQueryParams
  // =========================================================================

  describe('createApiKeyQueryParams', () => {
    it('should create query params with API key', () => {
      const params = authUtils.createApiKeyQueryParams({
        apiKey: 'my-api-key',
        queryParamName: 'api_key',
      });

      expect(params['api_key']).toBe('my-api-key');
    });

    it('should return empty object without queryParamName', () => {
      const params = authUtils.createApiKeyQueryParams({
        apiKey: 'my-api-key',
      });

      expect(params).toEqual({});
    });
  });

  // =========================================================================
  // encryptCredentials / decryptCredentials
  // =========================================================================

  describe('encryptCredentials / decryptCredentials', () => {
    const testSecretKey = 'test-encryption-key-32-chars!!';

    it('should encrypt and decrypt credentials correctly', () => {
      const credentials = {
        accessToken: 'secret-token',
        apiKey: 'secret-key',
        refreshToken: 'refresh-secret',
      };

      const encrypted = authUtils.encryptCredentials(credentials, testSecretKey);
      expect(encrypted).not.toContain('secret-token');
      expect(encrypted).not.toContain('secret-key');

      const decrypted = authUtils.decryptCredentials(encrypted, testSecretKey);
      expect(decrypted).toEqual(credentials);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const credentials = { apiKey: 'test-key' };

      const encrypted1 = authUtils.encryptCredentials(credentials, testSecretKey);
      const encrypted2 = authUtils.encryptCredentials(credentials, testSecretKey);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw error with invalid encrypted data', () => {
      expect(() => {
        authUtils.decryptCredentials('invalid-data', testSecretKey);
      }).toThrow();
    });

    it('should throw error with wrong key', () => {
      const credentials = { apiKey: 'test-key' };
      const encrypted = authUtils.encryptCredentials(credentials, testSecretKey);

      expect(() => {
        authUtils.decryptCredentials(encrypted, 'wrong-key-that-is-32-chars!!!!');
      }).toThrow();
    });
  });

  // =========================================================================
  // generateState / validateState
  // =========================================================================

  describe('generateState', () => {
    it('should generate a random state string', () => {
      const state1 = authUtils.generateState();
      const state2 = authUtils.generateState();

      expect(state1).toBeDefined();
      expect(state1.length).toBeGreaterThan(0);
      expect(state1).not.toBe(state2);
    });

    it('should generate hex string', () => {
      const state = authUtils.generateState();
      expect(state).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('validateState', () => {
    it('should return true for matching states', () => {
      const state = 'test-state-123';
      const isValid = authUtils.validateState(state, state);
      expect(isValid).toBe(true);
    });

    it('should return false for non-matching states', () => {
      const isValid = authUtils.validateState('state1', 'state2');
      expect(isValid).toBe(false);
    });
  });

  // =========================================================================
  // areCredentialsExpired
  // =========================================================================

  describe('areCredentialsExpired', () => {
    it('should return true for expired credentials (camelCase)', () => {
      const expired = authUtils.areCredentialsExpired({
        expiresAt: new Date(Date.now() - 1000),
      });
      expect(expired).toBe(true);
    });

    it('should return true for expired credentials (snake_case)', () => {
      const expired = authUtils.areCredentialsExpired({
        expires_at: new Date(Date.now() - 1000),
      });
      expect(expired).toBe(true);
    });

    it('should return false for valid credentials', () => {
      const expired = authUtils.areCredentialsExpired({
        expiresAt: new Date(Date.now() + 3600000),
      });
      expect(expired).toBe(false);
    });

    it('should return false for credentials without expiration', () => {
      const expired = authUtils.areCredentialsExpired({
        apiKey: 'test-key',
      });
      expect(expired).toBe(false);
    });

    it('should handle string date format', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const expired = authUtils.areCredentialsExpired({
        expiresAt: futureDate,
      });
      expect(expired).toBe(false);
    });
  });

  // =========================================================================
  // calculateExpirationTime
  // =========================================================================

  describe('calculateExpirationTime', () => {
    it('should calculate correct expiration time', () => {
      const now = Date.now();
      const expiresIn = 3600; // 1 hour

      const expiresAt = authUtils.calculateExpirationTime(expiresIn);

      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(now + expiresIn * 1000 - 100);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(now + expiresIn * 1000 + 100);
    });
  });

  // =========================================================================
  // sanitizeCredentialsForLogging
  // =========================================================================

  describe('sanitizeCredentialsForLogging', () => {
    it('should mask sensitive fields', () => {
      const credentials = {
        apiKey: 'sk-1234567890abcdef',
        accessToken: 'ya29.accesstoken12345',
        refreshToken: 'refresh12345token',
        clientSecret: 'client-secret-123',
        password: 'mysecretpassword',
        webhookSecret: 'whsec_123456789',
        username: 'testuser',
      };

      const sanitized = authUtils.sanitizeCredentialsForLogging(credentials);

      expect(sanitized.apiKey).toContain('***');
      expect(sanitized.accessToken).toContain('***');
      expect(sanitized.refreshToken).toContain('***');
      expect(sanitized.clientSecret).toContain('***');
      expect(sanitized.password).toContain('***');
      expect(sanitized.webhookSecret).toContain('***');
      expect(sanitized.username).toBe('testuser'); // Non-sensitive field unchanged
    });

    it('should not modify original credentials object', () => {
      const credentials = {
        apiKey: 'sk-1234567890abcdef',
      };

      authUtils.sanitizeCredentialsForLogging(credentials);

      expect(credentials.apiKey).toBe('sk-1234567890abcdef');
    });

    it('should handle short values', () => {
      const credentials = {
        apiKey: 'short',
      };

      const sanitized = authUtils.sanitizeCredentialsForLogging(credentials);

      expect(sanitized.apiKey).toBe('***');
    });
  });

  // =========================================================================
  // testAuthentication
  // =========================================================================

  describe('testAuthentication', () => {
    it('should validate credentials structure for API_KEY', async () => {
      const result = await authUtils.testAuthentication(AuthType.API_KEY, {
        apiKey: 'test-key',
      });

      expect(result.success).toBe(true);
    });

    it('should fail validation for missing API key', async () => {
      const result = await authUtils.testAuthentication(AuthType.API_KEY, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');
    });

    it('should validate credentials structure for BASIC_AUTH', async () => {
      const result = await authUtils.testAuthentication(AuthType.BASIC_AUTH, {
        username: 'user',
        password: 'pass',
      });

      expect(result.success).toBe(true);
    });

    it('should fail validation for missing password in BASIC_AUTH', async () => {
      const result = await authUtils.testAuthentication(AuthType.BASIC_AUTH, {
        username: 'user',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Username and password');
    });

    it('should validate credentials structure for OAUTH2', async () => {
      const result = await authUtils.testAuthentication(AuthType.OAUTH2, {
        accessToken: 'token',
      });

      expect(result.success).toBe(true);
    });

    it('should fail validation for missing access token in OAUTH2', async () => {
      const result = await authUtils.testAuthentication(AuthType.OAUTH2, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Access token');
    });

    it('should make test request when endpoint provided', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        status: 200,
        data: { success: true },
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse as AxiosResponse));

      const result = await authUtils.testAuthentication(
        AuthType.API_KEY,
        { apiKey: 'test-key' },
        'https://api.example.com/test',
      );

      expect(result.success).toBe(true);
      expect(httpService.get).toHaveBeenCalled();
    });

    it('should return error when test request fails', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        throwError(() => ({
          response: { data: { message: 'Unauthorized' } },
        })),
      );

      const result = await authUtils.testAuthentication(
        AuthType.API_KEY,
        { apiKey: 'invalid-key' },
        'https://api.example.com/test',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });
  });

  // =========================================================================
  // JWT functions
  // =========================================================================

  describe('generateJWT / verifyJWT', () => {
    const jwtSecret = 'test-jwt-secret-key';

    it('should generate and verify JWT correctly', () => {
      const payload = { userId: '123', role: 'admin' };

      const token = authUtils.generateJWT(payload, jwtSecret);
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);

      const decoded = authUtils.verifyJWT(token, jwtSecret);
      expect(decoded.userId).toBe('123');
      expect(decoded.role).toBe('admin');
    });

    it('should include expiration in JWT', () => {
      const payload = { userId: '123' };

      const token = authUtils.generateJWT(payload, jwtSecret, { expiresIn: '1h' });
      const decoded = authUtils.verifyJWT(token, jwtSecret);

      expect(decoded.exp).toBeDefined();
    });

    it('should throw error for invalid JWT', () => {
      expect(() => {
        authUtils.verifyJWT('invalid-token', jwtSecret);
      }).toThrow();
    });

    it('should throw error for JWT with wrong secret', () => {
      const payload = { userId: '123' };
      const token = authUtils.generateJWT(payload, jwtSecret);

      expect(() => {
        authUtils.verifyJWT(token, 'wrong-secret');
      }).toThrow();
    });
  });
});
