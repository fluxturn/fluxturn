import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ModuleRef } from '@nestjs/core';
import { DatabaseModule } from '../../database/database.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { RealtimeModule } from '../../realtime/realtime.module';
import { EmailModule } from '../../email/email.module';
import { ConnectorsController } from './connectors.controller';
import { ConnectorsService } from './connectors.service';
import { ConnectorFactory } from './base/connector.factory';
import { ConnectorRegistry } from './base/connector.registry';
import { TelegramConnector } from './communication/telegram';
import { WhatsAppConnector } from './communication/whatsapp';
import { SlackConnector, SlackTriggerService, SlackWebhookController } from './communication/slack';
import { DiscordConnector } from './communication/discord';
import { GmailConnector } from './communication/gmail';
import { GoogleCalendarConnector } from './communication/google-calendar';
import { TeamsConnector } from './communication/teams';
import { TwilioConnector } from './communication/twilio';
import { SmtpConnector } from './communication/smtp';
import { ImapConnector } from './communication/imap';
import { Pop3Connector } from './communication/pop3';
import { SendGridConnector } from './marketing/sendgrid';
import { MailchimpConnector } from './marketing/mailchimp';
import { TwitterConnector } from './social/twitter';
import { FacebookGraphConnector } from './social/facebook-graph';
import { RedditConnector } from './social/reddit';
import { LinkedinConnector } from './social/linkedin';
import { YoutubeConnector } from './social/youtube';
import { TikTokConnector } from './social/tiktok';
import { ZoomConnector } from './video/zoom';
import { OpenAIConnector } from './ai/openai';
import { OpenAIChatbotConnector } from './ai/openai-chatbot';
import { GoogleGeminiConnector } from './ai/google-gemini';
import { RedisConnector } from './storage/redis';
import { GitHubConnector } from './development/github';
import { GitLabConnector } from './development/gitlab';
import { GoogleSheetsConnector } from './storage/google-sheets';
import { GoogleDriveConnector } from './storage/google-drive';
import { GoogleDocsConnector } from './storage/google-docs';
import { DropboxConnector } from './storage/dropbox';
import { GumroadConnector } from './ecommerce/gumroad';
import { MagentoConnector } from './ecommerce/magento';
import { StripeV2Connector } from './ecommerce/stripe-v2';
import { ShopifyConnector } from './ecommerce/shopify';
import { WooCommerceConnector } from './ecommerce/woocommerce';
import { PaddleConnector } from './ecommerce/paddle';
import { PostgreSQLConnector } from './storage/postgresql';
import { MySQLConnector } from './storage/mysql';
import { GoogleAnalyticsConnector } from './analytics/google-analytics';
import { PostHogConnector } from './analytics/posthog';
import { SplunkConnector } from './analytics/splunk';
import { GrafanaConnector } from './analytics/grafana';
import { MetabaseConnector } from './analytics/metabase';
import { NotionConnector } from './project-management/notion';
import { ClickUpConnector, ClickUpTriggerService } from './project-management/clickup';
import { TrelloConnector } from './project-management/trello';
import { JiraConnector } from './project-management/jira';
import { AirtableConnector } from './crm/airtable';
import { JotformConnector } from './crm/jotform';
import { SalesforceConnector } from './crm/salesforce';
import { PipedriveConnector } from './crm/pipedrive';
import { HubSpotConnector } from './crm/hubspot';
import { PlaidConnector } from './finance/plaid';
import { ChargebeeConnector } from './finance/chargebee';
import { WiseConnector } from './finance/wise';
import { WordPressConnector } from './cms/wordpress';
import { GoogleFormsConnector } from './forms/google-forms';
import { TypeformConnector } from './forms/typeform';
import { ScrapflyConnector } from './data_processing/scrapfly';
import { SupabaseConnector } from './data_processing/supabase';
import { ExtractFromFileConnector } from './data_processing/extract-from-file';
import { AWSSESConnector } from './communication/aws-ses';
import { MondayConnector } from './crm/monday';
import { MongoDBConnector } from './storage/mongodb';
import { AsanaConnector } from './project-management/asana';
import { AWSS3Connector } from './storage/aws-s3';
import { FreshdeskConnector } from './support/freshdesk';
import { IntercomConnector } from './support/intercom';
import { PagerDutyConnector } from './support/pagerduty';
import { SentryIoConnector } from './support/sentry-io';
import { N8nConnector } from './development/n8n';
// HEAD imports
import { JenkinsConnector } from './development/jenkins';
import { TravisCiConnector } from './development/travis-ci';
import { NetlifyConnector } from './development/netlify';
import { GitConnector } from './development/git';
import { BitbucketConnector } from './development/bitbucket';
import { NpmConnector } from './development/npm';
import { KlaviyoConnector } from './marketing/klaviyo';
import { CloudflareConnector } from './infrastructure/cloudflare';
import { GraphqlConnector } from './infrastructure/graphql';
import { KafkaConnector } from './infrastructure/kafka';
import { RabbitmqConnector } from './infrastructure/rabbitmq';
import { ElasticsearchConnector } from './database/elasticsearch';
import { TodoistConnector } from './productivity/todoist';
import { ClockifyConnector } from './productivity/clockify';
import { HarvestConnector } from './productivity/harvest';
import { FigmaConnector } from './productivity/figma';
import { SpotifyConnector } from './productivity/spotify';
import { MattermostConnector } from './communication/mattermost';
import { MatrixConnector } from './communication/matrix';
import { DiscourseConnector } from './communication/discourse';
import { GhostConnector } from './cms/ghost';
import { MediumConnector } from './cms/medium';
import { SshConnector } from './utility/ssh';
import { FtpConnector } from './utility/ftp';
import { ExecuteCommandConnector } from './utility/execute-command';
import { DeepLConnector } from './utility/deepl';
import { BitlyConnector } from './utility/bitly';
// Develop imports
import { QuickBooksConnector } from './finance/quickbooks';
import { XeroConnector } from './finance/xero';
import { ServiceNowConnector } from './support/servicenow';
import { CalendlyConnector } from './communication/calendly';
import { ActiveCampaignConnector } from './marketing/activecampaign';
import { BrevoConnector } from './marketing/brevo';
import { WebflowConnector } from './cms/webflow';
import { ContentfulConnector } from './cms/contentful';
import { SnowflakeConnector } from './storage/snowflake';
import { CalendlyTriggerService } from './communication/calendly';
import { CalendlyWebhookController } from './communication/calendly';
import { QuickBooksTriggerService } from './finance/quickbooks';
import { QuickBooksWebhookController } from './finance/quickbooks';
import { XeroTriggerService } from './finance/xero';
import { XeroWebhookController } from './finance/xero';
import { ServiceNowTriggerService } from './support/servicenow';
import { ServiceNowWebhookController } from './support/servicenow';
import { ActiveCampaignTriggerService } from './marketing/activecampaign';
import { ActiveCampaignWebhookController } from './marketing/activecampaign';
import { BrevoTriggerService } from './marketing/brevo';
import { BrevoWebhookController } from './marketing/brevo';
import { WebflowTriggerService } from './cms/webflow';
import { WebflowWebhookController } from './cms/webflow';
import { ContentfulTriggerService } from './cms/contentful';
import { ContentfulWebhookController } from './cms/contentful';
import { ConnectorType, ConnectorCategory } from './types';
import { ConnectorRegistryService } from './connector-registry.service';
import { AuthUtils } from './utils/auth.utils';
import { ApiUtils } from './utils/api.utils';
import { ErrorUtils } from './utils/error.utils';
import { GoogleOAuthService } from './services/google-oauth.service';
import { SlackOAuthService } from './services/slack-oauth.service';
import { RedditOAuthService } from './services/reddit-oauth.service';
import { LinkedInOAuthService } from './services/linkedin-oauth.service';
import { TwitterOAuthService } from './services/twitter-oauth.service';
import { GitHubOAuthService } from './services/github-oauth.service';
import { DiscordOAuthService } from './services/discord-oauth.service';
import { ShopifyOAuthService } from './services/shopify-oauth.service';
import { NotionOAuthService } from './services/notion-oauth.service';
import { PinterestOAuthService } from './services/pinterest-oauth.service';
import { MicrosoftTeamsOAuthService } from './services/microsoft-teams-oauth.service';
import { HubSpotOAuthService } from './services/hubspot-oauth.service';
import { SalesforceOAuthService } from './services/salesforce-oauth.service';
import { ClickUpOAuthService } from './services/clickup-oauth.service';
import { ZoomOAuthService } from './services/zoom-oauth.service';
import { FacebookOAuthService } from './services/facebook-oauth.service';
import { TikTokOAuthService } from './services/tiktok-oauth.service';
import { InstagramOAuthService } from './services/instagram-oauth.service';
import { XeroOAuthService } from './services/xero-oauth.service';
import { ConnectorConfigService } from './services/connector-config.service';
import { OAuthTokenRefreshService } from './services/oauth-token-refresh.service';
import { OAuthControllers } from './controllers/oauth';

@Module({
  imports: [ConfigModule, DatabaseModule, HttpModule, ScheduleModule.forRoot(), RealtimeModule, EmailModule, forwardRef(() => WorkflowModule)],
  controllers: [
    ConnectorsController,
    ...OAuthControllers,
    SlackWebhookController,
    CalendlyWebhookController,
    QuickBooksWebhookController,
    XeroWebhookController,
    ServiceNowWebhookController,
    ActiveCampaignWebhookController,
    BrevoWebhookController,
    WebflowWebhookController,
    ContentfulWebhookController,
  ],
  providers: [
    ConnectorsService,
    ConnectorFactory,
    ConnectorRegistry,
    ConnectorRegistryService, // 🆕 NEW
    AuthUtils,
    ApiUtils,
    ErrorUtils,
    GoogleOAuthService,
    SlackOAuthService,
    RedditOAuthService,
    LinkedInOAuthService,
    TwitterOAuthService,
    GitHubOAuthService,
    NotionOAuthService,
    DiscordOAuthService,
    RedditOAuthService,
    ShopifyOAuthService,
    PinterestOAuthService,
    MicrosoftTeamsOAuthService,
    HubSpotOAuthService,
    SalesforceOAuthService,
    ClickUpOAuthService,
    ZoomOAuthService,
    FacebookOAuthService,
    TikTokOAuthService,
    InstagramOAuthService,
    XeroOAuthService,
    ConnectorConfigService,
    OAuthTokenRefreshService,
    TelegramConnector,
    WhatsAppConnector,
    SlackConnector,
    DiscordConnector,
    GmailConnector,
    GoogleCalendarConnector,
    TeamsConnector,
    TwilioConnector,
    SmtpConnector,
    ImapConnector,
    Pop3Connector,
    SendGridConnector,
    MailchimpConnector,
    TwitterConnector,
    FacebookGraphConnector,
    RedditConnector,
    LinkedinConnector,
    YoutubeConnector,
    TikTokConnector,
    ZoomConnector,
    OpenAIConnector,
    OpenAIChatbotConnector,
    GoogleGeminiConnector,
    RedisConnector,
    GitHubConnector,
    GitLabConnector,
    GoogleSheetsConnector,
    GoogleDriveConnector,
    GoogleDocsConnector,
    DropboxConnector,
    GumroadConnector,
    MagentoConnector,
    StripeV2Connector,
    ShopifyConnector,
    WooCommerceConnector,
    PaddleConnector,
    PostgreSQLConnector,
    MySQLConnector,
    GoogleAnalyticsConnector,
    PostHogConnector,
    SplunkConnector,
    GrafanaConnector,
    MetabaseConnector,
    NotionConnector,
    ClickUpConnector,
    TrelloConnector,
    JiraConnector,
    AirtableConnector,
    JotformConnector,
    SalesforceConnector,
    PipedriveConnector,
    HubSpotConnector,
    PlaidConnector,
    ChargebeeConnector,
    WiseConnector,
    WordPressConnector,
    GoogleFormsConnector,
    TypeformConnector,
    ScrapflyConnector,
    SupabaseConnector,
    ExtractFromFileConnector,
    AWSSESConnector,
    MondayConnector,
    MongoDBConnector,
    AsanaConnector,
    AWSS3Connector,
    FreshdeskConnector,
    IntercomConnector,
    PagerDutyConnector,
    SentryIoConnector,
    N8nConnector,
    // HEAD providers
    JenkinsConnector,
    TravisCiConnector,
    NetlifyConnector,
    GitConnector,
    BitbucketConnector,
    NpmConnector,
    KlaviyoConnector,
    CloudflareConnector,
    GraphqlConnector,
    KafkaConnector,
    RabbitmqConnector,
    ElasticsearchConnector,
    TodoistConnector,
    ClockifyConnector,
    HarvestConnector,
    FigmaConnector,
    SpotifyConnector,
    MattermostConnector,
    MatrixConnector,
    DiscourseConnector,
    GhostConnector,
    MediumConnector,
    SshConnector,
    FtpConnector,
    ExecuteCommandConnector,
    DeepLConnector,
    BitlyConnector,
    // Develop providers
    QuickBooksConnector,
    XeroConnector,
    ServiceNowConnector,
    CalendlyConnector,
    ActiveCampaignConnector,
    BrevoConnector,
    WebflowConnector,
    ContentfulConnector,
    SnowflakeConnector,
    SlackTriggerService,
    CalendlyTriggerService,
    QuickBooksTriggerService,
    XeroTriggerService,
    ServiceNowTriggerService,
    ActiveCampaignTriggerService,
    BrevoTriggerService,
    WebflowTriggerService,
    ContentfulTriggerService,
    ClickUpTriggerService,
  ],
  exports: [ConnectorsService, ConnectorFactory, ConnectorRegistry, ConnectorRegistryService, AuthUtils, ApiUtils, ErrorUtils, GoogleOAuthService, SlackOAuthService, LinkedInOAuthService, TwitterOAuthService, GitHubOAuthService, DiscordOAuthService, RedditOAuthService, ShopifyOAuthService, NotionOAuthService, PinterestOAuthService, MicrosoftTeamsOAuthService, SalesforceOAuthService, ClickUpOAuthService, ZoomOAuthService, FacebookOAuthService, TikTokOAuthService, InstagramOAuthService, ConnectorConfigService, OAuthTokenRefreshService, SlackTriggerService, CalendlyTriggerService, QuickBooksTriggerService, XeroTriggerService, ServiceNowTriggerService, ActiveCampaignTriggerService, BrevoTriggerService, WebflowTriggerService, ContentfulTriggerService, ClickUpTriggerService],
})
export class ConnectorsModule implements OnModuleInit {
  constructor(
    private readonly connectorRegistry: ConnectorRegistry,
    private readonly moduleRef: ModuleRef
  ) {}

  async onModuleInit() {
    // Register all connectors

    // AI Connectors
    this.connectorRegistry.register(
      ConnectorType.OPENAI,
      ConnectorCategory.AI,
      OpenAIConnector,
      {
        description: 'OpenAI GPT and DALL-E integration for text generation, image creation, and more',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.OPENAI_CHATBOT,
      ConnectorCategory.AI,
      OpenAIChatbotConnector,
      {
        description: 'Provides OpenAI GPT model configuration for AI Agent nodes',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GOOGLE_GEMINI,
      ConnectorCategory.AI,
      GoogleGeminiConnector,
      {
        description: 'Google Gemini AI models for text, image, audio, video generation and analysis',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Communication Connectors
    this.connectorRegistry.register(
      ConnectorType.TELEGRAM,
      ConnectorCategory.COMMUNICATION,
      TelegramConnector,
      {
        description: 'Send and receive messages through Telegram Bot API',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.WHATSAPP,
      ConnectorCategory.COMMUNICATION,
      WhatsAppConnector,
      {
        description: 'Send and receive messages through WhatsApp Business Cloud API',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.SLACK,
      ConnectorCategory.COMMUNICATION,
      SlackConnector,
      {
        description: 'Send messages and interact with Slack workspaces',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.DISCORD,
      ConnectorCategory.COMMUNICATION,
      DiscordConnector,
      {
        description: 'Send messages and interact with Discord servers',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GMAIL,
      ConnectorCategory.COMMUNICATION,
      GmailConnector,
      {
        description: 'Send and receive emails through Gmail',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.TEAMS,
      ConnectorCategory.COMMUNICATION,
      TeamsConnector,
      {
        description: 'Send messages and interact with Microsoft Teams',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.TWILIO,
      ConnectorCategory.COMMUNICATION,
      TwilioConnector,
      {
        description: 'Send SMS and make calls through Twilio',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GOOGLE_CALENDAR,
      ConnectorCategory.COMMUNICATION,
      GoogleCalendarConnector,
      {
        description: 'Manage calendar events, check availability, and schedule meetings',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.SMTP,
      ConnectorCategory.COMMUNICATION,
      SmtpConnector,
      {
        description: 'Send emails using SMTP protocol',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.IMAP,
      ConnectorCategory.COMMUNICATION,
      ImapConnector,
      {
        description: 'Receive emails using IMAP protocol - triggers workflow when new emails arrive',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.POP3,
      ConnectorCategory.COMMUNICATION,
      Pop3Connector,
      {
        description: 'Read emails using POP3 protocol',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.AWS_SES,
      ConnectorCategory.COMMUNICATION,
      AWSSESConnector,
      {
        description: 'Amazon Simple Email Service for transactional and marketing emails with delivery tracking',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.MATTERMOST,
      ConnectorCategory.COMMUNICATION,
      MattermostConnector,
      {
        description: 'Open-source team collaboration platform with messaging, channels, and integrations',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.MATRIX,
      ConnectorCategory.COMMUNICATION,
      MatrixConnector,
      {
        description: 'Decentralized communication protocol for messaging and collaboration',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.DISCOURSE,
      ConnectorCategory.COMMUNICATION,
      DiscourseConnector,
      {
        description: 'Modern forum and community platform with topics, posts, users, and categories',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.CALENDLY,
      ConnectorCategory.COMMUNICATION,
      CalendlyConnector,
      {
        description: 'Calendly scheduling automation for managing event types, invitees, and scheduled events',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.SENDGRID,
      ConnectorCategory.MARKETING,
      SendGridConnector,
      {
        description: 'Email delivery and marketing platform with transactional email, marketing campaigns, and contact management',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.MAILCHIMP,
      ConnectorCategory.MARKETING,
      MailchimpConnector,
      {
        description: 'Email marketing platform with audience management, campaigns, automations, and analytics',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.KLAVIYO,
      ConnectorCategory.MARKETING,
      KlaviyoConnector,
      {
        description: 'Email and SMS marketing platform with customer data, campaigns, and analytics',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.ACTIVECAMPAIGN,
      ConnectorCategory.MARKETING,
      ActiveCampaignConnector,
      {
        description: 'ActiveCampaign marketing automation platform for email campaigns, contacts, deals, and automations',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.BREVO,
      ConnectorCategory.MARKETING,
      BrevoConnector,
      {
        description: 'Brevo (formerly Sendinblue) email marketing platform for campaigns, contacts, and transactional emails',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Social Connectors
    this.connectorRegistry.register(
      ConnectorType.TWITTER,
      ConnectorCategory.SOCIAL,
      TwitterConnector,
      {
        description: 'Post tweets and interact with Twitter/X',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.FACEBOOK_GRAPH,
      ConnectorCategory.SOCIAL,
      FacebookGraphConnector,
      {
        description: 'Interact with Facebook pages, posts, and user data via Graph API',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.REDDIT,
      ConnectorCategory.SOCIAL,
      RedditConnector,
      {
        description: 'Post and interact with Reddit communities',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.LINKEDIN,
      ConnectorCategory.SOCIAL,
      LinkedinConnector,
      {
        description: 'LinkedIn API for posts and professional networking with support for images, articles, and organization posting',
        version: '2.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.YOUTUBE,
      ConnectorCategory.SOCIAL,
      YoutubeConnector,
      {
        description: 'YouTube Data API v3 for managing videos, playlists, channels, and more',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.TIKTOK,
      ConnectorCategory.SOCIAL,
      TikTokConnector,
      {
        description: 'TikTok video posting and content management',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Video Connectors
    this.connectorRegistry.register(
      ConnectorType.ZOOM,
      ConnectorCategory.VIDEO,
      ZoomConnector,
      {
        description: 'Zoom video conferencing platform for meetings, webinars, and collaboration',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Database/Storage Connectors
    this.connectorRegistry.register(
      ConnectorType.REDIS,
      ConnectorCategory.STORAGE,
      RedisConnector,
      {
        description: 'Redis in-memory data store for caching, key-value storage, and pub/sub messaging',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Development Connectors
    this.connectorRegistry.register(
      ConnectorType.GITHUB,
      ConnectorCategory.DEVELOPMENT,
      GitHubConnector,
      {
        description: 'Git repository hosting and collaboration platform',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GITLAB,
      ConnectorCategory.DEVELOPMENT,
      GitLabConnector,
      {
        description: 'Git repository hosting, CI/CD, issues, merge requests, and DevOps platform',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.N8N,
      ConnectorCategory.DEVELOPMENT,
      N8nConnector,
      {
        description: 'n8n automation platform - manage workflows, executions, credentials, and audit logs',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.JENKINS,
      ConnectorCategory.DEVELOPMENT,
      JenkinsConnector,
      {
        description: 'Jenkins automation server for building, deploying, and automating projects',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.TRAVIS_CI,
      ConnectorCategory.DEVELOPMENT,
      TravisCiConnector,
      {
        description: 'Travis CI continuous integration and deployment platform',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.NETLIFY,
      ConnectorCategory.DEVELOPMENT,
      NetlifyConnector,
      {
        description: 'Netlify platform for web application deployment and hosting',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GIT,
      ConnectorCategory.DEVELOPMENT,
      GitConnector,
      {
        description: 'Git version control operations for managing repositories',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.BITBUCKET,
      ConnectorCategory.DEVELOPMENT,
      BitbucketConnector,
      {
        description: 'Bitbucket Git repository hosting and collaboration platform',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.NPM,
      ConnectorCategory.DEVELOPMENT,
      NpmConnector,
      {
        description: 'Query npm registry for package information, versions, and metadata',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Storage Connectors
    this.connectorRegistry.register(
      ConnectorType.GOOGLE_SHEETS,
      ConnectorCategory.STORAGE,
      GoogleSheetsConnector,
      {
        description: 'Create, read, update, and manage Google Sheets spreadsheets',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GOOGLE_DRIVE,
      ConnectorCategory.STORAGE,
      GoogleDriveConnector,
      {
        description: 'Upload, download, share, and manage files in Google Drive',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GOOGLE_DOCS,
      ConnectorCategory.STORAGE,
      GoogleDocsConnector,
      {
        description: 'Create, edit, and manage Google Docs documents',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.DROPBOX,
      ConnectorCategory.STORAGE,
      DropboxConnector,
      {
        description: 'Cloud storage with file upload, download, and management capabilities',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.SNOWFLAKE,
      ConnectorCategory.DATABASE,
      SnowflakeConnector,
      {
        description: 'Snowflake cloud data warehouse for SQL queries, data operations, and analytics',
        version: '1.0.0',
        isActive: true,
      }
    );

    // E-commerce Connectors
    this.connectorRegistry.register(
      ConnectorType.STRIPE,
      ConnectorCategory.ECOMMERCE,
      StripeV2Connector,
      {
        description: 'Payment processing, customer management, and subscription handling',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GUMROAD,
      ConnectorCategory.ECOMMERCE,
      GumroadConnector,
      {
        description: 'Digital product sales platform for creators and entrepreneurs',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.SHOPIFY,
      ConnectorCategory.ECOMMERCE,
      ShopifyConnector,
      {
        description: 'Shopify e-commerce platform for product and order management',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.WOOCOMMERCE,
      ConnectorCategory.ECOMMERCE,
      WooCommerceConnector,
      {
        description: 'WooCommerce e-commerce platform for managing products, orders, and customers',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.PADDLE,
      ConnectorCategory.ECOMMERCE,
      PaddleConnector,
      {
        description: 'Payment processing and subscription management platform for SaaS businesses',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.MAGENTO,
      ConnectorCategory.ECOMMERCE,
      MagentoConnector,
      {
        description: 'E-commerce platform for managing products, customers, orders, and invoices',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.POSTGRESQL,
      ConnectorCategory.DATABASE,
      PostgreSQLConnector,
      {
        description: 'PostgreSQL database operations - execute queries, insert, update, delete rows',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.MYSQL,
      ConnectorCategory.DATABASE,
      MySQLConnector,
      {
        description: 'MySQL database operations - execute queries, insert, update, delete rows with full MySQL features',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Analytics Connectors
    this.connectorRegistry.register(
      ConnectorType.GOOGLE_ANALYTICS,
      ConnectorCategory.ANALYTICS,
      GoogleAnalyticsConnector,
      {
        description: 'Get reports and analyze data from Google Analytics 4 and Universal Analytics',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.POSTHOG,
      ConnectorCategory.ANALYTICS,
      PostHogConnector,
      {
        description: 'Product analytics platform for tracking events, users, and feature flags',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.SPLUNK,
      ConnectorCategory.ANALYTICS,
      SplunkConnector,
      {
        description: 'Search, monitor and analyze machine-generated big data',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GRAFANA,
      ConnectorCategory.ANALYTICS,
      GrafanaConnector,
      {
        description: 'Open source analytics and monitoring platform',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.METABASE,
      ConnectorCategory.ANALYTICS,
      MetabaseConnector,
      {
        description: 'Open source business intelligence and analytics platform',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Project Management Connectors
    this.connectorRegistry.register(
      ConnectorType.NOTION,
      ConnectorCategory.PROJECT_MANAGEMENT,
      NotionConnector,
      {
        description: 'Notion workspace integration for managing databases, pages, blocks, and users',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.CLICKUP,
      ConnectorCategory.PROJECT_MANAGEMENT,
      ClickUpConnector,
      {
        description: 'ClickUp project management platform with comprehensive task, list, folder, and goal management',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.TRELLO,
      ConnectorCategory.PROJECT_MANAGEMENT,
      TrelloConnector,
      {
        description: 'Trello kanban-style project management with boards, lists, and cards',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.JIRA,
      ConnectorCategory.PROJECT_MANAGEMENT,
      JiraConnector,
      {
        description: 'Atlassian Jira project management and issue tracking platform with agile support',
        version: '1.0.0',
        isActive: true,
      }
    );

    // CRM Connectors
    this.connectorRegistry.register(
      ConnectorType.AIRTABLE,
      ConnectorCategory.CRM,
      AirtableConnector,
      {
        description: 'Cloud-based database and spreadsheet platform with powerful CRM capabilities and API-first architecture',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.JOTFORM,
      ConnectorCategory.CRM,
      JotformConnector,
      {
        description: 'Online form builder for creating forms, surveys, and collecting submissions with powerful automation capabilities',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GOOGLE_FORMS,
      ConnectorCategory.FORMS,
      GoogleFormsConnector,
      {
        description: 'Google Forms integration for creating forms, managing questions, and collecting responses',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.SALESFORCE,
      ConnectorCategory.CRM,
      SalesforceConnector,
      {
        description: 'Comprehensive Salesforce CRM integration with support for accounts, contacts, leads, opportunities, cases, tasks, and custom objects',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.PIPEDRIVE,
      ConnectorCategory.CRM,
      PipedriveConnector,
      {
        description: 'Pipedrive CRM platform for sales teams to manage leads, deals, contacts, organizations, and activities',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.HUBSPOT,
      ConnectorCategory.CRM,
      HubSpotConnector,
      {
        description: 'HubSpot CRM platform for managing contacts, companies, deals, and marketing automation',
        version: '1.0.0',
        isActive: true,
      }
    );

    // CMS Connectors
    this.connectorRegistry.register(
      ConnectorType.WORDPRESS,
      ConnectorCategory.CMS,
      WordPressConnector,
      {
        description: 'WordPress REST API for managing posts, pages, users, categories, tags, and media',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GHOST,
      ConnectorCategory.CMS,
      GhostConnector,
      {
        description: 'Ghost publishing platform for content creation, posts, pages, and members',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.MEDIUM,
      ConnectorCategory.CMS,
      MediumConnector,
      {
        description: 'Medium publishing platform for creating and managing stories and publications',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.WEBFLOW,
      ConnectorCategory.CMS,
      WebflowConnector,
      {
        description: 'Webflow CMS and website builder for managing sites, collections, and items',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.CONTENTFUL,
      ConnectorCategory.CMS,
      ContentfulConnector,
      {
        description: 'Contentful headless CMS for managing content types, entries, assets, and locales',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Data Processing Connectors
    this.connectorRegistry.register(
      ConnectorType.SCRAPFLY,
      ConnectorCategory.DATA_PROCESSING,
      ScrapflyConnector,
      {
        description: 'Web scraping, data extraction, and screenshot capture with anti-bot bypass capabilities',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.SUPABASE,
      ConnectorCategory.DATA_PROCESSING,
      SupabaseConnector,
      {
        description: 'Supabase PostgreSQL database - add, get, delete and update data in tables',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.EXTRACT_FROM_FILE,
      ConnectorCategory.DATA_PROCESSING,
      ExtractFromFileConnector,
      {
        description: 'Convert binary files to JSON - supports CSV, JSON, XML, PDF, Excel, and more',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Finance Connectors
    this.connectorRegistry.register(
      ConnectorType.PLAID,
      ConnectorCategory.FINANCE,
      PlaidConnector,
      {
        description: 'Connect to bank accounts and retrieve financial data including transactions, balances, identity, and account verification',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.CHARGEBEE,
      ConnectorCategory.FINANCE,
      ChargebeeConnector,
      {
        description: 'Subscription billing and revenue management platform',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.WISE,
      ConnectorCategory.FINANCE,
      WiseConnector,
      {
        description: 'International money transfers and multi-currency account management',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.QUICKBOOKS,
      ConnectorCategory.FINANCE,
      QuickBooksConnector,
      {
        description: 'QuickBooks Online accounting software for managing invoices, customers, payments, and financial data',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.XERO,
      ConnectorCategory.FINANCE,
      XeroConnector,
      {
        description: 'Xero cloud accounting platform for invoices, contacts, bank transactions, and financial reporting',
        version: '1.0.0',
        isActive: true,
      }
    );

    // CRM Connectors - Monday
    this.connectorRegistry.register(
      ConnectorType.MONDAY,
      ConnectorCategory.CRM,
      MondayConnector,
      {
        description: 'Monday.com work management platform for team collaboration, project tracking, and workflow automation',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Storage Connectors - MongoDB
    this.connectorRegistry.register(
      ConnectorType.MONGODB,
      ConnectorCategory.DATABASE,
      MongoDBConnector,
      {
        description: 'MongoDB NoSQL database for document storage, queries, and aggregation pipelines',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.ELASTICSEARCH,
      ConnectorCategory.DATABASE,
      ElasticsearchConnector,
      {
        description: 'Consume the Elasticsearch API - index and search documents',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Project Management Connectors - Asana
    this.connectorRegistry.register(
      ConnectorType.ASANA,
      ConnectorCategory.PROJECT_MANAGEMENT,
      AsanaConnector,
      {
        description: 'Asana project management platform for task tracking, team collaboration, and workflow automation',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Forms Connectors - Typeform
    this.connectorRegistry.register(
      ConnectorType.TYPEFORM,
      ConnectorCategory.FORMS,
      TypeformConnector,
      {
        description: 'Typeform conversational forms for surveys, quizzes, and data collection',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Storage Connectors - AWS S3
    this.connectorRegistry.register(
      ConnectorType.AWS_S3,
      ConnectorCategory.STORAGE,
      AWSS3Connector,
      {
        description: 'Amazon S3 cloud storage for file uploads, downloads, and object management',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Support Connectors
    this.connectorRegistry.register(
      ConnectorType.FRESHDESK,
      ConnectorCategory.SUPPORT,
      FreshdeskConnector,
      {
        description: 'Freshdesk helpdesk and ticketing system for customer support management',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.INTERCOM,
      ConnectorCategory.SUPPORT,
      IntercomConnector,
      {
        description: 'Intercom customer messaging platform for conversations, users, and engagement',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.PAGERDUTY,
      ConnectorCategory.SUPPORT,
      PagerDutyConnector,
      {
        description: 'Incident management platform for IT operations and DevOps teams',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.SENTRY_IO,
      ConnectorCategory.SUPPORT,
      SentryIoConnector,
      {
        description: 'Error tracking and performance monitoring platform',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.SERVICENOW,
      ConnectorCategory.SUPPORT,
      ServiceNowConnector,
      {
        description: 'ServiceNow IT service management platform for incidents, service requests, and change management',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Infrastructure Connectors
    this.connectorRegistry.register(
      ConnectorType.CLOUDFLARE,
      ConnectorCategory.INFRASTRUCTURE,
      CloudflareConnector,
      {
        description: 'Cloudflare CDN and security platform for DNS, zones, and performance optimization',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.GRAPHQL,
      ConnectorCategory.INFRASTRUCTURE,
      GraphqlConnector,
      {
        description: 'Makes a GraphQL request and returns the received data',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.KAFKA,
      ConnectorCategory.INFRASTRUCTURE,
      KafkaConnector,
      {
        description: 'Send and receive messages from Apache Kafka topics',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.RABBITMQ,
      ConnectorCategory.INFRASTRUCTURE,
      RabbitmqConnector,
      {
        description: 'Send and receive messages from RabbitMQ queues and exchanges',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Productivity Connectors
    this.connectorRegistry.register(
      ConnectorType.TODOIST,
      ConnectorCategory.PRODUCTIVITY,
      TodoistConnector,
      {
        description: 'Todoist task management platform for projects, tasks, and collaboration',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.CLOCKIFY,
      ConnectorCategory.PRODUCTIVITY,
      ClockifyConnector,
      {
        description: 'Time tracking and timesheet management for teams and freelancers',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.HARVEST,
      ConnectorCategory.PRODUCTIVITY,
      HarvestConnector,
      {
        description: 'Time tracking and invoicing platform for businesses and freelancers',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.FIGMA,
      ConnectorCategory.PRODUCTIVITY,
      FigmaConnector,
      {
        description: 'Monitor design changes, comments, and updates in Figma files and teams',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.SPOTIFY,
      ConnectorCategory.PRODUCTIVITY,
      SpotifyConnector,
      {
        description: 'Control Spotify playback, manage playlists, search tracks, albums, artists, and access user library data',
        version: '1.0.0',
        isActive: true,
      }
    );

    // Utility Connectors
    this.connectorRegistry.register(
      ConnectorType.SSH,
      ConnectorCategory.UTILITY,
      SshConnector,
      {
        description: 'SSH protocol for secure remote command execution and file operations',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.FTP,
      ConnectorCategory.UTILITY,
      FtpConnector,
      {
        description: 'FTP file transfer protocol for uploading, downloading, and managing files',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.EXECUTE_COMMAND,
      ConnectorCategory.UTILITY,
      ExecuteCommandConnector,
      {
        description: 'Execute shell commands and scripts on local or remote systems',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.DEEPL,
      ConnectorCategory.UTILITY,
      DeepLConnector,
      {
        description: 'DeepL translation service supporting 30+ languages with high-quality neural machine translation',
        version: '1.0.0',
        isActive: true,
      }
    );

    this.connectorRegistry.register(
      ConnectorType.BITLY,
      ConnectorCategory.UTILITY,
      BitlyConnector,
      {
        description: 'URL shortening and link management platform for creating, updating, and tracking short links',
        version: '1.0.0',
        isActive: true,
      }
    );
  }
}
