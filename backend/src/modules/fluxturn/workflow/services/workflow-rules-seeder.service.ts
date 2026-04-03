import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantService } from '../../../qdrant/qdrant.service';
import OpenAI from 'openai';

/**
 * Seeds workflow rules, patterns, and best practices into Qdrant
 * These are retrieved via RAG to provide context-specific guidance to the AI
 */
@Injectable()
export class WorkflowRulesSeederService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowRulesSeederService.name);
  private readonly WORKFLOW_RULES_COLLECTION = 'workflow_rules';
  private readonly EMBEDDING_DIMENSION = 1536;
  private openai: OpenAI;

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is not set - workflow rules seeding will be skipped');
      this.openai = null;
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async onModuleInit() {
    if (!this.openai) {
      this.logger.log('Skipping workflow rules seeding (OpenAI API key not configured)');
      return;
    }

    try {
      await this.seedWorkflowRules();
    } catch (error) {
      this.logger.error('Failed to seed workflow rules:', error);
    }
  }

  /**
   * Create embedding for text
   */
  private async createEmbedding(text: string): Promise<number[]> {
    const model = this.configService.get<string>('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small';
    const response = await this.openai.embeddings.create({
      model,
      input: text,
    });
    return response.data[0].embedding;
  }

  /**
   * Seed workflow rules and patterns into Qdrant
   */
  async seedWorkflowRules(): Promise<void> {
    this.logger.log('🧠 Seeding workflow rules and patterns into Qdrant...');

    try {
      // Ensure collection exists (createCollection handles existing collections)
      await this.qdrantService.createCollection(this.WORKFLOW_RULES_COLLECTION, this.EMBEDDING_DIMENSION, 'cosine');
      this.logger.log(`Collection ready: ${this.WORKFLOW_RULES_COLLECTION}`);

      const rules = this.getWorkflowRules();

      for (const rule of rules) {
        // Create searchable text from rule
        const searchText = `${rule.category} ${rule.pattern} ${rule.description} ${rule.when_to_use} ${rule.required_nodes.join(' ')}`;
        const embedding = await this.createEmbedding(searchText);

        await this.qdrantService.upsertVectors(this.WORKFLOW_RULES_COLLECTION, [
          {
            id: rule.id,
            vector: embedding,
            payload: rule,
          },
        ]);
      }

      this.logger.log(`✅ Seeded ${rules.length} workflow rules into Qdrant`);
    } catch (error) {
      this.logger.error('Error seeding workflow rules:', error);
      throw error;
    }
  }

  /**
   * Define workflow rules, patterns, and best practices
   * These guide the AI on when to use specific node types and connectors
   */
  private getWorkflowRules(): any[] {
    return [
      // ==================== EMAIL & COMMUNICATION PATTERNS ====================
      {
        id: 'rule_email_trigger_pattern',
        category: 'email_automation',
        pattern: 'Email Trigger → Process → Action',
        description: 'Monitor email inbox and trigger workflows when new emails arrive',
        when_to_use: 'gmail receive email, monitor inbox, email notification, new message',
        required_nodes: ['GMAIL_TRIGGER', 'CONNECTOR_TRIGGER'],
        suggested_actions: ['SEND_SLACK', 'SEND_EMAIL', 'HTTP_REQUEST', 'CONNECTOR_ACTION'],
        example: 'When Gmail receives email from client, send Slack notification',
      },
      {
        id: 'rule_form_to_notification',
        category: 'form_automation',
        pattern: 'Form Trigger → Send Notification',
        description: 'Capture form submissions and notify team via messaging platforms',
        when_to_use: 'form submit, form submission, contact form, lead capture, survey response',
        required_nodes: ['FORM_TRIGGER'],
        suggested_actions: ['SEND_SLACK', 'SEND_EMAIL', 'CONNECTOR_ACTION'],
        example: 'When form is submitted, send Slack message to #sales channel',
      },
      {
        id: 'rule_form_to_sheets',
        category: 'data_storage',
        pattern: 'Form Trigger → Store Data',
        description: 'Save form submissions to Google Sheets or database',
        when_to_use: 'save to sheets, store form data, log submissions, record responses',
        required_nodes: ['FORM_TRIGGER'],
        suggested_actions: ['CONNECTOR_ACTION'],
        required_connectors: ['google_sheets'],
        example: 'When form submitted, append row to Google Sheets',
      },
      {
        id: 'rule_email_to_sheets',
        category: 'data_storage',
        pattern: 'Email Trigger → Extract Data → Save to Sheets',
        description: 'Monitor emails and log important information to spreadsheets',
        when_to_use: 'email to sheets, log emails, track correspondence, save email data',
        required_nodes: ['GMAIL_TRIGGER', 'CONNECTOR_TRIGGER'],
        suggested_actions: ['TRANSFORM', 'CONNECTOR_ACTION'],
        required_connectors: ['gmail', 'google_sheets'],
        example: 'When Gmail receives invoice email, extract details and save to Google Sheets',
      },

      // ==================== SOCIAL MEDIA PATTERNS ====================
      {
        id: 'rule_social_posting',
        category: 'social_media',
        pattern: 'Trigger → Post to Social Media',
        description: 'Automatically post content to social media platforms',
        when_to_use: 'post to twitter, share on facebook, publish social media, cross-post',
        required_nodes: ['MANUAL_TRIGGER', 'SCHEDULE_TRIGGER', 'WEBHOOK_TRIGGER'],
        suggested_actions: ['CONNECTOR_ACTION'],
        required_connectors: ['twitter', 'facebook_graph', 'instagram', 'linkedin'],
        example: 'When schedule triggers, post tweet to Twitter',
      },
      {
        id: 'rule_social_monitoring',
        category: 'social_media',
        pattern: 'Social Media Trigger → Analyze → Notify',
        description: 'Monitor social media mentions and respond to engagement',
        when_to_use: 'monitor twitter, track mentions, social listening, engagement alerts',
        required_nodes: ['CONNECTOR_TRIGGER'],
        suggested_actions: ['TRANSFORM', 'SEND_SLACK', 'CONNECTOR_ACTION'],
        required_connectors: ['twitter', 'facebook_graph'],
        example: 'When Twitter mentions brand, send Slack notification to marketing team',
      },

      // ==================== SCHEDULED AUTOMATION PATTERNS ====================
      {
        id: 'rule_scheduled_reports',
        category: 'reporting',
        pattern: 'Schedule Trigger → Fetch Data → Send Report',
        description: 'Generate and send automated reports on a schedule',
        when_to_use: 'daily report, weekly summary, scheduled email, recurring notification',
        required_nodes: ['SCHEDULE_TRIGGER'],
        suggested_actions: ['HTTP_REQUEST', 'TRANSFORM', 'SEND_EMAIL', 'SEND_SLACK'],
        example: 'Every Monday at 9am, fetch analytics data and email summary report',
      },
      {
        id: 'rule_scheduled_backup',
        category: 'data_management',
        pattern: 'Schedule Trigger → Fetch → Store',
        description: 'Regularly backup data from one system to another',
        when_to_use: 'backup data, sync database, scheduled export, data replication',
        required_nodes: ['SCHEDULE_TRIGGER'],
        suggested_actions: ['HTTP_REQUEST', 'CONNECTOR_ACTION'],
        required_connectors: ['google_drive', 'dropbox', 'aws_s3', 'mongodb', 'mysql'],
        example: 'Every night at midnight, export database and upload to Google Drive',
      },

      // ==================== WEBHOOK & API PATTERNS ====================
      {
        id: 'rule_webhook_to_action',
        category: 'api_integration',
        pattern: 'Webhook Trigger → Process → Action',
        description: 'Receive webhook events from external services and trigger actions',
        when_to_use: 'webhook, api callback, external event, service integration',
        required_nodes: ['WEBHOOK_TRIGGER'],
        suggested_actions: ['TRANSFORM', 'HTTP_REQUEST', 'SEND_SLACK', 'CONNECTOR_ACTION'],
        example: 'When Stripe webhook receives payment, send Slack notification',
      },
      {
        id: 'rule_api_polling',
        category: 'api_integration',
        pattern: 'Schedule → Poll API → Check Changes → Notify',
        description: 'Regularly check external API for updates and notify when changes detected',
        when_to_use: 'check api, poll endpoint, monitor changes, api monitoring',
        required_nodes: ['SCHEDULE_TRIGGER'],
        suggested_actions: ['HTTP_REQUEST', 'CONDITION', 'SEND_SLACK', 'SEND_EMAIL'],
        example: 'Every 5 minutes, check API for new orders and send alert if found',
      },

      // ==================== NOTIFICATION PATTERNS ====================
      {
        id: 'rule_multi_channel_notification',
        category: 'notifications',
        pattern: 'Trigger → Send to Multiple Channels',
        description: 'Send notifications to multiple platforms simultaneously',
        when_to_use: 'notify team, alert multiple channels, broadcast message, multi-platform notification',
        required_nodes: ['FORM_TRIGGER', 'WEBHOOK_TRIGGER', 'MANUAL_TRIGGER'],
        suggested_actions: ['SEND_SLACK', 'SEND_EMAIL', 'CONNECTOR_ACTION'],
        example: 'When critical alert triggered, send Slack message AND email AND SMS',
      },
      {
        id: 'rule_conditional_notification',
        category: 'notifications',
        pattern: 'Trigger → Check Condition → Conditional Notify',
        description: 'Send notifications only when specific conditions are met',
        when_to_use: 'if condition, only when, conditional alert, filtered notification',
        required_nodes: ['FORM_TRIGGER', 'WEBHOOK_TRIGGER', 'SCHEDULE_TRIGGER'],
        suggested_actions: ['CONDITION', 'SEND_SLACK', 'SEND_EMAIL'],
        example: 'When form submitted, if amount > 1000, send email to manager',
      },

      // ==================== DATA PROCESSING PATTERNS ====================
      {
        id: 'rule_data_transformation',
        category: 'data_processing',
        pattern: 'Trigger → Transform Data → Store/Send',
        description: 'Process and transform data before storing or sending',
        when_to_use: 'format data, transform json, process data, clean data, map fields',
        required_nodes: ['FORM_TRIGGER', 'WEBHOOK_TRIGGER', 'HTTP_REQUEST'],
        suggested_actions: ['TRANSFORM', 'CODE', 'HTTP_REQUEST', 'CONNECTOR_ACTION'],
        example: 'When webhook received, transform JSON structure and POST to API',
      },
      {
        id: 'rule_data_enrichment',
        category: 'data_processing',
        pattern: 'Trigger → Fetch Additional Data → Combine → Action',
        description: 'Enrich trigger data by fetching additional information from APIs',
        when_to_use: 'enrich data, lookup information, fetch details, combine data sources',
        required_nodes: ['FORM_TRIGGER', 'WEBHOOK_TRIGGER'],
        suggested_actions: ['HTTP_REQUEST', 'TRANSFORM', 'CONNECTOR_ACTION'],
        example: 'When lead submitted, lookup company info from API and save to CRM',
      },

      // ==================== DATABASE PATTERNS ====================
      {
        id: 'rule_database_insert',
        category: 'database',
        pattern: 'Trigger → Process → Insert to Database',
        description: 'Store workflow data in database for persistence',
        when_to_use: 'save to database, insert record, store data, persist information',
        required_nodes: ['FORM_TRIGGER', 'WEBHOOK_TRIGGER', 'HTTP_REQUEST'],
        suggested_actions: ['DATABASE_QUERY', 'CONNECTOR_ACTION'],
        required_connectors: ['mongodb', 'mysql'],
        example: 'When order placed, insert order details into MongoDB',
      },
      {
        id: 'rule_database_query',
        category: 'database',
        pattern: 'Schedule → Query Database → Process Results → Notify',
        description: 'Regularly query database and process results',
        when_to_use: 'query database, fetch records, database lookup, check database',
        required_nodes: ['SCHEDULE_TRIGGER', 'MANUAL_TRIGGER'],
        suggested_actions: ['DATABASE_QUERY', 'TRANSFORM', 'SEND_EMAIL', 'SEND_SLACK'],
        required_connectors: ['mongodb', 'mysql'],
        example: 'Every hour, query pending orders and send summary to operations team',
      },

      // ==================== CRM & SALES PATTERNS ====================
      {
        id: 'rule_lead_capture',
        category: 'crm',
        pattern: 'Form Trigger → Create CRM Lead',
        description: 'Automatically create leads in CRM from form submissions',
        when_to_use: 'add lead, create contact, save to crm, new prospect',
        required_nodes: ['FORM_TRIGGER', 'WEBHOOK_TRIGGER'],
        suggested_actions: ['CONNECTOR_ACTION'],
        required_connectors: ['salesforce', 'hubspot', 'zoho', 'pipedrive'],
        example: 'When contact form submitted, create lead in Salesforce',
      },
      {
        id: 'rule_deal_notification',
        category: 'crm',
        pattern: 'CRM Trigger → Check Stage → Notify Team',
        description: 'Monitor CRM deal stages and notify team of important changes',
        when_to_use: 'deal won, opportunity closed, sale notification, crm update',
        required_nodes: ['CONNECTOR_TRIGGER'],
        suggested_actions: ['CONDITION', 'SEND_SLACK', 'SEND_EMAIL'],
        required_connectors: ['salesforce', 'hubspot', 'pipedrive'],
        example: 'When Salesforce deal stage changes to Won, send celebration message to Slack',
      },

      // ==================== E-COMMERCE PATTERNS ====================
      {
        id: 'rule_order_fulfillment',
        category: 'ecommerce',
        pattern: 'Order Webhook → Process → Notify → Update Inventory',
        description: 'Automate order processing and fulfillment workflow',
        when_to_use: 'new order, order placed, purchase notification, order processing',
        required_nodes: ['WEBHOOK_TRIGGER'],
        suggested_actions: ['TRANSFORM', 'SEND_EMAIL', 'CONNECTOR_ACTION'],
        required_connectors: ['shopify', 'woocommerce', 'stripe'],
        example: 'When Shopify order placed, send confirmation email and update inventory',
      },
      {
        id: 'rule_payment_processing',
        category: 'ecommerce',
        pattern: 'Payment Webhook → Verify → Notify → Record',
        description: 'Handle payment webhooks and trigger post-payment actions',
        when_to_use: 'payment received, transaction complete, payment webhook, stripe payment',
        required_nodes: ['WEBHOOK_TRIGGER'],
        suggested_actions: ['CONDITION', 'SEND_EMAIL', 'CONNECTOR_ACTION', 'DATABASE_QUERY'],
        required_connectors: ['stripe', 'paypal'],
        example: 'When Stripe payment succeeds, send receipt email and update database',
      },

      // ==================== FILE & STORAGE PATTERNS ====================
      {
        id: 'rule_file_upload_processing',
        category: 'file_storage',
        pattern: 'File Upload → Process → Store → Notify',
        description: 'Handle file uploads and store in cloud storage',
        when_to_use: 'upload file, save file, store document, file storage',
        required_nodes: ['FORM_TRIGGER', 'WEBHOOK_TRIGGER'],
        suggested_actions: ['CONNECTOR_ACTION', 'SEND_SLACK'],
        required_connectors: ['google_drive', 'dropbox', 'aws_s3'],
        example: 'When file uploaded via form, save to Google Drive and notify team',
      },
      {
        id: 'rule_file_monitoring',
        category: 'file_storage',
        pattern: 'Schedule → Check for New Files → Process Files',
        description: 'Monitor cloud storage for new files and process them',
        when_to_use: 'monitor folder, check for files, watch directory, file detection',
        required_nodes: ['SCHEDULE_TRIGGER'],
        suggested_actions: ['CONNECTOR_ACTION', 'HTTP_REQUEST', 'SEND_SLACK'],
        required_connectors: ['google_drive', 'dropbox', 'aws_s3'],
        example: 'Every 15 minutes, check Google Drive folder for new invoices and process',
      },

      // ==================== MERGE PATTERNS ====================
      {
        id: 'rule_merge_append',
        category: 'data_processing',
        pattern: 'Multiple Inputs → Merge (Append) → Combined Output',
        description: 'Combine data from multiple sources into a single list',
        when_to_use: 'merge data, combine lists, append data, join multiple sources',
        required_nodes: ['MERGE'],
        suggested_actions: ['TRANSFORM', 'SEND_EMAIL', 'CONNECTOR_ACTION'],
        example: 'Fetch users from Database A and Database B, merge them into single list',
      },
      {
        id: 'rule_merge_by_fields',
        category: 'data_processing',
        pattern: 'Multiple Inputs → Merge by Fields → Matched Output',
        description: 'Join data from different sources based on matching field values (like SQL JOIN)',
        when_to_use: 'join data, match records, combine by id, merge by field, enrich data',
        required_nodes: ['MERGE'],
        suggested_actions: ['TRANSFORM', 'DATABASE_QUERY', 'CONNECTOR_ACTION'],
        example: 'Merge customer data from CRM with order data from database by customer_id',
      },
      {
        id: 'rule_merge_by_position',
        category: 'data_processing',
        pattern: 'Multiple Inputs → Merge by Position → Combined Output',
        description: 'Combine data from different sources by matching index positions',
        when_to_use: 'combine by position, merge parallel arrays, match by index',
        required_nodes: ['MERGE'],
        suggested_actions: ['TRANSFORM', 'HTTP_REQUEST'],
        example: 'Merge names from one API with emails from another API based on array position',
      },
      {
        id: 'rule_merge_cross_join',
        category: 'data_processing',
        pattern: 'Multiple Inputs → Merge All (Cross Join) → Cartesian Product',
        description: 'Create all possible combinations of items from different inputs',
        when_to_use: 'cross join, all combinations, cartesian product, generate pairs',
        required_nodes: ['MERGE'],
        suggested_actions: ['TRANSFORM', 'CONNECTOR_ACTION'],
        example: 'Create all combinations of products and pricing tiers for bulk processing',
      },
      {
        id: 'rule_merge_choose_branch',
        category: 'workflow_control',
        pattern: 'Multiple Inputs → Merge (Choose Branch) → Selected Output',
        description: 'Wait for multiple branches and output data from a specific branch',
        when_to_use: 'choose branch, select input, wait for all, conditional output',
        required_nodes: ['MERGE'],
        suggested_actions: ['TRANSFORM', 'SEND_SLACK', 'CONNECTOR_ACTION'],
        example: 'Wait for both API call and database query to complete, then use database results',
      },
    ];
  }
}
