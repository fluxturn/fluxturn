import { ConnectorDefinition } from '../../connectors/shared';

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface ConnectorDiff {
  hasChanges: boolean;
  changes: FieldChange[];
  setClauses: string[];
  values: any[];
}

interface FieldConfig {
  dbField: string;
  defField: keyof ConnectorDefinition;
  transform: (v: any) => any;
  isJson?: boolean;
}

/**
 * Compare existing connector data with new definition and return only changed fields
 */
export function compareConnectorFields(
  existing: any,
  newDefinition: ConnectorDefinition,
): ConnectorDiff {
  const changes: FieldChange[] = [];
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Define fields to compare (seedable fields only)
  const fieldsToCompare: FieldConfig[] = [
    {
      dbField: 'display_name',
      defField: 'display_name',
      transform: (v: any) => v,
    },
    {
      dbField: 'description',
      defField: 'description',
      transform: (v: any) => v,
    },
    {
      dbField: 'category',
      defField: 'category',
      transform: (v: any) => v,
    },
    {
      dbField: 'auth_type',
      defField: 'auth_type',
      transform: (v: any) => v || 'api_key',
    },
    {
      dbField: 'auth_fields',
      defField: 'auth_fields',
      transform: (v: any) => (v ? JSON.stringify(v) : null),
      isJson: true,
    },
    {
      dbField: 'endpoints',
      defField: 'endpoints',
      transform: (v: any) => (v ? JSON.stringify(v) : null),
      isJson: true,
    },
    {
      dbField: 'webhook_support',
      defField: 'webhook_support',
      transform: (v: any) => v ?? false,
    },
    {
      dbField: 'rate_limits',
      defField: 'rate_limits',
      transform: (v: any) => (v ? JSON.stringify(v) : null),
      isJson: true,
    },
    {
      dbField: 'sandbox_available',
      defField: 'sandbox_available',
      transform: (v: any) => v ?? false,
    },
    {
      dbField: 'verified',
      defField: 'verified',
      transform: (v: any) => v ?? false,
    },
    {
      dbField: 'supported_triggers',
      defField: 'supported_triggers',
      transform: (v: any) => JSON.stringify(v || []),
      isJson: true,
    },
    {
      dbField: 'supported_actions',
      defField: 'supported_actions',
      transform: (v: any) => JSON.stringify(v || []),
      isJson: true,
    },
    {
      dbField: 'oauth_config',
      defField: 'oauth_config',
      transform: (v: any) => (v ? JSON.stringify(v) : null),
      isJson: true,
    },
  ];

  for (const field of fieldsToCompare) {
    const newValue = field.transform(newDefinition[field.defField]);
    let existingValue = existing[field.dbField];

    // Normalize JSON fields for comparison
    if (field.isJson && existingValue !== null && existingValue !== undefined) {
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
      values.push(newValue);
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

/**
 * Deep equality check for comparing field values
 * Handles JSON strings by parsing and comparing objects
 */
function isEqual(a: any, b: any): boolean {
  // Handle null/undefined
  if (a === null && b === null) return true;
  if (a === undefined && b === undefined) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;

  // For booleans
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b;
  }

  // For strings - check if they're JSON strings
  if (typeof a === 'string' && typeof b === 'string') {
    // Try to parse as JSON for deep comparison
    if ((a.startsWith('{') || a.startsWith('[')) && (b.startsWith('{') || b.startsWith('['))) {
      try {
        const parsedA = JSON.parse(a);
        const parsedB = JSON.parse(b);
        return deepEqual(parsedA, parsedB);
      } catch {
        // Not valid JSON, do string comparison
        return a === b;
      }
    }
    return a === b;
  }

  // Fallback to string comparison
  return String(a) === String(b);
}

/**
 * Deep equality check for objects and arrays
 * Handles different key ordering in objects
 */
function deepEqual(a: any, b: any): boolean {
  // Handle primitives and null/undefined
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  // Primitives
  return a === b;
}
