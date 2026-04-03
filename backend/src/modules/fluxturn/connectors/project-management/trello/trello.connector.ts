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
  ITrelloConnector,
  PMProject,
  PMTask,
  PMComment,
  PMUser,
  PMAttachment,
  PMLabel,
  PMBoard,
  PMList,
  PMSearchOptions,
  PMStatusTransition
} from '../project-management.interface';
import { AuthUtils } from '../../utils/auth.utils';
import { ApiUtils } from '../../utils/api.utils';

interface TrelloBoard {
  name: string;
  desc?: string;
  defaultLists?: boolean;
  defaultLabels?: boolean;
  prefs_permissionLevel?: 'private' | 'org' | 'public';
  prefs_voting?: 'disabled' | 'members' | 'observers' | 'org' | 'public';
  prefs_comments?: 'disabled' | 'members' | 'observers' | 'org' | 'public';
  prefs_invitations?: 'members' | 'admins';
  prefs_selfJoin?: boolean;
  prefs_cardCovers?: boolean;
  prefs_background?: string;
  prefs_cardAging?: 'regular' | 'pirate';
}

interface TrelloList {
  name: string;
  idBoard?: string;
  pos?: 'top' | 'bottom' | number;
  subscribed?: boolean;
}

interface TrelloCard {
  name: string;
  desc?: string;
  pos?: 'top' | 'bottom' | number;
  due?: string;
  dueComplete?: boolean;
  idList?: string;
  idMembers?: string[];
  idLabels?: string[];
  urlSource?: string;
  fileSource?: any;
  idCardSource?: string;
  keepFromSource?: string;
  address?: string;
  locationName?: string;
  coordinates?: string;
}

interface TrelloChecklist {
  name: string;
  idCard?: string;
  pos?: 'top' | 'bottom' | number;
  idChecklistSource?: string;
}

@Injectable()
export class TrelloConnector extends BaseConnector implements ITrelloConnector {
  private readonly baseUrl = 'https://api.trello.com/1';

  constructor(
    private readonly authUtils: AuthUtils,
    private readonly apiUtils: ApiUtils
  ) {
    super();
  }

  getMetadata(): ConnectorMetadata {
    return {
      name: 'Trello',
      description: 'Trello kanban-style project management with boards, lists, and cards',
      version: '1.0.0',
      category: ConnectorCategory.PROJECT_MANAGEMENT,
      type: ConnectorType.TRELLO,
      logoUrl: 'https://trello.com/favicon.ico',
      documentationUrl: 'https://developer.atlassian.com/cloud/trello/rest/',
      authType: AuthType.API_KEY,
      requiredScopes: [],
      actions: this.getActions(),
      triggers: this.getTriggers(),
      rateLimit: {
        requestsPerSecond: 10,
        requestsPerMinute: 300
      },
      webhookSupport: true
    };
  }

  protected async initializeConnection(): Promise<void> {
    try {
      // Test connection by getting current user
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/members/me',
        queryParams: this.getAuthParams()
      });

      if (!response) {
        throw new Error('Failed to connect to Trello API');
      }

      this.logger.log('Trello connector initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Trello connection:', error);
      throw new Error(`Trello connection failed: ${error.message}`);
    }
  }

  protected async performConnectionTest(): Promise<boolean> {
    try {
      const response = await this.performRequest({
        method: 'GET',
        endpoint: '/members/me',
        queryParams: this.getAuthParams()
      });
      return !!response;
    } catch (error) {
      this.logger.error('Trello connection test failed:', error);
      return false;
    }
  }

  protected async performHealthCheck(): Promise<void> {
    try {
      await this.performRequest({
        method: 'GET',
        endpoint: '/members/me',
        queryParams: this.getAuthParams()
      });
    } catch (error) {
      throw new Error(`Trello health check failed: ${error.message}`);
    }
  }

  protected async performRequest(request: ConnectorRequest): Promise<any> {
    try {
      // Add auth params to query parameters
      const authParams = this.getAuthParams();
      const queryParams = { ...request.queryParams, ...authParams };

      this.logger.log('=== Trello API Request ===');
      this.logger.log('Method:', request.method);
      this.logger.log('Endpoint:', `${this.baseUrl}${request.endpoint}`);
      this.logger.log('Query params (without auth):', JSON.stringify(request.queryParams, null, 2));

      const response = await this.apiUtils.executeRequest({
        ...request,
        endpoint: `${this.baseUrl}${request.endpoint}`,
        queryParams,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers
        }
      });

      this.logger.log('API Response success:', response.success);
      if (!response.success) {
        this.logger.error('API Response error:', JSON.stringify(response.error, null, 2));
        this.logger.error('API Response data:', JSON.stringify(response.data, null, 2));
        throw new Error(response.error?.message || 'Request failed');
      }

      return response.data;
    } catch (error: any) {
      this.logger.error('Trello request failed:', error.message);
      this.logger.error('Error details:', JSON.stringify(error.response?.data || error, null, 2));
      throw error;
    }
  }

  protected async performAction(actionId: string, input: any): Promise<any> {
    this.logger.log(`Performing action: ${actionId} with input:`, JSON.stringify(input));

    switch (actionId) {
      case 'create_card':
        return this.executeCreateCard(input);
      case 'update_card':
        return this.executeUpdateCard(input);
      case 'get_card':
        return this.executeGetCard(input);
      case 'get_cards':
        return this.executeGetCards(input);
      case 'delete_card':
        return this.executeDeleteCard(input);
      case 'archive_card':
        return this.executeArchiveCard(input);
      case 'move_card':
        return this.executeMoveCard(input);
      case 'create_board':
        return this.createBoard(input);
      case 'create_list':
        return this.createList(input);
      case 'get_lists':
        return this.executeGetLists(input);
      case 'add_comment':
        return this.executeAddComment(input);
      case 'add_member':
        return this.addMemberToCard(input.cardId, input.memberId);
      case 'create_checklist':
        return this.createChecklist(input.cardId, input);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  // ============================================
  // Direct API Action Handlers (matching database schema)
  // ============================================

  /**
   * Create a card - matches database schema exactly
   * Input fields: name, idList, desc, pos, due, dueComplete, idMembers, idLabels, urlSource, idCardSource
   */
  private async executeCreateCard(input: any): Promise<any> {
    this.logger.log('=== executeCreateCard DEBUG ===');
    this.logger.log('Input received:', JSON.stringify(input, null, 2));

    // Trello API expects these as query params for POST /cards
    const queryParams: any = {
      name: input.name,
      idList: input.idList
    };

    // Optional fields
    if (input.desc) queryParams.desc = input.desc;
    if (input.pos) queryParams.pos = input.pos;
    if (input.due) queryParams.due = input.due;
    if (input.dueComplete !== undefined) queryParams.dueComplete = input.dueComplete;
    if (input.idMembers) queryParams.idMembers = input.idMembers;
    if (input.idLabels) queryParams.idLabels = input.idLabels;
    if (input.urlSource) queryParams.urlSource = input.urlSource;
    if (input.idCardSource) queryParams.idCardSource = input.idCardSource;

    this.logger.log('Query params to send:', JSON.stringify(queryParams, null, 2));

    const result = await this.performRequest({
      method: 'POST',
      endpoint: '/cards',
      queryParams
    });

    this.logger.log('Trello API response:', JSON.stringify(result, null, 2));

    return {
      id: result.id,
      name: result.name,
      desc: result.desc,
      url: result.url,
      shortUrl: result.shortUrl,
      idList: result.idList,
      idBoard: result.idBoard,
      due: result.due,
      dueComplete: result.dueComplete
    };
  }

  /**
   * Update a card - matches database schema exactly
   */
  private async executeUpdateCard(input: any): Promise<any> {
    const { cardId, ...updates } = input;

    const result = await this.performRequest({
      method: 'PUT',
      endpoint: `/cards/${cardId}`,
      body: updates
    });

    return {
      id: result.id,
      name: result.name,
      desc: result.desc,
      closed: result.closed,
      url: result.url
    };
  }

  /**
   * Get a card - matches database schema exactly
   */
  private async executeGetCard(input: any): Promise<any> {
    const queryParams: any = {};

    if (input.fields) queryParams.fields = input.fields;
    if (input.members) queryParams.members = input.members;
    if (input.labels) queryParams.labels = input.labels;
    if (input.checklists) queryParams.checklists = input.checklists;
    if (input.attachments) queryParams.attachments = input.attachments;

    const result = await this.performRequest({
      method: 'GET',
      endpoint: `/cards/${input.cardId}`,
      queryParams
    });

    return result;
  }

  /**
   * Get cards from board or list - matches database schema exactly
   */
  private async executeGetCards(input: any): Promise<any> {
    const queryParams: any = {};

    if (input.filter) queryParams.filter = input.filter;
    if (input.fields) queryParams.fields = input.fields;
    if (input.limit) queryParams.limit = input.limit;

    let endpoint: string;
    if (input.listId) {
      endpoint = `/lists/${input.listId}/cards`;
    } else if (input.boardId) {
      endpoint = `/boards/${input.boardId}/cards`;
    } else {
      throw new Error('Either boardId or listId is required');
    }

    const result = await this.performRequest({
      method: 'GET',
      endpoint,
      queryParams
    });

    return Array.isArray(result) ? result : [result];
  }

  /**
   * Delete a card - matches database schema exactly
   */
  private async executeDeleteCard(input: any): Promise<any> {
    await this.performRequest({
      method: 'DELETE',
      endpoint: `/cards/${input.cardId}`
    });

    return { deleted: true };
  }

  /**
   * Archive a card - matches database schema exactly
   */
  private async executeArchiveCard(input: any): Promise<any> {
    const result = await this.performRequest({
      method: 'PUT',
      endpoint: `/cards/${input.cardId}`,
      body: { closed: input.closed !== false }
    });

    return {
      id: result.id,
      closed: result.closed
    };
  }

  /**
   * Move a card - matches database schema exactly
   */
  private async executeMoveCard(input: any): Promise<any> {
    const body: any = {};

    if (input.idList) body.idList = input.idList;
    if (input.idBoard) body.idBoard = input.idBoard;
    if (input.pos) body.pos = input.pos;

    const result = await this.performRequest({
      method: 'PUT',
      endpoint: `/cards/${input.cardId}`,
      body
    });

    return {
      id: result.id,
      idList: result.idList,
      idBoard: result.idBoard,
      pos: result.pos
    };
  }

  /**
   * Get lists from a board - matches database schema exactly
   */
  private async executeGetLists(input: any): Promise<any> {
    const queryParams: any = {};

    if (input.filter) queryParams.filter = input.filter;
    if (input.fields) queryParams.fields = input.fields;

    const result = await this.performRequest({
      method: 'GET',
      endpoint: `/boards/${input.boardId}/lists`,
      queryParams
    });

    return Array.isArray(result) ? result : [result];
  }

  /**
   * Add comment to a card - matches database schema exactly
   */
  private async executeAddComment(input: any): Promise<any> {
    const result = await this.performRequest({
      method: 'POST',
      endpoint: `/cards/${input.cardId}/actions/comments`,
      body: { text: input.text }
    });

    return {
      id: result.id,
      text: input.text,
      date: result.date
    };
  }

  protected async cleanup(): Promise<void> {
    this.logger.log('Trello connector cleanup completed');
  }

  // Project Management Interface Implementation (mapping boards to projects)
  async createProject(project: PMProject): Promise<ConnectorResponse<PMProject>> {
    try {
      // Create board directly with Trello API to get full response
      const trelloBoard = {
        name: project.name,
        desc: project.description,
        defaultLists: true,
        prefs_permissionLevel: 'private',
        prefs_voting: 'disabled',
        prefs_comments: 'members',
        prefs_invitations: 'members',
        prefs_selfJoin: true,
        prefs_cardCovers: true
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/boards',
        body: trelloBoard
      });

      const mappedProject: PMProject = {
        id: result.id,
        name: result.name,
        description: result.desc,
        status: result.closed ? 'Closed' : 'Active',
        customFields: {
          url: result.url,
          shortUrl: result.shortUrl,
          closed: result.closed,
          dateLastActivity: result.dateLastActivity
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
      
      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.desc = updates.description;
      if (updates.status) updateData.closed = updates.status === 'Closed';

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/boards/${projectId}`,
        body: updateData
      });

      const mappedProject: PMProject = {
        id: result.id,
        name: result.name,
        description: result.desc,
        status: result.closed ? 'Closed' : 'Active',
        customFields: {
          url: result.url,
          shortUrl: result.shortUrl,
          closed: result.closed,
          dateLastActivity: result.dateLastActivity
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
      return this.handleError(error as any, 'Failed to update project');
    }
  }

  async getProject(projectId: string): Promise<ConnectorResponse<PMProject>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/boards/${projectId}`,
        queryParams: {
          fields: 'name,desc,url,shortUrl,closed,dateLastActivity'
        }
      });

      const mappedProject: PMProject = {
        id: result.id,
        name: result.name,
        description: result.desc,
        status: result.closed ? 'Closed' : 'Active',
        customFields: {
          url: result.url,
          shortUrl: result.shortUrl,
          closed: result.closed,
          dateLastActivity: result.dateLastActivity
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
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/members/me/boards',
        queryParams: {
          fields: 'name,desc,url,shortUrl,closed,dateLastActivity',
          filter: 'open'
        }
      });

      const mappedProjects: PMProject[] = result.map((board: any) => ({
        id: board.id,
        name: board.name,
        description: board.desc,
        status: board.closed ? 'Closed' : 'Active',
        customFields: {
          url: board.url,
          shortUrl: board.shortUrl,
          closed: board.closed,
          dateLastActivity: board.dateLastActivity
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
      return this.handleError(error as any, 'Failed to get projects');
    }
  }

  async deleteProject(projectId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/boards/${projectId}`
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

  // Task/Issue Management (mapping cards to tasks)
  async createTask(task: PMTask & { name?: string; listId?: string; idList?: string }): Promise<ConnectorResponse<PMTask>> {
    try {
      // Support both n8n-style (name, listId) and PMTask-style (title, projectId) field names
      const cardName = task.name || task.title;
      const boardId = task.projectId;

      if (!cardName) {
        throw new Error('Card name is required (provide "name" or "title")');
      }

      // Get list ID from various possible sources
      let listId = task.listId || task.idList || task.customFields?.listId;

      // If no listId provided, try to get the first list from the board
      if (!listId && boardId) {
        const lists = await this.getLists(boardId);
        if (lists.success && lists.data?.length) {
          listId = lists.data[0].id;
        }
      }

      if (!listId) {
        throw new Error('List ID is required (provide "listId" or "idList")');
      }

      // Support n8n-style fields (due, idMembers, idLabels, pos)
      const extendedTask = task as any;

      const trelloCard: TrelloCard = {
        name: cardName,
        desc: extendedTask.description || extendedTask.desc,
        idList: listId,
        due: extendedTask.due || (task.dueDate ? task.dueDate.toISOString() : undefined),
        idMembers: extendedTask.idMembers ?
          (typeof extendedTask.idMembers === 'string' ? extendedTask.idMembers.split(',').map((s: string) => s.trim()) : extendedTask.idMembers) :
          (task.assigneeId ? [task.assigneeId] : undefined),
        idLabels: extendedTask.idLabels ?
          (typeof extendedTask.idLabels === 'string' ? extendedTask.idLabels.split(',').map((s: string) => s.trim()) : extendedTask.idLabels) :
          (task.tags || undefined),
        pos: extendedTask.pos || 'bottom'
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/cards',
        body: trelloCard
      });

      const mappedTask: PMTask = {
        id: result.id,
        title: result.name,
        description: result.desc,
        status: this.mapListToStatus(result.list?.name),
        assigneeId: result.members?.[0]?.id,
        projectId: task.projectId,
        dueDate: result.due ? new Date(result.due) : undefined,
        tags: result.labels?.map((label: any) => label.name) || [],
        customFields: {
          url: result.url,
          shortUrl: result.shortUrl,
          listId: result.idList,
          listName: result.list?.name,
          dateLastActivity: result.dateLastActivity,
          closed: result.closed
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
      const updateData: any = {};
      
      if (updates.title) updateData.name = updates.title;
      if (updates.description) updateData.desc = updates.description;
      if (updates.dueDate) updateData.due = updates.dueDate.toISOString();
      if (updates.assigneeId) updateData.idMembers = [updates.assigneeId];

      const result = await this.performRequest({
        method: 'PUT',
        endpoint: `/cards/${taskId}`,
        body: updateData
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
        endpoint: `/cards/${taskId}`,
        queryParams: {
          fields: 'name,desc,due,url,shortUrl,idList,idBoard,dateLastActivity,closed',
          members: 'true',
          member_fields: 'id,fullName',
          labels: 'true',
          list: 'true'
        }
      });

      const mappedTask: PMTask = {
        id: result.id,
        title: result.name,
        description: result.desc,
        status: this.mapListToStatus(result.list?.name),
        assigneeId: result.members?.[0]?.id,
        projectId: result.idBoard,
        dueDate: result.due ? new Date(result.due) : undefined,
        tags: result.labels?.map((label: any) => label.name) || [],
        customFields: {
          url: result.url,
          shortUrl: result.shortUrl,
          listId: result.idList,
          listName: result.list?.name,
          dateLastActivity: result.dateLastActivity,
          closed: result.closed
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
        throw new Error('Project ID (board ID) is required');
      }

      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/boards/${options.projectId}/cards`,
        queryParams: {
          fields: 'name,desc,due,url,shortUrl,idList,idBoard,dateLastActivity,closed',
          members: 'true',
          member_fields: 'id,fullName',
          labels: 'true',
          list: 'true'
        }
      });

      let tasks = result;

      // Filter by assignee
      if (options.assigneeId) {
        tasks = tasks.filter((card: any) => 
          card.members?.some((member: any) => member.id === options.assigneeId)
        );
      }

      // Filter by status (list)
      if (options.status) {
        tasks = tasks.filter((card: any) => 
          this.mapListToStatus(card.list?.name) === options.status
        );
      }

      // Filter by search query
      if (options.query) {
        tasks = tasks.filter((card: any) => 
          card.name.toLowerCase().includes(options.query!.toLowerCase()) ||
          (card.desc && card.desc.toLowerCase().includes(options.query!.toLowerCase()))
        );
      }

      const mappedTasks: PMTask[] = tasks.map((card: any) => ({
        id: card.id,
        title: card.name,
        description: card.desc,
        status: this.mapListToStatus(card.list?.name),
        assigneeId: card.members?.[0]?.id,
        projectId: options.projectId,
        dueDate: card.due ? new Date(card.due) : undefined,
        tags: card.labels?.map((label: any) => label.name) || [],
        customFields: {
          url: card.url,
          shortUrl: card.shortUrl,
          listId: card.idList,
          listName: card.list?.name,
          dateLastActivity: card.dateLastActivity,
          closed: card.closed
        }
      }));

      return {
        success: true,
        data: mappedTasks,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get tasks');
    }
  }

  async deleteTask(taskId: string): Promise<ConnectorResponse<{ deleted: boolean }>> {
    try {
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/cards/${taskId}`
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
        method: 'POST',
        endpoint: `/cards/${taskId}/members`,
        body: { value: assigneeId }
      });

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to assign task');
    }
  }

  async transitionTask(taskId: string, transition: PMStatusTransition): Promise<ConnectorResponse<PMTask>> {
    try {
      // Get board lists to find the target list
      const task = await this.getTask(taskId);
      if (!task.success) {
        throw new Error('Failed to get task');
      }

      const lists = await this.getLists(task.data!.projectId!);
      if (!lists.success) {
        throw new Error('Failed to get board lists');
      }

      const targetList = lists.data?.find(list => 
        this.mapListToStatus(list.name) === transition.to ||
        list.name.toLowerCase() === transition.to.toLowerCase()
      );

      if (!targetList) {
        throw new Error(`List for status "${transition.to}" not found`);
      }

      await this.moveCard(taskId, targetList.id!, 'bottom');

      // Add comment if provided
      if (transition.comment) {
        await this.addComment({
          content: transition.comment,
          authorId: '', // Will be set to current user
          taskId: taskId
        });
      }

      return this.getTask(taskId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to transition task');
    }
  }

  // Comments and Collaboration
  async addComment(comment: PMComment): Promise<ConnectorResponse<PMComment>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/cards/${comment.taskId}/actions/comments`,
        body: { text: comment.content }
      });

      const mappedComment: PMComment = {
        id: result.id,
        content: comment.content,
        authorId: result.memberCreator?.id,
        taskId: comment.taskId,
        createdAt: new Date(result.date)
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
        method: 'PUT',
        endpoint: `/actions/${commentId}`,
        body: { text: content }
      });

      const mappedComment: PMComment = {
        id: result.id,
        content: content,
        authorId: result.memberCreator?.id,
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
        endpoint: `/cards/${taskId}/actions`,
        queryParams: {
          filter: 'commentCard',
          fields: 'data,date,memberCreator',
          member_fields: 'id,fullName',
          limit: options?.pageSize || 1000
        }
      });

      const mappedComments: PMComment[] = result.map((action: any) => ({
        id: action.id,
        content: action.data.text,
        authorId: action.memberCreator?.id,
        taskId: taskId,
        createdAt: new Date(action.date)
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
        endpoint: `/actions/${commentId}`
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
      // Get members from current user's organizations
      const organizations = await this.performRequest({
        method: 'GET',
        endpoint: '/members/me/organizations',
        queryParams: {
          fields: 'id'
        }
      });

      const allMembers: any[] = [];
      
      for (const org of organizations) {
        const members = await this.performRequest({
          method: 'GET',
          endpoint: `/organizations/${org.id}/members`,
          queryParams: {
            fields: 'id,fullName,username,email,avatarUrl'
          }
        });
        allMembers.push(...members);
      }

      // Remove duplicates
      const uniqueMembers = allMembers.filter((member, index, self) =>
        index === self.findIndex(m => m.id === member.id)
      );

      const mappedUsers: PMUser[] = uniqueMembers.map((member: any) => ({
        id: member.id,
        name: member.fullName,
        email: member.email,
        avatar: member.avatarUrl
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
        endpoint: `/members/${userId}`,
        queryParams: {
          fields: 'id,fullName,username,email,avatarUrl'
        }
      });

      const mappedUser: PMUser = {
        id: result.id,
        name: result.fullName,
        email: result.email,
        avatar: result.avatarUrl
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
        endpoint: '/members/me',
        queryParams: {
          fields: 'id,fullName,username,email,avatarUrl'
        }
      });

      const mappedUser: PMUser = {
        id: result.id,
        name: result.fullName,
        email: result.email,
        avatar: result.avatarUrl
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

  // Labels/Tags
  async createLabel(label: PMLabel): Promise<ConnectorResponse<PMLabel>> {
    try {
      // Trello labels are board-specific, need board ID
      throw new Error('Board ID required to create label. Use board-specific label creation.');
    } catch (error) {
      return this.handleError(error as any, 'Failed to create label');
    }
  }

  async getLabels(): Promise<ConnectorResponse<PMLabel[]>> {
    try {
      // Get labels from all boards
      const boards = await this.getProjects();
      if (!boards.success) {
        throw new Error('Failed to get boards');
      }

      const allLabels: PMLabel[] = [];
      
      for (const board of boards.data!) {
        const boardLabels = await this.performRequest({
          method: 'GET',
          endpoint: `/boards/${board.id}/labels`,
          queryParams: {
            fields: 'id,name,color'
          }
        });

        const mappedLabels: PMLabel[] = boardLabels.map((label: any) => ({
          id: label.id,
          name: label.name,
          color: label.color
        }));

        allLabels.push(...mappedLabels);
      }

      return {
        success: true,
        data: allLabels,
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
      await this.performRequest({
        method: 'POST',
        endpoint: `/cards/${taskId}/idLabels`,
        body: { value: labelId }
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
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/cards/${taskId}/idLabels/${labelId}`
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

  // Attachments
  async addAttachment(taskId: string, attachment: PMAttachment): Promise<ConnectorResponse<PMAttachment>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/cards/${taskId}/attachments`,
        body: {
          name: attachment.name,
          url: attachment.url
        }
      });

      const mappedAttachment: PMAttachment = {
        id: result.id,
        name: result.name,
        url: result.url,
        size: result.bytes,
        mimeType: result.mimeType,
        uploadedAt: new Date(result.date)
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
        endpoint: `/cards/${taskId}/attachments`,
        queryParams: {
          fields: 'id,name,url,bytes,mimeType,date'
        }
      });

      const mappedAttachments: PMAttachment[] = result.map((attachment: any) => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        size: attachment.bytes,
        mimeType: attachment.mimeType,
        uploadedAt: new Date(attachment.date)
      }));

      return {
        success: true,
        data: mappedAttachments,
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
      // Trello requires card ID and attachment ID for deletion
      // This is a simplified implementation
      await this.performRequest({
        method: 'DELETE',
        endpoint: `/cards/attachments/${attachmentId}`
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
      const projects = await this.getProjects(options);
      if (!projects.success) {
        throw new Error('Failed to get projects');
      }

      const filteredProjects = projects.data!.filter(project =>
        project.name.toLowerCase().includes(query.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(query.toLowerCase()))
      );

      return {
        success: true,
        data: filteredProjects,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to search projects');
    }
  }

  // Trello-specific methods
  async createBoard(board: { name: string; desc?: string; defaultLists?: boolean }): Promise<ConnectorResponse<PMBoard>> {
    try {
      const trelloBoard: TrelloBoard = {
        name: board.name,
        desc: board.desc,
        defaultLists: board.defaultLists !== false,
        prefs_permissionLevel: 'private',
        prefs_voting: 'disabled',
        prefs_comments: 'members',
        prefs_invitations: 'members',
        prefs_selfJoin: true,
        prefs_cardCovers: true
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/boards',
        body: trelloBoard
      });

      const mappedBoard: any = {
        id: result.id,
        name: result.name,
        description: result.desc,
        type: 'kanban',
        url: result.url,
        shortUrl: result.shortUrl
      };

      return {
        success: true,
        data: mappedBoard,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create board');
    }
  }

  async getBoard(boardId: string): Promise<ConnectorResponse<PMBoard>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/boards/${boardId}`,
        queryParams: {
          fields: 'name,desc,url,shortUrl,closed,dateLastActivity',
          lists: 'open',
          list_fields: 'id,name,pos'
        }
      });

      const mappedLists: PMList[] = result.lists?.map((list: any) => ({
        id: list.id,
        name: list.name,
        position: list.pos,
        boardId: boardId
      })) || [];

      const mappedBoard: PMBoard = {
        id: result.id,
        name: result.name,
        description: result.desc,
        type: 'kanban',
        lists: mappedLists
      };

      return {
        success: true,
        data: mappedBoard,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get board');
    }
  }

  async getBoards(): Promise<ConnectorResponse<PMBoard[]>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: '/members/me/boards',
        queryParams: {
          fields: 'name,desc,url,shortUrl,closed,dateLastActivity',
          filter: 'open'
        }
      });

      const mappedBoards: PMBoard[] = result.map((board: any) => ({
        id: board.id,
        name: board.name,
        description: board.desc,
        type: 'kanban'
      }));

      return {
        success: true,
        data: mappedBoards,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get boards');
    }
  }

  async createList(list: { name: string; boardId?: string; idBoard?: string; pos?: string }): Promise<ConnectorResponse<PMList>> {
    try {
      const boardId = list.boardId || list.idBoard;
      if (!boardId) {
        throw new Error('Board ID is required');
      }

      const trelloList: TrelloList = {
        name: list.name,
        idBoard: boardId,
        pos: (list.pos === 'top' || list.pos === 'bottom') ? list.pos : (parseInt(list.pos || '0') || 'bottom')
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/lists',
        body: trelloList
      });

      const mappedList: PMList = {
        id: result.id,
        name: result.name,
        position: result.pos,
        boardId: boardId
      };

      return {
        success: true,
        data: mappedList,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create list');
    }
  }

  async getLists(boardId: string): Promise<ConnectorResponse<PMList[]>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/boards/${boardId}/lists`,
        queryParams: {
          fields: 'id,name,pos',
          filter: 'open'
        }
      });

      const mappedLists: PMList[] = result.map((list: any) => ({
        id: list.id,
        name: list.name,
        position: list.pos,
        boardId: boardId
      }));

      return {
        success: true,
        data: mappedLists,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get lists');
    }
  }

  async moveCard(cardId: string, listId: string, position?: string): Promise<ConnectorResponse<PMTask>> {
    try {
      await this.performRequest({
        method: 'PUT',
        endpoint: `/cards/${cardId}`,
        body: {
          idList: listId,
          pos: position || 'bottom'
        }
      });

      return this.getTask(cardId);
    } catch (error) {
      return this.handleError(error as any, 'Failed to move card');
    }
  }

  async addMemberToBoard(boardId: string, memberId: string): Promise<ConnectorResponse<boolean>> {
    try {
      await this.performRequest({
        method: 'PUT',
        endpoint: `/boards/${boardId}/members/${memberId}`,
        body: { type: 'normal' }
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
      return this.handleError(error as any, 'Failed to add member to board');
    }
  }

  async addMemberToCard(cardId: string, memberId: string): Promise<ConnectorResponse<any>> {
    try {
      const result = await this.performRequest({
        method: 'POST',
        endpoint: `/cards/${cardId}/members`,
        body: { value: memberId }
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
      return this.handleError(error as any, 'Failed to add member to card');
    }
  }

  async createChecklist(cardId: string, checklist: { name: string; items?: string[] }): Promise<ConnectorResponse<any>> {
    try {
      const trelloChecklist: TrelloChecklist = {
        name: checklist.name,
        idCard: cardId,
        pos: 'bottom'
      };

      const result = await this.performRequest({
        method: 'POST',
        endpoint: '/checklists',
        body: trelloChecklist
      });

      // Add items to checklist if provided
      if (checklist.items && checklist.items.length > 0) {
        for (const item of checklist.items) {
          await this.performRequest({
            method: 'POST',
            endpoint: `/checklists/${result.id}/checkItems`,
            body: { name: item, pos: 'bottom' }
          });
        }
      }

      return {
        success: true,
        data: {
          id: result.id,
          name: result.name,
          cardId: cardId,
          items: checklist.items || []
        },
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to create checklist');
    }
  }

  async getChecklists(cardId: string): Promise<ConnectorResponse<any[]>> {
    try {
      const result = await this.performRequest({
        method: 'GET',
        endpoint: `/cards/${cardId}/checklists`,
        queryParams: {
          fields: 'id,name,pos',
          checkItems: 'all',
          checkItem_fields: 'name,state,pos'
        }
      });

      const mappedChecklists = result.map((checklist: any) => ({
        id: checklist.id,
        name: checklist.name,
        cardId: cardId,
        items: checklist.checkItems?.map((item: any) => ({
          id: item.id,
          name: item.name,
          state: item.state,
          position: item.pos
        })) || []
      }));

      return {
        success: true,
        data: mappedChecklists,
        metadata: {
          timestamp: new Date(),
          rateLimit: await this.getRateLimitInfo()
        }
      };
    } catch (error) {
      return this.handleError(error as any, 'Failed to get checklists');
    }
  }

  // Helper methods
  private mapListToStatus(listName?: string): string {
    if (!listName) return 'To Do';
    
    const name = listName.toLowerCase();
    if (name.includes('done') || name.includes('complete')) return 'Done';
    if (name.includes('doing') || name.includes('progress') || name.includes('active')) return 'In Progress';
    if (name.includes('review') || name.includes('testing')) return 'Review';
    return 'To Do';
  }

  private getAuthParams(): Record<string, string> {
    return {
      key: this.config.credentials.apiKey || '',
      token: this.config.credentials.accessToken || ''
    };
  }

  private getActions(): ConnectorAction[] {
    return [
      {
        id: 'create_card',
        name: 'Create Card',
        description: 'Create a new card in Trello',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Card name' },
          idList: { type: 'string', required: true, description: 'List ID to create the card in' },
          desc: { type: 'string', description: 'Card description' },
          due: { type: 'string', description: 'Due date (ISO format)' },
          idMembers: { type: 'string', description: 'Comma-separated member IDs to assign' },
          idLabels: { type: 'string', description: 'Comma-separated label IDs' },
          pos: { type: 'string', description: 'Position: top, bottom, or a number' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created card ID' },
          name: { type: 'string', description: 'Card name' },
          url: { type: 'string', description: 'Card URL' },
          shortUrl: { type: 'string', description: 'Short URL' }
        }
      },
      {
        id: 'move_card',
        name: 'Move Card',
        description: 'Move a card to a different list',
        inputSchema: {
          cardId: { type: 'string', required: true, description: 'Card ID' },
          idList: { type: 'string', required: true, description: 'Target list ID' },
          idBoard: { type: 'string', description: 'Target board ID' },
          pos: { type: 'string', description: 'Position in list (top, bottom, or number)' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Card ID' }
        }
      },
      {
        id: 'create_board',
        name: 'Create Board',
        description: 'Create a new board in Trello',
        inputSchema: {
          name: { type: 'string', required: true, description: 'Board name' },
          description: { type: 'string', description: 'Board description' },
          defaultLists: { type: 'boolean', description: 'Create default lists' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created board ID' },
          url: { type: 'string', description: 'Board URL' }
        }
      },
      {
        id: 'create_list',
        name: 'Create List',
        description: 'Create a new list in a board',
        inputSchema: {
          name: { type: 'string', required: true, description: 'List name' },
          boardId: { type: 'string', required: false, description: 'Board ID' },
          idBoard: { type: 'string', required: false, description: 'Board ID (alternative)' },
          pos: { type: 'string', description: 'Position (top, bottom, or number)' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Created list ID' }
        }
      },
      {
        id: 'add_comment',
        name: 'Add Comment',
        description: 'Add a comment to a card',
        inputSchema: {
          cardId: { type: 'string', required: true, description: 'Card ID' },
          text: { type: 'string', required: true, description: 'Comment text' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Comment ID' }
        }
      },
      {
        id: 'add_member',
        name: 'Add Member',
        description: 'Add a member to a card',
        inputSchema: {
          cardId: { type: 'string', required: true, description: 'Card ID' },
          memberId: { type: 'string', required: true, description: 'Member ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether member was added successfully' }
        }
      },
      {
        id: 'create_checklist',
        name: 'Create Checklist',
        description: 'Create a checklist on a card',
        inputSchema: {
          cardId: { type: 'string', required: true, description: 'Card ID' },
          name: { type: 'string', required: true, description: 'Checklist name' },
          items: { type: 'array', description: 'Checklist items' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Checklist ID' }
        }
      },
      {
        id: 'update_card',
        name: 'Update Card',
        description: 'Update a card',
        inputSchema: {
          cardId: { type: 'string', required: true, description: 'Card ID' },
          name: { type: 'string', description: 'Card name' },
          desc: { type: 'string', description: 'Card description' },
          closed: { type: 'boolean', description: 'Archive the card' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Card ID' }
        }
      },
      {
        id: 'get_card',
        name: 'Get Card',
        description: 'Get a card by ID',
        inputSchema: {
          cardId: { type: 'string', required: true, description: 'Card ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Card ID' },
          name: { type: 'string', description: 'Card name' }
        }
      },
      {
        id: 'get_cards',
        name: 'Get Cards',
        description: 'Get all cards in a list',
        inputSchema: {
          listId: { type: 'string', required: true, description: 'List ID' }
        },
        outputSchema: {
          cards: { type: 'array', description: 'Array of cards' }
        }
      },
      {
        id: 'delete_card',
        name: 'Delete Card',
        description: 'Delete a card',
        inputSchema: {
          cardId: { type: 'string', required: true, description: 'Card ID' }
        },
        outputSchema: {
          success: { type: 'boolean', description: 'Whether deletion was successful' }
        }
      },
      {
        id: 'archive_card',
        name: 'Archive Card',
        description: 'Archive a card',
        inputSchema: {
          cardId: { type: 'string', required: true, description: 'Card ID' }
        },
        outputSchema: {
          id: { type: 'string', description: 'Card ID' },
          closed: { type: 'boolean', description: 'Whether card is closed' }
        }
      },
      {
        id: 'get_lists',
        name: 'Get Lists',
        description: 'Get all lists in a board',
        inputSchema: {
          boardId: { type: 'string', required: true, description: 'Board ID' }
        },
        outputSchema: {
          lists: { type: 'array', description: 'Array of lists' }
        }
      }
    ];
  }

  private getTriggers(): ConnectorTrigger[] {
    return [
      {
        id: 'card_created',
        name: 'Card Created',
        description: 'Triggered when a new card is created',
        eventType: 'trello:card_created',
        outputSchema: {
          card: { type: 'object', description: 'Created card information' }
        },
        webhookRequired: true
      },
      {
        id: 'card_updated',
        name: 'Card Updated',
        description: 'Triggered when a card is updated',
        eventType: 'trello:card_updated',
        outputSchema: {
          card: { type: 'object', description: 'Updated card information' }
        },
        webhookRequired: true
      },
      {
        id: 'card_moved',
        name: 'Card Moved',
        description: 'Triggered when a card is moved between lists',
        eventType: 'trello:card_moved',
        outputSchema: {
          card: { type: 'object', description: 'Moved card information' }
        },
        webhookRequired: true
      },
      {
        id: 'comment_added',
        name: 'Comment Added',
        description: 'Triggered when a comment is added to a card',
        eventType: 'trello:comment_added',
        outputSchema: {
          comment: { type: 'object', description: 'Added comment information' }
        },
        webhookRequired: true
      },
      {
        id: 'member_added',
        name: 'Member Added',
        description: 'Triggered when a member is added to a card',
        eventType: 'trello:member_added',
        outputSchema: {
          card: { type: 'object', description: 'Card with new member' }
        },
        webhookRequired: true
      }
    ];
  }
}