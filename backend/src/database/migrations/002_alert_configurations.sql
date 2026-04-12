-- Migration: Create alert_configurations table for workflow failure alerting
-- Related to: GitHub issue #124

CREATE TABLE IF NOT EXISTS alert_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'webhook', 'slack')),
  config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '{"onEveryFailure": true}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_configurations_org_id
  ON alert_configurations (organization_id);

CREATE INDEX IF NOT EXISTS idx_alert_configurations_org_active
  ON alert_configurations (organization_id, is_active)
  WHERE is_active = true;
