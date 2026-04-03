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
import { MicrosoftTeamsOAuthService } from '../../services/microsoft-teams-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Microsoft Teams OAuth Controller
 * Handles OAuth flows for Microsoft Teams integration
 */
@Controller('oauth/microsoft-teams')
export class MicrosoftTeamsOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly microsoftTeamsOAuthService: MicrosoftTeamsOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, MicrosoftTeamsOAuthController.name);
  }

  /**
   * Initiate Microsoft Teams OAuth flow
   * GET /api/oauth/microsoft-teams/authorize
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

      if (!this.microsoftTeamsOAuthService.isConfigured()) {
        throw new BadRequestException('Microsoft Teams OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.microsoftTeamsOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        { returnUrl: normalizedReturnUrl }
      );

      const authUrl = this.microsoftTeamsOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to Microsoft Teams OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Microsoft Teams OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Microsoft Teams OAuth callback
   * GET /api/oauth/microsoft-teams/callback
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
      `MICROSOFT TEAMS CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${errorDescription || error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.microsoftTeamsOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Microsoft Teams OAuth callback received for user ${userId}, credential ${credentialId}`,
      );

      const tokens = await this.microsoftTeamsOAuthService.exchangeCodeForTokens(code);

      this.logger.log('Microsoft Teams OAuth successful');

      let userInfo: any = null;
      let displayName = 'Microsoft Teams User';

      try {
        userInfo = await this.microsoftTeamsOAuthService.getUserInfo(tokens.access_token);
        displayName = userInfo.displayName || userInfo.userPrincipalName || displayName;
        this.logger.log(`Microsoft Teams OAuth successful for ${displayName}`);
      } catch (userInfoError) {
        this.logger.warn(
          `Could not fetch Microsoft user info (${userInfoError.message}). Credentials will be saved.`
        );
      }

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      const encryptedAccessToken = this.microsoftTeamsOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.microsoftTeamsOAuthService.encryptToken(tokens.refresh_token)
        : null;

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt?.toISOString() || null,
        scope: tokens.scope,
        email: displayName,
        connectorType,
        metadata: {
          user_id: userInfo?.id,
          displayName: userInfo?.displayName,
          userPrincipalName: userInfo?.userPrincipalName,
          mail: userInfo?.mail,
        },
      });

      this.logger.log(`Microsoft Teams OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Microsoft Teams',
        credentialId,
        displayName,
        gradientColors: ['#6264A7', '#464775'],
      });
    } catch (error) {
      this.logger.error('Error handling Microsoft Teams OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.microsoftTeamsOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Microsoft Teams',
        errorMessage: error.message,
        gradientColors: ['#6264A7', '#464775'],
      });
    }
  }
}
