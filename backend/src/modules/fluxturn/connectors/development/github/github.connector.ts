import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { BaseConnector } from '../../base/base.connector';
import { IDevelopmentConnector } from '../../base/connector.interface';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  AuthType,
  ConnectorRequest,
  ConnectorResponse,
  PaginatedRequest
} from '../../types/index';

@Injectable()
export class GitHubConnector extends BaseConnector implements IDevelopmentConnector {
  private octokit: Octokit;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'GitHub',
      description: 'Git repository hosting and collaboration platform',
      version: '1.0.0',
      category: ConnectorCategory.DEVELOPMENT,
      type: ConnectorType.GITHUB,
      logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/github.svg',
      authType: AuthType.OAUTH2,
      requiredScopes: ['repo', 'user', 'admin:repo_hook'],
      actions: [
        {
          id: 'create_repository',
          name: 'Create Repository',
          description: 'Create a new GitHub repository',
          inputSchema: {
            name: {
              type: 'string',
              required: true,
              description: 'Repository name'
            },
            description: {
              type: 'string',
              required: false,
              description: 'Repository description'
            },
            private: {
              type: 'boolean',
              required: false,
              description: 'Whether repository is private'
            },
            auto_init: {
              type: 'boolean',
              required: false,
              description: 'Initialize with README'
            },
            gitignore_template: {
              type: 'string',
              required: false,
              description: 'Gitignore template name'
            },
            license_template: {
              type: 'string',
              required: false,
              description: 'License template name'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Repository ID' },
            name: { type: 'string', description: 'Repository name' },
            full_name: { type: 'string', description: 'Full repository name' },
            html_url: { type: 'string', description: 'Repository URL' },
            clone_url: { type: 'string', description: 'Clone URL' }
          }
        },
        {
          id: 'create_issue',
          name: 'Create Issue',
          description: 'Create a new issue',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              description: 'Repository owner'
            },
            repository: {
              type: 'string',
              required: true,
              description: 'Repository name'
            },
            title: {
              type: 'string',
              required: true,
              description: 'Issue title'
            },
            body: {
              type: 'string',
              required: false,
              description: 'Issue description'
            },
            assignees: {
              type: 'array',
              required: false,
              description: 'Array of assignee usernames'
            },
            labels: {
              type: 'array',
              required: false,
              description: 'Array of label names'
            },
            milestone: {
              type: 'number',
              required: false,
              description: 'Milestone number'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Issue ID' },
            number: { type: 'number', description: 'Issue number' },
            title: { type: 'string', description: 'Issue title' },
            html_url: { type: 'string', description: 'Issue URL' },
            state: { type: 'string', description: 'Issue state' }
          }
        },
        {
          id: 'create_pull_request',
          name: 'Create Pull Request',
          description: 'Create a new pull request',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              description: 'Repository owner'
            },
            repository: {
              type: 'string',
              required: true,
              description: 'Repository name'
            },
            title: {
              type: 'string',
              required: true,
              description: 'Pull request title'
            },
            head: {
              type: 'string',
              required: true,
              description: 'Branch to merge from'
            },
            base: {
              type: 'string',
              required: true,
              description: 'Branch to merge to'
            },
            body: {
              type: 'string',
              required: false,
              description: 'Pull request description'
            },
            draft: {
              type: 'boolean',
              required: false,
              description: 'Create as draft PR'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Pull request ID' },
            number: { type: 'number', description: 'Pull request number' },
            title: { type: 'string', description: 'Pull request title' },
            html_url: { type: 'string', description: 'Pull request URL' },
            state: { type: 'string', description: 'Pull request state' }
          }
        },
        {
          id: 'get_repository',
          name: 'Get Repository',
          description: 'Get repository information',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              description: 'Repository owner'
            },
            repository: {
              type: 'string',
              required: true,
              description: 'Repository name'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Repository ID' },
            name: { type: 'string', description: 'Repository name' },
            description: { type: 'string', description: 'Repository description' },
            language: { type: 'string', description: 'Primary language' },
            stargazers_count: { type: 'number', description: 'Star count' },
            forks_count: { type: 'number', description: 'Fork count' }
          }
        },
        {
          id: 'list_repositories',
          name: 'List Repositories',
          description: 'List user repositories',
          inputSchema: {
            type: {
              type: 'string',
              required: false,
              description: 'Repository type (all, owner, public, private, member)'
            },
            sort: {
              type: 'string',
              required: false,
              description: 'Sort by (created, updated, pushed, full_name)'
            },
            direction: {
              type: 'string',
              required: false,
              description: 'Sort direction (asc, desc)'
            },
            per_page: {
              type: 'number',
              required: false,
              description: 'Results per page (max 100)'
            }
          },
          outputSchema: {
            repositories: { type: 'array', description: 'Array of repositories' },
            total_count: { type: 'number', description: 'Total repository count' }
          }
        },
        {
          id: 'get_file_content',
          name: 'Get File Content',
          description: 'Get content of a file from repository',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              description: 'Repository owner'
            },
            repository: {
              type: 'string',
              required: true,
              description: 'Repository name'
            },
            path: {
              type: 'string',
              required: true,
              description: 'File path'
            },
            ref: {
              type: 'string',
              required: false,
              description: 'Branch, tag, or commit SHA'
            }
          },
          outputSchema: {
            content: { type: 'string', description: 'File content (base64 encoded)' },
            encoding: { type: 'string', description: 'Content encoding' },
            sha: { type: 'string', description: 'File SHA' },
            size: { type: 'number', description: 'File size' }
          }
        },
        {
          id: 'create_file',
          name: 'Create File',
          description: 'Create a new file in repository',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              description: 'Repository owner'
            },
            repository: {
              type: 'string',
              required: true,
              description: 'Repository name'
            },
            path: {
              type: 'string',
              required: true,
              description: 'File path'
            },
            message: {
              type: 'string',
              required: true,
              description: 'Commit message'
            },
            content: {
              type: 'string',
              required: true,
              description: 'File content (base64 encoded)'
            },
            branch: {
              type: 'string',
              required: false,
              description: 'Branch name (default: default branch)'
            }
          },
          outputSchema: {
            content: { type: 'object', description: 'Created file information' },
            commit: { type: 'object', description: 'Commit information' }
          }
        },
        {
          id: 'update_file',
          name: 'Update File',
          description: 'Update an existing file in repository',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              description: 'Repository owner'
            },
            repository: {
              type: 'string',
              required: true,
              description: 'Repository name'
            },
            path: {
              type: 'string',
              required: true,
              description: 'File path'
            },
            message: {
              type: 'string',
              required: true,
              description: 'Commit message'
            },
            content: {
              type: 'string',
              required: true,
              description: 'New file content (base64 encoded)'
            },
            sha: {
              type: 'string',
              required: true,
              description: 'SHA of the file to update (get it from get_file_content action)'
            },
            branch: {
              type: 'string',
              required: false,
              description: 'Branch name (default: default branch)'
            }
          },
          outputSchema: {
            content: { type: 'object', description: 'Updated file information' },
            commit: { type: 'object', description: 'Commit information' }
          }
        },
        {
          id: 'delete_file',
          name: 'Delete File',
          description: 'Delete a file from repository',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              description: 'Repository owner'
            },
            repository: {
              type: 'string',
              required: true,
              description: 'Repository name'
            },
            path: {
              type: 'string',
              required: true,
              description: 'File path to delete'
            },
            message: {
              type: 'string',
              required: true,
              description: 'Commit message'
            },
            sha: {
              type: 'string',
              required: true,
              description: 'SHA of the file to delete (get it from get_file_content action)'
            },
            branch: {
              type: 'string',
              required: false,
              description: 'Branch name (default: default branch)'
            }
          },
          outputSchema: {
            commit: { type: 'object', description: 'Commit information' },
            content: { type: 'object', description: 'Deleted file information' }
          }
        }
      ],
      triggers: [
        {
          id: 'on_push',
          name: 'On Push',
          description: 'Triggered when code is pushed to a repository branch',
          eventType: 'push',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              label: 'Repository Owner',
              placeholder: 'octocat',
              description: 'GitHub username or organization name (e.g., fluxturn, facebook, microsoft)',
              inputType: 'text'
            },
            repository: {
              type: 'string',
              required: true,
              label: 'Repository Name',
              placeholder: 'Hello-World',
              description: 'Repository name (e.g., backend, react, linux)',
              inputType: 'text'
            },
            branch: {
              type: 'string',
              required: false,
              label: 'Branch Filter',
              placeholder: 'main',
              description: 'Only trigger for specific branch (optional)',
              inputType: 'text'
            }
          },
          outputSchema: {
            ref: { type: 'string', description: 'Git ref that was pushed' },
            before: { type: 'string', description: 'SHA before push' },
            after: { type: 'string', description: 'SHA after push' },
            commits: { type: 'array', description: 'Array of commit objects' },
            pusher: { type: 'object', description: 'User who pushed' },
            repository: { type: 'object', description: 'Repository information' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'on_create',
          name: 'On Create',
          description: 'Triggered when a branch or tag is created',
          eventType: 'create',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              label: 'Repository Owner',
              placeholder: 'octocat',
              description: 'GitHub username or organization name (e.g., fluxturn, facebook, microsoft)',
              inputType: 'text'
            },
            repository: {
              type: 'string',
              required: true,
              label: 'Repository Name',
              placeholder: 'Hello-World',
              description: 'Repository name (e.g., backend, react, linux)',
              inputType: 'text'
            },
            refType: {
              type: 'select',
              required: false,
              label: 'Reference Type',
              description: 'Filter by reference type',
              default: 'all',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Branch', value: 'branch' },
                { label: 'Tag', value: 'tag' }
              ]
            }
          },
          outputSchema: {
            ref: { type: 'string', description: 'The git ref (branch or tag name)' },
            ref_type: { type: 'string', description: 'Type of ref created (branch or tag)' },
            master_branch: { type: 'string', description: 'The default branch' },
            repository: { type: 'object', description: 'Repository information' },
            sender: { type: 'object', description: 'User who created the ref' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'on_delete',
          name: 'On Delete',
          description: 'Triggered when a branch or tag is deleted',
          eventType: 'delete',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              label: 'Repository Owner',
              placeholder: 'octocat',
              description: 'GitHub username or organization name (e.g., fluxturn, facebook, microsoft)',
              inputType: 'text'
            },
            repository: {
              type: 'string',
              required: true,
              label: 'Repository Name',
              placeholder: 'Hello-World',
              description: 'Repository name (e.g., backend, react, linux)',
              inputType: 'text'
            },
            refType: {
              type: 'select',
              required: false,
              label: 'Reference Type',
              description: 'Filter by reference type',
              default: 'all',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Branch', value: 'branch' },
                { label: 'Tag', value: 'tag' }
              ]
            }
          },
          outputSchema: {
            ref: { type: 'string', description: 'The git ref (branch or tag name)' },
            ref_type: { type: 'string', description: 'Type of ref deleted (branch or tag)' },
            repository: { type: 'object', description: 'Repository information' },
            sender: { type: 'object', description: 'User who deleted the ref' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'on_commit_comment',
          name: 'On Commit Comment',
          description: 'Triggered when a comment is created on a commit',
          eventType: 'commit_comment',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              label: 'Repository Owner',
              placeholder: 'octocat',
              description: 'GitHub username or organization name (e.g., fluxturn, facebook, microsoft)',
              inputType: 'text'
            },
            repository: {
              type: 'string',
              required: true,
              label: 'Repository Name',
              placeholder: 'Hello-World',
              description: 'Repository name (e.g., backend, react, linux)',
              inputType: 'text'
            }
          },
          outputSchema: {
            action: { type: 'string', description: 'Action performed (created)' },
            comment: { type: 'object', description: 'Comment details' },
            repository: { type: 'object', description: 'Repository information' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'on_repository',
          name: 'On Repository',
          description: 'Triggered when a repository is created, deleted, archived, unarchived, renamed, edited, transferred, made public, or made private',
          eventType: 'repository',
          inputSchema: {
            owner: {
              type: 'string',
              required: true,
              label: 'Owner',
              placeholder: 'octocat',
              description: 'GitHub username or organization name (for org-level webhooks - e.g., fluxturn, facebook)',
              inputType: 'text'
            },
            actions: {
              type: 'array',
              required: false,
              label: 'Actions',
              description: 'Filter by specific repository actions (leave empty for all)'
            }
          },
          outputSchema: {
            action: { type: 'string', description: 'Action performed' },
            repository: { type: 'object', description: 'Repository information' },
            sender: { type: 'object', description: 'User who performed the action' },
            changes: { type: 'object', description: 'Changes made (for edited/renamed events)' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'pull_request',
          name: 'Pull Request Event',
          description: 'Triggered on pull request events',
          eventType: 'pull_request',
          outputSchema: {
            action: { type: 'string', description: 'PR action (opened, closed, etc.)' },
            number: { type: 'number', description: 'PR number' },
            pull_request: { type: 'object', description: 'Pull request data' },
            repository: { type: 'object', description: 'Repository information' }
          },
          webhookRequired: true
        },
        {
          id: 'issues',
          name: 'Issues Event',
          description: 'Triggered on issue events',
          eventType: 'issues',
          outputSchema: {
            action: { type: 'string', description: 'Issue action (opened, closed, etc.)' },
            issue: { type: 'object', description: 'Issue data' },
            repository: { type: 'object', description: 'Repository information' }
          },
          webhookRequired: true
        }
      ],
      rateLimit: {
        requestsPerHour: 5000,
        requestsPerMinute: 100
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    // Support both accessToken and personal_access_token field names for backward compatibility
    const token = this.config.credentials.accessToken || this.config.credentials.personal_access_token;

    if (!token) {
      throw new Error('GitHub access token is required');
    }

    this.octokit = new Octokit({
      auth: token,
      userAgent: 'FluxTurn-Connector/1.0.0'
    });

    this.logger.log('GitHub connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      this.logger.log(`Connected to GitHub as: ${user.login}`);
      return true;
    } catch (error) {
      throw new Error(`GitHub connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const { data: user } = await this.octokit.rest.users.getAuthenticated();
    if (!user) {
      throw new Error('GitHub health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const response = await this.octokit.request(`${request.method} ${request.endpoint}`, {
        ...request.body,
        ...request.queryParams
      });
      return response.data;
    } catch (error) {
      throw new Error(`GitHub API request failed: ${error.message}`);
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'create_repository':
        return this.createRepository(input);

      case 'create_issue':
        return this.createTask(input.owner, input.repository, input);

      case 'create_pull_request':
        return this.createPullRequest(input);

      case 'get_repository':
        return this.getRepository(input.owner, input.repository);

      case 'list_repositories':
        return this.listRepositories(input);

      case 'get_file_content':
        return this.getCode(input.owner, input.repository, input.path, input.ref);

      case 'create_file':
        return this.createFile(input);

      case 'update_file':
        return this.updateFile(input);

      case 'delete_file':
        return this.deleteFile(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('GitHub connector cleanup completed');
  }

  // IDevelopmentConnector implementation
  async createRepository(repository: any): Promise<ConnectorResponse> {
    try {
      const { data } = await this.octokit.rest.repos.createForAuthenticatedUser({
        name: repository.name,
        description: repository.description,
        private: repository.private,
        auto_init: repository.auto_init,
        gitignore_template: repository.gitignore_template,
        license_template: repository.license_template
      });

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          full_name: data.full_name,
          html_url: data.html_url,
          clone_url: data.clone_url
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create GitHub repository');
    }
  }

  async createTask(owner: string, repo: string, task: any): Promise<ConnectorResponse> {
    try {
      const { data } = await this.octokit.rest.issues.create({
        owner,
        repo,
        title: task.title,
        body: task.body,
        assignees: task.assignees,
        labels: task.labels,
        milestone: task.milestone
      });

      return {
        success: true,
        data: {
          id: data.id,
          number: data.number,
          title: data.title,
          html_url: data.html_url,
          state: data.state
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create GitHub issue');
    }
  }

  async getRepository(owner: string, repo: string): Promise<ConnectorResponse> {
    try {
      const { data } = await this.octokit.rest.repos.get({ owner, repo });

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          description: data.description,
          language: data.language,
          stargazers_count: data.stargazers_count,
          forks_count: data.forks_count
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error as any, `Failed to get GitHub repository ${owner}/${repo}`);
    }
  }

  async getCode(owner: string, repo: string, path: string, ref?: string): Promise<ConnectorResponse> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref
      });

      return {
        success: true,
        data: {
          content: (data as any).content,
          encoding: (data as any).encoding,
          sha: (data as any).sha,
          size: (data as any).size
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error as any, `Failed to get GitHub file content ${owner}/${repo}/${path}`);
    }
  }

  async deployProject(owner: string, repo: string, deployment: any): Promise<ConnectorResponse> {
    try {
      const { data } = await this.octokit.rest.repos.createDeployment({
        owner,
        repo,
        ref: deployment.ref || 'main',
        environment: deployment.environment || 'production',
        description: deployment.description,
        auto_merge: deployment.auto_merge,
        required_contexts: deployment.required_contexts
      });

      return {
        success: true,
        data: {
          id: (data as any).id,
          url: (data as any).url,
          environment: (data as any).environment,
          ref: (data as any).ref,
          sha: (data as any).sha
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error as any, `Failed to deploy GitHub repository ${owner}/${repo}`);
    }
  }

  async getTasks(owner: string, repo: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const { data } = await this.octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: options?.filters?.state || 'open',
        labels: options?.filters?.labels,
        assignee: options?.filters?.assignee,
        per_page: options?.pageSize || 30,
        page: options?.filters?.page || 1
      });

      return {
        success: true,
        data: data,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: options?.filters?.page || 1,
            pageSize: options?.pageSize || 30,
            total: 0,
            hasNext: data.length === (options?.pageSize || 30)
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, `Failed to get GitHub issues for ${owner}/${repo}`);
    }
  }

  // Helper methods
  private async createPullRequest(input: any): Promise<any> {
    const { data } = await this.octokit.rest.pulls.create({
      owner: input.owner,
      repo: input.repository,
      title: input.title,
      head: input.head,
      base: input.base,
      body: input.body,
      draft: input.draft
    });

    return {
      id: data.id,
      number: data.number,
      title: data.title,
      html_url: data.html_url,
      state: data.state
    };
  }

  private async listRepositories(input: any): Promise<any> {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      type: input.type || 'all',
      sort: input.sort || 'updated',
      direction: input.direction || 'desc',
      per_page: input.per_page || 30
    });

    return {
      repositories: data,
      total_count: data.length
    };
  }

  private async createFile(input: any): Promise<any> {
    // Validate required fields
    if (!input.content) {
      throw new Error('Content is required for creating a file');
    }

    // Encode content to base64 if it's not already
    const content = Buffer.from(input.content).toString('base64');

    const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: input.owner,
      repo: input.repository,
      path: input.path,
      message: input.message,
      content: content,
      branch: input.branch
    });

    return {
      content: data.content,
      commit: data.commit
    };
  }

  private async updateFile(input: any): Promise<any> {
    // Validate required fields
    if (!input.content) {
      throw new Error('Content is required for updating a file');
    }

    // Encode content to base64 if it's not already
    const content = Buffer.from(input.content).toString('base64');

    const { data } = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: input.owner,
      repo: input.repository,
      path: input.path,
      message: input.message,
      content: content,
      sha: input.sha, // Required for updating existing files
      branch: input.branch
    });

    return {
      content: data.content,
      commit: data.commit
    };
  }

  private async deleteFile(input: any): Promise<any> {
    const { data } = await this.octokit.rest.repos.deleteFile({
      owner: input.owner,
      repo: input.repository,
      path: input.path,
      message: input.message,
      sha: input.sha,
      branch: input.branch
    });

    return {
      commit: data.commit,
      content: data.content
    };
  }
}