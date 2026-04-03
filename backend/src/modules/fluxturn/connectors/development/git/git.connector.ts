// Git Connector Implementation
// Ported from n8n Git node to Fluxturn connector

import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorResponse,
  ConnectorCategory,
  ConnectorType,
  AuthType,
  ConnectorConfig,
  ConnectorRequest
} from '../../types';

// Promisified exec for async/await usage
const execAsync = promisify(exec);

@Injectable()
export class GitConnector extends BaseConnector {
  protected readonly logger = new Logger(GitConnector.name);

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Git',
      description: 'Control git repositories. Perform git operations like clone, commit, push, pull, and more.',
      version: '1.0.0',
      category: ConnectorCategory.DEVELOPMENT,
      type: ConnectorType.GIT,
      authType: AuthType.NONE, // Git operations are local, no external auth needed
      actions: [
        {
          id: 'add',
          name: 'Add',
          description: 'Add files to staging',
          inputSchema: {
            repositoryPath: { type: 'string', required: true },
            pathsToAdd: { type: 'string', required: true }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        {
          id: 'clone',
          name: 'Clone',
          description: 'Clone a repository',
          inputSchema: {
            repositoryPath: { type: 'string', required: true },
            sourceRepository: { type: 'string', required: true }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        {
          id: 'commit',
          name: 'Commit',
          description: 'Commit changes',
          inputSchema: {
            repositoryPath: { type: 'string', required: true },
            message: { type: 'string', required: true },
            branch: { type: 'string', required: false }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        {
          id: 'push',
          name: 'Push',
          description: 'Push commits to remote',
          inputSchema: {
            repositoryPath: { type: 'string', required: true },
            branch: { type: 'string', required: false }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        {
          id: 'pull',
          name: 'Pull',
          description: 'Pull from remote repository',
          inputSchema: {
            repositoryPath: { type: 'string', required: true }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        {
          id: 'fetch',
          name: 'Fetch',
          description: 'Fetch from remote repository',
          inputSchema: {
            repositoryPath: { type: 'string', required: true }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        },
        {
          id: 'log',
          name: 'Log',
          description: 'Get commit history',
          inputSchema: {
            repositoryPath: { type: 'string', required: true },
            returnAll: { type: 'boolean', required: false },
            limit: { type: 'number', required: false }
          },
          outputSchema: {
            commits: { type: 'array' }
          }
        },
        {
          id: 'status',
          name: 'Status',
          description: 'Get repository status',
          inputSchema: {
            repositoryPath: { type: 'string', required: true }
          },
          outputSchema: {
            status: { type: 'object' }
          }
        },
        {
          id: 'tag',
          name: 'Tag',
          description: 'Create a new tag',
          inputSchema: {
            repositoryPath: { type: 'string', required: true },
            name: { type: 'string', required: true }
          },
          outputSchema: {
            success: { type: 'boolean' }
          }
        }
      ],
      triggers: [],
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    // Git connector uses shell commands via execAsync, no special initialization needed
    this.logger.log('Git connector initialized successfully');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test if git is available on the system
      await execAsync('git --version');
      return true;
    } catch (error) {
      this.logger.error('Git connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const isHealthy = await this.performConnectionTest();
    if (!isHealthy) {
      throw new Error('Git health check failed - git is not installed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    throw new Error('Git connector does not support generic requests');
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'add':
        return await this.add(input);
      case 'clone':
        return await this.clone(input);
      case 'commit':
        return await this.commit(input);
      case 'push':
        return await this.push(input);
      case 'pull':
        return await this.pull(input);
      case 'fetch':
        return await this.fetch(input);
      case 'log':
        return await this.log(input);
      case 'status':
        return await this.status(input);
      case 'tag':
        return await this.tag(input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Git connector cleanup completed');
  }

  // Git-specific methods
  private async add(input: any): Promise<ConnectorResponse> {
    try {
      const { repositoryPath, pathsToAdd } = input;
      const paths = pathsToAdd.split(',').map((p: string) => p.trim()).join(' ');
      await execAsync(`git add ${paths}`, { cwd: repositoryPath });
      return {
        success: true,
        data: { message: 'Files added successfully' }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to add files');
    }
  }

  private async clone(input: any): Promise<ConnectorResponse> {
    try {
      const { repositoryPath, sourceRepository } = input;
      await execAsync(`git clone ${sourceRepository} .`, { cwd: repositoryPath });
      return {
        success: true,
        data: { message: 'Repository cloned successfully' }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to clone repository');
    }
  }

  private async commit(input: any): Promise<ConnectorResponse> {
    try {
      const { repositoryPath, message, branch } = input;

      if (branch) {
        await execAsync(`git checkout -B ${branch}`, { cwd: repositoryPath });
      }

      await execAsync(`git commit -m "${message}"`, { cwd: repositoryPath });
      return {
        success: true,
        data: { message: 'Committed successfully' }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to commit');
    }
  }

  private async push(input: any): Promise<ConnectorResponse> {
    try {
      const { repositoryPath, branch } = input;
      const command = branch ? `git push origin ${branch}` : 'git push';
      await execAsync(command, { cwd: repositoryPath });
      return {
        success: true,
        data: { message: 'Pushed successfully' }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to push');
    }
  }

  private async pull(input: any): Promise<ConnectorResponse> {
    try {
      const { repositoryPath } = input;
      await execAsync('git pull', { cwd: repositoryPath });
      return {
        success: true,
        data: { message: 'Pulled successfully' }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to pull');
    }
  }

  private async fetch(input: any): Promise<ConnectorResponse> {
    try {
      const { repositoryPath } = input;
      await execAsync('git fetch', { cwd: repositoryPath });
      return {
        success: true,
        data: { message: 'Fetched successfully' }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to fetch');
    }
  }

  private async log(input: any): Promise<ConnectorResponse> {
    try {
      const { repositoryPath, returnAll = false, limit = 100 } = input;
      const maxCount = returnAll ? '' : `--max-count=${limit}`;
      const { stdout } = await execAsync(`git log ${maxCount} --format=%H|%an|%ae|%s|%aD`, { cwd: repositoryPath });

      const commits = stdout.trim().split('\n').map(line => {
        const [hash, author, email, message, date] = line.split('|');
        return { hash, author, email, message, date };
      });

      return {
        success: true,
        data: commits
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get log');
    }
  }

  private async status(input: any): Promise<ConnectorResponse> {
    try {
      const { repositoryPath } = input;
      const { stdout } = await execAsync('git status --porcelain -b', { cwd: repositoryPath });
      return {
        success: true,
        data: { status: stdout }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get status');
    }
  }

  private async tag(input: any): Promise<ConnectorResponse> {
    try {
      const { repositoryPath, name } = input;
      await execAsync(`git tag ${name}`, { cwd: repositoryPath });
      return {
        success: true,
        data: { message: `Tag ${name} created successfully` }
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create tag');
    }
  }
}
