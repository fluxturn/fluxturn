import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  AgentConfig,
  AgentResult,
  AgentError,
  AgentErrorType,
  ToolCall,
  ToolResult,
  IntermediateStep,
  OpenAITool,
  OpenAIToolCall,
  ExecutableTool,
  MemoryMessage,
  JSONSchema,
  JSONSchemaProperty,
} from '../types/tool.interface';
import { ToolRegistryService } from './tool-registry.service';

/**
 * OpenAI message types
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

/**
 * OpenAI API response types
 */
interface OpenAIChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    tool_calls?: OpenAIToolCall[];
  };
  finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * AI Agent Service
 *
 * Core service for executing AI Agent workflows.
 * Implements the ReAct (Reason-Act-Observe) loop for autonomous agent execution.
 */
@Injectable()
export class AIAgentService {
  private readonly logger = new Logger(AIAgentService.name);

  constructor(private readonly toolRegistry: ToolRegistryService) {
    this.logger.log('AI Agent Service initialized');
  }

  /**
   * Execute an AI Agent with the given configuration
   */
  async execute(config: AgentConfig): Promise<AgentResult> {
    const startTime = Date.now();

    // Validate configuration
    this.validateConfig(config);

    this.logger.log(`Starting AI Agent execution (type: ${config.agentType})`);
    this.logger.debug(`Max iterations: ${config.maxIterations}`);
    this.logger.debug(`Tools available: ${config.tools.length}`);

    try {
      // Route to appropriate agent type
      switch (config.agentType) {
        case 'toolsAgent':
          return await this.executeToolsAgent(config, startTime);
        case 'conversational':
          return await this.executeConversationalAgent(config, startTime);
        case 'react':
          return await this.executeReActAgent(config, startTime);
        default:
          throw new AgentError(
            AgentErrorType.INVALID_CONFIG,
            `Unknown agent type: ${config.agentType}`,
          );
      }
    } catch (error: any) {
      this.logger.error(`Agent execution failed: ${error.message}`);

      if (error instanceof AgentError) {
        return this.buildErrorResult(error, startTime);
      }

      return this.buildErrorResult(
        new AgentError(AgentErrorType.MODEL_ERROR, error.message),
        startTime,
      );
    }
  }

  /**
   * Tools Agent - Uses OpenAI function calling
   * This is the most reliable and recommended agent type
   */
  private async executeToolsAgent(
    config: AgentConfig,
    startTime: number,
  ): Promise<AgentResult> {
    const messages = this.buildInitialMessages(config);
    const tools = this.formatToolsForOpenAI(config.tools);
    const toolMap = new Map(config.tools.map((t) => [t.name, t]));

    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    const intermediateSteps: IntermediateStep[] = [];

    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let iterations = 0;
    let lastResponse = '';

    this.logger.log('Starting Tools Agent loop');

    while (iterations < config.maxIterations) {
      iterations++;
      this.logger.log(`Iteration ${iterations}/${config.maxIterations}`);

      // Call OpenAI API
      const response = await this.callOpenAI(config.modelConfig, messages, tools);

      // Accumulate token usage
      totalUsage.promptTokens += response.usage.prompt_tokens;
      totalUsage.completionTokens += response.usage.completion_tokens;
      totalUsage.totalTokens += response.usage.total_tokens;

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      // Check if there are tool calls
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        this.logger.log(`Agent wants to call ${assistantMessage.tool_calls.length} tool(s)`);

        // Add assistant message with tool calls to conversation
        messages.push({
          role: 'assistant',
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls,
        });

        // Record thought if content exists
        if (assistantMessage.content && config.returnIntermediateSteps) {
          intermediateSteps.push({
            step: intermediateSteps.length + 1,
            type: 'thought',
            content: assistantMessage.content,
            timestamp: new Date(),
          });
        }

        // Execute each tool call
        for (const openaiToolCall of assistantMessage.tool_calls) {
          const toolCall = this.parseOpenAIToolCall(openaiToolCall);
          allToolCalls.push(toolCall);

          // Record tool call
          if (config.returnIntermediateSteps) {
            intermediateSteps.push({
              step: intermediateSteps.length + 1,
              type: 'tool_call',
              content: `Calling ${toolCall.name}`,
              toolCall,
              timestamp: new Date(),
            });
          }

          // Execute the tool
          const tool = toolMap.get(toolCall.name);
          let toolResult: ToolResult;

          if (!tool) {
            toolResult = {
              success: false,
              error: `Tool "${toolCall.name}" not found`,
              errorCode: AgentErrorType.TOOL_NOT_FOUND,
            };
          } else {
            toolResult = await this.executeTool(tool, toolCall, config.context);
          }

          allToolResults.push(toolResult);

          // Record tool result
          if (config.returnIntermediateSteps) {
            intermediateSteps.push({
              step: intermediateSteps.length + 1,
              type: 'tool_result',
              content: toolResult.success
                ? JSON.stringify(toolResult.data)
                : `Error: ${toolResult.error}`,
              toolResult,
              timestamp: new Date(),
            });
          }

          // Add tool result to messages
          messages.push({
            role: 'tool',
            tool_call_id: openaiToolCall.id,
            content: toolResult.success
              ? JSON.stringify(toolResult.data)
              : `Error: ${toolResult.error}`,
          });
        }
      } else {
        // No tool calls - agent is done
        lastResponse = assistantMessage.content || '';

        // Record final response
        if (config.returnIntermediateSteps) {
          intermediateSteps.push({
            step: intermediateSteps.length + 1,
            type: 'observation',
            content: lastResponse,
            timestamp: new Date(),
          });
        }

        this.logger.log(`Agent completed after ${iterations} iteration(s)`);

        // Save to memory if available
        await this.saveToMemory(config, lastResponse);

        return {
          response: lastResponse,
          success: true,
          iterations,
          toolCalls: allToolCalls,
          toolResults: allToolResults,
          intermediateSteps: config.returnIntermediateSteps
            ? intermediateSteps
            : undefined,
          usage: totalUsage,
          finishReason: 'complete',
          durationMs: Date.now() - startTime,
        };
      }
    }

    // Max iterations reached
    this.logger.warn(`Max iterations (${config.maxIterations}) reached`);

    return {
      response: lastResponse || 'Agent reached maximum iterations without completing.',
      success: false,
      iterations,
      toolCalls: allToolCalls,
      toolResults: allToolResults,
      intermediateSteps: config.returnIntermediateSteps
        ? intermediateSteps
        : undefined,
      usage: totalUsage,
      finishReason: 'max_iterations',
      error: {
        type: AgentErrorType.MAX_ITERATIONS_REACHED,
        message: `Agent reached maximum iterations (${config.maxIterations})`,
      },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Conversational Agent - Uses prompt engineering for a more natural conversation style
   * Tools are suggested in the response rather than called via function calling
   */
  private async executeConversationalAgent(
    config: AgentConfig,
    startTime: number,
  ): Promise<AgentResult> {
    this.logger.log('Starting Conversational Agent execution');

    const toolMap = new Map(config.tools.map((t) => [t.name, t]));
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    const intermediateSteps: IntermediateStep[] = [];

    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let iterations = 0;

    // Build system prompt with tool instructions
    const systemPrompt = this.buildConversationalSystemPrompt(config);
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history from memory
    if (config.memory && config.memory.messages) {
      for (const msg of config.memory.messages) {
        messages.push(this.convertMemoryMessage(msg));
      }
    }

    // Add current user input
    messages.push({ role: 'user', content: config.input });

    while (iterations < config.maxIterations) {
      iterations++;
      this.logger.log(`Conversation iteration ${iterations}/${config.maxIterations}`);

      // Call OpenAI without function calling - just regular chat
      const response = await this.callOpenAI(config.modelConfig, messages);

      totalUsage.promptTokens += response.usage.prompt_tokens;
      totalUsage.completionTokens += response.usage.completion_tokens;
      totalUsage.totalTokens += response.usage.total_tokens;

      const assistantContent = response.choices[0].message.content || '';

      // Record the assistant's response
      if (config.returnIntermediateSteps) {
        intermediateSteps.push({
          step: intermediateSteps.length + 1,
          type: 'thought',
          content: assistantContent,
          timestamp: new Date(),
        });
      }

      // Parse tool calls from the response (format: <tool>tool_name({"arg": "value"})</tool>)
      const toolCallMatches = assistantContent.matchAll(
        /<tool>(\w+)\((\{.*?\})\)<\/tool>/gs,
      );

      const parsedToolCalls: { name: string; args: Record<string, any> }[] = [];
      for (const match of toolCallMatches) {
        try {
          parsedToolCalls.push({
            name: match[1],
            args: JSON.parse(match[2]),
          });
        } catch (e) {
          this.logger.warn(`Failed to parse tool call: ${match[0]}`);
        }
      }

      if (parsedToolCalls.length === 0) {
        // No tool calls - conversation is complete
        // Extract final response (remove any tool formatting artifacts)
        const cleanResponse = assistantContent
          .replace(/<tool>.*?<\/tool>/gs, '')
          .replace(/<final_answer>(.*?)<\/final_answer>/s, '$1')
          .trim();

        this.logger.log(`Conversational Agent completed after ${iterations} iteration(s)`);

        await this.saveToMemory(config, cleanResponse);

        return {
          response: cleanResponse || assistantContent,
          success: true,
          iterations,
          toolCalls: allToolCalls,
          toolResults: allToolResults,
          intermediateSteps: config.returnIntermediateSteps
            ? intermediateSteps
            : undefined,
          usage: totalUsage,
          finishReason: 'complete',
          durationMs: Date.now() - startTime,
        };
      }

      // Execute tool calls
      messages.push({ role: 'assistant', content: assistantContent });

      let toolResultsText = 'Tool Results:\n';
      for (const parsed of parsedToolCalls) {
        const toolCall: ToolCall = {
          id: `conv_${Date.now()}_${parsed.name}`,
          name: parsed.name,
          arguments: parsed.args,
        };
        allToolCalls.push(toolCall);

        if (config.returnIntermediateSteps) {
          intermediateSteps.push({
            step: intermediateSteps.length + 1,
            type: 'tool_call',
            content: `Calling ${toolCall.name}`,
            toolCall,
            timestamp: new Date(),
          });
        }

        const tool = toolMap.get(parsed.name);
        let toolResult: ToolResult;

        if (!tool) {
          toolResult = {
            success: false,
            error: `Tool "${parsed.name}" not found`,
            errorCode: AgentErrorType.TOOL_NOT_FOUND,
          };
        } else {
          toolResult = await this.executeTool(tool, toolCall, config.context);
        }

        allToolResults.push(toolResult);
        toolResultsText += `- ${parsed.name}: ${toolResult.success ? JSON.stringify(toolResult.data) : `Error: ${toolResult.error}`}\n`;

        if (config.returnIntermediateSteps) {
          intermediateSteps.push({
            step: intermediateSteps.length + 1,
            type: 'tool_result',
            content: toolResult.success
              ? JSON.stringify(toolResult.data)
              : `Error: ${toolResult.error}`,
            toolResult,
            timestamp: new Date(),
          });
        }
      }

      // Add tool results as a user message for the next iteration
      messages.push({
        role: 'user',
        content: toolResultsText + '\nPlease continue based on these results.',
      });
    }

    // Max iterations reached
    this.logger.warn(`Conversational Agent max iterations (${config.maxIterations}) reached`);

    return {
      response: 'Agent reached maximum iterations without completing.',
      success: false,
      iterations,
      toolCalls: allToolCalls,
      toolResults: allToolResults,
      intermediateSteps: config.returnIntermediateSteps
        ? intermediateSteps
        : undefined,
      usage: totalUsage,
      finishReason: 'max_iterations',
      error: {
        type: AgentErrorType.MAX_ITERATIONS_REACHED,
        message: `Agent reached maximum iterations (${config.maxIterations})`,
      },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Build system prompt for Conversational Agent
   */
  private buildConversationalSystemPrompt(config: AgentConfig): string {
    let prompt = config.systemPrompt || 'You are a helpful AI assistant.';

    if (config.tools.length > 0) {
      prompt += `\n\n## Available Tools\n\nYou have access to the following tools:\n\n`;

      for (const tool of config.tools) {
        const params = Object.entries(tool.parameters.properties || {})
          .map(([key, val]: [string, any]) => `    ${key}: ${val.type} - ${val.description || ''}`)
          .join('\n');

        prompt += `### ${tool.name}\n${tool.description}\nParameters:\n${params}\n\n`;
      }

      prompt += `## Tool Usage Format

When you need to use a tool, format it exactly like this:
<tool>tool_name({"param1": "value1", "param2": "value2"})</tool>

After using a tool, I will provide you with the results, and you should continue the conversation.

When you have completed the task and have a final answer, provide it naturally without any tool tags.

## Important Guidelines
- Only use tools when necessary
- Wait for tool results before making conclusions
- Provide helpful context in your responses
- If a tool fails, try to help the user understand why`;
    }

    return prompt;
  }

  /**
   * ReAct Agent - Explicit Thought/Action/Observation loop
   * Uses structured prompting for step-by-step reasoning
   */
  private async executeReActAgent(
    config: AgentConfig,
    startTime: number,
  ): Promise<AgentResult> {
    this.logger.log('Starting ReAct Agent execution');

    const toolMap = new Map(config.tools.map((t) => [t.name, t]));
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    const intermediateSteps: IntermediateStep[] = [];

    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let iterations = 0;

    // Build ReAct system prompt
    const systemPrompt = this.buildReActSystemPrompt(config);
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history from memory
    if (config.memory && config.memory.messages) {
      for (const msg of config.memory.messages) {
        messages.push(this.convertMemoryMessage(msg));
      }
    }

    // Add current user input with ReAct framing
    messages.push({
      role: 'user',
      content: `Task: ${config.input}\n\nBegin your reasoning process.`,
    });

    while (iterations < config.maxIterations) {
      iterations++;
      this.logger.log(`ReAct iteration ${iterations}/${config.maxIterations}`);

      // Call OpenAI
      const response = await this.callOpenAI(config.modelConfig, messages);

      totalUsage.promptTokens += response.usage.prompt_tokens;
      totalUsage.completionTokens += response.usage.completion_tokens;
      totalUsage.totalTokens += response.usage.total_tokens;

      const assistantContent = response.choices[0].message.content || '';
      messages.push({ role: 'assistant', content: assistantContent });

      // Parse the ReAct response
      const thoughtMatch = assistantContent.match(/Thought:\s*(.*?)(?=Action:|Final Answer:|$)/s);
      const actionMatch = assistantContent.match(/Action:\s*(\w+)\s*\[(.*?)\]/s);
      const finalAnswerMatch = assistantContent.match(/Final Answer:\s*(.*)/s);

      // Record thought
      if (thoughtMatch && config.returnIntermediateSteps) {
        intermediateSteps.push({
          step: intermediateSteps.length + 1,
          type: 'thought',
          content: thoughtMatch[1].trim(),
          timestamp: new Date(),
        });
      }

      // Check for final answer
      if (finalAnswerMatch) {
        const finalAnswer = finalAnswerMatch[1].trim();
        this.logger.log(`ReAct Agent completed after ${iterations} iteration(s)`);

        await this.saveToMemory(config, finalAnswer);

        return {
          response: finalAnswer,
          success: true,
          iterations,
          toolCalls: allToolCalls,
          toolResults: allToolResults,
          intermediateSteps: config.returnIntermediateSteps
            ? intermediateSteps
            : undefined,
          usage: totalUsage,
          finishReason: 'complete',
          durationMs: Date.now() - startTime,
        };
      }

      // Process action (tool call)
      if (actionMatch) {
        const toolName = actionMatch[1];
        let toolArgs: Record<string, any> = {};

        try {
          // Try to parse as JSON first
          toolArgs = JSON.parse(actionMatch[2]);
        } catch {
          // Fall back to simple key=value parsing
          const argPairs = actionMatch[2].split(',').map((s) => s.trim());
          for (const pair of argPairs) {
            const [key, ...valueParts] = pair.split('=');
            if (key && valueParts.length > 0) {
              toolArgs[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            }
          }
        }

        const toolCall: ToolCall = {
          id: `react_${iterations}_${toolName}`,
          name: toolName,
          arguments: toolArgs,
        };
        allToolCalls.push(toolCall);

        if (config.returnIntermediateSteps) {
          intermediateSteps.push({
            step: intermediateSteps.length + 1,
            type: 'tool_call',
            content: `Action: ${toolName}`,
            toolCall,
            timestamp: new Date(),
          });
        }

        // Execute tool
        const tool = toolMap.get(toolName);
        let toolResult: ToolResult;

        if (!tool) {
          toolResult = {
            success: false,
            error: `Tool "${toolName}" not found. Available tools: ${Array.from(toolMap.keys()).join(', ')}`,
            errorCode: AgentErrorType.TOOL_NOT_FOUND,
          };
        } else {
          toolResult = await this.executeTool(tool, toolCall, config.context);
        }

        allToolResults.push(toolResult);

        // Record observation
        const observation = toolResult.success
          ? JSON.stringify(toolResult.data, null, 2)
          : `Error: ${toolResult.error}`;

        if (config.returnIntermediateSteps) {
          intermediateSteps.push({
            step: intermediateSteps.length + 1,
            type: 'observation',
            content: observation,
            toolResult,
            timestamp: new Date(),
          });
        }

        // Add observation to continue the loop
        messages.push({
          role: 'user',
          content: `Observation: ${observation}\n\nContinue your reasoning.`,
        });
      } else if (!finalAnswerMatch) {
        // No action and no final answer - prompt to continue
        messages.push({
          role: 'user',
          content: 'Please continue with your reasoning. Remember to use the format: Thought: ... Action: tool_name[args] or Final Answer: ...',
        });
      }
    }

    // Max iterations reached
    this.logger.warn(`ReAct Agent max iterations (${config.maxIterations}) reached`);

    return {
      response: 'Agent reached maximum iterations without completing the task.',
      success: false,
      iterations,
      toolCalls: allToolCalls,
      toolResults: allToolResults,
      intermediateSteps: config.returnIntermediateSteps
        ? intermediateSteps
        : undefined,
      usage: totalUsage,
      finishReason: 'max_iterations',
      error: {
        type: AgentErrorType.MAX_ITERATIONS_REACHED,
        message: `Agent reached maximum iterations (${config.maxIterations})`,
      },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Build system prompt for ReAct Agent
   */
  private buildReActSystemPrompt(config: AgentConfig): string {
    let prompt = config.systemPrompt || 'You are a helpful AI assistant that solves problems step by step.';

    prompt += `\n\n## ReAct Reasoning Framework

You must follow the ReAct (Reason + Act) pattern to solve tasks. For each step:

1. **Thought**: Analyze the current situation and decide what to do next
2. **Action**: If you need information or to perform a task, use a tool
3. **Observation**: You will receive the result of your action
4. **Repeat**: Continue until you can provide a final answer

## Response Format

Always structure your response exactly like this:

Thought: [Your reasoning about what to do next]
Action: tool_name[{"param1": "value1"}]

OR when you have enough information:

Thought: [Your final reasoning]
Final Answer: [Your complete answer to the user's task]

## Available Tools\n\n`;

    if (config.tools.length > 0) {
      for (const tool of config.tools) {
        const params = Object.entries(tool.parameters.properties || {})
          .map(([key, val]: [string, any]) => {
            const required = tool.parameters.required?.includes(key) ? ' (required)' : '';
            return `  - ${key}: ${val.type}${required} - ${val.description || ''}`;
          })
          .join('\n');

        prompt += `### ${tool.name}\n${tool.description}\nParameters:\n${params}\n\n`;
      }
    } else {
      prompt += 'No tools are available. Rely on your knowledge to answer.\n\n';
    }

    prompt += `## Important Guidelines

- Always start with a Thought
- Only use one Action per response
- Wait for Observation before continuing
- Use "Final Answer" only when you have completed the task
- Be concise but thorough in your reasoning`;

    return prompt;
  }

  /**
   * Build initial messages array for the conversation
   */
  private buildInitialMessages(config: AgentConfig): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    // System prompt
    if (config.systemPrompt) {
      let systemContent = config.systemPrompt;

      // Add tool descriptions to system prompt for better context
      if (config.tools.length > 0) {
        const toolDescriptions = config.tools
          .map((t) => `- ${t.name}: ${t.description}`)
          .join('\n');

        systemContent += `\n\nYou have access to the following tools:\n${toolDescriptions}\n\nUse these tools when appropriate to complete the user's request.`;
      }

      messages.push({
        role: 'system',
        content: systemContent,
      });
    }

    // Add conversation history from memory
    if (config.memory && config.memory.messages) {
      for (const msg of config.memory.messages) {
        messages.push(this.convertMemoryMessage(msg));
      }
      this.logger.debug(`Added ${config.memory.messages.length} messages from memory`);
    }

    // Add current user input
    messages.push({
      role: 'user',
      content: config.input,
    });

    return messages;
  }

  /**
   * Convert memory message to OpenAI format
   */
  private convertMemoryMessage(msg: MemoryMessage): OpenAIMessage {
    switch (msg.type) {
      case 'human':
        return { role: 'user', content: msg.content };
      case 'ai':
        return { role: 'assistant', content: msg.content };
      case 'system':
        return { role: 'system', content: msg.content };
      case 'tool':
        return {
          role: 'tool',
          content: msg.content,
          tool_call_id: msg.toolCallId,
        };
      default:
        return { role: 'user', content: msg.content };
    }
  }

  /**
   * Format tools for OpenAI function calling API
   */
  private formatToolsForOpenAI(tools: ExecutableTool[]): OpenAITool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    modelConfig: AgentConfig['modelConfig'],
    messages: OpenAIMessage[],
    tools?: OpenAITool[],
  ): Promise<OpenAIResponse> {
    const requestBody: any = {
      model: modelConfig.model,
      messages,
      temperature: modelConfig.temperature ?? 0.7,
      max_tokens: modelConfig.maxTokens ?? 4096,
    };

    // Add tools if available
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    // Add optional parameters
    if (modelConfig.topP !== undefined) {
      requestBody.top_p = modelConfig.topP;
    }
    if (modelConfig.frequencyPenalty !== undefined) {
      requestBody.frequency_penalty = modelConfig.frequencyPenalty;
    }
    if (modelConfig.presencePenalty !== undefined) {
      requestBody.presence_penalty = modelConfig.presencePenalty;
    }

    const baseUrl = modelConfig.baseUrl || 'https://api.openai.com/v1';

    this.logger.debug(`Calling OpenAI API: ${modelConfig.model}`);

    try {
      const response = await axios.post<OpenAIResponse>(
        `${baseUrl}/chat/completions`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${modelConfig.apiKey}`,
            ...(modelConfig.organization
              ? { 'OpenAI-Organization': modelConfig.organization }
              : {}),
          },
          timeout: 120000, // 2 minute timeout for agent calls
        },
      );

      this.logger.debug(
        `OpenAI response: ${response.data.usage.total_tokens} tokens`,
      );

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 429) {
          throw new AgentError(
            AgentErrorType.RATE_LIMIT_EXCEEDED,
            'OpenAI rate limit exceeded',
            data,
          );
        }

        throw new AgentError(
          AgentErrorType.MODEL_ERROR,
          `OpenAI API error: ${data.error?.message || 'Unknown error'}`,
          data,
        );
      }

      throw new AgentError(
        AgentErrorType.MODEL_ERROR,
        `Failed to call OpenAI: ${error.message}`,
      );
    }
  }

  /**
   * Parse OpenAI tool call to our format
   */
  private parseOpenAIToolCall(openaiToolCall: OpenAIToolCall): ToolCall {
    let parsedArgs: Record<string, any>;

    try {
      parsedArgs = JSON.parse(openaiToolCall.function.arguments);
    } catch (error) {
      this.logger.warn(
        `Failed to parse tool arguments: ${openaiToolCall.function.arguments}`,
      );
      parsedArgs = {};
    }

    return {
      id: openaiToolCall.id,
      name: openaiToolCall.function.name,
      arguments: parsedArgs,
      rawArguments: openaiToolCall.function.arguments,
    };
  }

  /**
   * Execute a tool with error handling
   */
  private async executeTool(
    tool: ExecutableTool,
    toolCall: ToolCall,
    context: AgentConfig['context'],
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Executing tool: ${toolCall.name}`);
      this.logger.debug(`Arguments: ${JSON.stringify(toolCall.arguments)}`);

      const result = await tool.execute(toolCall.arguments, context);

      this.logger.log(
        `Tool ${toolCall.name} completed in ${Date.now() - startTime}ms`,
      );

      return {
        ...result,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      this.logger.error(`Tool ${toolCall.name} failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        errorCode: AgentErrorType.TOOL_EXECUTION_FAILED,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Save conversation to memory
   */
  private async saveToMemory(
    config: AgentConfig,
    response: string,
  ): Promise<void> {
    if (!config.memory || !config.memory.addMessage) {
      return;
    }

    try {
      // Save user message
      await config.memory.addMessage('human', config.input);
      // Save AI response
      await config.memory.addMessage('ai', response);
      this.logger.debug('Saved conversation to memory');
    } catch (error: any) {
      this.logger.warn(`Failed to save to memory: ${error.message}`);
    }
  }

  /**
   * Validate agent configuration
   */
  private validateConfig(config: AgentConfig): void {
    if (!config.modelConfig) {
      throw new AgentError(
        AgentErrorType.INVALID_CONFIG,
        'Model configuration is required',
      );
    }

    if (!config.modelConfig.apiKey) {
      throw new AgentError(
        AgentErrorType.INVALID_CONFIG,
        'API key is required in model configuration',
      );
    }

    if (!config.input) {
      throw new AgentError(
        AgentErrorType.INVALID_CONFIG,
        'Input message is required',
      );
    }

    if (config.maxIterations < 1 || config.maxIterations > 50) {
      throw new AgentError(
        AgentErrorType.INVALID_CONFIG,
        'maxIterations must be between 1 and 50',
      );
    }
  }

  /**
   * Build error result
   */
  private buildErrorResult(error: AgentError, startTime: number): AgentResult {
    return {
      response: `Error: ${error.message}`,
      success: false,
      iterations: 0,
      toolCalls: [],
      toolResults: [],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'error',
      error: {
        type: error.type,
        message: error.message,
        details: error.details,
      },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Parse and validate structured output according to JSON schema
   * Returns parsed JSON object if valid, or throws AgentError if parsing fails
   */
  parseStructuredOutput(
    response: string,
    schema: JSONSchema | undefined,
  ): any {
    if (!schema) {
      // No schema - try to parse as JSON, return as-is if fails
      try {
        return JSON.parse(response);
      } catch {
        return { text: response };
      }
    }

    // Try to extract JSON from the response
    let jsonStr = response;

    // First try: response is pure JSON
    try {
      const parsed = JSON.parse(jsonStr);
      return this.validateAndCoerceOutput(parsed, schema);
    } catch {
      // Continue to try other extraction methods
    }

    // Second try: extract JSON from markdown code block
    const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        return this.validateAndCoerceOutput(parsed, schema);
      } catch {
        // Continue
      }
    }

    // Third try: find JSON object/array in the response
    const jsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return this.validateAndCoerceOutput(parsed, schema);
      } catch {
        // Continue
      }
    }

    // Failed to parse - throw error
    throw new AgentError(
      AgentErrorType.OUTPUT_PARSE_ERROR,
      'Failed to parse response as JSON. Expected structured output.',
      { response, schema },
    );
  }

  /**
   * Validate and coerce output to match schema
   * Performs basic type coercion and adds missing defaults
   */
  private validateAndCoerceOutput(data: any, schema: JSONSchema): any {
    if (typeof data !== 'object' || data === null) {
      throw new AgentError(
        AgentErrorType.OUTPUT_PARSE_ERROR,
        'Expected object output, got ' + typeof data,
      );
    }

    const result: Record<string, any> = {};
    const properties = schema.properties || {};
    const required = schema.required || [];

    // Process each property in the schema
    for (const [key, propSchema] of Object.entries(properties)) {
      const value = data[key];
      const prop = propSchema as JSONSchemaProperty;

      if (value === undefined) {
        // Check if required
        if (required.includes(key)) {
          // Use default if available
          if (prop.default !== undefined) {
            result[key] = prop.default;
          } else {
            throw new AgentError(
              AgentErrorType.OUTPUT_PARSE_ERROR,
              `Missing required field: ${key}`,
            );
          }
        } else if (prop.default !== undefined) {
          result[key] = prop.default;
        }
        continue;
      }

      // Type coercion based on schema type
      result[key] = this.coerceValue(value, prop, key);
    }

    // Include any additional properties if allowed
    if (schema.additionalProperties !== false) {
      for (const [key, value] of Object.entries(data)) {
        if (!(key in result)) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Coerce a value to match the expected schema type
   */
  private coerceValue(value: any, schema: JSONSchemaProperty, key: string): any {
    const targetType = schema.type;

    switch (targetType) {
      case 'string':
        if (typeof value === 'string') return value;
        if (value === null || value === undefined) return '';
        return String(value);

      case 'number':
        if (typeof value === 'number') return value;
        const num = Number(value);
        if (isNaN(num)) {
          throw new AgentError(
            AgentErrorType.OUTPUT_PARSE_ERROR,
            `Field "${key}" expected number, got: ${typeof value}`,
          );
        }
        return num;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (value === 'true' || value === 1) return true;
        if (value === 'false' || value === 0) return false;
        return Boolean(value);

      case 'array':
        if (Array.isArray(value)) {
          // If item schema exists, coerce each item
          if (schema.items) {
            return value.map((item, idx) =>
              this.coerceValue(item, schema.items!, `${key}[${idx}]`),
            );
          }
          return value;
        }
        throw new AgentError(
          AgentErrorType.OUTPUT_PARSE_ERROR,
          `Field "${key}" expected array, got: ${typeof value}`,
        );

      case 'object':
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // If properties schema exists, validate nested object
          if (schema.properties) {
            return this.validateAndCoerceOutput(value, {
              type: 'object',
              properties: schema.properties,
              required: schema.required,
            });
          }
          return value;
        }
        throw new AgentError(
          AgentErrorType.OUTPUT_PARSE_ERROR,
          `Field "${key}" expected object, got: ${typeof value}`,
        );

      default:
        return value;
    }
  }

  /**
   * Request structured output from the model
   * Uses OpenAI's response_format for JSON mode
   */
  async requestStructuredOutput(
    config: AgentConfig,
    prompt: string,
  ): Promise<any> {
    const messages: OpenAIMessage[] = [];

    // Add system prompt with JSON formatting instructions
    let systemPrompt = config.systemPrompt || 'You are a helpful assistant.';

    if (config.outputSchema) {
      systemPrompt += `\n\nYou must respond with a JSON object that matches the following schema:\n${JSON.stringify(config.outputSchema, null, 2)}\n\nRespond ONLY with valid JSON, no additional text or markdown.`;
    }

    messages.push({ role: 'system', content: systemPrompt });

    // Add memory if available
    if (config.memory?.messages) {
      for (const msg of config.memory.messages) {
        messages.push(this.convertMemoryMessage(msg));
      }
    }

    messages.push({ role: 'user', content: prompt });

    // Call OpenAI with JSON mode
    const requestBody: any = {
      model: config.modelConfig.model,
      messages,
      temperature: config.modelConfig.temperature ?? 0.7,
      max_tokens: config.modelConfig.maxTokens ?? 4096,
    };

    // Enable JSON mode for compatible models
    if (
      config.modelConfig.model.includes('gpt-4') ||
      config.modelConfig.model.includes('gpt-3.5-turbo')
    ) {
      requestBody.response_format = { type: 'json_object' };
    }

    const baseUrl = config.modelConfig.baseUrl || 'https://api.openai.com/v1';

    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.modelConfig.apiKey}`,
        },
        timeout: 60000,
      },
    );

    const content = response.data.choices[0].message.content;
    return this.parseStructuredOutput(content, config.outputSchema);
  }
}
