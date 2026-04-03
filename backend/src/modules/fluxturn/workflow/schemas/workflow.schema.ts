import { z } from 'zod';

// Node configuration schema
export const NodeConfigSchema = z.record(z.any());

// Node position schema
export const NodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// Credentials schema
export const CredentialsSchema = z.object({
  id: z.string(),
  name: z.string(),
}).optional();

// Node schema
export const NodeSchema = z.object({
  id: z.string().min(1, 'Node ID is required'),
  name: z.string().min(1, 'Node name is required'),
  type: z.enum([
    'CONNECTOR_TRIGGER',
    'CONNECTOR_ACTION',
    'IF',
    'HTTP_REQUEST',
    'CODE',
    'SET',
    'WAIT',
    'MERGE',
    'ERROR_HANDLER',
    'SCHEDULE',
    'WEBHOOK',
  ]),
  connector: z.string().optional(),
  actionId: z.string().optional(),
  triggerId: z.string().optional(),
  config: NodeConfigSchema.optional(),
  credentials: CredentialsSchema,
  position: NodePositionSchema.optional(),
  // Validation metadata
  needsCredentials: z.boolean().optional(),
  hasEmptyRequiredFields: z.boolean().optional(),
  missingFields: z.array(z.string()).optional(),
  validationErrors: z.array(z.string()).optional(),
});

// Connection schema
export const ConnectionSchema = z.object({
  source: z.string().min(1, 'Source node ID is required'),
  sourcePort: z.string().default('main'),
  target: z.string().min(1, 'Target node ID is required'),
  targetPort: z.string().default('main'),
});

// Complete workflow schema
export const WorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
  nodes: z.array(NodeSchema).min(1, 'Workflow must have at least one node'),
  connections: z.array(ConnectionSchema),
  // Metadata
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// Export types
export type WorkflowType = z.infer<typeof WorkflowSchema>;
export type NodeType = z.infer<typeof NodeSchema>;
export type ConnectionType = z.infer<typeof ConnectionSchema>;

/**
 * Validate workflow with Zod schema
 */
export function validateWorkflow(workflow: any): {
  isValid: boolean;
  workflow?: WorkflowType;
  errors: string[];
} {
  try {
    const validated = WorkflowSchema.parse(workflow);
    return {
      isValid: true,
      workflow: validated,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => {
        const path = e.path.join('.');
        return `${path}: ${e.message}`;
      });
      return {
        isValid: false,
        errors,
      };
    }
    throw error;
  }
}

/**
 * Validate node with Zod schema
 */
export function validateNode(node: any): {
  isValid: boolean;
  node?: NodeType;
  errors: string[];
} {
  try {
    const validated = NodeSchema.parse(node);
    return {
      isValid: true,
      node: validated,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => {
        const path = e.path.join('.');
        return `${path}: ${e.message}`;
      });
      return {
        isValid: false,
        errors,
      };
    }
    throw error;
  }
}

/**
 * Validate connection with Zod schema
 */
export function validateConnection(connection: any): {
  isValid: boolean;
  connection?: ConnectionType;
  errors: string[];
} {
  try {
    const validated = ConnectionSchema.parse(connection);
    return {
      isValid: true,
      connection: validated,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => {
        const path = e.path.join('.');
        return `${path}: ${e.message}`;
      });
      return {
        isValid: false,
        errors,
      };
    }
    throw error;
  }
}
