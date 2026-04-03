import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { MongoClient, ChangeStream, ChangeStreamDocument } from 'mongodb';
import {
  ITriggerService,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
  TriggerType,
} from '../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../database/platform.service';
import { WorkflowService } from '../../../workflow/workflow.service';

interface MongoDBTriggerConfig {
  connectionString?: string;
  database?: string;
  collection?: string;
  triggerId?: string;
  actionParams?: {
    connectionString?: string;
    database?: string;
    collection?: string;
    triggerId?: string;
  };
  connectorConfigId?: string;
  credentialId?: string;
}

interface ActiveTrigger {
  workflowId: string;
  client: MongoClient;
  changeStream: ChangeStream;
  database: string;
  collection: string;
  triggerId: string;
  activatedAt: Date;
}

/**
 * MongoDB Trigger Service
 *
 * Manages MongoDB Change Stream triggers for real-time document monitoring.
 * Supports document insert and update events using MongoDB's native change streams.
 *
 * Key Features:
 * - Real-time document change detection via Change Streams
 * - Support for document_inserted and document_updated triggers
 * - Automatic connection management and cleanup
 * - Full document lookup on updates
 *
 * Requirements:
 * - MongoDB 3.6+ with replica set or sharded cluster
 * - Change streams require a replica set configuration
 */
@Injectable()
export class MongoDBTriggerService implements ITriggerService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoDBTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => WorkflowService))
    private readonly workflowService: WorkflowService
  ) {}

  /**
   * Restore active workflows on module initialization
   */
  async onModuleInit() {
    this.logger.log('Initializing MongoDB Trigger Service...');
    try {
      await this.restoreActiveWorkflows();
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
    }
  }

  /**
   * Cleanup all change streams on module destroy
   */
  async onModuleDestroy() {
    this.logger.log('Shutting down MongoDB Trigger Service...');
    for (const [workflowId, trigger] of this.activeTriggers) {
      try {
        await this.closeChangeStream(trigger);
        this.logger.log(`Closed change stream for workflow ${workflowId}`);
      } catch (error) {
        this.logger.error(`Error closing change stream for workflow ${workflowId}:`, error);
      }
    }
    this.activeTriggers.clear();
  }

  /**
   * Restore active MongoDB workflows from database
   */
  private async restoreActiveWorkflows() {
    try {
      const query = `
        SELECT id, canvas, status
        FROM workflows
        WHERE status = 'active'
        AND canvas IS NOT NULL
      `;

      const result = await this.platformService.query(query);
      let restoredCount = 0;

      for (const row of result.rows) {
        try {
          const canvas = row.canvas;
          const nodes = canvas?.nodes || [];

          // Find MongoDB trigger nodes
          const mongodbTriggerNodes = nodes.filter(
            (node: any) =>
              node.type === 'CONNECTOR_TRIGGER' &&
              node.data?.connectorType === 'mongodb'
          );

          if (mongodbTriggerNodes.length === 0) {
            continue;
          }

          const workflowId = row.id;
          const triggerNode = mongodbTriggerNodes[0];
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId,
          };

          this.logger.debug(`Restoring MongoDB trigger for workflow ${workflowId}`);

          const activationResult = await this.activate(workflowId, triggerConfig);

          if (activationResult.success) {
            restoredCount++;
            this.logger.log(`✅ Restored MongoDB trigger for workflow ${workflowId}`);
          } else {
            this.logger.warn(`❌ Failed to restore workflow ${workflowId}: ${activationResult.message}`);
          }
        } catch (error) {
          this.logger.error(`Error restoring workflow ${row.id}:`, error.message);
        }
      }

      if (restoredCount > 0) {
        this.logger.log(`Successfully restored ${restoredCount} MongoDB workflow(s)`);
      } else {
        this.logger.log('No active MongoDB workflows to restore');
      }
    } catch (error) {
      this.logger.error('Failed to restore active workflows:', error);
      throw error;
    }
  }

  /**
   * Activate MongoDB change stream trigger for a workflow
   */
  async activate(workflowId: string, triggerConfig: MongoDBTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating MongoDB trigger for workflow ${workflowId}`);
      this.logger.debug(`Trigger config: ${JSON.stringify(triggerConfig)}`);

      // Extract connection details
      let connectionString = triggerConfig.connectionString || triggerConfig.actionParams?.connectionString;
      let database = triggerConfig.database || triggerConfig.actionParams?.database;
      const collection = triggerConfig.collection || triggerConfig.actionParams?.collection;
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'document_inserted';

      // Fetch credentials if credentialId is provided
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;

      if (!connectionString && credentialId) {
        this.logger.log(`Fetching connection string from credential: ${credentialId}`);
        try {
          const credentialQuery = `
            SELECT credentials FROM connector_configs
            WHERE id = $1
          `;
          const result = await this.platformService.query(credentialQuery, [credentialId]);

          if (result.rows.length > 0) {
            const credentials = result.rows[0].credentials;

            if (credentials && credentials.iv && (credentials.data || credentials.encrypted) && credentials.authTag) {
              const decryptedCredentials = this.decryptCredentialConfig(credentials);
              connectionString = decryptedCredentials.connectionString || decryptedCredentials.connection_string;
              database = database || decryptedCredentials.database;
            } else {
              connectionString = credentials?.connectionString || credentials?.connection_string;
              database = database || credentials?.database;
            }
          }
        } catch (error) {
          this.logger.error(`Failed to fetch credential ${credentialId}:`, error);
          return {
            success: false,
            message: 'Failed to fetch MongoDB credentials',
            error: error.message,
          };
        }
      }

      if (!connectionString) {
        return {
          success: false,
          message: 'MongoDB connection string is required',
          error: 'Missing connection string in trigger configuration',
        };
      }

      if (!collection) {
        return {
          success: false,
          message: 'Collection name is required for MongoDB trigger',
          error: 'Missing collection in trigger configuration',
        };
      }

      // Check if already active
      if (this.activeTriggers.has(workflowId)) {
        this.logger.log(`MongoDB trigger already active for workflow ${workflowId}`);
        return {
          success: true,
          message: 'MongoDB change stream already active',
          data: { alreadyActive: true },
        };
      }

      // Connect to MongoDB
      const client = new MongoClient(connectionString, {
        maxPoolSize: 5,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
      });

      await client.connect();

      const db = client.db(database);
      const coll = db.collection(collection);

      // Create change stream with full document lookup
      const pipeline = this.buildPipeline(triggerId);
      const changeStream = coll.watch(pipeline, {
        fullDocument: 'updateLookup',
        fullDocumentBeforeChange: 'whenAvailable',
      });

      // Set up change stream listener
      changeStream.on('change', async (change: ChangeStreamDocument) => {
        await this.handleChangeEvent(workflowId, change, triggerId);
      });

      changeStream.on('error', (error) => {
        this.logger.error(`Change stream error for workflow ${workflowId}:`, error);
        // Attempt to reconnect
        this.handleStreamError(workflowId, triggerConfig);
      });

      // Store active trigger
      this.activeTriggers.set(workflowId, {
        workflowId,
        client,
        changeStream,
        database: database || 'default',
        collection,
        triggerId,
        activatedAt: new Date(),
      });

      this.logger.log(`✅ MongoDB trigger activated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'MongoDB change stream activated successfully',
        data: {
          database: database || 'default',
          collection,
          triggerId,
          watchOperations: this.getWatchOperations(triggerId),
          requirements: [
            'MongoDB 3.6+ required',
            'Replica set or sharded cluster required for change streams',
            'Read concern "majority" enabled',
          ],
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to activate MongoDB trigger for workflow ${workflowId}:`, error);

      // Check for common errors
      let errorMessage = error.message;
      if (error.message.includes('not supported')) {
        errorMessage = 'Change streams require a MongoDB replica set or sharded cluster. Standalone MongoDB instances are not supported.';
      }

      return {
        success: false,
        message: 'Failed to activate MongoDB trigger',
        error: errorMessage,
      };
    }
  }

  /**
   * Deactivate MongoDB change stream for a workflow
   */
  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating MongoDB trigger for workflow ${workflowId}`);

      const trigger = this.activeTriggers.get(workflowId);

      if (!trigger) {
        this.logger.warn(`No active MongoDB trigger found for workflow ${workflowId}`);
        return {
          success: true,
          message: 'No active MongoDB trigger found',
        };
      }

      await this.closeChangeStream(trigger);
      this.activeTriggers.delete(workflowId);

      this.logger.log(`✅ MongoDB trigger deactivated successfully for workflow ${workflowId}`);

      return {
        success: true,
        message: 'MongoDB change stream closed successfully',
      };
    } catch (error: any) {
      this.logger.error(`Failed to deactivate MongoDB trigger for workflow ${workflowId}:`, error);
      this.activeTriggers.delete(workflowId);

      return {
        success: false,
        message: 'Failed to deactivate MongoDB trigger (removed locally)',
      };
    }
  }

  /**
   * Get status of MongoDB trigger for a workflow
   */
  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.MONGODB,
        message: 'MongoDB trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.MONGODB,
      message: 'MongoDB change stream active',
      metadata: {
        database: trigger.database,
        collection: trigger.collection,
        triggerId: trigger.triggerId,
        activatedAt: trigger.activatedAt,
        watchOperations: this.getWatchOperations(trigger.triggerId),
      },
    };
  }

  /**
   * Get trigger type identifier
   */
  getTriggerType(): TriggerType {
    return TriggerType.MONGODB;
  }

  /**
   * Handle change stream events
   */
  private async handleChangeEvent(
    workflowId: string,
    change: ChangeStreamDocument,
    triggerId: string
  ) {
    this.logger.debug(`Change event received for workflow ${workflowId}: ${change.operationType}`);

    // Filter events based on trigger type
    const shouldTrigger = this.shouldTriggerEvent(change.operationType, triggerId);

    if (!shouldTrigger) {
      this.logger.debug(`Skipping event ${change.operationType} for trigger ${triggerId}`);
      return;
    }

    try {
      // Prepare event data
      const eventData = this.prepareEventData(change);

      // Execute workflow
      await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: {
          mongodbEvent: eventData,
        },
      });

      this.logger.log(`✅ Triggered workflow ${workflowId} with MongoDB ${change.operationType} event`);
    } catch (error) {
      this.logger.error(`Failed to execute workflow ${workflowId}:`, error);
    }
  }

  /**
   * Check if event should trigger based on trigger ID
   */
  private shouldTriggerEvent(operationType: string, triggerId: string): boolean {
    switch (triggerId) {
      case 'document_inserted':
        return operationType === 'insert';
      case 'document_updated':
        return operationType === 'update' || operationType === 'replace';
      case 'document_deleted':
        return operationType === 'delete';
      case 'all_changes':
        return ['insert', 'update', 'replace', 'delete'].includes(operationType);
      default:
        return operationType === 'insert';
    }
  }

  /**
   * Prepare event data from change stream document
   */
  private prepareEventData(change: ChangeStreamDocument): any {
    const baseData = {
      operationType: change.operationType,
      timestamp: new Date(),
      clusterTime: change.clusterTime,
      namespace: {
        database: (change as any).ns?.db,
        collection: (change as any).ns?.coll,
      },
    };

    switch (change.operationType) {
      case 'insert':
        return {
          ...baseData,
          document: (change as any).fullDocument,
          documentId: (change as any).documentKey?._id?.toString(),
        };

      case 'update':
      case 'replace':
        return {
          ...baseData,
          document: (change as any).fullDocument,
          documentId: (change as any).documentKey?._id?.toString(),
          updateDescription: (change as any).updateDescription,
          documentBeforeChange: (change as any).fullDocumentBeforeChange,
        };

      case 'delete':
        return {
          ...baseData,
          documentId: (change as any).documentKey?._id?.toString(),
          documentBeforeChange: (change as any).fullDocumentBeforeChange,
        };

      default:
        return baseData;
    }
  }

  /**
   * Build aggregation pipeline for change stream
   */
  private buildPipeline(triggerId: string): any[] {
    const operationTypes = this.getWatchOperations(triggerId);

    if (operationTypes.length === 0) {
      return [];
    }

    return [
      {
        $match: {
          operationType: { $in: operationTypes },
        },
      },
    ];
  }

  /**
   * Get operations to watch based on trigger ID
   */
  private getWatchOperations(triggerId: string): string[] {
    switch (triggerId) {
      case 'document_inserted':
        return ['insert'];
      case 'document_updated':
        return ['update', 'replace'];
      case 'document_deleted':
        return ['delete'];
      case 'all_changes':
        return ['insert', 'update', 'replace', 'delete'];
      default:
        return ['insert'];
    }
  }

  /**
   * Handle stream error and attempt reconnection
   */
  private async handleStreamError(workflowId: string, triggerConfig: MongoDBTriggerConfig) {
    this.logger.warn(`Attempting to reconnect change stream for workflow ${workflowId}`);

    const trigger = this.activeTriggers.get(workflowId);
    if (trigger) {
      try {
        await this.closeChangeStream(trigger);
      } catch (error) {
        this.logger.error('Error closing broken change stream:', error);
      }
    }

    this.activeTriggers.delete(workflowId);

    // Wait before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Attempt to reactivate
    try {
      await this.activate(workflowId, triggerConfig);
    } catch (error) {
      this.logger.error(`Failed to reconnect change stream for workflow ${workflowId}:`, error);
    }
  }

  /**
   * Close change stream and MongoDB client
   */
  private async closeChangeStream(trigger: ActiveTrigger) {
    try {
      await trigger.changeStream.close();
    } catch (error) {
      this.logger.error('Error closing change stream:', error);
    }

    try {
      await trigger.client.close();
    } catch (error) {
      this.logger.error('Error closing MongoDB client:', error);
    }
  }

  /**
   * Decrypt credential config
   */
  private decryptCredentialConfig(encryptedConfig: any): any {
    try {
      const encrypted = encryptedConfig.data || encryptedConfig.encrypted;
      const iv = encryptedConfig.iv;
      const authTag = encryptedConfig.authTag;

      if (!encrypted || !iv || !authTag) {
        throw new Error('Invalid encrypted credential format');
      }

      const secretKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');

      if (!secretKey) {
        throw new Error('CONNECTOR_ENCRYPTION_KEY not set in environment');
      }

      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(secretKey.slice(0, 32));

      const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Credential decryption failed:', error);
      throw new Error(`Failed to decrypt credential: ${error.message}`);
    }
  }
}
