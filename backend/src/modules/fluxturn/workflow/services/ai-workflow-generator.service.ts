import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantService } from '../../../qdrant/qdrant.service';
import { PlatformService } from '../../../database/platform.service';
import { ConversationMemoryService } from './conversation-memory.service';
import { NodeTypeValidatorService } from './node-type-validator.service';
import { ConnectorLookup } from '../../connectors/shared';
import { BUILTIN_TRIGGERS, BUILTIN_ACTIONS, getBuiltinNode } from '../constants/builtin-nodes';
import { ConnectorRegistryService } from '../../connectors/connector-registry.service';
import { OrchestratedGeneratorService } from './orchestrated-generator.service';
import { validateWorkflow } from '../schemas/workflow.schema';
import OpenAI from 'openai';

/**
 * AI Workflow Generator with RAG (Retrieval-Augmented Generation)
 *
 * Architecture:
 * 1. Convert user prompt to embedding (OpenAI text-embedding-3-small)
 * 2. Search Qdrant for similar workflows, connectors, and rules
 * 3. Build context-enriched prompt with retrieved examples
 * 4. Generate workflow with OpenAI GPT-4 using structured output
 * 5. Validate and return workflow with confidence score
 */
@Injectable()
export class AIWorkflowGeneratorService {
  private readonly logger = new Logger(AIWorkflowGeneratorService.name);
  private openai: OpenAI;
  private readonly CONNECTOR_DOCS_COLLECTION = 'connector_docs';
  private readonly WORKFLOW_EXAMPLES_COLLECTION = 'workflow_examples';
  private readonly WORKFLOW_RULES_COLLECTION = 'workflow_rules';
  private readonly AVAILABLE_NODES_COLLECTION = 'available_nodes';

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly configService: ConfigService,
    private readonly platformService: PlatformService,
    private readonly conversationMemory: ConversationMemoryService,
    private readonly nodeTypeValidator: NodeTypeValidatorService,
    private readonly connectorRegistry: ConnectorRegistryService,
    private readonly orchestratedGenerator: OrchestratedGeneratorService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('✅ OpenAI client initialized for AI workflow generation');
      this.logger.log('✅ Multi-agent orchestrated generation enabled');
    } else {
      this.logger.warn('OpenAI API key not found - AI generation will be disabled');
    }
  }

  /**
   * ✨ NEW: Generate workflow using Multi-Agent Orchestrated System
   * This is the IMPROVED method that uses multiple specialized AI agents
   * for better accuracy and completeness.
   *
   * @param prompt - User's natural language description
   * @param options - Generation options
   */
  async generateWorkflowWithAgents(
    prompt: string,
    options: {
      availableConnectors: string[];
      userId?: string;
      projectId?: string;
      sessionId?: string;
      onProgress?: (step: string, data?: any) => void;
    },
  ): Promise<{
    success: boolean;
    workflow?: any;
    confidence: number;
    sessionId?: string;
    analysis?: any;
    error?: string;
  }> {
    try {
      if (!this.openai) {
        return {
          success: false,
          confidence: 0,
          error: 'OpenAI API key not configured',
        };
      }

      this.logger.log(`🚀 Generating workflow with Multi-Agent system: "${prompt.substring(0, 100)}..."`);

      // Session management
      const sessionId = options.sessionId || `user_${options.userId || 'anonymous'}_${Date.now()}`;
      await this.conversationMemory.addUserMessage(sessionId, prompt);

      // Use orchestrated generator (multi-agent system)
      const result = await this.orchestratedGenerator.generateWorkflow(
        prompt,
        options.availableConnectors,
        options.onProgress,
      );

      if (!result.success) {
        return {
          ...result,
          sessionId,
        };
      }

      // Zod schema validation
      const schemaValidation = validateWorkflow(result.workflow);
      if (!schemaValidation.isValid) {
        this.logger.warn('Schema validation failed:', schemaValidation.errors);
        // Auto-fix common schema issues
        result.workflow = this.autoFixSchemaIssues(result.workflow, schemaValidation.errors);
      }

      // Store in conversation memory
      const assistantResponse = JSON.stringify({
        workflow: result.workflow,
        confidence: result.confidence,
        analysis: result.analysis,
      });
      await this.conversationMemory.addAssistantMessage(sessionId, assistantResponse);

      this.logger.log(`✅ Multi-agent workflow generation complete! Confidence: ${result.confidence}%`);

      return {
        success: true,
        workflow: result.workflow,
        confidence: result.confidence,
        sessionId,
        analysis: {
          ...result.analysis,
          method: 'multi-agent-orchestrated',
          schemaValidation: schemaValidation.isValid ? 'passed' : 'auto-fixed',
        },
      };
    } catch (error) {
      this.logger.error('Multi-agent generation failed:', error);
      return {
        success: false,
        confidence: 0,
        error: error.message,
        sessionId: options.sessionId,
      };
    }
  }

  /**
   * Generate workflow from natural language prompt using RAG
   * (LEGACY METHOD - kept for backwards compatibility)
   *
   * @param prompt - User's natural language description
   * @param options - Generation options including sessionId for conversation memory
   */
  async generateWorkflowFromPrompt(
    prompt: string,
    options: {
      availableConnectors: string[];
      userId?: string;
      projectId?: string;
      sessionId?: string; // 🆕 For conversation memory
      detectedIntent?: any; // 🆕 Pre-detected intent from Stage 1
    },
  ): Promise<{
    success: boolean;
    workflow?: any;
    confidence: number;
    sessionId?: string; // 🆕 Session ID for conversation continuity
    analysis?: any;
    error?: string;
  }> {
    try {
      if (!this.openai) {
        return {
          success: false,
          confidence: 0,
          error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.',
        };
      }

      this.logger.log(`Generating workflow from prompt: "${prompt.substring(0, 100)}..."`);

      // 🆕 CONVERSATION MEMORY: Get or create session
      const sessionId = options.sessionId || `user_${options.userId || 'anonymous'}_${Date.now()}`;
      const conversationHistory = await this.conversationMemory.getHistory(sessionId);

      if (conversationHistory.length > 0) {
        this.logger.log(`📜 Using conversation history: ${conversationHistory.length} previous messages for session ${sessionId}`);
      } else {
        this.logger.log(`🆕 Starting new conversation session: ${sessionId}`);
      }

      // Add current prompt to conversation memory
      await this.conversationMemory.addUserMessage(sessionId, prompt);

      // Step 1: Create embedding for the prompt
      const promptEmbedding = await this.createEmbedding(prompt);

      // Step 2: Retrieve relevant context from Qdrant (RAG)
      const context = await this.retrieveRelevantContext(
        promptEmbedding,
        options.availableConnectors,
      );

      // Step 3: Generate workflow using OpenAI with context + conversation history
      const generationResult = await this.generateWithOpenAI(
        prompt,
        context,
        options.availableConnectors,
        conversationHistory, // 🆕 Pass conversation history
        options.userId, // 🆕 Pass userId for credential context
      );

      // Step 4: Post-process and validate with allowed node types
      if (generationResult.success && generationResult.workflow) {
        // 🎯 CRITICAL FIX: Validate against ALL node types from database, not just Qdrant results
        // This prevents false validation failures when AI uses valid but non-retrieved nodes
        const allNodeTypesResult = await this.fetchNodeTypesFromDatabase();
        const allowedNodeTypes = [
          ...allNodeTypesResult.builtinTriggers.map(n => n.type),
          ...allNodeTypesResult.builtinActions.map(n => n.type),
          'CONNECTOR_TRIGGER', // Always allow connector triggers
          'CONNECTOR_ACTION',  // Always allow connector actions
        ];

        this.logger.log(`🔍 Validating workflow against ${allowedNodeTypes.length} available node types`);

        const validated = await this.validateAndEnhanceWorkflow(
          generationResult.workflow,
          options.availableConnectors,
          allowedNodeTypes, // Pass ALL node types for validation
        );

        // 🆕 CONVERSATION MEMORY: Store assistant response
        const assistantResponse = JSON.stringify({
          workflow: validated.workflow,
          confidence: validated.confidence,
          intent: generationResult.analysis?.detectedIntent,
        });
        await this.conversationMemory.addAssistantMessage(sessionId, assistantResponse);

        this.logger.log(`💾 Stored workflow in conversation memory for session ${sessionId}`);

        return {
          success: true,
          workflow: validated.workflow,
          confidence: validated.confidence,
          sessionId, // 🆕 Return sessionId for subsequent requests
          analysis: {
            ...generationResult.analysis,
            validation: validated.validationResults,
            contextUsed: {
              similarWorkflows: context.similarWorkflows.length,
              connectorDocs: context.connectorDocs.length,
              rules: context.rules.length,
            },
            conversationTurns: conversationHistory.length / 2, // Number of back-and-forth exchanges
          },
        };
      }

      // Ensure confidence is always set
      return {
        ...generationResult,
        confidence: generationResult.confidence || 0,
        sessionId, // 🆕 Return sessionId even on failure
      };
    } catch (error) {
      this.logger.error('Error generating workflow:', error);
      return {
        success: false,
        confidence: 0,
        error: error.message || 'Failed to generate workflow',
      };
    }
  }

  /**
   * Generate conversational, technical analysis of a workflow request
   * This produces natural language analysis instead of structured templates
   */
  async generateConversationalAnalysis(
    prompt: string,
    options: {
      availableConnectors: string[];
      userId?: string;
      sessionId?: string;
    },
  ): Promise<{
    success: boolean;
    analysis: string;  // Natural conversational analysis
    steps: string[];   // Technical steps extracted
    estimatedNodes: number;
    requiredConnectors: string[];
    confidence: number;
    similarTemplates?: any[];  // 🆕 Similar template suggestions
    error?: string;
  }> {
    try {
      if (!this.openai) {
        return {
          success: false,
          analysis: '',
          steps: [],
          estimatedNodes: 0,
          requiredConnectors: [],
          confidence: 0,
          error: 'OpenAI API key not configured',
        };
      }

      this.logger.log(`Generating conversational analysis for: "${prompt.substring(0, 100)}..."`);

      // Get conversation history if available
      const sessionId = options.sessionId || `temp_${Date.now()}`;
      const context = await this.conversationMemory.getContextForAI(sessionId);

      // Create embedding for RAG
      const embedding = await this.createEmbedding(prompt);
      const ragContext = await this.retrieveRelevantContext(embedding, options.availableConnectors);

      // 🎯 CRITICAL: Fetch ALL node types from database (just like generateWorkflow does)
      const allNodeTypesResult = await this.fetchNodeTypesFromDatabase();
      const builtinTriggers = allNodeTypesResult.builtinTriggers;
      const builtinActions = allNodeTypesResult.builtinActions;
      const connectors = allNodeTypesResult.connectors;

      this.logger.log(
        `📦 Analysis using ${builtinTriggers.length} triggers, ${builtinActions.length} actions, ${connectors.length} connectors from database`
      );

      // 🆕 ENHANCEMENT: Search for similar templates
      const similarTemplates = await this.qdrantService.searchVectors(
        this.WORKFLOW_EXAMPLES_COLLECTION,
        embedding,
        3, // Top 3 most similar templates
      );

      this.logger.log(`Found ${similarTemplates.length} similar templates for analysis`);

      // Build template context for AI
      let templateContext = '';
      if (similarTemplates.length > 0) {
        templateContext = '\n\n🎯 SIMILAR WORKFLOW TEMPLATES FOUND:\n';
        similarTemplates.forEach((template, idx) => {
          const payload = template.payload;
          const similarity = Math.round(template.score * 100);
          templateContext += `\n${idx + 1}. "${payload.name}" (${similarity}% match)`;
          templateContext += `\n   - ${payload.description || 'No description'}`;
          templateContext += `\n   - Connectors: ${payload.connectors?.join(', ') || 'none'}`;
          templateContext += `\n   - Complexity: ${payload.complexity}`;
          templateContext += `\n   - Node count: ${payload.canvas?.nodes?.length || 0}`;
        });
        templateContext += '\n\nUse these templates as reference for your analysis.\n';
      }

      // 🎯 Build dynamic lists of available triggers and actions from database
      const availableTriggersText = builtinTriggers.map(t => `${t.type} (${t.name})`).join(', ');
      const availableActionsText = builtinActions.map(a => `${a.type} (${a.name})`).join(', ');

      // Build connector triggers/actions
      const connectorTriggersActions = connectors
        .filter(c => options.availableConnectors.includes(c.name))
        .map(c => {
          const triggers = (c.supported_triggers || []).map((t: any) => t.id).join(', ');
          const actions = (c.supported_actions || []).map((a: any) => a.id).join(', ');
          return `  - ${c.name}: ${triggers ? `Triggers: ${triggers}` : ''}${triggers && actions ? '; ' : ''}${actions ? `Actions: ${actions}` : ''}`;
        })
        .filter(line => line.includes('Triggers:') || line.includes('Actions:'))
        .join('\n');

      // Build conversational analysis prompt
      const systemPrompt = `You are a workflow automation expert. Analyze the user's request and provide a BRIEF, CONCISE explanation (2-3 sentences max).

CRITICAL RULES FOR NODE COUNTING:
1. Each trigger = 1 node
2. Each condition/if-else logic = 1 IF node
3. Each AI analysis or API call = 1 HTTP_REQUEST or AI_AGENT node
4. Each action = 1 node
5. If workflow has "if good/bad" or conditional logic:
   - Add 1 node for the analysis/check
   - Add 1 IF node for the condition
   - Add separate action nodes for each branch

AVAILABLE NODE TYPES:
Built-in Triggers: ${availableTriggersText}
Built-in Actions: ${availableActionsText}

Connector-specific Triggers & Actions:
${connectorTriggersActions}
${templateContext}

Respond in JSON format:
{
  "analysis": "Brief 2-3 sentence explanation",
  "steps": ["Step 1: ...", "Step 2: ..."],
  "estimatedNodes": <accurate count>,
  "requiredConnectors": ["connector1"],
  "confidence": 90
}

EXAMPLES:

Simple workflow (2 nodes):
User: "when message in gmail send it to telegram"
Response: {
  "analysis": "You need Gmail Trigger to detect new emails, then use Telegram action to send the email content. This workflow consists of 2 nodes.",
  "steps": ["Trigger: Gmail (when new email received)", "Action: Send message to Telegram"],
  "estimatedNodes": 2,
  "requiredConnectors": ["gmail", "telegram"],
  "confidence": 95
}

Conditional workflow (5 nodes):
User: "when someone comments on facebook, check if good or bad comment, if good reply thanks, if bad delete"
Response: {
  "analysis": "You need Facebook Trigger to detect new comments, then use AI to analyze sentiment, followed by an IF condition to check sentiment, then Reply action for positive comments and Delete action for negative comments. This workflow consists of 5 nodes total.",
  "steps": ["Trigger: Facebook (new comment)", "Action: AI sentiment analysis (HTTP_REQUEST or AI_AGENT)", "Condition: IF sentiment is positive/negative", "Action: Reply to comment (if positive)", "Action: Delete comment (if negative)"],
  "estimatedNodes": 5,
  "requiredConnectors": ["facebook_graph", "openai"],
  "confidence": 90
}`;

      const userPrompt = `Analyze this workflow request: "${prompt}"

${context.summary ? `Context: ${context.summary}` : ''}

Provide BRIEF analysis (2-3 sentences max) with exact node count.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content);

      this.logger.log(`✅ Generated conversational analysis (${result.estimatedNodes} nodes, ${similarTemplates.length} templates)`);

      // 🆕 Format similar templates for frontend
      const formattedTemplates = similarTemplates.map(template => ({
        id: template.payload.id,
        name: template.payload.name,
        description: template.payload.description,
        similarity: Math.round(template.score * 100),
        connectors: template.payload.connectors,
        complexity: template.payload.complexity,
        nodeCount: template.payload.canvas?.nodes?.length || 0,
      }));

      return {
        success: true,
        analysis: result.analysis || '',
        steps: result.steps || [],
        estimatedNodes: result.estimatedNodes || 2,
        requiredConnectors: result.requiredConnectors || [],
        confidence: result.confidence || 80,
        similarTemplates: formattedTemplates, // 🆕 Include similar templates
      };
    } catch (error) {
      this.logger.error('Error generating conversational analysis:', error);
      return {
        success: false,
        analysis: '',
        steps: [],
        estimatedNodes: 0,
        requiredConnectors: [],
        confidence: 0,
        error: error.message,
      };
    }
  }

  /**
   * Generate conversational response (for non-workflow interactions)
   *
   * @param prompt - User's message
   * @param conversationHistory - Previous conversation for context
   * @param sessionId - Session ID for storing response
   */
  async generateConversationalResponse(
    prompt: string,
    conversationHistory: Array<{ role: string; content: string }>,
    sessionId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!this.openai) {
        return {
          success: false,
          message: 'AI is currently unavailable. Please try again later.',
        };
      }

      this.logger.log(`Generating conversational response for: "${prompt.substring(0, 100)}..."`);

      // Store user message
      await this.conversationMemory.addUserMessage(sessionId, prompt);

      const systemPrompt = `You are a helpful AI assistant for a workflow automation platform called Fluxturn.

You help users automate their work by creating workflows that connect different apps and services.

When users greet you, ask questions, or have casual conversation:
- Be friendly and helpful
- Answer their questions clearly
- If they ask about capabilities, explain what connectors and workflows you can create
- If they're unclear about workflows, guide them toward creating one
- Keep responses concise and helpful

Available connectors include: Gmail, Telegram, Slack, Twitter, Facebook, OpenAI, Google Sheets, and many more.

Respond naturally and helpfully!`;

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Include conversation history (last 10 messages for context)
      if (conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-10);
        messages.push(...recentHistory.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        })));
      }

      // Add current prompt
      messages.push({ role: 'user', content: prompt });

      this.logger.log(`💬 Generating conversational response with ${messages.length} messages`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use cheaper model for conversational responses
        messages,
        temperature: 0.7, // Slightly higher temperature for more natural conversation
      });

      const response = completion.choices[0].message.content || 'I apologize, I could not generate a response.';

      // Store assistant response
      await this.conversationMemory.addAssistantMessage(sessionId, response);

      this.logger.log(`💾 Stored conversational response in memory for session ${sessionId}`);

      return {
        success: true,
        message: response,
      };
    } catch (error) {
      this.logger.error('Error generating conversational response:', error);
      return {
        success: false,
        message: 'I apologize, I encountered an error processing your message. Please try again.',
      };
    }
  }

  /**
   * Create embedding for text using OpenAI
   */
  private async createEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.configService.get<string>('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small';

      const response = await this.openai.embeddings.create({
        model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Error creating embedding:', error);
      throw new Error('Failed to create embedding for prompt');
    }
  }

  /**
   * Retrieve relevant context using vector similarity search
   */
  private async retrieveRelevantContext(
    embedding: number[],
    availableConnectors: string[],
  ): Promise<{
    similarWorkflows: any[];
    connectorDocs: any[];
    rules: any[];
    availableNodes: any[];
  }> {
    const context = {
      similarWorkflows: [],
      connectorDocs: [],
      rules: [],
      availableNodes: [],
    };

    try {
      // 🎯 STEP 1: Query available nodes from Qdrant (MOST IMPORTANT)
      // This constrains the AI to only use nodes that actually exist
      const availableNodesResults = await this.qdrantService.searchVectors(
        this.AVAILABLE_NODES_COLLECTION,
        embedding,
        50, // Top 50 relevant available nodes (increased from 20 to cover more use cases)
      );
      context.availableNodes = availableNodesResults.map((n) => n.payload);

      this.logger.log(
        `🎯 Found ${context.availableNodes.length} relevant available nodes from Qdrant`
      );

      // Search for similar workflow examples
      const workflows = await this.qdrantService.searchVectors(
        this.WORKFLOW_EXAMPLES_COLLECTION,
        embedding,
        5, // Top 5 similar workflows
      );
      // 🔧 FIX: Keep BOTH score and payload, don't lose the score!
      context.similarWorkflows = workflows.map((w) => ({
        score: w.score,
        payload: w.payload,
      }));

      // Search for relevant connector documentation
      const connectors = await this.qdrantService.searchVectors(
        this.CONNECTOR_DOCS_COLLECTION,
        embedding,
        10, // Top 10 relevant connectors
      );
      // Filter to only available connectors
      context.connectorDocs = connectors
        .map((c) => c.payload)
        .filter((doc) => availableConnectors.includes(doc.name));

      // Search for relevant rules/patterns
      const rules = await this.qdrantService.searchVectors(
        this.WORKFLOW_RULES_COLLECTION,
        embedding,
        5, // Top 5 relevant rules
      );
      context.rules = rules.map((r) => r.payload);

      this.logger.log(
        `Retrieved context: ${context.availableNodes.length} nodes, ${context.similarWorkflows.length} workflows, ${context.connectorDocs.length} connectors, ${context.rules.length} rules`,
      );
    } catch (error) {
      this.logger.warn('Error retrieving context from Qdrant:', error.message);
      // Continue without context if Qdrant is not available
    }

    return context;
  }

  /**
   * Generate workflow using OpenAI with retrieved context
   */
  private async generateWithOpenAI(
    prompt: string,
    context: any,
    availableConnectors: string[],
    conversationHistory: any[] = [], // 🆕 Conversation history for context
    userId?: string, // 🆕 User ID for credential context
  ): Promise<{
    success: boolean;
    workflow?: any;
    confidence: number;
    analysis?: any;
    error?: string;
  }> {
    try {
      // Use gpt-4o-mini or gpt-4o which support JSON mode
      // gpt-4 (legacy) doesn't support response_format: json_object
      const configModel = this.configService.get<string>('OPENAI_MODEL');
      let model = 'gpt-4o-mini'; // Default to gpt-4o-mini (supports JSON mode)

      // Map legacy model names to supported models
      if (configModel === 'gpt-4-turbo' || configModel === 'gpt-4o') {
        model = configModel;
      } else if (configModel === 'gpt-4') {
        // gpt-4 doesn't support JSON mode, use gpt-4o instead
        model = 'gpt-4o';
        this.logger.warn('gpt-4 does not support JSON mode, using gpt-4o instead');
      }

      // Build context-enriched system message
      const systemMessage = await this.buildSystemMessage(context, availableConnectors, userId);

      // Build user message with examples
      const userMessage = this.buildUserMessage(prompt, context);

      // 🆕 CONVERSATION MEMORY: Build messages array with history
      const messages: any[] = [
        { role: 'system', content: systemMessage },
      ];

      // Include previous conversation (exclude current prompt which is already added to memory)
      if (conversationHistory.length > 1) {
        // Skip the last message (current user prompt) as we'll add it separately
        const previousMessages = conversationHistory.slice(0, -1);
        messages.push(...previousMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })));
        this.logger.log(`📜 Including ${previousMessages.length} previous messages in context`);
      }

      // Add current user message last
      messages.push({ role: 'user', content: userMessage });

      // 🔍 DEBUG: Log what we're sending to OpenAI
      this.logger.log(`📤 Sending ${messages.length} messages to OpenAI:`);
      messages.forEach((msg, idx) => {
        const contentPreview = typeof msg.content === 'string'
          ? msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
          : JSON.stringify(msg.content).substring(0, 100);

        this.logger.log(`  [${idx}] ${msg.role}: ${contentPreview}`);
      });

      // 🐛 DEBUG: Save full system prompt to file for inspection - DISABLED
      // if (process.env.NODE_ENV !== 'production') {
      //   const fs = require('fs');
      //   const path = require('path');
      //   const debugDir = path.join(process.cwd(), 'debug');
      //   if (!fs.existsSync(debugDir)) {
      //     fs.mkdirSync(debugDir, { recursive: true });
      //   }
      //   const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      //   const debugFile = path.join(debugDir, `ai-prompt-${timestamp}.txt`);
      //   const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
      //   fs.writeFileSync(debugFile, systemPrompt, 'utf8');
      //   this.logger.debug(`💾 Saved AI system prompt to: ${debugFile}`);
      // }

      const completion = await this.openai.chat.completions.create({
        model,
        messages,
        response_format: { type: 'json_object' },
        // Note: temperature cannot be set when using response_format: json_object
        // OpenAI only supports the default value (1) with structured outputs
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      const parsedResponse = JSON.parse(responseContent);

      // Ensure we have a valid workflow structure
      if (!parsedResponse.workflow) {
        throw new Error('Invalid response: missing workflow object');
      }

      // 🐛 DEBUG: Log all generated node types for troubleshooting
      if (parsedResponse.workflow?.canvas?.nodes) {
        const nodeTypes = parsedResponse.workflow.canvas.nodes.map((n: any) => n.type);
        this.logger.log(`🔍 AI Generated node types: ${nodeTypes.join(', ')}`);
      }

      return {
        success: true,
        workflow: parsedResponse.workflow,
        confidence: parsedResponse.confidence || 70,
        analysis: {
          detectedIntent: parsedResponse.intent,
          suggestedConnectors: parsedResponse.connectors,
          complexity: parsedResponse.complexity,
          estimatedDuration: parsedResponse.estimatedDuration,
        },
      };
    } catch (error) {
      this.logger.error('Error generating with OpenAI:', error);
      return {
        success: false,
        workflow: undefined,
        confidence: 0,
        error: error.message || 'OpenAI generation failed',
      };
    }
  }

  /**
   * STEP 1: Extract relevant node types from RAG context
   * Instead of sending ALL node types, we intelligently select only what's needed
   */
  private extractRelevantNodeTypes(
    context: any,
    allNodeTypes: { builtinTriggers: any[]; builtinActions: any[]; connectors: any[] },
  ): {
    relevantTriggers: any[];
    relevantActions: any[];
    relevantConnectors: any[];
    reasoning: string;
  } {
    const requiredNodeTypes = new Set<string>();
    const requiredConnectors = new Set<string>();
    const reasoning: string[] = [];

    // Extract node types from retrieved rules
    if (context.rules && context.rules.length > 0) {
      context.rules.forEach((rule: any) => {
        if (rule.required_nodes && Array.isArray(rule.required_nodes)) {
          rule.required_nodes.forEach((nodeType: string) => requiredNodeTypes.add(nodeType));
        }
        if (rule.suggested_actions && Array.isArray(rule.suggested_actions)) {
          rule.suggested_actions.forEach((nodeType: string) => requiredNodeTypes.add(nodeType));
        }
        if (rule.required_connectors && Array.isArray(rule.required_connectors)) {
          rule.required_connectors.forEach((connector: string) => requiredConnectors.add(connector));
        }
        reasoning.push(`Rule: ${rule.pattern} suggests ${rule.required_nodes?.join(', ')}`);
      });
    }

    // Extract connectors from RAG results
    if (context.connectorDocs && context.connectorDocs.length > 0) {
      context.connectorDocs.forEach((doc: any) => {
        requiredConnectors.add(doc.name);
        reasoning.push(`Connector: ${doc.name} is relevant`);
      });
    }

    // Extract node types from similar workflows
    if (context.similarWorkflows && context.similarWorkflows.length > 0) {
      context.similarWorkflows.forEach((workflow: any) => {
        if (workflow.node_types && Array.isArray(workflow.node_types)) {
          workflow.node_types.forEach((nodeType: string) => requiredNodeTypes.add(nodeType));
        }
        if (workflow.connectors && Array.isArray(workflow.connectors)) {
          workflow.connectors.forEach((connector: string) => requiredConnectors.add(connector));
        }
      });
    }

    // Always include essential base triggers (user can start workflow somehow)
    ['MANUAL_TRIGGER', 'FORM_TRIGGER', 'WEBHOOK_TRIGGER', 'SCHEDULE_TRIGGER'].forEach((t) =>
      requiredNodeTypes.add(t),
    );

    // Always include essential base actions (common operations)
    ['SEND_EMAIL', 'SEND_SLACK', 'HTTP_REQUEST', 'TRANSFORM', 'CONDITION', 'CONNECTOR_ACTION', 'CONNECTOR_TRIGGER'].forEach((a) =>
      requiredNodeTypes.add(a),
    );

    // Filter node types based on what's actually relevant
    const relevantTriggers = allNodeTypes.builtinTriggers.filter((trigger) => requiredNodeTypes.has(trigger.type));

    const relevantActions = allNodeTypes.builtinActions.filter((action) => requiredNodeTypes.has(action.type));

    const relevantConnectors = allNodeTypes.connectors.filter((conn) => requiredConnectors.has(conn.name));

    this.logger.log(
      `🎯 RAG Filtered: ${relevantTriggers.length}/${allNodeTypes.builtinTriggers.length} triggers, ${relevantActions.length}/${allNodeTypes.builtinActions.length} actions, ${relevantConnectors.length}/${allNodeTypes.connectors.length} connectors`,
    );

    return {
      relevantTriggers,
      relevantActions,
      relevantConnectors,
      reasoning: reasoning.join('; '),
    };
  }

  /**
   * Fetch ALL node types and connector capabilities from IN-MEMORY REGISTRY
   * ✅ NO DATABASE QUERIES - Following n8n's pattern
   */
  private async fetchNodeTypesFromDatabase(): Promise<{
    builtinTriggers: any[];
    builtinActions: any[];
    connectors: any[];
  }> {
    try {
      // ✅ Load built-in triggers from TypeScript constants (NO DATABASE)
      const builtinTriggers = BUILTIN_TRIGGERS;

      // ✅ Load built-in actions from TypeScript constants (NO DATABASE)
      const builtinActions = BUILTIN_ACTIONS;

      // ✅ Fetch connector capabilities from ConnectorLookup (already in-memory)
      const connectorDefs = ConnectorLookup.getAll();
      const connectors = connectorDefs.map(c => ({
        name: c.name,
        display_name: c.display_name,
        description: c.description,
        category: c.category,
        supported_triggers: c.supported_triggers || [],
        supported_actions: c.supported_actions || [],
        webhook_support: c.webhook_support,
      }));

      this.logger.log(
        `✅ Loaded from in-memory registry: ` +
        `${builtinTriggers.length} built-in triggers, ` +
        `${builtinActions.length} built-in actions, ` +
        `${connectors.length} connectors (NO DATABASE)`
      );

      return { builtinTriggers, builtinActions, connectors };
    } catch (error) {
      this.logger.error('Error fetching node types from in-memory registry:', error);
      // Return empty arrays if loading fails
      return { builtinTriggers: [], builtinActions: [], connectors: [] };
    }
  }

  /**
   * STEP 2: Build context-enriched system message with ALL available nodes
   * 🎯 FOLLOWING N8N APPROACH: Send ALL nodes to AI, not just RAG-filtered subset
   * This ensures AI knows about ALL available connectors and actions
   */
  private async buildSystemMessage(context: any, availableConnectors: string[], userId?: string): Promise<string> {
    // 🎯 N8N APPROACH: Fetch ALL node types from in-memory registry
    // Don't filter by RAG - the AI needs to know about EVERYTHING available
    const allNodeTypesResult = await this.fetchNodeTypesFromDatabase();
    const builtinTriggers = allNodeTypesResult.builtinTriggers;
    const builtinActions = allNodeTypesResult.builtinActions;
    const connectors = allNodeTypesResult.connectors;

    this.logger.log(
      `📦 Sending ALL nodes to AI: ${builtinTriggers.length} triggers, ${builtinActions.length} actions, ${connectors.length} connectors (n8n approach)`
    );

    // 🐛 DEBUG: Log connector details
    this.logger.debug('🔍 ALL available connectors:');
    connectors.forEach(conn => {
      const triggerCount = (conn.supported_triggers || []).length;
      const actionCount = (conn.supported_actions || []).length;
      this.logger.debug(`  - ${conn.name}: ${triggerCount} triggers, ${actionCount} actions`);
    });

    return this.buildSystemMessageFromNodes(
      builtinTriggers,
      builtinActions,
      connectors,
      availableConnectors,
      userId,
      context
    );
  }

  /**
   * Extract connectors from RAG node results
   * Groups connector triggers/actions by connector name
   * Note: Qdrant payload uses camelCase (connectorType, isTrigger, isAction)
   */
  private async extractConnectorsFromNodes(nodes: any[]): Promise<any[]> {
    const connectorsMap = new Map<string, any>();

    // Find all connector-related nodes
    // Note: Using camelCase keys from Qdrant payload
    const connectorNodes = nodes.filter(n => n.connectorType || n.type === 'CONNECTOR_TRIGGER' || n.type === 'CONNECTOR_ACTION');

    this.logger.debug(`🔍 Found ${connectorNodes.length} connector-related nodes in RAG results`);

    // Group nodes by connector
    connectorNodes.forEach(node => {
      const connectorName = node.connectorType;
      if (!connectorName) {
        this.logger.debug(`⚠️ Node ${node.type} has no connectorType, skipping`);
        return;
      }

      // Initialize connector if not exists
      if (!connectorsMap.has(connectorName)) {
        connectorsMap.set(connectorName, {
          name: connectorName,
          display_name: node.connectorDisplayName || connectorName,
          category: node.category || 'general',
          description: node.connectorDescription || node.description || '',
          supported_triggers: [],
          supported_actions: []
        });
      }

      const connector = connectorsMap.get(connectorName);

      // Add trigger if this is a trigger node
      if (node.isTrigger && node.type === 'CONNECTOR_TRIGGER') {
        // Extract trigger info from configSchema or use node properties
        const triggerId = node.configSchema?.triggerId || node.name.toLowerCase().replace(/\s+/g, '_');
        const triggerName = node.name || triggerId;

        connector.supported_triggers.push({
          id: triggerId,
          name: triggerName,
          description: node.description || '',
          eventType: node.configSchema?.eventType || 'generic',
          webhookRequired: node.configSchema?.webhookRequired || false
        });
      }

      // Add action if this is an action node
      if (node.isAction && node.type === 'CONNECTOR_ACTION') {
        const actionId = node.configSchema?.actionId || node.name.toLowerCase().replace(/\s+/g, '_');
        const actionName = node.name || actionId;

        connector.supported_actions.push({
          id: actionId,
          name: actionName,
          description: node.description || '',
          category: node.category || 'general'
        });
      }
    });

    // Get unique connector names from RAG results
    const connectorNames = Array.from(connectorsMap.keys());

    if (connectorNames.length === 0) {
      this.logger.warn('⚠️ No connector nodes found in RAG results');
      return [];
    }

    // Fetch full connector details from TypeScript constants (no database query)
    const connectorDetails = connectorNames
      .map(name => ConnectorLookup.getByName(name))
      .filter(c => c !== null)
      .map(c => ({
        name: c.name,
        display_name: c.display_name,
        category: c.category,
        description: c.description,
        supported_triggers: c.supported_triggers || [],
        supported_actions: c.supported_actions || [],
      }));

    this.logger.log(`📦 Fetched ${connectorDetails.length} full connector details for RAG-identified connectors: ${connectorNames.join(', ')}`);

    return connectorDetails;
  }

  /**
   * Fallback: Build message with essential nodes when Qdrant is unavailable
   */
  private async buildSystemMessageWithEssentialNodes(availableConnectors: string[], userId?: string, context?: any): Promise<string> {
    // Fetch only essential base node types
    const essentialTypes = [
      'MANUAL_TRIGGER', 'FORM_TRIGGER', 'WEBHOOK_TRIGGER', 'SCHEDULE_TRIGGER',
      'HTTP_REQUEST', 'IF_CONDITION', 'TRANSFORM_DATA', 'CONNECTOR_TRIGGER', 'CONNECTOR_ACTION'
    ];

    const result = await this.platformService.query(
      `SELECT * FROM node_types WHERE type = ANY($1) AND is_active = true`,
      [essentialTypes]
    );

    const builtinTriggers = result.rows.filter(n => n.is_trigger && n.is_builtin);
    const builtinActions = result.rows.filter(n => n.is_action && n.is_builtin);

    // Fetch connectors from TypeScript constants (no database query)
    const connectorDetails = availableConnectors
      .map(name => ConnectorLookup.getByName(name))
      .filter(c => c !== null)
      .map(c => ({
        name: c.name,
        display_name: c.display_name,
        category: c.category,
        description: c.description,
        supported_triggers: c.supported_triggers || [],
        supported_actions: c.supported_actions || [],
      }));

    this.logger.warn(`⚠️ Fallback mode: Using ${builtinTriggers.length} triggers, ${builtinActions.length} actions, ${connectorDetails.length} connectors`);

    return this.buildSystemMessageFromNodes(
      builtinTriggers,
      builtinActions,
      connectorDetails,
      availableConnectors,
      userId,
      context
    );
  }

  /**
   * Build system message from node lists (extracted for reusability)
   */
  private async buildSystemMessageFromNodes(
    builtinTriggers: any[],
    builtinActions: any[],
    connectors: any[],
    availableConnectors: string[],
    userId?: string,
    context?: any
  ): Promise<string> {

    // 🆕 Fetch user's configured credentials for auto-configuration
    const userCredentials = await this.getUserCredentials(userId);
    this.logger.log(`📋 Found ${userCredentials.length} configured credentials for user`);

    let message = `You are an expert workflow automation architect. Generate executable workflow configurations from natural language descriptions.

🎯 CRITICAL EFFICIENCY RULE:
Use the MINIMUM number of nodes required to accomplish the task. DO NOT add unnecessary intermediate nodes.
- If the task needs 2 nodes, create exactly 2 nodes
- If the task needs 3 nodes, create exactly 3 nodes
- Never add extra nodes for "better structure" or "flexibility"

Example: "forward gmail to telegram" = 2 nodes ONLY (Gmail Trigger + Telegram Action)`;

    // 🆕 ENHANCEMENT: Add template guidance if highly similar template exists
    if (context?.similarWorkflows && context.similarWorkflows.length > 0) {
      this.logger.log(`🔍 Evaluating ${context.similarWorkflows.length} similar templates for guidance`);

      const bestMatch = context.similarWorkflows[0];
      const similarity = bestMatch.score || 0;

      // 🐛 DEBUG: Log full template info
      this.logger.log(`📊 Best match: "${bestMatch.payload?.name || 'NO NAME'}" (similarity: ${Math.round(similarity * 100)}%)`);
      this.logger.log(`   Has canvas: ${!!bestMatch.payload?.canvas}`);
      this.logger.log(`   Has description: ${!!bestMatch.payload?.description}`);
      this.logger.log(`   Connectors: ${bestMatch.payload?.connectors?.join(', ') || 'none'}`);

      // 🔧 LOWERED THRESHOLD: Use templates more aggressively (was 0.75, now 0.55)
      if (similarity > 0.55 && bestMatch.payload?.canvas) {
        // High similarity - use as structural guide
        const template = bestMatch.payload;
        const nodeCount = template.canvas?.nodes?.length || 0;
        const similarity_pct = Math.round(similarity * 100);

        message += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 RELEVANT TEMPLATE FOUND (${similarity_pct}% match)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Template: "${template.name}"
Description: ${template.description || 'N/A'}
Connectors: ${template.connectors?.join(', ') || 'none'}
Complexity: ${template.complexity}
Node Count: ${nodeCount} nodes

📋 TEMPLATE WORKFLOW STRUCTURE:
`;

        // Extract and show the workflow pattern
        if (template.canvas?.nodes) {
          message += `\nNodes in template:\n`;
          template.canvas.nodes.forEach((node: any, idx: number) => {
            const nodeType = node.type || 'UNKNOWN';
            const label = node.data?.label || 'Unlabeled';
            const connector = node.data?.connector || node.data?.connectorType || '';
            const action = node.data?.action || node.data?.actionId || node.data?.trigger || node.data?.triggerId || '';

            message += `${idx + 1}. ${nodeType}`;
            if (connector) message += ` (${connector}`;
            if (action) message += `:${action}`;
            if (connector) message += `)`;
            message += ` - "${label}"\n`;
          });
        }

        message += `\n📐 USE THIS TEMPLATE AS YOUR STRUCTURAL GUIDE:
1. CRITICAL: Only use triggers/actions that ACTUALLY EXIST in the database (shown below)
2. Follow the same node connection pattern (trigger → actions)
3. Use similar node types where applicable
4. Adapt the configuration to match the user's specific request
5. Maintain the proven workflow logic flow
6. Verify connector capabilities before using them

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

        this.logger.log(`🎯 Using template "${template.name}" as structural guide (${similarity_pct}% match)`);
      } else if (similarity > 0.40) {
        // Moderate similarity - mention as reference
        const template = bestMatch.payload;
        message += `\n\n💡 Similar template found: "${template.name}" (${Math.round(similarity * 100)}% match) - You can reference its structure if helpful.\n`;
        this.logger.log(`💡 Mentioning template "${template.name}" as reference (${Math.round(similarity * 100)}% match)`);
      } else {
        this.logger.log(`⚠️ No highly similar templates (best: ${Math.round(similarity * 100)}%)`);
      }
    } else {
      this.logger.log(`⚠️ No similar templates found in context`);
    }

    message += `

IMPORTANT: Based on the user's request, I've selected the most relevant node types for you. Use these specific node types:

AVAILABLE CONNECTORS:
${availableConnectors.join(', ')}

🎯 RELEVANT NODE TYPES (Selected via RAG - Use these for the current request):

=== TRIGGERS ===
Built-in Triggers (use directly - NO connector field):
`;

    // Add ALL builtin triggers from database
    if (builtinTriggers.length > 0) {
      builtinTriggers.forEach((trigger) => {
        const configFields = trigger.config_schema ? Object.keys(trigger.config_schema).join(', ') : 'none';
        message += `- ${trigger.type} - ${trigger.description} (config: ${configFields})\n`;
      });
    } else {
      // Fallback to essentials
      message += `- MANUAL_TRIGGER - For manual execution\n`;
      message += `- FORM_TRIGGER - For form submissions\n`;
    }

    message += `
🎯 CONNECTOR TRIGGERS (CRITICAL FORMAT):
When you need a connector-specific trigger, use EXACTLY this node type: "CONNECTOR_TRIGGER"

REQUIRED STRUCTURE:
{
  "id": "node_1",
  "type": "CONNECTOR_TRIGGER",
  "data": {
    "label": "Human-readable label",
    "connector": "connector_name",  // ← MUST match database connector name
    "trigger": "trigger_id",        // ← MUST match trigger ID from database
    "config": {}
  }
}

AVAILABLE CONNECTOR TRIGGERS:`;

    // Add connector triggers from database with EXACT IDs
    let triggerConnectorCount = 0;
    connectors.forEach((conn) => {
      if (conn.supported_triggers && Array.isArray(conn.supported_triggers) && conn.supported_triggers.length > 0) {
        message += `\n  ${conn.name}:\n`;
        conn.supported_triggers.forEach((t: any) => {
          message += `    • trigger: "${t.id}" - ${t.name || t.description || ''}\n`;
        });
        triggerConnectorCount++;
      }
    });

    if (triggerConnectorCount === 0) {
      this.logger.warn('⚠️ WARNING: No connectors with triggers found in database!');
      message += `\n  (No connector triggers available in database)\n`;
    } else {
      this.logger.log(`✅ Found ${triggerConnectorCount} connectors with triggers`);
    }

    message += `
=== ACTIONS ===

🎛️ CONTROL FLOW NODES (Use for conditional logic, loops, filtering, delays, merging, splitting):

1. IF_CONDITION (type: "IF_CONDITION") - IF/ELSE branching
   Use when: User says "if", "check if", "only if", "when X then Y"
   Config structure:
   {
     "conditions": {
       "combinator": "and" | "or",
       "conditions": [
         {
           "leftValue": "{{previousNodeId.data.fieldName}}",
           "operator": {
             "type": "string" | "number" | "boolean",
             "operation": "equals" | "contains" | "greaterThan" | etc
           },
           "rightValue": "value to compare"
         }
       ]
     },
     "ignoreCase": true
   }
   Outputs: "true" port and "false" port for branching

2. SWITCH (type: "SWITCH") - Multi-way routing
   Use for: routing to different branches based on multiple conditions/rules

3. LOOP (type: "LOOP") - Iterate over array items
   Use for: processing each item in an array one by one

4. FILTER (type: "FILTER") - Filter array items
   Use for: filtering lists based on conditions

5. WAIT (type: "WAIT") - Pause/delay execution
   Use for: adding delays between actions or waiting for events

6. DELAY (type: "DELAY") - Simple time delay
   Use for: quick delays in seconds/minutes/hours

7. MERGE (type: "MERGE") - Combine multiple inputs
   Use for: merging data from multiple branches

8. SPLIT (type: "SPLIT") - Split data to multiple outputs
   Use for: sending same data to multiple branches

CRITICAL: For conditional workflows:
- Use IF_CONDITION node for if/else logic
- Connect previous node output to IF_CONDITION
- Branch to different actions on "true" and "false" ports

Built-in Actions (use directly - NO connector field needed):
`;

    // Separate control nodes from regular actions
    const controlNodeTypes = ['IF_CONDITION', 'SWITCH', 'FILTER', 'DELAY', 'LOOP', 'WAIT', 'MERGE', 'SPLIT'];
    const regularActions = builtinActions.filter(action => !controlNodeTypes.includes(action.type));

    // Add regular builtin actions from database
    if (regularActions.length > 0) {
      regularActions.forEach((action) => {
        const configFields = action.config_schema ? Object.keys(action.config_schema).join(', ') : 'none';
        message += `- ${action.type} - ${action.description} (config: ${configFields}) - STANDALONE\n`;
      });
    } else {
      // If no builtin actions found, something is wrong with the database
      this.logger.error('❌ No builtin actions found in database! This should not happen.');
      message += `- HTTP_REQUEST - Make HTTP API requests (config: method, url, headers, body) - STANDALONE\n`;
      message += `- DATABASE_QUERY - Execute database queries (config: query, params) - STANDALONE\n`;
      message += `- TRANSFORM - Transform and manipulate data - STANDALONE\n`;
    }

    message += `

🎯 CONNECTOR ACTIONS (CRITICAL FORMAT):
When you need a connector-specific action, use EXACTLY this node type: "CONNECTOR_ACTION"

REQUIRED STRUCTURE:
{
  "id": "node_2",
  "type": "CONNECTOR_ACTION",
  "data": {
    "label": "Human-readable label",
    "connector": "connector_name",  // ← MUST match database connector name
    "action": "action_id",          // ← MUST match action ID from database
    "config": {}                    // ← Action-specific configuration
  }
}

AVAILABLE CONNECTOR ACTIONS:`;

    // Add connector actions from database with EXACT IDs
    let actionConnectorCount = 0;
    connectors.forEach((conn) => {
      if (conn.supported_actions && Array.isArray(conn.supported_actions) && conn.supported_actions.length > 0) {
        message += `\n  ${conn.name}:\n`;
        conn.supported_actions.forEach((a: any) => {
          message += `    • action: "${a.id}" - ${a.name || a.description || ''}\n`;
        });
        actionConnectorCount++;
      }
    });

    if (actionConnectorCount === 0) {
      this.logger.warn('⚠️ WARNING: No connectors with actions found in database!');
      message += `\n  (No connector actions available in database)\n`;
    } else {
      this.logger.log(`✅ Found ${actionConnectorCount} connectors with actions`);
    }

    message += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 CRITICAL: NODE TYPE USAGE RULES 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALLOWED NODE TYPES (use EXACTLY as shown):
• Built-in Triggers: ${builtinTriggers.map(t => t.type).join(', ')}
• Built-in Actions: ${builtinActions.map(a => a.type).join(', ')}
• Connector Triggers: CONNECTOR_TRIGGER (must include data.connector + data.trigger)
• Connector Actions: CONNECTOR_ACTION (must include data.connector + data.action)

⚠️ CRITICAL - USE EXACT ACTION IDs AS LISTED ABOVE:
• You MUST use the EXACT action ID shown in the "AVAILABLE CONNECTOR ACTIONS" section
• DO NOT invent or guess action names - copy them EXACTLY from the list
• Example: For OpenAI embeddings, use "create_embeddings" NOT "generate_embeddings"
• Example: For file operations, check if the connector exists before using it
• If a connector is not in the list above, it does NOT exist - choose an alternative

❌ FORBIDDEN - DO NOT create these node types:
• TELEGRAM_TRIGGER, GMAIL_TRIGGER, SLACK_TRIGGER (use CONNECTOR_TRIGGER instead)
• SEND_TELEGRAM, SEND_EMAIL, SEND_SLACK (use CONNECTOR_ACTION instead)
• Custom connectors not in the list (e.g., "file_handling", "data_table" - use HTTP_REQUEST or alternatives)
• Any custom node type not listed above

✅ CORRECT EXAMPLES:

Example 1: "when telegram message received, send to slack"
{
  "nodes": [
    {
      "id": "node_1",
      "type": "CONNECTOR_TRIGGER",  // ← NOT "TELEGRAM_TRIGGER"
      "data": {
        "label": "When Telegram Message Received",
        "connector": "telegram",
        "trigger": "new_message",
        "config": {}
      }
    },
    {
      "id": "node_2",
      "type": "CONNECTOR_ACTION",  // ← NOT "SEND_SLACK"
      "data": {
        "label": "Send Slack Message",
        "connector": "slack",
        "action": "send_message",
        "config": {
          "channel": "#general",
          "text": "{{node_1.message.text}}"
        }
      }
    }
  ],
  "edges": [
    { "id": "edge_1", "source": "node_1", "target": "node_2" }
  ]
}

Example 2: "analyze text with openai"
{
  "nodes": [
    {
      "id": "node_1",
      "type": "MANUAL_TRIGGER",  // ← Built-in trigger
      "data": { "label": "Start" }
    },
    {
      "id": "node_2",
      "type": "CONNECTOR_ACTION",  // ← NOT "OPENAI_ANALYZE"
      "data": {
        "label": "Analyze with OpenAI",
        "connector": "openai",
        "action": "chat_complete",
        "config": {
          "model": "gpt-4",
          "messages": [{ "role": "user", "content": "Analyze this" }]
        }
      }
    }
  ]
}

⚠️ VALIDATION: Every node will be validated against the database.
If you use a wrong node type OR wrong connector/action ID, the workflow will FAIL.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    // 🆕 Add user's configured credentials
    if (userCredentials.length > 0) {
      message += `\n🔐 USER'S CONFIGURED CREDENTIALS (Available for auto-configuration):\n`;
      message += `The user has already configured these credentials. When the user mentions them by name, automatically use them:\n\n`;

      userCredentials.forEach((cred) => {
        message += `- "${cred.name}" (${cred.connector_type})`;
        if (cred.description) {
          message += ` - ${cred.description}`;
        }
        message += `\n`;
      });

      message += `\nCREDENTIAL CONFIGURATION INSTRUCTIONS:
1. If user mentions a credential by name (e.g., "use my Production Bot"), add it to the node:
   - Add "credentialName": "<credential-name>" to the node's data object

2. If user mentions a connector type without a specific credential name:
   - Look for credentials of that connector type above
   - Use the first matching credential or ask for clarification if multiple exist

3. Examples:
   - "create telegram bot using Production Bot" → Add "credentialName": "Production Bot" to telegram node
   - "send email with my Work Email" → Add "credentialName": "Work Email" to email node
   - "post to slack using Main Workspace" → Add "credentialName": "Main Workspace" to slack node

4. If no matching credential exists, leave credentialName empty - user will configure it later

`;
    }

    // Add connector documentation
    if (context.connectorDocs.length > 0) {
      message += `\nCONNECTOR CAPABILITIES:\n`;
      context.connectorDocs.slice(0, 5).forEach((doc) => {
        message += `\n${doc.name.toUpperCase()}:
- Triggers: ${doc.triggers?.join(', ') || 'none'}
- Actions: ${doc.actions?.join(', ') || 'none'}
- Use cases: ${doc.examples?.join(', ') || 'general automation'}
`;
      });
    }

    // Add workflow rules from RAG (best practices and patterns)
    if (context.rules.length > 0) {
      message += `\n🎯 RECOMMENDED PATTERNS (Based on your request):\n`;
      context.rules.slice(0, 3).forEach((rule) => {
        message += `\n📋 Pattern: ${rule.pattern}
   Category: ${rule.category}
   When to use: ${rule.when_to_use}
   Required nodes: ${rule.required_nodes?.join(', ')}
   Suggested actions: ${rule.suggested_actions?.join(', ')}
   Example: ${rule.example}\n`;
      });
    }

    message += `
OUTPUT FORMAT:
Return a JSON object with this EXACT structure:
{
  "confidence": <number 0-100>,
  "intent": "<brief description of what user wants>",
  "connectors": ["connector1", "connector2"],
  "complexity": "simple|medium|complex",
  "estimatedDuration": <milliseconds>,
  "workflow": {
    "canvas": {
      "nodes": [
        {
          "id": "node_1",
          "type": "<USE EXACT NODE TYPE FROM THE LIST ABOVE>",
          "position": { "x": 100, "y": 200 },
          "data": {
            "label": "Node Label",
            "connector": "connector-name",
            "action": "action-name",
            "config": {}
          }
        }
      ],
      "edges": [
        {
          "id": "edge_1",
          "source": "node_1",
          "target": "node_2"
        }
      ]
    },
    "triggers": [],
    "steps": [],
    "conditions": []
  }
}
`;

    // 🎯 ADD RAG-RETRIEVED SIMILAR WORKFLOW EXAMPLES (Dynamic, not hardcoded!)
    if (context.similarWorkflows && context.similarWorkflows.length > 0) {
      message += `\n🎯 SIMILAR WORKFLOW EXAMPLES (Retrieved via RAG - Use these as reference):\n\n`;
      context.similarWorkflows.slice(0, 2).forEach((example, idx) => {
        message += `EXAMPLE ${idx + 1} - "${example.name || example.prompt}":\n`;
        message += `Intent: ${example.description || example.intent}\n`;
        message += `Connectors: ${example.connectors?.join(', ') || 'none'}\n`;
        message += `Complexity: ${example.complexity || 'medium'}\n`;
        if (example.canvas) {
          message += `Workflow Structure:\n${JSON.stringify(example.canvas, null, 2)}\n\n`;
        }
      });
    } else {
      // Fallback: minimal generic example if no RAG results
      message += `\nEXAMPLE - Simple workflow structure:
{
  "confidence": 85,
  "intent": "Example workflow",
  "connectors": [],
  "complexity": "simple",
  "workflow": {
    "canvas": {
      "nodes": [
        {
          "id": "node_1",
          "type": "MANUAL_TRIGGER",
          "position": { "x": 100, "y": 200 },
          "data": { "label": "Start", "config": {} }
        },
        {
          "id": "node_2",
          "type": "SEND_SLACK",
          "position": { "x": 400, "y": 200 },
          "data": { "label": "Send Message", "config": { "channel": "#general", "message": "Hello" } }
        }
      ],
      "edges": [
        { "id": "edge_1", "source": "node_1", "target": "node_2" }
      ]
    }
  }
}
`;
    }

    message += `
IMPORTANT RULES:

🚨 CRITICAL NODE TYPE VALIDATION 🚨
- You MUST ONLY use node types that are EXPLICITLY LISTED in the sections above
- ANY node with an invalid type will be AUTOMATICALLY REMOVED from the workflow
- Do NOT invent node types - they will be filtered out and cause workflow failure
- Valid built-in triggers: ${builtinTriggers.map(t => t.type).join(', ')}
- Valid built-in actions: ${builtinActions.map(a => a.type).join(', ')}
- Valid connector nodes: CONNECTOR_TRIGGER (with connector+trigger) or CONNECTOR_ACTION (with connector+action)
- EVERY node type you use will be validated - invalid ones will be REJECTED

Node Type Rules:
- ALWAYS use the EXACT node type values from the lists above
- NEVER create custom node type names (e.g., DO NOT use "SLACK_CONNECTOR", "FORM_SUBMISSION", "SEND_TELEGRAM", etc.)
- If a built-in type doesn't exist for what you need, use CONNECTOR_ACTION or CONNECTOR_TRIGGER instead

Built-in vs Dynamic Actions - CRITICAL:
- For simple "send slack message" or "send email" → Use SEND_SLACK or SEND_EMAIL (NO connector field!)
- For advanced features like "get slack channels" or "post to telegram" → Use CONNECTOR_ACTION (WITH connector + action fields)
- Built-in actions (SEND_SLACK, SEND_EMAIL, HTTP_REQUEST, etc.) should ONLY have "label" and "config" in data - NO "connector" or "action" fields
- CONNECTOR_ACTION MUST have: data.label, data.connector, data.action, data.config

Node Structure Rules:
- Position nodes in a left-to-right flow: start at x:100, y:200, then x:400, y:200, then x:700, y:200
- Space nodes exactly 300px apart horizontally
- For dynamic connector actions/triggers, use only connectors from: telegram, slack, discord, gmail, teams, twilio, twitter, facebook_graph
- Set confidence based on how well you understand the request (>80 = high, 60-80 = medium, <60 = low)
- If confidence < 60, explain what's unclear in the intent field
- Generate unique IDs for nodes (node_1, node_2, etc.) and edges (edge_1, edge_2, etc.)

CRITICAL - EDGE/CONNECTION RULES (MANDATORY):
1. ⚠️ ALWAYS create edges to connect nodes together - NEVER leave edges array empty!
2. ⚠️ Connect nodes in sequence: node_1 → node_2 → node_3 → etc.
3. ⚠️ For each edge:
   - Set "id" to "edge_1", "edge_2", etc.
   - Set "source" to the previous node's id
   - Set "target" to the next node's id
   - DO NOT set sourceHandle or targetHandle (ReactFlow will auto-connect)
4. ⚠️ If you have N nodes, you MUST create N-1 edges
   - 2 nodes = 1 edge (node_1 → node_2)
   - 3 nodes = 2 edges (node_1 → node_2 → node_3)
   - 4 nodes = 3 edges (node_1 → node_2 → node_3 → node_4)
5. ⚠️ NEVER submit a workflow with nodes but no edges connecting them!
6. ⚠️ Example edge structure:
   {
     "id": "edge_1",
     "source": "node_1",
     "target": "node_2"
   }
`;

    return message;
  }

  /**
   * Fetch user's configured credentials to help AI auto-configure nodes
   */
  private async getUserCredentials(userId?: string): Promise<any[]> {
    if (!userId) return [];

    try {
      const result = await this.platformService.query(
        `SELECT name, connector_type, description, is_active
         FROM connector_configs
         WHERE user_id = $1 AND is_active = true
         ORDER BY connector_type, name`,
        [userId]
      );

      return result.rows || [];
    } catch (error) {
      this.logger.error('Error fetching user credentials:', error);
      return [];
    }
  }

  /**
   * Build user message (simplified - examples now in system prompt via RAG)
   */
  private buildUserMessage(prompt: string, context: any): string {
    return `Generate a workflow for this request: "${prompt}"

CRITICAL RULES:
- Use ONLY the MINIMUM number of nodes required - DO NOT add extra nodes
- Use ONLY the node types from the "VALID NODE TYPES" list above
- If the task needs 2 nodes, create exactly 2 nodes, not 3 or more
- Follow the exact JSON format specified
- Create edges to connect all nodes in sequence

Example: "when gmail receives email, send to telegram" = 2 nodes (Gmail Trigger + Telegram Action)`;
  }

  /**
   * Enrich nodes with database definitions
   * Fetches complete node structure from node_types and connectors tables
   */
  private async enrichNodesFromDatabase(nodes: any[]): Promise<any[]> {
    if (!nodes || nodes.length === 0) return nodes;

    const enrichedNodes = [];

    for (const node of nodes) {
      try {
        // 🎯 Special handling for generic connector types (no database lookup needed)
        if (node.type === 'CONNECTOR_TRIGGER' || node.type === 'CONNECTOR_ACTION') {
          // These are generic types enriched via ConnectorLookup, skip database lookup
          this.logger.log(`✅ ${node.type} will be enriched via ConnectorLookup (connector: ${node.data?.connector})`);
        } else {
          // ✅ Fetch built-in node type definition from in-memory constants (NO DATABASE)
          const builtinNode = getBuiltinNode(node.type);

          if (!builtinNode) {
            this.logger.warn(`⚠️ Built-in node type ${node.type} not found in builtin-nodes constants, keeping AI-generated structure`);
            enrichedNodes.push(node);
            continue;
          }

          // Base enriched node structure for built-in types
          const enrichedNode = {
            ...node,
            data: {
              ...node.data,
              label: node.data?.label || builtinNode.name,
              description: node.data?.description || builtinNode.description,
              icon: builtinNode.icon,
              category: builtinNode.category,
              configSchema: builtinNode.config_schema,
              inputSchema: builtinNode.input_schema,
              outputSchema: builtinNode.output_schema,
            },
          };

          enrichedNodes.push(enrichedNode);
          this.logger.debug(`✅ Enriched builtin node ${node.type} from in-memory constants`);
          continue;
        }

        // Connector-specific enrichment (CONNECTOR_TRIGGER / CONNECTOR_ACTION)
        // Base enriched node structure (no database nodeTypeDef for connector types)
        const enrichedNode = {
          ...node,
          data: {
            ...node.data,
            label: node.data?.label || `${node.type} Node`,
            category: 'connector',
          },
        };

        // Enrich with connector-specific details from ConnectorLookup
        if (true) { // Always true for CONNECTOR_TRIGGER/CONNECTOR_ACTION (kept for backwards compat)
          const connectorType = node.data?.connectorType || node.data?.connector;
          const triggerId = node.data?.triggerId || node.data?.trigger;
          const actionId = node.data?.actionId || node.data?.action;

          if (connectorType) {
            // Fetch connector details from TypeScript constants (no database query)
            const connectorDef = ConnectorLookup.getByName(connectorType);

            if (connectorDef) {
              const connector = {
                name: connectorDef.name,
                display_name: connectorDef.display_name,
                description: connectorDef.description,
                supported_triggers: connectorDef.supported_triggers || [],
                supported_actions: connectorDef.supported_actions || [],
              };

              // Set connector information for frontend
              enrichedNode.data.connector = connector.name;
              enrichedNode.data.connectorType = connector.name;
              enrichedNode.data.connectorDisplayName = connector.display_name || connector.name;

              // Find specific trigger or action schema
              if (node.type === 'CONNECTOR_TRIGGER' && triggerId) {
                const triggers = connector.supported_triggers || [];
                const triggerDef = triggers.find((t: any) => t.id === triggerId);

                if (triggerDef) {
                  // Set trigger IDs
                  enrichedNode.data.trigger = triggerDef.id;
                  enrichedNode.data.triggerId = triggerDef.id;
                  enrichedNode.data.triggerName = triggerDef.name;
                  enrichedNode.data.description = triggerDef.description;
                  // For triggers, inputSchema (if exists) is used for configuration
                  if (triggerDef.inputSchema) {
                    enrichedNode.data.inputSchema = triggerDef.inputSchema;
                    enrichedNode.data.configSchema = triggerDef.inputSchema; // Use inputSchema as config
                  }
                  enrichedNode.data.outputSchema = triggerDef.outputSchema;
                  enrichedNode.data.eventType = triggerDef.eventType;
                  enrichedNode.data.webhookRequired = triggerDef.webhookRequired || false;
                }
              } else if (node.type === 'CONNECTOR_ACTION' && actionId) {
                const actions = connector.supported_actions || [];
                const actionDef = actions.find((a: any) => a.id === actionId);

                if (actionDef) {
                  // Set action IDs
                  enrichedNode.data.action = actionDef.id;
                  enrichedNode.data.actionId = actionDef.id;
                  enrichedNode.data.actionName = actionDef.name;
                  enrichedNode.data.description = actionDef.description;
                  // For actions, inputSchema defines the configuration fields
                  enrichedNode.data.inputSchema = actionDef.inputSchema;
                  enrichedNode.data.configSchema = actionDef.inputSchema; // Use inputSchema as config
                  enrichedNode.data.outputSchema = actionDef.outputSchema;
                }
              }
            } else {
              this.logger.warn(`⚠️ Connector "${connectorType}" not found in ConnectorLookup for ${node.type}`);
            }
          } else {
            this.logger.warn(`⚠️ No connector specified for ${node.type} node`);
          }
        }

        enrichedNodes.push(enrichedNode);

        this.logger.debug(`✅ Enriched connector node ${node.type}`);
      } catch (error) {
        this.logger.error(`Error enriching node ${node.type}:`, error);
        enrichedNodes.push(node); // Keep original if enrichment fails
      }
    }

    return enrichedNodes;
  }

  /**
   * Validate and enhance generated workflow
   * STEP 4: Post-generation validation to ensure AI only used existing nodes
   */
  private async validateAndEnhanceWorkflow(
    workflow: any,
    availableConnectors: string[],
    allowedNodeTypes?: string[], // Pass the allowed node types from grounding
  ): Promise<{
    workflow: any;
    confidence: number;
    validationResults: any;
  }> {
    const validationResults = {
      valid: true,
      warnings: [],
      errors: [],
      invalidNodes: [],
      validatedNodes: [], // Track which nodes were validated
    };

    let confidence = 100;

    // Validate nodes exist
    if (!workflow.canvas?.nodes || workflow.canvas.nodes.length === 0) {
      validationResults.errors.push('Workflow has no nodes');
      validationResults.valid = false;
      confidence -= 50;
      return { workflow, confidence, validationResults };
    }

    // 🆕 STEP 1: Validate connector nodes using NodeTypeValidatorService
    this.logger.log(`🔍 Validating ${workflow.canvas.nodes.length} nodes...`);
    const nodeValidation = await this.nodeTypeValidator.validateWorkflowNodes(workflow.canvas.nodes);

    if (nodeValidation.invalidNodes.length > 0) {
      this.logger.error(`❌ Found ${nodeValidation.invalidNodes.length} invalid nodes`);
      nodeValidation.invalidNodes.forEach(({ node, errors }) => {
        this.logger.error(`   Node ${node.id} (${node.type}): ${errors.join(', ')}`);
        validationResults.errors.push(...errors);
        validationResults.invalidNodes.push({
          nodeId: node.id,
          nodeType: node.type,
          errors,
        });
      });
      validationResults.valid = false;
      confidence -= 30 * nodeValidation.invalidNodes.length; // Penalty per invalid node
    } else {
      this.logger.log(`✅ All connector nodes are valid`);
    }

    // Use validated nodes (normalized by validator)
    workflow.canvas.nodes = nodeValidation.validNodes;
    validationResults.validatedNodes = nodeValidation.validNodes.map(n => ({
      id: n.id,
      type: n.type,
      connector: n.data?.connector,
      action: n.data?.action,
      trigger: n.data?.trigger,
    }));

    // 🎯 ENRICH: Fetch complete node definitions from database
    if (workflow.canvas?.nodes && workflow.canvas.nodes.length > 0) {
      this.logger.log(`🔄 Enriching ${workflow.canvas.nodes.length} nodes from database...`);
      workflow.canvas.nodes = await this.enrichNodesFromDatabase(workflow.canvas.nodes);
      this.logger.log(`✅ Nodes enriched with database schemas`);
    }

    // 🔒 CRITICAL: Validate node types against database and FILTER OUT invalid nodes
    if (workflow.canvas?.nodes && allowedNodeTypes) {
      const allowedSet = new Set(allowedNodeTypes);
      const validNodes = [];
      const invalidNodes = [];

      workflow.canvas.nodes.forEach((node, idx) => {
        const nodeType = node.type;

        if (!allowedSet.has(nodeType)) {
          // Invalid node - track and remove it
          validationResults.errors.push(
            `Node ${idx + 1} uses INVALID node type: "${nodeType}" (not in database) - REMOVED`
          );
          validationResults.invalidNodes.push({
            index: idx,
            type: nodeType,
            id: node.id,
          });
          invalidNodes.push(node);
          validationResults.valid = false;
          confidence -= 30; // Heavy penalty for using non-existent nodes
          this.logger.error(`❌ VALIDATION FAILED: AI used non-existent node type "${nodeType}" - FILTERING OUT`);
        } else {
          // Valid node - keep it
          validNodes.push(node);
        }
      });

      // 🎯 FILTER: Replace workflow nodes with only valid nodes
      if (invalidNodes.length > 0) {
        this.logger.warn(`🔧 Filtered out ${invalidNodes.length} invalid nodes from workflow`);
        workflow.canvas.nodes = validNodes;

        // Update edges to remove references to invalid nodes
        const validNodeIds = new Set(validNodes.map(n => n.id));
        workflow.canvas.edges = (workflow.canvas.edges || []).filter((edge: any) => {
          return validNodeIds.has(edge.source) && validNodeIds.has(edge.target);
        });
      }
    }

    // Validate connectors
    if (workflow.canvas?.nodes) {
      workflow.canvas.nodes.forEach((node, idx) => {
        if (node.data?.connector && !availableConnectors.includes(node.data.connector)) {
          validationResults.warnings.push(
            `Node ${idx + 1} uses unavailable connector: ${node.data.connector}`,
          );
          confidence -= 10;
        }
      });
    }

    // Auto-generate edges if missing (critical fix for connection issues)
    if (workflow.canvas?.nodes && workflow.canvas.nodes.length > 1) {
      if (!workflow.canvas.edges || workflow.canvas.edges.length === 0) {
        this.logger.warn('No edges found in generated workflow - auto-generating sequential connections');
        workflow.canvas.edges = [];

        // Create sequential edges: node_1 → node_2 → node_3 → ...
        for (let i = 0; i < workflow.canvas.nodes.length - 1; i++) {
          const sourceNode = workflow.canvas.nodes[i];
          const targetNode = workflow.canvas.nodes[i + 1];

          workflow.canvas.edges.push({
            id: `edge_${i + 1}`,
            source: sourceNode.id,
            target: targetNode.id,
          });
        }

        validationResults.warnings.push('Auto-generated sequential edges between nodes');
        confidence -= 5; // Minor penalty for missing edges
      }
    }

    // Ensure edges connect valid nodes
    if (workflow.canvas?.edges) {
      const nodeIds = new Set(workflow.canvas.nodes.map((n) => n.id));
      workflow.canvas.edges.forEach((edge) => {
        if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
          validationResults.errors.push(`Edge ${edge.id} connects non-existent nodes`);
          validationResults.valid = false;
          confidence -= 20;
        }
      });
    }

    return {
      workflow,
      confidence: Math.max(0, Math.min(100, confidence)),
      validationResults,
    };
  }

  /**
   * Check if AI generation is available
   */
  isAvailable(): boolean {
    return !!this.openai;
  }

  /**
   * Get the conversation memory service (for debug/monitoring)
   */
  getConversationMemory(): ConversationMemoryService {
    return this.conversationMemory;
  }

  /**
   * Auto-fix common schema validation issues
   */
  private autoFixSchemaIssues(workflow: any, errors: string[]): any {
    const fixed = { ...workflow };

    errors.forEach(error => {
      // Fix missing workflow name
      if (error.includes('name') && error.includes('required')) {
        fixed.name = fixed.name || 'Automated Workflow';
        this.logger.log('🔧 Auto-fixed: Added workflow name');
      }

      // Fix missing node IDs
      if (error.includes('nodes') && error.includes('id')) {
        fixed.nodes = fixed.nodes.map((node: any, index: number) => ({
          ...node,
          id: node.id || `node_${index}_${Date.now()}`,
        }));
        this.logger.log('🔧 Auto-fixed: Added missing node IDs');
      }

      // Fix missing node names
      if (error.includes('nodes') && error.includes('name')) {
        fixed.nodes = fixed.nodes.map((node: any, index: number) => ({
          ...node,
          name: node.name || `Node ${index + 1}`,
        }));
        this.logger.log('🔧 Auto-fixed: Added missing node names');
      }

      // Fix invalid node types
      if (error.includes('type')) {
        fixed.nodes = fixed.nodes.map((node: any) => {
          if (!node.type || !['CONNECTOR_TRIGGER', 'CONNECTOR_ACTION', 'IF', 'HTTP_REQUEST', 'CODE', 'SET', 'WAIT', 'MERGE', 'ERROR_HANDLER'].includes(node.type)) {
            return {
              ...node,
              type: node.type?.includes('TRIGGER') ? 'CONNECTOR_TRIGGER' : 'CONNECTOR_ACTION',
            };
          }
          return node;
        });
        this.logger.log('🔧 Auto-fixed: Corrected invalid node types');
      }

      // Fix missing connections
      if (error.includes('connections') && fixed.nodes?.length > 1) {
        if (!fixed.connections || fixed.connections.length === 0) {
          fixed.connections = [];
          for (let i = 0; i < fixed.nodes.length - 1; i++) {
            fixed.connections.push({
              source: fixed.nodes[i].id,
              sourcePort: 'main',
              target: fixed.nodes[i + 1].id,
              targetPort: 'main',
            });
          }
          this.logger.log('🔧 Auto-fixed: Created sequential connections');
        }
      }
    });

    return fixed;
  }
}
