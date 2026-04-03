import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface LinkedInOAuthTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

export interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}

@Injectable()
export class LinkedInOAuthService {
  private readonly logger = new Logger(LinkedInOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // OAuth endpoints
  private readonly authorizationUrl = 'https://www.linkedin.com/oauth/v2/authorization';
  private readonly tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
  private readonly userInfoUrl = 'https://api.linkedin.com/v2/userinfo';

  // LinkedIn API scopes - matching n8n's approach
  // Modern API scopes (for apps created after 2023)
  private readonly modernScopes = [
    'openid',           // Required for OpenID Connect
    'profile',          // Get profile info (name, picture)
    'email',            // Get email address
    'w_member_social',  // Post content (requires "Share on LinkedIn" product)
  ];

  // Legacy API scopes (for apps created before 2023)
  private readonly legacyScopes = [
    'r_liteprofile',    // Get basic profile info (legacy)
    'r_emailaddress',   // Get email address (legacy)
    'w_member_social',  // Post content
  ];

  // Organization scope (requires Marketing Developer Platform access)
  private readonly organizationScope = 'w_organization_social';

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('LINKEDIN_OAUTH_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('LINKEDIN_OAUTH_CLIENT_SECRET');
    this.redirectUri = this.configService.get<string>('LINKEDIN_OAUTH_REDIRECT_URI');

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      this.logger.warn(
        'LinkedIn OAuth credentials not configured. One-click OAuth will not be available.',
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
   * Generate authorization URL for OAuth flow with dynamic scope selection
   * Matches n8n's implementation pattern
   */
  getAuthorizationUrl(
    state: string,
    options?: {
      legacy?: boolean;
      organizationSupport?: boolean;
      customScopes?: string[];
    }
  ): string {
    if (!this.isConfigured()) {
      throw new Error('LinkedIn OAuth is not configured');
    }

    let scopesToUse: string[];

    if (options?.customScopes) {
      // Use custom scopes if provided
      scopesToUse = options.customScopes;
    } else {
      // Dynamic scope selection based on legacy and organizationSupport flags
      const isLegacy = options?.legacy ?? false;
      const hasOrgSupport = options?.organizationSupport ?? false;

      if (isLegacy) {
        // Legacy mode: use legacy scopes
        scopesToUse = [...this.legacyScopes];
        if (hasOrgSupport) {
          scopesToUse.push(this.organizationScope);
        }
      } else {
        // Modern mode: use modern scopes
        scopesToUse = [...this.modernScopes];
        if (hasOrgSupport) {
          scopesToUse.push(this.organizationScope);
        }
      }
    }

    this.logger.log(`=== LinkedIn OAuth Scope Debug ===`);
    this.logger.log(`Legacy mode: ${options?.legacy ?? false}`);
    this.logger.log(`Organization support: ${options?.organizationSupport ?? false}`);
    this.logger.log(`Scopes being requested: ${scopesToUse.join(' ')}`);
    this.logger.log(`=================================`);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
      scope: scopesToUse.join(' '),
    });

    const authUrl = `${this.authorizationUrl}?${params.toString()}`;
    this.logger.log(`Authorization URL: ${authUrl}`);

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<LinkedInOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('LinkedIn OAuth is not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
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
  async refreshAccessToken(refreshToken: string): Promise<LinkedInOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('LinkedIn OAuth is not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
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
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Get user info from LinkedIn
   * Tries OpenID Connect first, falls back to legacy OAuth 2.0
   */
  async getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
    this.logger.log(`Attempting to get user info with token: ${accessToken.substring(0, 20)}...`);

    try {
      // Try OpenID Connect userinfo endpoint first
      this.logger.log('Trying OpenID Connect endpoint: /v2/userinfo');
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000, // 10 second timeout
        // Force IPv4 to avoid IPv6 timeout issues
        httpAgent: new (require('http').Agent)({ family: 4 }),
        httpsAgent: new (require('https').Agent)({ family: 4 })
      });

      this.logger.log('Successfully got user info from OpenID Connect');
      this.logger.log('User info:', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
      this.logger.warn(`OpenID Connect userinfo failed: ${errMsg}`);

      // Fallback to legacy /v2/me endpoint
      try {
        this.logger.log('Trying legacy endpoint: /v2/me');
        const legacyResponse = await axios.get('https://api.linkedin.com/v2/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 10000, // 10 second timeout
        });

        this.logger.log('Successfully got user info from legacy endpoint');
        this.logger.log('Legacy response:', JSON.stringify(legacyResponse.data));

        // Get email separately for legacy OAuth
        let email = null;
        try {
          const emailResponse = await axios.get(
            'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              timeout: 10000, // 10 second timeout
            }
          );
          email = emailResponse.data?.elements?.[0]?.['handle~']?.emailAddress;
          this.logger.log('Successfully got email from LinkedIn');
        } catch (emailError) {
          this.logger.warn('Could not fetch email:', emailError.response?.data || emailError.message);
        }

        // Transform legacy response to match OpenID Connect format
        const legacyData = legacyResponse.data;
        return {
          sub: legacyData.id,
          name: `${legacyData.localizedFirstName || ''} ${legacyData.localizedLastName || ''}`.trim(),
          given_name: legacyData.localizedFirstName,
          family_name: legacyData.localizedLastName,
          email: email,
          email_verified: !!email,
        };
      } catch (legacyError) {
        const legacyErrMsg = legacyError.response?.data?.error_description || legacyError.response?.data?.message || legacyError.message;
        this.logger.error(`Failed to get user info from legacy endpoint: ${legacyErrMsg}`);
        throw new UnauthorizedException('Failed to get user info from LinkedIn. Please check app permissions.');
      }
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
      legacy?: boolean;
      organizationSupport?: boolean;
    }
  ): string {
    const data = {
      userId,
      credentialId,
      connectorType,
      returnUrl: options?.returnUrl,
      legacy: options?.legacy ?? false,
      organizationSupport: options?.organizationSupport ?? false,
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
    legacy?: boolean;
    organizationSupport?: boolean;
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
