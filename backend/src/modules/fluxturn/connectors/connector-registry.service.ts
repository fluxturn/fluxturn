import { Injectable, Logger } from '@nestjs/common';
import { CONNECTOR_DEFINITIONS } from '../common/constants/connector.constants';
import { BUILTIN_TRIGGERS, BUILTIN_ACTIONS } from '../workflow/constants/builtin-nodes';

@Injectable()
export class ConnectorRegistryService {
  private readonly logger = new Logger(ConnectorRegistryService.name);
  private connectorMap: Map<string, any>;
  private actionMap: Map<string, any>;
  private triggerMap: Map<string, any>;

  constructor() {
    this.buildMaps();
  }

  private buildMaps() {
    // Build connector lookup map
    this.connectorMap = new Map(
      CONNECTOR_DEFINITIONS.map(c => [c.name, c])
    );

    // Build action lookup: "connector:actionId" -> action definition
    this.actionMap = new Map();
    CONNECTOR_DEFINITIONS.forEach(connector => {
      connector.supported_actions?.forEach(action => {
        const key = `${connector.name}:${action.id}`;
        this.actionMap.set(key, {
          connector: connector.name,
          connectorDisplayName: connector.display_name,
          ...action,
        });
      });
    });

    // Build trigger lookup: "connector:triggerId" -> trigger definition
    this.triggerMap = new Map();
    CONNECTOR_DEFINITIONS.forEach(connector => {
      connector.supported_triggers?.forEach(trigger => {
        const key = `${connector.name}:${trigger.id}`;
        this.triggerMap.set(key, {
          connector: connector.name,
          connectorDisplayName: connector.display_name,
          ...trigger,
        });
      });
    });

    this.logger.log(`📦 Loaded ${this.connectorMap.size} connectors, ${this.actionMap.size} actions, ${this.triggerMap.size} triggers`);
  }

  // Get all connectors
  getAllConnectors() {
    return Array.from(this.connectorMap.values());
  }

  // Get connectors by names
  getConnectorsByNames(names: string[]) {
    return names
      .map(name => this.connectorMap.get(name))
      .filter(Boolean);
  }

  // Get connector by name
  getConnector(name: string) {
    return this.connectorMap.get(name);
  }

  // Get action definition
  getAction(connector: string, actionId: string) {
    return this.actionMap.get(`${connector}:${actionId}`);
  }

  // Get trigger definition
  getTrigger(connector: string, triggerId: string) {
    return this.triggerMap.get(`${connector}:${triggerId}`);
  }

  // Get all available node types
  getAllNodeTypes() {
    return {
      builtinTriggers: BUILTIN_TRIGGERS,
      builtinActions: BUILTIN_ACTIONS,
      connectorTriggers: Array.from(this.triggerMap.values()),
      connectorActions: Array.from(this.actionMap.values()),
    };
  }

  // Build complete documentation for AI
  buildAIDocumentation(availableConnectorNames: string[]): string {
    const connectors = this.getConnectorsByNames(availableConnectorNames);

    let docs = '# AVAILABLE CONNECTORS AND CAPABILITIES\n\n';

    // Built-in nodes
    docs += '## BUILT-IN NODES\n\n';
    docs += this.documentBuiltinNodes();
    docs += '\n\n';

    // Connector nodes
    docs += '## CONNECTOR NODES\n\n';
    connectors.forEach(connector => {
      docs += this.documentConnector(connector);
      docs += '\n\n';
    });

    return docs;
  }

  private documentBuiltinNodes(): string {
    let doc = '';

    // Document triggers
    doc += '### Built-in Triggers:\n';
    BUILTIN_TRIGGERS.forEach(trigger => {
      doc += `- **${trigger.type}** (${trigger.name}): ${trigger.description}\n`;
      if ((trigger as any).config) {
        doc += `  Example config: ${JSON.stringify((trigger as any).config)}\n`;
      }
    });

    doc += '\n### Built-in Actions:\n';
    BUILTIN_ACTIONS.forEach(action => {
      doc += `- **${action.type}** (${action.name}): ${action.description}\n`;
      if ((action as any).config) {
        doc += `  Example config: ${JSON.stringify((action as any).config)}\n`;
      }
    });

    return doc;
  }

  private documentConnector(connector: any): string {
    let doc = `### ${connector.display_name} (${connector.name})\n`;
    doc += `Category: ${connector.category}\n`;
    doc += `Auth: ${connector.auth_type}\n`;

    // Document triggers
    if (connector.supported_triggers?.length > 0) {
      doc += '\n**Triggers:**\n';
      connector.supported_triggers.forEach((trigger: any) => {
        doc += `  - **${trigger.id}**: ${trigger.name}\n`;
        doc += `    ${trigger.description}\n`;

        if (trigger.inputSchema) {
          const requiredFields = Object.entries(trigger.inputSchema)
            .filter(([_, schema]: [string, any]) => schema.required)
            .map(([key, schema]: [string, any]) => {
              let field = `${key} (${schema.type})`;
              if (schema.default !== undefined) field += ` = ${JSON.stringify(schema.default)}`;
              if (schema.options) field += ` [${schema.options.map((o: any) => o.value).join('|')}]`;
              return field;
            });

          if (requiredFields.length > 0) {
            doc += `    Required: ${requiredFields.join(', ')}\n`;
          }
        }
      });
    }

    // Document actions
    if (connector.supported_actions?.length > 0) {
      doc += '\n**Actions:**\n';
      connector.supported_actions.forEach((action: any) => {
        doc += `  - **${action.id}**: ${action.name}\n`;
        doc += `    ${action.description}\n`;

        if (action.inputSchema) {
          const requiredFields = Object.entries(action.inputSchema)
            .filter(([_, schema]: [string, any]) => schema.required)
            .map(([key, schema]: [string, any]) => {
              let field = `${key} (${schema.type})`;
              if (schema.placeholder) field += ` e.g., "${schema.placeholder}"`;
              if (schema.options) field += ` [${schema.options.map((o: any) => o.value).join('|')}]`;
              return field;
            });

          if (requiredFields.length > 0) {
            doc += `    Required: ${requiredFields.join(', ')}\n`;
          }
        }
      });
    }

    return doc;
  }

  // Validate node against definitions
  validateNode(node: any): { isValid: boolean; errors: string[] } {
    const errors = [];

    // Check node type
    const allNodeTypes = [
      ...BUILTIN_TRIGGERS.map(t => t.type),
      ...BUILTIN_ACTIONS.map(a => a.type),
      'CONNECTOR_TRIGGER',
      'CONNECTOR_ACTION',
    ];

    if (!allNodeTypes.includes(node.type)) {
      errors.push(`Invalid node type: ${node.type}`);
    }

    // Validate connector nodes
    if (node.type === 'CONNECTOR_ACTION' || node.type === 'CONNECTOR_TRIGGER') {
      if (!node.connector) {
        errors.push('Connector node must specify connector name');
      } else {
        const connector = this.getConnector(node.connector);
        if (!connector) {
          errors.push(`Connector not found: ${node.connector}`);
        } else {
          // Validate action/trigger ID
          if (node.type === 'CONNECTOR_ACTION') {
            const action = this.getAction(node.connector, node.actionId);
            if (!action) {
              errors.push(`Action not found: ${node.actionId} in ${node.connector}`);
            } else {
              // Validate required fields
              const missingFields = this.validateRequiredFields(node.config || {}, action.inputSchema);
              errors.push(...missingFields);
            }
          } else if (node.type === 'CONNECTOR_TRIGGER') {
            const trigger = this.getTrigger(node.connector, node.triggerId);
            if (!trigger) {
              errors.push(`Trigger not found: ${node.triggerId} in ${node.connector}`);
            } else {
              // Validate required fields
              const missingFields = this.validateRequiredFields(node.config || {}, trigger.inputSchema);
              errors.push(...missingFields);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateRequiredFields(config: any, schema: any): string[] {
    if (!schema) return [];

    const errors = [];
    Object.entries(schema).forEach(([key, fieldSchema]: [string, any]) => {
      if (fieldSchema.required && (config[key] === undefined || config[key] === null || config[key] === '')) {
        errors.push(`Missing required field: ${key}`);
      }
    });

    return errors;
  }

  // Auto-fill default values for a node
  fillDefaults(node: any): any {
    if (node.type === 'CONNECTOR_ACTION') {
      const action = this.getAction(node.connector, node.actionId);
      if (action?.inputSchema) {
        node.config = node.config || {};
        Object.entries(action.inputSchema).forEach(([key, fieldSchema]: [string, any]) => {
          if (fieldSchema.default !== undefined && node.config[key] === undefined) {
            node.config[key] = fieldSchema.default;
            this.logger.log(`📝 Set default value for ${node.name}.${key}: ${fieldSchema.default}`);
          }
        });
      }
    } else if (node.type === 'CONNECTOR_TRIGGER') {
      const trigger = this.getTrigger(node.connector, node.triggerId);
      if (trigger?.inputSchema) {
        node.config = node.config || {};
        Object.entries(trigger.inputSchema).forEach(([key, fieldSchema]: [string, any]) => {
          if (fieldSchema.default !== undefined && node.config[key] === undefined) {
            node.config[key] = fieldSchema.default;
            this.logger.log(`📝 Set default value for ${node.name}.${key}: ${fieldSchema.default}`);
          }
        });
      }
    }

    return node;
  }

  // Get best action for a connector based on description
  getBestAction(connectorName: string, description: string): any {
    const connector = this.getConnector(connectorName);
    if (!connector || !connector.supported_actions) return null;

    // Simple keyword matching for now
    const keywords = description.toLowerCase().split(' ');

    let bestAction = connector.supported_actions[0];
    let bestScore = 0;

    connector.supported_actions.forEach((action: any) => {
      const actionText = `${action.name} ${action.description}`.toLowerCase();
      let score = 0;

      keywords.forEach(keyword => {
        if (actionText.includes(keyword)) score++;
      });

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    });

    return bestAction;
  }

  // Get best trigger for a connector based on description
  getBestTrigger(connectorName: string, description: string): any {
    const connector = this.getConnector(connectorName);
    if (!connector || !connector.supported_triggers) return null;

    // Simple keyword matching
    const keywords = description.toLowerCase().split(' ');

    let bestTrigger = connector.supported_triggers[0];
    let bestScore = 0;

    connector.supported_triggers.forEach((trigger: any) => {
      const triggerText = `${trigger.name} ${trigger.description}`.toLowerCase();
      let score = 0;

      keywords.forEach(keyword => {
        if (triggerText.includes(keyword)) score++;
      });

      if (score > bestScore) {
        bestScore = score;
        bestTrigger = trigger;
      }
    });

    return bestTrigger;
  }
}
