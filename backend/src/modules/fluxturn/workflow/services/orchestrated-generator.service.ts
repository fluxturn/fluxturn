import { Injectable, Logger } from '@nestjs/common';
import { WorkflowAgentsService } from './workflow-agents.service';
import { ConnectorRegistryService } from '../../connectors/connector-registry.service';

@Injectable()
export class OrchestratedGeneratorService {
  private readonly logger = new Logger(OrchestratedGeneratorService.name);

  constructor(
    private readonly agents: WorkflowAgentsService,
    private readonly connectorRegistry: ConnectorRegistryService,
  ) {}

  async generateWorkflow(
    prompt: string,
    availableConnectors: string[],
    onProgress?: (step: string, data?: any) => void,
  ) {
    try {
      this.logger.log(`🚀 Starting orchestrated workflow generation for: "${prompt}"`);

      // STEP 1: Detect intent and plan
      onProgress?.('analyzing', { message: 'Understanding your request...' });
      const intentResult = await this.agents.detectIntentAndPlan(prompt);

      if (!intentResult.success) {
        throw new Error('Failed to understand workflow intent');
      }

      this.logger.log(`📋 Intent: ${intentResult.data.intent}, Confidence: ${intentResult.confidence}%`);
      onProgress?.('planning', {
        intent: intentResult.data,
        confidence: intentResult.confidence,
      });

      // STEP 2: Select best connectors
      onProgress?.('selecting', { message: 'Selecting best connectors...' });
      const connectorResult = await this.agents.selectConnectors(
        intentResult.data,
        availableConnectors,
      );

      const selectedConnectors = connectorResult.data.selectedConnectors.map((c: any) => c.name);
      this.logger.log(`🔌 Selected connectors: ${selectedConnectors.join(', ')}`);
      onProgress?.('connectors', { connectors: connectorResult.data });

      // STEP 3: Generate nodes sequentially
      onProgress?.('generating', { message: 'Generating workflow nodes...' });
      const nodes = [];

      // Generate trigger
      const triggerConnector = connectorResult.data.selectedConnectors.find(
        (c: any) => c.usage === 'trigger',
      );

      if (triggerConnector) {
        const triggerNode = await this.generateTriggerNode(
          triggerConnector.name,
          intentResult.data.entities.trigger,
        );
        if (triggerNode) {
          nodes.push(triggerNode);
          this.logger.log(`✅ Generated trigger: ${triggerNode.name}`);
          onProgress?.('node_created', { node: triggerNode });
        }
      }

      // Generate actions
      const actionConnectors = connectorResult.data.selectedConnectors.filter(
        (c: any) => c.usage === 'action',
      );

      // Check if conditional logic is needed
      const requiresAI = intentResult.data.entities.requiresAI;
      const requiresBranching = intentResult.data.entities.requiresBranching ||
                               (intentResult.data.entities.conditions && intentResult.data.entities.conditions.length > 0);

      // STEP 3A: Generate OpenAI node first if AI analysis is needed
      if (requiresAI) {
        const openaiConnector = actionConnectors.find((c: any) => c.name === 'openai');
        if (openaiConnector) {
          const openaiNode = await this.generateActionNode(
            'openai',
            'Analyze text content using AI',
            nodes[nodes.length - 1],
          );
          if (openaiNode) {
            nodes.push(openaiNode);
            this.logger.log(`✅ Generated AI analysis: ${openaiNode.name}`);
            onProgress?.('node_created', { node: openaiNode });
          }
        }
      }

      // STEP 3B: Generate CONDITION node if branching is needed
      if (requiresBranching) {
        const conditionNode = await this.generateConditionNode(
          intentResult.data.entities.conditions[0] || 'Check condition',
          nodes[nodes.length - 1],
        );
        if (conditionNode) {
          nodes.push(conditionNode);
          this.logger.log(`✅ Generated condition: ${conditionNode.name}`);
          onProgress?.('node_created', { node: conditionNode });
        }
      }

      // STEP 3C: Generate remaining action nodes
      for (let i = 0; i < actionConnectors.length; i++) {
        const actionConnector = actionConnectors[i];

        // Skip OpenAI if already generated
        if (actionConnector.name === 'openai' && requiresAI) {
          continue;
        }

        const actionDescription = intentResult.data.entities.actions[i] || intentResult.data.entities.actions[0];

        const actionNode = await this.generateActionNode(
          actionConnector.name,
          actionDescription,
          nodes[nodes.length - 1], // Previous node for context
        );

        if (actionNode) {
          nodes.push(actionNode);
          this.logger.log(`✅ Generated action: ${actionNode.name}`);
          onProgress?.('node_created', { node: actionNode });
        }
      }

      // STEP 4: Create connections
      onProgress?.('connecting', { message: 'Connecting nodes...' });
      const connectionsResult = await this.agents.buildConnections(nodes);
      const connections = connectionsResult.data;

      this.logger.log(`🔗 Created ${connections.length} connections`);

      // STEP 5: Build complete workflow
      const workflow = {
        name: this.generateWorkflowName(intentResult.data),
        description: prompt,
        nodes: this.positionNodes(nodes),
        connections,
      };

      // STEP 5.5: Normalize node types (fix common AI mistakes)
      workflow.nodes = workflow.nodes.map((node: any) => this.normalizeNodeType(node));

      // STEP 6: Validate and fix
      onProgress?.('validating', { message: 'Validating workflow...' });
      const validationResult = await this.agents.validateAndFix(workflow);

      this.logger.log(`✅ Validation complete, confidence: ${validationResult.confidence}%`);

      // STEP 7: Auto-fill defaults
      validationResult.data.nodes = validationResult.data.nodes.map((node: any) =>
        this.connectorRegistry.fillDefaults(node),
      );

      // STEP 8: Calculate overall confidence
      const overallConfidence = Math.round(
        (intentResult.confidence +
          connectorResult.confidence +
          connectionsResult.confidence +
          validationResult.confidence) /
          4,
      );

      onProgress?.('complete', { workflow: validationResult.data });

      this.logger.log(`🎉 Workflow generation complete! Overall confidence: ${overallConfidence}%`);

      return {
        success: true,
        workflow: validationResult.data,
        confidence: overallConfidence,
        analysis: {
          intent: intentResult.data,
          connectors: connectorResult.data,
          reasoning: validationResult.reasoning,
          steps: [
            `Intent: ${intentResult.data.intent}`,
            `Connectors: ${selectedConnectors.join(', ')}`,
            `Nodes: ${nodes.length}`,
            `Connections: ${connections.length}`,
          ],
        },
      };
    } catch (error) {
      this.logger.error('Orchestrated generation failed:', error);
      return {
        success: false,
        error: error.message,
        confidence: 0,
      };
    }
  }

  private async generateTriggerNode(connectorName: string, triggerDescription: string) {
    const connector = this.connectorRegistry.getConnector(connectorName);
    if (!connector) {
      this.logger.error(`Connector not found: ${connectorName}`);
      return null;
    }

    // Find best trigger based on description
    const trigger = this.connectorRegistry.getBestTrigger(connectorName, triggerDescription);
    if (!trigger) {
      this.logger.error(`No trigger found for: ${connectorName}`);
      return null;
    }

    this.logger.log(`🎯 Selected trigger: ${trigger.id} for ${connectorName}`);

    const nodeResult = await this.agents.generateNode('trigger', {
      connector: connectorName,
      triggerId: trigger.id,
      description: triggerDescription,
    });

    return nodeResult.data;
  }

  private async generateActionNode(
    connectorName: string,
    actionDescription: string,
    previousNode: any,
  ) {
    const connector = this.connectorRegistry.getConnector(connectorName);
    if (!connector) {
      this.logger.error(`Connector not found: ${connectorName}`);
      return null;
    }

    // Find best action based on description
    const action = this.connectorRegistry.getBestAction(connectorName, actionDescription);
    if (!action) {
      this.logger.error(`No action found for: ${connectorName}`);
      return null;
    }

    this.logger.log(`🎯 Selected action: ${action.id} for ${connectorName}`);

    const nodeResult = await this.agents.generateNode('action', {
      connector: connectorName,
      actionId: action.id,
      description: actionDescription,
      previousNode,
    });

    return nodeResult.data;
  }

  private async generateConditionNode(
    conditionDescription: string,
    previousNode: any,
  ) {
    this.logger.log(`🎯 Generating CONDITION node for: ${conditionDescription}`);

    // The CONDITION node is a built-in node (type: 'CONDITION')
    // Generate node configuration using Agent 3
    const nodeResult = await this.agents.generateNode('condition', {
      description: conditionDescription,
      previousNode,
    });

    // If agent didn't generate it properly, create a basic CONDITION node
    if (!nodeResult.data) {
      const conditionId = `condition_${Date.now()}`;
      return {
        id: conditionId,
        name: 'Condition (IF)',
        type: 'CONDITION',
        config: {
          conditions: {
            combinator: 'and',
            conditions: [
              {
                leftValue: `{{${previousNode?.id}.data.result}}`,
                operator: {
                  type: 'string',
                  operation: 'contains'
                },
                rightValue: 'true'
              }
            ]
          }
        },
        position: { x: 0, y: 0 }
      };
    }

    return nodeResult.data;
  }

  private generateWorkflowName(intent: any): string {
    const templates = {
      send_email: 'Email Notification Workflow',
      data_sync: 'Data Synchronization Workflow',
      notification: 'Notification Workflow',
      data_transformation: 'Data Processing Workflow',
      conditional_logic: 'Conditional Workflow',
      scheduled_task: 'Scheduled Task Workflow',
    };

    return templates[intent.intent] || 'Automated Workflow';
  }

  private positionNodes(nodes: any[]): any[] {
    const spacing = 300;
    const baseY = 100;

    return nodes.map((node, index) => ({
      ...node,
      position: {
        x: 100 + index * spacing,
        y: baseY,
      },
    }));
  }

  /**
   * Normalize node type (fix common AI mistakes)
   * Converts: 'TRIGGER', 'trigger' → 'CONNECTOR_TRIGGER'
   * Converts: 'ACTION', 'action' → 'CONNECTOR_ACTION'
   * Removes: connector/actionId fields from built-in control nodes (CONDITION, SWITCH, etc.)
   */
  private normalizeNodeType(node: any): any {
    // Built-in control node types that should NOT have connector/actionId fields
    const builtinControlTypes = ['CONDITION', 'SWITCH', 'FILTER', 'LOOP', 'WAIT'];

    if (!node.type) {
      // If no type but has connector and triggerId, it's a trigger
      if (node.connector && node.triggerId) {
        this.logger.warn(`🔧 Auto-fixed: Node "${node.name}" missing type, set to CONNECTOR_TRIGGER`);
        return { ...node, type: 'CONNECTOR_TRIGGER' };
      }
      // If no type but has connector and actionId, it's an action
      if (node.connector && node.actionId) {
        this.logger.warn(`🔧 Auto-fixed: Node "${node.name}" missing type, set to CONNECTOR_ACTION`);
        return { ...node, type: 'CONNECTOR_ACTION' };
      }
    }

    // Fix built-in control nodes that accidentally have connector fields
    if (node.type && builtinControlTypes.includes(node.type.toUpperCase())) {
      const { connector, actionId, triggerId, ...cleanNode } = node;
      if (connector || actionId || triggerId) {
        this.logger.warn(`🔧 Auto-fixed: Removed connector/actionId from built-in control node "${node.name}"`);
        return cleanNode;
      }
    }

    // Normalize trigger types
    if (node.type && (node.type.toUpperCase() === 'TRIGGER' || node.type.toLowerCase() === 'trigger')) {
      this.logger.warn(`🔧 Auto-fixed: Node "${node.name}" type "${node.type}" → CONNECTOR_TRIGGER`);
      return { ...node, type: 'CONNECTOR_TRIGGER' };
    }

    // Normalize action types
    if (node.type && (node.type.toUpperCase() === 'ACTION' || node.type.toLowerCase() === 'action')) {
      this.logger.warn(`🔧 Auto-fixed: Node "${node.name}" type "${node.type}" → CONNECTOR_ACTION`);
      return { ...node, type: 'CONNECTOR_ACTION' };
    }

    return node;
  }

  /**
   * Validate complete workflow
   */
  validateWorkflow(workflow: any): { isValid: boolean; errors: string[] } {
    const errors = [];

    // Check for trigger
    const triggers = workflow.nodes.filter((n: any) => n.type?.includes('TRIGGER'));
    if (triggers.length === 0) {
      errors.push('Workflow must have at least one trigger');
    }
    if (triggers.length > 1) {
      errors.push('Workflow can only have one trigger');
    }

    // Check for actions
    const actions = workflow.nodes.filter((n: any) => n.type && !n.type.includes('TRIGGER'));
    if (actions.length === 0) {
      errors.push('Workflow must have at least one action');
    }

    // Check connections
    if (workflow.connections.length === 0) {
      errors.push('Workflow must have at least one connection');
    }

    // Check for disconnected nodes
    const connectedNodeIds = new Set([
      ...workflow.connections.map((c: any) => c.source),
      ...workflow.connections.map((c: any) => c.target),
    ]);

    workflow.nodes.forEach((node: any) => {
      if (node.type && !node.type.includes('TRIGGER') && !connectedNodeIds.has(node.id)) {
        errors.push(`Node "${node.name}" is not connected`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
