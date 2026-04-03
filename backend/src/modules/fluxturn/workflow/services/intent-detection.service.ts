import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Intent Detection Service
 *
 * Uses AI to understand what the user wants before taking action.
 * This enables:
 * - Natural conversation (not forcing every message to create a workflow)
 * - Better understanding of ambiguous prompts
 * - Asking clarification questions when needed
 * - Context-aware responses based on conversation history
 */
@Injectable()
export class IntentDetectionService {
  private readonly logger = new Logger(IntentDetectionService.name);
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized for intent detection');
    } else {
      this.logger.warn('OpenAI API key not found - intent detection will be disabled');
    }
  }

  /**
   * Detect user intent using AI (no hardcoded types - AI decides freely)
   *
   * @param prompt - Current user message
   * @param conversationHistory - Previous messages for context
   */
  async detectIntent(
    prompt: string,
    conversationHistory: Array<{ role: string; content: string }>,
  ): Promise<IntentDetectionResult> {
    if (!this.openai) {
      return this.fallbackIntent(prompt);
    }

    try {
      const systemPrompt = this.buildIntentDetectionPrompt();

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Include conversation history for context
      if (conversationHistory.length > 0) {
        // Include last 5 messages for context (to keep it lightweight)
        const recentHistory = conversationHistory.slice(-5);
        messages.push(...recentHistory.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        })));
      }

      // Add current prompt
      messages.push({ role: 'user', content: prompt });

      this.logger.log(`🔍 Detecting intent for: "${prompt.substring(0, 100)}..."`);

      // Use cheaper/faster model for intent detection
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.5, // Balanced temperature - not too rigid, not too creative
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');

      this.logger.log(`✅ Intent detected: ${result.primaryIntent} (confidence: ${result.confidence}%)`);

      return {
        primaryIntent: result.primaryIntent || 'conversational',
        confidence: result.confidence || 50,
        detectedEntities: result.detectedEntities || {},
        reasoning: result.reasoning || 'Unable to determine intent',
        suggestedAction: result.suggestedAction || 'respond_conversationally',
        clarificationNeeded: result.clarificationNeeded || false,
        clarificationQuestion: result.clarificationQuestion,
      };
    } catch (error) {
      this.logger.error('Error detecting intent:', error.message);
      return this.fallbackIntent(prompt);
    }
  }

  /**
   * Build the system prompt for intent detection
   */
  private buildIntentDetectionPrompt(): string {
    return `You are an intent detection AI for a workflow automation platform.

Your job is to understand what the user wants from their message.

CRITICAL WORKFLOW DETECTION RULES:
1. ✅ ALWAYS generate workflow if user mentions:
   - Action words: "create", "build", "make", "automate", "set up", "configure"
   - Plus ANY connector/app name: "telegram", "slack", "gmail", "bot", "email", "form", etc.
   - Examples: "create telegram bot", "make slack notification", "automate email", "build form"

2. ✅ ALWAYS generate workflow if user describes automation:
   - "when X happens, do Y"
   - "send X when Y"
   - "trigger on X"
   - Examples: "when form submitted send email", "send slack message on webhook"

3. ❌ ONLY respond conversationally for:
   - Pure greetings with no request: "hello", "hi", "thanks"
   - General questions: "what can you do?", "what connectors exist?"
   - Unclear prompts with NO action words or automation intent

IMPORTANT: When in doubt, prefer generating a workflow! It's better to try and fail than to miss a creation request.

User types and expected actions:
- "create X" → WORKFLOW (user wants to build something)
- "hello" → CONVERSATIONAL (just greeting)
- "automate Y" → WORKFLOW (user wants automation)
- "what is Z?" → CONVERSATIONAL (asking question)
- "build A bot" → WORKFLOW (clear creation intent)
- "thanks" → CONVERSATIONAL (acknowledgment)

Analyze the user's message and conversation history, then respond with JSON:

{
  "primaryIntent": string,  // Main intent: "create_workflow", "conversational", "question", "modify_workflow", "unclear", etc. (you decide freely)
  "confidence": number,     // 0-100 confidence score
  "detectedEntities": {     // Extract useful information
    "connectors": string[], // e.g., ["telegram", "gmail", "openai"]
    "actions": string[],    // e.g., ["send_message", "reply"]
    "triggers": string[],   // e.g., ["new_message", "on_email"]
    "credentials": string[] // e.g., ["Production Bot", "Work Email"]
  },
  "reasoning": string,      // Brief explanation of why you chose this intent
  "suggestedAction": string, // What should happen next: "generate_workflow", "respond_conversationally", "ask_clarification", "fetch_workflow_and_modify"
  "clarificationNeeded": boolean, // true if prompt is ambiguous
  "clarificationQuestion": string // If clarification needed, what to ask user
}

Examples:

User: "hello"
Response: {
  "primaryIntent": "conversational",
  "confidence": 95,
  "detectedEntities": {},
  "reasoning": "Pure greeting with no automation request",
  "suggestedAction": "respond_conversationally",
  "clarificationNeeded": false
}

User: "create telegram bot"
Response: {
  "primaryIntent": "create_workflow",
  "confidence": 90,
  "detectedEntities": {
    "connectors": ["telegram"],
    "triggers": ["new_message"],
    "actions": ["send_message"]
  },
  "reasoning": "User used 'create' with 'telegram bot' - clear workflow creation intent",
  "suggestedAction": "generate_workflow",
  "clarificationNeeded": false
}

User: "create a telegram bot that replies using AI"
Response: {
  "primaryIntent": "create_workflow",
  "confidence": 95,
  "detectedEntities": {
    "connectors": ["telegram", "openai"],
    "triggers": ["new_message"],
    "actions": ["generate_reply", "send_message"]
  },
  "reasoning": "User clearly wants to create a new workflow with Telegram trigger and AI response",
  "suggestedAction": "generate_workflow",
  "clarificationNeeded": false
}

User: "make slack notification"
Response: {
  "primaryIntent": "create_workflow",
  "confidence": 85,
  "detectedEntities": {
    "connectors": ["slack"],
    "actions": ["send_message"]
  },
  "reasoning": "User used 'make' with 'slack notification' - workflow creation intent",
  "suggestedAction": "generate_workflow",
  "clarificationNeeded": false
}

User: "automate email"
Response: {
  "primaryIntent": "create_workflow",
  "confidence": 80,
  "detectedEntities": {
    "connectors": ["gmail"],
    "actions": ["send_email"]
  },
  "reasoning": "User used 'automate' with 'email' - workflow automation intent",
  "suggestedAction": "generate_workflow",
  "clarificationNeeded": false
}

User: "send message telegram"
Response: {
  "primaryIntent": "create_workflow",
  "confidence": 45,
  "detectedEntities": {
    "connectors": ["telegram"]
  },
  "reasoning": "User wants something with Telegram but unclear if they want to receive or send messages",
  "suggestedAction": "ask_clarification",
  "clarificationNeeded": true,
  "clarificationQuestion": "I can help you with Telegram! Do you want to:\n1. Receive Telegram messages (trigger a workflow when messages arrive)\n2. Send Telegram messages (send messages as an action in a workflow)"
}

User: "also add gmail"
Previous context: User just created a Telegram workflow
Response: {
  "primaryIntent": "modify_workflow",
  "confidence": 85,
  "detectedEntities": {
    "connectors": ["gmail"]
  },
  "reasoning": "User said 'also add' which indicates they want to modify the existing workflow from previous conversation",
  "suggestedAction": "fetch_workflow_and_modify",
  "clarificationNeeded": false
}

User: "what connectors do you have?"
Response: {
  "primaryIntent": "question",
  "confidence": 95,
  "detectedEntities": {},
  "reasoning": "User is asking about available connectors, this is an informational query",
  "suggestedAction": "respond_conversationally",
  "clarificationNeeded": false
}

Be smart and use conversation history to understand context!`;
  }

  /**
   * Fallback intent if OpenAI is unavailable
   */
  private fallbackIntent(prompt: string): IntentDetectionResult {
    // Simple keyword matching as fallback
    const lowerPrompt = prompt.toLowerCase();

    // Workflow creation keywords
    const creationKeywords = ['create', 'build', 'make', 'automate', 'set up', 'configure', 'generate'];
    const hasCreationKeyword = creationKeywords.some(keyword => lowerPrompt.includes(keyword));

    // Connector/service keywords
    const connectorKeywords = ['bot', 'telegram', 'slack', 'email', 'gmail', 'form', 'webhook', 'api',
                               'notification', 'message', 'workflow', 'automation'];
    const hasConnectorKeyword = connectorKeywords.some(keyword => lowerPrompt.includes(keyword));

    // Automation patterns
    const hasAutomationPattern = lowerPrompt.includes('when ') ||
                                 lowerPrompt.includes('send ') ||
                                 lowerPrompt.includes('trigger');

    // Conversational patterns
    const conversationalKeywords = ['hello', 'hi ', 'hey', 'thanks', 'thank you', 'what is', 'how do'];
    const isConversational = conversationalKeywords.some(keyword => lowerPrompt.includes(keyword));

    // Decision logic
    if (isConversational && !hasCreationKeyword && !hasAutomationPattern) {
      return {
        primaryIntent: 'conversational',
        confidence: 70,
        detectedEntities: {},
        reasoning: 'Detected conversational greeting/question (fallback mode)',
        suggestedAction: 'respond_conversationally',
        clarificationNeeded: false,
      };
    }

    if (hasCreationKeyword || hasAutomationPattern || hasConnectorKeyword) {
      return {
        primaryIntent: 'create_workflow',
        confidence: 75,
        detectedEntities: {},
        reasoning: 'Detected workflow creation intent via keywords (fallback mode)',
        suggestedAction: 'generate_workflow',
        clarificationNeeded: false,
      };
    }

    // Default to workflow generation if unclear
    return {
      primaryIntent: 'create_workflow',
      confidence: 50,
      detectedEntities: {},
      reasoning: 'Unclear intent, defaulting to workflow generation (fallback mode)',
      suggestedAction: 'generate_workflow',
      clarificationNeeded: false,
    };
  }

  /**
   * Check if intent detection is available
   */
  isAvailable(): boolean {
    return !!this.openai;
  }
}

/**
 * Intent Detection Result
 */
export interface IntentDetectionResult {
  primaryIntent: string;
  confidence: number;
  detectedEntities: {
    connectors?: string[];
    actions?: string[];
    triggers?: string[];
    credentials?: string[];
  };
  reasoning: string;
  suggestedAction: string;
  clarificationNeeded: boolean;
  clarificationQuestion?: string;
}
