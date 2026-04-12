import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
  ValidationPipe,
  BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiHeader, ApiSecurity } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { TriggerType } from './interfaces/trigger.interface';
import { JwtOrApiKeyAuthGuard } from '../../auth/guards/jwt-or-api-key-auth.guard';
import { ToolRegistryService } from './services/tool-registry.service';
import { WorkflowSerializerService } from './services/workflow-serializer.service';
import { ImportWorkflowDto, WorkflowFormat } from './dto/workflow-import.dto';
import { DryRunService } from './services/dry-run.service';
import { DryRunDto } from './dto/dry-run.dto';
import {
  CreateWorkflowDto,
  ExecuteWorkflowDto,
  ProcessPromptDto,
  FindSimilarWorkflowsDto,
  ListWorkflowsDto,
  ListConnectorsDto,
  AnalyzePromptDto,
  UpdateWorkflowDto,
  WorkflowStatus
} from './dto/workflow.dto';

@ApiTags('workflow')
@Controller('workflow')
@UseGuards(JwtOrApiKeyAuthGuard)
@ApiSecurity('api_key')
@ApiSecurity('JWT')
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: false,
})
@ApiHeader({
  name: 'x-project-id',
  description: 'Project ID for multi-tenant context',
  required: false,
})
@ApiHeader({
  name: 'x-app-id',
  description: 'App ID for multi-tenant context (optional)',
  required: false,
})
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly toolRegistryService: ToolRegistryService,
    private readonly workflowSerializerService: WorkflowSerializerService,
    private readonly dryRunService: DryRunService,
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new workflow from prompt or definition' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  @ApiBody({ type: CreateWorkflowDto })
  async createWorkflow(
    @Body(ValidationPipe) dto: CreateWorkflowDto,
    @Request() req: any
  ) {
    const userId = req.user?.id || req.auth?.userId;
    const context = this.extractMultiTenantContext(req);

    return this.workflowService.createWorkflow({
      created_by: userId,
      organization_id: context.organizationId,
      project_id: context.projectId,
      ...dto
    });
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow executed successfully' })
  @ApiBody({ type: ExecuteWorkflowDto })
  async executeWorkflow(
    @Param('id') workflowId: string,
    @Body(ValidationPipe) dto: ExecuteWorkflowDto,
    @Request() req: any
  ) {
    try {
      return await this.workflowService.executeWorkflow({
        workflow_id: workflowId,
        input_data: dto.input_data,
      });
    } catch (error: any) {
      // If the error has execution result attached, return it in the error response
      if (error.executionResult) {
        // Put execution data in 'details' field so it passes through GlobalExceptionFilter
        throw new HttpException(
          {
            message: error.message,
            error: 'Workflow Execution Failed',
            details: {
              executionResult: error.executionResult,
              output_data: error.executionResult.output_data,
              result: error.executionResult.result
            }
          },
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      throw error;
    }
  }

  @Post(':id/execute-node')
  @ApiOperation({
    summary: 'Execute a single node for testing',
    description: 'Execute a specific node within a workflow to test its configuration'
  })
  @ApiResponse({ status: 200, description: 'Node executed successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node to execute' },
        testData: { type: 'object', description: 'Optional test data to pass to the node' }
      },
      required: ['nodeId']
    }
  })
  async executeNode(
    @Param('id') workflowId: string,
    @Body() body: { nodeId: string; testData?: any },
    @Request() req: any
  ) {
    return this.workflowService.executeSingleNode(
      workflowId,
      body.nodeId,
      body.testData || {}
    );
  }

  @Post(':id/dry-run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dry-run a workflow without executing real actions',
    description:
      'Traces the execution path, validates node configuration, checks credential availability, and returns mock output for every node without calling any external APIs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dry-run completed successfully',
    schema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nodeId: { type: 'string' },
              nodeName: { type: 'string' },
              nodeType: { type: 'string' },
              configValid: { type: 'boolean' },
              credentialsAvailable: { type: 'boolean' },
              wouldExecute: { type: 'string' },
              mockOutput: { type: 'object' },
            },
          },
        },
        errors: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        totalNodes: { type: 'number' },
        executionOrder: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiBody({ type: DryRunDto })
  async dryRunWorkflow(
    @Param('id') workflowId: string,
    @Body(ValidationPipe) dto: DryRunDto,
    @Request() req: any
  ) {
    return this.dryRunService.dryRun(workflowId, dto.sampleInput);
  }

  @Get('list')
  @ApiOperation({ summary: 'List workflows for current project or app' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  async listWorkflows(
    @Query(new ValidationPipe({ transform: true })) query: ListWorkflowsDto,
    @Request() req: any
  ) {
    const context = this.extractMultiTenantContext(req);

    return this.workflowService.listWorkflows({
      status: query.status,
      page: query.page,
      limit: query.limit,
      organization_id: context.organizationId,
      project_id: context.projectId,
    });
  }


  @Get('connectors')
  @ApiOperation({ summary: 'List available connectors' })
  @ApiResponse({ status: 200, description: 'Connectors retrieved successfully' })
  async listConnectors(
    @Query(ValidationPipe) query: ListConnectorsDto,
    @Request() req: any
  ) {

    return this.workflowService.listConnectors({
      ...query,
    });
  }

  @Get('tools')
  @ApiOperation({ summary: 'List available AI agent tools' })
  @ApiResponse({ status: 200, description: 'Tools retrieved successfully' })
  async listTools(
    @Query('category') category?: string,
    @Query('connectorType') connectorType?: string,
  ) {
    let tools = this.toolRegistryService.getToolDefinitions();

    // Filter by category if provided
    if (category) {
      tools = tools.filter(tool => tool.category === category);
    }

    // Filter by connector type if provided
    if (connectorType) {
      tools = tools.filter(tool => tool.connectorType === connectorType);
    }

    // Group tools by category for frontend convenience
    const toolsByCategory: Record<string, typeof tools> = {};
    for (const tool of tools) {
      const cat = tool.category || 'other';
      if (!toolsByCategory[cat]) {
        toolsByCategory[cat] = [];
      }
      toolsByCategory[cat].push(tool);
    }

    return {
      tools,
      total: tools.length,
      categories: Object.keys(toolsByCategory),
      toolsByCategory,
    };
  }

  @Get('node-types')
  @ApiOperation({ summary: 'List available node types for workflow builder' })
  @ApiResponse({ status: 200, description: 'Node types retrieved successfully' })
  async listNodeTypes(
    @Query('category') category?: string,
  ) {
    const result = await this.workflowService.getNodeTypes();

    // Filter by category if provided
    if (category) {
      return {
        nodeTypes: result.nodeTypesByCategory[category] || [],
        total: (result.nodeTypesByCategory[category] || []).length,
        categories: result.categories,
        nodeTypesByCategory: { [category]: result.nodeTypesByCategory[category] || [] },
      };
    }

    return result;
  }

  @Get('execution-stats')
  @ApiOperation({ summary: 'Get execution statistics for last 7 days' })
  @ApiResponse({ status: 200, description: 'Execution statistics retrieved successfully' })
  async getExecutionStats(@Request() req: any) {
    const context = this.extractMultiTenantContext(req);
    return this.workflowService.getExecutionStats(context.organizationId, context.projectId);
  }

  @Get('executions')
  @ApiOperation({ summary: 'Get all workflow executions with pagination' })
  @ApiResponse({ status: 200, description: 'Executions retrieved successfully' })
  async getAllExecutions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Request() req?: any
  ) {
    const context = this.extractMultiTenantContext(req);
    return this.workflowService.getAllExecutions({
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20,
      status,
      search,
      organization_id: context.organizationId,
      project_id: context.projectId,
    });
  }

  @Post('process-prompt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Process natural language prompt and return matched workflow with confidence score',
    description: 'Analyzes a prompt to detect workflow type, required connectors, and generates a workflow chain with success percentage'
  })
  @ApiBody({ 
    type: ProcessPromptDto,
    examples: {
      emailWorkflow: {
        value: {
          prompt: "Check my emails daily and prioritize urgent ones, draft replies for customers",
          industry: "communication",
          maxSuggestions: 3
        }
      },
      salesWorkflow: {
        value: {
          prompt: "When a new lead comes in, score them, enrich their data, and add to nurture campaign if qualified",
          industry: "sales",
          useCase: "lead_qualification"
        }
      },
      supportWorkflow: {
        value: {
          prompt: "Monitor support tickets, analyze sentiment, route to appropriate team based on urgency",
          industry: "support"
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Workflow analysis completed with confidence score',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        confidence: { type: 'number', description: 'Overall confidence percentage (0-100)' },
        matchedWorkflow: { type: 'object' },
        detectedIntent: { type: 'object' },
        requiredConnectors: { type: 'array', items: { type: 'string' } },
        availableConnectors: { type: 'array', items: { type: 'string' } },
        missingConnectors: { type: 'array', items: { type: 'string' } },
        workflowSteps: { type: 'array' },
        estimatedExecutionTime: { type: 'number' },
        complexity: { type: 'string' },
        suggestions: { type: 'array' },
        analysis: { type: 'object' }
      }
    }
  })
  async processPrompt(
    @Body(ValidationPipe) dto: ProcessPromptDto,
    @Request() req: any
  ) {
    const userId = req.user?.id || req.auth?.userId;
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const projectId = req.headers['x-project-id'] || req.auth?.projectId;

    return this.workflowService.processPrompt({
      ...dto,
      userId,
      organizationId,
      projectId
    });
  }

  @Post('analyze-prompt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze a prompt and return workflow plan without executing',
    description: 'Analyzes the user prompt and returns what will be built, required connectors, and estimated nodes'
  })
  @ApiBody({
    type: AnalyzePromptDto,
    examples: {
      telegramToGmail: {
        value: {
          prompt: "when comes any message in telegram then send to gmail",
          conversationId: "03cf7605-efd8-4f0f-bbb3-8a2baae5b5d9"
        }
      },
      dailyReport: {
        value: {
          prompt: "Send me a daily report at 9 AM with sales data",
          conversationId: "123e4567-e89b-12d3-a456-426614174000"
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis completed successfully',
    schema: {
      type: 'object',
      properties: {
        understanding: {
          type: 'string',
          example: 'You want to forward new Telegram messages to your Gmail account.'
        },
        plan: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Set up a Telegram trigger to detect new messages',
            'Extract the message content and sender information',
            'Format the data for email delivery',
            'Send the email using Gmail connector'
          ]
        },
        estimatedNodes: {
          type: 'number',
          example: 4
        },
        requiredConnectors: {
          type: 'array',
          items: { type: 'string' },
          example: ['Telegram', 'Gmail']
        },
        confidence: {
          type: 'number',
          example: 85
        }
      }
    }
  })
  async analyzePrompt(
    @Body(ValidationPipe) dto: AnalyzePromptDto,
    @Request() req: any
  ) {
    const userId = req.user?.id || req.auth?.userId;

    return this.workflowService.analyzePrompt({
      prompt: dto.prompt,
      conversationId: dto.conversationId,
      userId
    });
  }

  @Post('ai/chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chat with AI assistant about Fluxturn (no workflow generation)',
    description: 'General Q&A about Fluxturn features, connectors, best practices, etc.'
  })
  @ApiBody({
    type: AnalyzePromptDto,
    examples: {
      connectorQuestion: {
        value: {
          prompt: "How do I connect to Facebook?",
          conversationId: "03cf7605-efd8-4f0f-bbb3-8a2baae5b5d9"
        }
      },
      generalQuestion: {
        value: {
          prompt: "What triggers are available in Fluxturn?",
          conversationId: "123e4567-e89b-12d3-a456-426614174000"
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Chat response generated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Fluxturn offers various triggers including...'
        },
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          example: ['Learn about connectors', 'View templates', 'Build a workflow']
        }
      }
    }
  })
  async chatWithAssistant(
    @Body(ValidationPipe) dto: AnalyzePromptDto,
    @Request() req: any
  ) {
    const userId = req.user?.id || req.auth?.userId;

    return this.workflowService.chatWithAssistant({
      prompt: dto.prompt,
      conversationId: dto.conversationId,
      userId
    });
  }

  @Post('similar')
  @ApiOperation({ summary: 'Find similar workflows using vector search' })
  @ApiResponse({ status: 200, description: 'Similar workflows found' })
  @ApiBody({ type: FindSimilarWorkflowsDto })
  async findSimilarWorkflows(
    @Body(ValidationPipe) dto: FindSimilarWorkflowsDto,
    @Request() req: any
  ) {

    return this.workflowService.findSimilarWorkflows({
      ...dto,
    });
  }

  @Post('import')
  @ApiOperation({
    summary: 'Import a workflow from YAML or JSON definition',
    description: 'Parse and validate a workflow definition, then create the workflow',
  })
  @ApiResponse({ status: 201, description: 'Workflow imported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid definition or validation errors' })
  @ApiBody({ type: ImportWorkflowDto })
  async importWorkflow(
    @Body(ValidationPipe) dto: ImportWorkflowDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.auth?.userId;
    const context = this.extractMultiTenantContext(req);

    if (dto.format === WorkflowFormat.YAML) {
      return this.workflowSerializerService.importFromYaml(
        context.organizationId,
        context.projectId,
        userId,
        dto.definition,
      );
    }
    return this.workflowSerializerService.importFromJson(
      context.organizationId,
      context.projectId,
      userId,
      dto.definition,
    );
  }

  @Get(':id/export')
  @ApiOperation({
    summary: 'Export a workflow as YAML or JSON',
    description: 'Download a workflow definition in the specified format for Git-based workflow management',
  })
  @ApiResponse({ status: 200, description: 'Workflow definition exported' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async exportWorkflow(
    @Param('id') workflowId: string,
    @Query('format') format: string,
    @Request() req: any,
  ) {
    const exportFormat = (format || 'yaml').toLowerCase();

    if (exportFormat === 'json') {
      const definition = await this.workflowSerializerService.exportToJson(workflowId);
      return {
        format: 'json',
        definition,
        filename: `workflow-${workflowId}.json`,
      };
    }

    const definition = await this.workflowSerializerService.exportToYaml(workflowId);
    return {
      format: 'yaml',
      definition,
      filename: `workflow-${workflowId}.yaml`,
    };
  }

  @Get('new')
  @ApiOperation({ summary: 'Get new workflow template' })
  @ApiResponse({ status: 200, description: 'New workflow template returned' })
  async getNewWorkflowTemplate(@Request() req: any) {
    const context = this.extractMultiTenantContext(req);

    // Return a template for a new workflow
    return {
      id: null,
      name: 'Untitled Workflow',
      description: '',
      canvas: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      is_active: false,
      trigger_type: null,
      organization_id: context.organizationId,
      project_id: context.projectId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow details' })
  @ApiResponse({ status: 200, description: 'Workflow details retrieved' })
  async getWorkflow(
    @Param('id') workflowId: string,
    @Request() req: any
  ) {
    const context = this.extractMultiTenantContext(req);
    return this.workflowService.getWorkflow(workflowId, context.organizationId, context.projectId);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get workflow execution history' })
  @ApiResponse({ status: 200, description: 'Execution history retrieved' })
  async getExecutionHistory(
    @Param('id') workflowId: string,
    @Request() req: any
  ) {
    return this.workflowService.getExecutionHistory(workflowId);
  }

  @Get(':id/last-execution-output')
  @ApiOperation({
    summary: 'Get output data from the last execution',
    description: 'Returns the output_data from the most recent completed execution for use in FieldPicker'
  })
  @ApiResponse({ status: 200, description: 'Last execution output retrieved' })
  async getLastExecutionOutput(
    @Param('id') workflowId: string,
    @Request() req: any
  ) {
    return this.workflowService.getLastExecutionOutput(workflowId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  @ApiBody({ type: UpdateWorkflowDto })
  async updateWorkflow(
    @Param('id') workflowId: string,
    @Body(ValidationPipe) dto: UpdateWorkflowDto,
    @Request() req: any
  ) {
    const userId = req.user?.id || req.auth?.userId;
    const context = this.extractMultiTenantContext(req);

    return this.workflowService.updateWorkflow(workflowId, {
      updated_by: userId,
      organization_id: context.organizationId,
      project_id: context.projectId,
      ...dto
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  async deleteWorkflow(
    @Param('id') workflowId: string,
    @Request() req: any
  ) {
    const context = this.extractMultiTenantContext(req);
    return this.workflowService.deleteWorkflow(workflowId, context.organizationId, context.projectId);
  }

  @Get(':id/trigger/:triggerType/status')
  @ApiOperation({
    summary: 'Get trigger status for a workflow',
    description: 'Returns information about the active trigger (Gmail, Facebook, etc.)'
  })
  @ApiResponse({ status: 200, description: 'Trigger status retrieved' })
  async getTriggerStatus(
    @Param('id') workflowId: string,
    @Param('triggerType') triggerType: string,
    @Request() req: any
  ) {
    const type = triggerType.toUpperCase() as TriggerType;
    return this.workflowService.getTriggerStatus(workflowId, type);
  }

  @Post(':id/trigger/:triggerType/:action')
  @ApiOperation({
    summary: 'Manually trigger a specific action for a trigger',
    description: 'Execute a manual action on a trigger (e.g., poll for Gmail, verify for Facebook)'
  })
  @ApiResponse({ status: 200, description: 'Action triggered successfully' })
  async triggerManualAction(
    @Param('id') workflowId: string,
    @Param('triggerType') triggerType: string,
    @Param('action') action: string,
    @Request() req: any
  ) {
    const type = triggerType.toUpperCase() as TriggerType;
    return this.workflowService.triggerManualAction(workflowId, type, action);
  }

  @Get(':id/webhook-url')
  @ApiOperation({
    summary: 'Get webhook URL for workflow triggers',
    description: 'Returns the webhook URL that will be used when the workflow is activated. Useful for showing users the URL before activation.'
  })
  @ApiResponse({ status: 200, description: 'Webhook URL retrieved' })
  async getWebhookUrl(
    @Param('id') workflowId: string,
    @Request() req: any
  ) {
    // Handle "new" workflow case - workflow hasn't been saved yet
    if (workflowId === 'new') {
      return {
        webhookUrl: null,
        message: 'Workflow must be saved before webhook URL is available'
      };
    }
    return this.workflowService.getWorkflowWebhookUrl(workflowId);
  }

  @Get('ai/conversation/:sessionId')
  @ApiOperation({
    summary: 'Debug: Get conversation history for a session',
    description: 'Returns all messages in the conversation history (for debugging)'
  })
  @ApiResponse({ status: 200, description: 'Conversation history' })
  async getConversationHistory(
    @Param('sessionId') sessionId: string,
    @Request() req: any
  ) {
    return this.workflowService.getConversationHistory(sessionId);
  }

  @Post(':id/auto-configure-all')
  @ApiOperation({
    summary: 'Auto-configure all workflow nodes with AI',
    description: 'Uses AI to automatically configure all unconfigured nodes in the workflow'
  })
  @ApiResponse({ status: 200, description: 'All nodes configured successfully' })
  @ApiResponse({ status: 400, description: 'Configuration failed' })
  async autoConfigureAllNodes(
    @Param('id') workflowId: string,
    @Request() req: any
  ) {
    return this.workflowService.autoConfigureAllNodes(workflowId, req.user);
  }

  @Post('ai/generate-with-agents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate workflow using multi-agent system (NEW)',
    description: 'Uses 5 specialized AI agents for higher accuracy and better completion rates. Returns workflow with 95%+ completion rate.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          example: 'When I receive an email about a job offer, save it to Google Sheets and notify me on Telegram'
        },
        availableConnectors: {
          type: 'array',
          items: { type: 'string' },
          example: ['gmail', 'google_sheets', 'telegram']
        }
      },
      required: ['prompt']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow generated successfully with multi-agent system',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        workflow: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            nodes: { type: 'array' },
            connections: { type: 'array' }
          }
        },
        confidence: { type: 'number', description: 'Overall confidence score (0-100)' },
        analysis: {
          type: 'object',
          properties: {
            intent: { type: 'object' },
            connectors: { type: 'object' },
            reasoning: { type: 'string' }
          }
        }
      }
    }
  })
  async generateWithAgents(
    @Body() dto: { prompt: string; availableConnectors?: string[] },
    @Request() req: any
  ) {
    const userId = req.user?.id || req.auth?.userId;
    const organizationId = req.headers['x-organization-id'] || req.auth?.organizationId;

    // Get available connectors if not provided
    let availableConnectors = dto.availableConnectors;
    if (!availableConnectors || availableConnectors.length === 0) {
      const connectorsList = this.workflowService.listConnectors({
        organizationId
      });
      availableConnectors = connectorsList.connectors.map((c: any) => c.name);
    }

    return this.workflowService.generateWorkflowWithAgents({
      prompt: dto.prompt,
      availableConnectors,
      userId,
      organizationId
    });
  }

  /**
   * Extract and validate multi-tenant context from request headers
   */
  private extractMultiTenantContext(req: any): {
    organizationId: string;
    projectId: string;
  } {
    const contextOrganizationId = req.headers['x-organization-id'] || req.auth?.organizationId;
    const contextProjectId = req.headers['x-project-id'] || req.auth?.projectId;

    if (!contextOrganizationId) {
      throw new BadRequestException('Organization ID is required. Provide it via x-organization-id header or ensure your API key has organization context.');
    }
    if (!contextProjectId) {
      throw new BadRequestException('Project ID is required. Provide it via x-project-id header or ensure your API key has project context.');
    }

    return {
      organizationId: contextOrganizationId,
      projectId: contextProjectId,
    };
  }
}