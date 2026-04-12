-- Migration: Create dead_letter_queue table for failed execution recovery
-- Related to: GitHub issue #126

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID,
  workflow_id UUID NOT NULL,
  execution_id UUID NOT NULL,
  failed_step_id VARCHAR(255),
  failed_step_name VARCHAR(255),
  error_message TEXT,
  error_stack TEXT,
  input_data JSONB DEFAULT '{}',
  workflow_snapshot JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'retried', 'discarded')),
  retry_execution_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_org_id
  ON dead_letter_queue (organization_id);

CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_org_status
  ON dead_letter_queue (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_workflow_id
  ON dead_letter_queue (workflow_id);

CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_created_at
  ON dead_letter_queue (created_at DESC);
