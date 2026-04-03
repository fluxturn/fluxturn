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
import { RedditOAuthService } from '../../services/reddit-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Reddit OAuth Controller
 * Handles OAuth flows for Reddit social integration
 */
@Controller('oauth/reddit')
export class RedditOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly redditOAuthService: RedditOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, RedditOAuthController.name);
  }

  /**
   * Initiate Reddit OAuth flow
   * GET /api/oauth/reddit/authorize
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
      this.logger.log(
        `redditAuthorize called with: userId=${userId}, credentialId=${credentialId}, connectorType=${connectorType}, returnUrl="${returnUrl}"`,
      );

      if (!userId || !credentialId || !connectorType) {
        throw new BadRequestException('Missing required parameters');
      }

      if (!this.redditOAuthService.isConfigured()) {
        throw new BadRequestException('Reddit OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.redditOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        { returnUrl: normalizedReturnUrl },
      );

      const authUrl = this.redditOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to Reddit OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Reddit OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Reddit OAuth callback
   * GET /api/oauth/reddit/callback
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `REDDIT CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.redditOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Reddit OAuth callback received for user ${userId}, credential ${credentialId}, returnUrl: ${returnUrl}`,
      );

      const tokens = await this.redditOAuthService.exchangeCodeForTokens(code);

      this.logger.log('Reddit OAuth successful, fetching user info');

      const userInfo = await this.redditOAuthService.getUserInfo(tokens.access_token);

      this.logger.log(`Reddit OAuth successful for user ${userInfo.name}`);

      const encryptedAccessToken = this.redditOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = this.redditOAuthService.encryptToken(tokens.refresh_token);

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt.toISOString(),
        scope: tokens.scope,
        email: userInfo.name,
        connectorType,
        metadata: {
          username: userInfo.name,
          user_id: userInfo.id,
          icon_img: userInfo.icon_img,
          created_utc: userInfo.created_utc,
        },
      });

      this.logger.log(`Reddit OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Reddit',
        credentialId,
        displayName: userInfo.name || 'Reddit',
        gradientColors: ['#FF4500', '#FF5700'],
        extraInfo: userInfo.name ? `u/${userInfo.name}` : undefined,
      });
    } catch (error) {
      this.logger.error('Error handling Reddit OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.redditOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch (e) {
        this.logger.warn('Could not decode state in error handler, assuming popup flow');
      }

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Reddit',
        errorMessage: error.message,
        gradientColors: ['#FF4500', '#FF5700'],
      });
    }
  }
}
