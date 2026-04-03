import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { ConnectorsService } from '../../connectors.service';
import axios from 'axios';

/**
 * HubSpot Webhook Management Service
 * Manages HubSpot webhook lifecycle for workflow triggers
 *
 * HubSpot Webhook Architecture:
 * - HubSpot uses webhook subscriptions through their API
 * - Subscriptions are created per event type (company.creation, contact.propertyChange, etc.)
 * - Events are sent to your configured webhook URL
 *
 * Event Types:
 * - company.creation, company.deletion, company.propertyChange
 * - contact.creation, contact.deletion, contact.propertyChange
 * - deal.creation, deal.deletion, deal.propertyChange
 * - ticket.creation, ticket.deletion, ticket.propertyChange
 */
@Injectable()
export class HubSpotWebhookService {
  private readonly logger = new Logger(HubSpotWebhookService.name);
  private readonly hubspotApiUrl = 'https://api.hubapi.com';

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => ConnectorsService))
    private readonly connectorsService: ConnectorsService,
  ) {}

  /**
   * Create HubSpot webhook subscription for a workflow
   */
  async createWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Creating HubSpot webhook for workflow ${workflowId}`);

    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const hubspotTriggers = this.findHubSpotTriggers(workflow);
      if (hubspotTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no HubSpot triggers`);
        return { success: false, message: 'No HubSpot triggers found' };
      }

      const results = [];

      for (const trigger of hubspotTriggers) {
        try {
          const result = await this.createWebhookForTrigger(workflowId, trigger);
          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to create webhook for trigger ${trigger.id}:`, error);
          results.push({
            success: false,
            triggerId: trigger.id,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        webhooks: results,
      };
    } catch (error) {
      this.logger.error(`Failed to create HubSpot webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Delete HubSpot webhook subscription for a workflow
   */
  async deleteWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Deleting HubSpot webhook for workflow ${workflowId}`);

    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const hubspotTriggers = this.findHubSpotTriggers(workflow);
      if (hubspotTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no HubSpot triggers`);
        return { success: true, message: 'No webhooks to delete' };
      }

      const results = [];

      for (const trigger of hubspotTriggers) {
        try {
          const result = await this.deleteWebhookForTrigger(workflowId, trigger);
          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to delete webhook for trigger ${trigger.id}:`, error);
          results.push({
            success: false,
            triggerId: trigger.id,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        webhooks: results,
      };
    } catch (error) {
      this.logger.error(`Failed to delete HubSpot webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Create webhook for a specific trigger node
   * Note: HubSpot webhooks are typically configured at the app level,
   * so we primarily track the subscription for this workflow
   */
  private async createWebhookForTrigger(workflowId: string, trigger: any): Promise<any> {
    const triggerParams = trigger.data?.triggerParams || trigger.data?.actionParams || {};
    const credentialId = trigger.data?.credentialId || trigger.data?.connectorConfigId;

    if (!credentialId) {
      throw new Error('No credential ID configured for trigger');
    }

    const triggerId = trigger.data?.triggerId || triggerParams.triggerId;
    if (!triggerId) {
      throw new Error('Trigger ID is required for HubSpot trigger');
    }

    // Get HubSpot credentials
    const credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    const accessToken = credentials.accessToken || credentials.appToken || credentials.apiKey;

    if (!accessToken) {
      throw new Error('HubSpot access token is required');
    }

    // Build webhook URL
    const webhookUrl = this.buildWebhookUrl(workflowId);
    this.logger.log(`HubSpot webhook URL: ${webhookUrl}`);

    // Map trigger ID to HubSpot event type
    const eventType = this.mapTriggerIdToEventType(triggerId);
    this.logger.log(`HubSpot event type for trigger ${triggerId}: ${eventType}`);

    // For HubSpot, webhook subscriptions are typically managed at the app level
    // We store the webhook configuration for reference
    const webhookConfig = {
      workflowId,
      triggerId: trigger.id,
      eventType,
      webhookUrl,
      createdAt: new Date().toISOString(),
    };

    // Store webhook config in trigger data
    await this.storeWebhookConfig(workflowId, trigger.id, webhookConfig);

    this.logger.log(`Configured HubSpot webhook for event ${eventType}`);

    return {
      success: true,
      eventType,
      url: webhookUrl,
      config: webhookConfig,
    };
  }

  /**
   * Delete webhook for a specific trigger node
   */
  private async deleteWebhookForTrigger(workflowId: string, trigger: any): Promise<any> {
    const webhookConfig = trigger.data?.webhookConfig;

    if (!webhookConfig) {
      this.logger.warn(`No webhook config found for trigger ${trigger.id}`);
      return { success: true, message: 'No webhook to delete' };
    }

    // Clear webhook config from trigger data
    await this.clearWebhookConfig(workflowId, trigger.id);

    this.logger.log(`Cleared HubSpot webhook config for trigger ${trigger.id}`);

    return {
      success: true,
      triggerId: trigger.id,
    };
  }

  /**
   * Map trigger ID to HubSpot event type
   */
  private mapTriggerIdToEventType(triggerId: string): string {
    const mapping: Record<string, string> = {
      // Company triggers
      'company_created': 'company.creation',
      'company_deleted': 'company.deletion',
      'company_property_changed': 'company.propertyChange',
      // Contact triggers
      'contact_created': 'contact.creation',
      'contact_deleted': 'contact.deletion',
      'contact_property_changed': 'contact.propertyChange',
      // Deal triggers
      'deal_created': 'deal.creation',
      'deal_deleted': 'deal.deletion',
      'deal_property_changed': 'deal.propertyChange',
      // Ticket triggers
      'ticket_created': 'ticket.creation',
      'ticket_deleted': 'ticket.deletion',
      'ticket_property_changed': 'ticket.propertyChange',
    };

    return mapping[triggerId] || triggerId;
  }

  /**
   * Build webhook URL for workflow
   */
  private buildWebhookUrl(workflowId: string): string {
    const baseUrl = process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:3000';
    const apiPrefix = process.env.API_PREFIX || 'api/v1';
    return `${baseUrl}/${apiPrefix}/webhooks/hubspot/${workflowId}`;
  }

  /**
   * Store webhook config in workflow canvas data
   */
  private async storeWebhookConfig(
    workflowId: string,
    triggerId: string,
    webhookConfig: any,
  ): Promise<void> {
    const query = `
      UPDATE workflows
      SET canvas = jsonb_set(
        canvas,
        '{nodes}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN node->>'id' = $2
              THEN jsonb_set(node, '{data,webhookConfig}', $3::jsonb)
              ELSE node
            END
          )
          FROM jsonb_array_elements(canvas->'nodes') AS node
        )
      )
      WHERE id = $1
    `;

    await this.platformService.query(query, [workflowId, triggerId, JSON.stringify(webhookConfig)]);
  }

  /**
   * Clear webhook config from workflow canvas data
   */
  private async clearWebhookConfig(workflowId: string, triggerId: string): Promise<void> {
    const query = `
      UPDATE workflows
      SET canvas = jsonb_set(
        canvas,
        '{nodes}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN node->>'id' = $2
              THEN node #- '{data,webhookConfig}'
              ELSE node
            END
          )
          FROM jsonb_array_elements(canvas->'nodes') AS node
        )
      )
      WHERE id = $1
    `;

    await this.platformService.query(query, [workflowId, triggerId]);
  }

  /**
   * Get workflow from database
   */
  private async getWorkflow(workflowId: string): Promise<any> {
    const query = `SELECT * FROM workflows WHERE id = $1`;
    const result = await this.platformService.query(query, [workflowId]);
    return result.rows[0];
  }

  /**
   * Find HubSpot trigger nodes in workflow
   */
  private findHubSpotTriggers(workflow: any): any[] {
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return [];
    }

    return canvas.nodes.filter(
      (node: any) =>
        node.type === 'HUBSPOT_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'hubspot'),
    );
  }
}
