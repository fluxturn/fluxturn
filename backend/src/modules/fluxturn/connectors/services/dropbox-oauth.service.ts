import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface DropboxOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  uid: string;
  account_id: string;
}

export interface DropboxUserInfo {
  account_id: string;
  name: {
    given_name: string;
    surname: string;
    familiar_name: string;
    display_name: string;
    abbreviated_name: string;
  };
  email: string;
  email_verified: boolean;
  profile_photo_url?: string;
  country?: string;
  locale?: string;
}

@Injectable()
export class DropboxOAuthService {
  private readonly logger = new Logger(DropboxOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints
  private readonly authorizationUrl = 'https://www.dropbox.com/oauth2/authorize';
  private readonly tokenUrl = 'https://api.dropboxapi.com/oauth2/token';
  private readonly userInfoUrl = 'https://api.dropboxapi.com/2/users/get_current_account';
  private readonly revokeUrl = 'https://api.dropboxapi.com/2/auth/token/revoke';

  // Dropbox scopes for file access
  private readonly defaultScopes = [
    'files.metadata.read',
    'files.metadata.write',
    'files.content.read',
    'files.content.write',
    'sharing.read',
    'sharing.write',
    'account_info.read',
  ];

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('DROPBOX_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('DROPBOX_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('DROPBOX_REDIRECT_URI');

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'Dropbox OAuth credentials not configured. One-click OAuth will not be available.',
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
  getAuthorizationUrl(state: string, scopes?: string[]): string {
    if (!this.isConfigured()) {
      throw new Error('Dropbox OAuth is not configured');
    }

    const scopeList = scopes || this.defaultScopes;

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      token_access_type: 'offline', // Get refresh token
      state: state, // CSRF protection + metadata
    });

    // Dropbox uses space-separated scopes in query param
    if (scopeList.length > 0) {
      params.set('scope', scopeList.join(' '));
    }

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<DropboxOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Dropbox OAuth is not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
        },
      );

      this.logger.log('Successfully exchanged authorization code for Dropbox tokens');
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
  async refreshAccessToken(refreshToken: string): Promise<DropboxOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Dropbox OAuth is not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
        },
      );

      this.logger.log('Successfully refreshed Dropbox access token');
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
      this.logger.error(`Failed to refresh access token: ${errMsg}`);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Get user info from Dropbox
   */
  async getUserInfo(accessToken: string): Promise<DropboxUserInfo> {
    try {
      const response = await axios.post(
        this.userInfoUrl,
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error_summary || error.response?.data?.error || error.message;
      this.logger.error(`Failed to get user info: ${errMsg}`);
      throw new UnauthorizedException('Failed to get user info');
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      await axios.post(
        this.revokeUrl,
        null,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      this.logger.log('Successfully revoked Dropbox access token');
    } catch (error) {
      const errMsg = error.response?.data?.error_summary || error.message;
      this.logger.error(`Failed to revoke token: ${errMsg}`);
      throw new Error('Failed to revoke token');
    }
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState(
    userId: string,
    credentialId: string,
    returnUrl?: string,
  ): string {
    const data = {
      userId,
      credentialId,
      connectorType: 'dropbox',
      returnUrl,
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
   * Check if token needs refresh (expires within 5 minutes)
   */
  isTokenExpiringSoon(expiresAt: Date | string | number): boolean {
    const expirationTime = new Date(expiresAt).getTime();
    const fiveMinutesInMs = 5 * 60 * 1000;
    return Date.now() >= expirationTime - fiveMinutesInMs;
  }

  /**
   * Get default scopes
   */
  getDefaultScopes(): string[] {
    return [...this.defaultScopes];
  }
}
