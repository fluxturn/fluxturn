import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Connector Trigger Executor
 * Generic trigger for all connector-based triggers (Gmail, Twitter, Telegram, Facebook, etc.)
 * The trigger data is provided by the polling/webhook service
 */
@Injectable()
export class ConnectorTriggerExecutor extends BaseNodeExecutor {
  readonly supportedTypes = [
    'CONNECTOR_TRIGGER',
    'GMAIL_TRIGGER',
    'TWITTER_TRIGGER',
    'TELEGRAM_TRIGGER',
    'FACEBOOK_TRIGGER',
    'SLACK_TRIGGER',
    'DISCORD_TRIGGER',
    'LINKEDIN_TRIGGER',
    'INSTAGRAM_TRIGGER',
    'YOUTUBE_TRIGGER',
    'TIKTOK_TRIGGER',
    'PINTEREST_TRIGGER',
    'REDDIT_TRIGGER',
    'HUBSPOT_TRIGGER',
    'SALESFORCE_TRIGGER',
    'SHOPIFY_TRIGGER',
    'STRIPE_TRIGGER',
    'TWILIO_TRIGGER',
    'SENDGRID_TRIGGER',
    'MAILCHIMP_TRIGGER',
    'BREVO_TRIGGER',
  ];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};

    // Connector triggers (polling/webhook) provide data when they fire
    // During workflow execution, just pass through the trigger data
    if (inputData.length > 0) {
      return inputData;
    }

    // For manual execution, return default trigger data
    return [{
      json: {
        ...(context.$json || {}),
        triggeredAt: new Date().toISOString(),
        trigger: config.connectorType || config.connector || 'connector',
        triggerEvent: config.triggerId || config.eventType || 'unknown',
      }
    }];
  }
}
