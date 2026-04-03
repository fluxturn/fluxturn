import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

/**
 * HubSpot OAuth Token Response
 */
export interface HubSpotOAuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * HubSpot User Info Response
 */
export interface HubSpotUserInfo {
  user: string;
  user_id: string;
  hub_domain: string;
  hub_id: number;
}

/**
 * HubSpot OAuth Service
 *
 * Implements centralized OAuth flow for HubSpot CRM integration.
 * Handles authorization, token exchange, refresh, and user info retrieval.
 *
 * Setup Instructions:
 * 1. Create app at: https://developers.hubspot.com/
 * 2. Navigate to "Apps" → Create app
 * 3. Set redirect URI to: {BACKEND_URL}/api/v1/oauth/hubspot/callback
 * 4. Add required scopes
 * 5. Copy Client ID and Client Secret to .env
 */
@Injectable()
export class HubSpotOAuthService {
  private readonly logger = new Logger(HubSpotOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints
  private readonly authorizationUrl = 'https://app.hubspot.com/oauth/authorize';
  private readonly tokenUrl = 'https://api.hubapi.com/oauth/v1/token';
  private readonly userInfoUrl = 'https://api.hubapi.com/oauth/v1/access-tokens';

  // Required scopes for HubSpot CRM operations
  private readonly defaultScopes = [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.companies.read',
    'crm.objects.companies.write',
    'crm.objects.deals.read',
    'crm.objects.deals.write',
    'crm.schemas.contacts.read',
    'crm.schemas.companies.read',
    'crm.schemas.deals.read',
    'crm.lists.read',
    'crm.lists.write',
    'tickets',
  ];

  constructor(private configService: ConfigService) {
    // Load OAuth credentials from environment variables
    this.clientId = this.configService.get<string>('HUBSPOT_OAUTH_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('HUBSPOT_OAUTH_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('HUBSPOT_OAUTH_REDIRECT_URI');

    // Warn if credentials are not configured
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'HubSpot OAuth credentials not configured. One-click OAuth will not be available. ' +
        'Please set HUBSPOT_OAUTH_CLIENT_ID, HUBSPOT_OAUTH_CLIENT_SECRET, and HUBSPOT_OAUTH_REDIRECT_URI in .env'
      );
    } else {
      this.logger.log('HubSpot OAuth service initialized successfully');
    }
  }

  /**
   * Check if OAuth is properly configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  /**
   * Generate authorization URL for OAuth flow
   *
   * @param state - CSRF protection state parameter
   * @param options - Optional configuration (scopes, optional scopes)
   * @returns Authorization URL to redirect user to
   */
  getAuthorizationUrl(
    state: string,
    options?: {
      scopes?: string[];
      optionalScopes?: string[];
    }
  ): string {
    if (!this.isConfigured()) {
      throw new Error('HubSpot OAuth is not configured');
    }

    const scopesToUse = options?.scopes || this.defaultScopes;

    this.logger.log(`Generating HubSpot authorization URL with scopes: ${scopesToUse.join(' ')}`);

    // Build authorization URL with required parameters
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopesToUse.join(' '), // Space-separated scopes
      state: state,
    });

    // Add optional scopes if provided
    if (options?.optionalScopes && options.optionalScopes.length > 0) {
      params.append('optional_scope', options.optionalScopes.join(' '));
    }

    const authUrl = `${this.authorizationUrl}?${params.toString()}`;

    this.logger.log(`Generated auth URL with redirect_uri: ${this.redirectUri}`);

    return authUrl;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   *
   * @param code - Authorization code from OAuth callback
   * @returns Access token, refresh token, and expiration info
   */
  async exchangeCodeForTokens(code: string): Promise<HubSpotOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('HubSpot OAuth is not configured');
    }

    try {
      this.logger.log('Exchanging authorization code for access token');

      // HubSpot requires form-urlencoded data
      const requestData = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code: code,
      });

      const response = await axios.post(
        this.tokenUrl,
        requestData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (data.error) {
        this.logger.error(`Token exchange error: ${data.error}`);
        throw new Error(data.error_description || data.error);
      }

      this.logger.log('Successfully exchanged authorization code for tokens');
      this.logger.log(`Token expires in: ${data.expires_in} seconds`);

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type || 'bearer',
        expires_in: data.expires_in,
      };
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);

      if (error.response?.data) {
        this.logger.error('Error details:', JSON.stringify(error.response.data));
      }

      throw new UnauthorizedException(
        `Failed to exchange authorization code: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @param refreshToken - Refresh token from previous OAuth flow
   * @returns New access token and expiration info
   */
  async refreshAccessToken(refreshToken: string): Promise<HubSpotOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('HubSpot OAuth is not configured');
    }

    try {
      this.logger.log('Refreshing HubSpot access token');

      const requestData = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      });

      const response = await axios.post(
        this.tokenUrl,
        requestData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (data.error) {
        this.logger.error(`Token refresh error: ${data.error}`);
        throw new Error(data.error_description || data.error);
      }

      this.logger.log('Successfully refreshed access token');

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken, // HubSpot may return new refresh token
        token_type: data.token_type || 'bearer',
        expires_in: data.expires_in,
      };
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new UnauthorizedException(
        `Failed to refresh access token: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Get user and account information using access token
   *
   * @param accessToken - Access token from OAuth flow
   * @returns User and hub information
   */
  async getUserInfo(accessToken: string): Promise<HubSpotUserInfo> {
    this.logger.log('Fetching HubSpot user info');

    try {
      // Get token info which includes hub_id and user info
      const response = await axios.get(`${this.userInfoUrl}/${accessToken}`);

      const data = response.data;

      this.logger.log('Successfully retrieved user info');
      this.logger.log(`Hub ID: ${data.hub_id}, User: ${data.user}`);

      return {
        user: data.user,
        user_id: data.user_id || data.user,
        hub_domain: data.hub_domain,
        hub_id: data.hub_id,
      };
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new UnauthorizedException(
        `Failed to get user info: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Generate state parameter for CSRF protection
   * Encodes user ID, credential ID, and connector type with timestamp
   *
   * @param userId - User ID
   * @param credentialId - Credential configuration ID
   * @param connectorType - Connector type (hubspot)
   * @param options - Optional return URL
   * @returns Base64url encoded state parameter
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

    // Encode as base64url for safe transport
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  /**
   * Decode and validate state parameter
   * Ensures state hasn't expired (10 minute limit)
   *
   * @param state - Encoded state parameter from OAuth callback
   * @returns Decoded state data
   * @throws UnauthorizedException if state is invalid or expired
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
      const maxAge = 10 * 60 * 1000; // 10 minutes in milliseconds
      const age = Date.now() - data.timestamp;

      if (age > maxAge) {
        this.logger.warn(`State parameter expired (age: ${Math.floor(age / 1000)}s)`);
        throw new Error('State parameter expired. Please try again.');
      }

      this.logger.log(`State validated successfully (age: ${Math.floor(age / 1000)}s)`);

      return data;
    } catch (error) {
      this.logger.error('Failed to decode state:', error.message);
      throw new UnauthorizedException('Invalid state parameter');
    }
  }

  /**
   * Encrypt sensitive token for storage
   * Uses AES-256-CBC encryption with random IV
   *
   * @param token - Token to encrypt
   * @returns Encrypted token in format: iv:encrypted
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
   *
   * @param encryptedToken - Encrypted token in format: iv:encrypted
   * @returns Decrypted token
   */
  decryptToken(encryptedToken: string): string {
    const encryptionKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');

    if (!encryptionKey) {
      return encryptedToken;
    }

    try {
      const [ivHex, encrypted] = encryptedToken.split(':');

      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted token format');
      }

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
   * Validate HubSpot access token
   * Checks if token is valid and not expired
   *
   * @param accessToken - Access token to validate
   * @returns True if token is valid
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      await this.getUserInfo(accessToken);
      return true;
    } catch (error) {
      this.logger.warn('Access token validation failed:', error.message);
      return false;
    }
  }
}
