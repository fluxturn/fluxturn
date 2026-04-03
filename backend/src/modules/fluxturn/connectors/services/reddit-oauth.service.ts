import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface RedditOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token: string;
}

export interface RedditUserInfo {
  id: string;
  name: string;
  icon_img?: string;
  created?: number;
  created_utc?: number;
  comment_karma?: number;
  link_karma?: number;
  is_gold?: boolean;
  is_mod?: boolean;
  has_verified_email?: boolean;
}

@Injectable()
export class RedditOAuthService {
  private readonly logger = new Logger(RedditOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints
  private readonly authorizationUrl = 'https://www.reddit.com/api/v1/authorize';
  private readonly tokenUrl = 'https://www.reddit.com/api/v1/access_token';
  private readonly userInfoUrl = 'https://oauth.reddit.com/api/v1/me';
  private readonly revokeUrl = 'https://www.reddit.com/api/v1/revoke_token';

  // Reddit OAuth scopes - comprehensive set for automation platform
  private readonly defaultScopes = [
    'identity',      // Access to user identity
    'edit',          // Edit and delete posts and comments
    'history',       // Access to voting history
    'mysubreddits',  // Access to subscribed subreddits
    'read',          // Read posts and comments
    'save',          // Save and unsave posts
    'submit',        // Submit links and text posts
    'vote',          // Vote on posts and comments
    'account',       // Access account information
  ];

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('REDDIT_OAUTH_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('REDDIT_OAUTH_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('REDDIT_OAUTH_REDIRECT_URI');

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'Reddit OAuth credentials not configured. One-click OAuth will not be available.',
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
  getAuthorizationUrl(
    state: string,
    options?: {
      scopes?: string[];
      duration?: 'temporary' | 'permanent';
    }
  ): string {
    if (!this.isConfigured()) {
      throw new Error('Reddit OAuth is not configured');
    }

    const scopesToUse = options?.scopes || this.defaultScopes;
    const duration = options?.duration || 'permanent'; // 'permanent' gives refresh token

    this.logger.log(`Generating authorization URL with scopes: ${scopesToUse.join(' ')}`);

    // Reddit OAuth requires:
    // - duration: permanent (to get refresh token)
    // - response_type: code
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      state: state,
      redirect_uri: this.redirectUri,
      duration: duration, // 'permanent' for refresh token, 'temporary' for one-hour access
      scope: scopesToUse.join(' '), // Reddit uses space-separated scopes
    });

    const authUrl = `${this.authorizationUrl}?${params.toString()}`;
    this.logger.log(`Authorization URL generated with duration: ${duration}`);

    this.logger.log(`🔗 Generated Reddit auth URL with redirect_uri: ${this.redirectUri}`);
    this.logger.log(`📋 Scopes: ${scopesToUse.join(' ')}`);
    this.logger.log(`📋 State length: ${state.length} chars`);
    this.logger.log(`📋 Full auth URL: ${authUrl}`);

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<RedditOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Reddit OAuth is not configured');
    }

    try {
      // Reddit requires Basic Auth with client credentials
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      this.logger.log('🔄 Exchanging authorization code for Reddit access token');
      this.logger.log(`📋 Client ID: ${this.clientId}`);
      this.logger.log(`📋 Redirect URI: ${this.redirectUri}`);
      this.logger.log(`📋 Code length: ${code?.length || 0} chars`);

      const requestData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
      });

      this.logger.log(`📤 Sending token request to: ${this.tokenUrl}`);
      this.logger.log(`📤 Request body: ${requestData.toString()}`);

      const response = await axios.post(
        this.tokenUrl,
        requestData,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Fluxturn/1.0', // Reddit requires User-Agent
          },
        }
      );

      const data = response.data;

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      this.logger.log('✅ Successfully exchanged authorization code for Reddit tokens');
      return data;
    } catch (error) {
      this.logger.error('❌ Failed to exchange code for tokens:', error.response?.data || error.message);
      if (error.response) {
        this.logger.error('📋 Response status:', error.response.status);
        this.logger.error('📋 Response headers:', error.response.headers);
      }
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<RedditOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Reddit OAuth is not configured');
    }

    try {
      // Reddit requires Basic Auth with client_id:client_secret
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      this.logger.log('Refreshing Reddit access token');

      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Fluxturn/1.0',
          },
        }
      );

      const data = response.data;

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      // Reddit doesn't always return a new refresh token, so preserve the old one
      if (!data.refresh_token) {
        data.refresh_token = refreshToken;
      }

      this.logger.log('Successfully refreshed Reddit access token');
      return data;
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Get user information using access token
   */
  async getUserInfo(accessToken: string): Promise<RedditUserInfo> {
    this.logger.log(`Attempting to get user info`);

    try {
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Fluxturn/1.0',
        },
      });

      this.logger.log('Successfully got user info from Reddit');
      this.logger.log(`User info - username: ${response.data.name}, id: ${response.data.id}`);

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get user info from Reddit');
    }
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState(
    userId: string,
    credentialId: string,
    connectorType: string,
    options?: {
      returnUrl?: string;
    }
  ): string {
    const data = {
      userId,
      credentialId,
      connectorType,
      returnUrl: options?.returnUrl,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    // Encode as base64url
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  /**
   * Decode and validate state parameter
   */
  decodeState(state: string): {
    userId: string;
    credentialId: string;
    connectorType: string;
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
   * Encrypt token for storage
   */
  encryptToken(token: string): string {
    const encryptionKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
    if (!encryptionKey) {
      this.logger.warn('CONNECTOR_ENCRYPTION_KEY not set, tokens will not be encrypted');
      return token;
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey, 'hex'),
        iv,
      );

      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Failed to encrypt token:', error.message);
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypt token from storage
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
   * Revoke access token or refresh token
   */
  async revokeToken(token: string, tokenTypeHint?: 'access_token' | 'refresh_token'): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Reddit OAuth is not configured');
    }

    try {
      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const params: any = {
        token,
      };

      if (tokenTypeHint) {
        params.token_type_hint = tokenTypeHint;
      }

      await axios.post(
        this.revokeUrl,
        new URLSearchParams(params),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authString}`,
            'User-Agent': 'Fluxturn/1.0 by fluxturn',
          },
        },
      );

      this.logger.log('Successfully revoked token');
    } catch (error) {
      this.logger.error('Failed to revoke token:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to revoke token');
    }
  }
}
