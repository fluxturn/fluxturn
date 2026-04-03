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
import { DiscordOAuthService } from '../../services/discord-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Discord OAuth Controller
 * Handles OAuth flows for Discord server integration
 */
@Controller('oauth/discord')
export class DiscordOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly discordOAuthService: DiscordOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, DiscordOAuthController.name);
  }

  /**
   * Initiate Discord OAuth flow
   * GET /api/oauth/discord/authorize
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

      if (!this.discordOAuthService.isConfigured()) {
        throw new BadRequestException('Discord OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.discordOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        { returnUrl: normalizedReturnUrl }
      );

      const authUrl = this.discordOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to Discord OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Discord OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Discord OAuth callback
   * GET /api/oauth/discord/callback
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
      `DISCORD CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${errorDescription || error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.discordOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Discord OAuth callback received for user ${userId}, credential ${credentialId}`,
      );

      const tokens = await this.discordOAuthService.exchangeCodeForTokens(code);

      this.logger.log('Discord OAuth successful, fetching user info');

      let userInfo: any = null;
      let displayName = 'Discord User';

      try {
        userInfo = await this.discordOAuthService.getUserInfo(tokens.access_token);
        displayName = userInfo.username || displayName;
        this.logger.log(`Discord OAuth successful for ${displayName}`);
      } catch (userInfoError) {
        this.logger.warn(
          `Could not fetch Discord user info (${userInfoError.message}). Credentials will be saved.`
        );
      }

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

      const encryptedAccessToken = this.discordOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.discordOAuthService.encryptToken(tokens.refresh_token)
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
          discriminator: userInfo?.discriminator,
          avatar: userInfo?.avatar,
        },
      });

      this.logger.log(`Discord OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Discord',
        credentialId,
        displayName,
        gradientColors: ['#5865F2', '#7289DA'],
        extraInfo: userInfo?.username ? `@${userInfo.username}` : undefined,
      });
    } catch (error) {
      this.logger.error('Error handling Discord OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.discordOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Discord',
        errorMessage: error.message,
        gradientColors: ['#5865F2', '#7289DA'],
      });
    }
  }
}
