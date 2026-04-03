import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  OnModuleDestroy
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../../database/platform.service';
import { Pool } from 'pg';
import * as mysql from 'mysql2/promise';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateConnectionDto,
  UpdateConnectionDto,
  ListConnectionsQueryDto,
  TestConnectionDto,
  DatabaseType
} from '../dto/connection.dto';
import {
  DatabaseConnection,
  DatabaseCredentials
} from '../entities/database-connection.entity';

export interface AuthContext {
  type: 'jwt' | 'apikey';
  userId?: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
}

@Injectable()
export class ConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(ConnectionService.name);
  private readonly encryptionKey: string;
  private readonly encryptionAlgorithm = 'aes-256-gcm';

  // Connection pools cache
  private pgPools: Map<string, Pool> = new Map();
  private mysqlPools: Map<string, mysql.Pool> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {
    const key = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
    if (!key) {
      throw new Error(
        'CONNECTOR_ENCRYPTION_KEY must be set in environment variables.'
      );
    }
    if (key.length !== 64) {
      throw new Error('CONNECTOR_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    this.encryptionKey = key;
  }

  async onModuleDestroy() {
    // Clean up all connection pools
    for (const [id, pool] of this.pgPools) {
      try {
        await pool.end();
        this.logger.log(`Closed PostgreSQL pool for connection ${id}`);
      } catch (error) {
        this.logger.error(`Error closing PostgreSQL pool ${id}:`, error);
      }
    }

    for (const [id, pool] of this.mysqlPools) {
      try {
        await pool.end();
        this.logger.log(`Closed MySQL pool for connection ${id}`);
      } catch (error) {
        this.logger.error(`Error closing MySQL pool ${id}:`, error);
      }
    }
  }

  /**
   * Create a new database connection
   */
  async createConnection(
    dto: CreateConnectionDto,
    context: AuthContext
  ): Promise<DatabaseConnection> {
    if (!context.projectId || !context.organizationId) {
      throw new BadRequestException('Project ID and Organization ID are required');
    }

    // Check for duplicate name within project
    await this.validateUniqueName(dto.name, context.projectId);

    const id = uuidv4();
    const encryptedCredentials = this.encryptCredentials(dto.credentials);

    const query = `
      INSERT INTO database_connections (
        id, organization_id, project_id, created_by,
        name, description, database_type, config, credentials,
        status, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      )
      RETURNING *
    `;

    const values = [
      id,
      context.organizationId,
      context.projectId,
      context.userId,
      dto.name,
      dto.description || null,
      dto.database_type,
      JSON.stringify(dto.config),
      encryptedCredentials,
      'pending',
      true
    ];

    const result = await this.platformService.query(query, values);
    const connection = result.rows[0];

    // Parse config if it's a string
    if (typeof connection.config === 'string') {
      connection.config = JSON.parse(connection.config);
    }

    // Don't return credentials
    delete connection.credentials;

    return connection;
  }

  /**
   * Get a single connection by ID
   */
  async getConnection(id: string, context: AuthContext): Promise<DatabaseConnection> {
    const query = `
      SELECT * FROM database_connections
      WHERE id = $1
        AND (project_id = $2 OR organization_id = $3)
        AND is_active = true
    `;

    const result = await this.platformService.query(query, [
      id,
      context.projectId,
      context.organizationId
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundException(`Database connection not found: ${id}`);
    }

    const connection = result.rows[0];

    // Parse config if it's a string
    if (typeof connection.config === 'string') {
      connection.config = JSON.parse(connection.config);
    }

    // Don't return encrypted credentials
    delete connection.credentials;

    return connection;
  }

  /**
   * Get connection with decrypted credentials (internal use only)
   */
  async getConnectionWithCredentials(
    id: string,
    context: AuthContext
  ): Promise<DatabaseConnection & { credentials: DatabaseCredentials }> {
    const query = `
      SELECT * FROM database_connections
      WHERE id = $1
        AND (project_id = $2 OR organization_id = $3)
        AND is_active = true
    `;

    const result = await this.platformService.query(query, [
      id,
      context.projectId,
      context.organizationId
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundException(`Database connection not found: ${id}`);
    }

    const connection = result.rows[0];

    // Parse config if it's a string
    if (typeof connection.config === 'string') {
      connection.config = JSON.parse(connection.config);
    }

    // Decrypt credentials
    connection.credentials = this.decryptCredentials(connection.credentials);

    return connection;
  }

  /**
   * List connections for project
   */
  async listConnections(
    query: ListConnectionsQueryDto,
    context: AuthContext
  ): Promise<{ data: DatabaseConnection[]; total: number }> {
    const conditions = ['is_active = true'];
    const values: any[] = [];
    let paramIndex = 1;

    if (context.projectId) {
      conditions.push(`project_id = $${paramIndex++}`);
      values.push(context.projectId);
    } else if (context.organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`);
      values.push(context.organizationId);
    }

    if (query.database_type) {
      conditions.push(`database_type = $${paramIndex++}`);
      values.push(query.database_type);
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(query.status);
    }

    const whereClause = conditions.join(' AND ');
    const limit = query.limit || 20;
    const offset = query.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM database_connections WHERE ${whereClause}`;
    const countResult = await this.platformService.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    const dataQuery = `
      SELECT id, organization_id, project_id, created_by, name, description,
             database_type, config, status, last_tested_at, test_result,
             is_active, created_at, updated_at
      FROM database_connections
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await this.platformService.query(dataQuery, [...values, limit, offset]);

    const data = result.rows.map(row => {
      if (typeof row.config === 'string') {
        row.config = JSON.parse(row.config);
      }
      return row;
    });

    return { data, total };
  }

  /**
   * Update a connection
   */
  async updateConnection(
    id: string,
    dto: UpdateConnectionDto,
    context: AuthContext
  ): Promise<DatabaseConnection> {
    // Verify connection exists and user has access
    await this.getConnection(id, context);

    if (dto.name) {
      await this.validateUniqueName(dto.name, context.projectId!, id);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }

    if (dto.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(dto.description);
    }

    if (dto.config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(dto.config));
    }

    if (dto.credentials !== undefined) {
      updates.push(`credentials = $${paramIndex++}`);
      values.push(this.encryptCredentials(dto.credentials));
      // Reset status when credentials change
      updates.push(`status = 'pending'`);
    }

    if (dto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(dto.is_active);
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const query = `
      UPDATE database_connections
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.platformService.query(query, values);
    const connection = result.rows[0];

    if (typeof connection.config === 'string') {
      connection.config = JSON.parse(connection.config);
    }
    delete connection.credentials;

    // Close existing pool if config changed
    if (dto.config || dto.credentials) {
      await this.closePool(id);
    }

    return connection;
  }

  /**
   * Delete a connection
   */
  async deleteConnection(id: string, context: AuthContext): Promise<void> {
    await this.getConnection(id, context);

    // Close pool first
    await this.closePool(id);

    const query = `DELETE FROM database_connections WHERE id = $1`;
    await this.platformService.query(query, [id]);
  }

  /**
   * Test a connection (using existing saved connection)
   */
  async testSavedConnection(id: string, context: AuthContext): Promise<{
    success: boolean;
    message: string;
    latency_ms: number;
  }> {
    const connection = await this.getConnectionWithCredentials(id, context);

    const startTime = Date.now();

    try {
      if (connection.database_type === 'postgresql') {
        await this.testPostgreSQLConnection(connection.config, connection.credentials);
      } else {
        await this.testMySQLConnection(connection.config, connection.credentials);
      }

      const latency = Date.now() - startTime;

      // Update connection status
      await this.platformService.query(
        `UPDATE database_connections
         SET status = 'active', last_tested_at = NOW(),
             test_result = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({ success: true, latency_ms: latency }), id]
      );

      return {
        success: true,
        message: 'Connection successful',
        latency_ms: latency
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      // Update connection status
      await this.platformService.query(
        `UPDATE database_connections
         SET status = 'error', last_tested_at = NOW(),
             test_result = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({ success: false, error: error.message, latency_ms: latency }), id]
      );

      return {
        success: false,
        message: error.message,
        latency_ms: latency
      };
    }
  }

  /**
   * Test a connection without saving (for new connections)
   */
  async testNewConnection(dto: TestConnectionDto): Promise<{
    success: boolean;
    message: string;
    latency_ms: number;
  }> {
    const startTime = Date.now();

    try {
      if (dto.database_type === DatabaseType.POSTGRESQL) {
        await this.testPostgreSQLConnection(dto.config, dto.credentials);
      } else {
        await this.testMySQLConnection(dto.config, dto.credentials);
      }

      return {
        success: true,
        message: 'Connection successful',
        latency_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        latency_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Get or create a PostgreSQL pool for a connection
   */
  async getPostgreSQLPool(id: string, context: AuthContext): Promise<Pool> {
    if (this.pgPools.has(id)) {
      return this.pgPools.get(id)!;
    }

    const connection = await this.getConnectionWithCredentials(id, context);

    if (connection.database_type !== 'postgresql') {
      throw new BadRequestException('Connection is not a PostgreSQL database');
    }

    const pool = new Pool({
      host: connection.config.host,
      port: connection.config.port,
      user: connection.credentials.user,
      password: connection.credentials.password,
      database: connection.config.database,
      max: connection.config.pool_size || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: connection.config.connection_timeout || 10000,
      ssl: connection.config.ssl_enabled
        ? connection.config.ssl_config || { rejectUnauthorized: false }
        : false
    });

    // Test the pool
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    this.pgPools.set(id, pool);
    return pool;
  }

  /**
   * Get or create a MySQL pool for a connection
   */
  async getMySQLPool(id: string, context: AuthContext): Promise<mysql.Pool> {
    if (this.mysqlPools.has(id)) {
      return this.mysqlPools.get(id)!;
    }

    const connection = await this.getConnectionWithCredentials(id, context);

    if (connection.database_type !== 'mysql') {
      throw new BadRequestException('Connection is not a MySQL database');
    }

    const pool = mysql.createPool({
      host: connection.config.host,
      port: connection.config.port,
      user: connection.credentials.user,
      password: connection.credentials.password,
      database: connection.config.database,
      connectionLimit: connection.config.pool_size || 10,
      connectTimeout: connection.config.connection_timeout || 10000,
      ssl: connection.config.ssl_enabled
        ? connection.config.ssl_config || { rejectUnauthorized: false }
        : undefined,
      waitForConnections: true,
      queueLimit: 0
    });

    // Test the pool
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();

    this.mysqlPools.set(id, pool);
    return pool;
  }

  /**
   * Close a connection pool
   */
  async closePool(id: string): Promise<void> {
    if (this.pgPools.has(id)) {
      await this.pgPools.get(id)!.end();
      this.pgPools.delete(id);
    }

    if (this.mysqlPools.has(id)) {
      await this.mysqlPools.get(id)!.end();
      this.mysqlPools.delete(id);
    }
  }

  // ============== Private Methods ==============

  private async testPostgreSQLConnection(
    config: any,
    credentials: DatabaseCredentials
  ): Promise<void> {
    const pool = new Pool({
      host: config.host,
      port: config.port,
      user: credentials.user,
      password: credentials.password,
      database: config.database,
      max: 1,
      connectionTimeoutMillis: config.connection_timeout || 10000,
      ssl: config.ssl_enabled
        ? config.ssl_config || { rejectUnauthorized: false }
        : false
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
    } finally {
      await pool.end();
    }
  }

  private async testMySQLConnection(
    config: any,
    credentials: DatabaseCredentials
  ): Promise<void> {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: credentials.user,
      password: credentials.password,
      database: config.database,
      connectTimeout: config.connection_timeout || 10000,
      ssl: config.ssl_enabled
        ? config.ssl_config || { rejectUnauthorized: false }
        : undefined
    });

    try {
      await connection.query('SELECT 1');
    } finally {
      await connection.end();
    }
  }

  private async validateUniqueName(
    name: string,
    projectId: string,
    excludeId?: string
  ): Promise<void> {
    let query = `
      SELECT id FROM database_connections
      WHERE name = $1 AND project_id = $2 AND is_active = true
    `;
    const values: any[] = [name, projectId];

    if (excludeId) {
      query += ` AND id != $3`;
      values.push(excludeId);
    }

    const result = await this.platformService.query(query, values);

    if (result.rows.length > 0) {
      throw new ConflictException(`Connection name '${name}' already exists in this project`);
    }
  }

  private encryptCredentials(credentials: DatabaseCredentials): string {
    const text = JSON.stringify(credentials);
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

  private decryptCredentials(encryptedData: any): DatabaseCredentials {
    try {
      let dataToDecrypt: string;

      if (typeof encryptedData === 'string') {
        dataToDecrypt = encryptedData;
      } else if (typeof encryptedData === 'object' && encryptedData !== null) {
        if (encryptedData.iv && encryptedData.data && encryptedData.authTag) {
          dataToDecrypt = JSON.stringify(encryptedData);
        } else {
          return encryptedData as DatabaseCredentials;
        }
      } else {
        throw new Error('Invalid encrypted data format');
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
      this.logger.error('Failed to decrypt credentials:', error);
      throw new BadRequestException('Failed to decrypt credentials');
    }
  }
}
