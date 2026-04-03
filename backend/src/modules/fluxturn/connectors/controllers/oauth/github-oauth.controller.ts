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
import { GitHubOAuthService } from '../../services/github-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * GitHub OAuth Controller
 * Handles OAuth flows for GitHub development integration
 */
@Controller('oauth/github')
export class GitHubOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly githubOAuthService: GitHubOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, GitHubOAuthController.name);
  }

  /**
   * Initiate GitHub OAuth flow
   * GET /api/oauth/github/authorize
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

      if (!this.githubOAuthService.isConfigured()) {
        throw new BadRequestException('GitHub OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.githubOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        { returnUrl: normalizedReturnUrl }
      );

      const authUrl = this.githubOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to GitHub OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating GitHub OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle GitHub OAuth callback
   * GET /api/oauth/github/callback
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
      `GITHUB CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${errorDescription || error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.githubOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `GitHub OAuth callback received for user ${userId}, credential ${credentialId}`,
      );

      const tokens = await this.githubOAuthService.exchangeCodeForTokens(code);

      this.logger.log('GitHub OAuth successful, fetching user info');

      let userInfo: any = null;
      let displayName = 'GitHub User';

      try {
        userInfo = await this.githubOAuthService.getUserInfo(tokens.access_token);
        displayName = userInfo.login || userInfo.name || displayName;
        this.logger.log(`GitHub OAuth successful for ${displayName}`);
      } catch (userInfoError) {
        this.logger.warn(
          `Could not fetch GitHub user info (${userInfoError.message}). Credentials will be saved.`
        );
      }

      const encryptedAccessToken = this.githubOAuthService.encryptToken(tokens.access_token);

      // GitHub tokens don't expire unless revoked
      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: null,
        expiresAt: null,
        scope: tokens.scope,
        email: displayName,
        connectorType,
        metadata: {
          user_id: userInfo?.id,
          login: userInfo?.login,
          name: userInfo?.name,
          avatar_url: userInfo?.avatar_url,
        },
      });

      this.logger.log(`GitHub OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'GitHub',
        credentialId,
        displayName,
        gradientColors: ['#24292e', '#586069'],
        extraInfo: userInfo?.login ? `@${userInfo.login}` : undefined,
      });
    } catch (error) {
      this.logger.error('Error handling GitHub OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.githubOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'GitHub',
        errorMessage: error.message,
        gradientColors: ['#24292e', '#586069'],
      });
    }
  }
}
