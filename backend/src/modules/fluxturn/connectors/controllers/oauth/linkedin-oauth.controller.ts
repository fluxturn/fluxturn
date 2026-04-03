import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { BaseOAuthController } from './base-oauth.controller';
import { LinkedInOAuthService } from '../../services/linkedin-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';
import { ConnectorsService } from '../../connectors.service';

/**
 * LinkedIn OAuth Controller
 * Handles OAuth flows for LinkedIn professional networking integration
 */
@Controller('oauth/linkedin')
export class LinkedInOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly linkedinOAuthService: LinkedInOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
    private readonly connectorsService: ConnectorsService,
  ) {
    super(configService, LinkedInOAuthController.name);
  }

  /**
   * Initiate LinkedIn OAuth flow
   * GET /api/oauth/linkedin/authorize
   */
  @Get('authorize')
  async authorize(
    @Query('userId') userId: string,
    @Query('credentialId') credentialId: string,
    @Query('connectorType') connectorType: string,
    @Query('returnUrl') returnUrl: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!userId || !credentialId || !connectorType) {
        throw new BadRequestException('Missing required parameters');
      }

      if (!this.linkedinOAuthService.isConfigured()) {
        throw new BadRequestException('LinkedIn OAuth is not configured');
      }

      // Fetch credential config to get legacy and organizationSupport settings
      const credentials = await this.connectorsService.getConnectorCredentials(credentialId);

      this.logger.log(`LinkedIn credential data (decrypted):`, {
        credentialId,
        credentials,
      });

      // Extract configuration options (matching n8n's approach)
      const legacy = credentials?.legacy ?? false;
      const organizationSupport = credentials?.organization_support ?? false;

      this.logger.log(
        `LinkedIn OAuth config - Legacy: ${legacy}, Organization Support: ${organizationSupport}`
      );

      // Generate state parameter for CSRF protection with config options
      const state = this.linkedinOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        {
          returnUrl,
          legacy,
          organizationSupport,
        }
      );

      // Get authorization URL with dynamic scope selection
      const authUrl = this.linkedinOAuthService.getAuthorizationUrl(state, {
        legacy,
        organizationSupport,
      });

      this.logger.log(
        `Redirecting to LinkedIn OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating LinkedIn OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle LinkedIn OAuth callback
   * GET /api/oauth/linkedin/callback
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.linkedinOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl, legacy, organizationSupport } = stateData;

      this.logger.log(
        `LinkedIn OAuth callback received for user ${userId}, credential ${credentialId}`,
      );
      this.logger.log(
        `OAuth config - Legacy: ${legacy}, Organization Support: ${organizationSupport}`
      );

      const tokens = await this.linkedinOAuthService.exchangeCodeForTokens(code);

      // Try to get user info from LinkedIn, but don't fail if it times out
      let userInfo: any = null;
      let displayEmail = 'LinkedIn User (info pending)';

      try {
        userInfo = await this.linkedinOAuthService.getUserInfo(tokens.access_token);
        displayEmail = userInfo.email || userInfo.name || displayEmail;
        this.logger.log(`LinkedIn OAuth successful for ${displayEmail}`);
      } catch (userInfoError) {
        this.logger.warn(
          `Could not fetch LinkedIn user info immediately (${userInfoError.message}). ` +
          `Credentials will be saved and user info can be fetched on first use.`
        );
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const encryptedAccessToken = this.linkedinOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.linkedinOAuthService.encryptToken(tokens.refresh_token)
        : null;

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt.toISOString(),
        scope: tokens.scope,
        email: displayEmail,
        connectorType,
        legacy: legacy ?? false,
        organization_support: organizationSupport ?? false,
      });

      this.logger.log(`LinkedIn OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'LinkedIn',
        credentialId,
        displayName: displayEmail,
        gradientColors: ['#0077B5', '#00A0DC'],
      });
    } catch (error) {
      this.logger.error('Error handling LinkedIn OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.linkedinOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'LinkedIn',
        errorMessage: error.message,
        gradientColors: ['#0077B5', '#00A0DC'],
      });
    }
  }

  /**
   * Refresh LinkedIn OAuth token
   * GET /api/oauth/linkedin/refresh/:credentialId
   */
  @Get('refresh/:credentialId')
  async refreshToken(@Query('credentialId') credentialId: string): Promise<any> {
    try {
      if (!credentialId) {
        throw new BadRequestException('Missing credentialId');
      }

      const credential = await this.connectorConfigService.findById(credentialId);
      if (!credential) {
        throw new BadRequestException('Credential not found');
      }

      if (!credential.credentials.refreshToken) {
        throw new BadRequestException('No refresh token available');
      }

      const refreshToken = this.linkedinOAuthService.decryptToken(
        credential.credentials.refreshToken,
      );

      const tokens = await this.linkedinOAuthService.refreshAccessToken(refreshToken);

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const encryptedAccessToken = this.linkedinOAuthService.encryptToken(tokens.access_token);

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        expiresAt: expiresAt.toISOString(),
        scope: tokens.scope,
        connectorType: credential.connector_type,
      });

      this.logger.log(`LinkedIn access token refreshed for credential ${credentialId}`);

      return {
        success: true,
        message: 'Token refreshed successfully',
        expiresAt,
      };
    } catch (error) {
      this.logger.error('Error refreshing LinkedIn token:', error.message);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }
}
