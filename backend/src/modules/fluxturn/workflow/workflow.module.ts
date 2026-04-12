import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WorkflowController } from './workflow.controller';
import { TemplateController } from './controllers/template.controller';
import { FormWebhookController } from './form-webhook.controller';
import { WebhookController } from './webhook.controller';
import { WorkflowService } from './workflow.service';
import { TemplateService } from './services/template.service';
import { WebhookAuthService } from './services/webhook-auth.service';
import { DatabaseModule } from '../../database/database.module';
import { QueueModule } from '../../queue/queue.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { QdrantModule } from '../../qdrant/qdrant.module';
import { WorkflowExecutionEngine } from './services/workflow-execution.engine';
import { NodeExecutorService } from './services/node-executor.service';
import { ControlFlowService } from './services/control-flow.service';
import { GmailWebhookService, GmailPollingService, GmailTriggerService, GmailToolService, GmailWebhookController } from '../connectors/communication/gmail';
import { TelegramTriggerService, TelegramWebhookController } from '../connectors/communication/telegram';
import { WhatsAppTriggerService, WhatsAppWebhookController } from '../connectors/communication/whatsapp';
import { SlackTriggerService, SlackWebhookController } from '../connectors/communication/slack';
import { TeamsTriggerService, TeamsWebhookController } from '../connectors/communication/teams';
import { ImapTriggerService } from '../connectors/communication/imap';
import { GoogleCalendarTriggerService, GoogleCalendarPollingService } from '../connectors/communication/google-calendar';
import { TwilioTriggerService, TwilioWebhookService, TwilioWebhookController } from '../connectors/communication/twilio';
import { GitHubTriggerService, GitHubWebhookService, GitHubWebhookController } from '../connectors/development/github';
import { GoogleSheetsTriggerService, GoogleSheetsPollingService } from '../connectors/storage/google-sheets';
import { GoogleDriveTriggerService } from '../connectors/storage/google-drive';
import { TwitterTriggerService, TwitterPollingService } from '../connectors/social/twitter';
import { FacebookTriggerService, FacebookWebhookController } from '../connectors/social/facebook-graph';
import { InstagramTriggerService, InstagramWebhookController } from '../connectors/social/instagram';
import { JiraTriggerService, JiraWebhookController } from '../connectors/project-management/jira';
import { StripeTriggerService, StripeWebhookController } from '../connectors/ecommerce/stripe';
import { TrelloTriggerService, TrelloWebhookService, TrelloWebhookController } from '../connectors/project-management/trello';
import { PipedriveTriggerService, PipedriveWebhookService, PipedriveWebhookController } from '../connectors/crm/pipedrive';
import { HubSpotTriggerService, HubSpotWebhookService, HubSpotWebhookController } from '../connectors/crm/hubspot';
import { MailchimpTriggerService, MailchimpWebhookService, MailchimpWebhookController } from '../connectors/marketing/mailchimp';
import { SendGridTriggerService, SendGridWebhookController } from '../connectors/marketing/sendgrid';
import { PlaidTriggerService, PlaidWebhookService, PlaidWebhookController } from '../connectors/finance/plaid';
import { RedisTriggerService } from '../connectors/storage/redis';
// HEAD imports
import { ClockifyPollingService } from '../connectors/productivity/clockify';
import { TogglPollingService } from '../connectors/productivity/toggl';
import { ChargebeeTriggerService, ChargebeeWebhookController } from '../connectors/finance/chargebee';
import { GumroadTriggerService, GumroadWebhookController } from '../connectors/ecommerce/gumroad';
import { WiseTriggerService, WiseWebhookController } from '../connectors/finance/wise';
// Develop imports
import { MongoDBTriggerService } from '../connectors/storage/mongodb';
import { GitLabTriggerService, GitLabWebhookController } from '../connectors/development/gitlab';
import { MondayTriggerService, MondayWebhookController } from '../connectors/crm/monday';
import { TypeformTriggerService, TypeformWebhookController } from '../connectors/forms/typeform';
import { JotformTriggerService, JotformWebhookController } from '../connectors/crm/jotform';
import { PinterestTriggerService } from '../connectors/social/pinterest';
import { AsanaTriggerService, AsanaWebhookController } from '../connectors/project-management/asana';
import { AwsS3TriggerService, AwsS3WebhookController } from '../connectors/storage/aws-s3';
import { FreshdeskTriggerService, FreshdeskWebhookController } from '../connectors/support/freshdesk';
import { TriggerManagerService } from './services/trigger-manager.service';
import { ScheduleTriggerService } from './services/triggers/schedule-trigger.service';
import { AIWorkflowGeneratorService } from './services/ai-workflow-generator.service';
import { NodeTypeValidatorService } from './services/node-type-validator.service';
// SEEDER SERVICES - Disabled, now run manually via npm run seed
// import { QdrantSeederService } from './services/qdrant-seeder.service';
// import { DynamicConnectorSeederService } from './services/dynamic-connector-seeder.service';
// import { ConnectorAnalyzerService } from './services/connector-analyzer.service';
// import { NodeTypesSeederService } from './services/node-types-seeder.service';
// import { AvailableNodesSeederService } from './services/available-nodes-seeder.service';
// import { WorkflowRulesSeederService } from './services/workflow-rules-seeder.service';
// import { OpenAIChatbotSeederService } from './services/openai-chatbot-seeder.service';
// import { RedisSeederService } from './services/redis-seeder.service';
import { ConversationMemoryService } from './services/conversation-memory.service';
import { SimpleMemoryService } from './services/simple-memory.service';
import { RedisMemoryService } from './services/redis-memory.service';
import { AIAgentService } from './services/ai-agent.service';
import { ToolRegistryService } from './services/tool-registry.service';
import { ToolLoaderService } from './services/tool-loader.service';
import { IntentDetectionService } from './services/intent-detection.service';
import { EventsModule } from '../../../events/events.module';
import { QdrantSeederService } from './services/qdrant-seeder.service';
import { AvailableNodesSeederService } from './services/available-nodes-seeder.service';
import { NodesModule } from './nodes/nodes.module';
import { WorkflowAgentsService } from './services/workflow-agents.service';
import { OrchestratedGeneratorService } from './services/orchestrated-generator.service';
import { AlertingModule } from '../../alerting/alerting.module';
// import { TemplateSeederService } from './services/template-seeder.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    QdrantModule,
    ScheduleModule.forRoot(),
    forwardRef(() => QueueModule),
    forwardRef(() => ConnectorsModule),
    EventsModule,
    NodesModule,
    AlertingModule,
  ],
  controllers: [
    TemplateController, // Must be before WorkflowController to avoid route conflicts
    WorkflowController,
    FormWebhookController,
    FacebookWebhookController,
    InstagramWebhookController,
    JiraWebhookController,
    TelegramWebhookController,
    WhatsAppWebhookController,
    SlackWebhookController,
    TeamsWebhookController,
    StripeWebhookController,
    GmailWebhookController,
    GitHubWebhookController,
    TrelloWebhookController,
    TwilioWebhookController,
    PipedriveWebhookController,
    HubSpotWebhookController,
    MailchimpWebhookController,
    SendGridWebhookController,
    PlaidWebhookController,
    // HEAD controllers
    ChargebeeWebhookController,
    GumroadWebhookController,
    WiseWebhookController,
    // Develop controllers
    GitLabWebhookController,
    MondayWebhookController,
    TypeformWebhookController,
    JotformWebhookController,
    AsanaWebhookController,
    AwsS3WebhookController,
    FreshdeskWebhookController,
    WebhookController,
  ],
  providers: [
    WorkflowService,
    TemplateService,
    WorkflowExecutionEngine,
    NodeExecutorService,
    ControlFlowService,
    // Webhook services
    WebhookAuthService,
    // Trigger infrastructure
    TriggerManagerService,
    // Gmail trigger services
    GmailWebhookService,
    GmailPollingService,
    GmailTriggerService,
    // GitHub trigger services
    GitHubWebhookService,
    GitHubTriggerService,
    // Trello trigger services
    TrelloWebhookService,
    TrelloTriggerService,
    // Pipedrive trigger services
    PipedriveWebhookService,
    PipedriveTriggerService,
    // HubSpot trigger services
    HubSpotWebhookService,
    HubSpotTriggerService,
    // Mailchimp trigger services
    MailchimpWebhookService,
    MailchimpTriggerService,
    // SendGrid trigger service
    SendGridTriggerService,
    // Plaid trigger services
    PlaidWebhookService,
    PlaidTriggerService,
    // Twilio trigger services
    TwilioWebhookService,
    TwilioTriggerService,
    // Twitter trigger services
    TwitterPollingService,
    TwitterTriggerService,
    // Telegram trigger service
    TelegramTriggerService,
    // WhatsApp trigger service
    WhatsAppTriggerService,
    // Slack trigger service
    SlackTriggerService,
    // Teams trigger service
    TeamsTriggerService,
    // Stripe trigger service
    StripeTriggerService,
    // Facebook trigger service
    FacebookTriggerService,
    // Instagram trigger service
    InstagramTriggerService,
    // Jira trigger service
    JiraTriggerService,
    // Schedule trigger service
    ScheduleTriggerService,
    // Google Calendar trigger services
    GoogleCalendarPollingService,
    GoogleCalendarTriggerService,
    // Google Sheets trigger services
    GoogleSheetsPollingService,
    GoogleSheetsTriggerService,
    // Google Drive trigger service
    GoogleDriveTriggerService,
    // IMAP trigger service
    ImapTriggerService,
    // Redis trigger service
    RedisTriggerService,
    // HEAD trigger services
    // Clockify polling service
    ClockifyPollingService,
    // Toggl polling service
    TogglPollingService,
    // Chargebee trigger service
    ChargebeeTriggerService,
    // Gumroad trigger service
    GumroadTriggerService,
    // Wise trigger service
    WiseTriggerService,
    // Develop trigger services
    // MongoDB trigger service
    MongoDBTriggerService,
    // GitLab trigger service
    GitLabTriggerService,
    // Monday trigger service
    MondayTriggerService,
    // Typeform trigger service
    TypeformTriggerService,
    // Jotform trigger service
    JotformTriggerService,
    // Pinterest trigger service
    PinterestTriggerService,
    // Asana trigger service
    AsanaTriggerService,
    // AWS S3 trigger service
    AwsS3TriggerService,
    // Freshdesk trigger service
    FreshdeskTriggerService,
    // AI workflow generation services
    AIWorkflowGeneratorService,
    NodeTypeValidatorService, // Validates AI-generated nodes against database
    ConversationMemoryService, // Maintains conversation history for AI context
    SimpleMemoryService, // Provides in-memory conversation storage for AI agents
    RedisMemoryService, // Provides Redis-backed persistent conversation storage for AI agents
    GmailToolService, // Provides Gmail operations as tools for AI agents
    ToolRegistryService, // Central registry for AI Agent tools
    ToolLoaderService, // Auto-loads tools into registry on module startup
    AIAgentService, // AI Agent execution with function calling and tool loop
    IntentDetectionService, // Detects user intent before workflow generation
    WorkflowAgentsService, // 🆕 Multi-agent specialized AI workers for workflow generation
    OrchestratedGeneratorService, // 🆕 Orchestrates workflow generation across multiple agents
    // SEEDER SERVICES - Commented out, now run manually via: npm run seed
    QdrantSeederService, // RE-ENABLED: Now loads templates from database!
    // DynamicConnectorSeederService, // New dynamic seeder that reads from actual connectors
    // NodeTypesSeederService, // Seeds node_types table with built-in nodes only
    AvailableNodesSeederService, // RE-ENABLED: Seeds available node types to Qdrant from node_types table
    // WorkflowRulesSeederService, // Seeds workflow rules/patterns for RAG-based filtering
    // OpenAIChatbotSeederService, // Seeds OpenAI Chatbot connector into connectors table
    // RedisSeederService, // Seeds Redis connector for memory storage credentials
    // TemplateSeederService, // Seeds workflow templates from JSON files on startup
    // NOTE: ConnectorAnalyzerService is still used by src/scripts/analyze-connectors.ts
    // It's loaded via AppModule when running: npm run analyze-connectors
  ],
  exports: [WorkflowService, TemplateService, WorkflowExecutionEngine, TriggerManagerService, NodesModule]
})
export class WorkflowModule {}
