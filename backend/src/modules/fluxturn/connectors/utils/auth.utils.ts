import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import {
  ConnectorCredentials,
  AuthType,
  OAuthTokens,
  ConnectorError
} from '../types';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope?: string;
  redirectUri?: string;
  state?: string;
}

export interface BasicAuthConfig {
  username: string;
  password: string;
}

export interface ApiKeyConfig {
  apiKey: string;
  headerName?: string;
  queryParamName?: string;
  prefix?: string;
}

export interface BearerTokenConfig {
  token: string;
  refreshToken?: string;
  expiresAt?: Date;
}

@Injectable()
export class AuthUtils {
  private readonly logger = new Logger(AuthUtils.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Generate OAuth authorization URL
   */
  generateOAuthUrl(config: OAuthConfig): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.redirectUri || '',
      scope: config.scope || '',
      state: config.state || this.generateState()
    });

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange OAuth authorization code for tokens
   */
  async exchangeOAuthCode(
    config: OAuthConfig,
    authorizationCode: string
  ): Promise<OAuthTokens> {
    try {
      const tokenPayload = {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: authorizationCode,
        redirect_uri: config.redirectUri
      };

      const response = await firstValueFrom(
        this.httpService.post(config.tokenUrl, tokenPayload, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );

      return this.parseTokenResponse(response.data);
    } catch (error) {
      this.logger.error('OAuth token exchange failed:', error);
      throw this.createAuthError('OAUTH_TOKEN_EXCHANGE_FAILED', error.message);
    }
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshOAuthTokens(
    config: OAuthConfig,
    refreshToken: string
  ): Promise<OAuthTokens> {
    try {
      const tokenPayload = {
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken
      };

      const response = await firstValueFrom(
        this.httpService.post(config.tokenUrl, tokenPayload, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );

      return this.parseTokenResponse(response.data);
    } catch (error) {
      this.logger.error('OAuth token refresh failed:', error);
      throw this.createAuthError('OAUTH_TOKEN_REFRESH_FAILED', error.message);
    }
  }

  /**
   * Validate OAuth tokens
   */
  async validateOAuthTokens(tokens: OAuthTokens): Promise<boolean> {
    try {
      // Check if tokens are expired
      if (tokens.expiresAt && tokens.expiresAt <= new Date()) {
        return false;
      }

      // Additional validation can be added here (e.g., introspection endpoint)
      return true;
    } catch (error) {
      this.logger.error('OAuth token validation failed:', error);
      return false;
    }
  }

  /**
   * Create authorization headers
   */
  createAuthHeaders(
    authType: AuthType,
    credentials: ConnectorCredentials
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (authType) {
      case AuthType.API_KEY:
        return this.createApiKeyHeaders(credentials);
      
      case AuthType.BEARER_TOKEN:
        // Support both camelCase and snake_case for backward compatibility
        const bearerToken = credentials.accessToken || credentials['access_token'];
        if (bearerToken) {
          headers['Authorization'] = `Bearer ${bearerToken}`;
        }
        break;
      
      case AuthType.BASIC_AUTH:
        if (credentials.username && credentials.password) {
          const encoded = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
          headers['Authorization'] = `Basic ${encoded}`;
        }
        break;
      
      case AuthType.OAUTH2:
        // Support both camelCase and snake_case for backward compatibility
        const oauthToken = credentials.accessToken || credentials['access_token'];
        if (oauthToken) {
          headers['Authorization'] = `Bearer ${oauthToken}`;
        }
        break;
      
      default:
        // Custom auth handled by specific connectors
        break;
    }

    return headers;
  }

  /**
   * Create API key headers
   */
  private createApiKeyHeaders(credentials: ConnectorCredentials): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (credentials.apiKey) {
      const headerName = credentials.headerName || 'X-API-Key';
      const prefix = credentials.prefix || '';
      headers[headerName] = prefix ? `${prefix} ${credentials.apiKey}` : credentials.apiKey;
    }

    return headers;
  }

  /**
   * Create API key query parameters
   */
  createApiKeyQueryParams(credentials: ConnectorCredentials): Record<string, string> {
    const params: Record<string, string> = {};
    
    if (credentials.apiKey && credentials.queryParamName) {
      params[credentials.queryParamName] = credentials.apiKey;
    }

    return params;
  }

  /**
   * Encrypt sensitive credentials
   */
  encryptCredentials(
    credentials: ConnectorCredentials,
    secretKey: string
  ): string {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(12);
      const key = crypto.scryptSync(secretKey, 'salt', 32);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      const credentialsString = JSON.stringify(credentials);
      let encrypted = cipher.update(credentialsString, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return JSON.stringify({
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      });
    } catch (error) {
      this.logger.error('Credential encryption failed:', error);
      throw this.createAuthError('CREDENTIAL_ENCRYPTION_FAILED', error.message);
    }
  }

  /**
   * Decrypt sensitive credentials
   */
  decryptCredentials(
    encryptedData: string,
    secretKey: string
  ): ConnectorCredentials {
    try {
      const { encrypted, iv, authTag } = JSON.parse(encryptedData);
      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(secretKey, 'salt', 32);
      
      const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Credential decryption failed:', error);
      throw this.createAuthError('CREDENTIAL_DECRYPTION_FAILED', error.message);
    }
  }

  /**
   * Generate secure state parameter for OAuth
   */
  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate required credentials from request
   */
  async validateCredentials(
    request: Request,
    requiredFields: string[],
    errorMessage?: string
  ): Promise<any> {
    const credentials = request.body?.credentials || {};
    
    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw this.createAuthError(
          'MISSING_CREDENTIAL',
          errorMessage || `Missing required credential: ${field}`
        );
      }
    }
    
    return credentials;
  }

  /**
   * Validate OAuth state parameter
   */
  validateState(state: string, expectedState: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(state),
      Buffer.from(expectedState)
    );
  }

  /**
   * Generate JWT token for custom authentication
   */
  generateJWT(
    payload: any,
    secret: string,
    options?: jwt.SignOptions
  ): string {
    try {
      return jwt.sign(payload, secret, {
        expiresIn: '1h',
        ...options
      });
    } catch (error) {
      this.logger.error('JWT generation failed:', error);
      throw this.createAuthError('JWT_GENERATION_FAILED', error.message);
    }
  }

  /**
   * Verify JWT token
   */
  verifyJWT(
    token: string,
    secret: string,
    options?: jwt.VerifyOptions
  ): any {
    try {
      return jwt.verify(token, secret, options);
    } catch (error) {
      this.logger.error('JWT verification failed:', error);
      throw this.createAuthError('JWT_VERIFICATION_FAILED', error.message);
    }
  }

  /**
   * Check if credentials are expired
   */
  areCredentialsExpired(credentials: ConnectorCredentials): boolean {
    // Support both camelCase and snake_case for backward compatibility
    const expiresAt = credentials.expiresAt || credentials['expires_at'];
    if (expiresAt) {
      return new Date(expiresAt) <= new Date();
    }
    return false;
  }

  /**
   * Calculate token expiration time
   */
  calculateExpirationTime(expiresIn: number): Date {
    return new Date(Date.now() + (expiresIn * 1000));
  }

  /**
   * Sanitize credentials for logging
   */
  sanitizeCredentialsForLogging(credentials: ConnectorCredentials): any {
    const sanitized = { ...credentials };
    
    // Remove or mask sensitive fields
    const sensitiveFields = ['apiKey', 'accessToken', 'refreshToken', 'clientSecret', 'password', 'webhookSecret'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = this.maskSensitiveValue(sanitized[field]);
      }
    }
    
    return sanitized;
  }

  /**
   * Mask sensitive values for logging
   */
  private maskSensitiveValue(value: string): string {
    if (!value || value.length < 8) {
      return '***';
    }
    return `${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
  }

  /**
   * Parse token response from OAuth provider
   */
  private parseTokenResponse(data: any): OAuthTokens {
    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'bearer',
      scope: data.scope
    };

    if (data.expires_in) {
      tokens.expiresAt = this.calculateExpirationTime(data.expires_in);
    }

    return tokens;
  }

  /**
   * Create authentication error
   */
  private createAuthError(code: string, message: string): ConnectorError {
    return {
      code,
      message,
      retryable: false
    };
  }

  /**
   * Test authentication with provided credentials
   */
  async testAuthentication(
    authType: AuthType,
    credentials: ConnectorCredentials,
    testEndpoint?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!testEndpoint) {
        // Basic validation only
        return this.validateCredentialsStructure(authType, credentials);
      }

      // Make test request to validate credentials
      const headers = this.createAuthHeaders(authType, credentials);
      const queryParams = authType === AuthType.API_KEY 
        ? this.createApiKeyQueryParams(credentials)
        : {};

      const response = await firstValueFrom(
        this.httpService.get(testEndpoint, {
          headers,
          params: queryParams,
          timeout: 10000
        })
      );

      return { success: response.status >= 200 && response.status < 300 };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Validate credentials structure
   */
  private validateCredentialsStructure(
    authType: AuthType,
    credentials: ConnectorCredentials
  ): { success: boolean; error?: string } {
    switch (authType) {
      case AuthType.API_KEY:
        if (!credentials.apiKey) {
          return { success: false, error: 'API key is required' };
        }
        break;
      
      case AuthType.BASIC_AUTH:
        if (!credentials.username || !credentials.password) {
          return { success: false, error: 'Username and password are required' };
        }
        break;
      
      case AuthType.BEARER_TOKEN:
      case AuthType.OAUTH2:
        if (!credentials.accessToken) {
          return { success: false, error: 'Access token is required' };
        }
        break;
      
      default:
        return { success: true };
    }

    return { success: true };
  }
}