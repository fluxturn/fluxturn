import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface TwitterOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface TwitterUserInfo {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
  verified?: boolean;
  created_at?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

@Injectable()
export class TwitterOAuthService {
  private readonly logger = new Logger(TwitterOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints
  private readonly authorizationUrl = 'https://twitter.com/i/oauth2/authorize';
  private readonly tokenUrl = 'https://api.twitter.com/2/oauth2/token';
  private readonly userInfoUrl = 'https://api.twitter.com/2/users/me';

  // Twitter OAuth scopes - comprehensive set
  private readonly defaultScopes = [
    'tweet.read',
    'tweet.write',
    'tweet.moderate.write',
    'users.read',
    'follows.read',
    'follows.write',
    'like.read',
    'like.write',
    'media.write', // Required for media/image uploads
    'offline.access', // Required for refresh token
  ];

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('TWITTER_OAUTH_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('TWITTER_OAUTH_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('TWITTER_OAUTH_REDIRECT_URI');

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'Twitter OAuth credentials not configured. One-click OAuth will not be available.',
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
    codeChallenge: string,
    options?: {
      scopes?: string[];
    }
  ): string {
    if (!this.isConfigured()) {
      throw new Error('Twitter OAuth is not configured');
    }

    const scopesToUse = options?.scopes || this.defaultScopes;

    this.logger.log(`Generating authorization URL with scopes: ${scopesToUse.join(' ')}`);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopesToUse.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `${this.authorizationUrl}?${params.toString()}`;
    this.logger.log(`Authorization URL generated`);

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<TwitterOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Twitter OAuth is not configured');
    }

    try {
      // Twitter requires Basic Auth
      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
          code_verifier: codeVerifier,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authString}`,
          },
        },
      );

      this.logger.log('Successfully exchanged authorization code for tokens');
      this.logger.log(`Token response - expires_in: ${response.data.expires_in}, scope: ${response.data.scope}`);

      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
      this.logger.error(`Failed to exchange code for tokens: ${errMsg}`);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TwitterOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Twitter OAuth is not configured');
    }

    try {
      // Twitter requires Basic Auth
      const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authString}`,
          },
        },
      );

      this.logger.log('Successfully refreshed access token');
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
      // Use warn instead of error for known permanent failures (token revoked/invalid)
      const isPermanent = errMsg?.toLowerCase().includes('invalid') || errMsg?.toLowerCase().includes('revoked');
      if (isPermanent) {
        this.logger.warn(`Token refresh failed (permanent): ${errMsg}`);
      } else {
        this.logger.error(`Failed to refresh access token: ${errMsg}`);
      }
      throw new UnauthorizedException(errMsg || 'Failed to refresh access token');
    }
  }

  /**
   * Get user info from Twitter
   */
  async getUserInfo(accessToken: string): Promise<TwitterUserInfo> {
    this.logger.log(`Attempting to get user info`);

    try {
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          'user.fields': 'id,name,username,profile_image_url,description,verified,created_at,public_metrics',
        },
      });

      this.logger.log('Successfully got user info from Twitter');
      this.logger.log('User info:', JSON.stringify(response.data.data));
      return response.data.data;
    } catch (error) {
      const errMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
      this.logger.error(`Failed to get user info: ${errMsg}`);
      throw new UnauthorizedException('Failed to get user info from Twitter');
    }
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState(
    userId: string,
    credentialId: string,
    connectorType: string,
    codeVerifier: string,
    options?: {
      returnUrl?: string;
    }
  ): string {
    const data = {
      userId,
      credentialId,
      connectorType,
      returnUrl: options?.returnUrl,
      codeVerifier, // Include PKCE code verifier
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
    codeVerifier: string;
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
   * Generate PKCE code verifier
   */
  generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }
}
