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
import { SalesforceOAuthService } from '../../services/salesforce-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Salesforce OAuth Controller
 * Handles OAuth flows for Salesforce CRM integration
 */
@Controller('oauth/salesforce')
export class SalesforceOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly salesforceOAuthService: SalesforceOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, SalesforceOAuthController.name);
  }

  /**
   * Initiate Salesforce OAuth flow
   * GET /api/oauth/salesforce/authorize
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

      if (!this.salesforceOAuthService.isConfigured()) {
        throw new BadRequestException('Salesforce OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.salesforceOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        false, // isSandbox
        normalizedReturnUrl
      );

      const authUrl = this.salesforceOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to Salesforce OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Salesforce OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Salesforce OAuth callback
   * GET /api/oauth/salesforce/callback
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
      `SALESFORCE CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${errorDescription || error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.salesforceOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Salesforce OAuth callback received for user ${userId}, credential ${credentialId}`,
      );

      const tokens = await this.salesforceOAuthService.exchangeCodeForTokens(code);

      this.logger.log('Salesforce OAuth successful');

      let userInfo: any = null;
      let displayName = 'Salesforce User';

      try {
        // tokens.id is the identity URL for fetching user info
        userInfo = await this.salesforceOAuthService.getUserInfo(
          tokens.access_token,
          tokens.instance_url,
          tokens.id
        );
        displayName = userInfo.display_name || userInfo.username || displayName;
        this.logger.log(`Salesforce OAuth successful for ${displayName}`);
      } catch (userInfoError) {
        this.logger.warn(
          `Could not fetch Salesforce user info (${userInfoError.message}). Credentials will be saved.`
        );
      }

      const encryptedAccessToken = this.salesforceOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.salesforceOAuthService.encryptToken(tokens.refresh_token)
        : null;

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: null, // Salesforce tokens don't have standard expiration
        scope: '',
        email: displayName,
        connectorType,
        metadata: {
          instance_url: tokens.instance_url,
          user_id: userInfo?.user_id,
          organization_id: userInfo?.organization_id,
          username: userInfo?.username,
        },
      });

      this.logger.log(`Salesforce OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Salesforce',
        credentialId,
        displayName,
        gradientColors: ['#00A1E0', '#1798C1'],
      });
    } catch (error) {
      this.logger.error('Error handling Salesforce OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.salesforceOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Salesforce',
        errorMessage: error.message,
        gradientColors: ['#00A1E0', '#1798C1'],
      });
    }
  }
}
