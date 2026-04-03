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
import { XeroOAuthService } from '../../services/xero-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';
import { ConnectorsService } from '../../connectors.service';

/**
 * Xero OAuth Controller
 * Handles OAuth flows for Xero accounting integration
 *
 * Note: Xero uses user-provided Client ID and Client Secret (not platform credentials)
 * The Tenant ID is fetched automatically via the Connections API after OAuth
 */
@Controller('oauth/xero')
export class XeroOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly xeroOAuthService: XeroOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
    private readonly connectorsService: ConnectorsService,
  ) {
    super(configService, XeroOAuthController.name);
  }

  /**
   * Initiate Xero OAuth flow
   * GET /api/oauth/xero/authorize
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

      if (!this.xeroOAuthService.isConfigured()) {
        throw new BadRequestException(
          'Xero OAuth redirect URI is not configured. Please set XERO_OAUTH_REDIRECT_URI in .env'
        );
      }

      // Fetch user's Xero credentials (clientId from their config)
      const credential = await this.connectorsService.getConnectorConfigDecrypted(credentialId);
      const config = credential.config || {};
      const clientId = config.clientId;

      if (!clientId) {
        throw new BadRequestException(
          'Xero Client ID is not configured. Please add your Xero app Client ID in the connector settings.'
        );
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      // Generate state with user-specific data
      const state = this.xeroOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        { returnUrl: normalizedReturnUrl }
      );

      // Use user's clientId for the authorization URL
      const authUrl = this.xeroOAuthService.getAuthorizationUrl(clientId, state);

      this.logger.log(
        `Redirecting to Xero OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Xero OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Xero OAuth callback
   * GET /api/oauth/xero/callback
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
      `XERO CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${errorDescription || error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.xeroOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Xero OAuth callback received for user ${userId}, credential ${credentialId}`,
      );

      // Fetch user's Xero credentials (clientId and clientSecret)
      const credential = await this.connectorsService.getConnectorConfigDecrypted(credentialId);
      const config = credential.config || {};
      const credentials = (credential as any).credentials || {};

      const clientId = config.clientId || credentials.clientId;
      const clientSecret = config.clientSecret || credentials.clientSecret;

      if (!clientId || !clientSecret) {
        throw new BadRequestException('Client ID and Client Secret are required');
      }

      // Exchange code for tokens using user's credentials
      const tokens = await this.xeroOAuthService.exchangeCodeForTokens(code, {
        clientId,
        clientSecret,
      });

      this.logger.log('Xero OAuth successful, fetching connections to get Tenant ID');

      // Fetch connected tenants (organizations)
      const connections = await this.xeroOAuthService.getConnections(tokens.access_token);

      if (!connections || connections.length === 0) {
        throw new BadRequestException(
          'No Xero organizations found. Please ensure you have authorized access to at least one organization.'
        );
      }

      const primaryTenant = connections[0];
      const displayName = primaryTenant.tenantName || 'Xero Organization';

      this.logger.log(
        `Xero OAuth successful for ${displayName} (Tenant ID: ${primaryTenant.tenantId})`
      );

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const encryptedAccessToken = this.xeroOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.xeroOAuthService.encryptToken(tokens.refresh_token)
        : null;

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt.toISOString(),
        scope: tokens.scope,
        email: displayName,
        connectorType,
        metadata: {
          tenantId: primaryTenant.tenantId,
          tenantName: primaryTenant.tenantName,
          tenantType: primaryTenant.tenantType,
          allConnections: connections.map(c => ({
            tenantId: c.tenantId,
            tenantName: c.tenantName,
            tenantType: c.tenantType,
          })),
        },
      });

      this.logger.log(`Xero OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Xero',
        credentialId,
        displayName,
        gradientColors: ['#13B5EA', '#0078C1'],
        extraInfo: `Organization: ${primaryTenant.tenantName}`,
      });
    } catch (error) {
      this.logger.error('Error handling Xero OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.xeroOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Xero',
        errorMessage: error.message,
        gradientColors: ['#13B5EA', '#0078C1'],
      });
    }
  }
}
