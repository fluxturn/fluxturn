export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface TemplateDiff {
  hasChanges: boolean;
  changes: FieldChange[];
  setClauses: string[];
  values: any[];
}

interface FieldConfig {
  dbField: string;
  defField: string;
  transform: (v: any, template?: any) => any;
  isJson?: boolean;
  isArray?: boolean;
}

/**
 * Compare existing template data with new definition and return only changed fields
 */
export function compareTemplateFields(
  existing: any,
  newTemplate: any,
): TemplateDiff {
  const changes: FieldChange[] = [];
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Build template_definition object
  const templateDefinition = {
    canvas: newTemplate.canvas || {},
    steps: newTemplate.steps || [],
    triggers: newTemplate.triggers || [],
    conditions: newTemplate.conditions || [],
    variables: newTemplate.variables || [],
    outputs: newTemplate.outputs || [],
  };

  // Define fields to compare (seedable fields only)
  const fieldsToCompare: FieldConfig[] = [
    {
      dbField: 'name',
      defField: 'name',
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
      dbField: 'template_definition',
      defField: 'template_definition',
      transform: () => JSON.stringify(templateDefinition),
      isJson: true,
    },
    {
      dbField: 'canvas',
      defField: 'canvas',
      transform: (v: any) => JSON.stringify(v || {}),
      isJson: true,
    },
    {
      dbField: 'steps',
      defField: 'steps',
      transform: (v: any) => JSON.stringify(v || []),
      isJson: true,
    },
    {
      dbField: 'triggers',
      defField: 'triggers',
      transform: (v: any) => JSON.stringify(v || []),
      isJson: true,
    },
    {
      dbField: 'conditions',
      defField: 'conditions',
      transform: (v: any) => JSON.stringify(v || []),
      isJson: true,
    },
    {
      dbField: 'variables',
      defField: 'variables',
      transform: (v: any) => JSON.stringify(v || []),
      isJson: true,
    },
    {
      dbField: 'outputs',
      defField: 'outputs',
      transform: (v: any) => JSON.stringify(v || []),
      isJson: true,
    },
    {
      dbField: 'required_connectors',
      defField: 'required_connectors',
      transform: (v: any) => v || [],
      isArray: true,
    },
    {
      dbField: 'tags',
      defField: 'tags',
      transform: (v: any) => v || [],
      isArray: true,
    },
    {
      dbField: 'is_public',
      defField: 'is_public',
      transform: (v: any) => v !== undefined ? v : true,
    },
    {
      dbField: 'verified',
      defField: 'verified',
      transform: (v: any) => v !== undefined ? v : false,
    },
    {
      dbField: 'metadata',
      defField: 'metadata',
      transform: (v: any) => JSON.stringify(v || {}),
      isJson: true,
    },
    {
      dbField: 'ai_prompt',
      defField: 'ai_prompt',
      transform: (v: any) => v || null,
    },
  ];

  for (const field of fieldsToCompare) {
    const newValue = field.transform(newTemplate[field.defField], newTemplate);
    let existingValue = existing[field.dbField];

    // Normalize JSON fields for comparison
    if (field.isJson && existingValue !== null && existingValue !== undefined) {
      existingValue = JSON.stringify(existingValue);
    }

    // Normalize array fields for comparison
    if (field.isArray) {
      existingValue = JSON.stringify(existingValue || []);
      const newValueStr = JSON.stringify(newValue || []);
      if (existingValue !== newValueStr) {
        changes.push({
          field: field.dbField,
          oldValue: existingValue,
          newValue: newValue,
        });
        setClauses.push(`${field.dbField} = $${paramIndex}`);
        values.push(newValue);
        paramIndex++;
      }
      continue;
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
