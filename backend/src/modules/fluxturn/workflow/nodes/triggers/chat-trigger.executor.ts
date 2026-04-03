import { Injectable } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';

/**
 * Chat Trigger Executor
 * Triggered when a chat message is received from the chat widget/interface
 * Used for chatbot and AI agent workflows
 */
@Injectable()
export class ChatTriggerExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['CHAT_TRIGGER'];

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = node.data || {};
    const chatInputKey = config.chatInputKey || 'chatInput';
    const sessionIdKey = config.sessionIdKey || 'sessionId';

    // Chat data comes from the chat interface
    // It can be from context.$json (workflow execution) or inputData (direct call)
    const chatData = context.$json || inputData[0]?.json || inputData[0] || {};

    // Extract or generate session ID for conversation continuity
    const sessionId = chatData[sessionIdKey] ||
      chatData.sessionId ||
      `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Extract chat input
    const chatInput = chatData[chatInputKey] ||
      chatData.chatInput ||
      chatData.message ||
      chatData.text ||
      '';

    // Extract files if present
    const files = chatData.files || [];

    return [{
      json: {
        [chatInputKey]: chatInput,
        [sessionIdKey]: sessionId,
        chatInput, // Always include standard keys for compatibility
        sessionId,
        files,
        timestamp: new Date().toISOString(),
        trigger: 'chat',
        // Include any additional data passed
        ...chatData,
      }
    }];
  }
}
