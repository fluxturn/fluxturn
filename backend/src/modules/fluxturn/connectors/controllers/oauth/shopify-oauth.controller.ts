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
import { ShopifyOAuthService } from '../../services/shopify-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Shopify OAuth Controller
 * Handles OAuth flows for Shopify e-commerce integration
 */
@Controller('oauth/shopify')
export class ShopifyOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly shopifyOAuthService: ShopifyOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, ShopifyOAuthController.name);
  }

  /**
   * Initiate Shopify OAuth flow
   * GET /api/oauth/shopify/authorize
   */
  @Get('authorize')
  async authorize(
    @Query('userId') userId: string,
    @Query('credentialId') credentialId: string,
    @Query('connectorType') connectorType: string,
    @Query('returnUrl') returnUrl: string,
    @Query('shop') shop: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!userId || !credentialId || !connectorType) {
        throw new BadRequestException('Missing required parameters');
      }

      if (!shop) {
        throw new BadRequestException('Shop domain is required for Shopify OAuth');
      }

      if (!this.shopifyOAuthService.isConfigured()) {
        throw new BadRequestException('Shopify OAuth is not configured');
      }

      const normalizedReturnUrl = this.normalizeReturnUrl(returnUrl);

      const state = this.shopifyOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        shop,
        { returnUrl: normalizedReturnUrl }
      );

      const authUrl = this.shopifyOAuthService.getAuthorizationUrl(shop, state);

      this.logger.log(
        `Redirecting to Shopify OAuth for user ${userId}, shop ${shop}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating Shopify OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Shopify OAuth callback
   * GET /api/oauth/shopify/callback
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('shop') shop: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `SHOPIFY CALLBACK HIT! code=${code ? 'present' : 'missing'}, state=${state ? 'present' : 'missing'}, shop=${shop}, error=${error || 'none'}`,
    );

    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${errorDescription || error}`);
      }

      if (!code || !state || !shop) {
        throw new BadRequestException('Missing code, state, or shop parameter');
      }

      const stateData = this.shopifyOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `Shopify OAuth callback received for user ${userId}, credential ${credentialId}, shop ${shop}`,
      );

      const tokens = await this.shopifyOAuthService.exchangeCodeForTokens(code, shop);

      this.logger.log('Shopify OAuth successful');

      const displayName = shop;

      const encryptedAccessToken = this.shopifyOAuthService.encryptToken(tokens.access_token);

      // Shopify offline access tokens don't expire
      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: null,
        expiresAt: null,
        scope: tokens.scope,
        email: displayName,
        connectorType,
        metadata: {
          shop,
          scope: tokens.scope,
        },
      });

      this.logger.log(`Shopify OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Shopify',
        credentialId,
        displayName,
        gradientColors: ['#96BF48', '#5E8E3E'],
        extraInfo: `Shop: ${shop}`,
      });
    } catch (error) {
      this.logger.error('Error handling Shopify OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.shopifyOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Shopify',
        errorMessage: error.message,
        gradientColors: ['#96BF48', '#5E8E3E'],
      });
    }
  }
}
