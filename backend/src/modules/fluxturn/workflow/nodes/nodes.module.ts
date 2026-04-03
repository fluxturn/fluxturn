import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NodeRegistry, NodeCategory } from './base';

// Import required modules for dependency injection
import { ConnectorsModule } from '../../connectors/connectors.module';
import { DatabaseModule } from '../../../database/database.module';

// Import services that executors need (provided locally in this module)
import { SimpleMemoryService } from '../services/simple-memory.service';
import { RedisMemoryService } from '../services/redis-memory.service';
import { ToolExecutorService } from '../services/tool-executor.service';
import { AIAgentService } from '../services/ai-agent.service';
import { ToolRegistryService } from '../services/tool-registry.service';
import { ConnectorToolProviderService } from '../services/connector-tool-provider.service';

// Trigger Executors
import {
  ManualTriggerExecutor,
  ScheduleTriggerExecutor,
  WebhookTriggerExecutor,
  FormTriggerExecutor,
  ChatTriggerExecutor,
  ConnectorTriggerExecutor,
} from './triggers';

// Action Executors
import {
  HttpRequestExecutor,
  ConnectorActionExecutor,
  DatabaseQueryExecutor,
  TransformDataExecutor,
  RunCodeExecutor,
  SetExecutor,
} from './actions';

// Control Flow Executors
import {
  LoopExecutor,
  WaitExecutor,
  MergeExecutor,
  SplitExecutor,
} from './control-flow';

// AI Executors
import {
  AIAgentExecutor,
  OpenAIChatModelExecutor,
  SimpleMemoryExecutor,
  RedisMemoryExecutor,
} from './ai';

// Tool Executors
import { ToolExecutor } from './tools';

/**
 * Nodes Module
 * Provides all node executors and the node registry
 *
 * Imports ConnectorsModule and DatabaseModule to provide required services
 * to executors that need them (ConnectorsService, PlatformService, etc.)
 */
@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ConnectorsModule),
    DatabaseModule,
  ],
  providers: [
    // Registry
    NodeRegistry,

    // Services needed by executors (provided locally)
    SimpleMemoryService,
    RedisMemoryService,
    ToolExecutorService,
    AIAgentService,
    ToolRegistryService,
    ConnectorToolProviderService,

    // Trigger Executors
    ManualTriggerExecutor,
    ScheduleTriggerExecutor,
    WebhookTriggerExecutor,
    FormTriggerExecutor,
    ChatTriggerExecutor,
    ConnectorTriggerExecutor,

    // Action Executors
    HttpRequestExecutor,
    ConnectorActionExecutor,
    DatabaseQueryExecutor,
    TransformDataExecutor,
    RunCodeExecutor,
    SetExecutor,

    // Control Flow Executors
    LoopExecutor,
    WaitExecutor,
    MergeExecutor,
    SplitExecutor,

    // AI Executors
    AIAgentExecutor,
    OpenAIChatModelExecutor,
    SimpleMemoryExecutor,
    RedisMemoryExecutor,

    // Tool Executors
    ToolExecutor,
  ],
  exports: [
    NodeRegistry,
    ConnectorToolProviderService,

    // Export all executors for use by other modules
    ManualTriggerExecutor,
    ScheduleTriggerExecutor,
    WebhookTriggerExecutor,
    FormTriggerExecutor,
    ChatTriggerExecutor,
    ConnectorTriggerExecutor,
    HttpRequestExecutor,
    ConnectorActionExecutor,
    DatabaseQueryExecutor,
    TransformDataExecutor,
    RunCodeExecutor,
    SetExecutor,
    LoopExecutor,
    WaitExecutor,
    MergeExecutor,
    SplitExecutor,
    AIAgentExecutor,
    OpenAIChatModelExecutor,
    SimpleMemoryExecutor,
    RedisMemoryExecutor,
    ToolExecutor,
  ],
})
export class NodesModule implements OnModuleInit {
  constructor(
    private readonly registry: NodeRegistry,

    // Trigger Executors
    private readonly manualTrigger: ManualTriggerExecutor,
    private readonly scheduleTrigger: ScheduleTriggerExecutor,
    private readonly webhookTrigger: WebhookTriggerExecutor,
    private readonly formTrigger: FormTriggerExecutor,
    private readonly chatTrigger: ChatTriggerExecutor,
    private readonly connectorTrigger: ConnectorTriggerExecutor,

    // Action Executors
    private readonly httpRequest: HttpRequestExecutor,
    private readonly connectorAction: ConnectorActionExecutor,
    private readonly databaseQuery: DatabaseQueryExecutor,
    private readonly transformData: TransformDataExecutor,
    private readonly runCode: RunCodeExecutor,
    private readonly set: SetExecutor,

    // Control Flow Executors
    private readonly loop: LoopExecutor,
    private readonly wait: WaitExecutor,
    private readonly merge: MergeExecutor,
    private readonly split: SplitExecutor,

    // AI Executors
    private readonly aiAgent: AIAgentExecutor,
    private readonly openaiChatModel: OpenAIChatModelExecutor,
    private readonly simpleMemory: SimpleMemoryExecutor,
    private readonly redisMemory: RedisMemoryExecutor,

    // Tool Executors
    private readonly tool: ToolExecutor,
  ) {}

  onModuleInit() {
    // Register all executors with the registry

    // Triggers
    this.registry.registerExecutor(this.manualTrigger, {
      category: NodeCategory.TRIGGER,
      description: 'Manually execute workflow',
    });
    this.registry.registerExecutor(this.scheduleTrigger, {
      category: NodeCategory.TRIGGER,
      description: 'Cron-based scheduled execution',
    });
    this.registry.registerExecutor(this.webhookTrigger, {
      category: NodeCategory.TRIGGER,
      description: 'HTTP webhook endpoint',
    });
    this.registry.registerExecutor(this.formTrigger, {
      category: NodeCategory.TRIGGER,
      description: 'Form submission trigger',
    });
    this.registry.registerExecutor(this.chatTrigger, {
      category: NodeCategory.TRIGGER,
      description: 'Chat message trigger',
    });
    this.registry.registerExecutor(this.connectorTrigger, {
      category: NodeCategory.TRIGGER,
      description: 'Connector-based triggers',
    });

    // Actions
    this.registry.registerExecutor(this.httpRequest, {
      category: NodeCategory.ACTION,
      description: 'Make HTTP/API requests',
    });
    this.registry.registerExecutor(this.connectorAction, {
      category: NodeCategory.ACTION,
      description: 'Execute connector actions',
    });
    this.registry.registerExecutor(this.databaseQuery, {
      category: NodeCategory.ACTION,
      description: 'Execute database queries',
    });
    this.registry.registerExecutor(this.transformData, {
      category: NodeCategory.ACTION,
      description: 'Transform data with expressions',
    });
    this.registry.registerExecutor(this.runCode, {
      category: NodeCategory.ACTION,
      description: 'Execute custom JavaScript code',
    });
    this.registry.registerExecutor(this.set, {
      category: NodeCategory.ACTION,
      description: 'Add, modify, or remove fields',
    });

    // Control Flow
    this.registry.registerExecutor(this.loop, {
      category: NodeCategory.CONTROL_FLOW,
      description: 'Iterate over array items',
    });
    this.registry.registerExecutor(this.wait, {
      category: NodeCategory.CONTROL_FLOW,
      description: 'Pause workflow execution',
    });
    this.registry.registerExecutor(this.merge, {
      category: NodeCategory.CONTROL_FLOW,
      description: 'Combine data from multiple inputs',
    });
    this.registry.registerExecutor(this.split, {
      category: NodeCategory.CONTROL_FLOW,
      description: 'Split data into multiple outputs',
    });

    // AI
    this.registry.registerExecutor(this.aiAgent, {
      category: NodeCategory.AI,
      description: 'AI agent with tool support',
    });
    this.registry.registerExecutor(this.openaiChatModel, {
      category: NodeCategory.AI,
      description: 'OpenAI model configuration',
    });
    this.registry.registerExecutor(this.simpleMemory, {
      category: NodeCategory.AI,
      description: 'In-memory conversation storage',
    });
    this.registry.registerExecutor(this.redisMemory, {
      category: NodeCategory.AI,
      description: 'Redis-backed conversation storage',
    });

    // Tools
    this.registry.registerExecutor(this.tool, {
      category: NodeCategory.TOOL,
      description: 'Tool nodes for AI Agent',
    });
  }
}
