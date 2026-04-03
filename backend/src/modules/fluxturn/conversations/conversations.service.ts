import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformService } from '../../database/platform.service';
import { AuthContext } from '../../database/interfaces/database.interface';
import { CredentialDetectorService } from './services/credential-detector.service';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import {
  CreateConversationDto,
  UpdateConversationDto,
  AddMessageDto,
  ListConversationsQueryDto,
  ChatMessageDto,
  ConversationResponseDto,
  PaginatedConversationsDto,
} from './dto/conversation.dto';

export interface IntentDetectionResult {
  intent: 'workflow_creation' | 'workflow_modification' | 'general_conversation' | 'question';
  confidence: number;
  extractedDetails?: {
    workflowDescription?: string;
    modifications?: string[];
    connectors?: string[];
  };
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  private openai: OpenAI;

  constructor(
    private platformService: PlatformService,
    private configService: ConfigService,
    private credentialDetector: CredentialDetectorService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Create a new conversation
   */
  async create(
    dto: CreateConversationDto,
    context: AuthContext,
  ): Promise<ConversationResponseDto> {
    if (!context.userId) {
      throw new UnauthorizedException('User context required');
    }

    // Ensure organization_id is available
    const organizationId = dto.organization_id || context.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Ensure project_id is available - get or create default project
    let projectId = dto.project_id || context.projectId;
    if (!projectId) {
      // Get or create default project for the organization
      projectId = await this.getOrCreateDefaultProject(organizationId, context.userId);
    }

    const conversationId = uuidv4();
    const now = new Date().toISOString();

    // Generate title if not provided
    const title = dto.title || `Conversation - ${new Date().toLocaleDateString()}`;

    // Prepare initial messages if provided
    const messages = dto.initial_messages || [];

    const query = `
      INSERT INTO conversations (
        id, user_id, workflow_id, title, messages, status,
        context, message_count, last_message_at,
        organization_id, project_id, created_by, updated_by,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
      )
      RETURNING *
    `;

    const values = [
      conversationId,
      context.userId,
      dto.workflow_id || null,
      title,
      JSON.stringify(messages),
      'active',
      JSON.stringify({}),
      messages.length,
      messages.length > 0 ? now : null,
      organizationId,
      projectId,
      context.userId,
      context.userId,
    ];

    try {
      const result = await this.platformService.query(query, values);
      return this.mapToResponseDto(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to create conversation', error);
      throw new BadRequestException('Failed to create conversation');
    }
  }

  /**
   * Get or create default project for an organization
   */
  private async getOrCreateDefaultProject(organizationId: string, userId: string): Promise<string> {
    try {
      // First, try to get an existing default project
      const existingProject = await this.platformService.query(
        `SELECT id FROM projects
         WHERE organization_id = $1
         AND name = 'Default Project'
         LIMIT 1`,
        [organizationId]
      );

      if (existingProject.rows.length > 0) {
        return existingProject.rows[0].id;
      }

      // Create a new default project - need database_name for the schema
      const projectId = uuidv4();
      const databaseName = `project_${projectId.replace(/-/g, '_')}`;
      await this.platformService.query(
        `INSERT INTO projects (id, organization_id, name, description, database_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [projectId, organizationId, 'Default Project', 'Auto-created default project', databaseName]
      );

      this.logger.log(`Created default project ${projectId} for organization ${organizationId}`);
      return projectId;
    } catch (error) {
      this.logger.error('Failed to get or create default project', error);
      throw new BadRequestException('Failed to get or create default project');
    }
  }

  /**
   * List conversations with pagination
   */
  async list(
    query: ListConversationsQueryDto,
    context: AuthContext,
  ): Promise<PaginatedConversationsDto> {
    if (!context.userId) {
      throw new UnauthorizedException('User context required');
    }

    const limit = Math.min(query.limit || 20, 100);
    const page = query.page || 1;
    const offset = (page - 1) * limit;
    const sortBy = query.sort_by || 'last_message_at';
    const sortOrder = query.sort_order?.toUpperCase() || 'DESC';

    // Validate sort column
    const validColumns = ['created_at', 'updated_at', 'last_message_at', 'title'];
    if (!validColumns.includes(sortBy)) {
      throw new BadRequestException('Invalid sort column');
    }

    // Build WHERE clause
    const whereConditions = ['user_id = $1'];
    const queryParams: any[] = [context.userId];
    let paramCount = 2;

    if (query.status) {
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(query.status);
      paramCount++;
    }

    if (query.workflow_id) {
      whereConditions.push(`workflow_id = $${paramCount}`);
      queryParams.push(query.workflow_id);
      paramCount++;
    }

    if (query.project_id) {
      whereConditions.push(`project_id = $${paramCount}`);
      queryParams.push(query.project_id);
      paramCount++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total FROM conversations
      WHERE ${whereClause}
    `;
    const countResult = await this.platformService.query(countQuery, queryParams);

    // Data query
    const dataQuery = `
      SELECT * FROM conversations
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    const dataParams = [...queryParams, limit, offset];
    const dataResult = await this.platformService.query(dataQuery, dataParams);

    return {
      conversations: dataResult.rows.map((row) => this.mapToResponseDto(row)),
      total: parseInt(countResult.rows[0].total, 10),
      limit,
      offset,
      page,
    };
  }

  /**
   * Get conversation by ID
   */
  async getById(
    id: string,
    context: AuthContext,
  ): Promise<ConversationResponseDto> {
    if (!context.userId) {
      throw new UnauthorizedException('User context required');
    }

    const query = `
      SELECT * FROM conversations
      WHERE id = $1 AND user_id = $2
    `;

    const result = await this.platformService.query(query, [id, context.userId]);

    if (result.rows.length === 0) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    return this.mapToResponseDto(result.rows[0]);
  }

  /**
   * Update conversation
   */
  async update(
    id: string,
    dto: UpdateConversationDto,
    context: AuthContext,
  ): Promise<ConversationResponseDto> {
    // Verify ownership
    await this.getById(id, context);

    const updateFields: string[] = [];
    const values: any[] = [];

    // Add fields to update
    if (dto.title !== undefined) {
      updateFields.push(`title = $${values.length + 1}`);
      values.push(dto.title);
    }

    if (dto.status !== undefined) {
      updateFields.push(`status = $${values.length + 1}`);
      values.push(dto.status);
    }

    if (dto.context !== undefined) {
      updateFields.push(`context = $${values.length + 1}`);
      values.push(JSON.stringify(dto.context));
    }

    if (updateFields.length === 0) {
      return this.getById(id, context);
    }

    // Add updated_by
    updateFields.push(`updated_by = $${values.length + 1}`);
    values.push(context.userId);

    // Add WHERE clause params (id and user_id)
    const idParamIndex = values.length + 1;
    const userIdParamIndex = values.length + 2;
    values.push(id, context.userId);

    const query = `
      UPDATE conversations
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${idParamIndex} AND user_id = $${userIdParamIndex}
      RETURNING *
    `;

    const result = await this.platformService.query(query, values);
    return this.mapToResponseDto(result.rows[0]);
  }

  /**
   * Delete conversation (soft delete by setting status to 'deleted')
   */
  async delete(id: string, context: AuthContext): Promise<void> {
    // Verify ownership
    await this.getById(id, context);

    // Soft delete by setting status to 'deleted'
    await this.platformService.query(
      `UPDATE conversations SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND user_id = $2`,
      [id, context.userId],
    );
  }

  /**
   * Hard delete conversation (permanent deletion)
   */
  async hardDelete(id: string, context: AuthContext): Promise<void> {
    // Verify ownership
    await this.getById(id, context);

    await this.platformService.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
      [id, context.userId],
    );
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    dto: AddMessageDto,
    context: AuthContext,
  ): Promise<ConversationResponseDto> {
    // Verify ownership
    const conversation = await this.getById(conversationId, context);

    // Detect credentials in user messages
    let detectedCredentials = undefined;
    if (dto.role === 'user') {
      const detection = this.credentialDetector.detectCredentials(dto.content);
      if (detection.hasCredentials) {
        detectedCredentials = detection.credentials;
        this.logger.log(`Detected ${detection.credentials.length} credentials in message`);
      }
    }

    // Create new message
    const newMessage: ChatMessageDto = {
      id: uuidv4(),
      role: dto.role,
      content: dto.content,
      timestamp: new Date().toISOString(),
      metadata: {
        ...dto.metadata,
        credentialsDetected: detectedCredentials,
      },
    };

    // Append message to messages array
    const updatedMessages = [...conversation.messages, newMessage];

    const query = `
      UPDATE conversations
      SET
        messages = $1,
        message_count = $2,
        last_message_at = NOW(),
        updated_at = NOW(),
        updated_by = $3
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `;

    const result = await this.platformService.query(query, [
      JSON.stringify(updatedMessages),
      updatedMessages.length,
      context.userId,
      conversationId,
      context.userId,
    ]);

    return this.mapToResponseDto(result.rows[0]);
  }

  /**
   * Update workflow state in conversation
   */
  async updateWorkflowState(
    conversationId: string,
    workflowData: any,
    context: AuthContext,
  ): Promise<ConversationResponseDto> {
    // Verify ownership
    const conversation = await this.getById(conversationId, context);

    // Store previous version if exists
    const workflowVersions = conversation.workflow_versions || [];
    if (conversation.current_workflow) {
      workflowVersions.push({
        ...conversation.current_workflow,
        savedAt: new Date().toISOString(),
      });
    }

    const query = `
      UPDATE conversations
      SET
        current_workflow = $1,
        workflow_versions = $2,
        updated_at = NOW(),
        updated_by = $3
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `;

    const result = await this.platformService.query(query, [
      JSON.stringify(workflowData),
      JSON.stringify(workflowVersions),
      context.userId,
      conversationId,
      context.userId,
    ]);

    return this.mapToResponseDto(result.rows[0]);
  }

  /**
   * Get messages from a conversation
   */
  async getMessages(
    conversationId: string,
    context: AuthContext,
  ): Promise<ChatMessageDto[]> {
    const conversation = await this.getById(conversationId, context);
    return conversation.messages;
  }

  /**
   * Clear all messages from a conversation
   */
  async clearMessages(
    conversationId: string,
    context: AuthContext,
  ): Promise<ConversationResponseDto> {
    // Verify ownership
    await this.getById(conversationId, context);

    const query = `
      UPDATE conversations
      SET
        messages = '[]',
        message_count = 0,
        last_message_at = NULL,
        updated_at = NOW(),
        updated_by = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `;

    const result = await this.platformService.query(query, [
      context.userId,
      conversationId,
      context.userId,
    ]);

    return this.mapToResponseDto(result.rows[0]);
  }

  /**
   * Detect user intent from message
   */
  async detectIntent(
    message: string,
    conversationHistory: ChatMessageDto[],
  ): Promise<IntentDetectionResult> {
    // Simple keyword-based intent detection (fast)
    const lowerMessage = message.toLowerCase();

    // Workflow creation patterns
    const workflowCreationPatterns = [
      /create.*workflow/i,
      /build.*workflow/i,
      /make.*workflow/i,
      /generate.*workflow/i,
      /automate/i,
      /i (want|need|would like) to.*workflow/i,
      /workflow (for|to|that)/i,
      /set up.*automation/i,
    ];

    // Workflow modification patterns
    const modificationPatterns = [
      /add (error|exception|catch|handling)/i,
      /add (schedule|trigger|cron)/i,
      /modify|change|update|edit/i,
      /remove|delete.*node/i,
      /(looks? good|perfect|great|satisfied)/i,
    ];

    // Check for workflow creation intent
    for (const pattern of workflowCreationPatterns) {
      if (pattern.test(message)) {
        return {
          intent: 'workflow_creation',
          confidence: 0.9,
          extractedDetails: {
            workflowDescription: message,
          },
        };
      }
    }

    // Check for workflow modification intent (only if conversation has workflow context)
    const hasWorkflowContext = conversationHistory.some(
      msg => msg.metadata?.workflowPreview
    );

    if (hasWorkflowContext) {
      for (const pattern of modificationPatterns) {
        if (pattern.test(message)) {
          return {
            intent: 'workflow_modification',
            confidence: 0.85,
            extractedDetails: {
              modifications: [message],
            },
          };
        }
      }
    }

    // Default to general conversation
    return {
      intent: 'general_conversation',
      confidence: 0.8,
    };
  }

  /**
   * Generate AI response for general conversation
   */
  async generateConversationalResponse(
    userMessage: string,
    conversationHistory: ChatMessageDto[],
  ): Promise<string> {
    if (!this.openai) {
      // Fallback responses when OpenAI is not configured
      const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon'];
      if (greetings.some(g => userMessage.toLowerCase().includes(g))) {
        return "Hello! I'm your AI workflow assistant. I can help you:\n\n" +
               "• Create workflows by describing what you want to automate\n" +
               "• Add error handling, scheduling, or conditions\n" +
               "• Modify and refine existing workflows\n" +
               "• Answer questions about workflow automation\n\n" +
               "Just describe what you'd like to build, and I'll help you create it!";
      }

      if (userMessage.toLowerCase().includes('what can you do')) {
        return "I can help you build automated workflows! Just tell me what you want to automate, like:\n\n" +
               "• 'Create a workflow to send Slack notifications when form is submitted'\n" +
               "• 'Build a workflow to fetch data from an API every hour'\n" +
               "• 'Automate email sending with data from Google Sheets'\n\n" +
               "I'll create the workflow for you step by step!";
      }

      return "I'm here to help you build workflows! Please describe what you'd like to automate, and I'll create it for you.";
    }

    try {
      // Build conversation context for OpenAI
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are an AI workflow builder assistant for a platform called FluxTurn. You help users:
1. Create automated workflows by understanding their requirements
2. Answer questions about workflow automation
3. Explain platform capabilities
4. Guide users in describing their automation needs

Be helpful, concise, and friendly. If the user asks to create a workflow, acknowledge it and ask for more details if needed. If they're just chatting, respond naturally but always steer the conversation towards helping them build workflows.

Available capabilities:
- Connect to 50+ services (Slack, Gmail, Google Sheets, OpenAI, etc.)
- Triggers (manual, scheduled, webhook)
- Data transformation
- Conditional logic
- Error handling`,
        },
      ];

      // Add conversation history (last 5 messages)
      const recentHistory = conversationHistory.slice(-5);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage,
      });

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content ||
             "I'm here to help you build workflows! What would you like to automate?";
    } catch (error) {
      this.logger.error('Failed to generate conversational response', error);
      return "I'm here to help you build workflows! Please describe what you'd like to automate.";
    }
  }

  /**
   * Map database row to response DTO
   */
  private mapToResponseDto(row: any): ConversationResponseDto {
    return {
      id: row.id,
      user_id: row.user_id,
      workflow_id: row.workflow_id,
      title: row.title,
      messages: Array.isArray(row.messages) ? row.messages : [],
      status: row.status,
      context: row.context || {},
      current_workflow: row.current_workflow,
      workflow_versions: row.workflow_versions || [],
      message_count: row.message_count || 0,
      last_message_at: row.last_message_at,
      project_id: row.project_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
