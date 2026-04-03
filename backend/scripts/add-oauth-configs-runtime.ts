/**
 * Runtime OAuth Configuration Helper
 * This file adds OAuth configs to connector definitions at runtime
 */

import { ConnectorDefinition, OAuthConfig, CONNECTOR_DEFINITIONS } from '../src/common/constants/connector.constants';

// OAuth configurations for each connector type
export const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  gmail: {
    authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ]
  },
  discord: {
    authorization_url: 'https://discord.com/api/oauth2/authorize',
    token_url: 'https://discord.com/api/oauth2/token',
    scopes: [
      'bot',
      'applications.commands',
      'identify',
      'guilds'
    ]
  },
  slack: {
    authorization_url: 'https://slack.com/oauth/v2/authorize',
    token_url: 'https://slack.com/api/oauth.v2.access',
    scopes: [
      'chat:write',
      'channels:read',
      'channels:manage',
      'groups:read',
      'im:read',
      'mpim:read'
    ]
  },
  teams: {
    authorization_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'ChannelMessage.Send',
      'Team.ReadBasic.All',
      'Channel.ReadBasic.All'
    ]
  },
  salesforce: {
    authorization_url: 'https://login.salesforce.com/services/oauth2/authorize',
    token_url: 'https://login.salesforce.com/services/oauth2/token',
    scopes: [
      'api',
      'refresh_token',
      'offline_access'
    ]
  },
  zoho: {
    authorization_url: 'https://accounts.zoho.com/oauth/v2/auth',
    token_url: 'https://accounts.zoho.com/oauth/v2/token',
    scopes: [
      'ZohoCRM.modules.ALL',
      'ZohoCRM.settings.ALL'
    ]
  },
  twitter: {
    authorization_url: 'https://twitter.com/i/oauth2/authorize',
    token_url: 'https://api.twitter.com/2/oauth2/token',
    scopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access'
    ]
  },
  facebook: {
    authorization_url: 'https://www.facebook.com/v17.0/dialog/oauth',
    token_url: 'https://graph.facebook.com/v17.0/oauth/access_token',
    scopes: [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_read_user_content'
    ]
  },
  instagram: {
    authorization_url: 'https://api.instagram.com/oauth/authorize',
    token_url: 'https://api.instagram.com/oauth/access_token',
    scopes: [
      'instagram_basic',
      'instagram_content_publish',
      'pages_read_engagement'
    ]
  },
  linkedin: {
    authorization_url: 'https://www.linkedin.com/oauth/v2/authorization',
    token_url: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: [
      'r_liteprofile',
      'r_emailaddress',
      'w_member_social'
    ]
  },
  paypal: {
    authorization_url: 'https://www.paypal.com/signin/authorize',
    token_url: 'https://api.paypal.com/v1/oauth2/token',
    scopes: [
      'openid',
      'profile',
      'email'
    ]
  },
  google_drive: {
    authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  },
  dropbox: {
    authorization_url: 'https://www.dropbox.com/oauth2/authorize',
    token_url: 'https://api.dropboxapi.com/oauth2/token',
    scopes: [
      'files.content.write',
      'files.content.read'
    ]
  },
  google_sheets: {
    authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ]
  },
  google_analytics: {
    authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly'
    ]
  },
  google_ads: {
    authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/adwords'
    ]
  },
  facebook_ads: {
    authorization_url: 'https://www.facebook.com/v17.0/dialog/oauth',
    token_url: 'https://graph.facebook.com/v17.0/oauth/access_token',
    scopes: [
      'ads_management',
      'ads_read',
      'business_management'
    ]
  },
  asana: {
    authorization_url: 'https://app.asana.com/-/oauth_authorize',
    token_url: 'https://app.asana.com/-/oauth_token',
    scopes: [
      'default'
    ]
  },
  google_forms: {
    authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/forms.body.readonly',
      'https://www.googleapis.com/auth/forms.responses.readonly'
    ]
  },
  zoom: {
    authorization_url: 'https://zoom.us/oauth/authorize',
    token_url: 'https://zoom.us/oauth/token',
    scopes: [
      'meeting:write',
      'meeting:read',
      'webinar:write',
      'webinar:read'
    ]
  }
};

/**
 * Add OAuth configs to connector definitions that support OAuth2
 */
export function addOAuthConfigs(): ConnectorDefinition[] {
  return CONNECTOR_DEFINITIONS.map(connector => {
    // Add OAuth config if:
    // 1. Connector has oauth2 as primary auth type, OR
    // 2. Connector has 'multiple' auth type and OAuth config is defined for it
    if ((connector.auth_type === 'oauth2' || connector.auth_type === 'multiple') && OAUTH_CONFIGS[connector.name]) {
      return {
        ...connector,
        oauth_config: OAUTH_CONFIGS[connector.name]
      };
    }
    return connector;
  });
}
