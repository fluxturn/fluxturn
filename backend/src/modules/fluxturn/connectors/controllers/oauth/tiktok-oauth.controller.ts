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
import { TikTokOAuthService } from '../../services/tiktok-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * TikTok OAuth Controller
 * Handles OAuth flows for TikTok social integration
 */
@Controller('oauth/tiktok')
export class TikTokOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly tiktokOAuthService: TikTokOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, TikTokOAuthController.name);
  }

  /**
   * Initiate TikTok OAuth flow
   * GET /api/oauth/tiktok/authorize
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

      if (!this.tiktokOAuthService.isConfigured()) {
        throw new BadRequestException('TikTok OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      // Generate PKCE code verifier and challenge for TikTok
      const codeVerifier = this.tiktokOAuthService.generateCodeVerifier();
      const codeChallenge = this.tiktokOAuthService.generateCodeChallenge(codeVerifier);

      const state = this.tiktokOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        codeVerifier,
        { returnUrl: normalizedReturnUrl }
      );

      const authUrl = this.tiktokOAuthService.getAuthorizationUrl(state, codeChallenge);

      this.logger.log(
        `Redirecting to TikTok OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating TikTok OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle TikTok OAuth callback
   * GET /api/oauth/tiktok/callback
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
      `TIKTOK CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${errorDescription || error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.tiktokOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl, codeVerifier } = stateData;

      this.logger.log(
        `TikTok OAuth callback received for user ${userId}, credential ${credentialId}`,
      );

      const tokens = await this.tiktokOAuthService.exchangeCodeForTokens(code, codeVerifier);

      this.logger.log('TikTok OAuth successful');

      let userInfo: any = null;
      let displayName = 'TikTok User';

      try {
        userInfo = await this.tiktokOAuthService.getUserInfo(tokens.access_token);
        displayName = userInfo.display_name || userInfo.username || displayName;
        this.logger.log(`TikTok OAuth successful for ${displayName}`);
      } catch (userInfoError) {
        this.logger.warn(
          `Could not fetch TikTok user info (${userInfoError.message}). Credentials will be saved.`
        );
      }

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      const encryptedAccessToken = this.tiktokOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.tiktokOAuthService.encryptToken(tokens.refresh_token)
        : null;

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt?.toISOString() || null,
        scope: tokens.scope,
        email: displayName,
        connectorType,
        metadata: {
          open_id: tokens.open_id,
          user_id: userInfo?.open_id,
          display_name: userInfo?.display_name,
          avatar_url: userInfo?.avatar_url,
        },
      });

      this.logger.log(`TikTok OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'TikTok',
        credentialId,
        displayName,
        gradientColors: ['#000000', '#25F4EE'],
        extraInfo: userInfo?.display_name ? `@${userInfo.display_name}` : undefined,
      });
    } catch (error) {
      this.logger.error('Error handling TikTok OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.tiktokOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'TikTok',
        errorMessage: error.message,
        gradientColors: ['#000000', '#25F4EE'],
      });
    }
  }
}
