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
import { SlackOAuthService } from '../../services/slack-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Slack OAuth Controller
 * Handles OAuth flows for Slack workspace integration
 */
@Controller('oauth/slack')
export class SlackOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly slackOAuthService: SlackOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, SlackOAuthController.name);
  }

  /**
   * Initiate Slack OAuth flow
   * GET /api/oauth/slack/authorize
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
        `slackAuthorize called with: userId=${userId}, credentialId=${credentialId}, connectorType=${connectorType}, returnUrl="${returnUrl}"`,
      );

      if (!userId || !credentialId || !connectorType) {
        throw new BadRequestException('Missing required parameters');
      }

      if (!this.slackOAuthService.isConfigured()) {
        throw new BadRequestException('Slack OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.slackOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        normalizedReturnUrl,
      );

      const authUrl = this.slackOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to Slack OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Slack OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Test endpoint to verify Slack callback route is accessible
   * GET /api/oauth/slack/test
   */
  @Get('test')
  async test(@Res() res: Response): Promise<void> {
    this.logger.log('Slack test endpoint hit!');
    res.send('Slack OAuth callback route is accessible!');
  }

  /**
   * Configuration check endpoint
   * GET /api/oauth/slack/config-check
   */
  @Get('config-check')
  async configCheck(@Res() res: Response): Promise<void> {
    const isConfigured = this.slackOAuthService.isConfigured();
    const clientId = process.env.SLACK_OAUTH_CLIENT_ID;
    const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI;

    this.logger.log('Slack config check requested');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Slack OAuth Configuration Check</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              background: #f5f5f5;
            }
            .status { font-size: 48px; }
            .info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .code { background: #f0f0f0; padding: 10px; border-radius: 4px; font-family: monospace; overflow-wrap: break-word; }
            .success { color: #22c55e; }
            .error { color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="status ${isConfigured ? 'success' : 'error'}">
            ${isConfigured ? '&#10003;' : '&#10007;'} Configuration ${isConfigured ? 'Valid' : 'Invalid'}
          </div>
          <h1>Slack OAuth Backend Configuration</h1>

          <div class="info">
            <h3>Configuration Status:</h3>
            <ul>
              <li>
                <span class="${clientId ? 'success' : 'error'}">
                  ${clientId ? '&#10003;' : '&#10007;'}
                </span>
                Client ID: ${clientId ? '<span class="code">' + clientId + '</span>' : '<span class="error">NOT SET</span>'}
              </li>
              <li>
                <span class="${process.env.SLACK_OAUTH_CLIENT_SECRET ? 'success' : 'error'}">
                  ${process.env.SLACK_OAUTH_CLIENT_SECRET ? '&#10003;' : '&#10007;'}
                </span>
                Client Secret: ${process.env.SLACK_OAUTH_CLIENT_SECRET ? '&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;' : '<span class="error">NOT SET</span>'}
              </li>
              <li>
                <span class="${redirectUri ? 'success' : 'error'}">
                  ${redirectUri ? '&#10003;' : '&#10007;'}
                </span>
                Redirect URI: ${redirectUri ? '<span class="code">' + redirectUri + '</span>' : '<span class="error">NOT SET</span>'}
              </li>
            </ul>
          </div>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  /**
   * Handle Slack OAuth callback
   * GET /api/oauth/slack/callback
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `SLACK CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.slackOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Slack OAuth callback received for user ${userId}, credential ${credentialId}, returnUrl: ${returnUrl}`,
      );

      const tokens = await this.slackOAuthService.exchangeCodeForTokens(code);

      this.logger.log(
        `Slack OAuth successful for team ${tokens.team?.name || 'Unknown'}`,
      );

      const encryptedAccessToken = this.slackOAuthService.encryptToken(
        tokens.access_token,
      );

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: null,
        expiresAt: null,
        scope: tokens.scope,
        email: tokens.authed_user?.id || tokens.bot_user_id,
        connectorType,
        metadata: {
          team_id: tokens.team?.id,
          team_name: tokens.team?.name,
          bot_user_id: tokens.bot_user_id,
          app_id: tokens.app_id,
          authed_user_id: tokens.authed_user?.id,
        },
      });

      this.logger.log(`Slack OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Slack',
        credentialId,
        displayName: tokens.team?.name || 'Slack',
        gradientColors: ['#4A154B', '#611f69'],
        extraInfo: tokens.team?.name ? `Workspace: ${tokens.team.name}` : undefined,
      });
    } catch (error) {
      this.logger.error('Error handling Slack OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.slackOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch (e) {
        this.logger.warn('Could not decode state in error handler, assuming popup flow');
      }

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Slack',
        errorMessage: error.message,
        gradientColors: ['#4A154B', '#611f69'],
      });
    }
  }
}
