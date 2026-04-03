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
import { ClickUpOAuthService } from '../../services/clickup-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * ClickUp OAuth Controller
 * Handles OAuth flows for ClickUp project management integration
 */
@Controller('oauth/clickup')
export class ClickUpOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly clickupOAuthService: ClickUpOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, ClickUpOAuthController.name);
  }

  /**
   * Initiate ClickUp OAuth flow
   * GET /api/oauth/clickup/authorize
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

      if (!this.clickupOAuthService.isConfigured()) {
        throw new BadRequestException('ClickUp OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.clickupOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        normalizedReturnUrl,
      );

      const authUrl = this.clickupOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to ClickUp OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating ClickUp OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle ClickUp OAuth callback
   * GET /api/oauth/clickup/callback
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `CLICKUP CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.clickupOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `ClickUp OAuth callback received for user ${userId}, credential ${credentialId}, returnUrl: ${returnUrl}`,
      );

      const tokens = await this.clickupOAuthService.exchangeCodeForTokens(code);

      this.logger.log('ClickUp OAuth successful');

      const encryptedAccessToken = this.clickupOAuthService.encryptToken(
        tokens.access_token,
      );

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: null,
        expiresAt: null,
        scope: '',
        connectorType,
        metadata: {
          token_type: tokens.token_type,
        },
      });

      this.logger.log(`ClickUp OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'ClickUp',
        credentialId,
        gradientColors: ['#7B68EE', '#9370DB'],
      });
    } catch (error) {
      this.logger.error('Error handling ClickUp OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.clickupOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch (e) {
        this.logger.warn('Could not decode state in error handler, assuming popup flow');
      }

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'ClickUp',
        errorMessage: error.message,
        gradientColors: ['#7B68EE', '#9370DB'],
      });
    }
  }
}
