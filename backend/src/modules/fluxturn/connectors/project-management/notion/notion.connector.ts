import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../base/base.connector';
import {
  ConnectorMetadata,
  ConnectorType,
  ConnectorCategory,
  ConnectorRequest,
  ConnectorResponse,
  AuthType,
  PaginatedRequest,
  ConnectorAction,
  ConnectorTrigger,
  BulkOperationResult
} from '../../types';
import {
  IProjectManagementConnector,
  INotionConnector,
  PMProject,
  PMTask,
  PMComment,
  PMUser,
  PMAttachment,
  PMLabel,
  PMSearchOptions,
  PMStatusTransition
} from '../project-management.interface';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

interface NotionDatabase {
  title: {
    text: {
      content: string;
    };
  }[];
  properties: Record<string, any>;
  parent: {
    type: string;
    page_id?: string;
    workspace?: boolean;
  };
}

interface NotionPage {
  parent: {
    type: string;
    database_id?: string;
    page_id?: string;
  };
  properties?: Record<string, any>;
  children?: any[];
  icon?: any;
  cover?: any;
}

interface NotionFilter {
  property: string;
  title?: { contains: string };
  select?: { equals: string };
  multi_select?: { contains: string };
  checkbox?: { equals: boolean };
  date?: any;
}

@Injectable()
export class NotionConnector extends BaseConnector implements INotionConnector {
  private readonly baseUrl = 'https://api.notion.com/v1';
  private readonly notionVersion = '2022-06-28';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Notion',
      description: 'Notion workspace and database management platform with rich content support',
      version: '1.0.0',
      category: ConnectorCategory.PROJECT_MANAGEMENT,
      type: ConnectorType.NOTION,
      logoUrl: 'https://www.notion.so/images/logo-ios.png',
      documentationUrl: 'https://developers.notion.com/reference',
      authType: AuthType.BEARER_TOKEN,
      requiredScopes: [],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 3,
        requestsPerMinute: 100,
        requestsPerHour: 1000
      },
      webhookSupport: false
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      // Test connection by listing users
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/users',
        headers: this.getAuthHeaders()
      });

      if (!response) {
        throw new Error('Failed to connect to Notion API');
      }

      this.logger.log('Notion connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Notion connection:', error);
      throw new Error(`Notion connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/users/me',
        headers: this.getAuthHeaders()
      });
      return !!response;
    } catch (error) {
      this.logger.error('Notion connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.performRequest({
        method: 'GET',
        endpoint: '/users/me',
        headers: this.getAuthHeaders()
      });
    } catch (error) {
      throw new Error(`Notion health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      const response = await this.apiUtils.executeRequest({
        ...request,
        endpoint: `${this.baseUrl}${request.endpoint}`,
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json',
          'Notion-Version': this.notionVersion,
          ...request.headers
        }
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Request failed');
      }

      return response.data;
    } catch (error) {
      this.logger.error('Notion request failed:', error);
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    this.logger.debug(`Executing action: ${actionId}`);

    switch (actionId) {
      // Database Page Operations
      case 'database_page_create':
        return this.createTask(this.mapDatabasePageInputToTask(input));
      case 'database_page_get':
        return this.getTask(input.pageId);
      case 'database_page_get_all':
        return this.getTasks({ projectId: input.databaseId, ...input });
      case 'database_page_update':
        return this.updateTask(input.pageId, this.mapDatabasePageInputToTask(input));

      // Page Operations
      case 'page_create':
        return this.createPage(input);
      case 'page_search':
        return this.searchPages(input.text || input.query);

      // Legacy action IDs (keep for backwards compatibility)
      case 'create_page':
        return this.createPage(input);
      case 'update_page':
        return this.updatePage(input.pageId, input.updates);
      case 'query_database':
        return this.queryDatabase(input.databaseId, input.query);
      case 'create_database':
        return this.createDatabase(input);
      case 'add_block':
        return this.addBlock(input.pageId, input.block);
      case 'search_pages':
        return this.searchPages(input.query);
      case 'get_users':
        return this.getUsers(input.options);
      default:
        throw new Error(`Action not found: ${actionId}`);
    }
  }

  // Helper method to map database page input to task format
  private mapDatabasePageInputToTask(input: any): PMTask {
    return {
      title: input.title || 'Untitled',
      description: input.description,
      projectId: input.databaseId,
      status: input.status,
      priority: input.priority,
      tags: input.tags || [],
      customFields: {
        ...input.propertiesUi,
        ...input.blockUi
      }
    };
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Notion connector cleanup completed');
  }

  // Project Management Interface Implementation
  async createProject(project: PMProject): Promise<ConnectorResponse<PMProject>> {
    try {
      // Create a database to represent the project
      const database: NotionDatabase = {
        title: [{
          text: {
            content: project.name
          }
        }],
        parent: {
          type: 'workspace',
          workspace: true
        },
        properties: {
          'Name': {
            title: {}
          },
          'Status': {
            select: {
              options: [
                { name: 'Not Started', color: 'gray' },
                { name: 'In Progress', color: 'yellow' },
                { name: 'Completed', color: 'green' },
                { name: 'On Hold', color: 'red' }
              ]
            }
          },
          'Priority': {
            select: {
              options: [
                { name: 'Low', color: 'gray' },
                { name: 'Medium', color: 'yellow' },
                { name: 'High', color: 'orange' },
                { name: 'Critical', color: 'red' }
              ]
            }
          },
          'Assignee': {
            people: {}
          },
          'Due Date': {
            date: {}
          },
          'Tags': {
            multi_select: {
              options: []
            }
          },
          'Description': {
            rich_text: {}
          }
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/databases',
        body: database
      });

      const mappedProject: PMProject = {
        id: result.id,
        name: project.name,
        description: project.description,
        status: project.status || 'Not Started',
        ownerId: project.ownerId,
        customFields: {
          url: result.url,
          type: 'database',
          created_time: result.created_time,
          last_edited_time: result.last_edited_time
        }
      };

      return {
        success: true,
        data: mappedProject,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create project');
    }
  }

  async updateProject(projectId: string, updates: Partial<PMProject>): Promise<ConnectorResponse<PMProject>> {
    try {
      const updateData: any = {};

      if (updates.name) {
        updateData.title = [{
          text: {
            content: updates.name
          }
        }];
      }

      // Update database properties if needed
      if (updates.description || updates.status) {
        updateData.properties = {};
        // Notion database properties are complex to update
        // This is a simplified implementation
      }

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/databases/${projectId}`,
        body: updateData
      });

      return {
        success: true,
        data: {
          id: result.id,
          name: updates.name || 'Updated Project',
          description: updates.description,
          status: updates.status,
          customFields: {
            url: result.url,
            last_edited_time: result.last_edited_time
          }
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update project');
    }
  }

  async getProject(projectId: string): Promise<ConnectorResponse<PMProject>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/databases/${projectId}`
      });

      const mappedProject: PMProject = {
        id: result.id,
        name: this.extractPlainText(result.title),
        description: this.extractPlainText(result.description),
        customFields: {
          url: result.url,
          type: 'database',
          created_time: result.created_time,
          last_edited_time: result.last_edited_time,
          properties: result.properties
        }
      };

      return {
        success: true,
        data: mappedProject,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get project');
    }
  }

  async getProjects(options?: PaginatedRequest): Promise<ConnectorResponse<PMProject[]>> {
    try {
      const queryParams: any = {
        page_size: options?.pageSize || 100
      };

      if (options?.page && options.page > 1) {
        // Notion uses cursor-based pagination
        queryParams.start_cursor = options.page.toString();
      }

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/search',
        body: {
          filter: {
            property: 'object',
            value: 'database'
          },
          ...queryParams
        }
      });

      const mappedProjects: PMProject[] = result.results.map((db: any) => ({
        id: db.id,
        name: this.extractPlainText(db.title),
        description: this.extractPlainText(db.description),
        customFields: {
          url: db.url,
          type: 'database',
          created_time: db.created_time,
          last_edited_time: db.last_edited_time
        }
      }));

      return {
        success: true,
        data: mappedProjects,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: result.has_more
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get projects');
    }
  }

  async deleteProject(projectId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      // Notion doesn't support deleting databases via API
      // We'll archive it instead
      await this.performRequest({
        method: 'PATCH',
        endpoint: `/databases/${projectId}`,
        body: {
          archived: true
        }
      });

      return {
        success: true,
        data: { deleted: true },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete project');
    }
  }

  // Task/Issue Management
  async createTask(task: PMTask): Promise<ConnectorResponse<PMTask>> {
    try {
      const page: NotionPage = {
        parent: {
          type: 'database_id',
          database_id: task.projectId
        },
        properties: {
          'Name': {
            title: [{
              text: {
                content: task.title
              }
            }]
          },
          'Status': task.status ? {
            select: {
              name: task.status
            }
          } : undefined,
          'Priority': task.priority ? {
            select: {
              name: task.priority
            }
          } : undefined,
          'Assignee': task.assigneeId ? {
            people: [{
              id: task.assigneeId
            }]
          } : undefined,
          'Due Date': task.dueDate ? {
            date: {
              start: task.dueDate.toISOString().split('T')[0]
            }
          } : undefined,
          'Tags': task.tags ? {
            multi_select: task.tags.map(tag => ({ name: tag }))
          } : undefined,
          'Description': task.description ? {
            rich_text: [{
              text: {
                content: task.description
              }
            }]
          } : undefined
        }
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/pages',
        body: page
      });

      const mappedTask: PMTask = {
        id: result.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        projectId: task.projectId,
        dueDate: task.dueDate,
        tags: task.tags,
        customFields: {
          url: result.url,
          created_time: result.created_time,
          last_edited_time: result.last_edited_time
        }
      };

      return {
        success: true,
        data: mappedTask,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create task');
    }
  }

  async updateTask(taskId: string, updates: Partial<PMTask>): Promise<ConnectorResponse<PMTask>> {
    try {
      const updateProperties: any = {};

      if (updates.title) {
        updateProperties['Name'] = {
          title: [{
            text: {
              content: updates.title
            }
          }]
        };
      }

      if (updates.status) {
        updateProperties['Status'] = {
          select: {
            name: updates.status
          }
        };
      }

      if (updates.priority) {
        updateProperties['Priority'] = {
          select: {
            name: updates.priority
          }
        };
      }

      if (updates.assigneeId) {
        updateProperties['Assignee'] = {
          people: [{
            id: updates.assigneeId
          }]
        };
      }

      if (updates.dueDate) {
        updateProperties['Due Date'] = {
          date: {
            start: updates.dueDate.toISOString().split('T')[0]
          }
        };
      }

      if (updates.tags) {
        updateProperties['Tags'] = {
          multi_select: updates.tags.map(tag => ({ name: tag }))
        };
      }

      if (updates.description) {
        updateProperties['Description'] = {
          rich_text: [{
            text: {
              content: updates.description
            }
          }]
        };
      }

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/pages/${taskId}`,
        body: {
          properties: updateProperties
        }
      });

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to update task');
    }
  }

  async getTask(taskId: string): Promise<ConnectorResponse<PMTask>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/pages/${taskId}`
      });

      const mappedTask: PMTask = {
        id: result.id,
        title: this.extractPropertyText(result.properties, 'Name'),
        description: this.extractPropertyText(result.properties, 'Description'),
        status: this.extractPropertySelect(result.properties, 'Status'),
        priority: this.extractPropertySelect(result.properties, 'Priority'),
        assigneeId: this.extractPropertyPeople(result.properties, 'Assignee')?.[0],
        projectId: result.parent?.database_id,
        dueDate: this.extractPropertyDate(result.properties, 'Due Date'),
        tags: this.extractPropertyMultiSelect(result.properties, 'Tags'),
        customFields: {
          url: result.url,
          created_time: result.created_time,
          last_edited_time: result.last_edited_time
        }
      };

      return {
        success: true,
        data: mappedTask,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get task');
    }
  }

  async getTasks(options?: PMSearchOptions): Promise<ConnectorResponse<PMTask[]>> {
    try {
      if (!options?.projectId) {
        throw new Error('Project ID is required to get tasks');
      }

      const filter: any = { and: [] };

      if (options.assigneeId) {
        filter.and.push({
          property: 'Assignee',
          people: {
            contains: options.assigneeId
          }
        });
      }

      if (options.status) {
        filter.and.push({
          property: 'Status',
          select: {
            equals: options.status
          }
        });
      }

      if (options.priority) {
        filter.and.push({
          property: 'Priority',
          select: {
            equals: options.priority
          }
        });
      }

      if (options.query) {
        filter.and.push({
          property: 'Name',
          title: {
            contains: options.query
          }
        });
      }

      const queryBody: any = {
        page_size: options?.pageSize || 100,
        filter: filter.and.length > 0 ? filter : undefined
      };

      if (options?.page && options.page > 1) {
        queryBody.start_cursor = options.page.toString();
      }

      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/databases/${options.projectId}/query`,
        body: queryBody
      });

      const mappedTasks: PMTask[] = result.results.map((page: any) => ({
        id: page.id,
        title: this.extractPropertyText(page.properties, 'Name'),
        description: this.extractPropertyText(page.properties, 'Description'),
        status: this.extractPropertySelect(page.properties, 'Status'),
        priority: this.extractPropertySelect(page.properties, 'Priority'),
        assigneeId: this.extractPropertyPeople(page.properties, 'Assignee')?.[0],
        projectId: options.projectId,
        dueDate: this.extractPropertyDate(page.properties, 'Due Date'),
        tags: this.extractPropertyMultiSelect(page.properties, 'Tags'),
        customFields: {
          url: page.url,
          created_time: page.created_time,
          last_edited_time: page.last_edited_time
        }
      }));

      return {
        success: true,
        data: mappedTasks,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo(),
          pagination: {
            page: options?.page || 1,
            pageSize: options?.pageSize || 100,
            total: 0,
            hasNext: result.has_more
          }
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get tasks');
    }
  }

  async deleteTask(taskId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'PATCH',
        endpoint: `/pages/${taskId}`,
        body: {
          archived: true
        }
      });

      return {
        success: true,
        data: { deleted: true },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete task');
    }
  }

  async assignTask(taskId: string, assigneeId: string): Promise<ConnectorResponse<PMTask>> {
    try {
      await this.performRequest({
        method: 'PATCH',
        endpoint: `/pages/${taskId}`,
        body: {
          properties: {
            'Assignee': {
              people: [{
                id: assigneeId
              }]
            }
          }
        }
      });

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to assign task');
    }
  }

  async transitionTask(taskId: string, transition: PMStatusTransition): Promise<ConnectorResponse<PMTask>> {
    try {
      await this.performRequest({
        method: 'PATCH',
        endpoint: `/pages/${taskId}`,
        body: {
          properties: {
            'Status': {
              select: {
                name: transition.to
              }
            }
          }
        }
      });

      // Add comment if provided
      if (transition.comment) {
        await this.addComment({
          content: transition.comment,
          authorId: '', // Would need to get current user
          taskId: taskId
        });
      }

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to transition task');
    }
  }

  // Comments and Collaboration (using page comments)
  async addComment(comment: PMComment): Promise<ConnectorResponse<PMComment>> {
    try {
      const commentBlock = {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: {
              content: comment.content
            }
          }]
        }
      };

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/blocks/${comment.taskId}/children`,
        body: {
          children: [commentBlock]
        }
      });

      const mappedComment: PMComment = {
        id: result.results[0]?.id,
        content: comment.content,
        authorId: comment.authorId,
        taskId: comment.taskId,
        createdAt: new Date()
      };

      return {
        success: true,
        data: mappedComment,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add comment');
    }
  }

  async updateComment(commentId: string, content: string): Promise<ConnectorResponse<PMComment>> {
    try {
      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/blocks/${commentId}`,
        body: {
          paragraph: {
            rich_text: [{
              type: 'text',
              text: {
                content: content
              }
            }]
          }
        }
      });

      const mappedComment: PMComment = {
        id: result.id,
        content: content,
        authorId: '',
        updatedAt: new Date()
      };

      return {
        success: true,
        data: mappedComment,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update comment');
    }
  }

  async getComments(taskId: string, options?: PaginatedRequest): Promise<ConnectorResponse<PMComment[]>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/blocks/${taskId}/children`,
        queryParams: {
          page_size: options?.pageSize || 100
        }
      });

      const mappedComments: PMComment[] = result.results
        .filter((block: any) => block.type === 'paragraph')
        .map((block: any) => ({
          id: block.id,
          content: this.extractPlainText(block.paragraph?.rich_text),
          taskId: taskId,
          createdAt: new Date(block.created_time),
          updatedAt: new Date(block.last_edited_time)
        }));

      return {
        success: true,
        data: mappedComments,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get comments');
    }
  }

  async deleteComment(commentId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/blocks/${commentId}`
      });

      return {
        success: true,
        data: { deleted: true },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete comment');
    }
  }

  // User Management
  async getUsers(options?: PaginatedRequest): Promise<ConnectorResponse<PMUser[]>> {
    try {
      const queryParams: any = {
        page_size: options?.pageSize || 100
      };

      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/users',
        queryParams
      });

      const mappedUsers: PMUser[] = result.results.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.person?.email || user.bot?.owner?.user?.person?.email,
        avatar: user.avatar_url,
        role: user.type
      }));

      return {
        success: true,
        data: mappedUsers,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get users');
    }
  }

  async getUser(userId: string): Promise<ConnectorResponse<PMUser>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/users/${userId}`
      });

      const mappedUser: PMUser = {
        id: result.id,
        name: result.name,
        email: result.person?.email || result.bot?.owner?.user?.person?.email,
        avatar: result.avatar_url,
        role: result.type
      };

      return {
        success: true,
        data: mappedUser,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get user');
    }
  }

  async getCurrentUser(): Promise<ConnectorResponse<PMUser>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/users/me'
      });

      const mappedUser: PMUser = {
        id: result.id,
        name: result.name,
        email: result.person?.email,
        avatar: result.avatar_url,
        role: result.type
      };

      return {
        success: true,
        data: mappedUser,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get current user');
    }
  }

  // Labels/Tags (using multi-select properties)
  async createLabel(label: PMLabel): Promise<ConnectorResponse<PMLabel>> {
    try {
      // Labels in Notion are created as multi-select options on database properties
      // This is a placeholder - actual implementation would require updating database schema
      return {
        success: true,
        data: {
          id: label.name,
          name: label.name,
          color: label.color,
          description: label.description
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create label');
    }
  }

  async getLabels(): Promise<ConnectorResponse<PMLabel[]>> {
    try {
      // This would require getting all databases and extracting multi-select options
      // Simplified implementation
      return {
        success: true,
        data: [],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get labels');
    }
  }

  async addLabelToTask(taskId: string, labelId: string): Promise<ConnectorResponse<boolean>> {
    try {
      // Get current task to preserve existing tags
      const taskResponse = await this.getTask(taskId);
      if (!taskResponse.success) {
        throw new Error('Failed to get current task');
      }

      const currentTags = taskResponse.data?.tags || [];
      const newTags = [...currentTags, labelId];

      await this.performRequest({
        method: 'PATCH',
        endpoint: `/pages/${taskId}`,
        body: {
          properties: {
            'Tags': {
              multi_select: newTags.map(tag => ({ name: tag }))
            }
          }
        }
      });

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add label to task');
    }
  }

  async removeLabelFromTask(taskId: string, labelId: string): Promise<ConnectorResponse<boolean>> {
    try {
      const taskResponse = await this.getTask(taskId);
      if (!taskResponse.success) {
        throw new Error('Failed to get current task');
      }

      const currentTags = taskResponse.data?.tags || [];
      const newTags = currentTags.filter(tag => tag !== labelId);

      await this.performRequest({
        method: 'PATCH',
        endpoint: `/pages/${taskId}`,
        body: {
          properties: {
            'Tags': {
              multi_select: newTags.map(tag => ({ name: tag }))
            }
          }
        }
      });

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to remove label from task');
    }
  }

  // Attachments (using file properties or blocks)
  async addAttachment(taskId: string, attachment: PMAttachment): Promise<ConnectorResponse<PMAttachment>> {
    try {
      // Add as a file block
      const fileBlock = {
        object: 'block',
        type: 'file',
        file: {
          type: 'external',
          external: {
            url: attachment.url
          },
          caption: [{
            type: 'text',
            text: {
              content: attachment.name
            }
          }]
        }
      };

      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/blocks/${taskId}/children`,
        body: {
          children: [fileBlock]
        }
      });

      const mappedAttachment: PMAttachment = {
        id: result.results[0]?.id,
        name: attachment.name,
        url: attachment.url,
        size: attachment.size,
        mimeType: attachment.mimeType,
        uploadedAt: new Date()
      };

      return {
        success: true,
        data: mappedAttachment,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add attachment');
    }
  }

  async getAttachments(taskId: string): Promise<ConnectorResponse<PMAttachment[]>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/blocks/${taskId}/children`
      });

      const attachments: PMAttachment[] = result.results
        .filter((block: any) => block.type === 'file')
        .map((block: any) => ({
          id: block.id,
          name: this.extractPlainText(block.file?.caption) || 'File',
          url: block.file?.external?.url || block.file?.file?.url,
          uploadedAt: new Date(block.created_time)
        }));

      return {
        success: true,
        data: attachments,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get attachments');
    }
  }

  async deleteAttachment(attachmentId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/blocks/${attachmentId}`
      });

      return {
        success: true,
        data: { deleted: true },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to delete attachment');
    }
  }

  // Search and Filtering
  async searchTasks(options: PMSearchOptions): Promise<ConnectorResponse<PMTask[]>> {
    return this.getTasks(options);
  }

  async searchProjects(query: string, options?: PaginatedRequest): Promise<ConnectorResponse<PMProject[]>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/search',
        body: {
          query: query,
          filter: {
            property: 'object',
            value: 'database'
          },
          page_size: options?.pageSize || 100
        }
      });

      const mappedProjects: PMProject[] = result.results.map((db: any) => ({
        id: db.id,
        name: this.extractPlainText(db.title),
        description: this.extractPlainText(db.description),
        customFields: {
          url: db.url,
          type: 'database',
          created_time: db.created_time,
          last_edited_time: db.last_edited_time
        }
      }));

      return {
        success: true,
        data: mappedProjects,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search projects');
    }
  }

  // Notion-specific methods
  async createPage(page: { title: string; parentId: string; content?: any[] }): Promise<ConnectorResponse<any>> {
    try {
      const notionPage: NotionPage = {
        parent: {
          type: 'page_id',
          page_id: page.parentId
        },
        properties: {
          title: {
            title: [{
              text: {
                content: page.title
              }
            }]
          }
        },
        children: page.content || []
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/pages',
        body: notionPage
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create page');
    }
  }

  async updatePage(pageId: string, updates: any): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/pages/${pageId}`,
        body: updates
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to update page');
    }
  }

  async queryDatabase(databaseId: string, query?: any): Promise<ConnectorResponse<any[]>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/databases/${databaseId}/query`,
        body: query || {}
      });

      return {
        success: true,
        data: result.results,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to query database');
    }
  }

  async createDatabase(database: { title: string; parentId: string; properties: any }): Promise<ConnectorResponse<any>> {
    try {
      const notionDatabase: NotionDatabase = {
        title: [{
          text: {
            content: database.title
          }
        }],
        parent: {
          type: 'page_id',
          page_id: database.parentId
        },
        properties: database.properties
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/databases',
        body: notionDatabase
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create database');
    }
  }

  async addBlock(pageId: string, block: any): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'PATCH',
        endpoint: `/blocks/${pageId}/children`,
        body: {
          children: [block]
        }
      });

      return {
        success: true,
        data: result.results[0],
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to add block');
    }
  }

  async searchPages(query: string): Promise<ConnectorResponse<any[]>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/search',
        body: {
          query: query,
          filter: {
            property: 'object',
            value: 'page'
          }
        }
      });

      return {
        success: true,
        data: result.results,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search pages');
    }
  }

  // Helper methods
  private extractPlainText(richText: any): string {
    if (!richText) return '';
    if (Array.isArray(richText)) {
      return richText.map(item => item.plain_text || item.text?.content || '').join('');
    }
    return richText.plain_text || richText.text?.content || '';
  }

  private extractPropertyText(properties: any, propertyName: string): string {
    const property = properties?.[propertyName];
    if (!property) return '';
    
    if (property.title) {
      return this.extractPlainText(property.title);
    }
    if (property.rich_text) {
      return this.extractPlainText(property.rich_text);
    }
    return '';
  }

  private extractPropertySelect(properties: any, propertyName: string): string | undefined {
    return properties?.[propertyName]?.select?.name;
  }

  private extractPropertyMultiSelect(properties: any, propertyName: string): string[] {
    const multiSelect = properties?.[propertyName]?.multi_select;
    return multiSelect ? multiSelect.map((item: any) => item.name) : [];
  }

  private extractPropertyPeople(properties: any, propertyName: string): string[] {
    const people = properties?.[propertyName]?.people;
    return people ? people.map((person: any) => person.id) : [];
  }

  private extractPropertyDate(properties: any, propertyName: string): Date | undefined {
    const dateProperty = properties?.[propertyName]?.date;
    return dateProperty?.start ? new Date(dateProperty.start) : undefined;
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.config.credentials.accessToken) {
      return {
        'Authorization': `Bearer ${this.config.credentials.accessToken}`
      };
    }
    return {};
  }

  private getActions(): ConnectorAction[] {
    return [
      // Database Page Operations
      {
        id: 'database_page_create',
        name: 'Create Database Page',
        description: 'Create a new page in a Notion database',
        inputSchema: {
          databaseId: { type: 'string', required: true, description: 'Database ID' },
          title: { type: 'string', required: true, description: 'Page title' },
          description: { type: 'string', description: 'Page description' },
          status: { type: 'string', description: 'Page status' },
          priority: { type: 'string', description: 'Page priority' },
          tags: { type: 'array', description: 'Page tags' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created page ID' },
          url: { type: 'string', description: 'Page URL' }
        }
      },
      {
        id: 'database_page_get',
        name: 'Get Database Page',
        description: 'Get a page from a Notion database',
        inputSchema: {
          pageId: { type: 'string', required: true, description: 'Page ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Page ID' },
          title: { type: 'string', description: 'Page title' }
        }
      },
      {
        id: 'database_page_get_all',
        name: 'Get All Database Pages',
        description: 'Get all pages from a Notion database',
        inputSchema: {
          databaseId: { type: 'string', required: true, description: 'Database ID' }
        },
        outputSchema: {
          pages: { type: 'array', description: 'List of pages' }
        }
      },
      {
        id: 'database_page_update',
        name: 'Update Database Page',
        description: 'Update a page in a Notion database',
        inputSchema: {
          pageId: { type: 'string', required: true, description: 'Page ID' },
          title: { type: 'string', description: 'Page title' },
          description: { type: 'string', description: 'Page description' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'page_create',
        name: 'Create Page',
        description: 'Create a standalone page in Notion',
        inputSchema: {
          title: { type: 'string', required: true, description: 'Page title' },
          parentId: { type: 'string', required: true, description: 'Parent page ID' },
          content: { type: 'array', description: 'Page content blocks' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created page ID' },
          url: { type: 'string', description: 'Page URL' }
        }
      },
      {
        id: 'page_search',
        name: 'Search Pages',
        description: 'Search for pages in Notion',
        inputSchema: {
          query: { type: 'string', required: true, description: 'Search query' }
        },
        outputSchema: {
          results: { type: 'array', description: 'Search results' }
        }
      },
      {
        id: 'create_page',
        name: 'Create Page',
        description: 'Create a new page in Notion',
        inputSchema: {
          title: { type: 'string', required: true, description: 'Page title' },
          parentId: { type: 'string', required: true, description: 'Parent page or database ID' },
          content: { type: 'array', description: 'Page content blocks' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created page ID' },
          url: { type: 'string', description: 'Page URL' }
        }
      },
      {
        id: 'update_page',
        name: 'Update Page',
        description: 'Update an existing page in Notion',
        inputSchema: {
          pageId: { type: 'string', required: true, description: 'Page ID' },
          updates: { type: 'object', required: true, description: 'Updates to apply' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether update was successful' }
        }
      },
      {
        id: 'query_database',
        name: 'Query Database',
        description: 'Query a Notion database',
        inputSchema: {
          databaseId: { type: 'string', required: true, description: 'Database ID' },
          query: { type: 'object', description: 'Query parameters' }
        },
        outputSchema: {
          results: { type: 'array', description: 'Query results' }
        }
      },
      {
        id: 'create_database',
        name: 'Create Database',
        description: 'Create a new database in Notion',
        inputSchema: {
          title: { type: 'string', required: true, description: 'Database title' },
          parentId: { type: 'string', required: true, description: 'Parent page ID' },
          properties: { type: 'object', required: true, description: 'Database properties schema' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created database ID' }
        }
      },
      {
        id: 'add_block',
        name: 'Add Block',
        description: 'Add a block to a page',
        inputSchema: {
          pageId: { type: 'string', required: true, description: 'Page ID' },
          block: { type: 'object', required: true, description: 'Block content' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Block ID' }
        }
      },
      {
        id: 'search_pages',
        name: 'Search Pages',
        description: 'Search for pages in Notion',
        inputSchema: {
          query: { type: 'string', required: true, description: 'Search query' }
        },
        outputSchema: {
          results: { type: 'array', description: 'Search results' }
        }
      },
      {
        id: 'get_users',
        name: 'Get Users',
        description: 'Get workspace users',
        inputSchema: {
          options: { type: 'object', description: 'Pagination options' }
        },
        outputSchema: {
          users: { type: 'array', description: 'List of users' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'page_created',
        name: 'Page Created',
        description: 'Triggered when a new page is created',
        eventType: 'notion:page_created',
        outputSchema: {
          page: { type: 'object', description: 'Created page information' }
        },
        webhookRequired: false
      },
      {
        id: 'page_updated',
        name: 'Page Updated',
        description: 'Triggered when a page is updated',
        eventType: 'notion:page_updated',
        outputSchema: {
          page: { type: 'object', description: 'Updated page information' }
        },
        webhookRequired: false
      },
      {
        id: 'database_updated',
        name: 'Database Updated',
        description: 'Triggered when a database is updated',
        eventType: 'notion:database_updated',
        outputSchema: {
          database: { type: 'object', description: 'Updated database information' }
        },
        webhookRequired: false
      }
    ];
  }
}