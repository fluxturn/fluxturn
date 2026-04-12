-- Add idempotency_key column to workflow_executions for webhook deduplication
ALTER TABLE workflow_executions
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_idempotency_key
  ON workflow_executions(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
