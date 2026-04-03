import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  OnModuleInit,
  Optional,
  Inject,
  forwardRef
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../../database/platform.service';
import { 
  CreateConnectorConfigDto, 
  UpdateConnectorConfigDto, 
  TestConnectorDto,
  ConnectorActionDto,
  ConnectorListQueryDto,
  ConnectorUsageQueryDto,
  ConnectorTestResultDto,
  ConnectorActionResultDto,
  ConnectorUsageStatsDto 
} from './dto/connector.dto';
import { ConnectorConfig, ConnectorUsageLog } from './entities/connector-config.entity';
import { CONNECTOR_DEFINITIONS, ConnectorLookup, ConnectorMetadata } from './shared';
import { ConnectorFactory } from './base/connector.factory';
import { ConnectorConfig as InternalConnectorConfig, ConnectorCategory } from './types';
import { GoogleOAuthService } from './services/google-oauth.service';
import { LinkedInOAuthService } from './services/linkedin-oauth.service';
import { TwitterOAuthService } from './services/twitter-oauth.service';
import { GitHubOAuthService } from './services/github-oauth.service';
import { SlackOAuthService } from './services/slack-oauth.service';
import { RedditOAuthService } from './services/reddit-oauth.service';
import { DiscordOAuthService } from './services/discord-oauth.service';
import { ShopifyOAuthService } from './services/shopify-oauth.service';
import { TikTokOAuthService } from './services/tiktok-oauth.service';
import { ConnectorToolProviderService } from '../workflow/services/connector-tool-provider.service';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface AuthContext {
  type: 'jwt' | 'apikey';
  token?: string;
  apiKey?: string;
  userId?: string;
  organizationId?: string;
  projectId?: string;
}

@Injectable()
export class ConnectorsService implements OnModuleInit {
  private readonly logger = new Logger(ConnectorsService.name);
  private readonly encryptionKey: string;
  private readonly encryptionAlgorithm = 'aes-256-gcm';

  // Redaction constants (following n8n's approach)
  private readonly CREDENTIAL_BLANKING_VALUE = '__redacted__';
  private readonly CREDENTIAL_EMPTY_VALUE = '';

  constructor(
    private configService: ConfigService,
    private platformService: PlatformService,
    private connectorFactory: ConnectorFactory,
    private googleOAuthService: GoogleOAuthService,
    private slackOAuthService: SlackOAuthService,
    private redditOAuthService: RedditOAuthService,
    private linkedinOAuthService: LinkedInOAuthService,
    private twitterOAuthService: TwitterOAuthService,
    private githubOAuthService: GitHubOAuthService,
    private discordOAuthService: DiscordOAuthService,
    private shopifyOAuthService: ShopifyOAuthService,
    private tiktokOAuthService: TikTokOAuthService,
    @Optional() @Inject(forwardRef(() => ConnectorToolProviderService))
    private connectorToolProvider?: ConnectorToolProviderService,
  ) {
    const key = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
    if (!key) {
      throw new Error(
        'CONNECTOR_ENCRYPTION_KEY must be set in environment variables. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    if (key.length !== 64) {
      throw new Error('CONNECTOR_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    this.encryptionKey = key;
  }

  async onModuleInit() {
    // Migrate existing credentials from snake_case to camelCase
    await this.migrateCredentialsFormat();
  }

  /**
   * Migrate existing credentials from snake_case to camelCase format
   */
  private async migrateCredentialsFormat(): Promise<void> {
    try {

      const query = `SELECT id, credentials FROM connector_configs WHERE credentials IS NOT NULL`;
      const result = await this.platformService.query(query);

      let migratedCount = 0;
      let skippedCount = 0;
      for (const row of result.rows) {
        try {
          // Decrypt credentials
          let creds;
          const credentialsData = row.credentials;

          if (typeof credentialsData === 'string') {
            creds = this.decryptConfig(credentialsData);
          } else if (typeof credentialsData === 'object' && credentialsData.iv && credentialsData.data && credentialsData.authTag) {
            creds = this.decryptConfig(JSON.stringify(credentialsData));
          } else {
            creds = credentialsData;
          }

          // If decryption returned empty object, skip this record
          if (!creds || Object.keys(creds).length === 0) {
            skippedCount++;
            continue;
          }

          // Check if migration is needed (has snake_case fields)
          const needsMigration =
            creds.access_token ||
            creds.refresh_token ||
            creds.client_secret ||
            creds.client_id ||
            creds.expires_at;

          if (needsMigration) {
            // Migrate to camelCase
            const migratedCreds = {
              ...creds,
              // OAuth fields
              ...(creds.access_token && { accessToken: creds.access_token }),
              ...(creds.refresh_token && { refreshToken: creds.refresh_token }),
              ...(creds.client_id && { clientId: creds.client_id }),
              ...(creds.client_secret && { clientSecret: creds.client_secret }),
              ...(creds.token_type && { tokenType: creds.token_type }),
              ...(creds.expires_at && { expiresAt: creds.expires_at }),
            };

            // Remove snake_case fields
            delete migratedCreds.access_token;
            delete migratedCreds.refresh_token;
            delete migratedCreds.client_id;
            delete migratedCreds.client_secret;
            delete migratedCreds.token_type;
            delete migratedCreds.expires_at;

            // Update in database
            await this.platformService.query(
              `UPDATE connector_configs SET credentials = $1 WHERE id = $2`,
              [this.encryptConfig(migratedCreds), row.id]
            );

            migratedCount++;
          }
        } catch (error) {
          // Decryption failure is expected for credentials encrypted with old keys
          skippedCount++;
        }
      }
    } catch (error) {
      this.logger.error('Credentials migration failed:', error);
    }
  }

  /**
   * Create a new connector configuration
   */
  async createConnectorConfig(
    dto: CreateConnectorConfigDto,
    context: AuthContext
  ): Promise<ConnectorConfig> {
    // Validate user context
    if (!context.userId) {
      throw new UnauthorizedException('User context is required');
    }

    // Check if connector type exists
    const connectorType = this.getConnectorByType(dto.connector_type);
    if (!connectorType) {
      throw new BadRequestException(`Unknown connector type: ${dto.connector_type}`);
    }

    // Encrypt sensitive configuration
    const encryptedConfig = this.encryptConfig(dto.config);

    // Validate multi-tenant context
    if (!context.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    if (!context.projectId) {
      throw new BadRequestException('Project ID is required');
    }

    // Check for duplicate name
    await this.validateUniqueConnectorName(dto.name, context.userId);

    // Create connector configuration with conflict handling
    const configId = uuidv4();

    // Debug: Log credential creation data
    this.logger.log(`Creating connector config for ${dto.connector_type}:`, {
      name: dto.name,
      config: dto.config,
      credentials: dto.credentials,
    });

    const insertQuery = `
      INSERT INTO connector_configs (
        id, connector_type, name, config, credentials, is_active,
        user_id, organization_id, project_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      configId,
      dto.connector_type,
      dto.name,
      encryptedConfig,
      this.encryptConfig(dto.credentials || {}),
      dto.enabled ?? true,
      context.userId,
      context.organizationId,
      context.projectId
    ];

    let result;
    try {
      result = await this.platformService.query(insertQuery, values);
    } catch (error) {
      // Handle unique constraint violation (PostgreSQL error code 23505)
      // or deadlock detected (PostgreSQL error code 40P01)
      if (error.code === '23505' || error.code === '40P01' || error.message?.includes('deadlock') || error.message?.includes('duplicate key')) {
        this.logger.warn(`Conflict or deadlock detected while creating credential "${dto.name}" for user ${context.userId}, fetching existing credential`);

        // Fetch the existing record (no JOIN - enrich with ConnectorLookup)
        const selectQuery = `
          SELECT cc.*
          FROM connector_configs cc
          WHERE cc.name = $1 AND cc.user_id = $2
        `;

        result = await this.platformService.query(selectQuery, [dto.name, context.userId]);

        // Enrich with connector definition data
        if (result.rows.length > 0) {
          const def = ConnectorLookup.getByName(result.rows[0].connector_type);
          if (def) {
            result.rows[0].display_name = def.display_name;
            result.rows[0].description = def.description;
            result.rows[0].category = def.category;
            result.rows[0].auth_type = def.auth_type;
          }
        }

        if (result.rows.length === 0) {
          // If we still can't find it, throw a more user-friendly error
          throw new ConflictException(`Connector name '${dto.name}' conflicts with existing connector. Please try again.`);
        }
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    const config = this.mapToConnectorConfig(result.rows[0]);

    // Decrypt config for response
    if (config.config) {
      if (typeof config.config === 'string') {
        config.config = this.decryptConfig(config.config);
      } else if (typeof config.config === 'object' && config.config.iv && config.config.data && config.config.authTag) {
        // Config is a JSONB object from PostgreSQL, stringify it first
        config.config = this.decryptConfig(JSON.stringify(config.config));
      }
    }

    // Decrypt credentials but REDACT sensitive fields before sending to client
    if (result.rows[0].credentials && typeof result.rows[0].credentials === 'string') {
      const decryptedCredentials = this.decryptConfig(result.rows[0].credentials);
      config['credentials'] = this.redactSensitiveFields(
        decryptedCredentials,
        config.connector_type
      );
    }

    // Register tools for this connector credential (for AI Agent use)
    await this.registerToolsForCredential(config.connector_type, config.id);

    return config;
  }

  /**
   * Register AI Agent tools for a connector credential
   * Called when credentials are saved to make connector actions available as tools
   */
  private async registerToolsForCredential(connectorType: string, credentialId: string): Promise<void> {
    if (!this.connectorToolProvider) {
      this.logger.debug('ConnectorToolProviderService not available, skipping tool registration');
      return;
    }

    try {
      // Check if connector is usable as tool
      const definition = ConnectorLookup.getByName(connectorType);
      if (definition?.usableAsTool === false) {
        this.logger.debug(`Connector ${connectorType} is not usable as a tool, skipping registration`);
        return;
      }

      await this.connectorToolProvider.registerToolsForCredential(connectorType, credentialId);
      this.logger.log(`Registered AI tools for connector ${connectorType} (credential: ${credentialId})`);
    } catch (error: any) {
      // Don't fail the credential save if tool registration fails
      this.logger.warn(`Failed to register tools for ${connectorType}: ${error.message}`);
    }
  }

  /**
   * Get connector credentials for system-level operations (polling, workflows, etc.)
   * This is public to allow services like GmailPollingService to fetch credentials
   */
  async getConnectorCredentials(id: string): Promise<any> {
    const config = await this.getConnectorConfigForSystem(id);
    return config['credentials'] || {};
  }

  /**
   * Get full connector config with decrypted values (for OAuth callbacks)
   * Returns both config and credentials decrypted
   */
  async getConnectorConfigDecrypted(id: string): Promise<ConnectorConfig> {
    return this.getConnectorConfigForSystem(id);
  }

  /**
   * Get a connector configuration by ID for system-level operations (no user check)
   */
  private async getConnectorConfigForSystem(id: string): Promise<ConnectorConfig> {
    const query = `
      SELECT cc.*
      FROM connector_configs cc
      WHERE cc.id = $1
    `;

    const result = await this.platformService.query(query, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundException(`Connector configuration not found: ${id}`);
    }

    // Enrich with connector definition data
    const def = ConnectorLookup.getByName(result.rows[0].connector_type);
    if (def) {
      result.rows[0].display_name = def.display_name;
      result.rows[0].description = def.description;
      result.rows[0].category = def.category;
      result.rows[0].auth_type = def.auth_type;
    }

    const config = this.mapToConnectorConfig(result.rows[0]);

    // Decrypt config for retrieval (non-sensitive settings)
    if (config.config) {
      if (typeof config.config === 'string') {
        config.config = this.decryptConfig(config.config);
      } else if (typeof config.config === 'object' && config.config.iv && config.config.data && config.config.authTag) {
        // Config is a JSONB object from PostgreSQL, stringify it first
        config.config = this.decryptConfig(JSON.stringify(config.config));
      }
    }

    // For system operations, we need the actual credentials, not redacted
    if (result.rows[0].credentials) {
      // OAuth credentials are stored with individually encrypted tokens, not double-encrypted
      if (result.rows[0].is_oauth) {
        let oauthCreds: any;
        if (typeof result.rows[0].credentials === 'string') {
          // Parse JSON string to get the credential object with encrypted tokens
          try {
            oauthCreds = JSON.parse(result.rows[0].credentials);
          } catch (err) {
            oauthCreds = result.rows[0].credentials;
          }
        } else {
          // Already an object
          oauthCreds = result.rows[0].credentials;
        }

        // Decrypt the individual OAuth tokens
        // Note: OAuth tokens are encrypted using the respective OAuth service's encryptToken()
        // which uses AES-256-CBC encryption (not AES-256-GCM like decryptConfig)

        // Determine which OAuth service to use based on connector type
        const connectorType = result.rows[0].connector_type;
        let oauthService: any;

        if (connectorType === 'linkedin') {
          oauthService = this.linkedinOAuthService;
        } else if (connectorType === 'twitter') {
          oauthService = this.twitterOAuthService;
        } else if (connectorType === 'github') {
          oauthService = this.githubOAuthService;
        } else if (connectorType === 'discord') {
          oauthService = this.discordOAuthService;
        } else if (connectorType === 'reddit') {
          oauthService = this.redditOAuthService;
        } else if (connectorType === 'shopify') {
          oauthService = this.shopifyOAuthService;
        } else if (connectorType === 'slack') {
          oauthService = this.slackOAuthService;
        } else if (connectorType === 'tiktok') {
          oauthService = this.tiktokOAuthService;
        } else {
          // Default to Google OAuth service for other connectors (gmail, google_sheets, etc.)
          oauthService = this.googleOAuthService;
        }

        // Helper to check if token looks encrypted (format: "hexIV:hexEncryptedData")
        const looksEncrypted = (token: string): boolean => {
          if (!token || typeof token !== 'string') return false;
          const parts = token.split(':');
          // Encrypted tokens have format "32charHexIV:hexEncryptedData"
          return parts.length === 2 && parts[0].length === 32 && /^[0-9a-f]+$/i.test(parts[0]);
        };

        // Decrypt access token (only if it looks encrypted)
        if (oauthCreds.accessToken) {
          if (looksEncrypted(oauthCreds.accessToken)) {
            try {
              const decryptedAccessToken = oauthService.decryptToken(oauthCreds.accessToken);
              oauthCreds.accessToken = decryptedAccessToken;
            } catch (err) {
              // Keep original token if decryption fails
              this.logger.warn('Failed to decrypt access token, using as-is');
            }
          }
          // If not encrypted, token is already plain - use as-is
        }

        // Decrypt refresh token (only if it looks encrypted)
        if (oauthCreds.refreshToken) {
          if (looksEncrypted(oauthCreds.refreshToken)) {
            try {
              const decryptedRefreshToken = oauthService.decryptToken(oauthCreds.refreshToken);
              oauthCreds.refreshToken = decryptedRefreshToken;
            } catch (err) {
              // Keep original token if decryption fails
              this.logger.warn('Failed to decrypt refresh token, using as-is');
            }
          }
          // If not encrypted, token is already plain - use as-is
        }

        // Decrypt bot token (for Discord OAuth2, only if it looks encrypted)
        if (oauthCreds.botToken) {
          if (looksEncrypted(oauthCreds.botToken)) {
            try {
              const decryptedBotToken = oauthService.decryptToken(oauthCreds.botToken);
              oauthCreds.botToken = decryptedBotToken;
            } catch (err) {
              // Keep original token if decryption fails
              this.logger.warn('Failed to decrypt bot token, using as-is');
            }
          }
        }

        // Decrypt botTokenOAuth (for Discord OAuth2, only if it looks encrypted)
        if (oauthCreds.botTokenOAuth) {
          if (looksEncrypted(oauthCreds.botTokenOAuth)) {
            try {
              const decryptedBotTokenOAuth = oauthService.decryptToken(oauthCreds.botTokenOAuth);
              oauthCreds.botTokenOAuth = decryptedBotTokenOAuth;
            } catch (err) {
              // Keep original token if decryption fails
              this.logger.warn('Failed to decrypt botTokenOAuth, using as-is');
            }
          }
        }

        // Add expiresAt from oauth_expires_at column if not already in credentials
        // This is critical for token refresh logic to work correctly
        if (result.rows[0].oauth_expires_at && !oauthCreds.expiresAt) {
          oauthCreds.expiresAt = result.rows[0].oauth_expires_at;
        }

        config['credentials'] = oauthCreds;
      } else {
        // Non-OAuth credentials use full encryption
        if (typeof result.rows[0].credentials === 'string') {
          config['credentials'] = this.decryptConfig(result.rows[0].credentials);
        } else if (typeof result.rows[0].credentials === 'object' && result.rows[0].credentials.iv && result.rows[0].credentials.data && result.rows[0].credentials.authTag) {
          // Credentials are a JSONB object from PostgreSQL, stringify it first
          config['credentials'] = this.decryptConfig(JSON.stringify(result.rows[0].credentials));
        } else {
          // Credentials might be stored as plain object (for backwards compatibility)
          config['credentials'] = result.rows[0].credentials;
        }
      }
    }

    // For database connectors (mysql, postgresql), credentials might be stored in config field
    // Check if credentials are missing or empty but config has credential-like fields
    const connectorType = result.rows[0].connector_type;
    const dbConnectors = ['mysql', 'postgresql'];
    const credentialKeys = ['host', 'user', 'password', 'database', 'port'];

    if (dbConnectors.includes(connectorType)) {
      const configData = config.config || {};
      const existingCredentials = config['credentials'] || {};

      // Check if config has credential fields that are missing from credentials
      const configHasCredentials = credentialKeys.some(key => configData[key] !== undefined);
      const credentialsAreMissing = !existingCredentials.host && !existingCredentials.user;

      if (configHasCredentials && credentialsAreMissing) {
        // Merge credential fields from config into credentials
        config['credentials'] = {
          ...existingCredentials,
          ...Object.fromEntries(
            credentialKeys
              .filter(key => configData[key] !== undefined)
              .map(key => [key, configData[key]])
          )
        };
      }
    }

    return config;
  }

  /**
   * Get a connector configuration by ID
   */
  async getConnectorConfig(id: string, context: AuthContext): Promise<ConnectorConfig> {
    const conditions = ['cc.id = $1'];
    const params: any[] = [id];
    let paramIndex = 2;

    // Add multi-tenant filtering
    if (context.organizationId) {
      conditions.push(`cc.organization_id = $${paramIndex}`);
      params.push(context.organizationId);
      paramIndex++;
    }
    if (context.projectId) {
      conditions.push(`cc.project_id = $${paramIndex}`);
      params.push(context.projectId);
      paramIndex++;
    }

    const query = `
      SELECT cc.*
      FROM connector_configs cc
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await this.platformService.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundException(`Connector configuration not found: ${id}`);
    }

    // Enrich with connector definition data
    const def = ConnectorLookup.getByName(result.rows[0].connector_type);
    if (def) {
      result.rows[0].display_name = def.display_name;
      result.rows[0].description = def.description;
      result.rows[0].category = def.category;
      result.rows[0].auth_type = def.auth_type;
    }

    const config = this.mapToConnectorConfig(result.rows[0]);

    // Decrypt config for retrieval (non-sensitive settings)
    if (config.config) {
      if (typeof config.config === 'string') {
        config.config = this.decryptConfig(config.config);
      } else if (typeof config.config === 'object' && config.config.iv && config.config.data && config.config.authTag) {
        // Config is a JSONB object from PostgreSQL, stringify it first
        config.config = this.decryptConfig(JSON.stringify(config.config));
      }
    }

    // Decrypt credentials but REDACT sensitive fields before sending to client
    if (result.rows[0].credentials) {
      // OAuth credentials need special handling (same as getConnectorConfigForSystem)
      if (result.rows[0].is_oauth) {
        let oauthCreds: any;
        if (typeof result.rows[0].credentials === 'string') {
          try {
            oauthCreds = JSON.parse(result.rows[0].credentials);
          } catch (err) {
            this.logger.error('Failed to parse OAuth credentials:', err);
            oauthCreds = result.rows[0].credentials;
          }
        } else {
          oauthCreds = result.rows[0].credentials;
        }

        // Determine which OAuth service to use based on connector type
        const connectorType = result.rows[0].connector_type;
        let oauthService: any;

        if (connectorType === 'linkedin') {
          oauthService = this.linkedinOAuthService;
        } else if (connectorType === 'twitter') {
          oauthService = this.twitterOAuthService;
        } else if (connectorType === 'github') {
          oauthService = this.githubOAuthService;
        } else if (connectorType === 'discord') {
          oauthService = this.discordOAuthService;
        } else if (connectorType === 'reddit') {
          oauthService = this.redditOAuthService;
        } else if (connectorType === 'shopify') {
          oauthService = this.shopifyOAuthService;
        } else if (connectorType === 'slack') {
          oauthService = this.slackOAuthService;
        } else if (connectorType === 'tiktok') {
          oauthService = this.tiktokOAuthService;
        } else {
          oauthService = this.googleOAuthService;
        }

        // Helper to check if token looks encrypted (format: "hexIV:hexEncryptedData")
        const looksEncrypted = (token: string): boolean => {
          if (!token || typeof token !== 'string') return false;
          const parts = token.split(':');
          // Encrypted tokens have format "32charHexIV:hexEncryptedData"
          return parts.length === 2 && parts[0].length === 32 && /^[0-9a-f]+$/i.test(parts[0]);
        };

        // Decrypt OAuth tokens (only if they look encrypted)
        if (oauthCreds.accessToken && looksEncrypted(oauthCreds.accessToken)) {
          try {
            oauthCreds.accessToken = oauthService.decryptToken(oauthCreds.accessToken);
          } catch (err) {
            this.logger.error('Failed to decrypt access token:', err);
          }
        }

        if (oauthCreds.refreshToken && looksEncrypted(oauthCreds.refreshToken)) {
          try {
            oauthCreds.refreshToken = oauthService.decryptToken(oauthCreds.refreshToken);
          } catch (err) {
            this.logger.error('Failed to decrypt refresh token:', err);
          }
        }

        config['credentials'] = this.redactSensitiveFields(oauthCreds, config.connector_type);
      } else if (typeof result.rows[0].credentials === 'string') {
        // Non-OAuth credentials use full encryption
        const decryptedCredentials = this.decryptConfig(result.rows[0].credentials);
        config['credentials'] = this.redactSensitiveFields(
          decryptedCredentials,
          config.connector_type
        );
      }
    }

    return config;
  }

  /**
   * List connector configurations with filtering and pagination
   */
  async listConnectorConfigs(
    query: ConnectorListQueryDto,
    context: AuthContext
  ): Promise<{ connectors: ConnectorConfig[]; total: number; limit: number; offset: number }> {
    // Debug logging to diagnose empty results issue
    this.logger.log(`[listConnectorConfigs] Context: orgId=${context.organizationId}, projectId=${context.projectId}, userId=${context.userId}`);

    // Strict validation - organization is required
    if (!context.organizationId) {
      throw new BadRequestException(
        'Organization ID is required. Ensure x-organization-id header is set.'
      );
    }

    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    // Build WHERE conditions - connectors are org-scoped (shared across all projects)
    let whereConditions: string[] = [];
    let values: any[] = [];
    let paramIndex = 1;

    // Filter by organization only (connectors are shared across projects)
    whereConditions.push(`cc.organization_id = $${paramIndex}`);
    values.push(context.organizationId);
    paramIndex++;

    // Note: project_id filter removed - connectors are organization-wide

    // Add query filters
    if (query.connector_type) {
      whereConditions.push(`cc.connector_type = $${paramIndex}`);
      values.push(query.connector_type);
      paramIndex++;
    }
    if (query.enabled !== undefined) {
      whereConditions.push(`cc.is_active = $${paramIndex}`);
      values.push(query.enabled);
      paramIndex++;
    }
    if (query.status) {
      // Map status to is_active since connector_configs uses boolean
      const isActive = query.status === 'active';
      whereConditions.push(`cc.is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order || 'desc';

    // Debug: Log the query being built
    this.logger.log(`[listConnectorConfigs] WHERE: ${whereClause}`);
    this.logger.log(`[listConnectorConfigs] VALUES: ${JSON.stringify(values)}`);

    // Determine the sort column with proper table alias
    let sortColumn = 'cc.created_at';
    if (sortBy === 'name') sortColumn = 'cc.name';
    else if (sortBy === 'updated_at') sortColumn = 'cc.updated_at';
    else if (sortBy === 'connector_type') sortColumn = 'cc.connector_type';

    // Get total count (no JOIN needed)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM connector_configs cc
      WHERE ${whereClause}
    `;
    const countResult = await this.platformService.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);
    this.logger.log(`[listConnectorConfigs] Total count: ${total}`);

    // Get paginated results (no JOIN - enrich with ConnectorLookup)
    const dataQuery = `
      SELECT cc.*
      FROM connector_configs cc
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const dataResult = await this.platformService.query(dataQuery, values);
    const connectors = dataResult.rows.map(row => {
      // Enrich with connector definition data
      const def = ConnectorLookup.getByName(row.connector_type);
      if (def) {
        row.display_name = def.display_name;
        row.description = def.description;
        row.category = def.category;
        row.auth_type = def.auth_type;
      }

      const config = this.mapToConnectorConfig(row);
      
      // Decrypt config to extract authType, but only return authType
      if (row.config) {
        try {
          let decryptedConfig;
          if (typeof row.config === 'string') {
            decryptedConfig = this.decryptConfig(row.config);
          } else if (typeof row.config === 'object' && row.config.iv && row.config.data && row.config.authTag) {
            decryptedConfig = this.decryptConfig(JSON.stringify(row.config));
          }
          
          // Only return authType from config for filtering purposes
          config.config = {
            authType: decryptedConfig?.authType
          };
        } catch (error) {
          this.logger.error('Failed to decrypt config for authType:', error);
          config.config = {};
        }
      } else {
        config.config = {};
      }
      
      return config;
    });

    return { connectors, total, limit, offset };
  }

  /**
   * Update a connector configuration
   */
  async updateConnectorConfig(
    id: string,
    dto: UpdateConnectorConfigDto,
    context: AuthContext
  ): Promise<ConnectorConfig> {
    // Get existing configuration (this returns redacted credentials)
    const existing = await this.getConnectorConfig(id, context);

    // Validate unique name if changed
    if (dto.name && dto.name !== existing.name) {
      await this.validateUniqueConnectorName(
        dto.name,
        context.userId,
        id // Exclude current connector from uniqueness check
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(dto.name);
      paramIndex++;
    }
    if (dto.config !== undefined) {
      updates.push(`config = $${paramIndex}`);
      values.push(this.encryptConfig(dto.config));
      paramIndex++;
    }
    if (dto.credentials !== undefined) {
      // Handle credential updates with unredaction
      // Fetch the original encrypted credentials from DB
      const originalQuery = `SELECT credentials FROM connector_configs WHERE id = $1 AND user_id = $2`;
      const originalResult = await this.platformService.query(originalQuery, [id, context.userId]);

      if (originalResult.rows.length > 0 && originalResult.rows[0].credentials) {
        // Decrypt credentials - handle both string and JSONB object formats
        let originalDecrypted;
        const credentialsData = originalResult.rows[0].credentials;
        if (typeof credentialsData === 'string') {
          originalDecrypted = this.decryptConfig(credentialsData);
        } else if (typeof credentialsData === 'object' && credentialsData.iv && credentialsData.data && credentialsData.authTag) {
          // JSONB object from PostgreSQL, stringify it first
          originalDecrypted = this.decryptConfig(JSON.stringify(credentialsData));
        } else {
          originalDecrypted = credentialsData;
        }

        // Merge: keep original values for redacted fields, use new values for changed fields
        const mergedCredentials = this.unredactCredentials(dto.credentials, originalDecrypted);
        updates.push(`credentials = $${paramIndex}`);
        values.push(this.encryptConfig(mergedCredentials));
      } else {
        // No existing credentials, just encrypt new ones
        updates.push(`credentials = $${paramIndex}`);
        values.push(this.encryptConfig(dto.credentials));
      }
      paramIndex++;
    }
    if (dto.enabled !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(dto.enabled);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    // Build WHERE clause with multi-tenant filtering
    const whereConditions: string[] = [`id = $${paramIndex}`];
    values.push(id);
    paramIndex++;

    if (context.organizationId) {
      whereConditions.push(`organization_id = $${paramIndex}`);
      values.push(context.organizationId);
      paramIndex++;
    }
    if (context.projectId) {
      whereConditions.push(`project_id = $${paramIndex}`);
      values.push(context.projectId);
      paramIndex++;
    }

    const updateQuery = `
      UPDATE connector_configs
      SET ${updates.join(', ')}
      WHERE ${whereConditions.join(' AND ')}
      RETURNING *
    `;

    const result = await this.platformService.query(updateQuery, values);

    if (result.rows.length === 0) {
      throw new NotFoundException(`Connector configuration not found: ${id}`);
    }

    const updated = this.mapToConnectorConfig(result.rows[0]);

    // Decrypt config for response
    if (updated.config) {
      if (typeof updated.config === 'string') {
        updated.config = this.decryptConfig(updated.config);
      } else if (typeof updated.config === 'object' && updated.config.iv && updated.config.data && updated.config.authTag) {
        // Config is a JSONB object from PostgreSQL, stringify it first
        updated.config = this.decryptConfig(JSON.stringify(updated.config));
      }
    }

    // Return redacted credentials in response
    if (result.rows[0].credentials && typeof result.rows[0].credentials === 'string') {
      const decryptedCredentials = this.decryptConfig(result.rows[0].credentials);
      updated['credentials'] = this.redactSensitiveFields(
        decryptedCredentials,
        updated.connector_type
      );
    }

    return updated;
  }

  /**
   * Delete a connector configuration
   */
  async deleteConnectorConfig(id: string, context: AuthContext): Promise<void> {
    // Build WHERE clause with multi-tenant filtering
    const whereConditions: string[] = ['id = $1'];
    const params: any[] = [id];
    let paramIndex = 2;

    if (context.organizationId) {
      whereConditions.push(`organization_id = $${paramIndex}`);
      params.push(context.organizationId);
      paramIndex++;
    }
    if (context.projectId) {
      whereConditions.push(`project_id = $${paramIndex}`);
      params.push(context.projectId);
      paramIndex++;
    }

    const query = `
      DELETE FROM connector_configs
      WHERE ${whereConditions.join(' AND ')}
      RETURNING id
    `;

    const result = await this.platformService.query(query, params);

    if (result.rows.length === 0) {
      throw new NotFoundException(`Connector configuration not found: ${id}`);
    }
  }

  /**
   * Test a connector connection
   */
  async testConnectorConnection(
    id: string,
    dto: TestConnectorDto,
    context: AuthContext
  ): Promise<ConnectorTestResultDto> {
    const config = await this.getConnectorConfig(id, context);
    
    if (!config.enabled) {
      throw new BadRequestException('Cannot test disabled connector');
    }

    const startTime = Date.now();

    try {
      // Get the full config with decrypted credentials
      const fullConfig = await this.getConnectorConfig(id, context);

      // Decrypt credentials from the database
      const credentialsQuery = `
        SELECT credentials, is_oauth, connector_type FROM connector_configs WHERE id = $1
      `;
      const credentialsResult = await this.platformService.query(credentialsQuery, [id]);
      const encryptedCredentials = credentialsResult.rows[0]?.credentials;
      const isOAuth = credentialsResult.rows[0]?.is_oauth;
      const connectorType = credentialsResult.rows[0]?.connector_type;

      let decryptedCredentials: any = {};

      if (encryptedCredentials) {
        // OAuth credentials need special handling
        if (isOAuth) {
          let oauthCreds: any;
          if (typeof encryptedCredentials === 'string') {
            try {
              oauthCreds = JSON.parse(encryptedCredentials);
            } catch (err) {
              oauthCreds = encryptedCredentials;
            }
          } else {
            oauthCreds = encryptedCredentials;
          }

          // Determine which OAuth service to use based on connector type
          let oauthService: any;

          if (connectorType === 'linkedin') {
            oauthService = this.linkedinOAuthService;
          } else if (connectorType === 'twitter') {
            oauthService = this.twitterOAuthService;
          } else if (connectorType === 'github') {
            oauthService = this.githubOAuthService;
          } else if (connectorType === 'discord') {
            oauthService = this.discordOAuthService;
          } else if (connectorType === 'reddit') {
            oauthService = this.redditOAuthService;
          } else if (connectorType === 'shopify') {
            oauthService = this.shopifyOAuthService;
          } else if (connectorType === 'slack') {
            oauthService = this.slackOAuthService;
          } else if (connectorType === 'tiktok') {
            oauthService = this.tiktokOAuthService;
          } else {
            // Default to Google OAuth service
            oauthService = this.googleOAuthService;
          }

          // Decrypt OAuth tokens
          if (oauthCreds.accessToken) {
            try {
              const decryptedAccessToken = oauthService.decryptToken(oauthCreds.accessToken);
              oauthCreds.accessToken = decryptedAccessToken;
            } catch (err) {
              // Keep encrypted token if decryption fails
            }
          }

          if (oauthCreds.refreshToken) {
            try {
              const decryptedRefreshToken = oauthService.decryptToken(oauthCreds.refreshToken);
              oauthCreds.refreshToken = decryptedRefreshToken;
            } catch (err) {
              // Keep encrypted token if decryption fails
            }
          }

          decryptedCredentials = oauthCreds;
        } else {
          // Non-OAuth credentials use full encryption
          decryptedCredentials = this.decryptConfig(encryptedCredentials);
        }
      }

      // Create internal connector config
      const connectorConfig: InternalConnectorConfig = {
        id: config.id,
        name: config.name,
        type: config.connector_type as any,
        category: config.metadata?.category as any || ConnectorCategory.COMMUNICATION,
        credentials: decryptedCredentials,
        settings: fullConfig.config || {},
        isActive: config.enabled
      };

      // Test the connector
      const testResult = await this.connectorFactory.testConnector(connectorConfig);
      
      const duration = Date.now() - startTime;
      const result: ConnectorTestResultDto = {
        success: testResult.success,
        message: testResult.success 
          ? `Connection test for ${config.connector_type} successful`
          : testResult.error || 'Connection test failed',
        latency_ms: duration,
        details: {
          connector_type: config.connector_type,
          tested_at: new Date().toISOString(),
          ...(testResult.metadata || {})
        },
        duration_ms: duration,
        tested_at: new Date().toISOString()
      };

      // Update last_tested timestamp
      await this.platformService.query(
        `UPDATE connector_configs SET last_tested_at = NOW() WHERE id = $1`,
        [id]
      );

      // Log test result
      await this.logConnectorUsage(id, 'test', result.success, context, result.latency_ms);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log failed test
      await this.logConnectorUsage(
        id, 
        'test', 
        false, 
        context, 
        duration,
        error.message
      );

      return {
        success: false,
        error: {
          message: error.message || 'Connection test failed',
          code: error.code || 'CONNECTION_TEST_FAILED',
          details: error.stack
        },
        latency_ms: duration,
        details: {
          connector_type: config.connector_type,
          tested_at: new Date().toISOString()
        },
        duration_ms: duration,
        tested_at: new Date().toISOString()
      };
    }
  }

  /**
   * Get available models for a connector (e.g., AI models)
   */
  async getConnectorModels(
    id: string,
    context: AuthContext
  ): Promise<{ models: string[] }> {
    const config = await this.getConnectorConfig(id, context);

    if (!config.enabled) {
      throw new BadRequestException('Cannot get models from disabled connector');
    }

    try {
      // Get the full config with decrypted credentials
      const credentialsQuery = `
        SELECT credentials FROM connector_configs WHERE id = $1
      `;
      const credentialsResult = await this.platformService.query(credentialsQuery, [id]);
      const encryptedCredentials = credentialsResult.rows[0]?.credentials;
      const decryptedCredentials = encryptedCredentials ? this.decryptConfig(encryptedCredentials) : {};

      // Create internal connector config
      const connectorConfig: InternalConnectorConfig = {
        id: config.id,
        name: config.name,
        type: config.connector_type as any,
        category: config.metadata?.category as any || ConnectorCategory.COMMUNICATION,
        credentials: decryptedCredentials,
        settings: config.config || {},
        isActive: config.enabled
      };

      // Create connector instance
      const connector = await this.connectorFactory.createConnector(connectorConfig);

      // Check if connector has getAvailableModels method (IAIConnector)
      if ('getAvailableModels' in connector && typeof connector.getAvailableModels === 'function') {
        const models = await (connector as any).getAvailableModels();
        return { models };
      }

      throw new BadRequestException('This connector does not support model listing');
    } catch (error) {
      this.logger.error(`Error getting models for connector ${id}:`, error);
      throw new BadRequestException(error.message || 'Failed to get available models');
    }
  }

  /**
   * Execute an action on a connector
   */
  async executeConnectorAction(
    id: string,
    dto: ConnectorActionDto,
    context: AuthContext
  ): Promise<ConnectorActionResultDto> {
    // First verify user has access to this connector (if user context exists)
    if (context.userId) {
      await this.getConnectorConfig(id, context);
    }

    // Always get unredacted credentials for execution using system method
    const config = await this.getConnectorConfigForSystem(id);

    if (!config.enabled) {
      throw new BadRequestException('Cannot execute action on disabled connector');
    }

    const startTime = Date.now();

    try {
      // Already have the config, no need to fetch again
      const fullConfig = config;

      // Use credentials from config (already decrypted by getConnectorConfigForSystem)
      const decryptedCredentials = config['credentials'] || {};

      // DEBUG: Log credentials to see organization_support
      this.logger.log('DEBUG executeConnectorAction - credentials:', {
        connectorType: config.connector_type,
        organization_support: decryptedCredentials.organization_support,
        credentialKeys: Object.keys(decryptedCredentials),
      });

      // Create internal connector config
      const connectorConfig: InternalConnectorConfig = {
        id: config.id,
        name: config.name,
        type: config.connector_type as any,
        category: config.metadata?.category as any || ConnectorCategory.COMMUNICATION,
        credentials: decryptedCredentials,
        settings: fullConfig.config || {},
        isActive: config.enabled
      };

      // Create connector instance
      const connector = await this.connectorFactory.createConnector(connectorConfig);
      
      // Execute the action
      const actionResult = await connector.executeAction(dto.action, dto.parameters);

      // Prepare response
      const result: ConnectorActionResultDto = {
        success: actionResult.success,
        data: actionResult.data,
        // Include error from actionResult if present (when success is false)
        ...(actionResult.error && { error: actionResult.error }),
        metadata: {
          connector_type: config.connector_type,
          execution_time_ms: Date.now() - startTime,
          ...(actionResult.metadata || {})
        },
        executed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      };

      // Log execution (only if we have a user context)
      if (context.userId) {
        await this.logConnectorUsage(
          id,
          dto.action,
          actionResult.success,
          context,
          result.duration_ms,
          actionResult.error?.message
        );
      }

      // Clean up connector
      await connector.destroy();

      return result;
    } catch (error) {
      // Log failed execution (only if we have a user context)
      if (context.userId) {
        await this.logConnectorUsage(
          id, 
          dto.action, 
          false, 
          context, 
          Date.now() - startTime,
          error.message
        );
      }

      // Return error response
      return {
        success: false,
        data: null,
        error: {
          message: error.message,
          code: error.code || 'CONNECTOR_ACTION_FAILED',
          details: error.details || {}
        },
        metadata: {
          connector_type: config.connector_type,
          execution_time_ms: Date.now() - startTime
        },
        executed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Get dynamic resources from a connector (for populating dropdowns)
   */
  async getConnectorResource(
    id: string,
    resourceType: 'spreadsheets' | 'sheets' | 'columns' | 'calendars' | 'drives' | 'folders' | 'files' | 'schemas' | 'tables' | 'table-columns' | 'table-schema' | 'databases',
    params: any,
    context: AuthContext
  ): Promise<Array<{ label: string; value: string }>> {
    // First verify user has access to this connector
    const userConfig = await this.getConnectorConfig(id, context);

    if (!userConfig.enabled) {
      throw new BadRequestException('Cannot fetch resources from disabled connector');
    }

    try {
      // Get the full config with unredacted credentials for system operations
      const config = await this.getConnectorConfigForSystem(id);

      // Decrypt credentials (already done by getConnectorConfigForSystem)
      const decryptedCredentials = config['credentials'] || {};

      // Create internal connector config
      const connectorConfig: InternalConnectorConfig = {
        id: config.id,
        name: config.name,
        type: config.connector_type as any,
        category: config.metadata?.category as any || ConnectorCategory.COMMUNICATION,
        credentials: decryptedCredentials,
        settings: config.config || {},
        isActive: config.enabled
      };

      // Create connector instance
      const connector = await this.connectorFactory.createConnector(connectorConfig);

      let result: Array<{ label: string; value: string }> = [];

      // Call the appropriate resource method based on resourceType
      if (resourceType === 'spreadsheets' && typeof connector['getSpreadsheets'] === 'function') {
        result = await connector['getSpreadsheets']();
      } else if (resourceType === 'sheets' && typeof connector['getSheetsFromSpreadsheet'] === 'function') {
        if (!params.spreadsheetId) {
          throw new BadRequestException('spreadsheetId is required for fetching sheets');
        }
        result = await connector['getSheetsFromSpreadsheet'](params.spreadsheetId);
      } else if (resourceType === 'columns' && typeof connector['getColumnHeaders'] === 'function') {
        if (!params.spreadsheetId || !params.sheetName) {
          throw new BadRequestException('spreadsheetId and sheetName are required for fetching columns');
        }
        result = await connector['getColumnHeaders'](params.spreadsheetId, params.sheetName);
      } else if (resourceType === 'calendars' && typeof connector['getCalendars'] === 'function') {
        result = await connector['getCalendars']();
      } else if (resourceType === 'drives' && typeof connector['getDrives'] === 'function') {
        result = await connector['getDrives']();
      } else if (resourceType === 'folders' && typeof connector['getFolders'] === 'function') {
        result = await connector['getFolders'](params.driveId, params.parentFolderId);
      } else if (resourceType === 'files' && typeof connector['getFilesInFolder'] === 'function') {
        result = await connector['getFilesInFolder'](params.folderId);
      } else if (resourceType === 'schemas' && typeof connector['getSchemas'] === 'function') {
        result = await connector['getSchemas']();
      } else if (resourceType === 'tables' && typeof connector['getTables'] === 'function') {
        // MySQL uses databases (from pool config), PostgreSQL uses schemas
        if (config.connector_type === 'mysql') {
          // For MySQL: getTables() with no parameter uses the database from pool config
          result = await connector['getTables']();
        } else {
          // For PostgreSQL: getTables(schema)
          result = await connector['getTables'](params.schema || 'public');
        }
      } else if (resourceType === 'table-columns' && typeof connector['getColumns'] === 'function') {
        if (!params.table) {
          throw new BadRequestException('table parameter is required for fetching columns');
        }
        // MySQL: getColumns(table, database?) - database is optional, uses pool config
        // PostgreSQL: getColumns(schema, table) - schema is required
        if (config.connector_type === 'mysql') {
          result = await connector['getColumns'](params.table);
        } else {
          result = await connector['getColumns'](params.schema || 'public', params.table);
        }
      } else if (resourceType === 'table-schema' && typeof connector['getTableSchema'] === 'function') {
        if (!params.table) {
          throw new BadRequestException('table parameter is required for fetching table schema');
        }
        // MySQL: getTableSchema(tableName, database?)
        // PostgreSQL: getTableSchema(schema, table)
        if (config.connector_type === 'mysql') {
          result = await connector['getTableSchema'](params.table);
        } else {
          result = await connector['getTableSchema'](params.schema || 'public', params.table);
        }
      } else if (resourceType === 'databases' && typeof connector['getProjects'] === 'function') {
        // Get Notion databases (which are called "projects" in the PM interface)
        const response = await connector['getProjects']({ pageSize: 100 });
        if (response.success && response.data) {
          result = response.data.map((db: any) => ({
            label: db.name || 'Untitled Database',
            value: db.id
          }));
        } else {
          result = [];
        }
      } else {
        throw new BadRequestException(`Resource type '${resourceType}' is not supported for this connector`);
      }

      // Clean up connector
      await connector.destroy();

      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch ${resourceType} for connector ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to fetch ${resourceType}: ${error.message}`);
    }
  }

  /**
   * Get connector usage statistics
   */
  async getConnectorUsageStats(
    id: string,
    query: ConnectorUsageQueryDto,
    context: AuthContext
  ): Promise<ConnectorUsageStatsDto> {
    // Verify access to connector
    await this.getConnectorConfig(id, context);

    const whereConditions = ['connector_config_id = $1'];
    const values: any[] = [id];
    let paramIndex = 2;

    if (query.start_date) {
      whereConditions.push(`executed_at >= $${paramIndex}`);
      values.push(query.start_date);
      paramIndex++;
    }
    if (query.end_date) {
      whereConditions.push(`executed_at <= $${paramIndex}`);
      values.push(query.end_date);
      paramIndex++;
    }
    if (query.action) {
      whereConditions.push(`action = $${paramIndex}`);
      values.push(query.action);
      paramIndex++;
    }
    if (query.status) {
      whereConditions.push(`status = $${paramIndex}`);
      values.push(query.status);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const statsQuery = `
      SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_executions,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_executions,
        AVG(execution_time_ms) as avg_execution_time,
        MIN(execution_time_ms) as min_execution_time,
        MAX(execution_time_ms) as max_execution_time,
        COUNT(DISTINCT action) as unique_actions,
        COUNT(DISTINCT DATE(executed_at)) as active_days
      FROM connector_execution_logs
      WHERE ${whereClause}
    `;

    const result = await this.platformService.query(statsQuery, values);
    const stats = result.rows[0];

    return {
      total_executions: parseInt(stats.total_executions),
      successful_executions: parseInt(stats.successful_executions),
      failed_executions: parseInt(stats.failed_executions),
      success_rate: stats.total_executions > 0 
        ? (stats.successful_executions / stats.total_executions) * 100 
        : 0,
      avg_execution_time_ms: parseFloat(stats.avg_execution_time) || 0,
      min_execution_time_ms: parseFloat(stats.min_execution_time) || 0,
      max_execution_time_ms: parseFloat(stats.max_execution_time) || 0,
      unique_actions: parseInt(stats.unique_actions),
      active_days: parseInt(stats.active_days),
      period: {
        start_date: query.start_date,
        end_date: query.end_date
      },
      actions_by_type: {} // Would need a separate query to get this
    };
  }

  /**
   * Get connector usage logs
   */
  async getConnectorUsageLogs(
    id: string,
    query: ConnectorUsageQueryDto,
    context: AuthContext
  ): Promise<{ logs: ConnectorUsageLog[]; total: number; limit: number; offset: number }> {
    // Verify access to connector
    await this.getConnectorConfig(id, context);

    const limit = Math.min(query.limit || 100, 200);
    const offset = query.offset || 0;

    const whereConditions = ['connector_config_id = $1'];
    const values: any[] = [id];
    let paramIndex = 2;

    if (query.start_date) {
      whereConditions.push(`executed_at >= $${paramIndex}`);
      values.push(query.start_date);
      paramIndex++;
    }
    if (query.end_date) {
      whereConditions.push(`executed_at <= $${paramIndex}`);
      values.push(query.end_date);
      paramIndex++;
    }
    if (query.action) {
      whereConditions.push(`action = $${paramIndex}`);
      values.push(query.action);
      paramIndex++;
    }
    if (query.status) {
      whereConditions.push(`status = $${paramIndex}`);
      values.push(query.status);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM connector_execution_logs
      WHERE ${whereClause}
    `;
    const countResult = await this.platformService.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated logs
    const logsQuery = `
      SELECT *
      FROM connector_execution_logs
      WHERE ${whereClause}
      ORDER BY executed_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const logsResult = await this.platformService.query(logsQuery, values);
    const logs = logsResult.rows.map(row => this.mapToUsageLog(row));

    return { logs, total, limit, offset };
  }

  /**
   * Get list of available connector types
   * Only returns verified connectors (verified = true)
   * Now reads from TypeScript constants instead of database
   */
  async getAvailableConnectors(): Promise<ConnectorMetadata[]> {
    // Read directly from constants - no database query needed
    return ConnectorLookup.getAll().map(def => ConnectorLookup.toMetadata(def));
  }

  /**
   * Get metadata for a specific connector type
   * Now reads from TypeScript constants instead of database
   */
  async getConnectorMetadata(connectorType: string): Promise<ConnectorMetadata | null> {
    const def = ConnectorLookup.getByName(connectorType);
    if (!def) {
      return null;
    }
    return ConnectorLookup.toMetadata(def);
  }

  /**
   * Get actions for a specific connector
   * Now reads from TypeScript constants instead of database
   */
  async getConnectorActions(connectorType: string): Promise<any[]> {
    return ConnectorLookup.getActions(connectorType);
  }

  /**
   * Get triggers for a specific connector
   * Now reads from TypeScript constants instead of database
   */
  async getConnectorTriggers(connectorType: string): Promise<any[]> {
    return ConnectorLookup.getTriggers(connectorType);
  }

  /**
   * Handle OAuth callback - Exchange authorization code for access tokens
   */
  async handleOAuthCallback(
    id: string,
    code: string,
    state: string,
    context: AuthContext,
    codeVerifier?: string
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.getConnectorConfig(id, context);
    const metadata = await this.getConnectorMetadata(config.connector_type);

    if (!metadata?.oauth_config) {
      throw new BadRequestException('Connector does not support OAuth');
    }

    try {
      // Fetch original encrypted credentials to get client_secret
      const originalQuery = `SELECT credentials FROM connector_configs WHERE id = $1 AND user_id = $2`;
      const originalResult = await this.platformService.query(originalQuery, [id, context.userId]);

      if (!originalResult.rows[0]?.credentials) {
        throw new BadRequestException('Connector credentials not found');
      }

      // Decrypt credentials - handle both string and JSONB object formats
      let originalCredentials;
      const credentialsData = originalResult.rows[0].credentials;
      if (typeof credentialsData === 'string') {
        originalCredentials = this.decryptConfig(credentialsData);
      } else if (typeof credentialsData === 'object' && credentialsData.iv && credentialsData.data && credentialsData.authTag) {
        // JSONB object from PostgreSQL, stringify it first
        originalCredentials = this.decryptConfig(JSON.stringify(credentialsData));
      } else {
        originalCredentials = credentialsData;
      }

      // Support both camelCase and snake_case for backward compatibility
      // Check both credentials and config for OAuth client secret
      const clientSecret = originalCredentials.clientSecret ||
                          originalCredentials.client_secret ||
                          config.config.clientSecret ||
                          config.config.client_secret;
      const clientId = config.config.clientId || config.config.client_id || '';

      if (!clientSecret) {
        throw new BadRequestException('Client secret not configured');
      }

      // Prepare token exchange request params
      const tokenParams: Record<string, string> = {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.config.redirect_uri || '',
      };

      // Add code_verifier for PKCE (only for Twitter OAuth 2.0)
      // Twitter requires PKCE, but other OAuth providers (Gmail, Slack, etc.) don't use it
      const requiresPKCE = config.connector_type === 'twitter';

      if (codeVerifier && requiresPKCE) {
        tokenParams.code_verifier = codeVerifier;
      }

      const tokenRequestBody = new URLSearchParams(tokenParams);

      // Exchange authorization code for access token
      const axios = require('axios');

      // Prepare request headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      };

      // Reddit requires a User-Agent header for all API requests
      if (config.connector_type === 'reddit') {
        headers['User-Agent'] = 'Fluxturn/1.0';
      }

      // Some providers require Basic Auth header (client_id:client_secret base64 encoded)
      // - Twitter: Requires Basic Auth even with PKCE
      // - Reddit: Requires Basic Auth (no PKCE)
      // - Other providers (Gmail, Slack, etc.): Use client_id and client_secret in the request body
      const requiresBasicAuth = requiresPKCE || config.connector_type === 'reddit';

      if (requiresBasicAuth) {
        const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${authString}`;
      } else {
        // For standard OAuth flows, add client_id and client_secret to the body
        tokenParams.client_id = clientId;
        tokenParams.client_secret = clientSecret;
      }

      const tokenResponse = await axios.post(
        metadata.oauth_config.token_url,
        new URLSearchParams(tokenParams).toString(),
        { headers }
      );

      const tokens = tokenResponse.data;

      if (!tokens.access_token) {
        throw new BadRequestException('No access token received from OAuth provider');
      }

      // Update connector config with OAuth tokens (encrypted)
      // IMPORTANT: Use camelCase to match ConnectorCredentials interface
      // IMPORTANT: Store clientId and clientSecret for token refresh
      const updatedCredentials = {
        ...originalCredentials,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        tokenType: tokens.token_type || 'Bearer',
        scope: tokens.scope || metadata.oauth_config.scopes?.join(' '),
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        // Store client credentials for token refresh (CRITICAL for auto-refresh)
        clientId: clientId,
        clientSecret: clientSecret,
        // Store additional OAuth response data if present
        ...(tokens.team && { team: tokens.team }), // Slack
        ...(tokens.authed_user && { authed_user: tokens.authed_user }), // Slack
      };

      // Encrypt and save updated credentials
      await this.platformService.query(
        `UPDATE connector_configs
         SET credentials = $1,
             is_active = true,
             updated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [this.encryptConfig(updatedCredentials), id, context.userId]
      );

      return {
        success: true,
        message: 'OAuth authorization completed successfully',
      };
    } catch (error) {
      this.logger.error(`OAuth callback error for connector ${id}:`, error.response?.data || error.message);

      // Delete the broken credential record to prevent orphaned entries
      try {
        await this.platformService.query(
          `DELETE FROM connector_configs WHERE id = $1 AND user_id = $2`,
          [id, context.userId]
        );
        this.logger.log(`Deleted broken credential ${id} after OAuth failure`);
      } catch (deleteError) {
        this.logger.error(`Failed to delete broken credential ${id}:`, deleteError.message);
      }

      // Provide helpful error messages
      const errorMessage = error.response?.data?.error_description
        || error.response?.data?.error
        || error.message
        || 'Failed to exchange OAuth code';

      throw new BadRequestException(`OAuth token exchange failed: ${errorMessage}`);
    }
  }

  /**
   * Refresh OAuth access token using refresh token
   */
  async refreshOAuthToken(connectorId: string, context: AuthContext): Promise<string> {
    const config = await this.getConnectorConfig(connectorId, context);
    const metadata = await this.getConnectorMetadata(config.connector_type);

    if (!metadata?.oauth_config) {
      throw new BadRequestException('Connector does not support OAuth');
    }

    // Get encrypted credentials
    const query = `SELECT credentials FROM connector_configs WHERE id = $1 AND user_id = $2`;
    const result = await this.platformService.query(query, [connectorId, context.userId]);

    if (!result.rows[0]?.credentials) {
      throw new BadRequestException('Connector credentials not found');
    }

    // Decrypt credentials - handle both string and JSONB object formats
    let creds;
    const credentialsData = result.rows[0].credentials;
    if (typeof credentialsData === 'string') {
      creds = this.decryptConfig(credentialsData);
    } else if (typeof credentialsData === 'object' && credentialsData.iv && credentialsData.data && credentialsData.authTag) {
      // JSONB object from PostgreSQL, stringify it first
      creds = this.decryptConfig(JSON.stringify(credentialsData));
    } else {
      creds = credentialsData;
    }

    // Support both camelCase and snake_case for backward compatibility
    const refreshToken = creds.refreshToken || creds.refresh_token;
    if (!refreshToken) {
      throw new BadRequestException('No refresh token available - user must re-authorize');
    }

    try {
      // Exchange refresh token for new access token
      const axios = require('axios');
      const tokenRequestBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.config.client_id || '',
        client_secret: creds.clientSecret || creds.client_secret,
      });

      const tokenResponse = await axios.post(
        metadata.oauth_config.token_url,
        tokenRequestBody.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
        }
      );

      const tokens = tokenResponse.data;

      // Update stored tokens
      // IMPORTANT: Use camelCase to match ConnectorCredentials interface
      const updatedCreds = {
        ...creds,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || creds.refreshToken || creds.refresh_token, // Some providers don't return new refresh token
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
      };

      // Save updated credentials
      await this.platformService.query(
        `UPDATE connector_configs
         SET credentials = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [this.encryptConfig(updatedCreds), connectorId, context.userId]
      );

      return updatedCreds.access_token;
    } catch (error) {
      this.logger.error(`Token refresh failed for connector ${connectorId}:`, error.response?.data || error.message);
      throw new BadRequestException('Failed to refresh OAuth token - user may need to re-authorize');
    }
  }

  /**
   * Get OAuth connection status for a connector
   */
  async getOAuthStatus(
    connectorId: string,
    context: AuthContext
  ): Promise<{
    connected: boolean;
    email?: string;
    expiresAt?: string;
    scopes?: string[];
    connectorType: string;
    lastRefreshedAt?: string;
  }> {
    const config = await this.getConnectorConfig(connectorId, context);

    // Check if connector is OAuth-based
    const metadata = await this.getConnectorMetadata(config.connector_type);
    if (!metadata?.oauth_config) {
      return {
        connected: false,
        connectorType: config.connector_type,
      };
    }

    // Get credentials from database
    const query = `SELECT credentials, oauth_email, oauth_expires_at, updated_at FROM connector_configs WHERE id = $1 AND user_id = $2`;
    const result = await this.platformService.query(query, [connectorId, context.userId]);

    if (!result.rows[0]) {
      return {
        connected: false,
        connectorType: config.connector_type,
      };
    }

    const row = result.rows[0];
    let hasValidCredentials = false;
    let scopes: string[] = [];

    // Check if we have valid OAuth credentials
    if (row.credentials) {
      try {
        let creds;
        const credentialsData = row.credentials;
        if (typeof credentialsData === 'string') {
          creds = this.decryptConfig(credentialsData);
        } else if (typeof credentialsData === 'object' && credentialsData.iv && credentialsData.data && credentialsData.authTag) {
          creds = this.decryptConfig(JSON.stringify(credentialsData));
        } else {
          creds = credentialsData;
        }

        const accessToken = creds.accessToken || creds.access_token;
        const refreshToken = creds.refreshToken || creds.refresh_token;
        hasValidCredentials = !!(accessToken || refreshToken);

        // Extract scopes if available
        if (creds.scope) {
          scopes = typeof creds.scope === 'string' ? creds.scope.split(' ') : creds.scope;
        }
      } catch (error) {
        this.logger.warn(`Failed to decrypt credentials for connector ${connectorId}:`, error.message);
        hasValidCredentials = false;
      }
    }

    return {
      connected: hasValidCredentials,
      email: row.oauth_email || config.oauth_email,
      expiresAt: row.oauth_expires_at || config.oauth_expires_at,
      scopes,
      connectorType: config.connector_type,
      lastRefreshedAt: row.updated_at?.toISOString(),
    };
  }

  /**
   * Revoke OAuth connection for a connector
   */
  async revokeOAuth(
    connectorId: string,
    context: AuthContext
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.getConnectorConfig(connectorId, context);

    // Check if connector is OAuth-based
    const metadata = await this.getConnectorMetadata(config.connector_type);
    if (!metadata?.oauth_config) {
      throw new BadRequestException('Connector does not support OAuth');
    }

    // Get current credentials to attempt revocation with the provider
    const query = `SELECT credentials FROM connector_configs WHERE id = $1 AND user_id = $2`;
    const result = await this.platformService.query(query, [connectorId, context.userId]);

    if (result.rows[0]?.credentials) {
      try {
        let creds;
        const credentialsData = result.rows[0].credentials;
        if (typeof credentialsData === 'string') {
          creds = this.decryptConfig(credentialsData);
        } else if (typeof credentialsData === 'object' && credentialsData.iv && credentialsData.data && credentialsData.authTag) {
          creds = this.decryptConfig(JSON.stringify(credentialsData));
        } else {
          creds = credentialsData;
        }

        const accessToken = creds.accessToken || creds.access_token;

        // Try to revoke token with provider (Google example)
        if (accessToken && metadata.oauth_config.revoke_url) {
          try {
            const axios = require('axios');
            await axios.post(metadata.oauth_config.revoke_url, null, {
              params: { token: accessToken },
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
          } catch (revokeError) {
            // Log but don't fail - we still want to clear local credentials
            this.logger.warn(`Failed to revoke token with provider for connector ${connectorId}:`, revokeError.message);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to process credentials for revocation ${connectorId}:`, error.message);
      }
    }

    // Clear OAuth credentials from database
    await this.platformService.query(
      `UPDATE connector_configs
       SET credentials = NULL,
           oauth_email = NULL,
           oauth_expires_at = NULL,
           status = 'inactive',
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [connectorId, context.userId]
    );

    this.logger.log(`OAuth revoked for connector ${connectorId}`);

    return {
      success: true,
      message: 'OAuth connection revoked successfully'
    };
  }

  /**
   * Manually refresh OAuth token and return status
   */
  async refreshOAuthTokenManual(
    connectorId: string,
    context: AuthContext
  ): Promise<{ success: boolean; expiresAt: string; message: string }> {
    const config = await this.getConnectorConfig(connectorId, context);
    const metadata = await this.getConnectorMetadata(config.connector_type);

    if (!metadata?.oauth_config) {
      throw new BadRequestException('Connector does not support OAuth');
    }

    // Get encrypted credentials
    const query = `SELECT credentials FROM connector_configs WHERE id = $1 AND user_id = $2`;
    const result = await this.platformService.query(query, [connectorId, context.userId]);

    if (!result.rows[0]?.credentials) {
      throw new BadRequestException('Connector credentials not found');
    }

    // Decrypt credentials
    let creds;
    const credentialsData = result.rows[0].credentials;
    if (typeof credentialsData === 'string') {
      creds = this.decryptConfig(credentialsData);
    } else if (typeof credentialsData === 'object' && credentialsData.iv && credentialsData.data && credentialsData.authTag) {
      creds = this.decryptConfig(JSON.stringify(credentialsData));
    } else {
      creds = credentialsData;
    }

    const refreshToken = creds.refreshToken || creds.refresh_token;
    if (!refreshToken) {
      throw new BadRequestException('No refresh token available - user must re-authorize');
    }

    try {
      // Determine which OAuth service to use based on connector type
      const googleConnectors = ['gmail', 'youtube', 'google_sheets', 'google_drive', 'google_calendar', 'google_docs', 'google_analytics'];

      let newAccessToken: string;
      let expiresAt: string;

      if (googleConnectors.includes(config.connector_type)) {
        // Use Google OAuth service
        const tokens = await this.googleOAuthService.refreshAccessToken(refreshToken);
        newAccessToken = tokens.access_token;
        expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // Encrypt new access token
        const encryptedAccessToken = this.googleOAuthService.encryptToken(tokens.access_token);

        // Update credentials
        const updatedCreds = {
          ...creds,
          accessToken: encryptedAccessToken,
          expiresAt,
        };

        await this.platformService.query(
          `UPDATE connector_configs
           SET credentials = $1, oauth_expires_at = $2, updated_at = NOW()
           WHERE id = $3 AND user_id = $4`,
          [this.encryptConfig(updatedCreds), expiresAt, connectorId, context.userId]
        );
      } else {
        // Generic OAuth refresh
        const axios = require('axios');
        const tokenRequestBody = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.config?.client_id || process.env[`${config.connector_type.toUpperCase()}_OAUTH_CLIENT_ID`] || '',
          client_secret: creds.clientSecret || creds.client_secret || process.env[`${config.connector_type.toUpperCase()}_OAUTH_CLIENT_SECRET`] || '',
        });

        const tokenResponse = await axios.post(
          metadata.oauth_config.token_url,
          tokenRequestBody.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
            },
          }
        );

        const tokens = tokenResponse.data;
        newAccessToken = tokens.access_token;
        expiresAt = tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString(); // Default 1 hour

        const updatedCreds = {
          ...creds,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || refreshToken,
          expiresAt,
        };

        await this.platformService.query(
          `UPDATE connector_configs
           SET credentials = $1, oauth_expires_at = $2, updated_at = NOW()
           WHERE id = $3 AND user_id = $4`,
          [this.encryptConfig(updatedCreds), expiresAt, connectorId, context.userId]
        );
      }

      this.logger.log(`OAuth token refreshed for connector ${connectorId}`);

      return {
        success: true,
        expiresAt,
        message: 'OAuth token refreshed successfully'
      };
    } catch (error) {
      this.logger.error(`Manual token refresh failed for connector ${connectorId}:`, error.response?.data || error.message);
      throw new BadRequestException('Failed to refresh OAuth token - user may need to re-authorize');
    }
  }

  // ============= Helper Methods =============

  /**
   * Setup webhook for a connector trigger
   */
  async setupConnectorWebhook(
    connectorId: string,
    events: string[],
    context: AuthContext
  ): Promise<{ webhookUrl: string; webhookId: string; webhookSecret?: string }> {
    // Get connector config from database (no JOIN - enrich with ConnectorLookup)
    const query = `
      SELECT cc.*
      FROM connector_configs cc
      WHERE cc.id = $1 AND cc.user_id = $2
    `;
    const result = await this.platformService.query(query, [connectorId, context.userId]);

    if (result.rows.length === 0) {
      throw new NotFoundException('Connector configuration not found');
    }

    const dbConfig = result.rows[0];

    // Enrich with connector definition data
    const def = ConnectorLookup.getByName(dbConfig.connector_type);
    if (def) {
      dbConfig.category = def.category;
    }

    // Decrypt credentials
    let decryptedCredentials;
    if (typeof dbConfig.credentials === 'string') {
      decryptedCredentials = this.decryptConfig(dbConfig.credentials);
    } else if (typeof dbConfig.credentials === 'object' && dbConfig.credentials.iv) {
      decryptedCredentials = this.decryptConfig(JSON.stringify(dbConfig.credentials));
    } else {
      decryptedCredentials = dbConfig.credentials;
    }

    // Get base URL from environment
    const baseUrl = this.configService.get<string>('API_BASE_URL') || 'http://localhost:3000';

    // Construct webhook URL
    const webhookUrl = `${baseUrl}/api/v1/connectors/webhook/${dbConfig.connector_type}`;

    // Decrypt config if needed
    let configData = dbConfig.config || {};
    if (typeof configData === 'string') {
      configData = this.decryptConfig(configData);
    } else if (typeof configData === 'object' && configData.iv) {
      configData = this.decryptConfig(JSON.stringify(configData));
    }

    // Create connector instance
    const connectorConfig: InternalConnectorConfig = {
      id: dbConfig.id,
      name: dbConfig.name,
      type: dbConfig.connector_type as any,
      category: dbConfig.category as any || ConnectorCategory.ECOMMERCE,
      credentials: decryptedCredentials,
      settings: configData,
      webhookConfig: {
        url: webhookUrl,
        events: events
      }
    };

    const connector = await this.connectorFactory.createConnector(connectorConfig);

    // Check if connector supports webhooks
    if (!connector.setupWebhook) {
      throw new BadRequestException(`Connector ${dbConfig.connector_type} does not support webhooks`);
    }

    // Setup webhook
    const webhookResult = await connector.setupWebhook(events);

    if (!webhookResult.success) {
      throw new BadRequestException(`Failed to setup webhook: ${webhookResult.error?.message}`);
    }

    // Store webhook metadata in connector config
    const webhookMetadata = webhookResult.metadata || {};
    const updatedConfig = {
      ...configData,
      webhookId: webhookResult.data,
      webhookSecret: webhookMetadata.webhookSecret,
      webhookEvents: webhookMetadata.events || events,
      webhookUrl: webhookUrl
    };

    // Update connector config with webhook info
    const updateQuery = `
      UPDATE connector_configs
      SET config = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await this.platformService.query(updateQuery, [
      JSON.stringify(updatedConfig),
      connectorId
    ]);

    return {
      webhookUrl,
      webhookId: webhookResult.data,
      webhookSecret: webhookMetadata.webhookSecret
    };
  }

  /**
   * Get connector by type
   * Now reads from TypeScript constants instead of database
   */
  private getConnectorByType(type: string): any {
    const def = ConnectorLookup.getByName(type);
    if (!def) {
      return null;
    }
    return ConnectorLookup.toMetadata(def);
  }

  /**
   * Validate unique connector name for user
   */
  private async validateUniqueConnectorName(
    name: string,
    userId: string,
    excludeId?: string
  ): Promise<void> {
    let query = `
      SELECT id FROM connector_configs
      WHERE name = $1 AND user_id = $2
    `;
    const values: any[] = [name, userId];
    let paramIndex = 3;

    if (excludeId) {
      query += ` AND id != $${paramIndex}`;
      values.push(excludeId);
    }

    const result = await this.platformService.query(query, values);

    if (result.rows.length > 0) {
      throw new ConflictException(`Connector name '${name}' already exists for this user`);
    }
  }

  /**
   * Log connector usage
   */
  private async logConnectorUsage(
    configId: string,
    action: string,
    success: boolean,
    context: AuthContext,
    executionTime?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Get connector type from the config
      const configQuery = `SELECT connector_type FROM connector_configs WHERE id = $1`;
      const configResult = await this.platformService.query(configQuery, [configId]);

      if (configResult.rows.length === 0) {
        this.logger.warn(`Connector config not found for logging: ${configId}`);
        return;
      }

      const connectorType = configResult.rows[0].connector_type;

      // Get the connector definition ID from connectors table
      const connectorQuery = `SELECT id FROM connectors WHERE name = $1`;
      const connectorResult = await this.platformService.query(connectorQuery, [connectorType]);

      if (connectorResult.rows.length === 0) {
        this.logger.warn(`Connector definition not found for type: ${connectorType}`);
        return;
      }

      const connectorId = connectorResult.rows[0].id;
      const organizationId = context.organizationId;

      if (!organizationId) {
        this.logger.warn(`No organization ID available for connector logging`);
        return;
      }

      const query = `
        INSERT INTO connector_execution_logs (
          id, connector_id, connector_config_id, organization_id,
          action, status, error,
          duration_ms, started_at, completed_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
      `;

      const startedAt = new Date(Date.now() - (executionTime || 0));
      const completedAt = new Date();

      await this.platformService.query(query, [
        uuidv4(),
        connectorId,
        configId,
        organizationId,
        action,
        success ? 'success' : 'failed',
        errorMessage || null,
        executionTime || null,
        startedAt,
        completedAt
      ]);
    } catch (error) {
      // Don't fail the main operation if logging fails
      this.logger.error('Failed to log connector usage:', error);
    }
  }

  /**
   * Encrypt configuration data
   */
  private encryptConfig(config: any): string {
    const text = JSON.stringify(config);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.encryptionAlgorithm,
      Buffer.from(this.encryptionKey.slice(0, 32)),
      iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    });
  }

  /**
   * Decrypt configuration data
   */
  private decryptConfig(encryptedData: any): any {
    try {
      // Handle case where encryptedData might already be an object (from JSONB)
      let dataToDecrypt: string;
      if (typeof encryptedData === 'string') {
        dataToDecrypt = encryptedData;
      } else if (typeof encryptedData === 'object' && encryptedData !== null) {
        // If it's already an object with encryption fields, stringify it
        if (encryptedData.iv && encryptedData.data && encryptedData.authTag) {
          dataToDecrypt = JSON.stringify(encryptedData);
        } else {
          // If it's a plain object (unencrypted), return it as-is
          return encryptedData;
        }
      } else {
        return {};
      }

      const parsed = JSON.parse(dataToDecrypt);
      const decipher = crypto.createDecipheriv(
        this.encryptionAlgorithm,
        Buffer.from(this.encryptionKey.slice(0, 32)),
        Buffer.from(parsed.iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(parsed.authTag, 'hex'));

      let decrypted = decipher.update(parsed.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      // Decryption failures are expected for data encrypted with different keys
      return {};
    }
  }

  /**
   * Map database row to ConnectorConfig
   */
  private mapToConnectorConfig(row: any): ConnectorConfig {
    return {
      id: row.id,
      name: row.name,
      connector_type: row.connector_type,
      config: row.config,
      enabled: row.is_active !== undefined ? row.is_active : row.enabled,
      status: row.status || 'active',
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_tested_at: row.last_tested_at,
      created_by: row.user_id || row.created_by,
      metadata: {
        display_name: row.display_name,
        description: row.description,
        category: row.category,
        auth_type: row.auth_type
      }
    };
  }

  /**
   * Map database row to ConnectorUsageLog
   */
  private mapToUsageLog(row: any): ConnectorUsageLog {
    return {
      id: row.id,
      connector_config_id: row.connector_config_id,
      action: row.action,
      status: row.status,
      execution_time_ms: row.execution_time_ms,
      error_message: row.error_message,
      request_data: row.request_data,
      response_data: row.response_data,
      executed_by: row.executed_by,
      executed_at: row.executed_at
    };
  }

  /**
   * Map database row to ConnectorMetadata
   */
  private mapToConnectorMetadata(row: any): ConnectorMetadata {
    return {
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      category: row.category,
      auth_type: row.auth_type,
      status: row.status,
      is_public: row.is_public ?? true,
      auth_fields: row.auth_fields,
      supported_actions: row.supported_actions || [],
      supported_triggers: row.supported_triggers || [],
      webhook_support: row.webhook_support,
      oauth_config: row.oauth_config,
      rate_limits: row.rate_limits,
      sandbox_available: row.sandbox_available
    };
  }

  /**
   * Get sensitive field names for a connector type
   * These fields will be redacted when sending to frontend
   */
  private getSensitiveFieldsForType(connectorType: string): string[] {
    const sensitiveFieldsMap: Record<string, string[]> = {
      // Communication
      slack: ['token', 'botToken', 'clientSecret', 'signingSecret', 'webhookUrl'],
      discord: ['token', 'botToken', 'webhookUrl'],
      twilio: ['authToken', 'apiSecret'],
      gmail: ['clientSecret', 'refreshToken', 'accessToken'],
      teams: ['clientSecret', 'webhookUrl'],

      // AI
      openai: ['apiKey'],
      anthropic: ['apiKey'],
      'google-ai': ['apiKey'],
      'aws-bedrock': ['secretAccessKey', 'sessionToken'],

      // Storage
      'aws-s3': ['secretAccessKey', 'sessionToken'],
      'google-drive': ['clientSecret', 'refreshToken', 'accessToken'],
      dropbox: ['accessToken', 'refreshToken'],
      'google-sheets': ['clientSecret', 'refreshToken', 'accessToken'],
      mongodb: ['password', 'connectionString'],
      mysql: ['password'],

      // CRM
      hubspot: ['accessToken', 'refreshToken', 'apiKey'],
      salesforce: ['clientSecret', 'refreshToken', 'accessToken', 'securityToken'],
      pipedrive: ['apiToken'],
      zoho: ['clientSecret', 'refreshToken', 'accessToken'],
      airtable: ['apiKey', 'personalAccessToken'],
      monday: ['apiToken'],

      // Project Management
      jira: ['apiToken', 'password'],
      asana: ['accessToken', 'refreshToken'],
      trello: ['apiToken', 'apiSecret'],
      notion: ['token', 'internalIntegrationToken'],
      linear: ['apiKey'],

      // Social Media
      twitter: ['apiSecret', 'accessToken', 'accessTokenSecret', 'bearerToken'],
      facebook: ['accessToken', 'appSecret'],
      facebook_graph: ['accessToken', 'appSecret', 'clientSecret', 'refreshToken'],
      instagram: ['accessToken'],
      linkedin: ['clientSecret', 'accessToken'],

      // Marketing
      mailchimp: ['apiKey'],
      sendgrid: ['apiKey'],
      klaviyo: ['apiKey', 'privateKey'],
      'google-ads': ['clientSecret', 'refreshToken', 'developerToken'],
      'facebook-ads': ['accessToken', 'appSecret'],

      // E-commerce
      shopify: ['apiSecretKey', 'accessToken', 'password'],
      woocommerce: ['consumerSecret'],
      stripe: ['secretKey', 'webhookSecret'],

      // Development
      github: ['accessToken', 'privateKey', 'clientSecret', 'webhookSecret'],
      gitlab: ['accessToken', 'privateToken'],
      bitbucket: ['appPassword', 'accessToken'],

      // Support
      zendesk: ['apiToken', 'password'],
      intercom: ['accessToken'],
      freshdesk: ['apiKey'],

      // Analytics
      'google-analytics': ['clientSecret', 'refreshToken', 'accessToken'],
      mixpanel: ['apiSecret'],
      segment: ['writeKey'],

      // Forms
      typeform: ['accessToken', 'personalAccessToken'],
      'google-forms': ['clientSecret', 'refreshToken', 'accessToken'],
      jotform: ['apiKey'],

      // Video
      youtube: ['clientSecret', 'refreshToken', 'accessToken'],
      zoom: ['clientSecret', 'accessToken'],
      vimeo: ['accessToken'],

      // Finance
      plaid: ['secret', 'clientSecret'],
      quickbooks: ['clientSecret', 'refreshToken', 'accessToken'],
    };

    // Default sensitive fields for unknown connector types
    const defaultSensitiveFields = [
      'password',
      'secret',
      'token',
      'key',
      'apiKey',
      'api_key',
      'apiSecret',
      'api_secret',
      'clientSecret',
      'client_secret',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'privateKey',
      'private_key',
      'webhookUrl',
      'webhook_url',
      'webhookSecret',
      'webhook_secret',
      'authToken',
      'auth_token',
      'bearerToken',
      'bearer_token',
      'sessionToken',
      'session_token',
      'oauthToken',
      'oauth_token',
      'consumerSecret',
      'consumer_secret'
    ];

    return sensitiveFieldsMap[connectorType] || defaultSensitiveFields;
  }

  /**
   * Redact sensitive fields in credential data
   * Replaces sensitive values with redaction markers for UI display
   */
  private redactSensitiveFields(data: any, connectorType: string): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = this.getSensitiveFieldsForType(connectorType);
    const redacted = { ...data };

    // Redact each sensitive field
    for (const field of sensitiveFields) {
      if (field in redacted) {
        const value = redacted[field];
        if (value && typeof value === 'string' && value.length > 0) {
          redacted[field] = this.CREDENTIAL_BLANKING_VALUE;
        } else if (value === null || value === undefined || value === '') {
          redacted[field] = this.CREDENTIAL_EMPTY_VALUE;
        }
      }
    }

    // Always redact OAuth token data if present
    if ('oauthTokenData' in redacted) {
      redacted.oauthTokenData = redacted.oauthTokenData
        ? this.CREDENTIAL_BLANKING_VALUE
        : this.CREDENTIAL_EMPTY_VALUE;
    }

    return redacted;
  }

  /**
   * Restore redacted values from original data during updates
   * When user sends back redacted values, we keep the original encrypted values
   */
  private unredactCredentials(newData: any, originalData: any): any {
    if (!newData || typeof newData !== 'object') {
      return newData;
    }
    if (!originalData || typeof originalData !== 'object') {
      return newData;
    }

    const merged = { ...newData };

    // Restore any redacted or empty sentinel values
    for (const [key, value] of Object.entries(merged)) {
      if (value === this.CREDENTIAL_BLANKING_VALUE || value === this.CREDENTIAL_EMPTY_VALUE) {
        // User didn't change this field, restore original value
        merged[key] = originalData[key];
      }
    }

    return merged;
  }
}