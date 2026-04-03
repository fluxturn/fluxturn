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
import { NotionOAuthService } from '../../services/notion-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Notion OAuth Controller
 * Handles OAuth flows for Notion workspace integration
 */
@Controller('oauth/notion')
export class NotionOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly notionOAuthService: NotionOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, NotionOAuthController.name);
  }

  /**
   * Initiate Notion OAuth flow
   * GET /api/oauth/notion/authorize
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

      if (!this.notionOAuthService.isConfigured()) {
        throw new BadRequestException('Notion OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.notionOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        normalizedReturnUrl
      );

      const authUrl = this.notionOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to Notion OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Notion OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Notion OAuth callback
   * GET /api/oauth/notion/callback
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `NOTION CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.notionOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Notion OAuth callback received for user ${userId}, credential ${credentialId}`,
      );

      const tokens = await this.notionOAuthService.exchangeCodeForTokens(code);

      this.logger.log('Notion OAuth successful');

      const displayName = tokens.workspace_name || 'Notion Workspace';

      const encryptedAccessToken = this.notionOAuthService.encryptToken(tokens.access_token);

      // Notion tokens don't expire
      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: null,
        expiresAt: null,
        scope: '',
        email: displayName,
        connectorType,
        metadata: {
          workspace_id: tokens.workspace_id,
          workspace_name: tokens.workspace_name,
          workspace_icon: tokens.workspace_icon,
          bot_id: tokens.bot_id,
          owner: tokens.owner,
        },
      });

      this.logger.log(`Notion OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Notion',
        credentialId,
        displayName,
        gradientColors: ['#000000', '#333333'],
        extraInfo: tokens.workspace_name ? `Workspace: ${tokens.workspace_name}` : undefined,
      });
    } catch (error) {
      this.logger.error('Error handling Notion OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.notionOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Notion',
        errorMessage: error.message,
        gradientColors: ['#000000', '#333333'],
      });
    }
  }
}
