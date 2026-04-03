import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface MicrosoftTeamsOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token: string;
  id_token?: string;
}

export interface MicrosoftTeamsUserInfo {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  officeLocation?: string;
}

@Injectable()
export class MicrosoftTeamsOAuthService {
  private readonly logger = new Logger(MicrosoftTeamsOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly tenantId: string;

  // OAuth endpoints (using common tenant for multi-tenant apps)
  private readonly authorizationUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  private readonly tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  private readonly userInfoUrl = 'https://graph.microsoft.com/v1.0/me';

  // Microsoft Teams OAuth scopes - comprehensive set for Teams automation
  private readonly defaultScopes = [
    'offline_access',           // Get refresh token
    'User.Read',               // Read user profile
    'Channel.ReadBasic.All',   // Read basic channel info
    'ChannelMessage.Read.All', // Read channel messages
    'ChannelMessage.Send',     // Send channel messages
    'Chat.Read',               // Read chats
    'Chat.ReadWrite',          // Read and write chats
    'ChatMessage.Read',        // Read chat messages
    'ChatMessage.Send',        // Send chat messages
    'Group.Read.All',          // Read groups/teams
    'Group.ReadWrite.All',     // Read and write groups/teams
    'Team.ReadBasic.All',      // Read basic team info
    'TeamMember.Read.All',     // Read team members
  ];

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('MICROSOFT_TEAMS_OAUTH_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('MICROSOFT_TEAMS_OAUTH_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('MICROSOFT_TEAMS_OAUTH_REDIRECT_URI');
    this.tenantId = this.configService.get<string>('MICROSOFT_TEAMS_TENANT_ID') || 'common';

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'Microsoft Teams OAuth credentials not configured. One-click OAuth will not be available.',
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
      tenantId?: string;
    }
  ): string {
    if (!this.isConfigured()) {
      throw new Error('Microsoft Teams OAuth is not configured');
    }

    const scopesToUse = options?.scopes || this.defaultScopes;
    const tenant = options?.tenantId || this.tenantId;

    this.logger.log(`Generating authorization URL with scopes: ${scopesToUse.join(' ')}`);

    // Microsoft OAuth uses space-separated scopes
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopesToUse.join(' '),
      state: state,
      response_mode: 'query',
    });

    // Use tenant-specific or common endpoint
    const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;

    this.logger.log(`🔗 Generated Microsoft Teams auth URL with redirect_uri: ${this.redirectUri}`);
    this.logger.log(`📋 Tenant: ${tenant}`);
    this.logger.log(`📋 Scopes: ${scopesToUse.join(' ')}`);
    this.logger.log(`📋 State length: ${state.length} chars`);

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, tenantId?: string): Promise<MicrosoftTeamsOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Microsoft Teams OAuth is not configured');
    }

    try {
      const tenant = tenantId || this.tenantId;

      console.log('🔄 Exchanging authorization code for Microsoft Teams access token');
      console.log(`📋 Client ID: ${this.clientId}`);
      console.log(`📋 Client Secret length: ${this.clientSecret?.length || 0} chars`);
      console.log(`📋 Client Secret first 5 chars: ${this.clientSecret?.substring(0, 5)}`);
      this.logger.log(`📋 Tenant: ${tenant}`);
      this.logger.log(`📋 Redirect URI: ${this.redirectUri}`);
      this.logger.log(`📋 Code length: ${code?.length || 0} chars`);

      const requestData = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      });

      const tokenEndpoint = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
      this.logger.log(`📤 Sending token request to: ${tokenEndpoint}`);

      const response = await axios.post(
        tokenEndpoint,
        requestData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      this.logger.log('✅ Successfully exchanged authorization code for Microsoft Teams tokens');
      this.logger.log(`📋 Token expires in: ${data.expires_in} seconds`);
      this.logger.log(`📋 Scopes granted: ${data.scope}`);

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
  async refreshAccessToken(refreshToken: string, tenantId?: string): Promise<MicrosoftTeamsOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Microsoft Teams OAuth is not configured');
    }

    try {
      const tenant = tenantId || this.tenantId;
      this.logger.log('Refreshing Microsoft Teams access token');

      const response = await axios.post(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      this.logger.log('Successfully refreshed Microsoft Teams access token');
      return data;
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Get user information using access token (Microsoft Graph API)
   */
  async getUserInfo(accessToken: string): Promise<MicrosoftTeamsUserInfo> {
    this.logger.log(`Attempting to get Microsoft Teams user info`);

    try {
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      this.logger.log('Successfully got user info from Microsoft Graph');
      this.logger.log(`User info - name: ${response.data.displayName}, email: ${response.data.mail || response.data.userPrincipalName}`);

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get user info from Microsoft Graph');
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
      tenantId?: string;
    }
  ): string {
    const data = {
      userId,
      credentialId,
      connectorType,
      returnUrl: options?.returnUrl,
      tenantId: options?.tenantId,
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
    tenantId?: string;
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
