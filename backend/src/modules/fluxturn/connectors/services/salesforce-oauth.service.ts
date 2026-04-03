import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface SalesforceOAuthTokens {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

export interface SalesforceUserInfo {
  id: string;
  asserted_user: boolean;
  user_id: string;
  organization_id: string;
  username: string;
  nick_name: string;
  display_name: string;
  email: string;
  email_verified: boolean;
  first_name?: string;
  last_name?: string;
  timezone: string;
  photos?: {
    picture: string;
    thumbnail: string;
  };
  urls?: {
    enterprise: string;
    metadata: string;
    partner: string;
    rest: string;
    sobjects: string;
    search: string;
    query: string;
    recent: string;
    profile: string;
    feeds: string;
    groups: string;
    users: string;
    custom_domain?: string;
  };
  active: boolean;
  user_type: string;
  language: string;
  locale: string;
}

@Injectable()
export class SalesforceOAuthService {
  private readonly logger = new Logger(SalesforceOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints (production)
  private readonly authorizationUrl = 'https://login.salesforce.com/services/oauth2/authorize';
  private readonly tokenUrl = 'https://login.salesforce.com/services/oauth2/token';
  private readonly revokeUrl = 'https://login.salesforce.com/services/oauth2/revoke';

  // Sandbox endpoints
  private readonly sandboxAuthorizationUrl = 'https://test.salesforce.com/services/oauth2/authorize';
  private readonly sandboxTokenUrl = 'https://test.salesforce.com/services/oauth2/token';
  private readonly sandboxRevokeUrl = 'https://test.salesforce.com/services/oauth2/revoke';

  // Salesforce API scopes
  private readonly scopes = [
    'api',           // Access REST API resources
    'refresh_token', // Get refresh token
    'full',          // Full access
    'chatter_api',   // Access Chatter API
  ];

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('SALESFORCE_OAUTH_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('SALESFORCE_OAUTH_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('SALESFORCE_OAUTH_REDIRECT_URI');

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'Salesforce OAuth credentials not configured. One-click OAuth will not be available.',
      );
    }
  }

  /**
   * Check if OAuth is configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthorizationUrl(state: string, isSandbox: boolean = false): string {
    if (!this.isConfigured()) {
      throw new Error('Salesforce OAuth is not configured');
    }

    const baseUrl = isSandbox ? this.sandboxAuthorizationUrl : this.authorizationUrl;

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      prompt: 'consent', // Force consent screen to get refresh token
      state: state, // CSRF protection + metadata
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, isSandbox: boolean = false): Promise<SalesforceOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Salesforce OAuth is not configured');
    }

    const tokenEndpoint = isSandbox ? this.sandboxTokenUrl : this.tokenUrl;

    try {
      const response = await axios.post(
        tokenEndpoint,
        new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: 'authorization_code',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.logger.log('Successfully exchanged authorization code for tokens');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string, isSandbox: boolean = false): Promise<SalesforceOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Salesforce OAuth is not configured');
    }

    const tokenEndpoint = isSandbox ? this.sandboxTokenUrl : this.tokenUrl;

    try {
      const response = await axios.post(
        tokenEndpoint,
        new URLSearchParams({
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.logger.log('Successfully refreshed access token');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Revoke OAuth token
   */
  async revokeToken(token: string, isSandbox: boolean = false): Promise<void> {
    const revokeEndpoint = isSandbox ? this.sandboxRevokeUrl : this.revokeUrl;

    try {
      await axios.post(
        revokeEndpoint,
        new URLSearchParams({
          token,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.logger.log('Successfully revoked token');
    } catch (error) {
      this.logger.error('Failed to revoke token:', error.response?.data || error.message);
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Get user info from Salesforce
   */
  async getUserInfo(accessToken: string, instanceUrl: string, identityUrl: string): Promise<SalesforceUserInfo> {
    try {
      const response = await axios.get(identityUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get user info');
    }
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState(
    userId: string,
    credentialId: string,
    connectorType: string,
    isSandbox: boolean = false,
    returnUrl?: string,
  ): string {
    const data = {
      userId,
      credentialId,
      connectorType,
      isSandbox,
      returnUrl,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    // Encode as base64
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  /**
   * Decode and validate state parameter
   */
  decodeState(state: string): {
    userId: string;
    credentialId: string;
    connectorType: string;
    isSandbox: boolean;
    returnUrl?: string;
    timestamp: number;
  } {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const data = JSON.parse(decoded);

      // Validate timestamp (max 10 minutes old)
      const maxAge = 10 * 60 * 1000; // 10 minutes
      if (Date.now() - data.timestamp > maxAge) {
        throw new Error('State parameter expired');
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to decode state:', error.message);
      throw new UnauthorizedException('Invalid state parameter');
    }
  }

  /**
   * Encrypt tokens before storing in database
   */
  encryptToken(token: string): string {
    const encryptionKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
    if (!encryptionKey) {
      this.logger.warn('CONNECTOR_ENCRYPTION_KEY not set, tokens will not be encrypted');
      return token;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey, 'hex'),
      iv,
    );

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt tokens when retrieving from database
   */
  decryptToken(encryptedToken: string): string {
    const encryptionKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
    if (!encryptionKey) {
      return encryptedToken;
    }

    try {
      const [ivHex, encrypted] = encryptedToken.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey, 'hex'),
        iv,
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt token:', error.message);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Validate Salesforce instance URL
   */
  validateInstanceUrl(instanceUrl: string): boolean {
    // Salesforce instance URLs follow patterns like:
    // https://na1.salesforce.com
    // https://cs1.salesforce.com
    // https://ap1.salesforce.com
    // https://my-domain.my.salesforce.com
    // https://my-domain--sandbox.sandbox.my.salesforce.com
    const validPatterns = [
      /^https:\/\/[a-z0-9-]+\.salesforce\.com$/i,
      /^https:\/\/[a-z0-9-]+\.my\.salesforce\.com$/i,
      /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.sandbox\.my\.salesforce\.com$/i,
    ];

    return validPatterns.some(pattern => pattern.test(instanceUrl));
  }
}
