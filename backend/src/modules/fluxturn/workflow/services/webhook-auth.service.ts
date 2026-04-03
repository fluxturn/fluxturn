import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

interface AuthResult {
  authenticated: boolean;
  error?: string;
}

/**
 * Webhook Authentication Service
 * Handles various authentication methods for webhook endpoints
 */
@Injectable()
export class WebhookAuthService {
  private readonly logger = new Logger(WebhookAuthService.name);

  /**
   * Main authentication method - routes to specific auth handlers
   */
  async authenticate(
    req: Request,
    authType: string,
    authData: any,
  ): Promise<AuthResult> {
    try {
      switch (authType) {
        case 'none':
          return { authenticated: true };

        case 'basic':
          return this.authenticateBasic(req, authData);

        case 'bearer':
          return this.authenticateBearer(req, authData);

        case 'header':
          return this.authenticateHeader(req, authData);

        case 'jwt':
          return this.authenticateJWT(req, authData);

        default:
          this.logger.warn(`Unknown auth type: ${authType}`);
          return { authenticated: true }; // Default to no auth
      }
    } catch (error) {
      this.logger.error('Authentication error:', error);
      return {
        authenticated: false,
        error: 'Authentication processing failed',
      };
    }
  }

  /**
   * Basic Authentication (username:password in Authorization header)
   */
  private authenticateBasic(req: Request, authData: any): AuthResult {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return {
        authenticated: false,
        error: 'Missing or invalid Authorization header',
      };
    }

    try {
      // Extract and decode Base64 credentials
      const base64Credentials = authHeader.substring(6);
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');

      // Compare with configured credentials
      const expectedUsername = authData.username;
      const expectedPassword = authData.password;

      if (!expectedUsername || !expectedPassword) {
        return {
          authenticated: false,
          error: 'Basic auth not properly configured',
        };
      }

      if (username === expectedUsername && password === expectedPassword) {
        return { authenticated: true };
      }

      return {
        authenticated: false,
        error: 'Invalid credentials',
      };
    } catch (error) {
      return {
        authenticated: false,
        error: 'Failed to parse Basic auth credentials',
      };
    }
  }

  /**
   * Bearer Token Authentication
   */
  private authenticateBearer(req: Request, authData: any): AuthResult {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        error: 'Missing or invalid Authorization header',
      };
    }

    const token = authHeader.substring(7);
    const expectedToken = authData.token;

    if (!expectedToken) {
      return {
        authenticated: false,
        error: 'Bearer token not configured',
      };
    }

    // Use constant-time comparison to prevent timing attacks
    const tokensMatch = crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken),
    );

    if (tokensMatch) {
      return { authenticated: true };
    }

    return {
      authenticated: false,
      error: 'Invalid bearer token',
    };
  }

  /**
   * Custom Header Authentication
   * Validates that a specific header contains the expected value
   */
  private authenticateHeader(req: Request, authData: any): AuthResult {
    const headerName = authData.headerName;
    const expectedValue = authData.headerValue;

    if (!headerName || !expectedValue) {
      return {
        authenticated: false,
        error: 'Header auth not properly configured',
      };
    }

    // Headers are case-insensitive
    const headerValue = req.headers[headerName.toLowerCase()];

    if (!headerValue) {
      return {
        authenticated: false,
        error: `Missing header: ${headerName}`,
      };
    }

    // Use constant-time comparison
    const valuesMatch = crypto.timingSafeEqual(
      Buffer.from(String(headerValue)),
      Buffer.from(expectedValue),
    );

    if (valuesMatch) {
      return { authenticated: true };
    }

    return {
      authenticated: false,
      error: 'Invalid header value',
    };
  }

  /**
   * JWT Token Authentication (simplified)
   * For production, consider using @nestjs/jwt or jsonwebtoken library
   */
  private authenticateJWT(req: Request, authData: any): AuthResult {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        error: 'Missing or invalid Authorization header',
      };
    }

    const token = authHeader.substring(7);
    const secret = authData.secret;

    if (!secret) {
      return {
        authenticated: false,
        error: 'JWT secret not configured',
      };
    }

    try {
      // Simple JWT validation - split into parts
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          authenticated: false,
          error: 'Invalid JWT format',
        };
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // Verify signature
      const data = `${headerB64}.${payloadB64}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64url');

      if (signatureB64 !== expectedSignature) {
        return {
          authenticated: false,
          error: 'Invalid JWT signature',
        };
      }

      // Decode and check expiration
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf-8'),
      );

      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return {
          authenticated: false,
          error: 'JWT token expired',
        };
      }

      return { authenticated: true };
    } catch (error) {
      return {
        authenticated: false,
        error: 'Failed to validate JWT token',
      };
    }
  }

  /**
   * Webhook signature validation (for services like Stripe, GitHub, etc.)
   * Can be used with header auth by validating HMAC signatures
   */
  validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = 'sha256',
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac(algorithm, secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Signature validation error:', error);
      return false;
    }
  }
}
