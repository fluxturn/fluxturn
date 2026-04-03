import { Logger } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * Base class for OAuth controllers with shared utilities
 * All connector-specific OAuth controllers should extend this class
 */
export abstract class BaseOAuthController {
  protected readonly logger: Logger;
  protected readonly frontendUrl: string;

  constructor(
    protected readonly configService: ConfigService,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  /**
   * Check if returnUrl indicates a popup flow
   * Popup flow is when there's no returnUrl or it's a placeholder value
   */
  protected isPopupFlow(returnUrl: string | undefined): boolean {
    return !returnUrl || returnUrl === '' || returnUrl === 'undefined' || returnUrl === 'null';
  }

  /**
   * Normalize returnUrl - convert undefined/null string values to actual undefined
   */
  protected normalizeReturnUrl(returnUrl: string | undefined): string | undefined {
    if (!returnUrl || returnUrl === 'undefined' || returnUrl === 'null') {
      return undefined;
    }
    return returnUrl;
  }

  /**
   * Generate success HTML response for popup flow
   */
  protected generateSuccessHtml(options: {
    providerName: string;
    credentialId: string;
    displayName?: string;
    gradientColors?: [string, string];
    extraInfo?: string;
  }): string {
    const {
      providerName,
      credentialId,
      displayName,
      gradientColors = ['#667eea', '#764ba2'],
      extraInfo,
    } = options;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${providerName} Connected</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
            .success-icon {
              font-size: 60px;
              margin-bottom: 20px;
            }
            h1 { margin: 0 0 10px 0; }
            p { margin: 0; opacity: 0.9; }
            .extra-info {
              margin-top: 10px;
              font-size: 14px;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">&#10003;</div>
            <h1>Connected to ${providerName}!</h1>
            <p>You can close this window now.</p>
            ${extraInfo ? `<p class="extra-info">${extraInfo}</p>` : ''}
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth_success',
                credentialId: '${credentialId}',
                email: '${displayName || providerName}'
              }, '*');
              setTimeout(() => window.close(), 1500);
            }
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Generate error HTML response for popup flow
   */
  protected generateErrorHtml(options: {
    providerName: string;
    errorMessage: string;
    gradientColors?: [string, string];
  }): string {
    const {
      providerName,
      errorMessage,
      gradientColors = ['#f093fb', '#f5576c'],
    } = options;

    // Escape the error message for safe HTML/JS embedding
    const safeErrorMessage = errorMessage
      .replace(/'/g, "\\'")
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${providerName} Connection Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 20px;
              backdrop-filter: blur(10px);
            }
            .error-icon {
              font-size: 60px;
              margin-bottom: 20px;
            }
            h1 { margin: 0 0 10px 0; }
            p { margin: 0; opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-icon">&#10007;</div>
            <h1>Connection Failed</h1>
            <p>${safeErrorMessage}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth_error',
                message: '${safeErrorMessage}'
              }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Send success response - handles both popup and redirect flows
   */
  protected sendSuccessResponse(
    res: Response,
    options: {
      returnUrl: string | undefined;
      providerName: string;
      credentialId: string;
      displayName?: string;
      gradientColors?: [string, string];
      extraInfo?: string;
      additionalParams?: Record<string, string>;
    },
  ): void {
    const { returnUrl, ...htmlOptions } = options;

    if (this.isPopupFlow(returnUrl)) {
      // Popup flow: Send HTML with postMessage
      const html = this.generateSuccessHtml(htmlOptions);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      // Redirect flow: Redirect to original page with success params
      const separator = returnUrl!.includes('?') ? '&' : '?';
      const params = new URLSearchParams({
        success: 'true',
        credentialId: options.credentialId,
        ...(options.displayName && { email: options.displayName }),
        ...options.additionalParams,
      });
      res.redirect(`${this.frontendUrl}${returnUrl}${separator}${params.toString()}`);
    }
  }

  /**
   * Send error response - handles both popup and redirect flows
   */
  protected sendErrorResponse(
    res: Response,
    options: {
      returnUrl: string | undefined;
      providerName: string;
      errorMessage: string;
      gradientColors?: [string, string];
    },
  ): void {
    const { returnUrl, ...htmlOptions } = options;

    if (this.isPopupFlow(returnUrl)) {
      // Popup flow: Send HTML with postMessage
      const html = this.generateErrorHtml(htmlOptions);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      // Redirect flow: Redirect to credentials page with error
      const errorReturnUrl = returnUrl || '/credentials';
      res.redirect(
        `${this.frontendUrl}${errorReturnUrl}?error=${encodeURIComponent(options.errorMessage)}`,
      );
    }
  }

  /**
   * Redirect to frontend with error (for authorize endpoint errors)
   */
  protected redirectWithError(res: Response, returnUrl: string | undefined, errorMessage: string): void {
    const errorReturnUrl = returnUrl || '/credentials';
    res.redirect(
      `${this.frontendUrl}${errorReturnUrl}?error=${encodeURIComponent(errorMessage)}`,
    );
  }
}
