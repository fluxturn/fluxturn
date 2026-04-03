import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as crypto from 'crypto';
import {
  ITriggerService,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
  TriggerType,
} from '../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../database/platform.service';

interface AwsS3TriggerConfig {
  triggerId?: string;
  bucket?: string;
  prefix?: string;
  credentialId?: string;
  connectorConfigId?: string;
  actionParams?: {
    bucket?: string;
    prefix?: string;
    triggerId?: string;
  };
}

interface S3TriggerConfig {
  bucket: string;
  prefix?: string;
  topicArn?: string;
  subscriptionArn?: string;
  triggerId: string;
}

interface ActiveTrigger {
  workflowId: string;
  triggerId: string;
  config: S3TriggerConfig;
  credentials: any;
}

@Injectable()
export class AwsS3TriggerService implements ITriggerService, OnModuleDestroy {
  private readonly logger = new Logger(AwsS3TriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
  ) {}

  getTriggerType(): TriggerType {
    return TriggerType.AWS_S3;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Cleaning up AWS S3 triggers...');
    const deactivationPromises: Promise<TriggerDeactivationResult>[] = [];

    for (const workflowId of this.activeTriggers.keys()) {
      deactivationPromises.push(
        this.deactivate(workflowId).catch((error) => {
          this.logger.error(`Failed to deactivate trigger for workflow ${workflowId}:`, error);
          return { success: false, message: `Cleanup failed: ${error.message}` };
        }),
      );
    }

    await Promise.all(deactivationPromises);
    this.logger.log('AWS S3 trigger cleanup completed');
  }

  async activate(
    workflowId: string,
    triggerConfig: AwsS3TriggerConfig,
  ): Promise<TriggerActivationResult> {
    try {
      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'object_created';
      const bucket = triggerConfig.bucket || triggerConfig.actionParams?.bucket;
      const prefix = triggerConfig.prefix || triggerConfig.actionParams?.prefix;

      this.logger.log(`Activating AWS S3 trigger ${triggerId} for workflow ${workflowId}`);

      if (!bucket) {
        return {
          success: false,
          message: 'S3 bucket is required for AWS S3 trigger',
          error: 'Missing bucket in trigger configuration',
        };
      }

      // Get credentials
      const credentialId = triggerConfig.credentialId || triggerConfig.connectorConfigId;
      let decryptedCredentials: any = {};

      if (credentialId) {
        decryptedCredentials = await this.getCredentials(credentialId);
      }

      const { accessKeyId, secretAccessKey, region } = decryptedCredentials || {};

      if (!accessKeyId || !secretAccessKey) {
        return {
          success: false,
          message: 'AWS credentials are required',
          error: 'Missing accessKeyId or secretAccessKey in credentials',
        };
      }

      // Configure AWS SDK
      AWS.config.update({
        accessKeyId,
        secretAccessKey,
        region: region || 'us-east-1',
      });

      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const webhookUrl = `${appUrl}/api/v1/webhooks/aws-s3/${workflowId}`;

      // For S3 triggers, we provide setup instructions since they require AWS infrastructure
      const setupInstructions = this.getSetupInstructions(bucket, triggerId, webhookUrl, prefix);

      // Store trigger configuration
      const s3TriggerConfig: S3TriggerConfig = {
        bucket,
        prefix,
        triggerId,
      };

      this.activeTriggers.set(workflowId, {
        workflowId,
        triggerId,
        config: s3TriggerConfig,
        credentials: decryptedCredentials,
      });

      this.logger.log(`AWS S3 trigger activated for bucket: ${bucket}`);

      return {
        success: true,
        message: 'AWS S3 trigger configuration ready. Manual AWS setup may be required.',
        data: {
          bucket,
          prefix,
          webhookUrl,
          setupRequired: true,
          instructions: setupInstructions,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to activate AWS S3 trigger for workflow ${workflowId}:`, error);
      return {
        success: false,
        message: 'Failed to activate AWS S3 trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating AWS S3 trigger for workflow ${workflowId}`);

      const activeTrigger = this.activeTriggers.get(workflowId);

      if (activeTrigger) {
        // If we created SNS infrastructure, clean it up here
        if (activeTrigger.config.subscriptionArn) {
          try {
            const sns = new AWS.SNS({ region: activeTrigger.credentials.region || 'us-east-1' });
            await sns.unsubscribe({ SubscriptionArn: activeTrigger.config.subscriptionArn }).promise();
            this.logger.log(`SNS subscription ${activeTrigger.config.subscriptionArn} deleted`);
          } catch (error) {
            this.logger.warn(`Failed to delete SNS subscription:`, error.message);
          }
        }

        this.activeTriggers.delete(workflowId);
      }

      return {
        success: true,
        message: 'AWS S3 trigger deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to deactivate AWS S3 trigger for workflow ${workflowId}:`, error);
      this.activeTriggers.delete(workflowId);
      return {
        success: false,
        message: `Failed to deactivate AWS S3 trigger: ${error.message}`,
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const activeTrigger = this.activeTriggers.get(workflowId);

    if (!activeTrigger) {
      return {
        active: false,
        type: TriggerType.AWS_S3,
        message: 'No active trigger found for this workflow',
      };
    }

    return {
      active: true,
      type: TriggerType.AWS_S3,
      message: 'AWS S3 trigger is active',
      metadata: {
        triggerId: activeTrigger.triggerId,
        bucket: activeTrigger.config.bucket,
        prefix: activeTrigger.config.prefix,
      },
    };
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  private async getCredentials(credentialId: string): Promise<any> {
    try {
      const query = `SELECT credentials FROM connector_configs WHERE id = $1`;
      const result = await this.platformService.query(query, [credentialId]);

      if (result.rows.length === 0) {
        return null;
      }

      const credentials = result.rows[0].credentials;

      if (credentials?.iv && (credentials?.data || credentials?.encrypted) && credentials?.authTag) {
        return this.decryptCredentials(credentials);
      }

      return credentials;
    } catch (error) {
      this.logger.error(`Failed to fetch credentials ${credentialId}:`, error);
      return null;
    }
  }

  private decryptCredentials(encryptedConfig: any): any {
    try {
      const encrypted = encryptedConfig.data || encryptedConfig.encrypted;
      const iv = encryptedConfig.iv;
      const authTag = encryptedConfig.authTag;

      const secretKey = this.configService.get<string>('CONNECTOR_ENCRYPTION_KEY');
      if (!secretKey) {
        throw new Error('CONNECTOR_ENCRYPTION_KEY not set');
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
      throw error;
    }
  }

  private getSetupInstructions(bucket: string, triggerId: string, webhookUrl: string, prefix?: string): string[] {
    const eventType = triggerId === 'object_created'
      ? 's3:ObjectCreated:*'
      : 's3:ObjectRemoved:*';

    return [
      '1. Go to AWS Console > S3 > Your Bucket > Properties',
      '2. Scroll to "Event notifications" and click "Create event notification"',
      `3. Event name: fluxturn-${triggerId}`,
      prefix ? `4. Prefix filter: ${prefix}` : '4. (Optional) Set prefix/suffix filters if needed',
      `5. Event types: Select "${eventType}"`,
      '6. Destination: Choose one of the following:',
      '   Option A (SNS):',
      '     - Create an SNS topic',
      '     - Subscribe the topic to this HTTPS endpoint:',
      `       ${webhookUrl}`,
      '   Option B (Lambda):',
      '     - Create a Lambda function that forwards to:',
      `       ${webhookUrl}`,
      '7. Save the event notification',
    ];
  }
}
