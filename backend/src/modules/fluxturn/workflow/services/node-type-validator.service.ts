import { Injectable, Logger } from '@nestjs/common';
import { PlatformService } from '../../../database/platform.service';
import { ConnectorLookup } from '../../connectors/shared';

/**
 * Node Type Validator Service
 * Validates that AI-generated nodes match connector definitions
 * Specifically validates CONNECTOR_TRIGGER and CONNECTOR_ACTION nodes
 * Now reads from TypeScript constants instead of database
 */
@Injectable()
export class NodeTypeValidatorService {
  private readonly logger = new Logger(NodeTypeValidatorService.name);

  constructor(private readonly platformService: PlatformService) {}

  /**
   * Validate a node against database definitions
   */
  async validateNode(node: any): Promise<{
    valid: boolean;
    errors: string[];
    normalized?: any;
  }> {
    const errors: string[] = [];
    const nodeType = node.type;

    // Check if it's a connector-based node
    if (nodeType === 'CONNECTOR_TRIGGER') {
      const result = await this.validateConnectorTrigger(node);
      if (!result.valid) {
        errors.push(...result.errors);
        return { valid: false, errors, normalized: result.normalized };
      }
    } else if (nodeType === 'CONNECTOR_ACTION') {
      const result = await this.validateConnectorAction(node);
      if (!result.valid) {
        errors.push(...result.errors);
        return { valid: false, errors, normalized: result.normalized };
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      normalized: node,
    };
  }

  /**
   * Validate CONNECTOR_TRIGGER node
   */
  private async validateConnectorTrigger(node: any): Promise<{
    valid: boolean;
    errors: string[];
    normalized?: any;
  }> {
    const errors: string[] = [];
    const connector = node.data?.connector || node.data?.connectorType;
    const triggerId = node.data?.trigger || node.data?.triggerId;

    if (!connector) {
      errors.push('CONNECTOR_TRIGGER requires data.connector field');
      return { valid: false, errors };
    }

    if (!triggerId) {
      errors.push('CONNECTOR_TRIGGER requires data.trigger field');
      return { valid: false, errors };
    }

    // Check if connector exists and has this trigger (from TypeScript constants)
    const connectorDef = ConnectorLookup.getByName(connector);

    if (!connectorDef) {
      errors.push(`Connector "${connector}" not found or inactive`);
      return { valid: false, errors };
    }

    const supportedTriggers = connectorDef.supported_triggers || [];
    const triggerExists = supportedTriggers.some((t: any) => t.id === triggerId);

    if (!triggerExists) {
      const availableTriggers = supportedTriggers.map((t: any) => t.id);
      errors.push(
        `Trigger "${triggerId}" not found for connector "${connector}". ` +
        `Available triggers: ${availableTriggers.join(', ') || 'none'}`
      );
      return { valid: false, errors };
    }

    // Normalize the node structure
    const normalized = {
      ...node,
      data: {
        ...node.data,
        connector,
        trigger: triggerId,
        // Remove alternate field names
        connectorType: undefined,
        triggerId: undefined,
      },
    };

    return { valid: true, errors: [], normalized };
  }

  /**
   * Validate CONNECTOR_ACTION node
   */
  private async validateConnectorAction(node: any): Promise<{
    valid: boolean;
    errors: string[];
    normalized?: any;
  }> {
    const errors: string[] = [];
    const connector = node.data?.connector || node.data?.connectorType;
    const actionId = node.data?.action || node.data?.actionId;

    if (!connector) {
      errors.push('CONNECTOR_ACTION requires data.connector field');
      return { valid: false, errors };
    }

    if (!actionId) {
      errors.push('CONNECTOR_ACTION requires data.action field');
      return { valid: false, errors };
    }

    // Check if connector exists and has this action (from TypeScript constants)
    const connectorDef = ConnectorLookup.getByName(connector);

    if (!connectorDef) {
      errors.push(`Connector "${connector}" not found or inactive`);
      return { valid: false, errors };
    }

    const supportedActions = connectorDef.supported_actions || [];
    const actionExists = supportedActions.some((a: any) => a.id === actionId);

    if (!actionExists) {
      const availableActions = supportedActions.map((a: any) => a.id);
      errors.push(
        `Action "${actionId}" not found for connector "${connector}". ` +
        `Available actions: ${availableActions.join(', ') || 'none'}`
      );
      return { valid: false, errors };
    }

    // Normalize the node structure
    const normalized = {
      ...node,
      data: {
        ...node.data,
        connector,
        action: actionId,
        // Remove alternate field names
        connectorType: undefined,
        actionId: undefined,
      },
    };

    return { valid: true, errors: [], normalized };
  }

  /**
   * Batch validate all nodes in a workflow
   */
  async validateWorkflowNodes(nodes: any[]): Promise<{
    validNodes: any[];
    invalidNodes: Array<{
      node: any;
      errors: string[];
    }>;
    totalErrors: number;
  }> {
    const validNodes: any[] = [];
    const invalidNodes: Array<{ node: any; errors: string[] }> = [];

    for (const node of nodes) {
      const validation = await this.validateNode(node);

      if (validation.valid) {
        validNodes.push(validation.normalized || node);
      } else {
        invalidNodes.push({
          node,
          errors: validation.errors,
        });
        this.logger.warn(`❌ Invalid node: ${node.type} (${node.id})`);
        validation.errors.forEach(err => this.logger.warn(`   - ${err}`));
      }
    }

    return {
      validNodes,
      invalidNodes,
      totalErrors: invalidNodes.reduce((sum, n) => sum + n.errors.length, 0),
    };
  }

  /**
   * Get all valid triggers for a connector
   * Now reads from TypeScript constants instead of database
   */
  getValidTriggersForConnector(connectorName: string): Array<{
    id: string;
    name: string;
    description: string;
  }> {
    const triggers = ConnectorLookup.getTriggers(connectorName);
    return triggers.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
    }));
  }

  /**
   * Get all valid actions for a connector
   * Now reads from TypeScript constants instead of database
   */
  getValidActionsForConnector(connectorName: string): Array<{
    id: string;
    name: string;
    description: string;
  }> {
    const actions = ConnectorLookup.getActions(connectorName);
    return actions.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description || '',
    }));
  }

  /**
   * Get summary of all available connector nodes
   * Now reads from TypeScript constants instead of database
   */
  getConnectorNodesSummary(): any {
    const connectors = ConnectorLookup.getAll();

    return connectors.map(c => ({
      name: c.name,
      displayName: c.display_name,
      category: c.category,
      triggers: (c.supported_triggers || []).map((t: any) => ({
        id: t.id,
        name: t.name,
      })),
      actions: (c.supported_actions || []).map((a: any) => ({
        id: a.id,
        name: a.name,
      })),
    }));
  }
}
