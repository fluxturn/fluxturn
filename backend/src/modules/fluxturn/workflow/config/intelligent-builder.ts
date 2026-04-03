/**
 * Intelligent Workflow Builder
 * Dynamically constructs workflows based on detected patterns, conditions, and actions
 */

import { 
  WorkflowStep, 
  WorkflowTrigger,
  WorkflowCondition,
  WorkflowDefinition,
  ExecutionContext
} from './types';

// ============================================
// PATTERN DETECTION ENGINE
// ============================================

export interface DetectedPattern {
  type: 'trigger' | 'condition' | 'action' | 'transform' | 'output';
  category: string;
  value: string;
  confidence: number;
  parameters?: Record<string, any>;
  connector?: string;
}

export interface WorkflowIntent {
  triggers: DetectedPattern[];
  conditions: DetectedPattern[];
  actions: DetectedPattern[];
  transforms: DetectedPattern[];
  outputs: DetectedPattern[];
  dataFlow: DataFlowPattern[];
  timing: TimingPattern[];
  error_handling: ErrorPattern[];
}

export interface DataFlowPattern {
  source: string;
  target: string;
  transformation?: string;
  condition?: string;
}

export interface TimingPattern {
  type: 'schedule' | 'delay' | 'timeout' | 'retry';
  value: string | number;
  unit?: string;
}

export interface ErrorPattern {
  type: 'retry' | 'fallback' | 'alert' | 'skip';
  condition?: string;
  action?: string;
}

// ============================================
// CONNECTOR CAPABILITIES
// ============================================

export const CONNECTOR_CAPABILITIES = {
  // Communication
  'gmail': {
    triggers: ['email_received', 'email_labeled', 'email_starred'],
    actions: ['send_email', 'reply_email', 'forward_email', 'label_email', 'archive_email'],
    conditions: ['has_attachment', 'from_sender', 'subject_contains', 'body_contains'],
    data: ['email_content', 'sender_info', 'attachments', 'metadata']
  },
  'slack': {
    triggers: ['message_received', 'channel_joined', 'reaction_added', 'file_shared'],
    actions: ['send_message', 'create_channel', 'upload_file', 'add_reaction', 'pin_message'],
    conditions: ['in_channel', 'from_user', 'message_contains', 'has_mention'],
    data: ['message_text', 'user_info', 'channel_info', 'thread_id']
  },
  'teams': {
    triggers: ['message_received', 'meeting_started', 'file_uploaded'],
    actions: ['send_message', 'schedule_meeting', 'create_team', 'share_file'],
    conditions: ['in_team', 'in_channel', 'from_user'],
    data: ['message_content', 'team_info', 'meeting_details']
  },
  
  // CRM
  'hubspot': {
    triggers: ['contact_created', 'deal_updated', 'ticket_opened', 'form_submitted'],
    actions: ['create_contact', 'update_deal', 'assign_ticket', 'send_email', 'create_task'],
    conditions: ['deal_stage', 'contact_property', 'ticket_priority'],
    data: ['contact_info', 'deal_value', 'ticket_details', 'form_data']
  },
  'salesforce': {
    triggers: ['lead_created', 'opportunity_won', 'case_escalated'],
    actions: ['convert_lead', 'update_opportunity', 'assign_case', 'create_task'],
    conditions: ['lead_score', 'opportunity_stage', 'case_priority'],
    data: ['lead_info', 'opportunity_details', 'case_history']
  },
  
  // E-commerce
  'shopify': {
    triggers: ['order_created', 'product_updated', 'customer_registered', 'payment_received'],
    actions: ['fulfill_order', 'update_inventory', 'send_notification', 'apply_discount'],
    conditions: ['order_total', 'product_stock', 'customer_tier'],
    data: ['order_details', 'product_info', 'customer_data', 'payment_info']
  },
  'stripe': {
    triggers: ['payment_succeeded', 'payment_failed', 'subscription_created', 'invoice_paid'],
    actions: ['charge_card', 'refund_payment', 'update_subscription', 'send_invoice'],
    conditions: ['payment_amount', 'subscription_status', 'card_type'],
    data: ['payment_details', 'customer_info', 'subscription_data']
  },
  
  // Project Management
  'jira': {
    triggers: ['issue_created', 'issue_updated', 'sprint_started', 'comment_added'],
    actions: ['create_issue', 'update_status', 'assign_issue', 'add_comment', 'log_time'],
    conditions: ['issue_type', 'priority', 'assignee', 'sprint_status'],
    data: ['issue_details', 'sprint_info', 'user_info', 'workflow_status']
  },
  'asana': {
    triggers: ['task_created', 'task_completed', 'project_updated'],
    actions: ['create_task', 'assign_task', 'update_project', 'add_comment'],
    conditions: ['task_status', 'due_date', 'project_phase'],
    data: ['task_info', 'project_details', 'team_members']
  },
  
  // Storage
  'google-drive': {
    triggers: ['file_created', 'file_modified', 'file_shared'],
    actions: ['upload_file', 'create_folder', 'share_file', 'move_file'],
    conditions: ['file_type', 'file_size', 'folder_location'],
    data: ['file_content', 'file_metadata', 'sharing_permissions']
  },
  'aws-s3': {
    triggers: ['object_created', 'object_deleted'],
    actions: ['upload_object', 'delete_object', 'copy_object', 'set_permissions'],
    conditions: ['bucket_name', 'object_size', 'object_type'],
    data: ['object_data', 'bucket_info', 'metadata']
  },
  
  // AI
  'openai': {
    actions: ['generate_text', 'analyze_sentiment', 'summarize', 'translate', 'classify'],
    conditions: ['token_limit', 'temperature', 'model_type'],
    data: ['prompt', 'completion', 'embeddings']
  },
  'anthropic': {
    actions: ['generate_response', 'analyze_document', 'code_review', 'explain_concept'],
    conditions: ['max_tokens', 'temperature'],
    data: ['prompt', 'response', 'usage']
  }
};

// ============================================
// ACTION PATTERNS
// ============================================

export const ACTION_PATTERNS = {
  // Data Operations
  'fetch': ['get', 'retrieve', 'fetch', 'pull', 'download', 'read', 'load', 'import'],
  'create': ['create', 'add', 'new', 'generate', 'make', 'build', 'construct'],
  'update': ['update', 'modify', 'change', 'edit', 'patch', 'revise', 'alter'],
  'delete': ['delete', 'remove', 'destroy', 'erase', 'clear', 'purge'],
  
  // Communication
  'send': ['send', 'email', 'notify', 'message', 'alert', 'inform', 'broadcast'],
  'reply': ['reply', 'respond', 'answer', 'acknowledge'],
  'forward': ['forward', 'share', 'distribute', 'propagate'],
  
  // Processing
  'analyze': ['analyze', 'examine', 'inspect', 'evaluate', 'assess', 'review'],
  'transform': ['transform', 'convert', 'format', 'parse', 'serialize'],
  'filter': ['filter', 'select', 'exclude', 'include', 'match'],
  'aggregate': ['sum', 'count', 'average', 'group', 'combine', 'merge'],
  
  // Workflow Control
  'approve': ['approve', 'authorize', 'confirm', 'validate', 'verify'],
  'reject': ['reject', 'deny', 'decline', 'refuse'],
  'escalate': ['escalate', 'promote', 'upgrade', 'raise'],
  'assign': ['assign', 'allocate', 'delegate', 'transfer']
};

// ============================================
// CONDITION PATTERNS
// ============================================

export const CONDITION_PATTERNS = {
  // Comparisons
  'equals': ['is', 'equals', 'matches', 'same as'],
  'contains': ['contains', 'includes', 'has', 'with'],
  'greater': ['greater than', 'more than', 'above', 'exceeds', 'over'],
  'less': ['less than', 'below', 'under', 'smaller'],
  'between': ['between', 'within', 'range', 'from...to'],
  
  // Logical
  'and': ['and', 'also', 'both', 'as well as', 'together with'],
  'or': ['or', 'either', 'alternatively'],
  'not': ['not', 'except', 'excluding', 'without', 'unless'],
  
  // Temporal
  'before': ['before', 'prior to', 'earlier than'],
  'after': ['after', 'following', 'later than', 'once'],
  'during': ['during', 'while', 'throughout'],
  'every': ['every', 'each', 'all', 'daily', 'weekly', 'monthly']
};

// ============================================
// TRIGGER PATTERNS
// ============================================

export const TRIGGER_PATTERNS = {
  'schedule': {
    patterns: ['every', 'daily', 'weekly', 'monthly', 'at', 'cron', 'scheduled'],
    extract: (text: string) => {
      // Extract schedule patterns
      const scheduleMatch = text.match(/every\s+(\d+)?\s*(minute|hour|day|week|month)s?/i);
      if (scheduleMatch) {
        return {
          type: 'schedule',
          interval: parseInt(scheduleMatch[1] || '1'),
          unit: scheduleMatch[2]
        };
      }
      const timeMatch = text.match(/at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
      if (timeMatch) {
        return {
          type: 'schedule',
          time: timeMatch[0]
        };
      }
      return null;
    }
  },
  'webhook': {
    patterns: ['webhook', 'api call', 'http request', 'endpoint'],
    extract: (text: string) => ({
      type: 'webhook',
      method: text.includes('post') ? 'POST' : 'GET'
    })
  },
  'event': {
    patterns: ['when', 'if', 'on', 'once', 'after', 'upon'],
    extract: (text: string) => {
      // Extract event-based triggers
      const eventMatch = text.match(/when\s+(.+?)\s+(happens|occurs|is|gets)/i);
      if (eventMatch) {
        return {
          type: 'event',
          condition: eventMatch[1]
        };
      }
      return null;
    }
  },
  'data_change': {
    patterns: ['new', 'created', 'updated', 'deleted', 'changed', 'modified'],
    extract: (text: string) => ({
      type: 'data_change',
      operation: 'detect'
    })
  }
};

// ============================================
// INTELLIGENT WORKFLOW BUILDER
// ============================================

export class IntelligentWorkflowBuilder {
  private connectorCapabilities = CONNECTOR_CAPABILITIES;
  private availableConnectors: string[];

  constructor(availableConnectors: string[]) {
    this.availableConnectors = availableConnectors;
  }

  /**
   * Build workflow from natural language prompt
   */
  buildWorkflow(prompt: string, context?: ExecutionContext): WorkflowDefinition {
    // Step 1: Detect all patterns
    const intent = this.detectIntent(prompt);
    
    // Step 2: Map patterns to connectors
    const connectorMapping = this.mapToConnectors(intent);
    
    // Step 3: Build workflow steps
    const steps = this.buildSteps(intent, connectorMapping);
    
    // Step 4: Add conditions and control flow
    const workflow = this.addControlFlow(steps, intent);
    
    // Step 5: Optimize and validate
    return this.optimizeWorkflow(workflow, context);
  }

  /**
   * Detect intent from prompt
   */
  private detectIntent(prompt: string): WorkflowIntent {
    const lowerPrompt = prompt.toLowerCase();
    const intent: WorkflowIntent = {
      triggers: [],
      conditions: [],
      actions: [],
      transforms: [],
      outputs: [],
      dataFlow: [],
      timing: [],
      error_handling: []
    };

    // Detect triggers
    for (const [triggerType, config] of Object.entries(TRIGGER_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (lowerPrompt.includes(pattern)) {
          const extracted = config.extract(lowerPrompt);
          if (extracted) {
            intent.triggers.push({
              type: 'trigger',
              category: triggerType,
              value: pattern,
              confidence: 0.8,
              parameters: extracted
            });
          }
        }
      }
    }

    // Detect actions
    for (const [actionType, patterns] of Object.entries(ACTION_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerPrompt.includes(pattern)) {
          intent.actions.push({
            type: 'action',
            category: actionType,
            value: pattern,
            confidence: 0.7
          });
        }
      }
    }

    // Detect conditions
    for (const [conditionType, patterns] of Object.entries(CONDITION_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerPrompt.includes(pattern)) {
          intent.conditions.push({
            type: 'condition',
            category: conditionType,
            value: pattern,
            confidence: 0.7
          });
        }
      }
    }

    // Detect data flow
    const dataFlowPatterns = [
      /from\s+(\w+)\s+to\s+(\w+)/gi,
      /(\w+)\s+→\s+(\w+)/gi,
      /get\s+(\w+)\s+and\s+\w+\s+to\s+(\w+)/gi
    ];
    
    for (const pattern of dataFlowPatterns) {
      const matches = [...lowerPrompt.matchAll(pattern)];
      for (const match of matches) {
        intent.dataFlow.push({
          source: match[1],
          target: match[2]
        });
      }
    }

    // Detect timing patterns
    const timingPatterns = [
      /wait\s+(\d+)\s*(second|minute|hour)s?/gi,
      /delay\s+(\d+)\s*(second|minute|hour)s?/gi,
      /retry\s+(\d+)\s+times?/gi,
      /timeout\s+after\s+(\d+)\s*(second|minute)s?/gi
    ];
    
    for (const pattern of timingPatterns) {
      const matches = [...lowerPrompt.matchAll(pattern)];
      for (const match of matches) {
        intent.timing.push({
          type: match[0].includes('retry') ? 'retry' : 
                match[0].includes('timeout') ? 'timeout' : 'delay',
          value: parseInt(match[1]),
          unit: match[2]
        });
      }
    }

    // Detect error handling
    if (lowerPrompt.includes('if fails') || lowerPrompt.includes('on error')) {
      intent.error_handling.push({
        type: 'fallback',
        condition: 'on_error'
      });
    }
    if (lowerPrompt.includes('retry')) {
      intent.error_handling.push({
        type: 'retry',
        condition: 'on_failure'
      });
    }

    return intent;
  }

  /**
   * Map detected patterns to available connectors
   */
  private mapToConnectors(intent: WorkflowIntent): Map<string, DetectedPattern[]> {
    const mapping = new Map<string, DetectedPattern[]>();
    
    // For each action, find the best connector
    for (const action of intent.actions) {
      let bestConnector = null;
      let bestScore = 0;
      
      for (const [connector, capabilities] of Object.entries(this.connectorCapabilities)) {
        if (!this.availableConnectors.includes(connector)) continue;
        
        // Check if connector can handle this action
        const score = this.scoreConnectorMatch(action, capabilities);
        if (score > bestScore) {
          bestScore = score;
          bestConnector = connector;
        }
      }
      
      if (bestConnector) {
        action.connector = bestConnector;
        if (!mapping.has(bestConnector)) {
          mapping.set(bestConnector, []);
        }
        mapping.get(bestConnector)!.push(action);
      }
    }
    
    // Map triggers to connectors
    for (const trigger of intent.triggers) {
      // Find connectors that support this trigger type
      for (const [connector, capabilities] of Object.entries(this.connectorCapabilities)) {
        if (!this.availableConnectors.includes(connector)) continue;
        
        if ('triggers' in capabilities && capabilities.triggers && this.triggerMatchesCapability(trigger, capabilities.triggers)) {
          trigger.connector = connector;
          if (!mapping.has(connector)) {
            mapping.set(connector, []);
          }
          mapping.get(connector)!.push(trigger);
          break;
        }
      }
    }
    
    return mapping;
  }

  /**
   * Build workflow steps from patterns and connector mapping
   */
  private buildSteps(intent: WorkflowIntent, connectorMapping: Map<string, DetectedPattern[]>): WorkflowStep[] {
    const steps: WorkflowStep[] = [];
    let stepId = 1;
    
    // Group patterns by logical sequence
    const sequences = this.groupIntoSequences(intent, connectorMapping);
    
    for (const sequence of sequences) {
      for (const pattern of sequence) {
        const step = this.createStep(pattern, stepId++);
        if (step) {
          steps.push(step);
        }
      }
    }
    
    // Add conditional steps
    for (const condition of intent.conditions) {
      const affectedSteps = this.findAffectedSteps(steps, condition);
      for (const step of affectedSteps) {
        step.condition = this.buildConditionExpression(condition);
      }
    }
    
    // Add error handling
    for (const errorPattern of intent.error_handling) {
      const affectedSteps = this.findErrorProneSteps(steps);
      for (const step of affectedSteps) {
        step.onError = errorPattern.type as any;
        if (errorPattern.type === 'retry') {
          step.retry = {
            maxAttempts: 3,
            backoff: 'exponential',
            delay: 1000
          };
        }
      }
    }
    
    return steps;
  }

  /**
   * Add control flow to workflow
   */
  private addControlFlow(steps: WorkflowStep[], intent: WorkflowIntent): any {
    const workflow: any = {
      steps,
      triggers: [],
      conditions: []
    };
    
    // Add triggers
    for (const trigger of intent.triggers) {
      workflow.triggers.push(this.createTrigger(trigger));
    }
    
    // Add parallel execution where possible
    const parallelGroups = this.identifyParallelSteps(steps);
    for (const group of parallelGroups) {
      for (const step of group) {
        step.parallel = true;
      }
    }
    
    // Add loops if detected
    const loopPatterns = intent.conditions.filter(c => 
      c.category === 'every' || c.value.includes('each') || c.value.includes('all')
    );
    
    for (const loopPattern of loopPatterns) {
      const loopSteps = this.findLoopSteps(steps, loopPattern);
      if (loopSteps.length > 0) {
        loopSteps[0].loop = {
          type: 'foreach',
          items: '${data.items}',
          maxIterations: 1000
        };
      }
    }
    
    return workflow;
  }

  /**
   * Optimize and validate workflow
   */
  private optimizeWorkflow(workflow: any, context?: ExecutionContext): WorkflowDefinition {
    // Remove redundant steps
    workflow.steps = this.removeRedundantSteps(workflow.steps);
    
    // Optimize data flow
    workflow.steps = this.optimizeDataFlow(workflow.steps);
    
    // Add missing connections
    workflow.steps = this.ensureDataConnections(workflow.steps);
    
    // Create final workflow definition
    return {
      id: `wf_${Date.now()}`,
      name: 'Intelligent Workflow',
      description: 'Dynamically generated workflow',
      version: '1.0.0',
      type: 'custom',
      complexity: this.calculateComplexity(workflow.steps),
      triggers: workflow.triggers || [],
      steps: workflow.steps,
      conditions: workflow.conditions || [],
      variables: this.extractVariables(workflow.steps),
      outputs: this.identifyOutputs(workflow.steps),
      permissions: {
        read: [context?.userId || 'system'],
        write: [context?.userId || 'system'],
        execute: [context?.userId || 'system'],
        delete: [context?.userId || 'system'],
        share: []
      },
      security: {
        encryption: true,
        audit: true,
        compliance: [],
        dataRetention: 30,
        pii_handling: {
          detection: true,
          masking: true,
          encryption: true,
          fields: []
        }
      },
      monitoring: {
        alerts: [],
        metrics: [],
        logs: {
          level: 'info',
          retention: 7,
          format: 'json'
        },
        tracing: true
      },
      metadata: {
        createdBy: context?.userId || 'system',
        createdAt: new Date(),
        tags: [],
        category: 'intelligent',
        useCases: []
      }
    };
  }

  // ========== HELPER METHODS ==========

  private scoreConnectorMatch(action: DetectedPattern, capabilities: any): number {
    if (!capabilities.actions) return 0;
    
    // Check if any capability action matches the detected action
    for (const capAction of capabilities.actions) {
      if (capAction.toLowerCase().includes(action.value) || 
          action.value.includes(capAction.toLowerCase())) {
        return 0.9;
      }
      if (this.areSimilarActions(action.category, capAction)) {
        return 0.7;
      }
    }
    
    return 0;
  }

  private areSimilarActions(category: string, action: string): boolean {
    const similarityMap: Record<string, string[]> = {
      'create': ['add', 'new', 'insert', 'generate'],
      'update': ['modify', 'edit', 'change', 'patch'],
      'delete': ['remove', 'destroy', 'clear'],
      'send': ['email', 'notify', 'message', 'alert']
    };
    
    return similarityMap[category]?.some(similar => 
      action.toLowerCase().includes(similar)
    ) || false;
  }

  private triggerMatchesCapability(trigger: DetectedPattern, capabilities: string[]): boolean {
    return capabilities.some(cap => 
      cap.toLowerCase().includes(trigger.value) || 
      trigger.value.includes(cap.toLowerCase())
    );
  }

  private groupIntoSequences(intent: WorkflowIntent, mapping: Map<string, DetectedPattern[]>): DetectedPattern[][] {
    const sequences: DetectedPattern[][] = [];
    const allPatterns: DetectedPattern[] = [];
    
    // Collect all patterns
    for (const patterns of mapping.values()) {
      allPatterns.push(...patterns);
    }
    
    // Group by logical sequence (simplified - can be enhanced)
    if (allPatterns.length > 0) {
      sequences.push(allPatterns);
    }
    
    return sequences;
  }

  private createStep(pattern: DetectedPattern, id: number): WorkflowStep | null {
    if (!pattern.connector) return null;
    
    return {
      id: `step_${id}`,
      connector: pattern.connector,
      action: this.mapPatternToAction(pattern),
      params: pattern.parameters || {},
      timeout: 30000
    };
  }

  private mapPatternToAction(pattern: DetectedPattern): string {
    // Map pattern category to connector action
    const actionMap: Record<string, string> = {
      'fetch': 'get',
      'create': 'create',
      'update': 'update',
      'delete': 'delete',
      'send': 'send',
      'analyze': 'analyze'
    };
    
    return actionMap[pattern.category] || pattern.value;
  }

  private createTrigger(trigger: DetectedPattern): WorkflowTrigger {
    const params = trigger.parameters as any;
    
    if (params?.type === 'schedule') {
      return {
        type: 'schedule',
        cron: this.buildCronExpression(params)
      };
    }
    
    if (params?.type === 'webhook') {
      return {
        type: 'webhook',
        webhook: '/webhook/' + Date.now()
      };
    }
    
    return {
      type: 'manual'
    };
  }

  private buildCronExpression(params: any): string {
    if (params.unit === 'minute') {
      return `*/${params.interval} * * * *`;
    }
    if (params.unit === 'hour') {
      return `0 */${params.interval} * * *`;
    }
    if (params.unit === 'day') {
      return `0 0 */${params.interval} * *`;
    }
    return '0 0 * * *'; // Default daily
  }

  private buildConditionExpression(condition: DetectedPattern): string {
    const conditionMap: Record<string, string> = {
      'equals': '${data} == ${value}',
      'contains': '${data}.includes(${value})',
      'greater': '${data} > ${value}',
      'less': '${data} < ${value}'
    };
    
    return conditionMap[condition.category] || 'true';
  }

  private findAffectedSteps(steps: WorkflowStep[], condition: DetectedPattern): WorkflowStep[] {
    // Find steps that should be conditional (simplified)
    return steps.slice(1); // All steps after first
  }

  private findErrorProneSteps(steps: WorkflowStep[]): WorkflowStep[] {
    // Find steps that might fail (external calls)
    return steps.filter(step => 
      step.connector.includes('api') || 
      step.action.includes('send') ||
      step.action.includes('create')
    );
  }

  private identifyParallelSteps(steps: WorkflowStep[]): WorkflowStep[][] {
    const groups: WorkflowStep[][] = [];
    
    // Identify independent steps that can run in parallel
    const independent: WorkflowStep[] = [];
    for (let i = 0; i < steps.length; i++) {
      if (i === 0) continue; // First step can't be parallel
      
      // Check if step depends on previous step
      const dependsOnPrevious = this.checkDependency(steps[i], steps[i-1]);
      if (!dependsOnPrevious) {
        independent.push(steps[i]);
      }
    }
    
    if (independent.length > 1) {
      groups.push(independent);
    }
    
    return groups;
  }

  private checkDependency(step1: WorkflowStep, step2: WorkflowStep): boolean {
    // Check if step1 depends on output of step2
    // Simplified check - can be enhanced
    return step1.input?.includes('${steps.' + step2.id) || false;
  }

  private findLoopSteps(steps: WorkflowStep[], loopPattern: DetectedPattern): WorkflowStep[] {
    // Find steps that should be in a loop
    return steps.filter(step => 
      step.action.includes('process') || 
      step.action.includes('transform')
    );
  }

  private removeRedundantSteps(steps: WorkflowStep[]): WorkflowStep[] {
    // Remove duplicate steps
    const unique: WorkflowStep[] = [];
    const seen = new Set<string>();
    
    for (const step of steps) {
      const key = `${step.connector}-${step.action}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(step);
      }
    }
    
    return unique;
  }

  private optimizeDataFlow(steps: WorkflowStep[]): WorkflowStep[] {
    // Ensure data flows efficiently between steps
    for (let i = 1; i < steps.length; i++) {
      const prevStep = steps[i - 1];
      const currStep = steps[i];
      
      // Connect output to input
      if (!currStep.input) {
        currStep.input = `\${steps.${prevStep.id}.output}`;
      }
    }
    
    return steps;
  }

  private ensureDataConnections(steps: WorkflowStep[]): WorkflowStep[] {
    // Ensure all steps have necessary data connections
    for (const step of steps) {
      if (!step.params) {
        step.params = {};
      }
    }
    
    return steps;
  }

  private calculateComplexity(steps: WorkflowStep[]): 'simple' | 'medium' | 'complex' | 'advanced' {
    if (steps.length <= 3) return 'simple';
    if (steps.length <= 7) return 'medium';
    if (steps.length <= 15) return 'complex';
    return 'advanced';
  }

  private extractVariables(steps: WorkflowStep[]): any[] {
    const variables: any[] = [];
    
    // Extract variables from step parameters
    for (const step of steps) {
      if (step.params) {
        for (const [key, value] of Object.entries(step.params)) {
          if (typeof value === 'string' && value.includes('${')) {
            variables.push({
              name: key,
              type: 'string',
              required: false
            });
          }
        }
      }
    }
    
    return variables;
  }

  private identifyOutputs(steps: WorkflowStep[]): any[] {
    const outputs: any[] = [];
    
    // Last step output is workflow output
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      outputs.push({
        name: 'result',
        type: 'object',
        mapping: `\${steps.${lastStep.id}.output}`,
        description: 'Workflow result'
      });
    }
    
    return outputs;
  }
}

// ============================================
// SEMANTIC MATCHER
// ============================================

export class SemanticMatcher {
  /**
   * Calculate semantic similarity between prompt and pattern
   */
  static calculateSimilarity(prompt: string, pattern: string): number {
    const promptWords = prompt.toLowerCase().split(/\s+/);
    const patternWords = pattern.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const word of patternWords) {
      if (promptWords.includes(word)) {
        matches++;
      }
    }
    
    return matches / Math.max(patternWords.length, promptWords.length);
  }

  /**
   * Find best matching connector for action
   */
  static findBestConnector(action: string, availableConnectors: string[]): string | null {
    const actionConnectorMap: Record<string, string[]> = {
      'email': ['gmail', 'sendgrid', 'mailchimp'],
      'message': ['slack', 'teams', 'discord'],
      'payment': ['stripe', 'paypal'],
      'file': ['google-drive', 'aws-s3', 'dropbox'],
      'task': ['jira', 'asana', 'trello'],
      'contact': ['hubspot', 'salesforce'],
      'order': ['shopify', 'woocommerce']
    };
    
    for (const [key, connectors] of Object.entries(actionConnectorMap)) {
      if (action.includes(key)) {
        const available = connectors.find(c => availableConnectors.includes(c));
        if (available) return available;
      }
    }
    
    return null;
  }
}

export default IntelligentWorkflowBuilder;