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
import { FacebookOAuthService } from '../../services/facebook-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Facebook OAuth Controller
 * Handles OAuth flows for Facebook Graph API integration
 */
@Controller('oauth/facebook')
export class FacebookOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly facebookOAuthService: FacebookOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, FacebookOAuthController.name);
  }

  /**
   * Initiate Facebook OAuth flow
   * GET /api/oauth/facebook/authorize
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

      if (!this.facebookOAuthService.isConfigured()) {
        throw new BadRequestException('Facebook OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.facebookOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        { returnUrl: normalizedReturnUrl }
      );

      const authUrl = this.facebookOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to Facebook OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Facebook OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Facebook OAuth callback
   * GET /api/oauth/facebook/callback
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_reason') errorReason: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `FACEBOOK CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        const errorMsg = errorDescription || errorReason || error;
        throw new UnauthorizedException(`OAuth error: ${errorMsg}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.facebookOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Facebook OAuth callback received for user ${userId}, credential ${credentialId}`,
      );

      // Exchange code for short-lived token
      const tokens = await this.facebookOAuthService.exchangeCodeForTokens(code);

      this.logger.log('Facebook short-lived token received, exchanging for long-lived token');

      // Exchange for long-lived token
      const longLivedTokens = await this.facebookOAuthService.exchangeForLongLivedToken(
        tokens.access_token
      );

      let userInfo: any = null;
      let displayName = 'Facebook User';

      try {
        userInfo = await this.facebookOAuthService.getUserInfo(longLivedTokens.access_token);
        displayName = userInfo.name || displayName;
        this.logger.log(`Facebook OAuth successful for ${displayName}`);
      } catch (userInfoError) {
        this.logger.warn(
          `Could not fetch Facebook user info (${userInfoError.message}). Credentials will be saved.`
        );
      }

      // Long-lived tokens expire in ~60 days
      const expiresAt = longLivedTokens.expires_in
        ? new Date(Date.now() + longLivedTokens.expires_in * 1000)
        : null;

      const encryptedAccessToken = this.facebookOAuthService.encryptToken(
        longLivedTokens.access_token
      );

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: null, // Facebook doesn't use refresh tokens the same way
        expiresAt: expiresAt?.toISOString() || null,
        scope: '',
        email: displayName,
        connectorType,
        metadata: {
          user_id: userInfo?.id,
          name: userInfo?.name,
          email: userInfo?.email,
        },
      });

      this.logger.log(`Facebook OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Facebook',
        credentialId,
        displayName,
        gradientColors: ['#1877F2', '#4267B2'],
      });
    } catch (error) {
      this.logger.error('Error handling Facebook OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.facebookOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Facebook',
        errorMessage: error.message,
        gradientColors: ['#1877F2', '#4267B2'],
      });
    }
  }
}
