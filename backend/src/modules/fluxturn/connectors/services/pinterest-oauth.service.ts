import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface PinterestOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token: string;
  refresh_token_expires_in: number;
}

export interface PinterestUserInfo {
  account_type: string;
  profile_image: string;
  website_url: string;
  username: string;
}

@Injectable()
export class PinterestOAuthService {
  private readonly logger = new Logger(PinterestOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints
  private readonly authorizationUrl = 'https://www.pinterest.com/oauth/';
  private readonly tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
  private readonly userInfoUrl = 'https://api.pinterest.com/v5/user_account';

  // Pinterest OAuth scopes
  private readonly defaultScopes = [
    'boards:read',
    'boards:write',
    'pins:read',
    'pins:write',
    'user_accounts:read',
    'ads:read', // For analytics
  ];

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('PINTEREST_OAUTH_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('PINTEREST_OAUTH_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('PINTEREST_OAUTH_REDIRECT_URI');

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'Pinterest OAuth credentials not configured. One-click OAuth will not be available.',
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
    }
  ): string {
    if (!this.isConfigured()) {
      throw new Error('Pinterest OAuth is not configured');
    }

    const scopesToUse = options?.scopes || this.defaultScopes;

    this.logger.log(`Generating authorization URL with scopes: ${scopesToUse.join(',')}`);

    // Pinterest OAuth parameters
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopesToUse.join(','), // Pinterest uses comma-separated scopes
      state: state,
    });

    const authUrl = `${this.authorizationUrl}?${params.toString()}`;

    this.logger.log(`🔗 Generated Pinterest auth URL with redirect_uri: ${this.redirectUri}`);
    this.logger.log(`📋 Scopes: ${scopesToUse.join(',')}`);
    this.logger.log(`📋 State length: ${state.length} chars`);

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<PinterestOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Pinterest OAuth is not configured');
    }

    try {
      // Pinterest requires Basic Auth with client credentials
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      this.logger.log('🔄 Exchanging authorization code for Pinterest access token');
      this.logger.log(`📋 Client ID: ${this.clientId}`);
      this.logger.log(`📋 Redirect URI: ${this.redirectUri}`);
      this.logger.log(`📋 Code length: ${code?.length || 0} chars`);

      const requestData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
      });

      this.logger.log(`📤 Sending token request to: ${this.tokenUrl}`);

      const response = await axios.post(
        this.tokenUrl,
        requestData.toString(),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      this.logger.log('✅ Successfully exchanged authorization code for Pinterest tokens');
      this.logger.log(`📋 Token expires in: ${data.expires_in} seconds`);
      this.logger.log(`📋 Refresh token expires in: ${data.refresh_token_expires_in} seconds`);

      return data;
    } catch (error) {
      this.logger.error('❌ Failed to exchange code for tokens:', error.response?.data || error.message);
      if (error.response) {
        this.logger.error('📋 Response status:', error.response.status);
        this.logger.error('📋 Response headers:', error.response.headers);
        this.logger.error('📋 Response data:', JSON.stringify(error.response.data));
      }
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<PinterestOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Pinterest OAuth is not configured');
    }

    try {
      // Pinterest requires Basic Auth
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      this.logger.log('Refreshing Pinterest access token');

      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      this.logger.log('Successfully refreshed Pinterest access token');
      return data;
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Get user information using access token
   */
  async getUserInfo(accessToken: string): Promise<PinterestUserInfo> {
    this.logger.log(`Attempting to get Pinterest user info`);

    try {
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      this.logger.log('Successfully got user info from Pinterest');
      this.logger.log(`User info - username: ${response.data.username}`);

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get user info from Pinterest');
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
}
