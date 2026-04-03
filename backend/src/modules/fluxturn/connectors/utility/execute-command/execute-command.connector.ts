import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType
} from '../../types';

interface ExecReturnData {
  exitCode: number;
  error?: Error;
  stderr: string;
  stdout: string;
}

/**
 * Promisify exec manually to also get the exit code
 * Ported from n8n ExecuteCommand node
 */
async function execPromise(command: string): Promise<ExecReturnData> {
  const returnData: ExecReturnData = {
    error: undefined,
    exitCode: 0,
    stderr: '',
    stdout: '',
  };

  return await new Promise((resolve, _reject) => {
    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      returnData.stdout = stdout.trim();
      returnData.stderr = stderr.trim();

      if (error) {
        returnData.error = error;
      }

      resolve(returnData);
    }).on('exit', (code) => {
      returnData.exitCode = code || 0;
    });
  });
}

@Injectable()
export class ExecuteCommandConnector extends BaseConnector {
  protected readonly logger = new Logger(ExecuteCommandConnector.name);

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Execute Command',
      description: 'Execute terminal commands on the local system',
      version: '1.0.0',
      category: ConnectorCategory.UTILITY,
      type: ConnectorType.EXECUTE_COMMAND,
      authType: AuthType.NONE,
      actions: [
        {
          id: 'execute',
          name: 'Execute Command',
          description: 'Execute a terminal command on the host system',
          inputSchema: {
            executeOnce: {
              type: 'boolean',
              label: 'Execute Once',
              description: 'Whether to execute only once instead of once for each entry',
              default: true
            },
            command: {
              type: 'string',
              required: true,
              label: 'Command',
              inputType: 'textarea',
              description: 'The command to execute',
              placeholder: 'echo "test"'
            }
          },
          outputSchema: {
            exitCode: { type: 'number', description: 'Exit code of the command' },
            stdout: { type: 'string', description: 'Standard output from the command' },
            stderr: { type: 'string', description: 'Standard error from the command' }
          }
        }
      ],
      triggers: [],
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    // No authentication required for local command execution
    this.logger.log('Execute Command connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test with a simple echo command
      const result = await execPromise('echo "test"');
      return result.exitCode === 0;
    } catch (error) {
      this.logger.error('Execute Command connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Execute Command health check failed');
    }
  }

  protected async performRequest(request: any): Promise<any> {
    throw new Error('Execute Command connector does not support generic requests');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'execute':
        return await this.executeCommand(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Execute Command connector cleanup completed');
  }

  /**
   * Execute a terminal command
   * Matches n8n ExecuteCommand node behavior
   */
  private async executeCommand(input: any): Promise<ConnectorResponse> {
    try {
      const { command, executeOnce = true } = input;

      if (!command) {
        throw new Error('Command is required');
      }

      this.logger.log(`Executing command: ${command}`);

      const { error, exitCode, stdout, stderr } = await execPromise(command);

      if (error !== undefined) {
        throw new Error(error.message);
      }

      return {
        success: true,
        data: {
          exitCode,
          stdout,
          stderr
        }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to execute command');
    }
  }
}
