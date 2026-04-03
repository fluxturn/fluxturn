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
import { HubSpotOAuthService } from '../../services/hubspot-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * HubSpot OAuth Controller
 * Handles OAuth flows for HubSpot CRM integration
 */
@Controller('oauth/hubspot')
export class HubSpotOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly hubspotOAuthService: HubSpotOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, HubSpotOAuthController.name);
  }

  /**
   * Initiate HubSpot OAuth flow
   * GET /api/oauth/hubspot/authorize
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

      if (!this.hubspotOAuthService.isConfigured()) {
        throw new BadRequestException('HubSpot OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.hubspotOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        { returnUrl: normalizedReturnUrl }
      );

      const authUrl = this.hubspotOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to HubSpot OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating HubSpot OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle HubSpot OAuth callback
   * GET /api/oauth/hubspot/callback
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `HUBSPOT CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${errorDescription || error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.hubspotOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `HubSpot OAuth callback received for user ${userId}, credential ${credentialId}`,
      );

      const tokens = await this.hubspotOAuthService.exchangeCodeForTokens(code);

      this.logger.log('HubSpot OAuth successful');

      let userInfo: any = null;
      let displayName = 'HubSpot Account';

      try {
        userInfo = await this.hubspotOAuthService.getUserInfo(tokens.access_token);
        displayName = userInfo.hub_domain || userInfo.user || displayName;
        this.logger.log(`HubSpot OAuth successful for ${displayName}`);
      } catch (userInfoError) {
        this.logger.warn(
          `Could not fetch HubSpot account info (${userInfoError.message}). Credentials will be saved.`
        );
      }

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      const encryptedAccessToken = this.hubspotOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.hubspotOAuthService.encryptToken(tokens.refresh_token)
        : null;

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt?.toISOString() || null,
        scope: '',
        email: displayName,
        connectorType,
        metadata: {
          user: userInfo?.user,
          hub_id: userInfo?.hub_id,
          hub_domain: userInfo?.hub_domain,
        },
      });

      this.logger.log(`HubSpot OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'HubSpot',
        credentialId,
        displayName,
        gradientColors: ['#FF7A59', '#FF5C35'],
      });
    } catch (error) {
      this.logger.error('Error handling HubSpot OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.hubspotOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'HubSpot',
        errorMessage: error.message,
        gradientColors: ['#FF7A59', '#FF5C35'],
      });
    }
  }
}
