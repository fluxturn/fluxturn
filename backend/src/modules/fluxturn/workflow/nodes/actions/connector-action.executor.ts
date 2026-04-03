import { Injectable, Optional, Inject, forwardRef } from '@nestjs/common';
import {
  BaseNodeExecutor,
  NodeData,
  NodeInputItem,
  NodeExecutionContext,
  NodeExecutionResult,
} from '../base';
import { ConnectorsService } from '../../../connectors/connectors.service';
import { PlatformService } from '../../../../database/platform.service';
import { ConnectorToolProviderService, ToolProviderOutput } from '../../services/connector-tool-provider.service';

/**
 * Connector Action Executor
 * Executes any connector action (Telegram, Gmail, Slack, etc.)
 *
 * Supports two modes:
 * - 'execute' (default): Execute the action with provided parameters
 * - 'provider': Return a ToolProviderOutput for AI Agent to use as a tool
 */
@Injectable()
export class ConnectorActionExecutor extends BaseNodeExecutor {
  readonly supportedTypes = ['CONNECTOR_ACTION'];

  private connectorToolProvider: ConnectorToolProviderService | null = null;

  constructor(
    @Optional() private readonly connectorsService?: ConnectorsService,
    @Optional() private readonly platformService?: PlatformService,
  ) {
    super();
    // Initialize connector tool provider if connectors service is available
    if (this.connectorsService) {
      this.connectorToolProvider = new ConnectorToolProviderService(this.connectorsService);
    }
  }

  protected async executeInternal(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    if (!this.connectorsService) {
      throw new Error('Connectors service not available');
    }

    const config = node.data || {};
    const results: NodeInputItem[] = [];

    const credentialId = config.credentialId;
    const connectorType = config.connectorType || config.connector;
    const actionId = config.actionId;
    const nodeMode = config.mode || 'execute'; // Default to execute mode

    // === PROVIDER MODE: Return tool definition for AI Agent ===
    if (nodeMode === 'provider') {
      return this.executeProviderMode(node, inputData, context, config, connectorType, actionId, credentialId);
    }

    // === EXECUTE MODE: Run the action ===

    // Validate configuration
    if (!connectorType || !actionId) {
      const missing = [];
      if (!connectorType) missing.push('connector type');
      if (!actionId) missing.push('action');
      throw this.configurationError(node.data?.label || node.id, missing.join(', '));
    }

    // Check if connector requires authentication
    const requiresAuth = await this.checkRequiresAuth(connectorType);

    if (requiresAuth && !credentialId) {
      throw this.configurationError(node.data?.label || node.id, 'credential');
    }

    this.logger.log(
      `Executing ${connectorType} action: ${actionId}` +
      `${credentialId ? ` with credential: ${credentialId}` : ' (no credentials required)'}`
    );

    for (const item of inputData) {
      try {
        const itemContext = this.buildItemContext(item, context);

        // Prepare action parameters
        let actionParams: Record<string, any> = {};

        // Special handling for Telegram send_message
        if (connectorType === 'telegram' && actionId === 'send_message') {
          actionParams = this.prepareTelegramParams(config.actionParams || {}, itemContext);
        } else {
          // Generic action parameters handling
          if (config.actionParams) {
            actionParams = this.resolveObjectExpressions(config.actionParams, itemContext);
          }
        }

        // Special handling for Google Sheets
        if (connectorType === 'google_sheets' && actionParams.values) {
          actionParams.values = this.normalizeGoogleSheetsValues(actionParams.values);
        }

        // Include binary data from previous node if it exists
        if ((item.json as any)?.binary) {
          actionParams.binary = (item.json as any).binary;
        }

        // Execute the connector action
        const response = await this.connectorsService.executeConnectorAction(
          credentialId,
          {
            action: actionId,
            parameters: actionParams
          },
          {
            type: 'jwt',
            userId: undefined
          }
        );

        if (response.success) {
          const responseData = typeof response.data === 'string'
            ? { text: response.data }
            : (response.data && typeof response.data === 'object' ? response.data : {});

          results.push({
            json: {
              success: true,
              ...responseData,
              executedAt: new Date().toISOString(),
              connector: connectorType,
              action: actionId
            }
          });
        } else {
          let errorMsg = 'Connector action failed';
          if (response.error) {
            if (typeof response.error === 'string') {
              errorMsg = response.error;
            } else if (typeof response.error === 'object' && (response.error as any).message) {
              errorMsg = (response.error as any).message;
            } else if (typeof response.error === 'object') {
              errorMsg = JSON.stringify(response.error);
            }
          }
          throw new Error(`${errorMsg} (connector: ${connectorType}, action: ${actionId})`);
        }
      } catch (error: any) {
        const wrappedError = new Error(error.message || 'Connector action failed');
        wrappedError.name = 'ConnectorActionError';
        (wrappedError as any).connector = connectorType;
        (wrappedError as any).action = actionId;
        (wrappedError as any).originalError = error;
        throw wrappedError;
      }
    }

    return results;
  }

  private async checkRequiresAuth(connectorType: string): Promise<boolean> {
    if (!this.platformService) {
      return true; // Default to requiring auth
    }

    try {
      const result = await this.platformService.query(
        'SELECT auth_type FROM connectors WHERE name = $1 LIMIT 1',
        [connectorType]
      );
      if (result?.rows?.length > 0) {
        return result.rows[0].auth_type !== 'none';
      }
    } catch (error) {
      this.logger.warn(`Could not determine auth type for connector ${connectorType}, assuming auth required`);
    }
    return true;
  }

  private prepareTelegramParams(params: any, context: NodeExecutionContext): Record<string, any> {
    const actionParams: Record<string, any> = {
      chatId: this.resolveExpression(params.chatId, context),
      text: this.resolveExpression(params.text, context),
      parseMode: params.parseMode || 'none',
      disableNotification: params.disableNotification || false,
      replyToMessageId: this.resolveExpression(params.replyToMessageId, context),
      replyMarkup: this.resolveExpression(params.replyMarkup, context),
      disableWebPagePreview: params.disableWebPagePreview || false
    };

    // Remove undefined values
    Object.keys(actionParams).forEach(key => {
      if (actionParams[key] === undefined || actionParams[key] === '') {
        delete actionParams[key];
      }
    });

    // Handle parseMode 'none'
    if (actionParams.parseMode === 'none') {
      delete actionParams.parseMode;
    }

    return actionParams;
  }

  private normalizeGoogleSheetsValues(values: any): any[][] {
    if (typeof values === 'string') {
      return [[values]];
    }
    if (Array.isArray(values) && values.length > 0 && !Array.isArray(values[0])) {
      return [values];
    }
    return values;
  }

  /**
   * Execute in provider mode - returns tool definition for AI Agent
   */
  private async executeProviderMode(
    node: NodeData,
    inputData: NodeInputItem[],
    context: NodeExecutionContext,
    config: any,
    connectorType: string,
    actionId: string,
    credentialId: string,
  ): Promise<NodeExecutionResult> {
    this.logger.log(`Connector Action node in PROVIDER mode: ${connectorType}/${actionId}`);

    if (!this.connectorToolProvider) {
      throw new Error('Connector Tool Provider service not available');
    }

    if (!connectorType || !actionId) {
      throw new Error('Provider mode requires both connector type and action ID');
    }

    // Get AI-controlled fields and context params from config
    const aiControlledFields = new Set(config.aiControlledFields || []);
    const rawContextParams = config.contextParams || config.actionParams || {};

    // Build expression context from input data
    const expressionContext = {
      ...context,
      $json: inputData[0]?.json || inputData[0] || {},
    };

    // Resolve expressions in context params (non-AI-controlled fields)
    const resolvedContextParams: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawContextParams)) {
      if (!aiControlledFields.has(key)) {
        resolvedContextParams[key] = this.resolveExpression(value, expressionContext);
      }
    }

    this.logger.log(`AI-controlled fields: ${Array.from(aiControlledFields).join(', ') || 'none'}`);
    this.logger.log(`Context params (resolved): ${JSON.stringify(resolvedContextParams)}`);

    try {
      // Generate tool definition for just this action
      const toolProviderOutput = await this.connectorToolProvider.generateToolsFromConnector(
        connectorType,
        credentialId,
        {
          actionFilter: [actionId], // Only this action
          contextParams: { [actionId]: resolvedContextParams },
          filterAIControlled: true,
        }
      );

      this.logger.log(`Generated tool provider output for ${connectorType}/${actionId}`);
      this.logger.log(`Tool definitions count: ${toolProviderOutput.toolDefinitions.length}`);

      // Return as ToolProviderOutput
      return [{
        json: toolProviderOutput
      }];
    } catch (error: any) {
      this.logger.error(`Provider mode failed: ${error.message}`);
      throw new Error(`Failed to generate tool: ${error.message}`);
    }
  }
}
