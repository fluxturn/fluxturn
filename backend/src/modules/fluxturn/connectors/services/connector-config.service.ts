import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlatformService } from '../../../database/platform.service';

export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: string | null;
  scope: string;
  email?: string;
  connectorType: string;
  metadata?: any;
  // LinkedIn-specific configuration flags
  legacy?: boolean;
  organization_support?: boolean;
  // Shopify-specific fields
  shop?: string;
  shopDomain?: string;
  shopName?: string;
  shopOwner?: string;
  // TikTok-specific fields
  openId?: string;
  // Instagram-specific fields
  instagram_account_id?: string;
}

@Injectable()
export class ConnectorConfigService {
  private readonly logger = new Logger(ConnectorConfigService.name);

  constructor(private readonly platformService: PlatformService) {}

  /**
   * Find connector config by ID
   */
  async findById(credentialId: string): Promise<any> {
    const result = await this.platformService.query(
      'SELECT * FROM connector_configs WHERE id = $1',
      [credentialId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Credential ${credentialId} not found`);
    }

    return result.rows[0];
  }

  /**
   * Update OAuth credentials for a connector config
   */
  async updateOAuthCredentials(
    credentialId: string,
    oauthData: OAuthCredentials,
  ): Promise<void> {
    const { accessToken, refreshToken, expiresAt, scope, email, connectorType, metadata, legacy, organization_support, shop, shopDomain, shopName, shopOwner } = oauthData;

    // Fetch existing credentials to preserve configuration flags
    const existingCredential = await this.findById(credentialId);
    const existingCreds = existingCredential.credentials || {};

    // Parse existing credentials if they're a JSON string
    let parsedExistingCreds = existingCreds;
    if (typeof existingCreds === 'string') {
      try {
        parsedExistingCreds = JSON.parse(existingCreds);
      } catch {
        parsedExistingCreds = {};
      }
    }

    // Store encrypted tokens and metadata in credentials JSONB field
    // Merge with existing credentials to preserve configuration flags
    const credentials = {
      // Preserve existing configuration flags
      ...parsedExistingCreds,
      // OAuth tokens (these will overwrite any existing OAuth tokens)
      accessToken,
      refreshToken: refreshToken || null,
      // Store scope for debugging
      ...(scope && { scope }),
      // Explicitly set LinkedIn config flags from OAuth callback (overrides existing if provided)
      ...(legacy !== undefined && { legacy }),
      ...(organization_support !== undefined && { organization_support }),
      ...(metadata && { metadata }), // Include metadata if provided
      // Add Shopify-specific fields
      ...(shop && { shopSubdomain: shop }), // Map 'shop' to 'shopSubdomain' for ShopifyConnector
      ...(shopDomain && { shopDomain }),
      ...(shopName && { shopName }),
      ...(shopOwner && { shopOwner }),
    };

    this.logger.log(`Updating OAuth credentials for ${credentialId}:`, {
      hasOrgSupport: credentials.organization_support,
      legacy: credentials.legacy,
      scope,
    });

    // Update the connector config
    await this.platformService.query(
      `UPDATE connector_configs
       SET
         credentials = $1,
         oauth_email = $2,
         oauth_expires_at = $3,
         oauth_scope = $4,
         is_oauth = true,
         connector_type = $5,
         updated_at = NOW(),
         status = 'active'
       WHERE id = $6`,
      [
        JSON.stringify(credentials),
        email,
        expiresAt,
        scope,
        connectorType,
        credentialId,
      ],
    );

    this.logger.log(`OAuth credentials updated for credential ${credentialId}`);
  }

  /**
   * Check if access token is expired or expiring soon
   */
  async isTokenExpired(credentialId: string): Promise<boolean> {
    const credential = await this.findById(credentialId);

    if (!credential.oauth_expires_at) {
      return false; // Not an OAuth credential
    }

    const expiresAt = new Date(credential.oauth_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Token is expired or will expire in the next 5 minutes
    return expiresAt <= fiveMinutesFromNow;
  }

  /**
   * Get OAuth credentials for a connector
   */
  async getOAuthCredentials(credentialId: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }> {
    const credential = await this.findById(credentialId);

    if (!credential.is_oauth) {
      throw new Error('This credential is not an OAuth credential');
    }

    return {
      accessToken: credential.credentials?.accessToken,
      refreshToken: credential.credentials?.refreshToken || null,
      expiresAt: credential.oauth_expires_at ? new Date(credential.oauth_expires_at) : null,
    };
  }

  /**
   * Update refreshed OAuth tokens (used when tokens are refreshed during connector execution)
   * This preserves existing credential data while updating only the token fields
   */
  async updateRefreshedTokens(
    credentialId: string,
    tokens: {
      accessToken: string;
      refreshToken?: string | null;
      expiresAt: string | null;
    }
  ): Promise<void> {
    // First get existing credential to preserve other fields
    const existingCredential = await this.findById(credentialId);
    const existingCredentials = existingCredential.credentials || {};

    // Merge new tokens with existing credentials
    const updatedCredentials = {
      ...existingCredentials,
      accessToken: tokens.accessToken,
      ...(tokens.refreshToken !== undefined && { refreshToken: tokens.refreshToken }),
    };

    // Update only the token-related fields
    await this.platformService.query(
      `UPDATE connector_configs
       SET
         credentials = $1,
         oauth_expires_at = $2,
         updated_at = NOW()
       WHERE id = $3`,
      [
        JSON.stringify(updatedCredentials),
        tokens.expiresAt,
        credentialId,
      ],
    );

    this.logger.log(`OAuth tokens refreshed and saved for credential ${credentialId}`);
  }
}
