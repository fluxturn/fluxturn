import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlatformService } from '../../../database/platform.service';
import { DryRunResult, DryRunStepResult } from '../dto/dry-run.dto';
import { INode, IEdge, IWorkflowDefinition } from './workflow-execution.engine';

/**
 * Mock output generators keyed by node-type prefix or exact name.
 * Used to synthesise realistic-looking data without calling live APIs.
 */
const MOCK_OUTPUTS: Record<string, (node: INode, sampleInput: any) => any> = {
  // HTTP / Webhook nodes
  HTTP_REQUEST: () => ({ status: 200, body: 'mock' }),
  WEBHOOK_TRIGGER: (_n, sample) => ({ body: sample || {}, headers: {}, method: 'POST' }),
  FORM_TRIGGER: (_n, sample) => ({ formData: sample || { field1: 'value1' } }),

  // Transform / Code nodes
  TRANSFORM: (_n, sample) => sample ? { transformed: sample } : { transformed: {} },
  CODE: (_n, sample) => ({ result: sample || 'mock code output' }),
  FUNCTION: (_n, sample) => ({ result: sample || 'mock function output' }),

  // Condition / Router
  CONDITION: (_n, sample) => ({ conditionMet: true, branch: 'true', data: sample || {} }),
  IF: (_n, sample) => ({ conditionMet: true, branch: 'true', data: sample || {} }),
  SWITCH: () => ({ matchedCase: 'case_0', data: {} }),
  ROUTER: () => ({ route: 'default', data: {} }),

  // LLM / AI nodes
  LLM: () => ({ text: 'mock AI response' }),
  OPENAI: () => ({ text: 'mock AI response', model: 'gpt-4', usage: { tokens: 42 } }),
  ANTHROPIC: () => ({ text: 'mock AI response', model: 'claude', usage: { tokens: 42 } }),
  AI_AGENT: () => ({ text: 'mock AI agent response', toolCalls: [] }),

  // Communication
  TELEGRAM: () => ({ messageId: 12345, chat: { id: 1 }, ok: true }),
  TELEGRAM_TRIGGER: () => ({ message: { text: 'mock message', from: { id: 1, username: 'test' } } }),
  GMAIL: () => ({ id: 'msg-001', threadId: 'thread-001', labelIds: ['SENT'] }),
  GMAIL_TRIGGER: () => ({ id: 'msg-001', subject: 'Mock email', from: 'test@example.com' }),
  SLACK: () => ({ ok: true, channel: 'C01', ts: '1234567890.123456' }),
  SLACK_TRIGGER: () => ({ text: 'mock slack message', user: 'U01', channel: 'C01' }),
  DISCORD: () => ({ id: '123456', content: 'mock message sent' }),
  EMAIL: () => ({ messageId: '<mock@email.com>', accepted: ['test@example.com'] }),
  WHATSAPP: () => ({ messageId: 'wamid.mock', status: 'sent' }),
  TEAMS: () => ({ id: 'msg-mock', createdDateTime: new Date().toISOString() }),

  // Storage / Database
  GOOGLE_SHEETS: () => ({ updatedRange: 'Sheet1!A1:B2', updatedRows: 1 }),
  GOOGLE_SHEETS_TRIGGER: () => ({ row: { A: 'value1', B: 'value2' } }),
  GOOGLE_DRIVE: () => ({ id: 'file-001', name: 'mock-file.txt', mimeType: 'text/plain' }),
  GOOGLE_DRIVE_TRIGGER: () => ({ fileId: 'file-001', name: 'mock-file.txt', change: 'created' }),
  DATABASE: () => ({ rows: [{ id: 1, name: 'mock' }], rowCount: 1 }),
  REDIS: () => ({ value: 'mock-value', key: 'mock-key' }),
  MONGODB: () => ({ insertedId: 'mock-id', acknowledged: true }),
  AWS_S3: () => ({ key: 'mock-key', bucket: 'mock-bucket', etag: 'mock-etag' }),

  // CRM
  HUBSPOT: () => ({ id: '1', properties: { email: 'mock@example.com' } }),
  PIPEDRIVE: () => ({ id: 1, name: 'Mock Deal', status: 'open' }),
  SALESFORCE: () => ({ id: '001', success: true }),
  MONDAY: () => ({ id: '123', name: 'Mock item' }),

  // E-commerce
  STRIPE: () => ({ id: 'ch_mock', amount: 1000, currency: 'usd', status: 'succeeded' }),
  STRIPE_TRIGGER: () => ({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_mock' } } }),
  SHOPIFY: () => ({ id: 123, title: 'Mock Product' }),
  GUMROAD: () => ({ id: 'sale-mock', product_name: 'Mock Product', price: 999 }),

  // Project management
  JIRA: () => ({ id: '10001', key: 'MOCK-1', summary: 'Mock issue' }),
  JIRA_TRIGGER: () => ({ issue: { key: 'MOCK-1', fields: { summary: 'Mock issue' } } }),
  TRELLO: () => ({ id: 'card-mock', name: 'Mock card', idList: 'list-mock' }),
  ASANA: () => ({ gid: '12345', name: 'Mock task', completed: false }),
  GITHUB: () => ({ id: 1, title: 'Mock issue', state: 'open' }),
  GITHUB_TRIGGER: () => ({ action: 'opened', repository: { full_name: 'mock/repo' } }),
  GITLAB: () => ({ id: 1, title: 'Mock MR', state: 'opened' }),

  // Marketing
  MAILCHIMP: () => ({ id: 'member-mock', email_address: 'mock@example.com', status: 'subscribed' }),
  SENDGRID: () => ({ statusCode: 202, body: '' }),

  // Social
  TWITTER: () => ({ id: 'tweet-mock', text: 'Mock tweet' }),
  FACEBOOK: () => ({ id: 'post-mock', message: 'Mock post' }),
  INSTAGRAM: () => ({ id: 'media-mock', caption: 'Mock caption' }),
  PINTEREST: () => ({ id: 'pin-mock', title: 'Mock pin' }),

  // Scheduling
  SCHEDULE: () => ({ triggered: true, scheduledTime: new Date().toISOString() }),
  CRON: () => ({ triggered: true, cronExpression: '0 * * * *' }),
  WAIT: () => ({ resumed: true, waitedMs: 1000 }),
  DELAY: () => ({ resumed: true, delayMs: 1000 }),

  // Utility
  SET: (_n, sample) => sample || { key: 'value' },
  MERGE: () => ({ merged: true, items: [] }),
  SPLIT: () => ({ items: [[], []] }),
  FILTER: (_n, sample) => ({ filtered: sample || [], kept: 1, removed: 0 }),
  LOOP: () => ({ iteration: 0, items: [] }),
  ERROR_TRIGGER: () => ({ error: { message: 'mock error', node: 'mock-node' } }),
  NO_OP: () => ({}),
  NOTE: () => ({}),

  // Finance
  PLAID: () => ({ accounts: [{ id: 'acc-mock', name: 'Mock Account' }] }),
  WISE: () => ({ id: 'transfer-mock', status: 'completed' }),
  CHARGEBEE: () => ({ subscription: { id: 'sub-mock', status: 'active' } }),

  // Forms
  TYPEFORM: () => ({ response_id: 'resp-mock', answers: [] }),
  JOTFORM: () => ({ submissionID: 'sub-mock', answers: {} }),

  // Connector-based (generic)
  CONNECTOR_TRIGGER: () => ({ event: 'mock_event', data: {} }),
  CONNECTOR_ACTION: () => ({ success: true, data: {} }),

  // Calendar
  GOOGLE_CALENDAR: () => ({ id: 'event-mock', summary: 'Mock Event' }),
  GOOGLE_CALENDAR_TRIGGER: () => ({ id: 'event-mock', summary: 'Mock Event', start: {} }),

  // Support
  FRESHDESK: () => ({ id: 1, subject: 'Mock ticket', status: 2 }),

  // Productivity
  CLOCKIFY: () => ({ id: 'entry-mock', description: 'Mock time entry' }),
  TOGGL: () => ({ id: 12345, description: 'Mock time entry' }),
};

/**
 * DryRunService
 *
 * Traces workflow execution without calling external APIs.
 * For each node it validates configuration, checks credential
 * availability, and returns mock output based on the node type.
 */
@Injectable()
export class DryRunService {
  private readonly logger = new Logger(DryRunService.name);

  constructor(
    private readonly platformService: PlatformService,
  ) {}

  /**
   * Run a dry-run of the given workflow.
   *
   * @param workflowId  The ID of the persisted workflow
   * @param sampleInput Optional sample input fed into the first node
   */
  async dryRun(workflowId: string, sampleInput?: Record<string, any>): Promise<DryRunResult> {
    this.logger.log(`Starting dry-run for workflow ${workflowId}`);

    // 1. Load workflow definition
    const workflow = await this.loadWorkflow(workflowId);
    const canvas = workflow.workflow?.canvas || workflow.canvas;

    if (!canvas || !canvas.nodes || canvas.nodes.length === 0) {
      return {
        workflowId,
        steps: [],
        errors: ['Workflow has no nodes defined'],
        warnings: [],
        totalNodes: 0,
        executionOrder: [],
      };
    }

    const nodes: INode[] = canvas.nodes;
    const edges: IEdge[] = canvas.edges || [];

    // 2. Determine execution order (topological sort via BFS from trigger/start node)
    const executionOrder = this.getExecutionOrder(nodes, edges);

    // 3. Gather credential info for the project
    const projectId = workflow.project_id;
    const credentialMap = await this.getCredentialMap(projectId);

    // 4. Walk each node
    const steps: DryRunStepResult[] = [];
    const globalErrors: string[] = [];
    const globalWarnings: string[] = [];

    let previousOutput: any = sampleInput || {};

    for (const nodeId of executionOrder) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) {
        globalWarnings.push(`Node ${nodeId} referenced in edges but not found in nodes array`);
        continue;
      }

      const step = this.evaluateNode(node, previousOutput, credentialMap);
      steps.push(step);

      if (step.errors && step.errors.length > 0) {
        globalErrors.push(...step.errors.map(e => `[${step.nodeName || step.nodeId}] ${e}`));
      }
      if (step.warnings && step.warnings.length > 0) {
        globalWarnings.push(...step.warnings.map(w => `[${step.nodeName || step.nodeId}] ${w}`));
      }

      // Feed mock output forward
      previousOutput = step.mockOutput;
    }

    this.logger.log(
      `Dry-run complete for workflow ${workflowId}: ${steps.length} steps, ${globalErrors.length} errors, ${globalWarnings.length} warnings`,
    );

    return {
      workflowId,
      steps,
      errors: globalErrors,
      warnings: globalWarnings,
      totalNodes: nodes.length,
      executionOrder,
    };
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private async loadWorkflow(workflowId: string): Promise<any> {
    const result = await this.platformService.query(
      'SELECT * FROM workflows WHERE id = $1',
      [workflowId],
    );

    if (!result.rows || result.rows.length === 0) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    return result.rows[0];
  }

  /**
   * Build a map of connector_type -> boolean indicating whether credentials
   * are available for this project.
   */
  private async getCredentialMap(projectId?: string): Promise<Record<string, boolean>> {
    if (!projectId) return {};

    try {
      const result = await this.platformService.query(
        `SELECT connector_type, is_active FROM connector_configs WHERE project_id = $1`,
        [projectId],
      );
      const map: Record<string, boolean> = {};
      for (const row of result.rows || []) {
        map[row.connector_type] = row.is_active !== false;
      }
      return map;
    } catch {
      return {};
    }
  }

  /**
   * Topological BFS from root node(s) following edge direction.
   */
  private getExecutionOrder(nodes: INode[], edges: IEdge[]): string[] {
    const adjacency: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    for (const node of nodes) {
      adjacency[node.id] = [];
      inDegree[node.id] = 0;
    }

    for (const edge of edges) {
      if (adjacency[edge.source]) {
        adjacency[edge.source].push(edge.target);
      }
      if (inDegree[edge.target] !== undefined) {
        inDegree[edge.target]++;
      }
    }

    // Start from nodes with 0 in-degree (triggers / start nodes)
    const queue: string[] = [];
    for (const node of nodes) {
      if (inDegree[node.id] === 0) {
        queue.push(node.id);
      }
    }

    const order: string[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      order.push(current);

      for (const next of adjacency[current] || []) {
        inDegree[next]--;
        if (inDegree[next] <= 0 && !visited.has(next)) {
          queue.push(next);
        }
      }
    }

    // Include any disconnected nodes not yet visited
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        order.push(node.id);
      }
    }

    return order;
  }

  /**
   * Evaluate a single node: validate config, check creds, produce mock output.
   */
  private evaluateNode(
    node: INode,
    sampleInput: any,
    credentialMap: Record<string, boolean>,
  ): DryRunStepResult {
    const nodeType = node.type || 'UNKNOWN';
    const nodeName = node.data?.label || node.data?.name || nodeType;
    const errors: string[] = [];
    const warnings: string[] = [];

    // --- Config validation ---
    const configValid = this.validateNodeConfig(node, errors, warnings);

    // --- Credential check ---
    const credentialsAvailable = this.checkCredentials(node, credentialMap, warnings);

    // --- Determine what would happen ---
    const wouldExecute = this.describeExecution(node);

    // --- Generate mock output ---
    const mockOutput = this.generateMockOutput(node, sampleInput);

    return {
      nodeId: node.id,
      nodeName,
      nodeType,
      configValid,
      credentialsAvailable,
      wouldExecute,
      mockOutput,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private validateNodeConfig(node: INode, errors: string[], warnings: string[]): boolean {
    const data = node.data || {};
    const nodeType = node.type || '';
    let valid = true;

    // Check for completely empty configuration
    const hasAnyConfig = Object.keys(data).some(
      k => !['label', 'name', 'icon', 'color', 'description'].includes(k) && data[k] != null,
    );

    if (!hasAnyConfig) {
      warnings.push('Node has no configuration set');
    }

    // Type-specific checks
    if (nodeType.includes('HTTP') && !data.url) {
      errors.push('HTTP node missing required "url" field');
      valid = false;
    }

    if (nodeType.includes('EMAIL') || nodeType.includes('GMAIL')) {
      if (data.action === 'send_email' || data.actionId === 'send_email') {
        if (!data.to && !data.config?.to) {
          warnings.push('Email node has no "to" address configured');
        }
      }
    }

    if (nodeType.includes('TELEGRAM')) {
      if (
        (data.action === 'send_message' || data.actionId === 'send_message') &&
        !data.chatId &&
        !data.config?.chatId
      ) {
        warnings.push('Telegram node has no "chatId" configured');
      }
    }

    if (nodeType === 'CONDITION' || nodeType === 'IF') {
      if (!data.conditions && !data.config?.conditions) {
        warnings.push('Condition node has no conditions defined');
      }
    }

    if (nodeType === 'CODE' || nodeType === 'FUNCTION') {
      if (!data.code && !data.config?.code) {
        errors.push('Code node has no code defined');
        valid = false;
      }
    }

    if (nodeType === 'SCHEDULE' || nodeType === 'CRON') {
      if (!data.cronExpression && !data.config?.cronExpression && !data.interval && !data.config?.interval) {
        warnings.push('Schedule node has no cron expression or interval set');
      }
    }

    return valid;
  }

  private checkCredentials(
    node: INode,
    credentialMap: Record<string, boolean>,
    warnings: string[],
  ): boolean {
    const nodeType = node.type || '';
    const connectorType = node.data?.connectorType || node.data?.connector_type;

    // Utility / logic nodes don't need credentials
    const noCredNeeded = [
      'CONDITION', 'IF', 'SWITCH', 'ROUTER', 'SET', 'MERGE', 'SPLIT',
      'FILTER', 'LOOP', 'CODE', 'FUNCTION', 'TRANSFORM', 'WAIT', 'DELAY',
      'NOTE', 'NO_OP', 'ERROR_TRIGGER', 'SCHEDULE', 'CRON',
      'WEBHOOK_TRIGGER', 'FORM_TRIGGER',
    ];

    if (noCredNeeded.some(t => nodeType.includes(t))) {
      return true;
    }

    // If the node references a specific connector config id, assume it's fine
    if (node.data?.connectorConfigId || node.data?.connector_config_id) {
      return true;
    }

    // Try to match by connector type
    const typeKey = connectorType || nodeType.replace(/_TRIGGER$/, '').replace(/_ACTION$/, '').toLowerCase();

    if (typeKey && credentialMap[typeKey] !== undefined) {
      if (!credentialMap[typeKey]) {
        warnings.push(`Credentials for "${typeKey}" exist but are inactive`);
        return false;
      }
      return true;
    }

    // Could not determine — warn
    if (typeKey && !noCredNeeded.some(t => nodeType.includes(t))) {
      warnings.push(`Could not verify credentials for connector "${typeKey}"`);
    }

    return false;
  }

  private describeExecution(node: INode): string {
    const nodeType = node.type || 'UNKNOWN';
    const action = node.data?.action || node.data?.actionId || '';
    const connectorType = node.data?.connectorType || '';

    if (nodeType.includes('TRIGGER')) {
      return `Would listen for incoming ${connectorType || nodeType.replace('_TRIGGER', '')} events`;
    }

    if (nodeType === 'HTTP_REQUEST') {
      const method = node.data?.method || node.data?.config?.method || 'GET';
      const url = node.data?.url || node.data?.config?.url || '<not set>';
      return `Would make ${method} request to ${url}`;
    }

    if (nodeType === 'CODE' || nodeType === 'FUNCTION') {
      return 'Would execute custom code/function';
    }

    if (nodeType === 'CONDITION' || nodeType === 'IF') {
      return 'Would evaluate condition and branch';
    }

    if (nodeType === 'SWITCH' || nodeType === 'ROUTER') {
      return 'Would route to matching case';
    }

    if (nodeType === 'TRANSFORM') {
      return 'Would transform data';
    }

    if (nodeType === 'WAIT' || nodeType === 'DELAY') {
      return 'Would pause execution';
    }

    if (nodeType === 'SCHEDULE' || nodeType === 'CRON') {
      return 'Would run on schedule';
    }

    if (action) {
      return `Would execute "${action}" on ${connectorType || nodeType}`;
    }

    return `Would execute ${connectorType || nodeType} node`;
  }

  private generateMockOutput(node: INode, sampleInput: any): any {
    const nodeType = node.type || 'UNKNOWN';

    // Try exact match first
    const generator = MOCK_OUTPUTS[nodeType];
    if (generator) {
      return generator(node, sampleInput);
    }

    // Try prefix match (e.g. GOOGLE_SHEETS_TRIGGER matches GOOGLE_SHEETS)
    for (const [key, gen] of Object.entries(MOCK_OUTPUTS)) {
      if (nodeType.startsWith(key)) {
        return gen(node, sampleInput);
      }
    }

    // Fallback: generic mock
    return { success: true, data: sampleInput || {} };
  }
}
