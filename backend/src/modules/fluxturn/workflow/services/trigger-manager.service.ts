import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GmailTriggerService } from '../../connectors/communication/gmail';
import { TelegramTriggerService } from '../../connectors/communication/telegram';
import { WhatsAppTriggerService } from '../../connectors/communication/whatsapp';
import { SlackTriggerService } from '../../connectors/communication/slack';
import { ImapTriggerService } from '../../connectors/communication/imap';
import { GoogleCalendarTriggerService } from '../../connectors/communication/google-calendar';
import { TwilioTriggerService } from '../../connectors/communication/twilio';
import { CalendlyTriggerService } from '../../connectors/communication/calendly';
import { GitHubTriggerService } from '../../connectors/development/github';
import { GitLabTriggerService } from '../../connectors/development/gitlab';
import { MondayTriggerService } from '../../connectors/crm/monday';
import { TypeformTriggerService } from '../../connectors/forms/typeform';
import { JotformTriggerService } from '../../connectors/crm/jotform';
import { PinterestTriggerService } from '../../connectors/social/pinterest';
import { AsanaTriggerService } from '../../connectors/project-management/asana';
import { AwsS3TriggerService } from '../../connectors/storage/aws-s3';
import { FreshdeskTriggerService } from '../../connectors/support/freshdesk';
import { ServiceNowTriggerService } from '../../connectors/support/servicenow';
import { GoogleSheetsTriggerService } from '../../connectors/storage/google-sheets';
import { GoogleDriveTriggerService } from '../../connectors/storage/google-drive';
import { MongoDBTriggerService } from '../../connectors/storage/mongodb';
import { TwitterTriggerService } from '../../connectors/social/twitter';
import { FacebookTriggerService } from '../../connectors/social/facebook-graph';
import { StripeTriggerService } from '../../connectors/ecommerce/stripe';
import { TrelloTriggerService } from '../../connectors/project-management/trello';
import { PipedriveTriggerService } from '../../connectors/crm/pipedrive';
import { MailchimpTriggerService } from '../../connectors/marketing/mailchimp';
import { ActiveCampaignTriggerService } from '../../connectors/marketing/activecampaign';
import { BrevoTriggerService } from '../../connectors/marketing/brevo';
import { PlaidTriggerService } from '../../connectors/finance/plaid';
import { QuickBooksTriggerService } from '../../connectors/finance/quickbooks';
import { XeroTriggerService } from '../../connectors/finance/xero';
import { RedisTriggerService } from '../../connectors/storage/redis';
import { WebflowTriggerService } from '../../connectors/cms/webflow';
import { ContentfulTriggerService } from '../../connectors/cms/contentful';
import { ScheduleTriggerService } from './triggers/schedule-trigger.service';
import {
  ITriggerService,
  TriggerType,
  TriggerActivationResult,
  TriggerDeactivationResult,
  TriggerStatus,
} from '../interfaces/trigger.interface';

/**
 * Trigger Manager Service
 *
 * Central service for managing ALL trigger types in the platform.
 * Follows Strategy Pattern to delegate to specific trigger implementations.
 *
 * Benefits:
 * - Single entry point for all trigger operations
 * - Decouples WorkflowService from specific trigger implementations
 * - Easy to add new trigger types (just implement ITriggerService)
 * - Consistent API across all trigger types
 */
@Injectable()
export class TriggerManagerService {
  private readonly logger = new Logger(TriggerManagerService.name);

  // Registry of all trigger service implementations
  private readonly triggerServices: Map<TriggerType, ITriggerService>;

  constructor(
    private readonly gmailTriggerService: GmailTriggerService,
    private readonly twitterTriggerService: TwitterTriggerService,
    private readonly telegramTriggerService: TelegramTriggerService,
    private readonly stripeTriggerService: StripeTriggerService,
    private readonly facebookTriggerService: FacebookTriggerService,
    private readonly whatsappTriggerService: WhatsAppTriggerService,
    private readonly slackTriggerService: SlackTriggerService,
    private readonly scheduleTriggerService: ScheduleTriggerService,
    private readonly githubTriggerService: GitHubTriggerService,
    private readonly googleCalendarTriggerService: GoogleCalendarTriggerService,
    private readonly googleSheetsTriggerService: GoogleSheetsTriggerService,
    private readonly googleDriveTriggerService: GoogleDriveTriggerService,
    private readonly trelloTriggerService: TrelloTriggerService,
    private readonly twilioTriggerService: TwilioTriggerService,
    private readonly pipedriveTriggerService: PipedriveTriggerService,
    private readonly mailchimpTriggerService: MailchimpTriggerService,
    private readonly plaidTriggerService: PlaidTriggerService,
    private readonly redisTriggerService: RedisTriggerService,
    private readonly mongodbTriggerService: MongoDBTriggerService,
    private readonly gitlabTriggerService: GitLabTriggerService,
    private readonly mondayTriggerService: MondayTriggerService,
    private readonly typeformTriggerService: TypeformTriggerService,
    private readonly jotformTriggerService: JotformTriggerService,
    private readonly pinterestTriggerService: PinterestTriggerService,
    private readonly asanaTriggerService: AsanaTriggerService,
    private readonly awsS3TriggerService: AwsS3TriggerService,
    private readonly freshdeskTriggerService: FreshdeskTriggerService,
    private readonly calendlyTriggerService: CalendlyTriggerService,
    private readonly quickbooksTriggerService: QuickBooksTriggerService,
    private readonly xeroTriggerService: XeroTriggerService,
    private readonly servicenowTriggerService: ServiceNowTriggerService,
    private readonly activecampaignTriggerService: ActiveCampaignTriggerService,
    private readonly brevoTriggerService: BrevoTriggerService,
    private readonly webflowTriggerService: WebflowTriggerService,
    private readonly contentfulTriggerService: ContentfulTriggerService,
  ) {
    // Initialize trigger registry
    this.triggerServices = new Map();

    // Register trigger services
    this.registerTrigger(this.gmailTriggerService);
    this.registerTrigger(this.twitterTriggerService);
    this.registerTrigger(this.telegramTriggerService);
    this.registerTrigger(this.stripeTriggerService);
    this.registerTrigger(this.facebookTriggerService);
    this.registerTrigger(this.whatsappTriggerService);
    this.registerTrigger(this.slackTriggerService);
    this.registerTrigger(this.scheduleTriggerService);
    this.registerTrigger(this.githubTriggerService);
    this.registerTrigger(this.googleCalendarTriggerService);
    this.registerTrigger(this.googleSheetsTriggerService);
    this.registerTrigger(this.googleDriveTriggerService);
    this.registerTrigger(this.trelloTriggerService);
    this.registerTrigger(this.twilioTriggerService);
    this.registerTrigger(this.pipedriveTriggerService);
    this.registerTrigger(this.mailchimpTriggerService);
    this.registerTrigger(this.plaidTriggerService);
    this.registerTrigger(this.redisTriggerService);
    this.registerTrigger(this.mongodbTriggerService);
    this.registerTrigger(this.gitlabTriggerService);
    this.registerTrigger(this.mondayTriggerService);
    this.registerTrigger(this.typeformTriggerService);
    this.registerTrigger(this.jotformTriggerService);
    this.registerTrigger(this.pinterestTriggerService);
    this.registerTrigger(this.asanaTriggerService);
    this.registerTrigger(this.awsS3TriggerService);
    this.registerTrigger(this.freshdeskTriggerService);
    this.registerTrigger(this.calendlyTriggerService);
    this.registerTrigger(this.quickbooksTriggerService);
    this.registerTrigger(this.xeroTriggerService);
    this.registerTrigger(this.servicenowTriggerService);
    this.registerTrigger(this.activecampaignTriggerService);
    this.registerTrigger(this.brevoTriggerService);
    this.registerTrigger(this.webflowTriggerService);
    this.registerTrigger(this.contentfulTriggerService);

    this.logger.log(`Registered ${this.triggerServices.size} trigger service(s)`);
  }

  /**
   * Register a trigger service implementation
   */
  private registerTrigger(triggerService: ITriggerService): void {
    const triggerType = triggerService.getTriggerType();
    this.triggerServices.set(triggerType, triggerService);
    this.logger.log(`Registered trigger service: ${triggerType}`);
  }

  /**
   * Activate a trigger for a workflow
   *
   * @param workflowId - The workflow ID
   * @param triggerType - Type of trigger to activate
   * @param triggerConfig - Trigger-specific configuration
   * @returns Activation result
   */
  async activateTrigger(
    workflowId: string,
    triggerType: TriggerType,
    triggerConfig?: any
  ): Promise<TriggerActivationResult> {
    this.logger.log(`Activating ${triggerType} trigger for workflow: ${workflowId}`);

    const triggerService = this.getTriggerService(triggerType);
    return await triggerService.activate(workflowId, triggerConfig);
  }

  /**
   * Deactivate a trigger for a workflow
   *
   * @param workflowId - The workflow ID
   * @param triggerType - Type of trigger to deactivate
   * @returns Deactivation result
   */
  async deactivateTrigger(
    workflowId: string,
    triggerType: TriggerType
  ): Promise<TriggerDeactivationResult> {
    this.logger.log(`Deactivating ${triggerType} trigger for workflow: ${workflowId}`);

    const triggerService = this.getTriggerService(triggerType);
    return await triggerService.deactivate(workflowId);
  }

  /**
   * Get trigger status for a workflow
   *
   * @param workflowId - The workflow ID
   * @param triggerType - Type of trigger to check
   * @returns Trigger status
   */
  async getTriggerStatus(workflowId: string, triggerType: TriggerType): Promise<TriggerStatus> {
    const triggerService = this.getTriggerService(triggerType);
    return await triggerService.getStatus(workflowId);
  }

  /**
   * Activate all triggers for a workflow
   * (Called when workflow is activated)
   *
   * @param workflowId - The workflow ID
   * @param workflow - The workflow definition
   * @returns Results for all triggers
   */
  async activateWorkflowTriggers(workflowId: string, workflow: any): Promise<TriggerActivationResult[]> {
    this.logger.log(`Activating triggers for workflow: ${workflowId}`);

    const results: TriggerActivationResult[] = [];
    const triggerNodes = this.findTriggerNodes(workflow);

    if (triggerNodes.length === 0) {
      this.logger.warn(`No trigger nodes found in workflow ${workflowId}`);
      return [];
    }

    for (const triggerNode of triggerNodes) {
      const triggerType = this.mapNodeTypeToTriggerType(triggerNode.type, triggerNode.data);

      if (triggerType) {
        // Skip triggers that don't need activation
        // WEBHOOK_TRIGGER: Always available through WebhookController, no registration needed
        // MANUAL_TRIGGER: User-triggered, no activation needed
        // FORM_TRIGGER: Always available through FormWebhookController, no registration needed
        if (triggerType === TriggerType.WEBHOOK || triggerType === TriggerType.MANUAL || triggerType === TriggerType.FORM) {
          this.logger.debug(`Skipping activation for ${triggerType} (no registration needed)`);
          results.push({
            success: true,
            message: `${triggerType} is always available (no activation needed)`,
            data: null
          });
          continue;
        }

        try {
          // Debug: Log the full trigger node data
          this.logger.debug(`Trigger node data for ${triggerType}:`, JSON.stringify(triggerNode.data));
          this.logger.debug(`credentialId: ${triggerNode.data?.credentialId}`);
          this.logger.debug(`connectorConfigId: ${triggerNode.data?.connectorConfigId}`);

          // Prepare trigger config with credentialId properly extracted
          const triggerConfig = {
            ...triggerNode.data,
            ...triggerNode.data?.actionParams,
            credentialId: triggerNode.data?.credentialId || triggerNode.data?.connectorConfigId
          };

          const result = await this.activateTrigger(workflowId, triggerType, triggerConfig);
          results.push(result);
        } catch (error: any) {
          this.logger.error(`Failed to activate ${triggerType} for workflow ${workflowId}:`, error);
          results.push({
            success: false,
            message: `Failed to activate ${triggerType}`,
            error: error.message,
          });
        }
      }
    }

    return results;
  }

  /**
   * Deactivate all triggers for a workflow
   * (Called when workflow is deactivated or deleted)
   *
   * @param workflowId - The workflow ID
   * @param workflow - The workflow definition
   * @returns Results for all triggers
   */
  async deactivateWorkflowTriggers(
    workflowId: string,
    workflow: any
  ): Promise<TriggerDeactivationResult[]> {
    this.logger.log(`Deactivating triggers for workflow: ${workflowId}`);

    const results: TriggerDeactivationResult[] = [];
    const triggerNodes = this.findTriggerNodes(workflow);

    for (const triggerNode of triggerNodes) {
      const triggerType = this.mapNodeTypeToTriggerType(triggerNode.type, triggerNode.data);

      if (triggerType) {
        // Skip triggers that don't need deactivation
        // WEBHOOK_TRIGGER: Always available through WebhookController, no deregistration needed
        // MANUAL_TRIGGER: User-triggered, no deactivation needed
        // FORM_TRIGGER: Always available through FormWebhookController, no deregistration needed
        if (triggerType === TriggerType.WEBHOOK || triggerType === TriggerType.MANUAL || triggerType === TriggerType.FORM) {
          this.logger.debug(`Skipping deactivation for ${triggerType} (no deregistration needed)`);
          results.push({
            success: true,
            message: `${triggerType} doesn't require deactivation`,
          });
          continue;
        }

        try {
          const result = await this.deactivateTrigger(workflowId, triggerType);
          results.push(result);
        } catch (error: any) {
          this.logger.error(
            `Failed to deactivate ${triggerType} for workflow ${workflowId}:`,
            error
          );
          results.push({
            success: false,
            message: `Failed to deactivate ${triggerType}`,
          });
        }
      }
    }

    return results;
  }

  /**
   * Get the trigger service for a specific trigger type
   */
  private getTriggerService(triggerType: TriggerType): ITriggerService {
    const service = this.triggerServices.get(triggerType);

    if (!service) {
      throw new NotFoundException(`Trigger service not found for type: ${triggerType}`);
    }

    return service;
  }

  /**
   * Find all trigger nodes in a workflow
   */
  private findTriggerNodes(workflow: any): any[] {
    const canvas = workflow.workflow?.canvas || workflow.canvas;
    if (!canvas || !canvas.nodes) return [];

    return canvas.nodes.filter((node: any) => this.isTriggerNode(node.type));
  }

  /**
   * Check if a node type is a trigger
   */
  private isTriggerNode(nodeType: string): boolean {
    return (
      nodeType === 'GMAIL_TRIGGER' ||
      nodeType === 'FACEBOOK_TRIGGER' ||
      nodeType === 'SLACK_TRIGGER' ||
      nodeType === 'TWITTER_TRIGGER' ||
      nodeType === 'TELEGRAM_TRIGGER' ||
      nodeType === 'WHATSAPP_TRIGGER' ||
      nodeType === 'GITHUB_TRIGGER' ||
      nodeType === 'GOOGLE_CALENDAR_TRIGGER' ||
      nodeType === 'GOOGLE_SHEETS_TRIGGER' ||
      nodeType === 'PIPEDRIVE_TRIGGER' ||
      nodeType === 'MAILCHIMP_TRIGGER' ||
      nodeType === 'PLAID_TRIGGER' ||
      nodeType === 'MONGODB_TRIGGER' ||
      nodeType === 'GITLAB_TRIGGER' ||
      nodeType === 'MONDAY_TRIGGER' ||
      nodeType === 'TYPEFORM_TRIGGER' ||
      nodeType === 'JOTFORM_TRIGGER' ||
      nodeType === 'PINTEREST_TRIGGER' ||
      nodeType === 'ASANA_TRIGGER' ||
      nodeType === 'AWS_S3_TRIGGER' ||
      nodeType === 'FRESHDESK_TRIGGER' ||
      nodeType === 'CALENDLY_TRIGGER' ||
      nodeType === 'QUICKBOOKS_TRIGGER' ||
      nodeType === 'XERO_TRIGGER' ||
      nodeType === 'SERVICENOW_TRIGGER' ||
      nodeType === 'ACTIVECAMPAIGN_TRIGGER' ||
      nodeType === 'BREVO_TRIGGER' ||
      nodeType === 'WEBFLOW_TRIGGER' ||
      nodeType === 'CONTENTFUL_TRIGGER' ||
      nodeType === 'WEBHOOK_TRIGGER' ||
      nodeType === 'SCHEDULE_TRIGGER' ||
      nodeType === 'FORM_TRIGGER' ||
      nodeType === 'MANUAL_TRIGGER' ||
      nodeType === 'CONNECTOR_TRIGGER'
    );
  }

  /**
   * Map node type to trigger type enum
   * For CONNECTOR_TRIGGER nodes, checks the connectorType to determine the specific trigger
   */
  private mapNodeTypeToTriggerType(nodeType: string, nodeData?: any): TriggerType | null {
    switch (nodeType) {
      case 'GMAIL_TRIGGER':
        return TriggerType.GMAIL;
      case 'FACEBOOK_TRIGGER':
        return TriggerType.FACEBOOK;
      case 'SLACK_TRIGGER':
        return TriggerType.SLACK;
      case 'TWITTER_TRIGGER':
        return TriggerType.TWITTER;
      case 'TELEGRAM_TRIGGER':
        return TriggerType.TELEGRAM;
      case 'WHATSAPP_TRIGGER':
        return TriggerType.WHATSAPP;
      case 'GITHUB_TRIGGER':
        return TriggerType.GITHUB;
      case 'GOOGLE_CALENDAR_TRIGGER':
        return TriggerType.GOOGLE_CALENDAR;
      case 'GOOGLE_SHEETS_TRIGGER':
        return TriggerType.GOOGLE_SHEETS;
      case 'PIPEDRIVE_TRIGGER':
        return TriggerType.PIPEDRIVE;
      case 'MAILCHIMP_TRIGGER':
        return TriggerType.MAILCHIMP;
      case 'PLAID_TRIGGER':
        return TriggerType.PLAID;
      case 'MONGODB_TRIGGER':
        return TriggerType.MONGODB;
      case 'GITLAB_TRIGGER':
        return TriggerType.GITLAB;
      case 'MONDAY_TRIGGER':
        return TriggerType.MONDAY;
      case 'TYPEFORM_TRIGGER':
        return TriggerType.TYPEFORM;
      case 'JOTFORM_TRIGGER':
        return TriggerType.JOTFORM;
      case 'PINTEREST_TRIGGER':
        return TriggerType.PINTEREST;
      case 'ASANA_TRIGGER':
        return TriggerType.ASANA;
      case 'AWS_S3_TRIGGER':
        return TriggerType.AWS_S3;
      case 'FRESHDESK_TRIGGER':
        return TriggerType.FRESHDESK;
      case 'CALENDLY_TRIGGER':
        return TriggerType.CALENDLY;
      case 'QUICKBOOKS_TRIGGER':
        return TriggerType.QUICKBOOKS;
      case 'XERO_TRIGGER':
        return TriggerType.XERO;
      case 'SERVICENOW_TRIGGER':
        return TriggerType.SERVICENOW;
      case 'ACTIVECAMPAIGN_TRIGGER':
        return TriggerType.ACTIVECAMPAIGN;
      case 'BREVO_TRIGGER':
        return TriggerType.BREVO;
      case 'WEBFLOW_TRIGGER':
        return TriggerType.WEBFLOW;
      case 'CONTENTFUL_TRIGGER':
        return TriggerType.CONTENTFUL;
      case 'WEBHOOK_TRIGGER':
        return TriggerType.WEBHOOK;
      case 'SCHEDULE_TRIGGER':
        return TriggerType.SCHEDULE;
      case 'FORM_TRIGGER':
        return TriggerType.FORM;
      case 'MANUAL_TRIGGER':
        return TriggerType.MANUAL;
      case 'CONNECTOR_TRIGGER':
        // For generic connector triggers, check the connectorType field
        if (nodeData?.connectorType) {
          const connectorType = nodeData.connectorType.toLowerCase();
          this.logger.log(`Mapping CONNECTOR_TRIGGER with connectorType: ${connectorType}`);

          // Map connector type to specific trigger type
          switch (connectorType) {
            case 'gmail':
              return TriggerType.GMAIL;
            case 'facebook':
            case 'facebook_graph':
              return TriggerType.FACEBOOK;
            case 'slack':
              return TriggerType.SLACK;
            case 'twitter':
              return TriggerType.TWITTER;
            case 'telegram':
              return TriggerType.TELEGRAM;
            case 'whatsapp':
              return TriggerType.WHATSAPP;
            case 'github':
              return TriggerType.GITHUB;
            case 'google_calendar':
            case 'google-calendar':
              return TriggerType.GOOGLE_CALENDAR;
            case 'google_sheets':
            case 'google-sheets':
              return TriggerType.GOOGLE_SHEETS;
            case 'google_drive':
            case 'google-drive':
              return TriggerType.GOOGLE_DRIVE;
            case 'trello':
              return TriggerType.TRELLO;
            case 'twilio':
              return TriggerType.TWILIO;
            case 'pipedrive':
              return TriggerType.PIPEDRIVE;
            case 'mailchimp':
              return TriggerType.MAILCHIMP;
            case 'plaid':
              return TriggerType.PLAID;
            case 'mongodb':
              return TriggerType.MONGODB;
            case 'gitlab':
              return TriggerType.GITLAB;
            case 'monday':
              return TriggerType.MONDAY;
            case 'typeform':
              return TriggerType.TYPEFORM;
            case 'jotform':
              return TriggerType.JOTFORM;
            case 'pinterest':
              return TriggerType.PINTEREST;
            case 'asana':
              return TriggerType.ASANA;
            case 'aws_s3':
            case 'aws-s3':
              return TriggerType.AWS_S3;
            case 'freshdesk':
              return TriggerType.FRESHDESK;
            case 'calendly':
              return TriggerType.CALENDLY;
            case 'quickbooks':
              return TriggerType.QUICKBOOKS;
            case 'xero':
              return TriggerType.XERO;
            case 'servicenow':
              return TriggerType.SERVICENOW;
            case 'activecampaign':
              return TriggerType.ACTIVECAMPAIGN;
            case 'brevo':
              return TriggerType.BREVO;
            case 'webflow':
              return TriggerType.WEBFLOW;
            case 'contentful':
              return TriggerType.CONTENTFUL;
            default:
              this.logger.warn(`Unknown connector type: ${connectorType}`);
              return null;
          }
        }
        this.logger.warn('CONNECTOR_TRIGGER node missing connectorType field');
        return null;
      default:
        return null;
    }
  }

  /**
   * Get all registered trigger types
   */
  getRegisteredTriggers(): TriggerType[] {
    return Array.from(this.triggerServices.keys());
  }
}
