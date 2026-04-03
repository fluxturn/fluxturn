import { Request } from 'express';
import { ConnectorResponse, PaginatedRequest, BulkOperation, BulkOperationResult } from '../types';

// Common project management entities
export interface PMProject {
  id?: string;
  name: string;
  description?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  ownerId?: string;
  teamMembers?: string[];
  customFields?: Record<string, any>;
}

export interface PMTask {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  parentTaskId?: string;
  startDate?: Date;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  attachments?: PMAttachment[];
  customFields?: Record<string, any>;
}

export interface PMComment {
  id?: string;
  content: string;
  authorId: string;
  taskId?: string;
  projectId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  attachments?: PMAttachment[];
}

export interface PMUser {
  id?: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  isActive?: boolean;
}

export interface PMAttachment {
  id?: string;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  uploadedBy?: string;
  uploadedAt?: Date;
}

export interface PMLabel {
  id?: string;
  name: string;
  color?: string;
  description?: string;
}

export interface PMSprint {
  id?: string;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status?: string;
  projectId?: string;
}

export interface PMBoard {
  id?: string;
  name: string;
  description?: string;
  type?: string;
  projectId?: string;
  lists?: PMList[];
}

export interface PMList {
  id?: string;
  name: string;
  position?: number;
  boardId?: string;
  cards?: PMTask[];
}

export interface PMWorkspace {
  id?: string;
  name: string;
  description?: string;
  ownerId?: string;
  members?: PMUser[];
}

export interface PMTimeEntry {
  id?: string;
  taskId: string;
  userId: string;
  hours: number;
  description?: string;
  date: Date;
}

export interface PMSearchOptions extends PaginatedRequest {
  query?: string;
  projectId?: string;
  assigneeId?: string;
  status?: string;
  priority?: string;
  labels?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface PMStatusTransition {
  from: string;
  to: string;
  comment?: string;
}

// Project Management Connector Interface
export interface IProjectManagementConnector {
  // Project Management
  createProject(project: PMProject): Promise<ConnectorResponse<PMProject>>;
  updateProject(projectId: string, updates: Partial<PMProject>): Promise<ConnectorResponse<PMProject>>;
  getProject(projectId: string): Promise<ConnectorResponse<PMProject>>;
  getProjects(options?: PaginatedRequest): Promise<ConnectorResponse<PMProject[]>>;
  deleteProject(projectId: string): Promise<ConnectorResponse<{ deleted: boolean }>>;

  // Task/Issue Management
  createTask(task: PMTask): Promise<ConnectorResponse<PMTask>>;
  updateTask(taskId: string, updates: Partial<PMTask>): Promise<ConnectorResponse<PMTask>>;
  getTask(taskId: string): Promise<ConnectorResponse<PMTask>>;
  getTasks(options?: PMSearchOptions): Promise<ConnectorResponse<PMTask[]>>;
  deleteTask(taskId: string): Promise<ConnectorResponse<{ deleted: boolean }>>;
  assignTask(taskId: string, assigneeId: string): Promise<ConnectorResponse<PMTask>>;
  transitionTask(taskId: string, transition: PMStatusTransition): Promise<ConnectorResponse<PMTask>>;

  // Comments and Collaboration
  addComment(comment: PMComment): Promise<ConnectorResponse<PMComment>>;
  updateComment(commentId: string, content: string): Promise<ConnectorResponse<PMComment>>;
  getComments(taskId: string, options?: PaginatedRequest): Promise<ConnectorResponse<PMComment[]>>;
  deleteComment(commentId: string): Promise<ConnectorResponse<{ deleted: boolean }>>;

  // User Management
  getUsers(options?: PaginatedRequest): Promise<ConnectorResponse<PMUser[]>>;
  getUser(userId: string): Promise<ConnectorResponse<PMUser>>;
  getCurrentUser(): Promise<ConnectorResponse<PMUser>>;

  // Labels/Tags
  createLabel(label: PMLabel): Promise<ConnectorResponse<PMLabel>>;
  getLabels(): Promise<ConnectorResponse<PMLabel[]>>;
  addLabelToTask(taskId: string, labelId: string): Promise<ConnectorResponse<boolean>>;
  removeLabelFromTask(taskId: string, labelId: string): Promise<ConnectorResponse<boolean>>;

  // Attachments
  addAttachment(taskId: string, attachment: PMAttachment): Promise<ConnectorResponse<PMAttachment>>;
  getAttachments(taskId: string): Promise<ConnectorResponse<PMAttachment[]>>;
  deleteAttachment(attachmentId: string): Promise<ConnectorResponse<{ deleted: boolean }>>;

  // Search and Filtering
  searchTasks(options: PMSearchOptions): Promise<ConnectorResponse<PMTask[]>>;
  searchProjects(query: string, options?: PaginatedRequest): Promise<ConnectorResponse<PMProject[]>>;

  // Time Tracking (if supported)
  logTime?(entry: PMTimeEntry): Promise<ConnectorResponse<PMTimeEntry>>;
  getTimeEntries?(taskId: string, options?: PaginatedRequest): Promise<ConnectorResponse<PMTimeEntry[]>>;

  // Bulk Operations
  bulkCreateTasks?(tasks: PMTask[]): Promise<BulkOperationResult<PMTask>>;
  bulkUpdateTasks?(updates: Array<{ id: string; updates: Partial<PMTask> }>): Promise<BulkOperationResult<PMTask>>;

  // Workspace/Organization
  getWorkspaces?(): Promise<ConnectorResponse<PMWorkspace[]>>;
  getWorkspace?(workspaceId: string): Promise<ConnectorResponse<PMWorkspace>>;
}

// Platform-specific interfaces for extended functionality

export interface IJiraConnector extends IProjectManagementConnector {
  // Jira-specific methods
  createEpic(epic: PMTask & { epicName: string }): Promise<ConnectorResponse<PMTask>>;
  addToEpic(taskId: string, epicId: string): Promise<ConnectorResponse<boolean>>;
  createSprint(sprint: PMSprint): Promise<ConnectorResponse<PMSprint>>;
  addToSprint(taskId: string, sprintId: string): Promise<ConnectorResponse<boolean>>;
  getBacklog(projectId: string): Promise<ConnectorResponse<PMTask[]>>;
  getBoard(boardId: string): Promise<ConnectorResponse<PMBoard>>;
  getBoards(projectId?: string): Promise<ConnectorResponse<PMBoard[]>>;
  transitionIssue(issueId: string, transitionId: string, comment?: string): Promise<ConnectorResponse<PMTask>>;
  getIssueTransitions(issueId: string): Promise<ConnectorResponse<Array<{ id: string; name: string }>>>;
}

export interface INotionConnector extends IProjectManagementConnector {
  // Notion-specific methods
  createPage(page: { title: string; parentId: string; content?: any[] }): Promise<ConnectorResponse<any>>;
  updatePage(pageId: string, updates: any): Promise<ConnectorResponse<any>>;
  queryDatabase(databaseId: string, query?: any): Promise<ConnectorResponse<any[]>>;
  createDatabase(database: { title: string; parentId: string; properties: any }): Promise<ConnectorResponse<any>>;
  addBlock(pageId: string, block: any): Promise<ConnectorResponse<any>>;
  searchPages(query: string): Promise<ConnectorResponse<any[]>>;
}

export interface IAsanaConnector extends IProjectManagementConnector {
  // Asana-specific methods
  createSection(section: { name: string; projectId: string }): Promise<ConnectorResponse<any>>;
  getSections(projectId: string): Promise<ConnectorResponse<any[]>>;
  addTaskToSection(taskId: string, sectionId: string): Promise<ConnectorResponse<boolean>>;
  createPortfolio(portfolio: { name: string; members?: string[] }): Promise<ConnectorResponse<any>>;
  getPortfolios(): Promise<ConnectorResponse<any[]>>;
  addProjectToPortfolio(portfolioId: string, projectId: string): Promise<ConnectorResponse<boolean>>;
  getCustomFields(projectId: string): Promise<ConnectorResponse<any[]>>;
}

export interface ITrelloConnector extends IProjectManagementConnector {
  // Trello-specific methods
  createBoard(board: { name: string; desc?: string; defaultLists?: boolean }): Promise<ConnectorResponse<PMBoard>>;
  getBoard(boardId: string): Promise<ConnectorResponse<PMBoard>>;
  getBoards(): Promise<ConnectorResponse<PMBoard[]>>;
  createList(list: { name: string; boardId: string; pos?: string }): Promise<ConnectorResponse<PMList>>;
  getLists(boardId: string): Promise<ConnectorResponse<PMList[]>>;
  moveCard(cardId: string, listId: string, position?: string): Promise<ConnectorResponse<PMTask>>;
  addMemberToBoard(boardId: string, memberId: string): Promise<ConnectorResponse<boolean>>;
  addMemberToCard(cardId: string, memberId: string): Promise<ConnectorResponse<boolean>>;
  createChecklist(cardId: string, checklist: { name: string; items?: string[] }): Promise<ConnectorResponse<any>>;
  getChecklists(cardId: string): Promise<ConnectorResponse<any[]>>;
}

export interface ILinearConnector extends IProjectManagementConnector {
  // Linear-specific methods
  createCycle(cycle: { name: string; description?: string; startDate: Date; endDate: Date; teamId: string }): Promise<ConnectorResponse<any>>;
  getCycles(teamId?: string): Promise<ConnectorResponse<any[]>>;
  addIssueToCycle(issueId: string, cycleId: string): Promise<ConnectorResponse<boolean>>;
  getTeams(): Promise<ConnectorResponse<any[]>>;
  getTeam(teamId: string): Promise<ConnectorResponse<any>>;
  createIssueRelation(issueId: string, relatedIssueId: string, type: string): Promise<ConnectorResponse<any>>;
  getIssueHistory(issueId: string): Promise<ConnectorResponse<any[]>>;
}