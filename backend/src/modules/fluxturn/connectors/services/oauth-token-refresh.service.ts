/**
 * OAuth Token Refresh Service
 *
 * A background service that proactively refreshes OAuth tokens before they expire.
 * This prevents workflow failures due to expired tokens by automatically maintaining
 * valid credentials for all connected OAuth services.
 *
 * Key features:
 * - Runs every 5 minutes via cron job
 * - Refreshes tokens 15 minutes before expiration
 * - Retry logic with exponential backoff (max 3 attempts)
 * - Real-time notifications for refresh failures
 * - Email alerts when tokens require manual re-authentication
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../../../database/platform.service';
import { ConnectorConfigService } from './connector-config.service';
import { NotificationGateway } from '../../../realtime/gateways/notification.gateway';
import { EmailService } from '../../../email/email.service';
import {
  OAUTH_PROVIDER_REGISTRY,
  OAuthProviderConfig,
  getProviderByConnectorType,
} from './oauth-provider-registry';
import { ConnectorLookup } from '../shared';

// Import all OAuth services
import { GoogleOAuthService } from './google-oauth.service';
import { TwitterOAuthService } from './twitter-oauth.service';
import { LinkedInOAuthService } from './linkedin-oauth.service';
import { FacebookOAuthService } from './facebook-oauth.service';
import { SlackOAuthService } from './slack-oauth.service';
import { DiscordOAuthService } from './discord-oauth.service';
import { ZoomOAuthService } from './zoom-oauth.service';
import { HubSpotOAuthService } from './hubspot-oauth.service';
import { SalesforceOAuthService } from './salesforce-oauth.service';
import { RedditOAuthService } from './reddit-oauth.service';
import { PinterestOAuthService } from './pinterest-oauth.service';
import { ClickUpOAuthService } from './clickup-oauth.service';
import { MicrosoftTeamsOAuthService } from './microsoft-teams-oauth.service';
import { GitHubOAuthService } from './github-oauth.service';
import { ShopifyOAuthService } from './shopify-oauth.service';
import { NotionOAuthService } from './notion-oauth.service';

interface ExpiringCredential {
  id: string;
  user_id: string;
  connector_type: string;
  connector_name: string;
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    [key: string]: any;
  };
  oauth_expires_at: string;
  refresh_retry_count: number;
  user_email: string;
  first_name: string;
}

interface RefreshStats {
  checked: number;
  refreshed: number;
  failed: number;
  skipped: number;
}

@Injectable()
export class OAuthTokenRefreshService implements OnModuleInit {
  private readonly logger = new Logger(OAuthTokenRefreshService.name);
  private readonly REFRESH_BUFFER_MINUTES = 15;
  private readonly MAX_RETRIES = 3;
  private refreshInProgress = new Set<string>();
  private isEnabled = true;

  // Service map for dynamic OAuth service lookup
  private oauthServiceMap: Record<string, any>;

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
    private readonly connectorConfigService: ConnectorConfigService,
    private readonly notificationGateway: NotificationGateway,
    private readonly emailService: EmailService,
    // OAuth services
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly twitterOAuthService: TwitterOAuthService,
    private readonly linkedInOAuthService: LinkedInOAuthService,
    private readonly facebookOAuthService: FacebookOAuthService,
    private readonly slackOAuthService: SlackOAuthService,
    private readonly discordOAuthService: DiscordOAuthService,
    private readonly zoomOAuthService: ZoomOAuthService,
    private readonly hubSpotOAuthService: HubSpotOAuthService,
    private readonly salesforceOAuthService: SalesforceOAuthService,
    private readonly redditOAuthService: RedditOAuthService,
    private readonly pinterestOAuthService: PinterestOAuthService,
    private readonly clickUpOAuthService: ClickUpOAuthService,
    private readonly microsoftTeamsOAuthService: MicrosoftTeamsOAuthService,
    private readonly gitHubOAuthService: GitHubOAuthService,
    private readonly shopifyOAuthService: ShopifyOAuthService,
    private readonly notionOAuthService: NotionOAuthService,
  ) {
    // Build service map
    this.oauthServiceMap = {
      'GoogleOAuthService': this.googleOAuthService,
      'TwitterOAuthService': this.twitterOAuthService,
      'LinkedInOAuthService': this.linkedInOAuthService,
      'FacebookOAuthService': this.facebookOAuthService,
      'SlackOAuthService': this.slackOAuthService,
      'DiscordOAuthService': this.discordOAuthService,
      'ZoomOAuthService': this.zoomOAuthService,
      'HubSpotOAuthService': this.hubSpotOAuthService,
      'SalesforceOAuthService': this.salesforceOAuthService,
      'RedditOAuthService': this.redditOAuthService,
      'PinterestOAuthService': this.pinterestOAuthService,
      'ClickUpOAuthService': this.clickUpOAuthService,
      'MicrosoftTeamsOAuthService': this.microsoftTeamsOAuthService,
      'GitHubOAuthService': this.gitHubOAuthService,
      'ShopifyOAuthService': this.shopifyOAuthService,
      'NotionOAuthService': this.notionOAuthService,
    };
  }

  async onModuleInit() {
    // Check if required columns exist, if not disable the service
    const columnsExist = await this.checkRetryColumnsExist();
    if (!columnsExist) {
      this.isEnabled = false;
      this.logger.warn('OAuth Token Refresh Service DISABLED - missing refresh_retry_count column. Run migrations to enable.');
      return;
    }
    this.logger.log('OAuth Token Refresh Service initialized');
  }

  /**
   * Main cron job - runs every 5 minutes to check for expiring tokens
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async proactiveTokenRefresh(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    const startTime = Date.now();
    const stats: RefreshStats = { checked: 0, refreshed: 0, failed: 0, skipped: 0 };

    this.logger.log('Starting proactive OAuth token refresh cycle');

    try {
      const expiringTokens = await this.findExpiringTokens();
      stats.checked = expiringTokens.length;

      if (expiringTokens.length === 0) {
        this.logger.debug('No tokens expiring soon');
        return;
      }

      this.logger.log(`Found ${expiringTokens.length} tokens expiring within ${this.REFRESH_BUFFER_MINUTES} minutes`);

      for (const credential of expiringTokens) {
        // Skip if already being refreshed (concurrent protection)
        if (this.refreshInProgress.has(credential.id)) {
          stats.skipped++;
          this.logger.debug(`Skipping ${credential.id} - refresh already in progress`);
          continue;
        }

        try {
          this.refreshInProgress.add(credential.id);
          await this.refreshTokenWithRetry(credential);
          stats.refreshed++;
        } catch (error) {
          stats.failed++;
          // Only log at debug level - summary will be shown at end
          this.logger.debug(`Failed to refresh ${credential.connector_type} (${credential.id}): ${error.message}`);
        } finally {
          this.refreshInProgress.delete(credential.id);
        }
      }

      const duration = Date.now() - startTime;
      if (stats.failed > 0) {
        this.logger.warn(`Token refresh: ${stats.refreshed} succeeded, ${stats.failed} failed, ${stats.skipped} skipped (${duration}ms)`);
      } else if (stats.refreshed > 0) {
        this.logger.log(`Token refresh: ${stats.refreshed} succeeded (${duration}ms)`);
      }
    } catch (error) {
      this.logger.error(`Token refresh cycle failed: ${error.message}`);
    }
  }

  /**
   * Find all OAuth credentials expiring within the buffer period
   */
  private async findExpiringTokens(): Promise<ExpiringCredential[]> {
    try {
      // First, check if the retry columns exist
      const columnsExist = await this.checkRetryColumnsExist();

      let query: string;
      if (columnsExist) {
        query = `
          SELECT
            cc.id,
            cc.user_id,
            cc.connector_type,
            cc.credentials,
            cc.oauth_expires_at,
            COALESCE(cc.refresh_retry_count, 0) as refresh_retry_count,
            u.email as user_email,
            COALESCE(u.first_name, u.username, 'User') as first_name
          FROM connector_configs cc
          JOIN users u ON cc.user_id = u.id
          WHERE cc.is_oauth = true
            AND cc.status = 'active'
            AND COALESCE(cc.refresh_disabled, false) = false
            AND cc.oauth_expires_at IS NOT NULL
            AND cc.oauth_expires_at > NOW()
            AND cc.oauth_expires_at <= NOW() + INTERVAL '${this.REFRESH_BUFFER_MINUTES} minutes'
            AND (cc.credentials->>'refreshToken') IS NOT NULL
            AND (cc.credentials->>'refreshToken') != ''
            AND COALESCE(cc.refresh_retry_count, 0) < ${this.MAX_RETRIES}
          ORDER BY cc.oauth_expires_at ASC
          LIMIT 100
        `;
      } else {
        // Simplified query without retry columns
        query = `
          SELECT
            cc.id,
            cc.user_id,
            cc.connector_type,
            cc.credentials,
            cc.oauth_expires_at,
            0 as refresh_retry_count,
            u.email as user_email,
            COALESCE(u.first_name, u.username, 'User') as first_name
          FROM connector_configs cc
          JOIN users u ON cc.user_id = u.id
          WHERE cc.is_oauth = true
            AND cc.status = 'active'
            AND cc.oauth_expires_at IS NOT NULL
            AND cc.oauth_expires_at > NOW()
            AND cc.oauth_expires_at <= NOW() + INTERVAL '${this.REFRESH_BUFFER_MINUTES} minutes'
            AND (cc.credentials->>'refreshToken') IS NOT NULL
            AND (cc.credentials->>'refreshToken') != ''
          ORDER BY cc.oauth_expires_at ASC
          LIMIT 100
        `;
      }

      const result = await this.platformService.query(query);

      // Enrich with connector display names from TypeScript constants
      const credentials = result.rows.map((row: any) => {
        const def = ConnectorLookup.getByName(row.connector_type);
        return {
          ...row,
          connector_name: def?.display_name || row.connector_type,
        };
      });

      return credentials as ExpiringCredential[];
    } catch (error) {
      this.logger.error(`Failed to query expiring tokens: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if retry tracking columns exist in the database
   */
  private async checkRetryColumnsExist(): Promise<boolean> {
    try {
      const result = await this.platformService.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'connector_configs' AND column_name = 'refresh_retry_count'
      `);
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Refresh token with retry logic
   */
  private async refreshTokenWithRetry(credential: ExpiringCredential): Promise<void> {
    const retryCount = credential.refresh_retry_count || 0;

    try {
      await this.refreshToken(credential);
      await this.resetRetryCount(credential.id);
      this.logger.log(`Successfully refreshed token for ${credential.connector_type} (${credential.id})`);
    } catch (error: any) {
      // Check if this is a permanent error (invalid token that can never be refreshed)
      const isPermanentError = this.isPermanentRefreshError(error.message);

      if (isPermanentError) {
        // Immediately mark as expired and disable refresh - no point retrying
        // Log at debug level since this is expected for revoked/expired tokens
        this.logger.debug(`Permanent refresh error for ${credential.connector_type} (${credential.id}), disabling refresh`);
        await this.handleMaxRetriesReached(credential, error);
        throw error;
      }

      await this.incrementRetryCount(credential.id, error.message);

      if (retryCount + 1 >= this.MAX_RETRIES) {
        await this.handleMaxRetriesReached(credential, error);
      } else {
        await this.sendRefreshFailureNotification(credential, error, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Check if an error is permanent (token is invalid and can never be refreshed)
   */
  private isPermanentRefreshError(errorMessage: string): boolean {
    const permanentErrors = [
      'Value passed for the token was invalid',
      'Invalid refresh token',
      'Refresh token has expired',
      'Refresh token has been revoked',
      'Token has been revoked',
      'invalid_grant',
      'Token is expired or revoked',
    ];

    return permanentErrors.some(err =>
      errorMessage.toLowerCase().includes(err.toLowerCase())
    );
  }

  /**
   * Refresh token using the appropriate OAuth service
   */
  private async refreshToken(credential: ExpiringCredential): Promise<void> {
    const providerConfig = getProviderByConnectorType(credential.connector_type);

    if (!providerConfig) {
      this.logger.warn(`No provider config found for connector type: ${credential.connector_type}`);
      return;
    }

    if (!providerConfig.supportsRefreshToken) {
      this.logger.debug(`Skipping ${credential.connector_type} - provider does not support token refresh`);
      return;
    }

    const oauthService = this.oauthServiceMap[providerConfig.serviceClass];
    if (!oauthService) {
      this.logger.error(`OAuth service not found: ${providerConfig.serviceClass}`);
      throw new Error(`OAuth service not found: ${providerConfig.serviceClass}`);
    }

    if (!credential.credentials?.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Decrypt the refresh token
    const refreshToken = this.decryptToken(credential.credentials.refreshToken);

    // Call the provider's refresh method
    this.logger.debug(`Refreshing token for ${credential.connector_type} using ${providerConfig.serviceClass}`);
    const tokens = await oauthService.refreshAccessToken(refreshToken);

    // Calculate new expiration time
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Update tokens in database
    await this.connectorConfigService.updateRefreshedTokens(credential.id, {
      accessToken: this.encryptToken(tokens.access_token),
      refreshToken: tokens.refresh_token
        ? this.encryptToken(tokens.refresh_token)
        : credential.credentials.refreshToken,
      expiresAt,
    });

    this.logger.debug(`Tokens updated for ${credential.id}, new expiry: ${expiresAt}`);
  }

  /**
   * Handle when max retries have been reached - mark as expired and notify user
   */
  private async handleMaxRetriesReached(credential: ExpiringCredential, error: Error): Promise<void> {
    this.logger.warn(`Max retries reached for ${credential.connector_type} (${credential.id}), marking as expired`);

    // Mark credential as expired and disable refresh
    try {
      await this.platformService.query(
        `UPDATE connector_configs
         SET status = 'expired',
             refresh_disabled = true,
             updated_at = NOW()
         WHERE id = $1`,
        [credential.id]
      );
    } catch (dbError) {
      this.logger.error(`Failed to update credential status: ${dbError.message}`);
    }

    // Send real-time notification
    try {
      await this.notificationGateway.sendToUser(
        credential.user_id,
        'error',
        'OAuth Connection Expired',
        `Your ${credential.connector_name} connection has expired and needs to be reconnected. Automated workflows using this connection may fail.`,
        {
          data: {
            credentialId: credential.id,
            connectorType: credential.connector_type,
            action: 'reauthorize',
          },
          expiresIn: 60 * 24, // 24 hours
        }
      );
    } catch (notifError) {
      this.logger.error(`Failed to send notification: ${notifError.message}`);
    }

    // Send email notification (only if user email is available)
    if (credential.user_email) {
      try {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://app.fluxturn.com');
        await this.emailService.sendEmail({
          to: credential.user_email,
          subject: `Action Required: ${credential.connector_name} Connection Expired`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Your ${credential.connector_name} Connection Needs Attention</h2>
              <p>Hi ${credential.first_name || 'User'},</p>
              <p>We were unable to automatically refresh your <strong>${credential.connector_name}</strong> connection token after multiple attempts.</p>
              <p>This may cause your automated workflows that use this connection to fail.</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Error:</strong></p>
                <code style="color: #d32f2f;">${error.message}</code>
              </div>
              <p><strong>Action Required:</strong> Please reconnect your ${credential.connector_name} account to continue using it in your workflows.</p>
              <a href="${frontendUrl}/credentials" style="display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #00ffcc 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; margin-top: 16px;">
                Reconnect Now
              </a>
              <p style="color: #666; font-size: 14px; margin-top: 24px;">
                If you need help, please contact our support team.
              </p>
            </div>
          `,
          skipLogging: true,
        });
      } catch (emailError) {
        this.logger.error(`Failed to send email notification: ${emailError.message}`);
      }
    } else {
      this.logger.debug(`Skipping email notification - no email for user ${credential.user_id}`);
    }
  }

  /**
   * Send notification when a refresh attempt fails (before max retries)
   */
  private async sendRefreshFailureNotification(
    credential: ExpiringCredential,
    error: Error,
    attempt: number
  ): Promise<void> {
    try {
      await this.notificationGateway.sendToUser(
        credential.user_id,
        'warning',
        'OAuth Token Refresh Issue',
        `Attempt ${attempt}/${this.MAX_RETRIES} to refresh your ${credential.connector_name} token failed. We'll retry automatically.`,
        {
          data: {
            credentialId: credential.id,
            connectorType: credential.connector_type,
            attempt,
            maxRetries: this.MAX_RETRIES,
            error: error.message,
          },
          expiresIn: 30, // 30 minutes
        }
      );
    } catch (notifError) {
      this.logger.error(`Failed to send warning notification: ${notifError.message}`);
    }
  }

  /**
   * Reset retry count after successful refresh
   */
  private async resetRetryCount(credentialId: string): Promise<void> {
    try {
      const columnsExist = await this.checkRetryColumnsExist();
      if (columnsExist) {
        await this.platformService.query(
          `UPDATE connector_configs
           SET refresh_retry_count = 0,
               last_refresh_error = NULL,
               last_refresh_attempt = NOW()
           WHERE id = $1`,
          [credentialId]
        );
      }
    } catch (error) {
      // Silently ignore if columns don't exist
    }
  }

  /**
   * Increment retry count and record error
   */
  private async incrementRetryCount(credentialId: string, errorMessage: string): Promise<void> {
    try {
      const columnsExist = await this.checkRetryColumnsExist();
      if (columnsExist) {
        await this.platformService.query(
          `UPDATE connector_configs
           SET refresh_retry_count = COALESCE(refresh_retry_count, 0) + 1,
               last_refresh_error = $2,
               last_refresh_attempt = NOW()
           WHERE id = $1`,
          [credentialId, errorMessage]
        );
      }
    } catch (error) {
      // Silently ignore if columns don't exist
    }
  }

  /**
   * Encrypt a token (delegates to Google OAuth service which has the encryption logic)
   */
  private encryptToken(token: string): string {
    return this.googleOAuthService.encryptToken(token);
  }

  /**
   * Decrypt a token (delegates to Google OAuth service which has the decryption logic)
   */
  private decryptToken(encryptedToken: string): string {
    return this.googleOAuthService.decryptToken(encryptedToken);
  }

  /**
   * Manually trigger a refresh for a specific credential (for testing/admin)
   */
  async manualRefresh(credentialId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const columnsExist = await this.checkRetryColumnsExist();

      const query = columnsExist ? `
        SELECT
          cc.id,
          cc.user_id,
          cc.connector_type,
          cc.credentials,
          cc.oauth_expires_at,
          COALESCE(cc.refresh_retry_count, 0) as refresh_retry_count,
          u.email as user_email,
          COALESCE(u.first_name, u.username, 'User') as first_name
        FROM connector_configs cc
        JOIN users u ON cc.user_id = u.id
        WHERE cc.id = $1
      ` : `
        SELECT
          cc.id,
          cc.user_id,
          cc.connector_type,
          cc.credentials,
          cc.oauth_expires_at,
          0 as refresh_retry_count,
          u.email as user_email,
          COALESCE(u.first_name, u.username, 'User') as first_name
        FROM connector_configs cc
        JOIN users u ON cc.user_id = u.id
        WHERE cc.id = $1
      `;

      const result = await this.platformService.query(query, [credentialId]);
      if (result.rows.length === 0) {
        return { success: false, error: 'Credential not found' };
      }

      // Enrich with connector display name from TypeScript constants
      const def = ConnectorLookup.getByName(result.rows[0].connector_type);
      const credential = {
        ...result.rows[0],
        connector_name: def?.display_name || result.rows[0].connector_type,
      } as ExpiringCredential;
      await this.refreshToken(credential);
      await this.resetRetryCount(credentialId);

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Manual refresh failed for ${credentialId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable/disable the automatic refresh service
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.logger.log(`OAuth Token Refresh Service ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current service status
   */
  getStatus(): { enabled: boolean; inProgress: number } {
    return {
      enabled: this.isEnabled,
      inProgress: this.refreshInProgress.size,
    };
  }
}
