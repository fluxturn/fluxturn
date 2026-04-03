#!/bin/bash

# Update OAuth configurations for connectors in the database
# This script adds oauth_config to existing connector records

# Database connection info
DB_CONTAINER="fluxturn-postgres-1"
DB_NAME="fluxturn_platform"
DB_USER="postgres"

echo "Updating OAuth configurations for connectors..."

# Execute the SQL updates
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME <<'EOF'

-- First, ensure the oauth_config column exists
ALTER TABLE connectors ADD COLUMN IF NOT EXISTS oauth_config JSONB;

-- Gmail
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
  "token_url": "https://oauth2.googleapis.com/token",
  "scopes": [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify"
  ]
}'::jsonb WHERE name = 'gmail';

-- Slack
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://slack.com/oauth/v2/authorize",
  "token_url": "https://slack.com/api/oauth.v2.access",
  "scopes": [
    "chat:write",
    "channels:read",
    "channels:manage",
    "groups:read",
    "im:read",
    "mpim:read"
  ]
}'::jsonb WHERE name = 'slack';

-- Microsoft Teams
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  "scopes": [
    "ChannelMessage.Send",
    "Team.ReadBasic.All",
    "Channel.ReadBasic.All"
  ]
}'::jsonb WHERE name = 'teams';

-- Salesforce
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://login.salesforce.com/services/oauth2/authorize",
  "token_url": "https://login.salesforce.com/services/oauth2/token",
  "scopes": [
    "api",
    "refresh_token",
    "offline_access"
  ]
}'::jsonb WHERE name = 'salesforce';

-- Zoho CRM
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://accounts.zoho.com/oauth/v2/auth",
  "token_url": "https://accounts.zoho.com/oauth/v2/token",
  "scopes": [
    "ZohoCRM.modules.ALL",
    "ZohoCRM.settings.ALL"
  ]
}'::jsonb WHERE name = 'zoho';

-- Twitter/X
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://twitter.com/i/oauth2/authorize",
  "token_url": "https://api.twitter.com/2/oauth2/token",
  "scopes": [
    "tweet.read",
    "tweet.write",
    "users.read",
    "offline.access"
  ]
}'::jsonb WHERE name = 'twitter';

-- Facebook
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://www.facebook.com/v17.0/dialog/oauth",
  "token_url": "https://graph.facebook.com/v17.0/oauth/access_token",
  "scopes": [
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_read_user_content"
  ]
}'::jsonb WHERE name = 'facebook';

-- Instagram
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://api.instagram.com/oauth/authorize",
  "token_url": "https://api.instagram.com/oauth/access_token",
  "scopes": [
    "instagram_basic",
    "instagram_content_publish",
    "pages_read_engagement"
  ]
}'::jsonb WHERE name = 'instagram';

-- LinkedIn
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://www.linkedin.com/oauth/v2/authorization",
  "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
  "scopes": [
    "r_liteprofile",
    "r_emailaddress",
    "w_member_social"
  ]
}'::jsonb WHERE name = 'linkedin';

-- PayPal
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://www.paypal.com/signin/authorize",
  "token_url": "https://api.paypal.com/v1/oauth2/token",
  "scopes": [
    "openid",
    "profile",
    "email"
  ]
}'::jsonb WHERE name = 'paypal';

-- Google Drive
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
  "token_url": "https://oauth2.googleapis.com/token",
  "scopes": [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly"
  ]
}'::jsonb WHERE name = 'google_drive';

-- Dropbox
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://www.dropbox.com/oauth2/authorize",
  "token_url": "https://api.dropboxapi.com/oauth2/token",
  "scopes": [
    "files.content.write",
    "files.content.read"
  ]
}'::jsonb WHERE name = 'dropbox';

-- Google Sheets
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
  "token_url": "https://oauth2.googleapis.com/token",
  "scopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file"
  ]
}'::jsonb WHERE name = 'google_sheets';

-- Google Analytics
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
  "token_url": "https://oauth2.googleapis.com/token",
  "scopes": [
    "https://www.googleapis.com/auth/analytics.readonly"
  ]
}'::jsonb WHERE name = 'google_analytics';

-- Google Ads
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
  "token_url": "https://oauth2.googleapis.com/token",
  "scopes": [
    "https://www.googleapis.com/auth/adwords"
  ]
}'::jsonb WHERE name = 'google_ads';

-- Facebook Ads
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://www.facebook.com/v17.0/dialog/oauth",
  "token_url": "https://graph.facebook.com/v17.0/oauth/access_token",
  "scopes": [
    "ads_management",
    "ads_read",
    "business_management"
  ]
}'::jsonb WHERE name = 'facebook_ads';

-- Asana
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://app.asana.com/-/oauth_authorize",
  "token_url": "https://app.asana.com/-/oauth_token",
  "scopes": [
    "default"
  ]
}'::jsonb WHERE name = 'asana';

-- Google Forms
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
  "token_url": "https://oauth2.googleapis.com/token",
  "scopes": [
    "https://www.googleapis.com/auth/forms.body.readonly",
    "https://www.googleapis.com/auth/forms.responses.readonly"
  ]
}'::jsonb WHERE name = 'google_forms';

-- Zoom
UPDATE connectors SET oauth_config = '{
  "authorization_url": "https://zoom.us/oauth/authorize",
  "token_url": "https://zoom.us/oauth/token",
  "scopes": [
    "meeting:write",
    "meeting:read",
    "webinar:write",
    "webinar:read"
  ]
}'::jsonb WHERE name = 'zoom';

-- Create index for faster queries on oauth_config
CREATE INDEX IF NOT EXISTS idx_connectors_oauth_config ON connectors USING GIN (oauth_config);

-- Show summary
SELECT name, CASE WHEN oauth_config IS NOT NULL THEN 'Yes' ELSE 'No' END as has_oauth_config
FROM connectors
WHERE auth_type = 'oauth2'
ORDER BY name;

EOF

echo "OAuth configurations updated successfully!"
echo "Connectors with OAuth2 support now have their OAuth configurations populated."
