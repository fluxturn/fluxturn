import { NodeType, NodeTypeDefinition, NODE_DEFINITIONS } from "@/config/workflow";
import { getActionIcon, generateConfigFields } from "./dynamicNodeUtils";

// Store for dynamically created node definitions
export const dynamicNodeDefinitions = new Map<string, NodeTypeDefinition>();

/**
 * Create and register a dynamic node type for a connector action
 */
export function createAndRegisterActionNodeType(
  connector: any,
  action: any
): string {
  // Create a unique node type identifier
  const nodeTypeId = `${connector.name.toUpperCase()}_${action.id.toUpperCase()}`;
  
  // Check if already registered
  if (dynamicNodeDefinitions.has(nodeTypeId)) {
    return nodeTypeId;
  }

  // Get appropriate icon for this action
  const nodeIcon = getActionIcon(action.id, connector.name);
  
  // Generate config fields from action schema
  const configFields = generateConfigFields(action.inputSchema);

  // Create a complete node definition that follows your existing patterns
  const nodeDefinition: NodeTypeDefinition = {
    type: nodeTypeId as NodeType,
    label: action.name, // Clean name like "Send Email"
    description: action.description,
    icon: nodeIcon,
    category: "action",
    color: "teal", // Match your action nodes
    configFields: configFields
  };

  // Register the new node type
  dynamicNodeDefinitions.set(nodeTypeId, nodeDefinition);

  return nodeTypeId;
}

/**
 * Get a node definition (checks both static and dynamic)
 */
export function getNodeDefinition(nodeType: string): NodeTypeDefinition | undefined {
  // First check static definitions
  if (NODE_DEFINITIONS[nodeType as NodeType]) {
    return NODE_DEFINITIONS[nodeType as NodeType];
  }
  
  // Then check dynamic definitions
  return dynamicNodeDefinitions.get(nodeType);
}

/**
 * Get all available node definitions (static + dynamic)
 */
export function getAllNodeDefinitions(): Record<string, NodeTypeDefinition> {
  const allDefinitions: Record<string, NodeTypeDefinition> = {};
  
  // Add static definitions
  Object.entries(NODE_DEFINITIONS).forEach(([key, def]) => {
    allDefinitions[key] = def;
  });
  
  // Add dynamic definitions
  dynamicNodeDefinitions.forEach((def, key) => {
    allDefinitions[key] = def;
  });
  
  return allDefinitions;
}

/**
 * Check if a node type is a dynamic connector action
 */
export function isDynamicConnectorAction(nodeType: string): boolean {
  return dynamicNodeDefinitions.has(nodeType);
}

/**
 * Get connector info from dynamic node type
 */
export function getConnectorInfoFromNodeType(nodeType: string): { connectorName: string; actionId: string } | null {
  if (!isDynamicConnectorAction(nodeType)) return null;
  
  const parts = nodeType.split('_');
  if (parts.length < 2) return null;
  
  return {
    connectorName: parts[0].toLowerCase(),
    actionId: parts.slice(1).join('_').toLowerCase()
  };
}