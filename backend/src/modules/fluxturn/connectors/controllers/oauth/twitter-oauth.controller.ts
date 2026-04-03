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
import { TwitterOAuthService } from '../../services/twitter-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Twitter OAuth Controller
 * Handles OAuth flows for Twitter/X social integration
 * Uses PKCE (Proof Key for Code Exchange) for enhanced security
 */
@Controller('oauth/twitter')
export class TwitterOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly twitterOAuthService: TwitterOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, TwitterOAuthController.name);
  }

  /**
   * Initiate Twitter OAuth flow
   * GET /api/oauth/twitter/authorize
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
      this.logger.log(`Twitter authorize - returnUrl received: "${returnUrl}"`);

      if (!userId || !credentialId || !connectorType) {
        throw new BadRequestException('Missing required parameters');
      }

      if (!this.twitterOAuthService.isConfigured()) {
        throw new BadRequestException('Twitter OAuth is not configured');
      }

      // Generate PKCE code verifier and challenge
      const codeVerifier = this.twitterOAuthService.generateCodeVerifier();
      const codeChallenge = this.twitterOAuthService.generateCodeChallenge(codeVerifier);

      // Generate state parameter for CSRF protection
      const state = this.twitterOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        codeVerifier,
        { returnUrl }
      );

      // Get authorization URL with code challenge
      const authUrl = this.twitterOAuthService.getAuthorizationUrl(state, codeChallenge);

      this.logger.log(
        `Redirecting to Twitter OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Twitter OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Twitter OAuth callback
   * GET /api/oauth/twitter/callback
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

      const stateData = this.twitterOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl, codeVerifier } = stateData;

      this.logger.log(
        `Twitter OAuth callback received for user ${userId}, credential ${credentialId}, returnUrl: "${returnUrl}"`,
      );

      // Exchange authorization code for tokens using PKCE
      const tokens = await this.twitterOAuthService.exchangeCodeForTokens(code, codeVerifier);

      // Try to get user info from Twitter
      let userInfo: any = null;
      let displayEmail = 'Twitter User';

      try {
        userInfo = await this.twitterOAuthService.getUserInfo(tokens.access_token);
        displayEmail = userInfo.username ? `@${userInfo.username}` : userInfo.name || displayEmail;
        this.logger.log(`Twitter OAuth successful for ${displayEmail}`);
      } catch (userInfoError) {
        this.logger.warn(
          `Could not fetch Twitter user info immediately (${userInfoError.message}). ` +
          `Credentials will be saved and user info can be fetched on first use.`
        );
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const encryptedAccessToken = this.twitterOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.twitterOAuthService.encryptToken(tokens.refresh_token)
        : null;

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt.toISOString(),
        scope: tokens.scope,
        email: displayEmail,
        connectorType,
      });

      this.logger.log(`Twitter OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Twitter',
        credentialId,
        displayName: displayEmail,
        gradientColors: ['#1DA1F2', '#14171A'],
      });
    } catch (error) {
      this.logger.error('Error in Twitter OAuth callback:', error);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.twitterOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Twitter',
        errorMessage: error.message,
        gradientColors: ['#1DA1F2', '#14171A'],
      });
    }
  }
}
