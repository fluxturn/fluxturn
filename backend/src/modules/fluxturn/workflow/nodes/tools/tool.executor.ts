import { Injectable, Optional } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';
import { ToolExecutorService } from '../../services/tool-executor.service';

/**
 * Tool Executor
 * Executes tool nodes (Gmail, Slack, Telegram, Discord, Teams, Connector)
 * Delegates to ToolExecutorService for actual execution
 */
@Injectable()
export class ToolExecutor extends BaseNodeExecutor {
  readonly supportedTypes = [
    'GMAIL_TOOL',
    'SLACK_TOOL',
    'TELEGRAM_TOOL',
    'DISCORD_TOOL',
    'TEAMS_TOOL',
    'CONNECTOR_TOOL',
  ];

  constructor(
    @Optional() private readonly toolExecutorService?: ToolExecutorService,
  ) {
    super();
  }

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    if (!this.toolExecutorService) {
      throw new Error('Tool executor service not available');
    }

    const nodeType = node.type;

    switch (nodeType) {
      case 'GMAIL_TOOL':
        return await this.toolExecutorService.executeGmailTool(
          node,
          inputData,
          context,
          this.resolveExpression.bind(this)
        );

      case 'SLACK_TOOL':
        return await this.toolExecutorService.executeSlackTool(node, inputData, context);

      case 'TELEGRAM_TOOL':
        return await this.toolExecutorService.executeTelegramTool(node, inputData, context);

      case 'DISCORD_TOOL':
        return await this.toolExecutorService.executeDiscordTool(node, inputData, context);

      case 'TEAMS_TOOL':
        return await this.toolExecutorService.executeTeamsTool(node, inputData, context);

      case 'CONNECTOR_TOOL':
        return await this.executeConnectorTool(node, inputData, context);

      default:
        throw new Error(`Unknown tool type: ${nodeType}`);
    }
  }

  private async executeConnectorTool(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    // Connector tools are handled by ToolExecutorService
    // For now, return placeholder
    this.logger.warn('Connector tool execution requires full integration');

    return inputData.map(item => ({
      json: {
        ...(item.json || item),
        toolExecuted: true,
        toolType: 'CONNECTOR_TOOL',
      }
    }));
  }
}
