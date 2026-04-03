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
import { InstagramOAuthService } from '../../services/instagram-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Instagram OAuth Controller
 * Handles OAuth flows for Instagram social integration
 */
@Controller('oauth/instagram')
export class InstagramOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly instagramOAuthService: InstagramOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, InstagramOAuthController.name);
  }

  /**
   * Initiate Instagram OAuth flow
   * GET /api/oauth/instagram/authorize
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
      this.logger.log(`Instagram authorize - returnUrl received: "${returnUrl}"`);

      if (!userId || !credentialId || !connectorType) {
        throw new BadRequestException('Missing required parameters');
      }

      if (!this.instagramOAuthService.isConfigured()) {
        throw new BadRequestException(
          'Instagram OAuth is not configured. Please set INSTAGRAM_OAUTH_CLIENT_ID, INSTAGRAM_OAUTH_CLIENT_SECRET, and INSTAGRAM_OAUTH_REDIRECT_URI in .env'
        );
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.instagramOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        { returnUrl: normalizedReturnUrl }
      ) as string;

      const authUrl = this.instagramOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to Instagram OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Instagram OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Instagram OAuth callback
   * GET /api/oauth/instagram/callback
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
      `INSTAGRAM CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        const errorMsg = errorDescription || errorReason || error;
        throw new UnauthorizedException(`OAuth error: ${errorMsg}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.instagramOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Instagram OAuth callback received for user ${userId}, credential ${credentialId}`,
      );

      const tokens = await this.instagramOAuthService.exchangeCodeForTokens(code);

      this.logger.log('Instagram short-lived token received, exchanging for long-lived token');

      // Exchange for long-lived token
      const longLivedTokens = await this.instagramOAuthService.getLongLivedToken(
        tokens.access_token
      );

      // Fetch Instagram accounts via Facebook Pages
      let displayName = 'Instagram Account';
      let instagramAccountId: string | undefined;

      try {
        const pages = await this.instagramOAuthService.getInstagramAccounts(longLivedTokens.access_token);
        const pageWithInstagram = pages.find(p => p.instagram_business_account?.id);

        if (pageWithInstagram?.instagram_business_account?.id) {
          instagramAccountId = pageWithInstagram.instagram_business_account.id;
          const accountInfo = await this.instagramOAuthService.getInstagramAccountInfo(
            instagramAccountId,
            longLivedTokens.access_token
          );
          displayName = accountInfo.username ? `@${accountInfo.username}` : displayName;
        }
      } catch (userInfoError) {
        this.logger.warn(`Could not fetch Instagram account info: ${userInfoError.message}`);
      }

      this.logger.log(`Instagram OAuth successful for ${displayName}`);

      // Long-lived tokens expire in 60 days
      const expiresAt = new Date(Date.now() + longLivedTokens.expires_in * 1000);

      const encryptedAccessToken = this.instagramOAuthService.encryptToken(
        longLivedTokens.access_token
      );

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: null, // Instagram doesn't use refresh tokens the same way
        expiresAt: expiresAt.toISOString(),
        scope: '',
        email: displayName,
        connectorType,
        metadata: {
          instagram_account_id: instagramAccountId,
        },
      });

      this.logger.log(`Instagram OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Instagram',
        credentialId,
        displayName,
        gradientColors: ['#E1306C', '#833AB4'],
        extraInfo: instagramAccountId ? `Account ID: ${instagramAccountId}` : undefined,
      });
    } catch (error) {
      this.logger.error('Error handling Instagram OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.instagramOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Instagram',
        errorMessage: error.message,
        gradientColors: ['#E1306C', '#833AB4'],
      });
    }
  }
}
