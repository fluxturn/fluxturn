import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
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
export class GitLabConnector extends BaseConnector implements IDevelopmentConnector {
  private client: AxiosInstance;
  private baseUrl: string;

  getMetadata(): ConnectorMetadata {
    return {
      name: 'GitLab',
      description: 'Git repository hosting, CI/CD, issues, merge requests, and DevOps platform',
      version: '1.0.0',
      category: ConnectorCategory.DEVELOPMENT,
      type: ConnectorType.GITLAB,
      logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gitlab.svg',
      authType: AuthType.OAUTH2,
      requiredScopes: ['api', 'read_user', 'read_api', 'read_repository', 'write_repository'],
      actions: [
        {
          id: 'create_issue',
          name: 'Create Issue',
          description: 'Create a new issue in a project',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              description: 'Project ID or URL-encoded path'
            },
            title: {
              type: 'string',
              required: true,
              description: 'Issue title'
            },
            description: {
              type: 'string',
              required: false,
              description: 'Issue description'
            },
            assignee_ids: {
              type: 'array',
              required: false,
              description: 'Array of assignee user IDs'
            },
            labels: {
              type: 'string',
              required: false,
              description: 'Comma-separated label names'
            },
            milestone_id: {
              type: 'number',
              required: false,
              description: 'Milestone ID'
            },
            due_date: {
              type: 'string',
              required: false,
              description: 'Due date (YYYY-MM-DD)'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Issue ID' },
            iid: { type: 'number', description: 'Issue IID (internal ID)' },
            title: { type: 'string', description: 'Issue title' },
            web_url: { type: 'string', description: 'Issue URL' },
            state: { type: 'string', description: 'Issue state' }
          }
        },
        {
          id: 'get_issue',
          name: 'Get Issue',
          description: 'Get details of a specific issue',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              description: 'Project ID or URL-encoded path'
            },
            issueIid: {
              type: 'number',
              required: true,
              description: 'Issue internal ID (IID)'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Issue ID' },
            iid: { type: 'number', description: 'Issue IID' },
            title: { type: 'string', description: 'Issue title' },
            description: { type: 'string', description: 'Issue description' },
            state: { type: 'string', description: 'Issue state' },
            web_url: { type: 'string', description: 'Issue URL' }
          }
        },
        {
          id: 'update_issue',
          name: 'Update Issue',
          description: 'Update an existing issue',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              description: 'Project ID or URL-encoded path'
            },
            issueIid: {
              type: 'number',
              required: true,
              description: 'Issue internal ID (IID)'
            },
            title: {
              type: 'string',
              required: false,
              description: 'New issue title'
            },
            description: {
              type: 'string',
              required: false,
              description: 'New issue description'
            },
            state_event: {
              type: 'string',
              required: false,
              description: 'State event (close or reopen)'
            },
            labels: {
              type: 'string',
              required: false,
              description: 'Comma-separated label names'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Issue ID' },
            iid: { type: 'number', description: 'Issue IID' },
            title: { type: 'string', description: 'Issue title' },
            state: { type: 'string', description: 'Issue state' }
          }
        },
        {
          id: 'create_merge_request',
          name: 'Create Merge Request',
          description: 'Create a new merge request',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              description: 'Project ID or URL-encoded path'
            },
            title: {
              type: 'string',
              required: true,
              description: 'Merge request title'
            },
            source_branch: {
              type: 'string',
              required: true,
              description: 'Source branch name'
            },
            target_branch: {
              type: 'string',
              required: true,
              description: 'Target branch name'
            },
            description: {
              type: 'string',
              required: false,
              description: 'Merge request description'
            },
            assignee_id: {
              type: 'number',
              required: false,
              description: 'Assignee user ID'
            },
            remove_source_branch: {
              type: 'boolean',
              required: false,
              description: 'Remove source branch after merge'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Merge request ID' },
            iid: { type: 'number', description: 'Merge request IID' },
            title: { type: 'string', description: 'Merge request title' },
            web_url: { type: 'string', description: 'Merge request URL' },
            state: { type: 'string', description: 'Merge request state' }
          }
        },
        {
          id: 'get_file',
          name: 'Get File',
          description: 'Get file content from repository',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              description: 'Project ID or URL-encoded path'
            },
            file_path: {
              type: 'string',
              required: true,
              description: 'File path in repository'
            },
            ref: {
              type: 'string',
              required: false,
              description: 'Branch, tag, or commit SHA (default: main branch)'
            }
          },
          outputSchema: {
            file_name: { type: 'string', description: 'File name' },
            file_path: { type: 'string', description: 'File path' },
            content: { type: 'string', description: 'File content (base64 encoded)' },
            size: { type: 'number', description: 'File size' },
            encoding: { type: 'string', description: 'Content encoding' },
            blob_id: { type: 'string', description: 'Blob ID' }
          }
        },
        {
          id: 'create_file',
          name: 'Create File',
          description: 'Create a new file in repository',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              description: 'Project ID or URL-encoded path'
            },
            file_path: {
              type: 'string',
              required: true,
              description: 'File path in repository'
            },
            branch: {
              type: 'string',
              required: true,
              description: 'Branch name'
            },
            content: {
              type: 'string',
              required: true,
              description: 'File content'
            },
            commit_message: {
              type: 'string',
              required: true,
              description: 'Commit message'
            },
            author_email: {
              type: 'string',
              required: false,
              description: 'Author email'
            },
            author_name: {
              type: 'string',
              required: false,
              description: 'Author name'
            }
          },
          outputSchema: {
            file_path: { type: 'string', description: 'File path' },
            branch: { type: 'string', description: 'Branch name' }
          }
        },
        {
          id: 'update_file',
          name: 'Update File',
          description: 'Update an existing file in repository',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              description: 'Project ID or URL-encoded path'
            },
            file_path: {
              type: 'string',
              required: true,
              description: 'File path in repository'
            },
            branch: {
              type: 'string',
              required: true,
              description: 'Branch name'
            },
            content: {
              type: 'string',
              required: true,
              description: 'New file content'
            },
            commit_message: {
              type: 'string',
              required: true,
              description: 'Commit message'
            },
            last_commit_id: {
              type: 'string',
              required: false,
              description: 'Last commit ID (for conflict prevention)'
            }
          },
          outputSchema: {
            file_path: { type: 'string', description: 'File path' },
            branch: { type: 'string', description: 'Branch name' }
          }
        },
        {
          id: 'delete_file',
          name: 'Delete File',
          description: 'Delete a file from repository',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              description: 'Project ID or URL-encoded path'
            },
            file_path: {
              type: 'string',
              required: true,
              description: 'File path in repository'
            },
            branch: {
              type: 'string',
              required: true,
              description: 'Branch name'
            },
            commit_message: {
              type: 'string',
              required: true,
              description: 'Commit message'
            },
            last_commit_id: {
              type: 'string',
              required: false,
              description: 'Last commit ID (for conflict prevention)'
            }
          },
          outputSchema: {
            file_path: { type: 'string', description: 'Deleted file path' },
            branch: { type: 'string', description: 'Branch name' }
          }
        },
        {
          id: 'create_release',
          name: 'Create Release',
          description: 'Create a new project release',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              description: 'Project ID or URL-encoded path'
            },
            tag_name: {
              type: 'string',
              required: true,
              description: 'Git tag name'
            },
            name: {
              type: 'string',
              required: true,
              description: 'Release name'
            },
            description: {
              type: 'string',
              required: false,
              description: 'Release description'
            },
            ref: {
              type: 'string',
              required: false,
              description: 'Branch, tag, or commit SHA to create tag from'
            },
            released_at: {
              type: 'string',
              required: false,
              description: 'Release date (ISO 8601 format)'
            }
          },
          outputSchema: {
            tag_name: { type: 'string', description: 'Tag name' },
            name: { type: 'string', description: 'Release name' },
            description: { type: 'string', description: 'Release description' },
            created_at: { type: 'string', description: 'Creation date' }
          }
        },
        {
          id: 'get_project',
          name: 'Get Project',
          description: 'Get project information',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              description: 'Project ID or URL-encoded path'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Project ID' },
            name: { type: 'string', description: 'Project name' },
            description: { type: 'string', description: 'Project description' },
            web_url: { type: 'string', description: 'Project URL' },
            default_branch: { type: 'string', description: 'Default branch' },
            visibility: { type: 'string', description: 'Project visibility' }
          }
        }
      ],
      triggers: [
        {
          id: 'on_push',
          name: 'On Push',
          description: 'Triggered when code is pushed to a repository',
          eventType: 'push',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              label: 'Project ID',
              placeholder: '123',
              description: 'GitLab project ID or URL-encoded path (e.g., username/project-name)',
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
            user_name: { type: 'string', description: 'User who pushed' },
            project: { type: 'object', description: 'Project information' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'on_issue',
          name: 'On Issue',
          description: 'Triggered when an issue is created, updated, or closed',
          eventType: 'issue',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              label: 'Project ID',
              placeholder: '123',
              description: 'GitLab project ID or URL-encoded path',
              inputType: 'text'
            },
            action: {
              type: 'select',
              required: false,
              label: 'Action Filter',
              description: 'Filter by specific action',
              default: 'all',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Open', value: 'open' },
                { label: 'Close', value: 'close' },
                { label: 'Reopen', value: 'reopen' },
                { label: 'Update', value: 'update' }
              ]
            }
          },
          outputSchema: {
            object_kind: { type: 'string', description: 'Event type' },
            object_attributes: { type: 'object', description: 'Issue details' },
            user: { type: 'object', description: 'User who triggered the event' },
            project: { type: 'object', description: 'Project information' },
            changes: { type: 'object', description: 'Changes made to issue' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'on_merge_request',
          name: 'On Merge Request',
          description: 'Triggered when a merge request is created, updated, or merged',
          eventType: 'merge_request',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              label: 'Project ID',
              placeholder: '123',
              description: 'GitLab project ID or URL-encoded path',
              inputType: 'text'
            },
            action: {
              type: 'select',
              required: false,
              label: 'Action Filter',
              description: 'Filter by specific action',
              default: 'all',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Open', value: 'open' },
                { label: 'Close', value: 'close' },
                { label: 'Reopen', value: 'reopen' },
                { label: 'Update', value: 'update' },
                { label: 'Merge', value: 'merge' }
              ]
            }
          },
          outputSchema: {
            object_kind: { type: 'string', description: 'Event type' },
            object_attributes: { type: 'object', description: 'Merge request details' },
            user: { type: 'object', description: 'User who triggered the event' },
            project: { type: 'object', description: 'Project information' },
            changes: { type: 'object', description: 'Changes made to merge request' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'on_pipeline',
          name: 'On Pipeline',
          description: 'Triggered when a pipeline status changes',
          eventType: 'pipeline',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              label: 'Project ID',
              placeholder: '123',
              description: 'GitLab project ID or URL-encoded path',
              inputType: 'text'
            },
            status: {
              type: 'select',
              required: false,
              label: 'Status Filter',
              description: 'Filter by pipeline status',
              default: 'all',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Running', value: 'running' },
                { label: 'Pending', value: 'pending' },
                { label: 'Success', value: 'success' },
                { label: 'Failed', value: 'failed' },
                { label: 'Canceled', value: 'canceled' }
              ]
            }
          },
          outputSchema: {
            object_kind: { type: 'string', description: 'Event type' },
            object_attributes: { type: 'object', description: 'Pipeline details' },
            user: { type: 'object', description: 'User who triggered the pipeline' },
            project: { type: 'object', description: 'Project information' },
            commit: { type: 'object', description: 'Commit information' },
            builds: { type: 'array', description: 'Build jobs in pipeline' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'on_release',
          name: 'On Release',
          description: 'Triggered when a release is created',
          eventType: 'release',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              label: 'Project ID',
              placeholder: '123',
              description: 'GitLab project ID or URL-encoded path',
              inputType: 'text'
            }
          },
          outputSchema: {
            id: { type: 'number', description: 'Release ID' },
            tag: { type: 'string', description: 'Release tag' },
            name: { type: 'string', description: 'Release name' },
            description: { type: 'string', description: 'Release description' },
            project: { type: 'object', description: 'Project information' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'on_tag_push',
          name: 'On Tag Push',
          description: 'Triggered when a tag is pushed',
          eventType: 'tag_push',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              label: 'Project ID',
              placeholder: '123',
              description: 'GitLab project ID or URL-encoded path',
              inputType: 'text'
            }
          },
          outputSchema: {
            ref: { type: 'string', description: 'Tag reference' },
            before: { type: 'string', description: 'SHA before push' },
            after: { type: 'string', description: 'SHA after push' },
            user_name: { type: 'string', description: 'User who pushed' },
            project: { type: 'object', description: 'Project information' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'on_wiki_page',
          name: 'On Wiki Page',
          description: 'Triggered when a wiki page is created or updated',
          eventType: 'wiki_page',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              label: 'Project ID',
              placeholder: '123',
              description: 'GitLab project ID or URL-encoded path',
              inputType: 'text'
            }
          },
          outputSchema: {
            object_kind: { type: 'string', description: 'Event type' },
            user: { type: 'object', description: 'User who modified the wiki' },
            project: { type: 'object', description: 'Project information' },
            wiki: { type: 'object', description: 'Wiki information' },
            object_attributes: { type: 'object', description: 'Wiki page details' }
          },
          webhookRequired: true,
          pollingEnabled: false
        },
        {
          id: 'on_comment',
          name: 'On Comment',
          description: 'Triggered when a comment is added to issues, merge requests, or commits',
          eventType: 'note',
          inputSchema: {
            projectId: {
              type: 'string',
              required: true,
              label: 'Project ID',
              placeholder: '123',
              description: 'GitLab project ID or URL-encoded path',
              inputType: 'text'
            },
            noteableType: {
              type: 'select',
              required: false,
              label: 'Comment Type',
              description: 'Filter by comment type',
              default: 'all',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Issue', value: 'Issue' },
                { label: 'Merge Request', value: 'MergeRequest' },
                { label: 'Commit', value: 'Commit' },
                { label: 'Snippet', value: 'Snippet' }
              ]
            }
          },
          outputSchema: {
            object_kind: { type: 'string', description: 'Event type' },
            user: { type: 'object', description: 'User who commented' },
            project: { type: 'object', description: 'Project information' },
            object_attributes: { type: 'object', description: 'Comment details' },
            issue: { type: 'object', description: 'Related issue (if applicable)' },
            merge_request: { type: 'object', description: 'Related MR (if applicable)' }
          },
          webhookRequired: true,
          pollingEnabled: false
        }
      ],
      rateLimit: {
        requestsPerMinute: 300
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    const token = this.config.credentials.accessToken || this.config.credentials.access_token;
    const serverUrl = this.config.credentials.serverUrl || 'https://gitlab.com';

    if (!token) {
      throw new Error('GitLab access token is required');
    }

    this.baseUrl = `${serverUrl}/api/v4`;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    this.logger.log('GitLab connector initialized');
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.client.get('/user');
      this.logger.log(`Connected to GitLab as: ${response.data.username}`);
      return true;
    } catch (error) {
      throw new Error(`GitLab connection test failed: ${error.message}`);
    }
  }

  protected async performHealthCheck(): Promise<void> {
    const response = await this.client.get('/user');
    if (!response.data) {
      throw new Error('GitLab health check failed');
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const response = await this.client.request({
        method: request.method,
        url: request.endpoint,
        data: request.body,
        params: request.queryParams
      });
      return response.data;
    } catch (error) {
      throw new Error(`GitLab API request failed: ${error.message}`);
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    switch (actionId) {
      case 'create_issue':
        return this.createTask(input.projectId, null, input);

      case 'get_issue':
        return this.getIssue(input);

      case 'update_issue':
        return this.updateIssue(input);

      case 'create_merge_request':
        return this.createMergeRequest(input);

      case 'get_file':
        return this.getCode(input.projectId, null, input.file_path, input.ref);

      case 'create_file':
        return this.createFile(input);

      case 'update_file':
        return this.updateFile(input);

      case 'delete_file':
        return this.deleteFile(input);

      case 'create_release':
        return this.createRelease(input);

      case 'get_project':
        return this.getRepository(input.projectId, null);

      case 'get_release':
        return this.getRelease(input);

      case 'list_releases':
        return this.listReleases(input);

      case 'update_release':
        return this.updateRelease(input);

      case 'delete_release':
        return this.deleteRelease(input);

      case 'list_issues':
        return this.listIssues(input);

      case 'create_issue_note':
        return this.createIssueNote(input);

      case 'list_files':
        return this.listFiles(input);

      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('GitLab connector cleanup completed');
  }

  // IDevelopmentConnector implementation
  async createRepository(repository: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post('/projects', {
        name: repository.name,
        description: repository.description,
        visibility: repository.private ? 'private' : 'public',
        initialize_with_readme: repository.auto_init
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          name: response.data.name,
          path_with_namespace: response.data.path_with_namespace,
          web_url: response.data.web_url,
          http_url_to_repo: response.data.http_url_to_repo
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create GitLab project');
    }
  }

  async createTask(projectId: string, repo: string, task: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post(`/projects/${encodeURIComponent(projectId)}/issues`, {
        title: task.title,
        description: task.description || task.body,
        assignee_ids: task.assignee_ids || task.assignees,
        labels: task.labels,
        milestone_id: task.milestone_id || task.milestone,
        due_date: task.due_date
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          iid: response.data.iid,
          title: response.data.title,
          web_url: response.data.web_url,
          state: response.data.state
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create GitLab issue');
    }
  }

  async getRepository(projectId: string, repo: string): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}`);

      return {
        success: true,
        data: {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
          default_branch: response.data.default_branch,
          visibility: response.data.visibility,
          web_url: response.data.web_url,
          star_count: response.data.star_count,
          forks_count: response.data.forks_count
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error as any, `Failed to get GitLab project ${projectId}`);
    }
  }

  async getCode(projectId: string, repo: string, path: string, ref?: string): Promise<ConnectorResponse> {
    try {
      const encodedPath = encodeURIComponent(path);
      const url = `/projects/${encodeURIComponent(projectId)}/repository/files/${encodedPath}`;
      const params = ref ? { ref } : {};

      const response = await this.client.get(url, { params });

      return {
        success: true,
        data: {
          file_name: response.data.file_name,
          file_path: response.data.file_path,
          content: response.data.content,
          size: response.data.size,
          encoding: response.data.encoding,
          blob_id: response.data.blob_id
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error as any, `Failed to get GitLab file content ${projectId}/${path}`);
    }
  }

  async deployProject(projectId: string, repo: string, deployment: any): Promise<ConnectorResponse> {
    try {
      const response = await this.client.post(
        `/projects/${encodeURIComponent(projectId)}/deployments`,
        {
          environment: deployment.environment || 'production',
          ref: deployment.ref || 'main',
          tag: deployment.tag,
          sha: deployment.sha,
          status: deployment.status || 'created'
        }
      );

      return {
        success: true,
        data: {
          id: response.data.id,
          iid: response.data.iid,
          ref: response.data.ref,
          sha: response.data.sha,
          environment: response.data.environment,
          status: response.data.status
        },
        metadata: { timestamp: new Date() }
      };
    } catch (error) {
      return this.handleError(error as any, `Failed to deploy GitLab project ${projectId}`);
    }
  }

  async getTasks(projectId: string, repo: string, options?: PaginatedRequest): Promise<ConnectorResponse> {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}/issues`, {
        params: {
          state: options?.filters?.state || 'opened',
          labels: options?.filters?.labels,
          assignee_id: options?.filters?.assignee_id,
          per_page: options?.pageSize || 20,
          page: options?.page || 1
        }
      });

      return {
        success: true,
        data: response.data,
        metadata: {
          timestamp: new Date(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 20,
            total: parseInt(response.headers['x-total'] || '0'),
            hasNext: response.data.length === (options?.pageSize || 20)
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, `Failed to get GitLab issues for ${projectId}`);
    }
  }

  // Helper methods
  private async getIssue(input: any): Promise<any> {
    const response = await this.client.get(
      `/projects/${encodeURIComponent(input.projectId)}/issues/${input.issueIid}`
    );

    return {
      id: response.data.id,
      iid: response.data.iid,
      title: response.data.title,
      description: response.data.description,
      state: response.data.state,
      web_url: response.data.web_url
    };
  }

  private async updateIssue(input: any): Promise<any> {
    const updateData: any = {};
    if (input.title) updateData.title = input.title;
    if (input.description) updateData.description = input.description;
    if (input.state_event) updateData.state_event = input.state_event;
    if (input.labels) updateData.labels = input.labels;

    const response = await this.client.put(
      `/projects/${encodeURIComponent(input.projectId)}/issues/${input.issueIid}`,
      updateData
    );

    return {
      id: response.data.id,
      iid: response.data.iid,
      title: response.data.title,
      state: response.data.state
    };
  }

  private async createMergeRequest(input: any): Promise<any> {
    const response = await this.client.post(
      `/projects/${encodeURIComponent(input.projectId)}/merge_requests`,
      {
        title: input.title,
        source_branch: input.source_branch,
        target_branch: input.target_branch,
        description: input.description,
        assignee_id: input.assignee_id,
        remove_source_branch: input.remove_source_branch
      }
    );

    return {
      id: response.data.id,
      iid: response.data.iid,
      title: response.data.title,
      web_url: response.data.web_url,
      state: response.data.state
    };
  }

  private async createFile(input: any): Promise<any> {
    const response = await this.client.post(
      `/projects/${encodeURIComponent(input.projectId)}/repository/files/${encodeURIComponent(input.file_path)}`,
      {
        branch: input.branch,
        content: input.content,
        commit_message: input.commit_message,
        author_email: input.author_email,
        author_name: input.author_name
      }
    );

    return {
      file_path: response.data.file_path,
      branch: response.data.branch
    };
  }

  private async updateFile(input: any): Promise<any> {
    const response = await this.client.put(
      `/projects/${encodeURIComponent(input.projectId)}/repository/files/${encodeURIComponent(input.file_path)}`,
      {
        branch: input.branch,
        content: input.content,
        commit_message: input.commit_message,
        last_commit_id: input.last_commit_id
      }
    );

    return {
      file_path: response.data.file_path,
      branch: response.data.branch
    };
  }

  private async deleteFile(input: any): Promise<any> {
    const response = await this.client.delete(
      `/projects/${encodeURIComponent(input.projectId)}/repository/files/${encodeURIComponent(input.file_path)}`,
      {
        data: {
          branch: input.branch,
          commit_message: input.commit_message,
          last_commit_id: input.last_commit_id
        }
      }
    );

    return {
      file_path: input.file_path,
      branch: input.branch
    };
  }

  private async createRelease(input: any): Promise<any> {
    const response = await this.client.post(
      `/projects/${encodeURIComponent(input.projectId)}/releases`,
      {
        tag_name: input.tag_name,
        name: input.name,
        description: input.description,
        ref: input.ref,
        released_at: input.released_at
      }
    );

    return {
      tag_name: response.data.tag_name,
      name: response.data.name,
      description: response.data.description,
      created_at: response.data.created_at
    };
  }

  private async getRelease(input: any): Promise<any> {
    const response = await this.client.get(
      `/projects/${encodeURIComponent(input.projectId)}/releases/${encodeURIComponent(input.tagName)}`
    );

    return {
      tag_name: response.data.tag_name,
      name: response.data.name,
      description: response.data.description,
      created_at: response.data.created_at,
      released_at: response.data.released_at,
      author: response.data.author,
      assets: response.data.assets
    };
  }

  private async listReleases(input: any): Promise<any> {
    const response = await this.client.get(
      `/projects/${encodeURIComponent(input.projectId)}/releases`,
      {
        params: {
          per_page: input.perPage || 20,
          page: input.page || 1
        }
      }
    );

    return {
      releases: response.data,
      total: parseInt(response.headers['x-total'] || response.data.length.toString())
    };
  }

  private async updateRelease(input: any): Promise<any> {
    const updateData: any = {};
    if (input.name) updateData.name = input.name;
    if (input.description) updateData.description = input.description;
    if (input.releasedAt) updateData.released_at = input.releasedAt;

    const response = await this.client.put(
      `/projects/${encodeURIComponent(input.projectId)}/releases/${encodeURIComponent(input.tagName)}`,
      updateData
    );

    return {
      tag_name: response.data.tag_name,
      name: response.data.name,
      description: response.data.description,
      released_at: response.data.released_at
    };
  }

  private async deleteRelease(input: any): Promise<any> {
    await this.client.delete(
      `/projects/${encodeURIComponent(input.projectId)}/releases/${encodeURIComponent(input.tagName)}`
    );

    return {
      tag_name: input.tagName,
      deleted: true
    };
  }

  private async listIssues(input: any): Promise<any> {
    const params: any = {
      per_page: input.perPage || 20,
      page: input.page || 1
    };

    if (input.state && input.state !== 'all') params.state = input.state;
    if (input.labels) params.labels = input.labels;
    if (input.assigneeId) params.assignee_id = input.assigneeId;

    const response = await this.client.get(
      `/projects/${encodeURIComponent(input.projectId)}/issues`,
      { params }
    );

    return {
      issues: response.data,
      total: parseInt(response.headers['x-total'] || response.data.length.toString())
    };
  }

  private async createIssueNote(input: any): Promise<any> {
    const response = await this.client.post(
      `/projects/${encodeURIComponent(input.projectId)}/issues/${input.issueIid}/notes`,
      { body: input.body }
    );

    return {
      id: response.data.id,
      body: response.data.body,
      author: response.data.author,
      created_at: response.data.created_at
    };
  }

  private async listFiles(input: any): Promise<any> {
    const params: any = {
      per_page: input.perPage || 20
    };

    if (input.path) params.path = input.path;
    if (input.ref) params.ref = input.ref;
    if (input.recursive) params.recursive = input.recursive;

    const response = await this.client.get(
      `/projects/${encodeURIComponent(input.projectId)}/repository/tree`,
      { params }
    );

    return {
      files: response.data,
      total: parseInt(response.headers['x-total'] || response.data.length.toString())
    };
  }
}
