import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

/**
 * Xero OAuth Token Response
 */
export interface XeroOAuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Xero Tenant/Connection Info
 * Returned from GET https://api.xero.com/connections
 */
export interface XeroConnection {
  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
  createdDateUtc: string;
  updatedDateUtc: string;
}

/**
 * User-provided Xero OAuth credentials
 */
export interface XeroUserCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Xero OAuth Service
 *
 * Implements OAuth flow for Xero accounting integration using USER-PROVIDED credentials.
 * Each user provides their own Xero app Client ID and Client Secret.
 *
 * IMPORTANT: Xero requires fetching the Tenant ID AFTER OAuth authentication
 * via the Connections API (GET https://api.xero.com/connections).
 * The Tenant ID is NOT available in the Xero Developer Portal.
 *
 * Flow:
 * 1. User provides Client ID and Client Secret from their Xero Developer app
 * 2. User clicks "Connect with OAuth" which redirects to Xero
 * 3. After authorization, callback fetches Tenant ID from Connections API
 * 4. Tenant ID is stored in metadata for API calls
 */
@Injectable()
export class XeroOAuthService {
  private readonly logger = new Logger(XeroOAuthService.name);
  private readonly redirectUri: string;

  // OAuth endpoints
  private readonly authorizationUrl = 'https://login.xero.com/identity/connect/authorize';
  private readonly tokenUrl = 'https://identity.xero.com/connect/token';
  private readonly connectionsUrl = 'https://api.xero.com/connections';

  // Required scopes for Xero operations
  private readonly defaultScopes = [
    'openid',
    'profile',
    'email',
    'accounting.transactions',
    'accounting.contacts',
    'accounting.settings',
    'offline_access', // Required for refresh tokens
  ];

  constructor(private configService: ConfigService) {
    // Only the redirect URI comes from env - it's the same for all users
    this.redirectUri = this.configService.get<string>('XERO_OAUTH_REDIRECT_URI');

    if (!this.redirectUri) {
      this.logger.warn(
        'XERO_OAUTH_REDIRECT_URI not configured. Please set it in .env to enable Xero OAuth.'
      );
    } else {
      this.logger.log('Xero OAuth service initialized successfully');
    }
  }

  /**
   * Check if redirect URI is configured (required for OAuth)
   */
  isConfigured(): boolean {
    return !!this.redirectUri;
  }

  /**
   * Generate authorization URL for OAuth flow using user-provided credentials
   *
   * @param clientId - User's Xero app Client ID
   * @param state - CSRF protection state parameter
   * @param options - Optional configuration (scopes)
   * @returns Authorization URL to redirect user to
   */
  getAuthorizationUrl(
    clientId: string,
    state: string,
    options?: {
      scopes?: string[];
    }
  ): string {
    if (!this.redirectUri) {
      throw new Error('Xero OAuth redirect URI is not configured');
    }

    if (!clientId) {
      throw new Error('Client ID is required');
    }

    const scopesToUse = options?.scopes || this.defaultScopes;

    this.logger.log(`Generating Xero authorization URL with scopes: ${scopesToUse.join(' ')}`);

    // Build authorization URL with required parameters
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.redirectUri,
      scope: scopesToUse.join(' '),
      response_type: 'code',
      state: state,
    });

    const authUrl = `${this.authorizationUrl}?${params.toString()}`;

    this.logger.log(`Generated auth URL with redirect_uri: ${this.redirectUri}`);

    return authUrl;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * Uses user-provided credentials
   *
   * @param code - Authorization code from OAuth callback
   * @param credentials - User's Xero app credentials (clientId, clientSecret)
   * @returns Access token, refresh token, and expiration info
   */
  async exchangeCodeForTokens(
    code: string,
    credentials: XeroUserCredentials
  ): Promise<XeroOAuthTokens> {
    if (!this.redirectUri) {
      throw new Error('Xero OAuth redirect URI is not configured');
    }

    const { clientId, clientSecret } = credentials;

    if (!clientId || !clientSecret) {
      throw new Error('Client ID and Client Secret are required');
    }

    try {
      this.logger.log('Exchanging authorization code for access token');

      // Xero requires Basic auth header with client credentials
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const requestData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
      });

      const response = await axios.post(
        this.tokenUrl,
        requestData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
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
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in,
        scope: data.scope,
      };
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);

      if (error.response?.data) {
        this.logger.error('Error details:', JSON.stringify(error.response.data));
      }

      throw new UnauthorizedException(
        `Failed to exchange authorization code: ${error.response?.data?.error_description || error.message}`
      );
    }
  }

  /**
   * Refresh access token using refresh token
   * Uses user-provided credentials
   *
   * @param refreshToken - Refresh token from previous OAuth flow
   * @param credentials - User's Xero app credentials (clientId, clientSecret)
   * @returns New access token and expiration info
   */
  async refreshAccessToken(
    refreshToken: string,
    credentials: XeroUserCredentials
  ): Promise<XeroOAuthTokens> {
    const { clientId, clientSecret } = credentials;

    if (!clientId || !clientSecret) {
      throw new Error('Client ID and Client Secret are required for token refresh');
    }

    try {
      this.logger.log('Refreshing Xero access token');

      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const requestData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      const response = await axios.post(
        this.tokenUrl,
        requestData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
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
        refresh_token: data.refresh_token || refreshToken,
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in,
        scope: data.scope,
      };
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new UnauthorizedException(
        `Failed to refresh access token: ${error.response?.data?.error_description || error.message}`
      );
    }
  }

  /**
   * Get connected tenants/organizations using access token
   * This is the KEY method for Xero - the Tenant ID is obtained here, not from the portal!
   *
   * @param accessToken - Access token from OAuth flow
   * @returns Array of connected Xero organizations (tenants)
   */
  async getConnections(accessToken: string): Promise<XeroConnection[]> {
    this.logger.log('Fetching Xero connections (tenants)');

    try {
      const response = await axios.get(this.connectionsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const connections: XeroConnection[] = response.data;

      this.logger.log(`Successfully retrieved ${connections.length} Xero connection(s)`);

      if (connections.length > 0) {
        this.logger.log(`First tenant: ${connections[0].tenantName} (ID: ${connections[0].tenantId})`);
      }

      return connections;
    } catch (error) {
      this.logger.error('Failed to get connections:', error.response?.data || error.message);
      throw new UnauthorizedException(
        `Failed to get Xero connections: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Generate state parameter for CSRF protection
   * Encodes user ID, credential ID, and connector type with timestamp
   *
   * @param userId - User ID
   * @param credentialId - Credential configuration ID
   * @param connectorType - Connector type (xero)
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
   * Validate Xero access token by checking connections
   *
   * @param accessToken - Access token to validate
   * @returns True if token is valid
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      await this.getConnections(accessToken);
      return true;
    } catch (error) {
      this.logger.warn('Access token validation failed:', error.message);
      return false;
    }
  }
}
