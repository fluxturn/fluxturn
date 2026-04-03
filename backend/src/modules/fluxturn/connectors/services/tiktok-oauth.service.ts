import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface TikTokOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  scope: string;
  open_id: string;
}

export interface TikTokUserInfo {
  open_id: string;
  union_id?: string;
  avatar_url?: string;
  avatar_url_100?: string;
  avatar_large_url?: string;
  display_name: string;
  bio_description?: string;
  profile_deep_link?: string;
  is_verified?: boolean;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

@Injectable()
export class TikTokOAuthService {
  private readonly logger = new Logger(TikTokOAuthService.name);
  private readonly clientKey: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints
  private readonly authorizationUrl = 'https://www.tiktok.com/v2/auth/authorize/';
  private readonly tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
  private readonly userInfoUrl = 'https://open.tiktokapis.com/v2/user/info/';

  // TikTok OAuth scopes
  private readonly defaultScopes = [
    'user.info.basic',
    'user.info.profile',
    'user.info.stats',
    'video.publish',
    'video.list',
  ];

  constructor(private configService: ConfigService) {
    this.clientKey = this.configService.get<string>('TIKTOK_CLIENT_KEY');
    this.clientSecret = this.configService.get<string>('TIKTOK_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('TIKTOK_REDIRECT_URI');

    if (!this.clientKey || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'TikTok OAuth credentials not configured. One-click OAuth will not be available.',
      );
    }
  }

  /**
   * Check if OAuth is configured
   */
  isConfigured(): boolean {
    return !!(this.clientKey && this.clientSecret && this.redirectUri);
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
      throw new Error('TikTok OAuth is not configured');
    }

    const scopesToUse = options?.scopes || this.defaultScopes;

    this.logger.log(`Generating authorization URL with scopes: ${scopesToUse.join(',')}`);

    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: 'code',
      scope: scopesToUse.join(','),
      redirect_uri: this.redirectUri,
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
  ): Promise<TikTokOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('TikTok OAuth is not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
          code_verifier: codeVerifier,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      // TikTok returns tokens in response.data directly or in response.data.data
      const tokenData = response.data.data || response.data;

      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      this.logger.log('Successfully exchanged authorization code for tokens');
      this.logger.log(`Token response - expires_in: ${tokenData.expires_in}, scope: ${tokenData.scope}`);

      return tokenData;
    } catch (error) {
      const errMsg = error.response?.data?.error_description ||
                     error.response?.data?.error ||
                     error.response?.data?.data?.error_description ||
                     error.message;
      this.logger.error(`Failed to exchange code for tokens: ${errMsg}`);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TikTokOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('TikTok OAuth is not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const tokenData = response.data.data || response.data;

      if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      }

      this.logger.log('Successfully refreshed access token');
      return tokenData;
    } catch (error) {
      const errMsg = error.response?.data?.error_description ||
                     error.response?.data?.error ||
                     error.response?.data?.data?.error_description ||
                     error.message;

      // Use warn instead of error for known permanent failures (token revoked/invalid)
      const isPermanent = errMsg?.toLowerCase().includes('invalid') ||
                          errMsg?.toLowerCase().includes('revoked') ||
                          errMsg?.toLowerCase().includes('expired');
      if (isPermanent) {
        this.logger.warn(`Token refresh failed (permanent): ${errMsg}`);
      } else {
        this.logger.error(`Failed to refresh access token: ${errMsg}`);
      }
      throw new UnauthorizedException(errMsg || 'Failed to refresh access token');
    }
  }

  /**
   * Get user info from TikTok
   */
  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    this.logger.log(`Attempting to get user info`);

    try {
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          fields: 'open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count',
        },
      });

      const userData = response.data.data?.user || response.data.data || response.data;

      if (response.data.error?.code && response.data.error.code !== 'ok') {
        throw new Error(response.data.error.message || 'Failed to get user info');
      }

      this.logger.log('Successfully got user info from TikTok');
      this.logger.log('User info:', JSON.stringify(userData));
      return userData;
    } catch (error) {
      const errMsg = error.response?.data?.error?.message ||
                     error.response?.data?.error_description ||
                     error.message;
      this.logger.error(`Failed to get user info: ${errMsg}`);
      throw new UnauthorizedException('Failed to get user info from TikTok');
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
