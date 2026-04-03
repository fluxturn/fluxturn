import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface ShopifyOAuthTokens {
  access_token: string;
  scope: string;
}

export interface ShopifyShopInfo {
  id: number;
  name: string;
  email: string;
  domain: string;
  myshopify_domain: string;
  plan_name: string;
  shop_owner: string;
}

@Injectable()
export class ShopifyOAuthService {
  private readonly logger = new Logger(ShopifyOAuthService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly redirectUri: string;

  // Shopify OAuth scopes - comprehensive set for automation platform
  private readonly defaultScopes = [
    'read_products',
    'write_products',
    'read_orders',
    'write_orders',
    'read_customers',
    'write_customers',
    'read_inventory',
    'write_inventory',
    'read_fulfillments',
    'write_fulfillments',
    'read_shipping',
    'write_shipping',
    'read_analytics',
    'read_marketing_events',
    'write_marketing_events',
    'read_price_rules',
    'write_price_rules',
    'read_discounts',
    'write_discounts',
  ];

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SHOPIFY_OAUTH_API_KEY');
    this.apiSecret = this.configService.get<string>('SHOPIFY_OAUTH_API_SECRET');
    this.redirectUri = this.configService.get<string>('SHOPIFY_OAUTH_REDIRECT_URI');

    if (!this.apiKey || !this.apiSecret || !this.redirectUri) {
      this.logger.warn(
        'Shopify OAuth credentials not configured. One-click OAuth will not be available.',
      );
    }
  }

  /**
   * Check if OAuth is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret && this.redirectUri);
  }

  /**
   * Generate authorization URL for OAuth flow
   * Shopify requires store subdomain (shop parameter)
   */
  getAuthorizationUrl(
    shop: string,
    state: string,
    options?: {
      scopes?: string[];
    }
  ): string {
    if (!this.isConfigured()) {
      throw new Error('Shopify OAuth is not configured');
    }

    // Normalize shop domain
    const shopDomain = this.normalizeShopDomain(shop);
    const scopesToUse = options?.scopes || this.defaultScopes;

    this.logger.log(`Generating authorization URL for shop: ${shopDomain}`);
    this.logger.log(`Using scopes: ${scopesToUse.join(', ')}`);

    const params = new URLSearchParams({
      client_id: this.apiKey,
      scope: scopesToUse.join(','),
      redirect_uri: this.redirectUri,
      state: state,
    });

    const authUrl = `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
    this.logger.log(`Authorization URL generated for ${shopDomain}`);

    return authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(
    shop: string,
    code: string,
  ): Promise<ShopifyOAuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Shopify OAuth is not configured');
    }

    const shopDomain = this.normalizeShopDomain(shop);

    try {
      const response = await axios.post(
        `https://${shopDomain}/admin/oauth/access_token`,
        {
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          code,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Successfully exchanged code for access token for shop: ${shopDomain}`);
      this.logger.log(`Granted scopes: ${response.data.scope}`);

      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  /**
   * Get shop info from Shopify
   */
  async getShopInfo(shop: string, accessToken: string): Promise<ShopifyShopInfo> {
    const shopDomain = this.normalizeShopDomain(shop);
    this.logger.log(`Attempting to get shop info for: ${shopDomain}`);

    try {
      const response = await axios.get(
        `https://${shopDomain}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Successfully got shop info for: ${shopDomain}`);
      this.logger.log(`Shop name: ${response.data.shop.name}, Owner: ${response.data.shop.shop_owner}`);

      return response.data.shop;
    } catch (error) {
      this.logger.error('Failed to get shop info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get shop info from Shopify');
    }
  }

  /**
   * Normalize shop domain to myshopify.com format
   */
  normalizeShopDomain(shop: string): string {
    // Remove protocol if present
    let domain = shop.replace(/^https?:\/\//, '');

    // Remove trailing slashes
    domain = domain.replace(/\/$/, '');

    // If it doesn't end with .myshopify.com, add it
    if (!domain.endsWith('.myshopify.com')) {
      // Remove any existing domain suffix
      domain = domain.split('.')[0];
      domain = `${domain}.myshopify.com`;
    }

    return domain;
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState(
    userId: string,
    credentialId: string,
    connectorType: string,
    shop: string,
    options?: {
      returnUrl?: string;
    }
  ): string {
    const data = {
      userId,
      credentialId,
      connectorType,
      shop: this.normalizeShopDomain(shop),
      returnUrl: options?.returnUrl,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    // Encode as base64url
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  /**
   * Decode and validate state parameter
   */
  decodeState(state: string): {
    userId: string;
    credentialId: string;
    connectorType: string;
    shop: string;
    returnUrl?: string;
    timestamp: number;
  } {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const data = JSON.parse(decoded);

      // Validate timestamp (max 10 minutes old)
      const maxAge = 10 * 60 * 1000; // 10 minutes
      if (Date.now() - data.timestamp > maxAge) {
        throw new Error('State parameter expired');
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to decode state:', error.message);
      throw new UnauthorizedException('Invalid state parameter');
    }
  }

  /**
   * Verify HMAC signature from Shopify (for webhooks and redirects)
   */
  verifyHmac(queryParams: Record<string, string>): boolean {
    const { hmac, ...params } = queryParams;

    if (!hmac) {
      return false;
    }

    // Build message string from sorted params
    const message = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    // Calculate HMAC
    const hash = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');

    return hash === hmac;
  }

  /**
   * Encrypt tokens before storing in database
   */
  encryptToken(token: string): string {
    const encryptionKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
    if (!encryptionKey) {
      this.logger.warn('CONNECTOR_ENCRYPTION_KEY not set, tokens will not be encrypted');
      return token;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey, 'hex'),
      iv,
    );

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt tokens when retrieving from database
   */
  decryptToken(encryptedToken: string): string {
    const encryptionKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
    if (!encryptionKey) {
      return encryptedToken;
    }

    try {
      const [ivHex, encrypted] = encryptedToken.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey, 'hex'),
        iv,
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt token:', error.message);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Uninstall webhook - called when app is uninstalled from Shopify
   */
  async handleUninstall(shop: string, accessToken: string): Promise<void> {
    this.logger.log(`Handling uninstall for shop: ${shop}`);
    // Here you would clean up any data related to this shop
    // For now, just log it
  }
}
