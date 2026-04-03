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
import { PinterestOAuthService } from '../../services/pinterest-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Pinterest OAuth Controller
 * Handles OAuth flows for Pinterest social integration
 */
@Controller('oauth/pinterest')
export class PinterestOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly pinterestOAuthService: PinterestOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, PinterestOAuthController.name);
  }

  /**
   * Initiate Pinterest OAuth flow
   * GET /api/oauth/pinterest/authorize
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

      if (!this.pinterestOAuthService.isConfigured()) {
        throw new BadRequestException('Pinterest OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.pinterestOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        { returnUrl: normalizedReturnUrl }
      );

      const authUrl = this.pinterestOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to Pinterest OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Pinterest OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Pinterest OAuth callback
   * GET /api/oauth/pinterest/callback
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
      `PINTEREST CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${errorDescription || error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.pinterestOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Pinterest OAuth callback received for user ${userId}, credential ${credentialId}`,
      );

      const tokens = await this.pinterestOAuthService.exchangeCodeForTokens(code);

      this.logger.log('Pinterest OAuth successful');

      let userInfo: any = null;
      let displayName = 'Pinterest User';

      try {
        userInfo = await this.pinterestOAuthService.getUserInfo(tokens.access_token);
        displayName = userInfo.username || displayName;
        this.logger.log(`Pinterest OAuth successful for ${displayName}`);
      } catch (userInfoError) {
        this.logger.warn(
          `Could not fetch Pinterest user info (${userInfoError.message}). Credentials will be saved.`
        );
      }

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      const encryptedAccessToken = this.pinterestOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.pinterestOAuthService.encryptToken(tokens.refresh_token)
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
          username: userInfo?.username,
        },
      });

      this.logger.log(`Pinterest OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Pinterest',
        credentialId,
        displayName,
        gradientColors: ['#E60023', '#BD081C'],
        extraInfo: userInfo?.username ? `@${userInfo.username}` : undefined,
      });
    } catch (error) {
      this.logger.error('Error handling Pinterest OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.pinterestOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Pinterest',
        errorMessage: error.message,
        gradientColors: ['#E60023', '#BD081C'],
      });
    }
  }
}
