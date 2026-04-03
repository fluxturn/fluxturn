import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface InstagramOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface InstagramUserInfo {
  id: string;
  username: string;
  account_type: string;
  media_count?: number;
}

export interface FacebookPageInfo {
  id: string;
  name: string;
  instagram_business_account?: {
    id: string;
  };
}

@Injectable()
export class InstagramOAuthService {
  private readonly logger = new Logger(InstagramOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints (using Facebook OAuth for Instagram)
  private readonly authorizationUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
  private readonly tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
  private readonly graphApiUrl = 'https://graph.facebook.com/v18.0';

  // Instagram-specific permissions
  private readonly defaultScopes = [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
  ];

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('INSTAGRAM_OAUTH_CLIENT_ID') ||
                    this.configService.get<string>('FACEBOOK_APP_ID');
    this.clientSecret = this.configService.get<string>('INSTAGRAM_OAUTH_CLIENT_SECRET') ||
                        this.configService.get<string>('FACEBOOK_APP_SECRET');
    this.redirectUri = this.configService.get<string>('INSTAGRAM_OAUTH_REDIRECT_URI');

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'Instagram OAuth credentials not configured. Set INSTAGRAM_OAUTH_CLIENT_ID, ' +
        'INSTAGRAM_OAUTH_CLIENT_SECRET, and INSTAGRAM_OAUTH_REDIRECT_URI in .env',
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
      throw new Error('Instagram OAuth is not configured');
    }

    const scopesToUse = options?.scopes || this.defaultScopes;

    this.logger.log(`Generating Instagram authorization URL with scopes: ${scopesToUse.join(',')}`);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopesToUse.join(','),
      response_type: 'code',
      state: state,
    });

    const authUrl = `${this.authorizationUrl}?${params.toString()}`;
    this.logger.log(`Instagram OAuth URL: ${authUrl}`);

    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string): Promise<InstagramOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Instagram OAuth is not configured');
    }

    this.logger.log('Exchanging authorization code for access token');

    try {
      const response = await axios.get(this.tokenUrl, {
        params: {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          code: code,
        },
      });

      this.logger.log('Successfully exchanged code for access token');

      return {
        access_token: response.data.access_token,
        token_type: response.data.token_type || 'bearer',
        expires_in: response.data.expires_in,
      };
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to obtain access token from Instagram');
    }
  }

  /**
   * Get long-lived access token (60 days)
   */
  async getLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
    if (!this.isConfigured()) {
      throw new Error('Instagram OAuth is not configured');
    }

    this.logger.log('Converting short-lived token to long-lived token');

    try {
      const response = await axios.get(`${this.graphApiUrl}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          fb_exchange_token: shortLivedToken,
        },
      });

      this.logger.log('Successfully obtained long-lived token');

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in || 5184000, // 60 days default
      };
    } catch (error) {
      this.logger.error('Failed to get long-lived token:', error.response?.data || error.message);
      // Return the short-lived token if conversion fails
      return {
        access_token: shortLivedToken,
        expires_in: 3600, // 1 hour
      };
    }
  }

  /**
   * Get Facebook Pages and Instagram Business Accounts
   */
  async getInstagramAccounts(accessToken: string): Promise<FacebookPageInfo[]> {
    this.logger.log('Fetching Facebook Pages with Instagram accounts');

    try {
      const response = await axios.get(`${this.graphApiUrl}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,instagram_business_account',
        },
      });

      const pages = response.data.data || [];
      this.logger.log(`Found ${pages.length} Facebook Page(s)`);

      return pages;
    } catch (error) {
      this.logger.error('Failed to fetch Instagram accounts:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to fetch Instagram accounts');
    }
  }

  /**
   * Get Instagram account info
   */
  async getInstagramAccountInfo(instagramAccountId: string, accessToken: string): Promise<InstagramUserInfo> {
    this.logger.log(`Fetching Instagram account info for ${instagramAccountId}`);

    try {
      const response = await axios.get(`${this.graphApiUrl}/${instagramAccountId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,username,account_type,media_count',
        },
      });

      this.logger.log(`Instagram account: @${response.data.username}`);

      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch Instagram account info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to fetch Instagram account information');
    }
  }

  /**
   * Generate state parameter with CSRF protection
   */
  generateState(
    userId: string,
    credentialId: string,
    connectorType: string,
    metadata?: Record<string, any>
  ): string {
    const stateData = {
      userId,
      credentialId,
      connectorType,
      timestamp: Date.now(),
      ...metadata,
    };

    const stateJson = JSON.stringify(stateData);
    const state = Buffer.from(stateJson).toString('base64url');

    this.logger.log(`Generated state for user ${userId}, credential ${credentialId}`);
    this.logger.log(`State length: ${state.length}, first 50 chars: ${state.substring(0, 50)}...`);
    this.logger.log(`Original JSON: ${stateJson}`);

    return state;
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
    this.logger.log(`Attempting to decode state parameter (length: ${state.length})`);
    this.logger.log(`Raw state (first 50 chars): ${state.substring(0, 50)}...`);

    // Try to decode the state parameter
    // Facebook might URL-encode it, so we try both versions
    const statesToTry = [
      state,                        // Original state
      decodeURIComponent(state)     // URL-decoded state
    ];

    let lastError: any = null;

    for (let i = 0; i < statesToTry.length; i++) {
      const stateToTry = statesToTry[i];
      try {
        this.logger.log(`Attempt ${i + 1}: Trying to decode state (length: ${stateToTry.length})`);

        // Decode from base64url
        const stateJson = Buffer.from(stateToTry, 'base64url').toString('utf-8');
        this.logger.log(`Decoded JSON: ${stateJson.substring(0, 100)}...`);

        const stateData = JSON.parse(stateJson);

        // Validate timestamp (state should not be older than 10 minutes)
        const maxAge = 10 * 60 * 1000; // 10 minutes
        if (Date.now() - stateData.timestamp > maxAge) {
          throw new Error('State has expired');
        }

        this.logger.log(`Successfully decoded state for user ${stateData.userId}`);
        return stateData;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Attempt ${i + 1} failed: ${error.message}`);
        // Continue to next attempt
        continue;
      }
    }

    // If all attempts failed, throw error
    this.logger.error(`Failed to decode state parameter after all attempts. Last error: ${lastError?.message}`);
    throw new UnauthorizedException('Invalid or expired state parameter');
  }

  /**
   * Encrypt token for storage
   */
  encryptToken(token: string): string {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') ||
                          'default-encryption-key-change-in-production';
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    });
  }

  /**
   * Decrypt token from storage
   */
  decryptToken(encryptedData: string): string {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') ||
                          'default-encryption-key-change-in-production';
    const algorithm = 'aes-256-gcm';

    try {
      const data = JSON.parse(encryptedData);
      const key = crypto.scryptSync(encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv(
        algorithm,
        key,
        Buffer.from(data.iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt token:', error.message);
      throw new Error('Failed to decrypt token');
    }
  }
}
