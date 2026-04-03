import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface FacebookOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface FacebookUserInfo {
  id: string;
  name?: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

@Injectable()
export class FacebookOAuthService {
  private readonly logger = new Logger(FacebookOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints
  private readonly authorizationUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
  private readonly tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
  private readonly userInfoUrl = 'https://graph.facebook.com/v18.0/me';

  // Facebook API scopes
  // https://developers.facebook.com/docs/permissions/reference
  private readonly defaultScopes = [
    'public_profile',           // Basic profile information
    'email',                    // Email address
    'pages_show_list',          // List of pages user manages
    'pages_read_engagement',    // Read page engagement metrics
    'pages_manage_posts',       // Create, edit, and delete page posts
    'pages_read_user_content',  // Read user-generated content on pages
    'pages_manage_engagement',  // Respond to comments and messages
  ];

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('FACEBOOK_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('FACEBOOK_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('FACEBOOK_REDIRECT_URI');

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'Facebook OAuth credentials not configured. One-click OAuth will not be available.',
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
      customScopes?: string[];
    }
  ): string {
    if (!this.isConfigured()) {
      throw new Error('Facebook OAuth is not configured');
    }

    const scopesToUse = options?.customScopes || this.defaultScopes;

    this.logger.log(`Generating authorization URL with scopes: ${scopesToUse.join(',')}`);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
      scope: scopesToUse.join(','),
      response_type: 'code',
    });

    const authUrl = `${this.authorizationUrl}?${params.toString()}`;
    this.logger.log(`Authorization URL generated`);

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<FacebookOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Facebook OAuth is not configured');
    }

    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code: code,
      });

      const response = await axios.get(`${this.tokenUrl}?${params.toString()}`);

      this.logger.log('Successfully exchanged authorization code for tokens');
      this.logger.log(`Token response - expires_in: ${response.data.expires_in}`);

      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message;
      this.logger.error(`Failed to exchange code for tokens: ${errMsg}`);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  /**
   * Exchange short-lived token for long-lived token
   * Facebook short-lived tokens expire in ~1 hour, long-lived tokens last 60 days
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<FacebookOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Facebook OAuth is not configured');
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        fb_exchange_token: shortLivedToken,
      });

      const response = await axios.get(`${this.tokenUrl}?${params.toString()}`);

      this.logger.log('Successfully exchanged for long-lived token');
      this.logger.log(`Long-lived token expires in: ${response.data.expires_in} seconds (~${Math.floor(response.data.expires_in / 86400)} days)`);

      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message;
      this.logger.error(`Failed to exchange for long-lived token: ${errMsg}`);
      throw new UnauthorizedException('Failed to exchange for long-lived token');
    }
  }

  /**
   * Refresh access token
   * Note: Facebook doesn't use refresh tokens like OAuth 2.0 standard
   * Instead, you need to re-exchange the long-lived token before it expires
   */
  async refreshAccessToken(currentToken: string): Promise<FacebookOAuthTokens> {
    // For Facebook, "refreshing" means exchanging the current token for a new long-lived token
    return this.exchangeForLongLivedToken(currentToken);
  }

  /**
   * Get user info from Facebook
   */
  async getUserInfo(accessToken: string): Promise<FacebookUserInfo> {
    this.logger.log(`Attempting to get user info with token`);

    try {
      const params = new URLSearchParams({
        fields: 'id,name,email,picture',
        access_token: accessToken,
      });

      const response = await axios.get(`${this.userInfoUrl}?${params.toString()}`);

      this.logger.log('Successfully got user info from Facebook');
      this.logger.log('User info:', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message;
      this.logger.error(`Failed to get user info from Facebook: ${errMsg}`);
      throw new UnauthorizedException('Failed to get user info from Facebook');
    }
  }

  /**
   * Get user's Facebook pages
   */
  async getUserPages(accessToken: string): Promise<any[]> {
    this.logger.log('Fetching user pages');

    try {
      const params = new URLSearchParams({
        fields: 'id,name,access_token,category,tasks',
        access_token: accessToken,
      });

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/me/accounts?${params.toString()}`
      );

      this.logger.log(`Successfully fetched ${response.data.data?.length || 0} pages`);
      return response.data.data || [];
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.response?.data?.error || error.message;
      this.logger.error(`Failed to get user pages: ${errMsg}`);
      throw new UnauthorizedException('Failed to get user pages from Facebook');
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
}
