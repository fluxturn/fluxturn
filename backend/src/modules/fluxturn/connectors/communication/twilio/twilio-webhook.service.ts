import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PlatformService } from '../../../../database/platform.service';
import { ConnectorsService } from '../../connectors.service';
import axios from 'axios';

/**
 * Twilio Webhook Management Service
 * Manages Twilio Event Streams (Sinks & Subscriptions) for workflow triggers
 *
 * Twilio Event Streams Architecture:
 * 1. Sink: A webhook destination where events are sent
 * 2. Subscription: Links event types to a sink
 *
 * Responsibilities:
 * 1. Create Sink (webhook destination) when workflow is activated
 * 2. Create Subscription for desired event types
 * 3. Delete Sink & Subscription when workflow is deactivated
 * 4. Store Sink/Subscription IDs for tracking
 */
@Injectable()
export class TwilioWebhookService {
  private readonly logger = new Logger(TwilioWebhookService.name);
  private readonly eventsApiUrl = 'https://events.twilio.com/v1';

  constructor(
    private readonly platformService: PlatformService,
    @Inject(forwardRef(() => ConnectorsService))
    private readonly connectorsService: ConnectorsService,
  ) {}

  /**
   * Create Twilio webhook (Sink + Subscription) for a workflow
   */
  async createWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Creating Twilio webhook for workflow ${workflowId}`);

    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const twilioTriggers = this.findTwilioTriggers(workflow);
      if (twilioTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no Twilio triggers`);
        return { success: false, message: 'No Twilio triggers found' };
      }

      const results = [];

      for (const trigger of twilioTriggers) {
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
      this.logger.error(`Failed to create Twilio webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Delete Twilio webhook (Sink + Subscription) for a workflow
   */
  async deleteWebhook(workflowId: string): Promise<any> {
    this.logger.log(`Deleting Twilio webhook for workflow ${workflowId}`);

    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const twilioTriggers = this.findTwilioTriggers(workflow);
      if (twilioTriggers.length === 0) {
        this.logger.warn(`Workflow ${workflowId} has no Twilio triggers`);
        return { success: true, message: 'No webhooks to delete' };
      }

      const results = [];

      for (const trigger of twilioTriggers) {
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
      this.logger.error(`Failed to delete Twilio webhook for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Create webhook for a specific trigger node
   */
  private async createWebhookForTrigger(workflowId: string, trigger: any): Promise<any> {
    const triggerParams = trigger.data?.triggerParams || {};
    const credentialId = trigger.data?.credentialId;
    const triggerId = trigger.data?.triggerId;

    if (!credentialId) {
      throw new Error('No credential ID configured for trigger');
    }

    // Get Twilio credentials
    const credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    const accountSid = credentials.accountSid || credentials.account_sid;
    const authToken = credentials.authToken || credentials.auth_token;

    if (!accountSid || !authToken) {
      throw new Error('Twilio Account SID and Auth Token are required');
    }

    // Build webhook URL
    const webhookUrl = this.buildWebhookUrl(workflowId);
    this.logger.log(`Twilio webhook URL: ${webhookUrl}`);

    // Check if webhook already exists
    const existingWebhook = await this.findExistingSink(webhookUrl, accountSid, authToken);

    if (existingWebhook) {
      this.logger.log(`Sink already exists for workflow ${workflowId}`);
      return {
        success: true,
        sinkId: existingWebhook.sid,
        url: webhookUrl,
        existing: true,
      };
    }

    // Get event types for this trigger
    const eventTypes = this.getEventTypesForTrigger(triggerId);

    try {
      // Step 1: Create Sink (webhook destination)
      const sinkResponse = await this.createSink(
        workflowId,
        webhookUrl,
        accountSid,
        authToken,
      );
      const sinkId = sinkResponse.sid;

      // Step 2: Create Subscription for event types
      const subscriptionResponse = await this.createSubscription(
        workflowId,
        sinkId,
        eventTypes,
        accountSid,
        authToken,
      );
      const subscriptionId = subscriptionResponse.sid;

      // Store webhook IDs in trigger data
      await this.storeWebhookIds(workflowId, trigger.id, sinkId, subscriptionId);

      this.logger.log(`Created Twilio webhook: Sink=${sinkId}, Subscription=${subscriptionId}`);

      return {
        success: true,
        sinkId,
        subscriptionId,
        url: webhookUrl,
        eventTypes,
      };
    } catch (error) {
      const errorMessage = error.response?.data || error.message;
      this.logger.error(`Twilio API error: ${JSON.stringify(errorMessage)}`);
      throw new Error(`Twilio webhook creation failed: ${JSON.stringify(errorMessage)}`);
    }
  }

  /**
   * Delete webhook for a specific trigger node
   */
  private async deleteWebhookForTrigger(workflowId: string, trigger: any): Promise<any> {
    const credentialId = trigger.data?.credentialId;
    const sinkId = trigger.data?.sinkId;
    const subscriptionId = trigger.data?.subscriptionId;

    if (!sinkId && !subscriptionId) {
      this.logger.warn(`No webhook IDs found for trigger ${trigger.id}`);
      return { success: true, message: 'No webhook to delete' };
    }

    if (!credentialId) {
      throw new Error('No credential ID configured for trigger');
    }

    // Get Twilio credentials
    const credentials = await this.connectorsService.getConnectorCredentials(credentialId);
    const accountSid = credentials.accountSid || credentials.account_sid;
    const authToken = credentials.authToken || credentials.auth_token;

    if (!accountSid || !authToken) {
      throw new Error('Twilio Account SID and Auth Token are required');
    }

    try {
      // Delete Subscription first (if exists)
      if (subscriptionId) {
        await this.deleteSubscription(subscriptionId, accountSid, authToken);
      }

      // Delete Sink
      if (sinkId) {
        await this.deleteSink(sinkId, accountSid, authToken);
      }

      // Clear webhook IDs from trigger data
      await this.clearWebhookIds(workflowId, trigger.id);

      this.logger.log(`Deleted Twilio webhook: Sink=${sinkId}, Subscription=${subscriptionId}`);

      return {
        success: true,
        sinkId,
        subscriptionId,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        this.logger.warn(`Webhook not found, already deleted`);
        await this.clearWebhookIds(workflowId, trigger.id);
        return { success: true, message: 'Webhook already deleted' };
      }
      throw error;
    }
  }

  /**
   * Create a Sink (webhook destination)
   */
  private async createSink(
    workflowId: string,
    webhookUrl: string,
    accountSid: string,
    authToken: string,
  ): Promise<any> {
    const response = await axios.post(
      `${this.eventsApiUrl}/Sinks`,
      new URLSearchParams({
        Description: `FluxTurn Workflow: ${workflowId}`,
        SinkConfiguration: JSON.stringify({
          destination: webhookUrl,
          method: 'POST',
        }),
        SinkType: 'webhook',
      }),
      {
        auth: {
          username: accountSid,
          password: authToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  }

  /**
   * Create a Subscription for event types
   */
  private async createSubscription(
    workflowId: string,
    sinkId: string,
    eventTypes: string[],
    accountSid: string,
    authToken: string,
  ): Promise<any> {
    // Create subscription with first event type
    const response = await axios.post(
      `${this.eventsApiUrl}/Subscriptions`,
      new URLSearchParams({
        Description: `FluxTurn Subscription: ${workflowId}`,
        SinkSid: sinkId,
        Types: JSON.stringify({ type: eventTypes[0] }),
      }),
      {
        auth: {
          username: accountSid,
          password: authToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const subscriptionId = response.data.sid;

    // Add additional event types if any
    for (let i = 1; i < eventTypes.length; i++) {
      await axios.post(
        `${this.eventsApiUrl}/Subscriptions/${subscriptionId}/SubscribedEvents`,
        new URLSearchParams({
          Type: eventTypes[i],
        }),
        {
          auth: {
            username: accountSid,
            password: authToken,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
    }

    return response.data;
  }

  /**
   * Delete a Sink
   */
  private async deleteSink(
    sinkId: string,
    accountSid: string,
    authToken: string,
  ): Promise<void> {
    await axios.delete(`${this.eventsApiUrl}/Sinks/${sinkId}`, {
      auth: {
        username: accountSid,
        password: authToken,
      },
    });
  }

  /**
   * Delete a Subscription
   */
  private async deleteSubscription(
    subscriptionId: string,
    accountSid: string,
    authToken: string,
  ): Promise<void> {
    await axios.delete(`${this.eventsApiUrl}/Subscriptions/${subscriptionId}`, {
      auth: {
        username: accountSid,
        password: authToken,
      },
    });
  }

  /**
   * Find existing Sink by webhook URL
   */
  private async findExistingSink(
    webhookUrl: string,
    accountSid: string,
    authToken: string,
  ): Promise<any> {
    try {
      const response = await axios.get(`${this.eventsApiUrl}/Sinks`, {
        auth: {
          username: accountSid,
          password: authToken,
        },
      });

      const sinks = response.data.sinks || [];
      return sinks.find(
        (sink: any) => sink.sink_configuration?.destination === webhookUrl,
      );
    } catch (error) {
      this.logger.error('Failed to fetch existing sinks:', error);
      return null;
    }
  }

  /**
   * Get event types for a trigger ID
   */
  private getEventTypesForTrigger(triggerId: string): string[] {
    const triggerEventMap: Record<string, string[]> = {
      sms_received: ['com.twilio.messaging.inbound-message.received'],
      whatsapp_received: ['com.twilio.messaging.inbound-message.received'],
      call_received: ['com.twilio.voice.insights.call-summary.complete'],
      message_status_updated: [
        'com.twilio.messaging.message.delivered',
        'com.twilio.messaging.message.failed',
        'com.twilio.messaging.message.undelivered',
      ],
    };

    return triggerEventMap[triggerId] || ['com.twilio.messaging.inbound-message.received'];
  }

  /**
   * Build webhook URL for workflow
   */
  private buildWebhookUrl(workflowId: string): string {
    const baseUrl = process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:3000';
    const apiPrefix = process.env.API_PREFIX || 'api/v1';
    return `${baseUrl}/${apiPrefix}/webhooks/twilio/${workflowId}`;
  }

  /**
   * Store webhook IDs in workflow canvas data
   */
  private async storeWebhookIds(
    workflowId: string,
    triggerId: string,
    sinkId: string,
    subscriptionId: string,
  ): Promise<void> {
    const query = `
      UPDATE workflows
      SET canvas = jsonb_set(
        jsonb_set(
          canvas,
          '{nodes}',
          (
            SELECT jsonb_agg(
              CASE
                WHEN node->>'id' = $2
                THEN jsonb_set(
                  jsonb_set(node, '{data,sinkId}', to_jsonb($3::text)),
                  '{data,subscriptionId}', to_jsonb($4::text)
                )
                ELSE node
              END
            )
            FROM jsonb_array_elements(canvas->'nodes') AS node
          )
        ),
        '{nodes}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN node->>'id' = $2
              THEN jsonb_set(node, '{data,sinkId}', to_jsonb($3::text))
              ELSE node
            END
          )
          FROM jsonb_array_elements(canvas->'nodes') AS node
        )
      )
      WHERE id = $1
    `;

    // Simpler query that just updates sinkId and subscriptionId
    const simpleQuery = `
      UPDATE workflows
      SET canvas = (
        SELECT jsonb_set(
          canvas,
          '{nodes}',
          (
            SELECT jsonb_agg(
              CASE
                WHEN node->>'id' = $2
                THEN node || jsonb_build_object('data',
                  COALESCE(node->'data', '{}'::jsonb) ||
                  jsonb_build_object('sinkId', $3::text, 'subscriptionId', $4::text)
                )
                ELSE node
              END
            )
            FROM jsonb_array_elements(canvas->'nodes') AS node
          )
        )
      )
      WHERE id = $1
    `;

    await this.platformService.query(simpleQuery, [workflowId, triggerId, sinkId, subscriptionId]);
  }

  /**
   * Clear webhook IDs from workflow canvas data
   */
  private async clearWebhookIds(workflowId: string, triggerId: string): Promise<void> {
    const query = `
      UPDATE workflows
      SET canvas = (
        SELECT jsonb_set(
          canvas,
          '{nodes}',
          (
            SELECT jsonb_agg(
              CASE
                WHEN node->>'id' = $2
                THEN node #- '{data,sinkId}' #- '{data,subscriptionId}'
                ELSE node
              END
            )
            FROM jsonb_array_elements(canvas->'nodes') AS node
          )
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
   * Find Twilio trigger nodes in workflow
   */
  private findTwilioTriggers(workflow: any): any[] {
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return [];
    }

    return canvas.nodes.filter(
      (node: any) =>
        node.type === 'TWILIO_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType === 'twilio'),
    );
  }
}
