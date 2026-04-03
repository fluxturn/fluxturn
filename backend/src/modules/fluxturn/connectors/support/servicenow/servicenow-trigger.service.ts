import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  ITriggerService,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
  TriggerType,
} from '../../../workflow/interfaces/trigger.interface';
import { PlatformService } from '../../../../database/platform.service';

interface ServiceNowTriggerConfig {
  triggerId?: string;
  secretToken?: string;
  credentials?: {
    secretToken?: string;
  };
  actionParams?: {
    triggerId?: string;
    secretToken?: string;
  };
  credentialId?: string;
  connectorConfigId?: string;
}

interface ActiveTrigger {
  webhookUrl: string;
  secretToken: string;
  triggerId: string;
  activatedAt: Date;
}

@Injectable()
export class ServiceNowTriggerService implements ITriggerService {
  private readonly logger = new Logger(ServiceNowTriggerService.name);
  private readonly activeTriggers = new Map<string, ActiveTrigger>();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService
  ) {}

  async activate(workflowId: string, triggerConfig: ServiceNowTriggerConfig): Promise<TriggerActivationResult> {
    try {
      this.logger.log(`Activating ServiceNow trigger for workflow ${workflowId}`);

      const triggerId = triggerConfig.triggerId || triggerConfig.actionParams?.triggerId || 'incident_created';
      const webhookUrl = this.generateWebhookUrl(workflowId);
      const secretToken = this.generateSecretToken();

      // ServiceNow webhooks are configured via Business Rules
      this.activeTriggers.set(workflowId, {
        webhookUrl,
        secretToken,
        triggerId,
        activatedAt: new Date(),
      });

      await this.storeWebhookData(workflowId, webhookUrl, secretToken);

      return {
        success: true,
        message: 'ServiceNow webhook URL generated - manual setup required',
        data: {
          webhookUrl,
          secretToken,
          setupRequired: true,
          instructions: [
            '1. Log in to your ServiceNow instance as an admin',
            '2. Navigate to System Web Services > REST Message',
            '3. Create a new REST Message for Fluxturn webhooks',
            '   - Name: Fluxturn Webhook',
            '   - Endpoint: ' + webhookUrl,
            '   - Authentication: None (token in header)',
            '4. Add HTTP Request Header:',
            '   - Name: X-ServiceNow-Secret',
            '   - Value: ' + secretToken,
            '5. Create a Business Rule on the target table:',
            '   - Table: ' + this.getTableForTrigger(triggerId),
            '   - When: after insert/update',
            '   - Condition: Based on your requirements',
            '   - Script: Call the REST Message with record data',
          ],
          tableInfo: {
            table: this.getTableForTrigger(triggerId),
            event: triggerId,
          },
          sampleBusinessRule: this.getSampleBusinessRule(webhookUrl, secretToken, triggerId),
        },
      };

    } catch (error: any) {
      this.logger.error(`Failed to activate ServiceNow trigger:`, error);
      return {
        success: false,
        message: 'Failed to activate ServiceNow trigger',
        error: error.message,
      };
    }
  }

  async deactivate(workflowId: string): Promise<TriggerDeactivationResult> {
    try {
      this.logger.log(`Deactivating ServiceNow trigger for workflow ${workflowId}`);

      this.activeTriggers.delete(workflowId);
      await this.deleteStoredWebhookData(workflowId);

      return {
        success: true,
        message: 'ServiceNow trigger deactivated. Please also remove the Business Rule from ServiceNow.',
      };

    } catch (error: any) {
      this.logger.error(`Failed to deactivate ServiceNow trigger:`, error);
      return {
        success: false,
        message: 'Failed to deactivate ServiceNow trigger',
      };
    }
  }

  async getStatus(workflowId: string): Promise<TriggerStatus> {
    const trigger = this.activeTriggers.get(workflowId);

    if (!trigger) {
      return {
        active: false,
        type: TriggerType.SERVICENOW,
        message: 'ServiceNow trigger not active',
      };
    }

    return {
      active: true,
      type: TriggerType.SERVICENOW,
      message: 'ServiceNow trigger active',
      metadata: {
        webhookUrl: trigger.webhookUrl,
        triggerId: trigger.triggerId,
        activatedAt: trigger.activatedAt,
      },
    };
  }

  getTriggerType(): TriggerType {
    return TriggerType.SERVICENOW;
  }

  /**
   * Verify ServiceNow webhook secret token
   */
  verifySecretToken(workflowId: string, providedToken: string): boolean {
    const trigger = this.activeTriggers.get(workflowId);
    if (!trigger || !providedToken) return false;

    const expectedBuffer = Buffer.from(trigger.secretToken);
    const providedBuffer = Buffer.from(providedToken);

    if (expectedBuffer.byteLength !== providedBuffer.byteLength) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  }

  getActiveTrigger(workflowId: string): ActiveTrigger | undefined {
    return this.activeTriggers.get(workflowId);
  }

  private getTableForTrigger(triggerId: string): string {
    const tableMap: Record<string, string> = {
      'incident_created': 'incident',
      'incident_updated': 'incident',
      'request_created': 'sc_request',
      'request_updated': 'sc_request',
      'change_created': 'change_request',
      'change_updated': 'change_request',
      'problem_created': 'problem',
      'problem_updated': 'problem',
    };
    return tableMap[triggerId] || 'incident';
  }

  private getSampleBusinessRule(webhookUrl: string, secretToken: string, triggerId: string): string {
    const table = this.getTableForTrigger(triggerId);
    return `
// Sample Business Rule Script for ServiceNow
// Table: ${table}
// When: after insert${triggerId.includes('updated') ? '/update' : ''}

(function executeRule(current, previous) {
  try {
    var request = new sn_ws.RESTMessageV2();
    request.setEndpoint('${webhookUrl}');
    request.setHttpMethod('POST');
    request.setRequestHeader('Content-Type', 'application/json');
    request.setRequestHeader('X-ServiceNow-Secret', '${secretToken}');

    var payload = {
      event: '${triggerId}',
      timestamp: new GlideDateTime().toString(),
      record: {
        sys_id: current.sys_id.toString(),
        number: current.number.toString(),
        short_description: current.short_description.toString(),
        state: current.state.toString(),
        priority: current.priority.toString(),
        assigned_to: current.assigned_to.getDisplayValue(),
        caller_id: current.caller_id ? current.caller_id.getDisplayValue() : '',
        created_on: current.sys_created_on.toString(),
        updated_on: current.sys_updated_on.toString()
      }
    };

    request.setRequestBody(JSON.stringify(payload));
    var response = request.execute();
    gs.info('Fluxturn webhook response: ' + response.getStatusCode());
  } catch (e) {
    gs.error('Fluxturn webhook error: ' + e.message);
  }
})(current, previous);
`.trim();
  }

  private generateWebhookUrl(workflowId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/api/v1/webhooks/servicenow/${workflowId}`;
  }

  private generateSecretToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async storeWebhookData(workflowId: string, webhookUrl: string, secretToken: string): Promise<void> {
    try {
      await this.platformService.query(
        `INSERT INTO workflow_triggers (workflow_id, trigger_type, webhook_data, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (workflow_id, trigger_type) DO UPDATE SET webhook_data = $3, updated_at = NOW()`,
        [workflowId, 'servicenow', JSON.stringify({ webhookUrl, secretToken })]
      );
    } catch (error) {
      this.logger.warn('Failed to store webhook data:', error);
    }
  }

  private async deleteStoredWebhookData(workflowId: string): Promise<void> {
    try {
      await this.platformService.query(
        'DELETE FROM workflow_triggers WHERE workflow_id = $1 AND trigger_type = $2',
        [workflowId, 'servicenow']
      );
    } catch (error) {
      this.logger.warn('Failed to delete stored webhook data:', error);
    }
  }
}
