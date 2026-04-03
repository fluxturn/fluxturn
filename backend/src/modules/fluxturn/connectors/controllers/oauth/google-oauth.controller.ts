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
import { GoogleOAuthService } from '../../services/google-oauth.service';
import { ConnectorConfigService } from '../../services/connector-config.service';

/**
 * Google OAuth Controller
 * Handles OAuth flows for Google services (Gmail, YouTube, etc.)
 */
@Controller('oauth')
export class GoogleOAuthController extends BaseOAuthController {
  constructor(
    configService: ConfigService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly connectorConfigService: ConnectorConfigService,
  ) {
    super(configService, GoogleOAuthController.name);
  }

  // ==================== GOOGLE/GMAIL OAUTH ====================

  /**
   * Initiate Google OAuth flow
   * GET /api/oauth/google/authorize
   */
  @Get('google/authorize')
  async googleAuthorize(
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

      if (!this.googleOAuthService.isConfigured()) {
        throw new BadRequestException('Google OAuth is not configured');
      }

      const state = this.googleOAuthService.generateState(
        userId,
        credentialId,
        connectorType,
        returnUrl,
      );

      const authUrl = this.googleOAuthService.getAuthorizationUrl(connectorType, state);

      this.logger.log(
        `Redirecting to Google OAuth for user ${userId}, connector ${connectorType}`,
      );

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle Google OAuth callback
   * GET /api/oauth/google/callback
   */
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.googleOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(
        `OAuth callback received for user ${userId}, credential ${credentialId}, connector ${connectorType}`,
      );

      const tokens = await this.googleOAuthService.exchangeCodeForTokens(code);
      this.logger.log(`Tokens received. Scopes granted: ${tokens.scope}`);

      const userInfo = await this.googleOAuthService.getUserInfo(tokens.access_token);
      this.logger.log('User info received from Google:', JSON.stringify(userInfo));

      if (!userInfo.email) {
        this.logger.error('User info does not contain email. Received:', userInfo);
        throw new Error(
          'Failed to retrieve email from Google. Please ensure you grant email permissions during authorization.'
        );
      }

      this.logger.log(`OAuth successful for ${userInfo.email}`);

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const encryptedAccessToken = this.googleOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.googleOAuthService.encryptToken(tokens.refresh_token)
        : null;

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt.toISOString(),
        scope: tokens.scope,
        email: userInfo.email,
        connectorType,
      });

      this.logger.log(`OAuth credentials saved for credential ${credentialId}`);

      this.sendSuccessResponse(res, {
        returnUrl,
        providerName: 'Google',
        credentialId,
        displayName: userInfo.email,
        gradientColors: ['#4285F4', '#34A853'],
      });
    } catch (error) {
      this.logger.error('Error handling OAuth callback:', error.message);

      let returnUrl: string | undefined;
      try {
        if (state) {
          const stateData = this.googleOAuthService.decodeState(state);
          returnUrl = stateData.returnUrl;
        }
      } catch {}

      this.sendErrorResponse(res, {
        returnUrl,
        providerName: 'Google',
        errorMessage: error.message,
        gradientColors: ['#EA4335', '#FBBC05'],
      });
    }
  }

  /**
   * Refresh Google OAuth token
   * GET /api/oauth/google/refresh/:credentialId
   */
  @Get('google/refresh/:credentialId')
  async refreshToken(@Query('credentialId') credentialId: string): Promise<any> {
    try {
      if (!credentialId) {
        throw new BadRequestException('Missing credentialId');
      }

      const credential = await this.connectorConfigService.findById(credentialId);
      if (!credential) {
        throw new BadRequestException('Credential not found');
      }

      const refreshToken = this.googleOAuthService.decryptToken(
        credential.credentials.refreshToken,
      );

      const tokens = await this.googleOAuthService.refreshAccessToken(refreshToken);

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const encryptedAccessToken = this.googleOAuthService.encryptToken(tokens.access_token);

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        expiresAt: expiresAt.toISOString(),
        scope: tokens.scope,
        connectorType: credential.connector_type,
      });

      this.logger.log(`Access token refreshed for credential ${credentialId}`);

      return {
        success: true,
        message: 'Token refreshed successfully',
        expiresAt,
      };
    } catch (error) {
      this.logger.error('Error refreshing token:', error.message);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  // ==================== YOUTUBE OAUTH (uses Google OAuth with YouTube scopes) ====================

  /**
   * Initiate YouTube OAuth flow
   * GET /api/oauth/youtube/authorize
   */
  @Get('youtube/authorize')
  async youtubeAuthorize(
    @Query('userId') userId: string,
    @Query('credentialId') credentialId: string,
    @Query('connectorType') connectorType: string,
    @Query('returnUrl') returnUrl: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!userId || !credentialId) {
        throw new BadRequestException('Missing required parameters');
      }

      if (!this.googleOAuthService.isConfigured()) {
        throw new BadRequestException('Google OAuth is not configured');
      }

      const state = this.googleOAuthService.generateState(
        userId,
        credentialId,
        connectorType || 'youtube',
        returnUrl,
      );

      const authUrl = this.googleOAuthService.getAuthorizationUrl('youtube', state);

      this.logger.log(`Redirecting to YouTube OAuth for user ${userId}`);

      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Error initiating YouTube OAuth flow:', error.message);
      this.redirectWithError(res, returnUrl, error.message);
    }
  }

  /**
   * Handle YouTube OAuth callback
   * GET /api/oauth/youtube/callback
   */
  @Get('youtube/callback')
  async youtubeCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (error) {
        throw new UnauthorizedException(`OAuth error: ${error}`);
      }

      if (!code || !state) {
        throw new BadRequestException('Missing code or state parameter');
      }

      const stateData = this.googleOAuthService.decodeState(state);
      const { userId, credentialId, connectorType, returnUrl } = stateData;

      this.logger.log(`YouTube OAuth callback for user ${userId}, credential ${credentialId}`);

      const tokens = await this.googleOAuthService.exchangeCodeForTokens(code);
      const userInfo = await this.googleOAuthService.getUserInfo(tokens.access_token);

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const encryptedAccessToken = this.googleOAuthService.encryptToken(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token
        ? this.googleOAuthService.encryptToken(tokens.refresh_token)
        : null;

      await this.connectorConfigService.updateOAuthCredentials(credentialId, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: expiresAt.toISOString(),
        scope: tokens.scope,
        email: userInfo.email,
        connectorType: connectorType || 'youtube',
      });

      this.logger.log(`YouTube OAuth credentials saved for credential ${credentialId}`);

      // Redirect back to frontend
      const successUrl = returnUrl
        ? `${this.frontendUrl}${returnUrl}?success=true&oauth=youtube&service=youtube`
        : `${this.frontendUrl}/credentials?success=true&oauth=youtube`;

      res.redirect(successUrl);
    } catch (error) {
      this.logger.error('YouTube OAuth callback error:', error.message);

      let errorReturnUrl = '/credentials';
      try {
        if (state) {
          const stateData = this.googleOAuthService.decodeState(state);
          errorReturnUrl = stateData.returnUrl || '/credentials';
        }
      } catch {}

      res.redirect(
        `${this.frontendUrl}${errorReturnUrl}?error=${encodeURIComponent(error.message)}&service=youtube`,
      );
    }
  }
}
