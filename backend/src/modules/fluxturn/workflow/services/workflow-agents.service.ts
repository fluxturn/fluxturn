import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectorRegistryService } from '../../connectors/connector-registry.service';
import { getAllBuiltinNodes, getBuiltinNode } from '../constants/builtin-nodes';
import OpenAI from 'openai';

interface AgentResult {
  success: boolean;
  data?: any;
  confidence: number;
  reasoning?: string;
}

@Injectable()
export class WorkflowAgentsService {
  private readonly logger = new Logger(WorkflowAgentsService.name);
  private openai: OpenAI;

  constructor(
    private readonly connectorRegistry: ConnectorRegistryService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('✅ Workflow Agents initialized with OpenAI');
    } else {
      this.logger.warn('⚠️ OpenAI API key not found');
    }
  }

  /**
   * AGENT 1: Intent Detection & Planning
   * Analyzes user prompt and creates execution plan
   */
  async detectIntentAndPlan(prompt: string): Promise<AgentResult> {
    const systemPrompt = `You are an intent detection specialist for workflow automation. Analyze the user's request.

CRITICAL: Detect conditional logic patterns:
- Keywords: "check", "if", "verify", "analyze", "determine", "see if", "find out", "validate"
- Phrases: "if it is", "check whether", "see if it's", "analyze if", "determine whether"
- Conditional actions: "if X then do Y", "only if", "when X do Y", "depending on"
- Text analysis needs: "check if job-related", "see if spam", "determine category", "classify"

When user needs to CHECK/ANALYZE/CLASSIFY text content:
- Set intent to "conditional_logic"
- Include AI connector (openai/anthropic) in required connectors
- Include IF condition node in actions list

OUTPUT VALID JSON (no markdown, no code blocks):
{
  "intent": "send_email" | "data_sync" | "notification" | "data_transformation" | "conditional_logic" | "scheduled_task",
  "entities": {
    "trigger": "what starts the workflow",
    "actions": ["what actions to perform - include 'AI analysis' if text checking needed, 'IF condition' if branching needed"],
    "conditions": ["any if/else logic - be specific about what to check"],
    "dataFlow": "how data moves between steps",
    "requiresAI": true/false,
    "requiresBranching": true/false
  },
  "plan": [
    "Step 1: Setup trigger...",
    "Step 2: AI analysis if needed...",
    "Step 3: IF condition for branching...",
    "Step 4: Execute actions based on condition..."
  ],
  "estimatedComplexity": "simple" | "medium" | "complex",
  "confidence": 90
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this workflow request: "${prompt}"` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        data: result,
        confidence: result.confidence || 80,
        reasoning: result.plan?.join(' → '),
      };
    } catch (error) {
      this.logger.error('Intent detection failed:', error);
      return {
        success: false,
        confidence: 0,
        data: null,
      };
    }
  }

  /**
   * AGENT 2: Connector Selector
   * Chooses best connectors for the task
   */
  async selectConnectors(
    intent: any,
    availableConnectors: string[],
  ): Promise<AgentResult> {
    const allConnectors = this.connectorRegistry.getConnectorsByNames(availableConnectors);

    const connectorSummaries = allConnectors.map(c => ({
      name: c.name,
      displayName: c.display_name,
      category: c.category,
      capabilities: {
        triggers: c.supported_triggers?.map((t: any) => t.id) || [],
        actions: c.supported_actions?.map((a: any) => a.id) || [],
      },
    }));

    // Add built-in control nodes information
    const builtinNodes = getAllBuiltinNodes();
    const builtinControlNodes = builtinNodes.filter(n =>
      ['CONDITION', 'SWITCH', 'FILTER', 'LOOP', 'WAIT'].includes(n.type)
    ).map(n => ({
      name: n.type,
      displayName: n.name,
      category: 'control',
      description: n.description,
      type: n.type,
    }));

    const systemPrompt = `You are a connector selection expert. Choose the BEST connectors for this workflow.

AVAILABLE CONNECTORS:
${JSON.stringify(connectorSummaries, null, 2)}

BUILT-IN CONTROL NODES (do NOT add to selectedConnectors, they will be added automatically):
${JSON.stringify(builtinControlNodes, null, 2)}

USER INTENT:
${JSON.stringify(intent, null, 2)}

CRITICAL RULES:
1. If intent.entities.requiresAI is true OR actions mention "AI analysis", "check if", "classify", "analyze text":
   - ALWAYS include "openai" connector with usage "action"
   - Add reason: "Needed for AI-powered text analysis and classification"

2. If intent.entities.requiresBranching is true OR conditions array has items:
   - DO NOT add CONDITION/IF to selectedConnectors
   - Built-in CONDITION node will be added automatically
   - Just select the action connectors needed for BOTH branches (true and false)

3. For conditional workflows, typical flow is:
   - Trigger connector
   - OpenAI for analysis (if text checking needed)
   - CONDITION node (added automatically)
   - Action connectors for BOTH true/false branches

4. IMPORTANT: For conditional workflows, include action connectors for BOTH branches!
   Example: If user wants "send to Telegram IF job-related, add to Google Sheets"
   Include BOTH: telegram (for true branch) AND google_sheets (for false branch OR both branches)

OUTPUT VALID JSON (no markdown):
{
  "selectedConnectors": [
    {
      "name": "gmail",
      "reason": "Needed for email trigger",
      "usage": "trigger"
    },
    {
      "name": "openai",
      "reason": "Needed for AI-powered text analysis to check if job-related",
      "usage": "action"
    },
    {
      "name": "telegram",
      "reason": "Send notifications when condition is true",
      "usage": "action"
    },
    {
      "name": "google_sheets",
      "reason": "Store data when condition is true",
      "usage": "action"
    }
  ],
  "confidence": 95
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Select best connectors' },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const result = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        data: result,
        confidence: result.confidence || 85,
      };
    } catch (error) {
      this.logger.error('Connector selection failed:', error);
      return {
        success: false,
        confidence: 0,
        data: { selectedConnectors: [] },
      };
    }
  }

  /**
   * AGENT 3: Node Generator
   * Generates individual nodes with complete configuration
   */
  async generateNode(
    nodeType: 'trigger' | 'action' | 'condition' | 'transform',
    context: {
      connector?: string;
      actionId?: string;
      triggerId?: string;
      description: string;
      previousNode?: any;
    },
  ): Promise<AgentResult> {
    let schema: any = null;
    let documentation = '';

    // Handle CONDITION (IF) node generation
    if (nodeType === 'condition') {
      const conditionNode = getBuiltinNode('CONDITION');
      documentation = `CONDITION (IF) Built-in Control Node:
${JSON.stringify(conditionNode, null, 2)}

CRITICAL: This is the "If" node from the Control tab in the UI.
Type MUST be: "CONDITION"
This node branches workflow into two paths: true and false

Example config for checking if text contains "job":
{
  "conditions": {
    "combinator": "and",
    "conditions": [
      {
        "leftValue": "{{${context.previousNode?.id}.data.content}}",
        "operator": {
          "type": "string",
          "operation": "contains"
        },
        "rightValue": "job"
      }
    ]
  },
  "ignoreCase": true
}

Outputs:
- Port "true": When ALL conditions match (with combinator "and") or ANY condition matches (with combinator "or")
- Port "false": When conditions don't match
`;
    }
    // Get specific schema for the node
    else if (context.connector && context.actionId) {
      const action = this.connectorRegistry.getAction(context.connector, context.actionId);
      schema = action?.inputSchema;
      documentation = JSON.stringify(action, null, 2);
    } else if (context.connector && context.triggerId) {
      const trigger = this.connectorRegistry.getTrigger(context.connector, context.triggerId);
      schema = trigger?.inputSchema;
      documentation = JSON.stringify(trigger, null, 2);
    }

    const systemPrompt = `You are a node configuration expert. Generate a COMPLETE node with ALL fields filled.

NODE SCHEMA:
${documentation}

${context.previousNode ? `PREVIOUS NODE OUTPUT (for expressions):
${JSON.stringify(context.previousNode, null, 2)}` : ''}

CRITICAL RULES:
1. Fill ALL required fields with realistic values
2. Use default values from schema when available
3. For dynamic data from previous nodes, use expressions: {{nodeId.data.fieldName}}
4. For placeholders, use realistic examples that match field type
5. Node IDs must be unique and descriptive (e.g., "trigger_gmail", "condition_check_job", "action_send_telegram")
6. For CONDITION nodes:
   - type MUST be "CONDITION" (not "IF" or "CONDITION_NODE")
   - DO NOT add "connector" field - CONDITION nodes have NO connector!
   - DO NOT add "actionId" field - CONDITION nodes are built-in control nodes
7. For CONNECTOR_ACTION/CONNECTOR_TRIGGER nodes: these MUST have "connector" and "actionId"/"triggerId" fields

OUTPUT VALID JSON (no markdown):

Example for connector action:
{
  "node": {
    "id": "action_send_telegram_1",
    "name": "Send Telegram Message",
    "type": "CONNECTOR_ACTION",
    "connector": "telegram",
    "actionId": "send_message",
    "config": {
      "chatId": "123456789",
      "text": "{{trigger_gmail.data.subject}}: {{trigger_gmail.data.text}}"
    },
    "position": { "x": 0, "y": 0 }
  },
  "reasoning": "Why these values were chosen",
  "confidence": 95
}

Example for CONDITION node:
{
  "node": {
    "id": "condition_check_job_related",
    "name": "Check if Job-Related",
    "type": "CONDITION",
    "config": {
      "conditions": {
        "combinator": "and",
        "conditions": [
          {
            "leftValue": "{{openai_analysis.data.result}}",
            "operator": {
              "type": "string",
              "operation": "contains"
            },
            "rightValue": "job"
          }
        ]
      },
      "ignoreCase": true
    },
    "position": { "x": 0, "y": 0 }
  },
  "reasoning": "Checking OpenAI analysis result for job-related content",
  "confidence": 95
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate node: ${context.description}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const result = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        data: result.node,
        confidence: result.confidence || 90,
        reasoning: result.reasoning,
      };
    } catch (error) {
      this.logger.error('Node generation failed:', error);
      return {
        success: false,
        confidence: 0,
        data: null,
      };
    }
  }

  /**
   * AGENT 4: Connection Builder
   * Creates valid connections between nodes
   */
  async buildConnections(nodes: any[]): Promise<AgentResult> {
    const systemPrompt = `You are a workflow connection expert. Create logical connections between nodes.

RULES:
1. Trigger connects to first action via "main" port
2. Actions connect sequentially
3. IF nodes have "true" and "false" ports for branches
4. All action nodes must be connected
5. No circular connections
6. sourcePort/targetPort must be "main" unless it's an IF node

NODES:
${JSON.stringify(nodes, null, 2)}

OUTPUT VALID JSON (no markdown):
{
  "connections": [
    {
      "source": "trigger_gmail",
      "sourcePort": "main",
      "target": "action_send_telegram",
      "targetPort": "main"
    }
  ],
  "confidence": 95
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Create connections' },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const result = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        data: result.connections,
        confidence: result.confidence || 90,
      };
    } catch (error) {
      this.logger.error('Connection building failed:', error);
      return {
        success: false,
        confidence: 0,
        data: [],
      };
    }
  }

  /**
   * AGENT 5: Workflow Validator & Fixer
   * Validates workflow and auto-fixes issues
   */
  async validateAndFix(workflow: any): Promise<AgentResult> {
    const issues = this.detectIssues(workflow);

    if (issues.length === 0) {
      return {
        success: true,
        data: workflow,
        confidence: 100,
      };
    }

    const systemPrompt = `You are a workflow debugging expert. Fix these issues:

WORKFLOW:
${JSON.stringify(workflow, null, 2)}

ISSUES FOUND:
${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

FIX ALL ISSUES. OUTPUT VALID JSON (no markdown):
{
  "fixedWorkflow": {
    "name": "workflow name",
    "nodes": [...],
    "connections": [...]
  },
  "fixesApplied": [
    "Fixed missing field X by adding default value Y",
    "Connected disconnected node Z"
  ],
  "confidence": 95
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Fix the workflow' },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const result = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        data: result.fixedWorkflow,
        confidence: result.confidence || 85,
        reasoning: result.fixesApplied?.join('; '),
      };
    } catch (error) {
      this.logger.error('Validation and fix failed:', error);
      return {
        success: true,
        data: workflow,
        confidence: 50,
      };
    }
  }

  private detectIssues(workflow: any): string[] {
    const issues = [];

    // Check for missing fields
    workflow.nodes?.forEach((node: any) => {
      const validation = this.connectorRegistry.validateNode(node);
      if (!validation.isValid) {
        issues.push(...validation.errors.map(e => `${node.name}: ${e}`));
      }
    });

    // Check for disconnected nodes
    const connectedNodeIds = new Set([
      ...(workflow.connections?.map((c: any) => c.source) || []),
      ...(workflow.connections?.map((c: any) => c.target) || []),
    ]);

    workflow.nodes?.forEach((node: any) => {
      if (!node.type?.includes('TRIGGER') && !connectedNodeIds.has(node.id)) {
        issues.push(`Node "${node.name}" is not connected`);
      }
    });

    // Check for missing trigger
    const hasTrigger = workflow.nodes?.some((n: any) => n.type?.includes('TRIGGER'));
    if (!hasTrigger) {
      issues.push('Workflow must have a trigger node');
    }

    return issues;
  }
}
