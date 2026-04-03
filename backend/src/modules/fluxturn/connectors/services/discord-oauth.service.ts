import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface DiscordOAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface DiscordUserInfo {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
  verified?: boolean;
  locale?: string;
  mfa_enabled?: boolean;
  premium_type?: number;
  public_flags?: number;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string;
  owner: boolean;
  permissions: string;
  features: string[];
}

@Injectable()
export class DiscordOAuthService {
  private readonly logger = new Logger(DiscordOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints
  private readonly authorizationUrl = 'https://discord.com/api/oauth2/authorize';
  private readonly tokenUrl = 'https://discord.com/api/oauth2/token';
  private readonly userInfoUrl = 'https://discord.com/api/users/@me';
  private readonly guildsUrl = 'https://discord.com/api/users/@me/guilds';

  // Discord OAuth scopes
  private readonly defaultScopes = [
    'identify',          // Get basic user info
    'email',            // Get user email
    'guilds',           // Get user's guilds
    'guilds.join',      // Join guilds on behalf of user
    'connections',      // Get user's connections
    'bot',              // Add bot to guilds
    'messages.read',    // Read messages
  ];

  // Bot permissions (for when bot scope is included)
  private readonly botPermissions = '8'; // Administrator permission

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('DISCORD_OAUTH_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('DISCORD_OAUTH_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('DISCORD_OAUTH_REDIRECT_URI');

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'Discord OAuth credentials not configured. One-click OAuth will not be available.',
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
      guildId?: string;
      permissions?: string;
    }
  ): string {
    if (!this.isConfigured()) {
      throw new Error('Discord OAuth is not configured');
    }

    const scopesToUse = options?.scopes || this.defaultScopes;

    this.logger.log(`Generating authorization URL with scopes: ${scopesToUse.join(' ')}`);

    const params: any = {
      response_type: 'code',
      client_id: this.clientId,
      scope: scopesToUse.join(' '),
      state: state,
      redirect_uri: this.redirectUri,
      prompt: 'consent',
    };

    // Add bot permissions if bot scope is included
    if (scopesToUse.includes('bot')) {
      params.permissions = options?.permissions || this.botPermissions;
    }

    // Add guild_id if provided (for adding bot to specific guild)
    if (options?.guildId) {
      params.guild_id = options.guildId;
    }

    const urlParams = new URLSearchParams(params);
    const authUrl = `${this.authorizationUrl}?${urlParams.toString()}`;

    this.logger.log(`Authorization URL generated`);

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
  ): Promise<DiscordOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Discord OAuth is not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
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
  async refreshAccessToken(refreshToken: string): Promise<DiscordOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Discord OAuth is not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          client_id: this.clientId,
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

      this.logger.log('Successfully refreshed access token');
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
      this.logger.error(`Failed to refresh access token: ${errMsg}`);
      throw new UnauthorizedException(errMsg || 'Failed to refresh access token');
    }
  }

  /**
   * Get user info from Discord
   */
  async getUserInfo(accessToken: string): Promise<DiscordUserInfo> {
    this.logger.log(`Attempting to get user info`);

    try {
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      this.logger.log('Successfully got user info from Discord');
      this.logger.log(`User info - username: ${response.data.username}#${response.data.discriminator}, id: ${response.data.id}`);

      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
      this.logger.error(`Failed to get user info: ${errMsg}`);
      throw new UnauthorizedException('Failed to get user info from Discord');
    }
  }

  /**
   * Get user's guilds (servers)
   */
  async getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
    this.logger.log(`Attempting to get user guilds`);

    try {
      const response = await axios.get(this.guildsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      this.logger.log(`Successfully got ${response.data.length} guilds from Discord`);
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
      this.logger.error(`Failed to get user guilds: ${errMsg}`);
      throw new UnauthorizedException('Failed to get user guilds from Discord');
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

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Discord OAuth is not configured');
    }

    try {
      await axios.post(
        'https://discord.com/api/oauth2/token/revoke',
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          token: accessToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.logger.log('Successfully revoked access token');
    } catch (error) {
      const errMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
      this.logger.error(`Failed to revoke access token: ${errMsg}`);
      throw new UnauthorizedException('Failed to revoke access token');
    }
  }
}
