-- Add oauth_config column to connectors table
-- This column stores OAuth configuration for connectors that support OAuth2

ALTER TABLE connectors
ADD COLUMN IF NOT EXISTS oauth_config JSONB;

-- Add comment
COMMENT ON COLUMN connectors.oauth_config IS 'OAuth 2.0 configuration including authorization_url, token_url, and scopes';

-- Create index for faster queries on oauth_config
CREATE INDEX IF NOT EXISTS idx_connectors_oauth_config ON connectors USING GIN (oauth_config);
