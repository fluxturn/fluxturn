/**
 * Trigger Service Interface
 *
 * All trigger implementations (Gmail, Facebook, Slack, etc.) must implement this interface
 * This ensures consistent behavior across all trigger types
 */
export interface ITriggerService {
  /**
   * Activate trigger for a workflow
   * @param workflowId - The workflow ID
   * @param triggerConfig - Trigger-specific configuration
   * @returns Activation result
   */
  activate(workflowId: string, triggerConfig: any): Promise<TriggerActivationResult>;

  /**
   * Deactivate trigger for a workflow
   * @param workflowId - The workflow ID
   * @returns Deactivation result
   */
  deactivate(workflowId: string): Promise<TriggerDeactivationResult>;

  /**
   * Get trigger status for a workflow
   * @param workflowId - The workflow ID
   * @returns Current trigger status
   */
  getStatus(workflowId: string): Promise<TriggerStatus>;

  /**
   * Get the trigger type identifier
   */
  getTriggerType(): TriggerType;
}

/**
 * Trigger types supported by the platform
 */
export enum TriggerType {
  GMAIL = 'GMAIL_TRIGGER',
  FACEBOOK = 'FACEBOOK_TRIGGER',
  SLACK = 'SLACK_TRIGGER',
  DISCORD = 'DISCORD_TRIGGER',
  TWITTER = 'TWITTER_TRIGGER',
  TELEGRAM = 'TELEGRAM_TRIGGER',
  WHATSAPP = 'WHATSAPP_TRIGGER',
  STRIPE = 'STRIPE_TRIGGER',
  GUMROAD = 'GUMROAD_TRIGGER',
  PADDLE = 'PADDLE_TRIGGER',
  GITHUB = 'GITHUB_TRIGGER',
  GOOGLE_CALENDAR = 'GOOGLE_CALENDAR_TRIGGER',
  GOOGLE_SHEETS = 'GOOGLE_SHEETS_TRIGGER',
  GOOGLE_DRIVE = 'GOOGLE_DRIVE_TRIGGER',
  TRELLO = 'TRELLO_TRIGGER',
  TWILIO = 'TWILIO_TRIGGER',
  IMAP = 'IMAP_TRIGGER',
  PIPEDRIVE = 'PIPEDRIVE_TRIGGER',
  HUBSPOT = 'HUBSPOT_TRIGGER',
  MAILCHIMP = 'MAILCHIMP_TRIGGER',
  SENDGRID = 'SENDGRID_TRIGGER',
  PLAID = 'PLAID_TRIGGER',
  REDIS = 'REDIS_TRIGGER',
  // HEAD triggers
  TOGGL = 'TOGGL_TRIGGER',
  CLOCKIFY = 'CLOCKIFY_TRIGGER',
  CHARGEBEE = 'CHARGEBEE_TRIGGER',
  WISE = 'WISE_TRIGGER',
  // Develop triggers
  MONGODB = 'MONGODB_TRIGGER',
  GITLAB = 'GITLAB_TRIGGER',
  MONDAY = 'MONDAY_TRIGGER',
  TYPEFORM = 'TYPEFORM_TRIGGER',
  JOTFORM = 'JOTFORM_TRIGGER',
  PINTEREST = 'PINTEREST_TRIGGER',
  ASANA = 'ASANA_TRIGGER',
  CLICKUP = 'CLICKUP_TRIGGER',
  AWS_S3 = 'AWS_S3_TRIGGER',
  FRESHDESK = 'FRESHDESK_TRIGGER',
  QUICKBOOKS = 'QUICKBOOKS_TRIGGER',
  XERO = 'XERO_TRIGGER',
  SERVICENOW = 'SERVICENOW_TRIGGER',
  CALENDLY = 'CALENDLY_TRIGGER',
  ACTIVECAMPAIGN = 'ACTIVECAMPAIGN_TRIGGER',
  BREVO = 'BREVO_TRIGGER',
  WEBFLOW = 'WEBFLOW_TRIGGER',
  CONTENTFUL = 'CONTENTFUL_TRIGGER',
  TEAMS = 'TEAMS_TRIGGER',
  SALESFORCE = 'SALESFORCE_TRIGGER',
  INSTAGRAM = 'INSTAGRAM_TRIGGER',
  JIRA = 'JIRA_TRIGGER',
  INTERCOM = 'INTERCOM_TRIGGER',
  ZENDESK = 'ZENDESK_TRIGGER',
  POSTGRESQL = 'POSTGRESQL_TRIGGER',
  SEGMENT = 'SEGMENT_TRIGGER',
  AIRTABLE = 'AIRTABLE_TRIGGER',
  PAYPAL = 'PAYPAL_TRIGGER',
  ZOHO = 'ZOHO_TRIGGER',
  FACEBOOK_ADS = 'FACEBOOK_ADS_TRIGGER',
  KLAVIYO = 'KLAVIYO_TRIGGER',
  WEBHOOK = 'WEBHOOK_TRIGGER',
  SCHEDULE = 'SCHEDULE_TRIGGER',
  FORM = 'FORM_TRIGGER',
  MANUAL = 'MANUAL_TRIGGER',
  CONNECTOR = 'CONNECTOR_TRIGGER',
}

/**
 * Result of trigger activation
 */
export interface TriggerActivationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Result of trigger deactivation
 */
export interface TriggerDeactivationResult {
  success: boolean;
  message: string;
}

/**
 * Trigger status information
 */
export interface TriggerStatus {
  active: boolean;
  type: TriggerType;
  message?: string;
  metadata?: Record<string, any>;
}
