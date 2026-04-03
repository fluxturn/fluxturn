/**
 * LangChain-based Workflow Builder with Zod Validation
 * Uses OpenAI for advanced natural language understanding and workflow generation
 */

import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { 
  WorkflowDefinition,
  WorkflowStep,
  WorkflowTrigger,
  WorkflowCondition,
  ExecutionContext
} from './types';
import { CONNECTOR_CAPABILITIES } from './intelligent-builder';

// ============================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================

const TriggerSchema = z.object({
  type: z.enum(['webhook', 'schedule', 'email', 'form_submission', 'database', 'api', 'manual', 'social_mention', 'file_upload', 'payment', 'event']),
  source: z.string().optional(),
  event: z.string().optional(),
  filter: z.any().optional(),
  cron: z.string().optional(),
  webhook: z.string().optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['==', '!=', '>', '<', '>=', '<=', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex', 'in', 'not_in']),
    value: z.any()
  })).optional()
});

const StepSchema = z.object({
  id: z.string(),
  connector: z.string(),
  action: z.string(),
  description: z.string().optional(),
  input: z.any().optional(),
  params: z.record(z.string(), z.any()).optional(),
  condition: z.string().optional(),
  onError: z.enum(['stop', 'continue', 'retry', 'fallback']).optional(),
  retry: z.object({
    maxAttempts: z.number(),
    backoff: z.enum(['linear', 'exponential']),
    delay: z.number()
  }).optional(),
  timeout: z.number().optional(),
  parallel: z.boolean().optional(),
  loop: z.object({
    type: z.enum(['for', 'while', 'foreach']),
    condition: z.string().optional(),
    items: z.string().optional(),
    maxIterations: z.number().optional()
  }).optional()
});

const ConditionSchema = z.object({
  id: z.string(),
  expression: z.string(),
  description: z.string().optional()
});

const WorkflowAnalysisSchema = z.object({
  confidence: z.number().min(0).max(100),
  triggers: z.array(TriggerSchema),
  steps: z.array(StepSchema),
  conditions: z.array(ConditionSchema),
  requiredConnectors: z.array(z.string()),
  dataFlow: z.array(z.object({
    source: z.string(),
    target: z.string(),
    transformation: z.string().optional()
  })),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
    required: z.boolean(),
    default: z.any().optional(),
    description: z.string().optional()
  })),
  outputs: z.array(z.object({
    name: z.string(),
    type: z.string(),
    mapping: z.string(),
    description: z.string().optional()
  })),
  errorHandling: z.object({
    strategy: z.enum(['stop', 'continue', 'retry', 'fallback']),
    retryPolicy: z.object({
      maxAttempts: z.number(),
      backoff: z.enum(['linear', 'exponential']),
      delay: z.number()
    }).optional(),
    fallbackSteps: z.array(StepSchema).optional()
  }),
  optimization: z.object({
    parallelizable: z.array(z.string()),
    cacheable: z.array(z.string()),
    estimatedDuration: z.number(),
    complexity: z.enum(['simple', 'medium', 'complex', 'advanced'])
  })
});

// ============================================
// LANGCHAIN WORKFLOW BUILDER
// ============================================

export class LangChainWorkflowBuilder {
  private chatModel: ChatOpenAI;
  private availableConnectors: string[];
  private connectorCapabilities = CONNECTOR_CAPABILITIES;

  constructor(apiKey: string, availableConnectors: string[]) {
    this.chatModel = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4o-mini',
      temperature: 1, // OpenAI requires temperature=1 for structured outputs
      maxTokens: 2000
    });
    this.availableConnectors = availableConnectors;
  }

  /**
   * Generate workflow using LangChain and OpenAI
   */
  async generateWorkflow(
    prompt: string,
    context?: ExecutionContext
  ): Promise<{
    workflow: WorkflowDefinition;
    confidence: number;
    analysis: z.infer<typeof WorkflowAnalysisSchema>;
  }> {
    try {
      // Step 1: Analyze the prompt and generate workflow structure
      const analysis = await this.analyzePrompt(prompt);
      
      // Step 2: Validate with Zod
      const validatedAnalysis = WorkflowAnalysisSchema.parse(analysis);
      
      // Check confidence threshold
      if (validatedAnalysis.confidence < 50) {
        throw new Error(`AI confidence too low (${validatedAnalysis.confidence}%). Please provide a more detailed description of your workflow requirements.`);
      }
      
      // Step 3: Convert to WorkflowDefinition
      const workflow = this.buildWorkflowDefinition(validatedAnalysis, context);
      
      return {
        workflow,
        confidence: validatedAnalysis.confidence,
        analysis: validatedAnalysis
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Failed to generate workflow: Invalid structure generated. Issues: ${issues}`);
      }
      console.error('Error generating workflow with LangChain:', error);
      throw error;
    }
  }

  /**
   * Analyze prompt using OpenAI
   */
  private async analyzePrompt(prompt: string): Promise<any> {
    const systemPrompt = `You are an expert workflow automation architect. Analyze the user's request and generate a detailed workflow configuration.

Available connectors and their capabilities:
${JSON.stringify(this.connectorCapabilities, null, 2)}

Available connectors in the system: ${this.availableConnectors.join(', ')}

Your task is to:
1. Identify all triggers from the prompt
2. Break down the workflow into logical steps
3. Map each step to the appropriate connector and action
4. Identify conditions and branching logic
5. Determine data flow between steps
6. Identify required variables and outputs
7. Suggest error handling strategies
8. Identify optimization opportunities (parallel execution, caching)

Return a JSON object that EXACTLY matches this structure with ALL fields populated:
{
  "confidence": <0-100 score of how well you understood the request>,
  "triggers": [
    {
      "type": <"webhook"|"schedule"|"email"|"form_submission"|"database"|"api"|"manual"|"social_mention"|"file_upload"|"payment"|"event">,
      "source": <optional source string>,
      "event": <optional event name>,
      "filter": <optional filter object>,
      "cron": <optional cron expression for schedule type>,
      "webhook": <optional webhook URL>
    }
  ],
  "steps": [
    {
      "id": <"step_1", "step_2", etc.>,
      "connector": <connector name from available list>,
      "action": <action name>,
      "description": <step description>,
      "input": <input data or reference like "\${step_1.output}">,
      "params": {<key-value parameters>},
      "onError": <"stop"|"continue"|"retry"|"fallback">,
      "timeout": <timeout in ms>
    }
  ],
  "conditions": [
    {
      "id": <"condition_1", "condition_2", etc.>,
      "expression": <condition expression like "\${step_1.status} == 'success'">,
      "description": <condition description>
    }
  ],
  "requiredConnectors": [<array of connector names needed>],
  "dataFlow": [
    {
      "source": <source step ID or "trigger">,
      "target": <target step ID>,
      "transformation": <optional transformation description>
    }
  ],
  "variables": [
    {
      "name": <variable name>,
      "type": <"string"|"number"|"boolean"|"object"|"array">,
      "required": <true|false>,
      "default": <default value if not required>,
      "description": <variable description>
    }
  ],
  "outputs": [
    {
      "name": <output name>,
      "type": <output type>,
      "mapping": <mapping expression like "\${step_3.result}">,
      "description": <output description>
    }
  ],
  "errorHandling": {
    "strategy": <"stop"|"continue"|"retry"|"fallback">,
    "retryPolicy": {
      "maxAttempts": <number, e.g., 3>,
      "backoff": <"linear"|"exponential">,
      "delay": <delay in ms, e.g., 1000>
    }
  },
  "optimization": {
    "parallelizable": [<step IDs that can run in parallel>],
    "cacheable": [<step IDs whose results can be cached>],
    "estimatedDuration": <estimated time in ms>,
    "complexity": <"simple"|"medium"|"complex"|"advanced">
  }
}

CRITICAL REQUIREMENTS:
- EVERY field must be populated, even if empty arrays
- triggers array must have at least one trigger with a valid "type" field
- Each condition must have both "id" and "expression" fields
- Each dataFlow entry must have "source" and "target" fields
- Each variable must have "required" as boolean (true or false)
- Each output must have a "mapping" field
- errorHandling.retryPolicy must have "maxAttempts" (number) and "backoff" ("linear" or "exponential") and "delay" (number)
- Use step IDs like "step_1", "step_2", etc.
- Ensure all connectors used are in the available list
- Include detailed params for each step
- Use dollar-sign-curly-braces for dynamic values (e.g., $\{step_1.output})`;

    const userPrompt = `Analyze this workflow request and generate a COMPLETE workflow configuration with ALL fields populated:
"${prompt}"

Remember:
- Default to "manual" trigger type if no specific trigger is mentioned
- Include at least one condition (even if it's a simple success check)
- Include at least one dataFlow entry showing how data moves
- Include at least one variable (even if it's just a status variable)
- Include at least one output mapping
- Always include retryPolicy with maxAttempts: 3, backoff: "exponential", delay: 1000 as defaults`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ];

    try {
      const response = await this.chatModel.invoke(messages);
      
      // Parse JSON response
      const jsonParser = new JsonOutputParser();
      const parsed = await jsonParser.parse(response.content as string);
      
      // Ensure minimum required fields are present
      const ensuredData = this.ensureRequiredFields(parsed);
      
      return ensuredData;
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      // Throw error instead of returning fake data
      throw new Error(`Failed to understand the workflow prompt. Please provide more specific details about what you want to automate. Error: ${error.message}`);
    }
  }
  
  /**
   * Ensure all required fields are present in the parsed data
   */
  private ensureRequiredFields(data: any): any {
    // Ensure triggers have type
    if (!data.triggers || data.triggers.length === 0) {
      data.triggers = [{ type: 'manual' }];
    } else {
      data.triggers = data.triggers.map((t: any) => ({
        type: t.type || 'manual',
        ...t
      }));
    }
    
    // Ensure conditions have id and expression
    if (!data.conditions || data.conditions.length === 0) {
      data.conditions = [{
        id: 'condition_1',
        expression: 'true',
        description: 'Default always-true condition'
      }];
    } else {
      data.conditions = data.conditions.map((c: any, i: number) => ({
        id: c.id || `condition_${i + 1}`,
        expression: c.expression || 'true',
        description: c.description || 'Condition'
      }));
    }
    
    // Ensure dataFlow has source and target
    if (!data.dataFlow || data.dataFlow.length === 0) {
      data.dataFlow = data.steps?.length > 0 ? [{
        source: 'trigger',
        target: data.steps[0].id || 'step_1',
        transformation: 'Input data from trigger'
      }] : [];
    } else {
      data.dataFlow = data.dataFlow.map((d: any) => ({
        source: d.source || 'trigger',
        target: d.target || 'step_1',
        transformation: d.transformation
      }));
    }
    
    // Ensure variables have required field
    if (!data.variables || data.variables.length === 0) {
      data.variables = [{
        name: 'workflowStatus',
        type: 'string',
        required: false,
        default: 'pending',
        description: 'Current workflow execution status'
      }];
    } else {
      data.variables = data.variables.map((v: any) => ({
        ...v,
        required: v.required !== undefined ? v.required : false
      }));
    }
    
    // Ensure outputs have mapping
    if (!data.outputs || data.outputs.length === 0) {
      data.outputs = [{
        name: 'result',
        type: 'object',
        mapping: data.steps?.length > 0 ? `\${step_${data.steps.length}.output}` : '${workflow.result}',
        description: 'Final workflow result'
      }];
    } else {
      data.outputs = data.outputs.map((o: any) => ({
        ...o,
        mapping: o.mapping || '${workflow.output}'
      }));
    }
    
    // Ensure errorHandling has complete retryPolicy
    if (!data.errorHandling) {
      data.errorHandling = {
        strategy: 'retry',
        retryPolicy: {
          maxAttempts: 3,
          backoff: 'exponential',
          delay: 1000
        }
      };
    } else {
      if (!data.errorHandling.retryPolicy) {
        data.errorHandling.retryPolicy = {
          maxAttempts: 3,
          backoff: 'exponential',
          delay: 1000
        };
      } else {
        data.errorHandling.retryPolicy = {
          maxAttempts: data.errorHandling.retryPolicy.maxAttempts || 3,
          backoff: data.errorHandling.retryPolicy.backoff || 'exponential',
          delay: data.errorHandling.retryPolicy.delay || 1000
        };
      }
    }
    
    // Ensure optimization fields
    if (!data.optimization) {
      data.optimization = {
        parallelizable: [],
        cacheable: [],
        estimatedDuration: 5000,
        complexity: 'simple'
      };
    } else {
      data.optimization = {
        parallelizable: data.optimization.parallelizable || [],
        cacheable: data.optimization.cacheable || [],
        estimatedDuration: data.optimization.estimatedDuration || 5000,
        complexity: data.optimization.complexity || 'simple'
      };
    }
    
    return data;
  }

  /**
   * Build WorkflowDefinition from validated analysis
   */
  private buildWorkflowDefinition(
    analysis: z.infer<typeof WorkflowAnalysisSchema>,
    context?: ExecutionContext
  ): WorkflowDefinition {
    return {
      id: `wf_langchain_${Date.now()}`,
      name: 'AI-Generated Workflow',
      description: 'Workflow generated using LangChain and OpenAI',
      version: '1.0.0',
      type: 'custom',
      complexity: analysis.optimization.complexity,
      triggers: analysis.triggers as WorkflowTrigger[],
      steps: analysis.steps as WorkflowStep[],
      conditions: analysis.conditions as WorkflowCondition[],
      variables: analysis.variables as any[],
      outputs: analysis.outputs as any[],
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
        tags: ['ai-generated', 'langchain'],
        category: 'intelligent',
        useCases: []
      }
    };
  }

  /**
   * Enhanced prompt analysis with specific examples
   */
  async analyzeWithExamples(
    prompt: string,
    examples: { prompt: string; workflow: any }[]
  ): Promise<any> {
    const exampleText = examples.map((ex, i) => 
      `Example ${i + 1}:
Prompt: "${ex.prompt}"
Workflow: ${JSON.stringify(ex.workflow, null, 2)}`
    ).join('\n\n');

    const enhancedPrompt = `Here are some examples of how to convert prompts to workflows:

${exampleText}

Now analyze this new prompt following the same pattern:
"${prompt}"`;

    const messages = [
      new SystemMessage(this.getSystemPrompt()),
      new HumanMessage(enhancedPrompt)
    ];

    const response = await this.chatModel.invoke(messages);
    const jsonParser = new JsonOutputParser();
    return await jsonParser.parse(response.content as string);
  }

  /**
   * Get system prompt for workflow generation
   */
  private getSystemPrompt(): string {
    return `You are an expert workflow automation architect specializing in converting natural language requests into executable workflow configurations.

Your capabilities include:
1. Understanding complex business logic and requirements
2. Identifying appropriate triggers, conditions, and actions
3. Mapping requirements to available connectors and their capabilities
4. Designing efficient data flow between steps
5. Implementing proper error handling and recovery strategies
6. Optimizing workflows for performance (parallel execution, caching)
7. Ensuring security and compliance requirements are met

Available connectors: ${JSON.stringify(Object.keys(this.connectorCapabilities))}

Each connector has specific capabilities for triggers, actions, conditions, and data handling.

Always return a structured JSON that can be validated and executed.`;
  }

  /**
   * Validate workflow against business rules
   */
  validateWorkflow(workflow: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Validate with Zod schema
      WorkflowAnalysisSchema.parse(workflow);
      
      // Additional business rule validations
      if (workflow.steps.length === 0) {
        errors.push('Workflow must have at least one step');
      }
      
      // Check connector availability
      const unavailableConnectors = workflow.requiredConnectors.filter(
        (c: string) => !this.availableConnectors.includes(c)
      );
      if (unavailableConnectors.length > 0) {
        errors.push(`Unavailable connectors: ${unavailableConnectors.join(', ')}`);
      }
      
      // Check for circular dependencies
      if (this.hasCircularDependency(workflow.steps)) {
        errors.push('Workflow contains circular dependencies');
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
      } else {
        errors.push(String(error));
      }
      
      return {
        valid: false,
        errors
      };
    }
  }

  /**
   * Check for circular dependencies in workflow steps
   */
  private hasCircularDependency(steps: any[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);
      
      const step = steps.find(s => s.id === stepId);
      if (!step) return false;
      
      // Check dependencies (steps that use this step's output)
      const dependents = steps.filter(s => 
        s.input && s.input.includes(`${stepId}.output`)
      );
      
      for (const dependent of dependents) {
        if (!visited.has(dependent.id)) {
          if (hasCycle(dependent.id)) return true;
        } else if (recursionStack.has(dependent.id)) {
          return true;
        }
      }
      
      recursionStack.delete(stepId);
      return false;
    };
    
    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (hasCycle(step.id)) return true;
      }
    }
    
    return false;
  }

  /**
   * Generate workflow with confidence scoring
   */
  async generateWithConfidence(
    prompt: string,
    minConfidence: number = 70
  ): Promise<{
    success: boolean;
    workflow?: WorkflowDefinition;
    confidence: number;
    errorMessage?: string;
  }> {
    try {
      const result = await this.generateWorkflow(prompt);
      
      if (result.confidence >= minConfidence) {
        return {
          success: true,
          workflow: result.workflow,
          confidence: result.confidence
        };
      } else {
        return {
          success: false,
          confidence: result.confidence,
          errorMessage: `AI confidence too low (${result.confidence}%). Please provide a more detailed and specific description of your workflow. Minimum confidence required: ${minConfidence}%`
        };
      }
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        errorMessage: error.message || 'Failed to generate workflow. Please provide a clearer description of what you want to automate.'
      };
    }
  }
}

// ============================================
// WORKFLOW EXAMPLES FOR TRAINING
// ============================================

export const WORKFLOW_EXAMPLES = [
  {
    prompt: "When someone fills out our contact form, send them a thank you email and create a lead in HubSpot",
    workflow: {
      confidence: 95,
      triggers: [{
        type: "form_submission",
        source: "contact_form"
      }],
      steps: [
        {
          id: "step_1",
          connector: "gmail",
          action: "send_email",
          params: {
            to: "${trigger.email}",
            subject: "Thank you for contacting us",
            body: "We've received your message and will get back to you soon."
          }
        },
        {
          id: "step_2",
          connector: "hubspot",
          action: "create_contact",
          params: {
            email: "${trigger.email}",
            firstName: "${trigger.firstName}",
            lastName: "${trigger.lastName}",
            leadStatus: "new"
          }
        }
      ],
      requiredConnectors: ["gmail", "hubspot"]
    }
  },
  {
    prompt: "Every Monday at 9 AM, get all open Jira tickets, analyze priority, and send a summary to Slack",
    workflow: {
      confidence: 92,
      triggers: [{
        type: "schedule",
        cron: "0 9 * * 1"
      }],
      steps: [
        {
          id: "step_1",
          connector: "jira",
          action: "get_issues",
          params: {
            jql: "status = Open",
            fields: ["summary", "priority", "assignee"]
          }
        },
        {
          id: "step_2",
          connector: "openai",
          action: "analyze",
          params: {
            prompt: "Analyze these Jira tickets and create a priority summary",
            data: "${step_1.output}"
          }
        },
        {
          id: "step_3",
          connector: "slack",
          action: "send_message",
          params: {
            channel: "#team-updates",
            text: "${step_2.output}"
          }
        }
      ],
      requiredConnectors: ["jira", "openai", "slack"]
    }
  }
];

export default LangChainWorkflowBuilder;