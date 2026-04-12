import { Injectable, Logger, OnModuleInit, OnModuleDestroy, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../../database/platform.service';
import { QueueService } from '../../queue/queue.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { ConnectorLookup } from '../connectors/shared';
import { HybridWorkflowOrchestrator } from './config/hybrid-orchestrator';
import { WorkflowExecutionEngine } from './services/workflow-execution.engine';
import { TriggerManagerService } from './services/trigger-manager.service';
import { TriggerType } from './interfaces/trigger.interface';
import { AIWorkflowGeneratorService } from './services/ai-workflow-generator.service';
import { IntentDetectionService } from './services/intent-detection.service';
import { DeadLetterService } from '../../dead-letter/dead-letter.service';
// compareConnectorFields removed - seeding now done via npm run seed:connector

@Injectable()
export class WorkflowService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowService.name);
  private hybridOrchestrator: HybridWorkflowOrchestrator | null = null;

  constructor(
    private configService: ConfigService,
    private platformService: PlatformService,
    @Inject(forwardRef(() => QueueService))
    private queueService: QueueService,
    private executionEngine: WorkflowExecutionEngine,
    @Inject(forwardRef(() => TriggerManagerService))
    private triggerManager: TriggerManagerService,
    private aiWorkflowGenerator: AIWorkflowGeneratorService,
    private intentDetection: IntentDetectionService,
    @Inject(forwardRef(() => DeadLetterService))
    private deadLetterService: DeadLetterService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Workflow Service...');

    // NOTE: Connector seeding is DISABLED on backend startup
    // Use "npm run seed:connector -- <name>" or "npm run seed:connectors" to seed manually

    // Initialize hybrid orchestrator with OpenAI API key if available
    const openAiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    const availableConnectors = this.getAvailableConnectors();

    this.hybridOrchestrator = new HybridWorkflowOrchestrator(
      availableConnectors,
      openAiApiKey
    );

    this.logger.log('Hybrid workflow orchestrator initialized');
  }

  async onModuleDestroy() {
    // Cleanup when module is destroyed
    this.hybridOrchestrator = null;
  }

  /**
   * Get configured connectors for a project/app
   */
  private async getConfiguredConnectors(projectId?: string): Promise<any[]> {
    try {
      const conditions = [];
      const params = [];

      if (projectId) {
        conditions.push('project_id = $1');
        params.push(projectId);
      } else {
        return [];
      }
      
      const query = `
        SELECT
          id,
          name,
          connector_type,
          is_active,
          status,
          last_tested_at,
          last_test_status,
          config_data
        FROM connector_configs
        WHERE ${conditions.join(' AND ')} AND is_active = true
        ORDER BY name
      `;
      
      const result = await this.platformService.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get configured connectors:', error);
      return [];
    }
  }

  /**
   * Get available connectors from TypeScript constants
   * Now reads directly from ConnectorLookup instead of database
   */
  private getAvailableConnectors(): string[] {
    return ConnectorLookup.getAllNames();
  }

  /**
   * Link credentials to workflow nodes based on credential names
   * Converts credentialName to credentialId by looking up the database
   */
  private async linkCredentialsToNodes(
    workflow: any,
    userId?: string,
    projectId?: string
  ): Promise<void> {
    if (!workflow?.canvas?.nodes || workflow.canvas.nodes.length === 0) {
      return;
    }

    // Build query conditions based on available identifiers
    const conditions = ['is_active = true'];
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (projectId) {
      conditions.push(`project_id = $${paramIndex++}`);
      params.push(projectId);
    }

    // Process each node
    for (const node of workflow.canvas.nodes) {
      if (!node.data?.credentialName) {
        continue; // Skip nodes without credential names
      }

      const credentialName = node.data.credentialName;
      const connectorType = node.data.connector; // The connector type (e.g., 'telegram', 'slack')

      try {
        // Query to find matching credential
        const credentialConditions = [...conditions];
        const credentialParams = [...params];

        credentialConditions.push(`name = $${paramIndex}`);
        credentialParams.push(credentialName);

        // If we know the connector type, add it to the query for better matching
        if (connectorType) {
          credentialConditions.push(`connector_type = $${paramIndex + 1}`);
          credentialParams.push(connectorType);
        }

        const query = `
          SELECT id, name, connector_type
          FROM connector_configs
          WHERE ${credentialConditions.join(' AND ')}
          LIMIT 1
        `;

        const result = await this.platformService.query(query, credentialParams);

        if (result.rows.length > 0) {
          const credential = result.rows[0];

          // Replace credentialName with credentialId
          node.data.credentialId = credential.id;
          delete node.data.credentialName; // Remove the name, keep only the ID

          this.logger.log(
            `✅ Linked credential "${credentialName}" (${credential.connector_type}) to node ${node.id}`
          );
        } else {
          this.logger.warn(
            `⚠️ Could not find credential "${credentialName}"${connectorType ? ` for connector "${connectorType}"` : ''} - leaving credentialName in node for manual configuration`
          );
          // Keep credentialName in the node so user can see what was requested
        }
      } catch (error) {
        this.logger.error(`Error linking credential for node ${node.id}:`, error);
        // Keep credentialName in the node if there was an error
      }
    }
  }

  /**
   * Create a new workflow from prompt or definition
   */
  async createWorkflow(params: {
    project_id?: string;
    organization_id?: string;
    prompt?: string;
    workflow?: any;
    name?: string;
    description?: string;
    created_by?: string;
    template_id?: string;
    is_ai_generated?: boolean;
  }): Promise<any> {
    try {
      // Validate multi-tenant context
      if (!params.organization_id) {
        throw new BadRequestException('Organization ID is required');
      }
      if (!params.project_id) {
        throw new BadRequestException('Project ID is required');
      }

      let workflowDefinition: any;
      let confidence = 100;
      let isAiGenerated = params.is_ai_generated || false;

      // Generate workflow from prompt if provided
      if (params.prompt && this.hybridOrchestrator) {
        const generationResult = await this.hybridOrchestrator.generateWorkflow(
          params.prompt
        );

        workflowDefinition = generationResult.workflow;
        confidence = generationResult.confidence;
        isAiGenerated = true; // ✅ FIX: Auto-set to true when generated from prompt (classic mode)
      } else if (params.workflow) {
        workflowDefinition = params.workflow;
      } else {
        throw new BadRequestException('Either prompt or workflow definition is required');
      }

      // Extract required connectors from workflow definition
      const requiredConnectors = this.extractRequiredConnectors(workflowDefinition);

      // Validate template_id if provided
      let validatedTemplateId = params.template_id || null;
      if (params.template_id) {
        try {
          const templateCheckResult = await this.platformService.query(
            `SELECT id FROM workflow_templates WHERE id = $1`,
            [params.template_id]
          );

          if (templateCheckResult.rows.length === 0) {
            this.logger.warn(`Template ID ${params.template_id} not found in workflow_templates table. Setting to null.`);
            validatedTemplateId = null;
          }
        } catch (error) {
          this.logger.error(`Error validating template_id: ${error.message}`);
          validatedTemplateId = null;
        }
      }

      // Insert workflow into database
      const workflowId = uuidv4();
      const query = `
        INSERT INTO workflows (
          id, name, description, organization_id, project_id,
          trigger, steps, conditions, variables, outputs, canvas,
          status, user_id, created_by, required_connectors, template_id, is_ai_generated, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, NOW(), NOW()
        ) RETURNING *
      `;

      const values = [
        workflowId,
        params.name || workflowDefinition.name || 'Untitled Workflow',
        params.description || workflowDefinition.description || '',
        params.organization_id,
        params.project_id,
        JSON.stringify(workflowDefinition.triggers || []),
        JSON.stringify(workflowDefinition.steps || []),
        JSON.stringify(workflowDefinition.conditions || []),
        JSON.stringify(workflowDefinition.variables || []),
        JSON.stringify(workflowDefinition.outputs || []),
        JSON.stringify(workflowDefinition.canvas || { nodes: [], edges: [] }),
        'draft',
        params.created_by, // user_id
        params.created_by, // created_by
        requiredConnectors, // required_connectors
        validatedTemplateId, // template_id
        isAiGenerated // is_ai_generated (for billing limits - auto-set to true when using prompt)
      ];

      const result = await this.platformService.query(query, values);

      // Increment template use count if created from template
      if (params.template_id) {
        try {
          this.logger.log(`Incrementing use count for template: ${params.template_id}`);
          await this.platformService.query(
            `UPDATE workflow_templates
             SET use_count = COALESCE(use_count, 0) + 1, updated_at = NOW()
             WHERE id = $1
             RETURNING use_count`,
            [params.template_id]
          ).then(res => {
            if (res.rows.length > 0) {
              this.logger.log(`Template ${params.template_id} use count updated to: ${res.rows[0].use_count}`);
            } else {
              this.logger.warn(`Template ${params.template_id} not found for use count increment`);
            }
          });
        } catch (error) {
          this.logger.error(`Failed to increment use count for template ${params.template_id}:`, error);
        }
      }

      return {
        ...result.rows[0],
        confidence,
        generationStrategy: params.prompt ? 'hybrid' : 'manual'
      };
    } catch (error) {
      this.logger.error('Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * Execute a workflow using the execution engine
   */
  async executeWorkflow(params: {
    workflow_id: string;
    input_data?: Record<string, any>;
    project_id?: string;
    organization_id?: string;
  }): Promise<any> {
    try {
      // Get workflow from database
      const workflowQuery = `
        SELECT * FROM workflows
        WHERE id = $1
        AND ($2::uuid IS NULL OR organization_id = $2)
        AND ($3::uuid IS NULL OR project_id = $3)
      `;

      const workflowResult = await this.platformService.query(
        workflowQuery,
        [params.workflow_id, params.organization_id, params.project_id]
      );

      if (workflowResult.rows.length === 0) {
        throw new NotFoundException('Workflow not found');
      }

      const workflowRow = workflowResult.rows[0];

      // Parse workflow canvas (nodes and edges)
      const canvas = workflowRow.canvas || { nodes: [], edges: [] };

      if (!canvas.nodes || canvas.nodes.length === 0) {
        throw new BadRequestException('Workflow has no nodes configured');
      }

      this.logger.log(`Executing workflow: ${workflowRow.name} with ${canvas.nodes.length} nodes`);

      // Create execution record
      const executionId = uuidv4();
      const executionNumber = await this.getNextExecutionNumber(params.workflow_id);

      const insertExecutionQuery = `
        INSERT INTO workflow_executions (
          id, workflow_id, organization_id, project_id,
          execution_number, status, input_data, total_steps,
          started_at, created_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          NOW(), NOW()
        ) RETURNING *
      `;

      const executionValues = [
        executionId,
        params.workflow_id,
        workflowRow.organization_id,
        params.project_id || workflowRow.project_id,
        executionNumber,
        'running',
        JSON.stringify(params.input_data || {}),
        canvas.nodes.length
      ];

      await this.platformService.query(insertExecutionQuery, executionValues);

      // Execute workflow using execution engine
      try {
        const result = await this.executionEngine.executeWorkflow(
          {
            nodes: canvas.nodes,
            edges: canvas.edges
          },
          params.input_data || {},
          {
            mode: 'manual',
            executionId
          }
        );

        // Strip binary data from results to avoid database size limits
        this.logger.log(`Stripping binary data from results...`);
        const resultWithoutBinary = this.stripBinaryData(result);

        // Check size after stripping
        const jsonString = JSON.stringify(resultWithoutBinary);
        const sizeMB = Buffer.byteLength(jsonString, 'utf8') / (1024 * 1024);
        this.logger.log(`Result size after stripping: ${sizeMB.toFixed(2)} MB`);

        // Update execution with results
        const updateQuery = `
          UPDATE workflow_executions
          SET
            status = $1,
            output_data = $2,
            completed_at = NOW()
          WHERE id = $3
          RETURNING *
        `;

        this.logger.log(`Updating workflow execution ${executionId} with status: completed`);

        const executionResult = await this.platformService.query(updateQuery, [
          'completed',
          jsonString,
          executionId
        ]);

        this.logger.log(`Workflow execution completed: ${executionId}`);

        return {
          ...executionResult.rows[0],
          result,
          message: 'Workflow executed successfully'
        };

      } catch (executionError: any) {
        this.logger.error(`Workflow execution failed: ${executionId} - ${executionError.message}`);

        // Extract execution data even from failed execution
        // The execution engine stores partial results before throwing
        let outputData = null;
        if (executionError.executionData) {
          // If the error contains execution data, use it
          outputData = executionError.executionData;
        } else {
          // Otherwise, create a basic error structure
          outputData = {
            success: false,
            error: {
              message: executionError.message,
              stack: executionError.stack
            }
          };
        }

        // Strip binary data from partial results
        const outputDataWithoutBinary = this.stripBinaryData(outputData);

        // Update execution with error and partial results
        const updateQuery = `
          UPDATE workflow_executions
          SET
            status = $1,
            error = $2,
            error_details = $3,
            output_data = $4,
            completed_at = NOW()
          WHERE id = $5
          RETURNING *
        `;

        const failedExecution = await this.platformService.query(updateQuery, [
          'failed',
          executionError.message,
          JSON.stringify({ message: executionError.message, stack: executionError.stack }),
          JSON.stringify(outputDataWithoutBinary),
          executionId
        ]);

        // Add to dead letter queue (fire-and-forget)
        this.deadLetterService
          .addToDeadLetter({
            executionId,
            workflowId: params.workflow_id,
            failedStepId: outputData?.failedNodeId,
            failedStepName: outputData?.failedNodeName,
            error: { message: executionError.message, stack: executionError.stack },
            inputData: params.input_data,
            workflowSnapshot: { nodes: canvas.nodes, edges: canvas.edges },
            organizationId: workflowRow.organization_id,
          })
          .catch((dlqErr) =>
            this.logger.error(`Dead letter queue error: ${dlqErr.message}`),
          );

        // Return the failed execution with detailed error info
        // This allows frontend to see per-node status
        const errorResponse = {
          ...failedExecution.rows[0],
          result: outputData, // Include the execution data with per-node status
          message: executionError.message
        };

        this.logger.log('Enriching error with execution data');
        this.logger.log('Output data:', JSON.stringify(outputData));

        // Throw with the execution details attached
        const enrichedError: any = new Error(executionError.message);
        enrichedError.statusCode = 500;
        enrichedError.executionResult = errorResponse;

        throw enrichedError;
      }

    } catch (error: any) {
      throw error;
    }
  }


  /**
   * Get next execution number for a workflow
   */
  private async getNextExecutionNumber(workflowId: string): Promise<number> {
    const result = await this.platformService.query(`
      SELECT COALESCE(MAX(execution_number), 0) + 1 as next_number
      FROM workflow_executions
      WHERE workflow_id = $1
    `, [workflowId]);

    return result.rows[0].next_number;
  }

  /**
   * Execute a single node for testing purposes
   */
  async executeSingleNode(
    workflowId: string,
    nodeId: string,
    testData: any = {}
  ): Promise<any> {
    try {
      // Get workflow from database
      const workflowQuery = `
        SELECT * FROM workflows
        WHERE id = $1
      `;

      const workflowResult = await this.platformService.query(workflowQuery, [workflowId]);

      if (workflowResult.rows.length === 0) {
        throw new NotFoundException('Workflow not found');
      }

      const workflowRow = workflowResult.rows[0];
      const canvas = workflowRow.canvas || { nodes: [], edges: [] };

      // Find the specific node
      const node = canvas.nodes.find((n: any) => n.id === nodeId);
      if (!node) {
        throw new NotFoundException(`Node ${nodeId} not found in workflow`);
      }

      this.logger.log(`Executing single node: ${node.data?.label || nodeId} (${node.type})`);

      // For AI_AGENT nodes, we need to execute connected provider nodes first
      // (OpenAI Chat Model, Memory, Tools) and combine their outputs
      let preparedTestData = testData;

      if (node.type === 'AI_AGENT') {
        preparedTestData = await this.prepareAIAgentInputForSingleNode(
          node,
          canvas,
          testData,
          { $workflow: { id: workflowId, name: workflowRow.name }, $env: process.env }
        );
        this.logger.log(`Prepared AI Agent input with keys: ${Object.keys(preparedTestData).join(', ')}`);
      }

      // Execute the node using execution engine
      const result = await this.executionEngine.executeSingleNode(
        node,
        preparedTestData,
        {
          $json: preparedTestData,
          $workflow: { id: workflowId, name: workflowRow.name },
          $env: process.env
        }
      );

      this.logger.log(`Node execution completed: ${nodeId}`);

      // Check if the inner result indicates an error
      const hasError = result?.success === false ||
                       result?.data?.success === false ||
                       result?.error ||
                       result?.data?.error;

      if (hasError) {
        const errorMessage = result?.error?.message ||
                            result?.data?.error?.message ||
                            result?.data?.error ||
                            'Node execution failed';
        return {
          success: false,
          status: 'failed',
          nodeId,
          nodeName: node.data?.label || nodeId,
          nodeType: node.type,
          result,
          error: {
            message: errorMessage,
            code: result?.error?.code || result?.data?.error?.code || 'EXECUTION_ERROR',
            details: result?.error?.details || result?.data?.error?.details
          }
        };
      }

      return {
        success: true,
        status: 'success',
        nodeId,
        nodeName: node.data?.label || nodeId,
        nodeType: node.type,
        result,
        message: 'Node executed successfully'
      };

    } catch (error: any) {
      this.logger.error(`Failed to execute node ${nodeId}:`, error);
      return {
        success: false,
        status: 'failed',
        nodeId,
        error: {
          message: error.message,
          stack: error.stack
        }
      };
    }
  }

  /**
   * Prepare AI Agent input for single node execution
   * This executes connected provider nodes (OpenAI Chat Model, Memory, Tools)
   * and combines their outputs into the format expected by AI Agent
   */
  private async prepareAIAgentInputForSingleNode(
    agentNode: any,
    canvas: { nodes: any[]; edges: any[] },
    testData: any,
    context: any
  ): Promise<any> {
    const result: any = { ...testData };

    // Find all edges targeting this AI Agent node
    const incomingEdges = canvas.edges.filter((e: any) => e.target === agentNode.id);

    this.logger.log(`Found ${incomingEdges.length} edges targeting AI Agent`);

    // Process each incoming edge and execute source nodes as needed
    for (const edge of incomingEdges) {
      const sourceNode = canvas.nodes.find((n: any) => n.id === edge.source);
      if (!sourceNode) {
        this.logger.warn(`Source node not found for edge: ${edge.source}`);
        continue;
      }

      const sourceLabel = sourceNode.data?.label || edge.source;
      const targetHandle = edge.targetHandle;

      this.logger.log(`Processing ${sourceLabel} (${sourceNode.type}) -> ${targetHandle || 'main'}`);

      // Execute the source node to get its output
      try {
        const sourceResult = await this.executionEngine.executeSingleNode(
          sourceNode,
          testData,
          { ...context, $json: testData }
        );

        const sourceOutput = sourceResult?.output?.[0]?.json || sourceResult?.output || {};

        // Assign data based on target handle (same logic as prepareAIAgentInput)
        if (targetHandle === 'chatModel') {
          result.modelConfig = sourceOutput.modelConfig || sourceOutput;
          this.logger.log(`Assigned modelConfig from ${sourceLabel}`);
        } else if (targetHandle === 'memory') {
          result.memory = sourceOutput.memory || sourceOutput;
          this.logger.log(`Assigned memory from ${sourceLabel}`);
        } else if (targetHandle === 'tools') {
          const toolData = sourceOutput.isToolProvider ? sourceOutput : (sourceOutput.tools || sourceOutput);
          if (!result.tools) {
            result.tools = toolData;
          } else if (Array.isArray(result.tools)) {
            result.tools.push(toolData);
          } else {
            result.tools = [result.tools, toolData];
          }
          this.logger.log(`Assigned tools from ${sourceLabel}`);
        }
        // Note: Main handle data already comes from testData
      } catch (error: any) {
        this.logger.warn(`Failed to execute source node ${sourceLabel}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * List workflows
   */
  async listWorkflows(params: {
    project_id?: string;
    organization_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      // Validate multi-tenant context
      if (!params.organization_id) {
        throw new BadRequestException('Organization ID is required');
      }
      if (!params.project_id) {
        throw new BadRequestException('Project ID is required');
      }

      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;

      // Build WHERE conditions with multi-tenant filtering
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Required filters
      conditions.push(`organization_id = $${paramIndex}`);
      values.push(params.organization_id);
      paramIndex++;

      conditions.push(`project_id = $${paramIndex}`);
      values.push(params.project_id);
      paramIndex++;

      // Optional filters
      if (params.status) {
        conditions.push(`status = $${paramIndex}`);
        values.push(params.status);
        paramIndex++;
      }

      const query = `
        SELECT * FROM workflows
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      values.push(limit, offset);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total FROM workflows
        WHERE ${conditions.join(' AND ')}
      `;
      const countValues = values.slice(0, paramIndex - 1);
      const countResult = await this.platformService.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].total);

      const result = await this.platformService.query(query, values);

      return {
        workflows: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Failed to list workflows:', error);
      throw error;
    }
  }

  /**
   * List workflow templates
   */
  async listTemplates(): Promise<any> {
    try {
      // Query workflows marked as templates - select all columns
      const query = `
        SELECT *
        FROM workflows
        WHERE is_template = true
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const result = await this.platformService.query(query);

      this.logger.log(`Found ${result.rows.length} templates`);

      // Transform the data to include a workflow object with canvas and steps
      const templates = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        created_at: row.created_at,
        updated_at: row.updated_at,
        is_template: true,
        category: row.tags?.[0] || null, // Use first tag as category if available
        workflow: {
          canvas: row.canvas || { nodes: [], edges: [] },
          steps: row.steps || [],
          triggers: row.trigger || [],
          conditions: row.conditions || [],
          variables: row.variables || [],
          outputs: row.outputs || [],
          metadata: row.metadata || {}
        }
      }));

      return templates;
    } catch (error) {
      this.logger.error('Failed to list templates:', error);
      // Return empty array instead of throwing to prevent breaking the UI
      return [];
    }
  }

  /**
   * List available connectors
   * Now reads from TypeScript constants instead of database
   */
  listConnectors(params: {
    type?: string;
    search?: string;
    organizationId?: string;
    projectId?: string;
  }): any {
    let connectors = ConnectorLookup.getAll();

    // Filter by category/type
    if (params.type) {
      connectors = connectors.filter(c => c.category === params.type);
    }

    // Filter by search term
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      connectors = connectors.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.display_name.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
      );
    }

    // Map to metadata format for backwards compatibility
    const mappedConnectors = connectors.map(c => ConnectorLookup.toMetadata(c));

    return {
      connectors: mappedConnectors,
      total: mappedConnectors.length
    };
  }

  /**
   * Generate workflow using multi-agent system (NEW)
   * Uses 5 specialized AI agents for higher accuracy
   */
  async generateWorkflowWithAgents(params: {
    prompt: string;
    availableConnectors: string[];
    userId?: string;
    organizationId?: string;
  }): Promise<any> {
    try {
      this.logger.log(`🤖 Using NEW multi-agent system for: "${params.prompt}"`);

      // Call the multi-agent generation method
      const result = await this.aiWorkflowGenerator.generateWorkflowWithAgents(
        params.prompt,
        {
          availableConnectors: params.availableConnectors,
          userId: params.userId,
        }
      );

      return result;
    } catch (error) {
      this.logger.error('Multi-agent generation failed:', error);
      return {
        success: false,
        error: error.message,
        confidence: 0
      };
    }
  }

  /**
   * Process natural language prompt
   */
  async processPrompt(params: {
    prompt: string;
    industry?: string;
    useCase?: string;
    maxSuggestions?: number;
    organizationId?: string;
    projectId?: string;
    userId?: string;
    sessionId?: string; // For conversation memory
  }): Promise<any> {
    try {
      // Validate prompt
      if (!params.prompt || params.prompt.trim().length === 0) {
        throw new BadRequestException('Prompt cannot be empty. Please describe what you want to automate.');
      }

      const cleanPrompt = params.prompt.trim();

      // Check for nonsensical prompts (too short or no meaningful words)
      if (cleanPrompt.length < 10) {
        throw new BadRequestException('Prompt is too short. Please provide a detailed description of what you want to automate.');
      }

      // Check if prompt contains at least some meaningful words (basic validation)
      const words = cleanPrompt.split(/\s+/);
      const meaningfulWords = words.filter(word => word.length > 2 && !/^\d+$/.test(word));
      if (meaningfulWords.length < 2) {
        throw new BadRequestException('Unable to understand your request. Please describe what you want to automate using clear, descriptive language.');
      }

      // Get available connectors
      const availableConnectors = this.getAvailableConnectors();

      // Try AI-powered RAG generation first (if available)
      if (this.aiWorkflowGenerator.isAvailable()) {
        this.logger.log('Using AI-powered RAG workflow generation with two-stage intent detection');

        // 🆕 STAGE 1: Detect user intent
        const sessionId = params.sessionId || `user_${params.userId || 'anonymous'}_${Date.now()}`;
        const conversationMemory = this.aiWorkflowGenerator.getConversationMemory();
        const conversationHistory = await conversationMemory.getHistory(sessionId);

        const intentResult = await this.intentDetection.detectIntent(
          cleanPrompt,
          conversationHistory
        );

        this.logger.log(`🎯 Intent detected: ${intentResult.primaryIntent} (action: ${intentResult.suggestedAction}, confidence: ${intentResult.confidence}%)`);

        // 🆕 STAGE 2: Handle based on detected intent

        // Handle clarification needed
        if (intentResult.clarificationNeeded && intentResult.clarificationQuestion) {
          // Store user message in conversation history
          await conversationMemory.addUserMessage(sessionId, cleanPrompt);

          // Store AI clarification question
          await conversationMemory.addAssistantMessage(sessionId, intentResult.clarificationQuestion);

          return {
            success: true,
            responseType: 'clarification',
            message: intentResult.clarificationQuestion,
            sessionId,
            intent: intentResult,
          };
        }

        // Handle conversational response (no workflow needed)
        if (intentResult.suggestedAction === 'respond_conversationally') {
          const conversationalResponse = await this.aiWorkflowGenerator.generateConversationalResponse(
            cleanPrompt,
            conversationHistory,
            sessionId
          );

          return {
            success: true,
            responseType: 'conversational',
            message: conversationalResponse.message,
            sessionId,
            intent: intentResult,
          };
        }

        // Handle workflow generation (create_workflow or modify_workflow)
        if (intentResult.suggestedAction === 'generate_workflow' ||
            intentResult.suggestedAction === 'fetch_workflow_and_modify') {

          const aiResult = await this.aiWorkflowGenerator.generateWorkflowFromPrompt(
            cleanPrompt,
            {
              availableConnectors,
              userId: params.userId,
              projectId: params.projectId,
              sessionId, // 🆕 Pass session ID for conversation memory
              detectedIntent: intentResult, // 🆕 Pass detected intent to workflow generator
            }
          );

        // If AI generation was successful and confidence is good, use it
        if (aiResult.success && aiResult.confidence >= 60) {
          // Get configured connectors for this project from database
          const configuredConnectors = await this.getConfiguredConnectors(
            params.projectId
          );

          // Analyze required connectors from workflow
          const requiredConnectors = this.extractRequiredConnectors(aiResult.workflow);

          // Check which required connectors are not configured
          const missingConnectors = requiredConnectors.filter(
            (c: string) => !configuredConnectors.some((config: any) => config.connector_type === c)
          );

          // Log the generated workflow structure for debugging
          this.logger.log(`Generated workflow with ${aiResult.workflow.canvas?.nodes?.length || 0} nodes and ${aiResult.workflow.canvas?.edges?.length || 0} edges`);

          if (aiResult.workflow.canvas?.edges?.length === 0) {
            this.logger.warn('WARNING: Generated workflow has nodes but NO EDGES!');
          } else {
            this.logger.log(`Edge connections: ${JSON.stringify(aiResult.workflow.canvas?.edges?.map((e: any) => `${e.source}→${e.target}`))}`);
          }

          // Link credentials to nodes (auto-configure credentials mentioned by user)
          await this.linkCredentialsToNodes(
            aiResult.workflow,
            params.userId,
            params.projectId
          );

          // 🎯 Detect nodes that need configuration
          const nodesToConfigure = this.detectNodesToConfigure(aiResult.workflow);

          return {
            success: true,
            responseType: 'workflow', // 🆕 Indicate this is a workflow response
            confidence: aiResult.confidence,
            workflow: aiResult.workflow,
            sessionId: aiResult.sessionId, // 🆕 Return session ID for follow-up requests
            requiredConnectors,
            configuredConnectors,
            missingConnectors,
            nodesToConfigure, // 🆕 Nodes that need user configuration
            estimatedExecutionTime: 5000,
            complexity: aiResult.workflow.canvas?.nodes?.length > 5 ? 'complex' : 'simple',
            analysis: aiResult.analysis,
            intent: intentResult, // Include detected intent in response
            generationStrategy: 'ai_rag',
            projectId: params.projectId,
          };
        }

        // If AI failed or confidence too low, return error with retry info
        this.logger.warn(`AI generation ${!aiResult.success ? 'failed' : 'low confidence'}: ${aiResult.error || aiResult.confidence}`);

        // Return structured error response for frontend to handle
        return {
          success: false,
          responseType: 'error',
          error: aiResult.error || 'Low confidence in workflow generation',
          confidence: aiResult.confidence,
          message: this.generateErrorMessage(aiResult),
          sessionId: aiResult.sessionId || sessionId,
          originalPrompt: cleanPrompt, // 🆕 Include for retry
          canRetry: true, // 🆕 Frontend can show "Try again" button
          suggestions: [
            'Try rephrasing your request with more details',
            'Specify which connectors you want to use',
            'Break down complex workflows into steps'
          ],
        };
        }
      }

      // Fallback to hybrid orchestrator
      if (!this.hybridOrchestrator) {
        // No fallback available, return error
        return {
          success: false,
          responseType: 'error',
          error: 'Workflow generation not available',
          message: 'I encountered an issue generating the workflow. The AI service is currently unavailable.',
          originalPrompt: cleanPrompt,
          canRetry: false,
        };
      }

      this.logger.log('Falling back to hybrid orchestrator');
      const result = await this.hybridOrchestrator.generateWorkflow(cleanPrompt);

      // Analyze required connectors
      const requiredConnectors = result.workflow.steps
        .map((step: any) => step.connector)
        .filter((c: string, i: number, a: string[]) => a.indexOf(c) === i);

      // Get configured connectors for this project from database
      const configuredConnectors = await this.getConfiguredConnectors(
        params.projectId
      );

      // Check which required connectors are not configured
      const missingConnectors = requiredConnectors.filter(
        (c: string) => !configuredConnectors.some((config: any) => config.connector_type === c)
      );

      return {
        success: true,
        confidence: result.confidence,
        workflow: result.workflow,
        requiredConnectors,
        configuredConnectors,
        missingConnectors,
        estimatedExecutionTime: 5000,
        complexity: result.workflow.complexity || 'medium',
        analysis: result.analysis,
        generationStrategy: result.strategy,
        projectId: params.projectId
      };
    } catch (error) {
      this.logger.error('Failed to process prompt:', error);

      // Return structured error instead of throwing
      return {
        success: false,
        responseType: 'error',
        error: error.message || 'Unexpected error',
        message: 'I encountered an unexpected issue generating the workflow. Please try again.',
        originalPrompt: params.prompt,
        sessionId: params.sessionId,
        canRetry: true,
        suggestions: [
          'Try again with a simpler request',
          'Provide more specific details about what you want to automate'
        ],
      };
    }
  }

  /**
   * Generate helpful error message based on AI result
   */
  private generateErrorMessage(aiResult: any): string {
    if (!aiResult.success && aiResult.error) {
      // Specific error from AI
      if (aiResult.error.includes('API key')) {
        return 'AI service configuration issue. Please contact support.';
      }
      if (aiResult.error.includes('embedding')) {
        return 'I had trouble understanding your request. Could you rephrase it?';
      }
      return `I encountered an issue: ${aiResult.error}. Could you provide more details or rephrase your request?`;
    }

    if (aiResult.confidence < 60) {
      // Low confidence
      return `I'm not confident about this workflow (${aiResult.confidence}% confidence). Could you provide more details or rephrase your request?`;
    }

    return 'I encountered an issue generating the workflow. Could you provide more details or rephrase your request?';
  }

  /**
   * Analyze prompt and return user-friendly plan without executing
   */
  async analyzePrompt(params: {
    prompt: string;
    conversationId: string;
    userId?: string;
  }): Promise<{
    understanding: string;
    plan: string[];
    estimatedNodes: number;
    requiredConnectors?: string[];
    confidence?: number;
  }> {
    try {
      this.logger.log(`Analyzing prompt: "${params.prompt}" (conversation: ${params.conversationId})`);

      const cleanPrompt = params.prompt.trim();

      // Validate prompt
      if (!cleanPrompt || cleanPrompt.length < 5) {
        return {
          understanding: "Your request is too short to analyze properly.",
          plan: ["Please provide more details about what you want to automate"],
          estimatedNodes: 0,
          confidence: 0
        };
      }

      // 🔄 Load conversation context with sliding window (last 10 messages + summary)
      const conversationMemory = this.aiWorkflowGenerator.getConversationMemory();
      const context = await conversationMemory.getContextForAI(params.conversationId);

      this.logger.debug(
        `Loaded context: ${context.messages.length} recent messages` +
        (context.summary ? `, with summary of ${context.totalMessages - context.messages.length} older messages` : '') +
        ` (total: ${context.totalMessages})`
      );

      // 💾 Save user prompt to conversation memory
      await conversationMemory.addUserMessage(params.conversationId, cleanPrompt);

      // Use AI to analyze the prompt with context
      if (this.aiWorkflowGenerator.isAvailable()) {
        try {
          // Ask AI to generate a conversational, technical analysis
          const aiAnalysis = await this.aiWorkflowGenerator.generateConversationalAnalysis(
            cleanPrompt,
            {
              availableConnectors: this.getAvailableConnectors(),
              userId: params.userId,
              sessionId: params.conversationId,
            }
          );

          if (aiAnalysis.success) {
            const analysisResult = {
              understanding: aiAnalysis.analysis,  // Natural conversational analysis
              plan: aiAnalysis.steps,              // Technical step-by-step breakdown
              estimatedNodes: aiAnalysis.estimatedNodes || 2,
              requiredConnectors: aiAnalysis.requiredConnectors || [],
              confidence: aiAnalysis.confidence || 85
            };

            // 💾 Save analysis to conversation memory
            await conversationMemory.addAssistantMessage(
              params.conversationId,
              aiAnalysis.analysis  // Save the natural conversation
            );

            this.logger.log(`✅ Conversational analysis saved (confidence: ${analysisResult.confidence}%)`);

            return analysisResult;
          }
        } catch (error) {
          this.logger.error('AI analysis failed:', error);
          // Fall through to basic analysis
        }
      }

      // Fallback: Basic keyword-based analysis
      const basicAnalysis = this.performBasicAnalysis(cleanPrompt);

      // 💾 Save basic analysis to conversation memory
      const analysisMessage = `Analysis: ${basicAnalysis.understanding}\n\nPlan:\n${basicAnalysis.plan.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
      await conversationMemory.addAssistantMessage(params.conversationId, analysisMessage);

      return basicAnalysis;

    } catch (error) {
      this.logger.error('Failed to analyze prompt:', error);
      throw new BadRequestException('Unable to analyze your request. Please try rephrasing it.');
    }
  }

  /**
   * Chat with AI assistant about Fluxturn (general Q&A, no workflow generation)
   */
  async chatWithAssistant(params: {
    prompt: string;
    conversationId: string;
    userId?: string;
  }): Promise<{
    message: string;
    suggestions?: string[];
  }> {
    try {
      this.logger.log(`Chat mode - User question: "${params.prompt}"`);

      const cleanPrompt = params.prompt.trim();

      // Validate prompt
      if (!cleanPrompt || cleanPrompt.length < 2) {
        return {
          message: "Could you please provide more details about your question?",
          suggestions: ['View available connectors', 'Learn about triggers', 'Explore templates']
        };
      }

      // Load conversation context
      const conversationMemory = this.aiWorkflowGenerator.getConversationMemory();
      const context = await conversationMemory.getContextForAI(params.conversationId);

      // Save user message
      await conversationMemory.addUserMessage(params.conversationId, cleanPrompt);

      // TODO: Use AI to answer questions about Fluxturn when AI method is implemented
      // For now, using basic keyword-based response

      // Generate response using keyword matching
      const responseMessage = this.generateBasicChatResponse(cleanPrompt);
      await conversationMemory.addAssistantMessage(params.conversationId, responseMessage.message);

      return responseMessage;

    } catch (error) {
      this.logger.error('Failed to chat with assistant:', error);
      throw new BadRequestException('Unable to process your question. Please try again.');
    }
  }

  /**
   * Generate basic chat response for fallback
   */
  private generateBasicChatResponse(prompt: string): { message: string; suggestions?: string[] } {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('connector') || lowerPrompt.includes('integration')) {
      return {
        message: "Fluxturn supports various connectors including Facebook, Twitter, Gmail, Slack, and many more. Each connector has specific triggers and actions you can use in your workflows.",
        suggestions: ['View all connectors', 'Learn about OAuth', 'Build a workflow']
      };
    }

    if (lowerPrompt.includes('trigger')) {
      return {
        message: "Triggers are events that start your workflows. Fluxturn offers Manual triggers, Webhooks, Schedule triggers, and connector-specific triggers like 'When a new email arrives' or 'When someone comments on Facebook'.",
        suggestions: ['View all triggers', 'Create a workflow', 'Learn about webhooks']
      };
    }

    if (lowerPrompt.includes('how') || lowerPrompt.includes('help')) {
      return {
        message: "I can help you with questions about Fluxturn's features, connectors, workflows, and best practices. For specific workflow building tasks, please switch to the Build tab.",
        suggestions: ['View documentation', 'Explore templates', 'Build a workflow']
      };
    }

    return {
      message: "I'm here to help with questions about Fluxturn! Could you provide more details about what you'd like to know?",
      suggestions: ['Available connectors', 'How triggers work', 'View templates']
    };
  }

  /**
   * Generate user-friendly understanding from AI result
   */
  private generateUnderstanding(prompt: string, aiResult: any): string {
    // Check for common workflow patterns
    if (prompt.toLowerCase().includes('telegram') && prompt.toLowerCase().includes('gmail')) {
      return 'You want to forward new Telegram messages to your Gmail account.';
    }
    if (prompt.toLowerCase().includes('slack') && prompt.toLowerCase().includes('email')) {
      return 'You want to integrate Slack with email notifications.';
    }
    if (prompt.toLowerCase().includes('schedule') || prompt.toLowerCase().includes('daily')) {
      return 'You want to create a scheduled workflow that runs automatically.';
    }

    // Generic understanding
    const analysis = aiResult.analysis || {};
    if (analysis.summary) {
      return analysis.summary;
    }

    return `You want to automate a workflow based on: "${prompt}"`;
  }

  /**
   * Generate step-by-step plan from workflow structure
   */
  private generatePlanFromWorkflow(workflow: any): string[] {
    const plan: string[] = [];
    const nodes = workflow.canvas?.nodes || [];

    nodes.forEach((node: any, index: number) => {
      const nodeType = node.type || 'unknown';
      const nodeName = node.data?.name || node.data?.label || nodeType;

      if (nodeType === 'trigger' || nodeType.includes('Trigger')) {
        plan.push(`Set up ${nodeName} to detect events`);
      } else if (nodeType.includes('Email') || nodeType.includes('Gmail')) {
        plan.push(`Send email using ${nodeName}`);
      } else if (nodeType.includes('Telegram')) {
        plan.push(`Process Telegram message using ${nodeName}`);
      } else {
        plan.push(`Execute ${nodeName} action`);
      }
    });

    if (plan.length === 0) {
      plan.push('Set up trigger to start the workflow');
      plan.push('Process the data');
      plan.push('Execute the final action');
    }

    return plan;
  }

  /**
   * Perform basic keyword-based analysis (fallback)
   */
  private performBasicAnalysis(prompt: string): {
    understanding: string;
    plan: string[];
    estimatedNodes: number;
    requiredConnectors?: string[];
    confidence: number;
  } {
    const lowerPrompt = prompt.toLowerCase();
    const connectors: string[] = [];
    const plan: string[] = [];
    let understanding = '';
    let estimatedNodes = 2;

    // Detect connectors
    if (lowerPrompt.includes('telegram')) connectors.push('Telegram');
    if (lowerPrompt.includes('gmail') || lowerPrompt.includes('email')) connectors.push('Gmail');
    if (lowerPrompt.includes('slack')) connectors.push('Slack');
    if (lowerPrompt.includes('google sheets') || lowerPrompt.includes('spreadsheet')) connectors.push('Google Sheets');

    // Generate understanding
    if (connectors.length >= 2) {
      understanding = `You want to connect ${connectors[0]} with ${connectors[1]}.`;
      plan.push(`Set up ${connectors[0]} trigger`);
      plan.push(`Extract and process the data`);
      plan.push(`Send data to ${connectors[1]}`);
      estimatedNodes = 3;
    } else if (connectors.length === 1) {
      understanding = `You want to work with ${connectors[0]}.`;
      plan.push(`Set up ${connectors[0]} integration`);
      plan.push(`Configure the action`);
      estimatedNodes = 2;
    } else {
      understanding = 'You want to create a workflow automation.';
      plan.push('Define the trigger event');
      plan.push('Process the data');
      plan.push('Execute the action');
      estimatedNodes = 3;
    }

    return {
      understanding,
      plan,
      estimatedNodes,
      requiredConnectors: connectors.length > 0 ? connectors : undefined,
      confidence: connectors.length > 0 ? 70 : 50
    };
  }

  /**
   * Detect nodes that need user configuration
   */
  private detectNodesToConfigure(workflow: any): Array<{nodeId: string; nodeType: string; nodeName: string; reason: string}> {
    const nodesToConfigure: Array<{nodeId: string; nodeType: string; nodeName: string; reason: string}> = [];

    if (!workflow.canvas?.nodes) {
      return nodesToConfigure;
    }

    workflow.canvas.nodes.forEach((node: any) => {
      const nodeType = node.type;
      const nodeId = node.id;
      const nodeName = node.data?.label || node.data?.name || nodeId;

      // Check connector actions - need action selection
      if (nodeType === 'CONNECTOR_ACTION' && !node.data?.actionId) {
        nodesToConfigure.push({
          nodeId,
          nodeType,
          nodeName,
          reason: 'Select connector action'
        });
      }

      // Check connector triggers - need trigger selection
      if (nodeType === 'CONNECTOR_TRIGGER' && !node.data?.triggerId) {
        nodesToConfigure.push({
          nodeId,
          nodeType,
          nodeName,
          reason: 'Configure trigger settings'
        });
      }

      // Check form triggers - need form fields
      if (nodeType === 'FORM_TRIGGER' && (!node.data?.fields || node.data.fields.length === 0)) {
        nodesToConfigure.push({
          nodeId,
          nodeType,
          nodeName,
          reason: 'Design form fields'
        });
      }

      // Check webhook triggers - need verification
      if (nodeType === 'WEBHOOK' && !node.data?.webhookUrl) {
        nodesToConfigure.push({
          nodeId,
          nodeType,
          nodeName,
          reason: 'Set up webhook URL'
        });
      }

      // Check schedule triggers - need cron expression
      if (nodeType === 'SCHEDULE_TRIGGER' && !node.data?.cronExpression) {
        nodesToConfigure.push({
          nodeId,
          nodeType,
          nodeName,
          reason: 'Set schedule timing'
        });
      }

      // Check AI nodes - may need API keys or models
      if ((nodeType === 'OPENAI_CHAT_MODEL' || nodeType === 'AI') && !node.data?.model) {
        nodesToConfigure.push({
          nodeId,
          nodeType,
          nodeName,
          reason: 'Select AI model'
        });
      }

      // Check conditional nodes - need conditions
      if (nodeType === 'CONDITIONAL' && (!node.data?.conditions || node.data.conditions.length === 0)) {
        nodesToConfigure.push({
          nodeId,
          nodeType,
          nodeName,
          reason: 'Define conditions'
        });
      }
    });

    return nodesToConfigure;
  }

  /**
   * Extract required connectors from workflow canvas
   */
  private extractRequiredConnectors(workflow: any): string[] {
    const connectors = new Set<string>();

    try {
      // Extract from canvas nodes
      if (workflow.canvas?.nodes) {
        workflow.canvas.nodes.forEach((node: any) => {
          // Check for CONNECTOR_TRIGGER or CONNECTOR_ACTION types
          if (node.type === 'CONNECTOR_TRIGGER' || node.type === 'CONNECTOR_ACTION') {
            const connectorType = node.data?.connector ||
                                 node.data?.connectorType ||
                                 node.data?.connector_type;
            if (connectorType) {
              connectors.add(connectorType);
            }
          }
        });
      }

      // Extract from triggers array (legacy support)
      if (workflow.triggers) {
        workflow.triggers.forEach((trigger: any) => {
          const connectorType = trigger.config?.connector ||
                               trigger.connector ||
                               trigger.connectorType;
          if (connectorType) {
            connectors.add(connectorType);
          }
        });
      }

      // Extract from steps (legacy support)
      if (workflow.steps) {
        workflow.steps.forEach((step: any) => {
          const connectorType = step.connector ||
                               step.connectorType ||
                               step.config?.connector;
          if (connectorType) {
            connectors.add(connectorType);
          }
        });
      }
    } catch (error) {
      this.logger.error('Error extracting required connectors:', error);
    }

    return Array.from(connectors);
  }

  /**
   * Analyze workflow prompt
   */
  async analyzeWorkflowPrompt(params: {
    prompt: string;
    organization_id?: string;
    project_id?: string;
  }): Promise<any> {
    try {
      // Use the hybrid orchestrator to generate a workflow and extract analysis
      if (this.hybridOrchestrator) {
        const result = await this.hybridOrchestrator.generateWorkflow(
          params.prompt
        );
        
        // Extract analysis from the generation result
        return {
          triggers: result.workflow.triggers || [],
          actions: result.workflow.steps?.map((s: any) => s.action) || [],
          conditions: result.workflow.conditions || [],
          requiredConnectors: result.workflow.steps?.map((s: any) => s.connector).filter((c: string, i: number, a: string[]) => a.indexOf(c) === i) || [],
          complexity: result.workflow.complexity || 'simple',
          confidence: result.confidence
        };
      }
      
      // Fallback to basic analysis
      return {
        triggers: [],
        actions: [],
        conditions: [],
        requiredConnectors: [],
        complexity: 'simple'
      };
    } catch (error) {
      this.logger.error('Failed to analyze prompt:', error);
      throw error;
    }
  }

  /**
   * Find similar workflows
   */
  async findSimilarWorkflows(params: {
    prompt: string;
    organization_id?: string;
    project_id?: string;
    limit?: number;
  }): Promise<any> {
    try {
      // For now, return templates as similar workflows
      const limit = params.limit || 5;
      
      const query = `
        SELECT * FROM workflow_templates 
        WHERE is_public = true
        ORDER BY usage_count DESC, rating DESC
        LIMIT $1
      `;
      
      const result = await this.platformService.query(query, [limit]);
      
      return {
        workflows: result.rows,
        total: result.rows.length
      };
    } catch (error) {
      this.logger.error('Failed to find similar workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflow details
   */
  async getWorkflow(
    workflowId: string,
    organizationId?: string,
    projectId?: string
  ): Promise<any> {
    try {
      // Build WHERE conditions with multi-tenant filtering
      const conditions = ['id = $1'];
      const params: any[] = [workflowId];
      let paramIndex = 2;

      if (organizationId) {
        conditions.push(`organization_id = $${paramIndex}`);
        params.push(organizationId);
        paramIndex++;
      }
      if (projectId) {
        conditions.push(`project_id = $${paramIndex}`);
        params.push(projectId);
        paramIndex++;
      }

      const query = `
        SELECT * FROM workflows
        WHERE ${conditions.join(' AND ')}
      `;

      const result = await this.platformService.query(query, params);

      if (result.rows.length === 0) {
        throw new NotFoundException('Workflow not found');
      }

      const row = result.rows[0];

      // Transform database row into expected format
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        workflow: {
          triggers: row.trigger || [],
          steps: row.steps || [],
          conditions: row.conditions || [],
          variables: row.variables || [],
          outputs: row.outputs || [],
          canvas: row.canvas || { nodes: [], edges: [] }
        }
      };
    } catch (error) {
      this.logger.error('Failed to get workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(
    workflowId: string,
    organizationId?: string,
    projectId?: string
  ): Promise<any> {
    try {
      const query = `
        SELECT * FROM workflow_executions
        WHERE workflow_id = $1
        AND ($2::uuid IS NULL OR organization_id = $2)
        AND ($3::uuid IS NULL OR project_id = $3)
        ORDER BY started_at DESC
        LIMIT 50
      `;

      const result = await this.platformService.query(
        query,
        [workflowId, organizationId, projectId]
      );

      return {
        executions: result.rows,
        total: result.rows.length
      };
    } catch (error) {
      this.logger.error('Failed to get execution history:', error);
      throw error;
    }
  }

  /**
   * Get output data from the last completed execution
   * Used by FieldPicker to show actual field structures
   */
  async getLastExecutionOutput(workflowId: string): Promise<any> {
    try {
      const query = `
        SELECT output_data
        FROM workflow_executions
        WHERE workflow_id = $1
        AND status = 'completed'
        AND output_data IS NOT NULL
        ORDER BY completed_at DESC
        LIMIT 1
      `;

      const result = await this.platformService.query(query, [workflowId]);

      if (result.rows.length === 0) {
        return {
          success: true,
          hasData: false,
          data: null,
          message: 'No completed executions found for this workflow'
        };
      }

      return {
        success: true,
        hasData: true,
        data: result.rows[0].output_data
      };
    } catch (error) {
      this.logger.error('Failed to get last execution output:', error);
      throw error;
    }
  }

  /**
   * Get all workflow executions with pagination
   */
  async getAllExecutions(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    organization_id?: string;
    project_id?: string;
  }): Promise<any> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;

      // Build WHERE clauses with multi-tenant filtering
      const whereConditions: string[] = [];
      const countParams: any[] = [];
      let paramIndex = 1;

      // Multi-tenant filtering
      if (params.organization_id) {
        whereConditions.push(`we.organization_id = $${paramIndex}`);
        countParams.push(params.organization_id);
        paramIndex++;
      }
      if (params.project_id) {
        whereConditions.push(`we.project_id = $${paramIndex}`);
        countParams.push(params.project_id);
        paramIndex++;
      }

      // Status filtering
      if (params.status) {
        whereConditions.push(`we.status = $${paramIndex}`);
        countParams.push(params.status);
        paramIndex++;
      }

      // Search filtering
      if (params.search) {
        whereConditions.push(`w.name ILIKE $${paramIndex}`);
        countParams.push(`%${params.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM workflow_executions we
        LEFT JOIN workflows w ON we.workflow_id = w.id
        ${whereClause}
      `;

      // Build data query params (same conditions + limit + offset)
      const dataParams = [...countParams];
      const limitParam = `$${paramIndex}`;
      const offsetParam = `$${paramIndex + 1}`;
      dataParams.push(limit, offset);

      // Get executions with workflow names
      const dataQuery = `
        SELECT
          we.id,
          we.workflow_id,
          w.name as workflow_name,
          we.status,
          we.trigger_type,
          we.steps_completed,
          we.total_steps,
          we.duration_ms,
          we.started_at,
          we.completed_at,
          we.error,
          we.execution_number
        FROM workflow_executions we
        LEFT JOIN workflows w ON we.workflow_id = w.id
        ${whereClause}
        ORDER BY we.started_at DESC
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `;

      const [countResult, dataResult] = await Promise.all([
        this.platformService.query(countQuery, countParams),
        this.platformService.query(dataQuery, dataParams)
      ]);

      const total = parseInt(countResult.rows[0]?.total || '0');
      const totalPages = Math.ceil(total / limit);

      return {
        executions: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    } catch (error) {
      this.logger.error('Failed to get all executions:', error);
      throw error;
    }
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(
    organizationId?: string,
    projectId?: string
  ): Promise<any> {
    try {
      // Build WHERE conditions with multi-tenant filtering
      const conditions: string[] = ['started_at >= NOW() - INTERVAL \'7 days\''];
      const params: any[] = [];
      let paramIndex = 1;

      if (organizationId) {
        conditions.push(`organization_id = $${paramIndex}`);
        params.push(organizationId);
        paramIndex++;
      }
      if (projectId) {
        conditions.push(`project_id = $${paramIndex}`);
        params.push(projectId);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Get total executions in last 7 days
      const last7DaysQuery = `
        SELECT COUNT(*) as total
        FROM workflow_executions
        WHERE ${whereClause}
      `;

      // Get executions by status in last 7 days
      const statusQuery = `
        SELECT
          status,
          COUNT(*) as count
        FROM workflow_executions
        WHERE ${whereClause}
        GROUP BY status
      `;

      // Get daily execution data for the chart
      const dailyQuery = `
        SELECT
          DATE(started_at) as date,
          COUNT(*) FILTER (WHERE status = 'completed') as success,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM workflow_executions
        WHERE ${whereClause}
        GROUP BY DATE(started_at)
        ORDER BY date ASC
      `;

      const [totalResult, statusResult, dailyResult] = await Promise.all([
        this.platformService.query(last7DaysQuery, params),
        this.platformService.query(statusQuery, params),
        this.platformService.query(dailyQuery, params)
      ]);

      const totalExecutions = parseInt(totalResult.rows[0]?.total || '0');
      const statusBreakdown = statusResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {});

      const successCount = statusBreakdown['completed'] || 0;
      const failedCount = statusBreakdown['failed'] || 0;
      const successRate = totalExecutions > 0
        ? ((successCount / totalExecutions) * 100).toFixed(1)
        : '0.0';

      return {
        totalExecutions,
        last7Days: totalExecutions,
        successRate: parseFloat(successRate),
        successCount,
        failedCount,
        statusBreakdown,
        dailyData: dailyResult.rows
      };
    } catch (error) {
      this.logger.error('Failed to get execution stats:', error);
      throw error;
    }
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(
    workflowId: string,
    params: {
      name?: string;
      description?: string;
      workflow?: any;
      status?: string;
      template_id?: string;
      updated_by?: string;
      organization_id?: string;
      project_id?: string;
    }
  ): Promise<any> {
    try {
      // Build WHERE conditions to check if workflow exists with multi-tenant filtering
      const checkConditions = ['id = $1'];
      const checkParams: any[] = [workflowId];
      let checkParamIndex = 2;

      if (params.organization_id) {
        checkConditions.push(`organization_id = $${checkParamIndex}`);
        checkParams.push(params.organization_id);
        checkParamIndex++;
      }
      if (params.project_id) {
        checkConditions.push(`project_id = $${checkParamIndex}`);
        checkParams.push(params.project_id);
        checkParamIndex++;
      }

      const checkQuery = `
        SELECT id FROM workflows WHERE ${checkConditions.join(' AND ')}
      `;
      const checkResult = await this.platformService.query(checkQuery, checkParams);

      if (checkResult.rows.length === 0) {
        throw new NotFoundException('Workflow not found');
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [workflowId];
      let paramIndex = 2;

      if (params.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(params.name);
      }

      if (params.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(params.description);
      }

      if (params.workflow !== undefined) {
        // Extract components from workflow object
        if (params.workflow.triggers !== undefined) {
          updates.push(`trigger = $${paramIndex++}`);
          values.push(JSON.stringify(params.workflow.triggers));
        }
        if (params.workflow.steps !== undefined) {
          updates.push(`steps = $${paramIndex++}`);
          values.push(JSON.stringify(params.workflow.steps));
        }
        if (params.workflow.conditions !== undefined) {
          updates.push(`conditions = $${paramIndex++}`);
          values.push(JSON.stringify(params.workflow.conditions));
        }
        if (params.workflow.variables !== undefined) {
          updates.push(`variables = $${paramIndex++}`);
          values.push(JSON.stringify(params.workflow.variables));
        }
        if (params.workflow.outputs !== undefined) {
          updates.push(`outputs = $${paramIndex++}`);
          values.push(JSON.stringify(params.workflow.outputs));
        }
        if (params.workflow.canvas !== undefined) {
          updates.push(`canvas = $${paramIndex++}`);
          values.push(JSON.stringify(params.workflow.canvas));
        }

        // Auto-extract and update required_connectors
        const requiredConnectors = this.extractRequiredConnectors(params.workflow);
        updates.push(`required_connectors = $${paramIndex++}`);
        values.push(requiredConnectors);
      }

      if (params.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(params.status);
      }

      if (params.template_id !== undefined) {
        // Validate that template_id exists in workflow_templates table
        let validatedTemplateId = params.template_id;

        if (params.template_id) {
          try {
            const templateCheckResult = await this.platformService.query(
              `SELECT id FROM workflow_templates WHERE id = $1`,
              [params.template_id]
            );

            if (templateCheckResult.rows.length === 0) {
              this.logger.warn(`Template ID ${params.template_id} not found in workflow_templates table. Setting to null.`);
              validatedTemplateId = null;
            }
          } catch (error) {
            this.logger.error(`Error validating template_id: ${error.message}`);
            validatedTemplateId = null;
          }
        }

        updates.push(`template_id = $${paramIndex++}`);
        values.push(validatedTemplateId);
      }

      if (updates.length === 0) {
        throw new BadRequestException('No fields to update');
      }

      // Always update the updated_at timestamp
      updates.push('updated_at = NOW()');

      // Build WHERE clause with multi-tenant filtering
      const whereConditions = ['id = $1'];
      if (params.organization_id) {
        whereConditions.push(`organization_id = $${paramIndex}`);
        values.push(params.organization_id);
        paramIndex++;
      }
      if (params.project_id) {
        whereConditions.push(`project_id = $${paramIndex}`);
        values.push(params.project_id);
        paramIndex++;
      }

      const query = `
        UPDATE workflows
        SET ${updates.join(', ')}
        WHERE ${whereConditions.join(' AND ')}
        RETURNING *
      `;

      const result = await this.platformService.query(query, values);
      const updatedWorkflow = result.rows[0];

      // Increment template use_count if template_id was set
      if (params.template_id) {
        try {
          this.logger.log(`Incrementing use count for template: ${params.template_id}`);
          const res = await this.platformService.query(
            `UPDATE workflow_templates
             SET use_count = use_count + 1
             WHERE id = $1
             RETURNING use_count`,
            [params.template_id]
          );
          if (res.rows.length > 0) {
            this.logger.log(`Template ${params.template_id} use count updated to: ${res.rows[0].use_count}`);
          } else {
            this.logger.warn(`Template ${params.template_id} not found for use count increment`);
          }
        } catch (error) {
          // Don't fail the whole update if use_count increment fails
          this.logger.error(`Failed to increment use count for template ${params.template_id}:`, error);
        }
      }

      // Store trigger results to return to client
      let triggerResults: any = null;

      // If workflow status changed to 'active' or 'published', activate ALL triggers
      if (params.status && (params.status === 'active' || params.status === 'published')) {
        this.logger.log(`Workflow ${workflowId} activated, activating triggers...`);
        const activationResults = await this.triggerManager.activateWorkflowTriggers(workflowId, updatedWorkflow);

        // Format trigger results for client
        triggerResults = {
          activated: true,
          triggers: activationResults.map(result => ({
            success: result.success,
            message: result.message,
            data: result.data,
            error: result.error
          }))
        };

        this.logger.log(`Trigger activation results:`, JSON.stringify(triggerResults, null, 2));
      }

      // If workflow status changed to 'inactive' or 'draft', deactivate ALL triggers
      if (params.status && (params.status === 'inactive' || params.status === 'draft')) {
        this.logger.log(`Workflow ${workflowId} deactivated, deactivating triggers...`);
        const deactivationResults = await this.triggerManager.deactivateWorkflowTriggers(workflowId, updatedWorkflow);

        // Format trigger results for client
        triggerResults = {
          activated: false,
          triggers: deactivationResults.map(result => ({
            success: result.success,
            message: result.message
          }))
        };
      }

      // Return workflow data with trigger results
      return {
        ...updatedWorkflow,
        triggerResults
      };
    } catch (error) {
      this.logger.error('Failed to update workflow:', error);
      throw error;
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(
    workflowId: string,
    organizationId?: string,
    projectId?: string
  ): Promise<any> {
    try {
      // Get workflow to deactivate triggers
      const workflow = await this.getWorkflow(workflowId, organizationId, projectId);
      if (workflow) {
        // Deactivate ALL triggers before deletion
        await this.triggerManager.deactivateWorkflowTriggers(workflowId, workflow);
      }

      // Build WHERE conditions with multi-tenant filtering
      const conditions = ['id = $1'];
      const params: any[] = [workflowId];
      let paramIndex = 2;

      if (organizationId) {
        conditions.push(`organization_id = $${paramIndex}`);
        params.push(organizationId);
        paramIndex++;
      }
      if (projectId) {
        conditions.push(`project_id = $${paramIndex}`);
        params.push(projectId);
        paramIndex++;
      }

      const query = `
        DELETE FROM workflows
        WHERE ${conditions.join(' AND ')}
        RETURNING id, name
      `;

      const result = await this.platformService.query(query, params);

      if (result.rows.length === 0) {
        throw new NotFoundException('Workflow not found');
      }

      return {
        message: 'Workflow deleted successfully',
        workflow: result.rows[0]
      };
    } catch (error) {
      this.logger.error('Failed to delete workflow:', error);
      throw error;
    }
  }

  /**
   * Get trigger status for a workflow
   * Delegates to TriggerManagerService
   */
  async getTriggerStatus(workflowId: string, triggerType: TriggerType): Promise<any> {
    return await this.triggerManager.getTriggerStatus(workflowId, triggerType);
  }

  /**
   * Manually trigger a specific trigger action
   * (e.g., manual poll for Gmail)
   */
  async triggerManualAction(workflowId: string, triggerType: TriggerType, action: string): Promise<any> {
    this.logger.log(`Triggering manual action '${action}' for ${triggerType} on workflow ${workflowId}`);

    // This can be extended with more trigger-specific actions
    // For now, just delegate to trigger manager or specific services
    if (triggerType === TriggerType.GMAIL && action === 'poll') {
      const triggerService = await this.triggerManager['getTriggerService'](triggerType) as any;
      if (triggerService.triggerManualPoll) {
        return await triggerService.triggerManualPoll(workflowId);
      }
    }

    throw new BadRequestException(`Action '${action}' not supported for trigger type ${triggerType}`);
  }

  /**
   * Get webhook URL for a workflow
   * This shows what the webhook URL will be when the workflow is activated
   * Useful for displaying in UI before activation
   */
  async getWorkflowWebhookUrl(workflowId: string): Promise<any> {
    try {
      // Get workflow to determine trigger types
      const workflow = await this.getWorkflow(workflowId);

      if (!workflow) {
        throw new NotFoundException(`Workflow ${workflowId} not found`);
      }

      const canvas = workflow.workflow?.canvas || workflow.canvas;
      const nodes = canvas?.nodes || [];

      // Find all trigger nodes
      const triggerNodes = nodes.filter((node: any) =>
        node.type === 'TELEGRAM_TRIGGER' ||
        node.type === 'WEBHOOK_TRIGGER' ||
        node.type === 'FORM_TRIGGER' ||
        node.type === 'FACEBOOK_TRIGGER' ||
        node.type === 'GMAIL_TRIGGER' ||
        (node.type === 'CONNECTOR_TRIGGER' && node.data?.connectorType)
      );

      if (triggerNodes.length === 0) {
        return {
          hasWebhookTriggers: false,
          message: 'No webhook-based triggers found in this workflow'
        };
      }

      const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
      const cleanBaseUrl = baseUrl.replace(/\/$/, '');

      // Generate webhook URLs for each trigger
      const webhookUrls = triggerNodes.map((node: any) => {
        let triggerType = node.type;
        let connectorType = null;

        if (node.type === 'CONNECTOR_TRIGGER') {
          connectorType = node.data?.connectorType;
          triggerType = `${connectorType?.toUpperCase()}_TRIGGER`;
        }

        let webhookUrl = '';
        let setupInstructions = '';

        switch (triggerType) {
          case 'TELEGRAM_TRIGGER':
            webhookUrl = `${cleanBaseUrl}/api/v1/webhooks/telegram/${workflowId}`;
            setupInstructions = 'This webhook will be automatically registered when you activate the workflow. No manual setup required!';
            break;
          case 'WEBHOOK_TRIGGER':
            webhookUrl = `${cleanBaseUrl}/api/v1/webhook/${workflowId}`;
            setupInstructions = 'Use this URL to receive webhooks from any external service (Stripe, GitHub, etc.)';
            break;
          case 'FORM_TRIGGER':
            webhookUrl = `${cleanBaseUrl}/api/v1/public/forms/${workflowId}/submit`;
            setupInstructions = 'This URL accepts form submissions';
            break;
          case 'FACEBOOK_TRIGGER':
            webhookUrl = `${cleanBaseUrl}/api/v1/webhooks/facebook/${workflowId}`;
            setupInstructions = 'Configure this URL and verification token in Facebook App webhook settings';
            break;
          case 'GMAIL_TRIGGER':
            webhookUrl = `${cleanBaseUrl}/api/v1/webhooks/gmail/${workflowId}`;
            setupInstructions = 'This webhook will be automatically registered via Gmail API when you activate the workflow';
            break;
          default:
            // Handle CONNECTOR_TRIGGER types
            if (connectorType === 'facebook_graph' || connectorType === 'facebook') {
              webhookUrl = `${cleanBaseUrl}/api/v1/webhooks/facebook/${workflowId}`;
              setupInstructions = 'Configure this URL and verification token in Facebook App webhook settings';
            } else if (connectorType === 'telegram') {
              webhookUrl = `${cleanBaseUrl}/api/v1/webhooks/telegram/${workflowId}`;
              setupInstructions = 'This webhook will be automatically registered when you activate the workflow';
            } else {
              webhookUrl = `${cleanBaseUrl}/api/v1/webhooks/${connectorType || 'unknown'}/${workflowId}`;
              setupInstructions = 'Webhook URL for this trigger';
            }
        }

        const webhookInfo: any = {
          nodeId: node.id,
          triggerType,
          connectorType,
          webhookUrl,
          setupInstructions,
          isHttps: webhookUrl.startsWith('https://'),
          httpsRequired: triggerType === 'TELEGRAM_TRIGGER' || triggerType === 'FACEBOOK_TRIGGER'
        };

        // Add verification token for Facebook triggers
        if (triggerType === 'FACEBOOK_TRIGGER' || connectorType === 'facebook_graph' || connectorType === 'facebook') {
          const verifyToken = crypto
            .createHash('sha256')
            .update(`fluxturn_facebook_${workflowId}`)
            .digest('hex')
            .substring(0, 32);

          webhookInfo.verifyToken = verifyToken;
          webhookInfo.setupInstructions = 'Copy the Webhook URL and Verify Token below to Facebook App Dashboard → Webhooks settings';
        }

        return webhookInfo;
      });

      return {
        workflowId,
        hasWebhookTriggers: true,
        baseUrl: cleanBaseUrl,
        webhooks: webhookUrls,
        note: 'These webhook URLs will be active when the workflow is activated'
      };

    } catch (error) {
      this.logger.error(`Failed to get webhook URL for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get conversation history for a session (for debugging)
   * Shows what messages are being sent to OpenAI
   */
  async getConversationHistory(sessionId: string): Promise<any> {
    try {
      const conversationMemory = this.aiWorkflowGenerator.getConversationMemory();

      // Get conversation history
      const messages = await conversationMemory.getHistory(sessionId);

      // Get session summary
      const summary = await conversationMemory.getSessionSummary(sessionId);

      if (!summary) {
        return {
          success: false,
          error: 'Session not found or expired',
          sessionId,
        };
      }

      return {
        success: true,
        sessionId,
        summary: {
          messageCount: summary.messageCount,
          createdAt: new Date(summary.createdAt).toISOString(),
          lastAccessed: new Date(summary.lastAccessed).toISOString(),
          durationMinutes: Math.round(summary.duration / 60000),
        },
        messages: messages.map((msg, idx) => ({
          index: idx,
          role: msg.role,
          timestamp: new Date(msg.timestamp).toISOString(),
          contentPreview: typeof msg.content === 'string'
            ? msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : '')
            : JSON.stringify(msg.content).substring(0, 200),
          contentLength: typeof msg.content === 'string'
            ? msg.content.length
            : JSON.stringify(msg.content).length,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get conversation history for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Auto-configure all workflow nodes with AI assistance
   */
  async autoConfigureAllNodes(workflowId: string, user: any) {
    this.logger.log(`Auto-configuring all nodes for workflow ${workflowId}`);

    try {
      // Get workflow from database
      const workflowResult = await this.platformService.query(
        'SELECT * FROM workflows WHERE id = $1',
        [workflowId]
      );

      if (workflowResult.rows.length === 0) {
        throw new Error('Workflow not found');
      }

      const workflow = workflowResult.rows[0];
      const canvas = workflow.canvas || { nodes: [], edges: [] };

      // Get all configured connectors for the user
      const connectorsResult = await this.platformService.query(
        'SELECT * FROM connector_configs WHERE user_id = $1 AND is_active = true',
        [user.id]
      );
      const configuredConnectors = connectorsResult.rows;

      // Analyze nodes and determine what needs configuration
      const nodesToConfigure = [];
      const connectorTypes = new Set();

      for (const node of canvas.nodes) {
        // Check if node uses a connector
        if (node.data?.connector || node.type?.includes('connector') || node.type?.includes('CONNECTOR')) {
          const connectorType = node.data?.connector || node.data?.connectorType;
          if (connectorType) {
            connectorTypes.add(connectorType);

            // Check if this connector is already configured
            const isConfigured = configuredConnectors.some(
              c => c.connector_type === connectorType
            );

            nodesToConfigure.push({
              nodeId: node.id,
              connector: connectorType,
              isConfigured,
              currentConfig: node.data
            });
          }
        }
      }

      // Get missing connector types that need configuration
      const missingConnectors = Array.from(connectorTypes).filter(type =>
        !configuredConnectors.some(c => c.connector_type === type)
      );

      this.logger.log(`Found ${nodesToConfigure.length} nodes, ${missingConnectors.length} need configuration`);

      return {
        success: true,
        workflowId,
        summary: {
          totalNodes: canvas.nodes.length,
          nodesToConfigure: nodesToConfigure.length,
          alreadyConfigured: nodesToConfigure.filter(n => n.isConfigured).length,
          needsConfiguration: missingConnectors.length
        },
        nodes: nodesToConfigure,
        missingConnectors,
        configuredConnectors: configuredConnectors.map(c => ({
          id: c.id,
          type: c.connector_type,
          name: c.name
        })),
        message: missingConnectors.length === 0
          ? 'All connectors are already configured! Workflow is ready to execute.'
          : `Configuration needed for: ${missingConnectors.join(', ')}. Please configure these connectors before execution.`
      };
    } catch (error) {
      this.logger.error('Failed to auto-configure nodes:', error);
      throw error;
    }
  }

  /**
   * Strip binary data from workflow results to avoid database size limits
   * Replaces large base64 data with metadata only
   */
  private stripBinaryData(data: any, seen: WeakSet<object> = new WeakSet()): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Handle circular references
    if (seen.has(data)) {
      return '[Circular Reference]';
    }
    seen.add(data);

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.stripBinaryData(item, seen));
    }

    // Clone object to avoid modifying original
    const stripped: any = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip certain problematic keys that often contain circular refs
      if (key === 'req' || key === 'request' || key === 'socket' || key === 'agent') {
        stripped[key] = '[Request Object Stripped]';
        continue;
      }

      // Check if this is a binary data object
      if (key === 'binary' && typeof value === 'object' && value !== null) {
        // Replace binary data with metadata only
        const binaryMetadata: any = {};
        for (const [propName, propValue] of Object.entries(value as object)) {
          if (typeof propValue === 'object' && propValue !== null && 'data' in propValue) {
            const binaryData = propValue as any;
            binaryMetadata[propName] = {
              mimeType: binaryData.mimeType,
              fileName: binaryData.fileName,
              fileSize: binaryData.fileSize,
              fileExtension: binaryData.fileExtension,
              // Store a note that data was stripped
              _stripped: true,
              _note: 'Binary data removed to reduce database size'
            };
          } else {
            binaryMetadata[propName] = propValue;
          }
        }
        stripped[key] = binaryMetadata;
      } else if (typeof value === 'object' && value !== null) {
        // Recursively strip nested objects
        stripped[key] = this.stripBinaryData(value, seen);
      } else {
        // Keep primitive values
        stripped[key] = value;
      }
    }

    return stripped;
  }

  /**
   * Get all node types from database grouped by category
   * Used by frontend's "Add Node" dialog
   */
  async getNodeTypes(): Promise<{
    nodeTypes: any[];
    total: number;
    categories: string[];
    nodeTypesByCategory: Record<string, any[]>;
  }> {
    try {
      const query = `
        SELECT
          type,
          name,
          category,
          description,
          icon,
          config_schema,
          input_schema,
          output_schema,
          is_trigger,
          is_action,
          is_builtin,
          connector_type,
          requires_connector,
          examples,
          sort_order
        FROM node_types
        WHERE is_active = true
        ORDER BY sort_order, name
      `;

      const result = await this.platformService.query(query);
      const nodeTypes = result.rows || [];

      // Group by category
      const nodeTypesByCategory: Record<string, any[]> = {};
      const categories = new Set<string>();

      for (const nodeType of nodeTypes) {
        const cat = nodeType.category || 'other';
        categories.add(cat);

        if (!nodeTypesByCategory[cat]) {
          nodeTypesByCategory[cat] = [];
        }
        nodeTypesByCategory[cat].push(nodeType);
      }

      return {
        nodeTypes,
        total: nodeTypes.length,
        categories: Array.from(categories),
        nodeTypesByCategory,
      };
    } catch (error) {
      this.logger.error('Failed to get node types:', error);
      throw error;
    }
  }
}