import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlatformService } from '../../../database/platform.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CONNECTOR_DEFINITIONS,
  ConnectorDefinition,
} from '../../connectors/shared';
import {
  compareConnectorFields,
  ConnectorDiff,
} from '../../common/utils/connector-diff.util';

/**
 * Connector Seeder Service
 *
 * Seeds connectors to PostgreSQL database with smart field-level change detection:
 * - New connectors are inserted
 * - Existing connectors are updated only if specific fields changed
 * - Unchanged connectors are skipped entirely
 * - Manual edits (icon_url, etc.) are preserved
 */
@Injectable()
export class ConnectorSeederService implements OnModuleInit {
  private readonly logger = new Logger(ConnectorSeederService.name);

  constructor(private readonly platformService: PlatformService) {}

  async onModuleInit() {
    try {
      // ✅ DISABLED: Using ConnectorLookup in-memory registry instead of database seeding
      // Following n8n's pattern - all connector definitions loaded from TypeScript constants
      this.logger.log('✅ Connector seeding DISABLED - using ConnectorLookup in-memory registry');
      this.logger.log(`📊 ${CONNECTOR_DEFINITIONS.length} connectors loaded from TypeScript (NO DATABASE)`);
      return; // Skip database operations entirely
    } catch (error) {
      this.logger.error('Failed to initialize connector seeder:', error);
    }
  }

  /**
   * Seed connectors with smart field-level change detection
   */
  async seedConnectors(): Promise<void> {
    try {
      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      // 🚀 OPTIMIZATION: Fetch ALL existing connectors in ONE query instead of 64 separate queries
      const allExistingQuery = `
        SELECT
          name,
          id,
          display_name,
          description,
          category,
          auth_type,
          auth_fields,
          endpoints,
          webhook_support,
          rate_limits,
          sandbox_available,
          verified,
          supported_triggers,
          supported_actions,
          oauth_config
        FROM connectors
        WHERE is_public = true
      `;
      const allExistingResult = await this.platformService.query(allExistingQuery);
      const existingConnectorsMap = new Map(
        allExistingResult.rows.map(row => [row.name, row])
      );

      this.logger.log(`📊 Found ${existingConnectorsMap.size} existing connectors in database`);

      for (const connector of CONNECTOR_DEFINITIONS) {
        const existing = existingConnectorsMap.get(connector.name);

        if (!existing) {
          // INSERT new connector
          await this.insertConnector(connector);
          inserted++;
          this.logger.log(`   ✅ Inserted new connector: ${connector.name}`);
        } else {
          // Compare fields and get diff
          const diff = compareConnectorFields(existing, connector);

          if (!diff.hasChanges) {
            // No changes - skip
            skipped++;
            // Uncomment for verbose logging:
            // this.logger.debug(`   ⏭️  Skipped (unchanged): ${connector.name}`);
          } else {
            // Update only changed fields
            await this.updateConnectorFields(connector.name, diff);
            updated++;

            // Log which fields changed
            const changedFields = diff.changes.map((c) => c.field).join(', ');
            this.logger.log(
              `   🔄 Updated connector: ${connector.name} (fields: ${changedFields})`,
            );
          }
        }
      }

      this.logger.log(
        `✅ Connector seeding complete: ${inserted} inserted, ${updated} updated, ${skipped} unchanged`,
      );
    } catch (error) {
      this.logger.error('Failed to seed connectors:', error);
      throw error;
    }
  }

  /**
   * Insert a new connector into the database
   */
  private async insertConnector(connector: ConnectorDefinition): Promise<void> {
    const insertQuery = `
      INSERT INTO connectors (
        id, name, display_name, description, category, type,
        status, is_public, auth_type, auth_fields, endpoints,
        webhook_support, rate_limits, sandbox_available, verified, capabilities,
        supported_triggers, supported_actions, oauth_config,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19,
        NOW(), NOW()
      )
    `;

    const values = [
      uuidv4(),
      connector.name,
      connector.display_name,
      connector.description,
      connector.category,
      'official', // type
      'active', // status
      true, // is_public
      connector.auth_type || 'api_key',
      connector.auth_fields ? JSON.stringify(connector.auth_fields) : null,
      connector.endpoints ? JSON.stringify(connector.endpoints) : null,
      connector.webhook_support ?? false,
      connector.rate_limits ? JSON.stringify(connector.rate_limits) : null,
      connector.sandbox_available ?? false,
      connector.verified ?? false, // verified status
      JSON.stringify({
        triggers: [],
        actions: [],
        conditions: [],
        webhooks: connector.webhook_support ?? false,
        batch: true,
      }),
      JSON.stringify(connector.supported_triggers || []),
      JSON.stringify(connector.supported_actions || []),
      connector.oauth_config ? JSON.stringify(connector.oauth_config) : null,
    ];

    await this.platformService.query(insertQuery, values);
  }

  /**
   * Update only the changed fields of an existing connector
   */
  private async updateConnectorFields(
    connectorName: string,
    diff: ConnectorDiff,
  ): Promise<void> {
    if (!diff.hasChanges) return;

    // Build dynamic UPDATE query with only changed fields
    const updateQuery = `
      UPDATE connectors
      SET ${diff.setClauses.join(', ')}, updated_at = NOW()
      WHERE name = $${diff.values.length + 1} AND is_public = true
    `;

    const values = [...diff.values, connectorName];

    await this.platformService.query(updateQuery, values);
  }
}
