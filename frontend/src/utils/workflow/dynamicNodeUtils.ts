import { NodeType, NodeTypeDefinition, NodeConfigField } from "@/config/workflow";
import {
  Mail,
  Plus,
  Edit,
  Tag,
  MessageSquare,
  Search,
  X,
  Database,
  Zap,
  Eye,
  EyeOff,
  Reply,
  Trash,
  UserPlus,
  Target,
  FileText,
  FilePlus
} from "lucide-react";

/** Schema definition for a single field in a connector action's input. */
export interface FieldSchema {
  description?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  default?: string | number | boolean;
  options?: (string | { label: string; value: string })[];
  enum?: string[];
}

/** Lightweight representation of a connector returned by the backend. */
interface ConnectorRef {
  name: string;
  display_name?: string;
}

/** Lightweight representation of an action returned by the backend. */
interface ActionRef {
  id: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, FieldSchema>;
  icon?: string;
}

/** Lightweight representation of a trigger returned by the backend. */
interface TriggerRef {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  eventType?: string;
  webhookRequired?: boolean;
  outputSchema?: Record<string, unknown>;
}

/**
 * Generate config fields from action input schema
 */
export function generateConfigFields(inputSchema: Record<string, FieldSchema> | null | undefined): NodeConfigField[] {
  if (!inputSchema) return [];

  return Object.entries(inputSchema).map(([fieldName, fieldDef]) => {
    // Create field following your EXACT pattern
    const configField: NodeConfigField = {
      name: fieldName,
      label: formatFieldLabel(fieldName, fieldDef.description),
      type: getFieldType(fieldDef.type, fieldName),
      required: fieldDef.required || false,
      placeholder: getFieldPlaceholder(fieldName, fieldDef),
    };

    // Add description if available (like your existing nodes)
    if (fieldDef.description) {
      configField.description = fieldDef.description;
    }

    // Add default value if specified (like your existing nodes)
    if (fieldDef.default !== undefined) {
      configField.defaultValue = fieldDef.default;
    }

    // Handle select options (like your timezone field)
    if (fieldDef.options || fieldDef.enum) {
      configField.type = "select";
      const options = fieldDef.options ?? fieldDef.enum ?? [];
      configField.options = options.map((opt: string | { label: string; value: string }) =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
      );
    }

    return configField;
  });
}

/**
 * Format field labels to match your existing style
 */
function formatFieldLabel(fieldName: string, description?: string): string {
  if (description) return description;
  
  // Convert camelCase to Title Case like your existing fields
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Generate appropriate placeholders like your existing nodes
 */
function getFieldPlaceholder(fieldName: string, fieldDef: FieldSchema): string {
  if (fieldDef.placeholder) return fieldDef.placeholder;
  
  // Match your existing placeholder style
  switch (fieldName.toLowerCase()) {
    case 'to':
    case 'email':
      return 'user@example.com';
    case 'subject':
      return 'Email subject';
    case 'body':
    case 'content':
    case 'message':
      return 'Enter content...';
    case 'url':
      return 'https://api.example.com/endpoint';
    case 'channel':
      return '#general';
    case 'name':
    case 'title':
      return `Enter ${fieldName}`;
    default:
      return `Enter ${fieldName.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
  }
}

/**
 * Determine the appropriate field type based on schema
 */
function getFieldType(schemaType: string | undefined, fieldName: string): NodeConfigField['type'] {
  if (schemaType === 'boolean') return 'toggle';
  if (schemaType === 'number') return 'number';
  
  // String field type inference
  if (fieldName.toLowerCase().includes('body') || 
      fieldName.toLowerCase().includes('content') ||
      fieldName.toLowerCase().includes('message')) {
    return 'textarea';
  }
  
  if (fieldName.toLowerCase().includes('code') ||
      fieldName.toLowerCase().includes('script') ||
      fieldName.toLowerCase().includes('expression')) {
    return 'code';
  }
  
  return 'text';
}

/**
 * Get appropriate icon for action based on action ID and connector type
 */
export function getActionIcon(actionId: string, connectorType: string) {
  // Email actions
  if (actionId.includes('send_email') || actionId.includes('send_message')) return Mail;
  if (actionId.includes('reply')) return Reply;
  
  // CRUD operations
  if (actionId.includes('create')) return Plus;
  if (actionId.includes('delete') || actionId.includes('remove')) return Trash;
  if (actionId.includes('update') || actionId.includes('edit')) return Edit;
  if (actionId.includes('get') || actionId.includes('read') || actionId.includes('fetch')) return Search;
  
  // Status operations
  if (actionId.includes('mark_read')) return Eye;
  if (actionId.includes('mark_unread')) return EyeOff;
  
  // Label/Tag operations
  if (actionId.includes('label') || actionId.includes('tag')) return Tag;
  
  // User operations
  if (actionId.includes('invite') || actionId.includes('add_user')) return UserPlus;
  
  // Lead/Contact operations
  if (actionId.includes('lead') || actionId.includes('contact')) return Target;
  
  // File operations
  if (actionId.includes('create_page') || actionId.includes('create_file')) return FilePlus;
  if (actionId.includes('file') || actionId.includes('document')) return FileText;
  
  // Message operations
  if (actionId.includes('message') || actionId.includes('chat')) return MessageSquare;
  
  // Connector-specific defaults
  switch (connectorType) {
    case 'gmail':
    case 'outlook':
    case 'sendgrid':
      return Mail;
    case 'slack':
    case 'discord':
    case 'teams':
      return MessageSquare;
    case 'salesforce':
    case 'hubspot':
    case 'pipedrive':
      return Target;
    case 'airtable':
    case 'google_sheets':
    case 'notion':
      return Database;
    default:
      return Zap;
  }
}

/**
 * Create a professional node definition for a connector action
 */
export function createConnectorActionNode(
  connector: ConnectorRef,
  action: ActionRef,
  position: { x: number; y: number }
) {
  const nodeIcon = getActionIcon(action.id, connector.name);
  const configFields = generateConfigFields(action.inputSchema);
  
  return {
    id: `${connector.name}_${action.id}_${Date.now()}`,
    type: NodeType.CONNECTOR_ACTION,
    position,
    data: {
      // Follow EXACT pattern of your existing nodes
      label: action.name, // Clean label like "Send Email"
      icon: nodeIcon.name, // Just the icon name as string 
      color: "teal", // Consistent with your action nodes
      category: "action",
      description: action.description,
      
      // Store configuration fields exactly like your built-in nodes
      configFields: configFields,
      
      // Additional connector metadata (but keep it clean)
      connectorType: connector.name,
      actionId: action.id,
      inputSchema: action.inputSchema,
    },
  };
}

/**
 * Create a professional connector trigger node
 */
export function createConnectorTriggerNode(
  connector: ConnectorRef,
  trigger: TriggerRef,
  position: { x: number; y: number }
) {
  return {
    id: `${connector.name}_${trigger.id}_${Date.now()}`,
    type: NodeType.CONNECTOR_TRIGGER, // ✅ FIXED: Use CONNECTOR_TRIGGER instead of WEBHOOK
    position,
    data: {
      label: trigger.name, // Just the trigger name, not "Facebook Graph API Page Post Published"
      description: trigger.description,
      icon: trigger.icon || "Zap",
      color: "cyan",
      category: "trigger",

      connectorType: connector.name,
      connectorDisplayName: connector.display_name,
      triggerId: trigger.id,
      triggerName: trigger.name,
      eventType: trigger.eventType,
      webhookRequired: trigger.webhookRequired,
      outputSchema: trigger.outputSchema,
    },
  };
}