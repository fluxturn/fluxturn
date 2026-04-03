import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { BaseOAuthController } from './base-oauth.controller';
import { ZoomOAuthService } from '../../services/zoom-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';
import { ConnectorsService } from '../../connectors.service';

/**
 * Zoom OAuth Controller
 * Handles OAuth flows for Zoom video conferencing integration
 */
@Controller('oauth/zoom')
export class ZoomOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly zoomOAuthService: ZoomOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
    @Inject(forwardRef(() => ConnectorsService))
    private readonly connectorsService: ConnectorsService,
  ) {
    super(configService, ZoomOAuthController.name);
  }

  /**
   * Get decrypted connector config including credentials
   */
  private async getDecryptedConnectorConfig(credentialId: string): Promise<any> {
    return this.connectorsService.getConnectorConfigDecrypted(credentialId);
  }

  /**
   * Initiate Zoom OAuth flow
   * GET /api/oauth/zoom/authorize
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

      if (!this.zoomOAuthService.isConfigured()) {
        throw new BadRequestException('Zoom OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.zoomOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        normalizedReturnUrl,
      );

      const authUrl = this.zoomOAuthService.getAuthorizationUrl(state);

      this.logger.log(
        `Redirecting to Zoom OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Zoom OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Zoom OAuth callback
   * GET /api/oauth/zoom/callback
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `ZOOM CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.zoomOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Zoom OAuth callback received for user ${userId}, credential ${credentialId}, returnUrl: ${returnUrl}`,
      );

      // Get user's connector config to retrieve their clientId and clientSecret
      // Use ConnectorsService to get decrypted config and credentials
      const connectorConfig = await this.getDecryptedConnectorConfig(credentialId);
      if (!connectorConfig) {
        throw new BadRequestException('Connector configuration not found');
      }

      const config = connectorConfig.config || {};
      const credentials = connectorConfig.credentials || {};

      // clientId/clientSecret can be in config or credentials field
      const clientId = config.clientId || config.client_id || credentials.clientId || credentials.client_id;
      const clientSecret = config.clientSecret || config.client_secret || credentials.clientSecret || credentials.client_secret;
      const redirectUri = config.redirect_uri || config.redirectUri || credentials.redirect_uri || credentials.redirectUri;

      this.logger.log(`Zoom OAuth - clientId: ${clientId ? 'present' : 'missing'}, clientSecret: ${clientSecret ? 'present' : 'missing'}`);

      if (!clientId || !clientSecret) {
        throw new BadRequestException('Client ID and Client Secret are required in connector config');
      }

      // Exchange code for tokens using user's credentials
      const tokens = await this.exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);

      this.logger.log('Zoom OAuth successful');

      const encryptedAccessToken = this.zoomOAuthService.encryptToken(
        tokens.access_token,
      );
      const encryptedRefreshToken = this.zoomOAuthService.encryptToken(
        tokens.refresh_token,
      );

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        scope: tokens.scope,
        connectorType,
        metadata: {
          token_type: tokens.token_type,
        },
      });

      this.logger.log(`Zoom OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Zoom',
        credentialId,
        gradientColors: ['#2D8CFF', '#0B5CFF'],
      });
    } catch (error) {
      this.logger.error('Error handling Zoom OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.zoomOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch (e) {
        this.logger.warn('Could not decode state in error handler, assuming popup flow');
      }

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Zoom',
        errorMessage: error.message,
        gradientColors: ['#2D8CFF', '#0B5CFF'],
      });
    }
  }

  /**
   * Exchange authorization code for tokens using user's credentials
   */
  private async exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<any> {
    const axios = require('axios');

    // Zoom requires Basic Auth with base64 encoded client_id:client_secret
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  }
}
