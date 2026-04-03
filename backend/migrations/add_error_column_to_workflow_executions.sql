-- Add error column to workflow_executions table
-- This column stores error information when a workflow execution fails

ALTER TABLE workflow_executions
ADD COLUMN IF NOT EXISTS error JSONB;

-- Add index for faster queries on failed executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_error
ON workflow_executions (workflow_id, status)
WHERE error IS NOT NULL;

-- Add comment
COMMENT ON COLUMN workflow_executions.error IS 'JSON object containing error details when execution fails';
