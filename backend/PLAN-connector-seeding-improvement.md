# Plan: Smart Connector Seeding with Field-Level Change Detection

## Current State Analysis

### Connector Seeding (Current - workflow.service.ts)
- Checks if connector exists by `name + is_public = true`
- If NOT exists → INSERT
- If EXISTS → UPDATE **all fields** (except `icon_url`, `usage_count`, etc.)
- **Problem**: Updates ALL fields even if only one field changed

---

## Proposed Solution: Field-Level Change Detection

### Approach
1. Fetch existing connector data from database
2. Compare each field individually
3. Build dynamic UPDATE query with **only changed fields**
4. Skip entirely if nothing changed

---

## Implementation

### Step 1: Update SELECT Query to Fetch All Seedable Fields

```typescript
const existingQuery = `
  SELECT
    id,
    display_name,
    description,
    category,
    auth_type,
    auth_fields,
    endpoints,
    webhook_support,
    rate_limits,
    sandbox_available,
    supported_triggers,
    supported_actions,
    oauth_config
  FROM connectors
  WHERE name = $1 AND is_public = true
`;
```

---

### Step 2: Create Field Comparison Utility

```typescript
// backend/src/common/utils/connector-diff.util.ts

interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

interface ConnectorDiff {
  hasChanges: boolean;
  changes: FieldChange[];
  setClauses: string[];
  values: any[];
}

export function compareConnectorFields(
  existing: any,
  newDefinition: ConnectorDefinition
): ConnectorDiff {
  const changes: FieldChange[] = [];
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Define fields to compare (seedable fields only)
  const fieldsToCompare = [
    {
      dbField: 'display_name',
      defField: 'display_name',
      transform: (v: any) => v
    },
    {
      dbField: 'description',
      defField: 'description',
      transform: (v: any) => v
    },
    {
      dbField: 'category',
      defField: 'category',
      transform: (v: any) => v
    },
    {
      dbField: 'auth_type',
      defField: 'auth_type',
      transform: (v: any) => v || 'api_key'
    },
    {
      dbField: 'auth_fields',
      defField: 'auth_fields',
      transform: (v: any) => v ? JSON.stringify(v) : null,
      isJson: true
    },
    {
      dbField: 'endpoints',
      defField: 'endpoints',
      transform: (v: any) => v ? JSON.stringify(v) : null,
      isJson: true
    },
    {
      dbField: 'webhook_support',
      defField: 'webhook_support',
      transform: (v: any) => v ?? false
    },
    {
      dbField: 'rate_limits',
      defField: 'rate_limits',
      transform: (v: any) => v ? JSON.stringify(v) : null,
      isJson: true
    },
    {
      dbField: 'sandbox_available',
      defField: 'sandbox_available',
      transform: (v: any) => v ?? false
    },
    {
      dbField: 'supported_triggers',
      defField: 'supported_triggers',
      transform: (v: any) => JSON.stringify(v || []),
      isJson: true
    },
    {
      dbField: 'supported_actions',
      defField: 'supported_actions',
      transform: (v: any) => JSON.stringify(v || []),
      isJson: true
    },
    {
      dbField: 'oauth_config',
      defField: 'oauth_config',
      transform: (v: any) => v ? JSON.stringify(v) : null,
      isJson: true
    },
  ];

  for (const field of fieldsToCompare) {
    const newValue = field.transform(newDefinition[field.defField]);
    let existingValue = existing[field.dbField];

    // Normalize JSON fields for comparison
    if (field.isJson && existingValue !== null) {
      existingValue = JSON.stringify(existingValue);
    }

    // Compare values
    if (!isEqual(existingValue, newValue)) {
      changes.push({
        field: field.dbField,
        oldValue: existingValue,
        newValue: newValue,
      });

      setClauses.push(`${field.dbField} = $${paramIndex}`);
      values.push(field.isJson ? newValue : newValue);
      paramIndex++;
    }
  }

  return {
    hasChanges: changes.length > 0,
    changes,
    setClauses,
    values,
  };
}

function isEqual(a: any, b: any): boolean {
  // Handle null/undefined
  if (a === null && b === null) return true;
  if (a === undefined && b === undefined) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;

  // For strings (including JSON strings), direct comparison
  if (typeof a === 'string' && typeof b === 'string') {
    return a === b;
  }

  // For booleans
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b;
  }

  // Fallback to string comparison
  return String(a) === String(b);
}
```

---

### Step 3: Update Connector Seeding Logic

**Location**: `backend/src/modules/workflow/workflow.service.ts`

```typescript
import { compareConnectorFields } from '../../common/utils/connector-diff.util';

private async initializeConnectors(): Promise<void> {
  try {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const connector of CONNECTOR_DEFINITIONS) {
      // Check if connector exists and get current values
      const existingQuery = `
        SELECT
          id,
          display_name,
          description,
          category,
          auth_type,
          auth_fields,
          endpoints,
          webhook_support,
          rate_limits,
          sandbox_available,
          supported_triggers,
          supported_actions,
          oauth_config
        FROM connectors
        WHERE name = $1 AND is_public = true
      `;
      const existing = await this.platformService.query(existingQuery, [connector.name]);

      if (existing.rows.length === 0) {
        // INSERT new connector
        await this.insertConnector(connector);
        inserted++;
        this.logger.log(`   ✅ Inserted new connector: ${connector.name}`);
      } else {
        // Compare fields and get diff
        const diff = compareConnectorFields(existing.rows[0], connector);

        if (!diff.hasChanges) {
          // No changes - skip
          skipped++;
          // this.logger.debug(`   ⏭️  Skipped (unchanged): ${connector.name}`);
        } else {
          // Update only changed fields
          await this.updateConnectorFields(connector.name, diff);
          updated++;

          // Log which fields changed
          const changedFields = diff.changes.map(c => c.field).join(', ');
          this.logger.log(`   🔄 Updated connector: ${connector.name} (fields: ${changedFields})`);
        }
      }
    }

    this.logger.log(`✅ Connector seeding complete: ${inserted} inserted, ${updated} updated, ${skipped} unchanged`);
  } catch (error) {
    this.logger.error('Failed to initialize connectors:', error);
  }
}

private async insertConnector(connector: ConnectorDefinition): Promise<void> {
  const insertQuery = `
    INSERT INTO connectors (
      id, name, display_name, description, category, type,
      status, is_public, auth_type, auth_fields, endpoints,
      webhook_support, rate_limits, sandbox_available, capabilities,
      supported_triggers, supported_actions, oauth_config,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14, $15,
      $16, $17, $18,
      NOW(), NOW()
    )
  `;

  const values = [
    uuidv4(),
    connector.name,
    connector.display_name,
    connector.description,
    connector.category,
    'official',
    'active',
    true,
    connector.auth_type || 'api_key',
    connector.auth_fields ? JSON.stringify(connector.auth_fields) : null,
    connector.endpoints ? JSON.stringify(connector.endpoints) : null,
    connector.webhook_support ?? false,
    connector.rate_limits ? JSON.stringify(connector.rate_limits) : null,
    connector.sandbox_available ?? false,
    JSON.stringify({ triggers: [], actions: [], conditions: [], webhooks: connector.webhook_support ?? false, batch: true }),
    JSON.stringify(connector.supported_triggers || []),
    JSON.stringify(connector.supported_actions || []),
    connector.oauth_config ? JSON.stringify(connector.oauth_config) : null,
  ];

  await this.platformService.query(insertQuery, values);
}

private async updateConnectorFields(
  connectorName: string,
  diff: ConnectorDiff
): Promise<void> {
  if (!diff.hasChanges) return;

  // Build dynamic UPDATE query with only changed fields
  const updateQuery = `
    UPDATE connectors
    SET ${diff.setClauses.join(', ')}, updated_at = NOW()
    WHERE name = $${diff.values.length + 1} AND is_public = true
  `;

  const values = [...diff.values, connectorName];

  await this.platformService.query(updateQuery, values);
}
```

---

## Example Scenarios

### Scenario 1: Only `description` changed

**Before (current)**: Updates ALL 12 fields
```sql
UPDATE connectors SET display_name=$1, description=$2, category=$3, ... WHERE name=$14
```

**After (new)**: Updates ONLY `description`
```sql
UPDATE connectors SET description = $1, updated_at = NOW() WHERE name = $2
```

**Log output**:
```
🔄 Updated connector: telegram (fields: description)
```

---

### Scenario 2: `supported_actions` and `auth_fields` changed

**After (new)**:
```sql
UPDATE connectors
SET supported_actions = $1, auth_fields = $2, updated_at = NOW()
WHERE name = $3
```

**Log output**:
```
🔄 Updated connector: gmail (fields: supported_actions, auth_fields)
```

---

### Scenario 3: Nothing changed

**After (new)**: No UPDATE query executed at all
```
⏭️  Skipped (unchanged): telegram
```

---

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Field updates** | All 12 fields every time | Only changed fields |
| **Database efficiency** | Large UPDATE payload | Minimal UPDATE payload |
| **Manual edits preserved** | `icon_url` safe | `icon_url` and ALL non-seeded fields safe |
| **Logging** | "Updated connector X" | "Updated connector X (fields: description, auth_fields)" |
| **Unchanged connectors** | Still runs UPDATE | Skipped entirely |

---

## Files to Modify

1. **`backend/src/common/utils/connector-diff.util.ts`** (NEW FILE)
   - `compareConnectorFields()` function
   - `isEqual()` helper

2. **`backend/src/modules/workflow/workflow.service.ts`**
   - Update `initializeConnectors()` method
   - Add `insertConnector()` helper
   - Add `updateConnectorFields()` helper

---

## Fields NOT Updated by Seeding (Always Preserved)

These fields are never touched by seeding, so manual edits are safe:

| Field | Reason |
|-------|--------|
| `icon_url` | Manual/CDN managed |
| `documentation_url` | Manual |
| `api_version` | Manual |
| `status` | Only set on INSERT |
| `type` | Only set on INSERT |
| `capabilities` | Only set on INSERT |
| `required_fields` | Not in definition |
| `optional_fields` | Not in definition |
| `auth_config` | Not in definition |
| `batch_support` | Not in definition |
| `real_time_support` | Not in definition |
| `organization_id` | Not in definition |
| `is_public` | Only set on INSERT |
| `usage_count` | Runtime counter |
| `created_by` | Only set on INSERT |
| `created_at` | Only set on INSERT |
