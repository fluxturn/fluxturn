import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface ClickUpOAuthTokens {
  access_token: string;
  token_type: string;
}

@Injectable()
export class ClickUpOAuthService {
  private readonly logger = new Logger(ClickUpOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints
  private readonly authorizationUrl = 'https://app.clickup.com/api';
  private readonly tokenUrl = 'https://api.clickup.com/api/v2/oauth/token';

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('CLICKUP_OAUTH_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('CLICKUP_OAUTH_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('CLICKUP_OAUTH_REDIRECT_URI');

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'ClickUp OAuth credentials not configured. One-click OAuth will not be available.',
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
  getAuthorizationUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new Error('ClickUp OAuth is not configured');
    }

    // Build OAuth params - ClickUp OAuth style
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state, // CSRF protection + metadata
    });

    const authUrl = `${this.authorizationUrl}?${params.toString()}`;

    this.logger.log(`🔗 Generated ClickUp auth URL with redirect_uri: ${this.redirectUri}`);
    this.logger.log(`📋 State length: ${state.length} chars`);
    this.logger.log(`📋 Full auth URL: ${authUrl}`);

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<ClickUpOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('ClickUp OAuth is not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log('Successfully exchanged authorization code for ClickUp tokens');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState(
    userId: string,
    credentialId: string,
    connectorType: string,
    returnUrl?: string,
  ): string {
    const data = {
      userId,
      credentialId,
      connectorType,
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
