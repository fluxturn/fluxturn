import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { AuthContext } from '../../database/interfaces/database.interface';
import { ConnectorsService } from '../connectors/connectors.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
  AddMessageDto,
  ListConversationsQueryDto,
  ConversationResponseDto,
  PaginatedConversationsDto,
  ChatMessageDto,
} from './dto/conversation.dto';

@ApiTags('Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly connectorsService: ConnectorsService,
  ) {}

  /**
   * Create a new conversation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiBody({ type: CreateConversationDto })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Request() req,
    @Body(ValidationPipe) dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const context = this.buildAuthContext(req);
    return this.conversationsService.create(dto, context);
  }

  /**
   * List conversations with pagination and filtering
   */
  @Get()
  @ApiOperation({ summary: 'List conversations' })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiQuery({ name: 'sort_by', required: false, enum: ['created_at', 'updated_at', 'last_message_at', 'title'] })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'archived', 'completed', 'deleted'] })
  @ApiQuery({ name: 'workflow_id', required: false, type: 'string' })
  @ApiQuery({ name: 'project_id', required: false, type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'List of conversations',
    type: PaginatedConversationsDto,
  })
  async list(
    @Request() req,
    @Query(new ValidationPipe({ transform: true }))
    query: ListConversationsQueryDto,
  ): Promise<PaginatedConversationsDto> {
    const context = this.buildAuthContext(req);
    return this.conversationsService.list(query, context);
  }

  /**
   * Get conversation by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiParam({ name: 'id', description: 'Conversation ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Conversation details',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getById(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConversationResponseDto> {
    const context = this.buildAuthContext(req);
    return this.conversationsService.getById(id, context);
  }

  /**
   * Update conversation
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID', format: 'uuid' })
  @ApiBody({ type: UpdateConversationDto })
  @ApiResponse({
    status: 200,
    description: 'Conversation updated',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: UpdateConversationDto,
  ): Promise<ConversationResponseDto> {
    const context = this.buildAuthContext(req);
    return this.conversationsService.update(id, dto, context);
  }

  /**
   * Delete conversation (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete conversation (soft delete)' })
  @ApiParam({ name: 'id', description: 'Conversation ID', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Conversation deleted' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async delete(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const context = this.buildAuthContext(req);
    await this.conversationsService.delete(id, context);
  }

  /**
   * Hard delete conversation (permanent)
   */
  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Conversation permanently deleted' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async hardDelete(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const context = this.buildAuthContext(req);
    await this.conversationsService.hardDelete(id, context);
  }

  /**
   * Add a message to a conversation
   */
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a message to a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID', format: 'uuid' })
  @ApiBody({ type: AddMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message added successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async addMessage(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) dto: AddMessageDto,
  ): Promise<ConversationResponseDto> {
    const context = this.buildAuthContext(req);
    return this.conversationsService.addMessage(id, dto, context);
  }

  /**
   * Get messages from a conversation
   */
  @Get(':id/messages')
  @ApiOperation({ summary: 'Get all messages from a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'List of messages',
    type: [ChatMessageDto],
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ChatMessageDto[]> {
    const context = this.buildAuthContext(req);
    return this.conversationsService.getMessages(id, context);
  }

  /**
   * Clear all messages from a conversation
   */
  @Delete(':id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all messages from a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Messages cleared successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async clearMessages(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConversationResponseDto> {
    const context = this.buildAuthContext(req);
    return this.conversationsService.clearMessages(id, context);
  }

  /**
   * Update workflow state in conversation
   */
  @Put(':id/workflow')
  @ApiOperation({ summary: 'Update workflow state in conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        workflow: {
          type: 'object',
          description: 'Workflow data',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow state updated',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async updateWorkflowState(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { workflow: any },
  ): Promise<ConversationResponseDto> {
    const context = this.buildAuthContext(req);
    return this.conversationsService.updateWorkflowState(
      id,
      body.workflow,
      context,
    );
  }

  /**
   * Detect intent from user message
   */
  @Post(':id/detect-intent')
  @ApiOperation({ summary: 'Detect intent from user message' })
  @ApiParam({ name: 'id', description: 'Conversation ID', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'User message to analyze',
        },
      },
      required: ['message'],
    },
  })
  @ApiResponse({ status: 200, description: 'Intent detection result' })
  async detectIntent(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message: string },
  ): Promise<any> {
    const context = this.buildAuthContext(req);
    const conversation = await this.conversationsService.getById(id, context);
    return this.conversationsService.detectIntent(
      body.message,
      conversation.messages,
    );
  }

  /**
   * Generate conversational AI response
   */
  @Post(':id/chat')
  @ApiOperation({ summary: 'Generate conversational AI response' })
  @ApiParam({ name: 'id', description: 'Conversation ID', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'User message',
        },
      },
      required: ['message'],
    },
  })
  @ApiResponse({ status: 200, description: 'AI response generated' })
  async generateChatResponse(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { message: string },
  ): Promise<{ response: string }> {
    const context = this.buildAuthContext(req);
    const conversation = await this.conversationsService.getById(id, context);
    const response = await this.conversationsService.generateConversationalResponse(
      body.message,
      conversation.messages,
    );
    return { response };
  }

  /**
   * Auto-configure connector from detected credentials
   */
  @Post(':id/auto-configure-connector')
  @ApiOperation({ summary: 'Auto-configure connector from credentials' })
  @ApiParam({ name: 'id', description: 'Conversation ID', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        connector: {
          type: 'string',
          description: 'Connector type (e.g., slack, openai)',
        },
        credentials: {
          type: 'object',
          description: 'Credential key-value pairs',
        },
      },
      required: ['connector', 'credentials'],
    },
  })
  @ApiResponse({ status: 201, description: 'Connector configured successfully' })
  async autoConfigureConnector(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { connector: string; credentials: Record<string, string> },
  ): Promise<any> {
    const context = this.buildAuthContext(req);

    // Create connector configuration
    const connectorConfig = await this.connectorsService.createConnectorConfig(
      {
        connector_type: body.connector,
        name: `${body.connector} (Auto-configured)`,
        config: body.credentials,
      },
      context,
    );

    return {
      success: true,
      connectorConfigId: connectorConfig.id,
      connectorType: body.connector,
      message: `${body.connector} configured successfully`,
    };
  }

  /**
   * Build auth context from request
   */
  private buildAuthContext(req: any): AuthContext {
    const user = req.user;
    return {
      type: 'jwt',
      userId: user?.id || user?.userId || user?.sub,
      organizationId: user?.organizationId,
      projectId: user?.projectId,
      appId: user?.appId,
    };
  }
}
