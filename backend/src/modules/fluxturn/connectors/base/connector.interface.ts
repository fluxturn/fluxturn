import { Request } from 'express';
import {
  ConnectorConfig,
  ConnectorResponse,
  ConnectorRequest,
  ConnectorMetadata,
  ConnectorHealthStatus,
  ConnectorUsageStats,
  WebhookEvent,
  PaginatedRequest,
  BulkOperation,
  BulkOperationResult,
  ConnectorEvent,
  OAuthTokens
} from '../types';

export interface IConnector {
  /**
   * Get connector metadata including supported actions and triggers
   */
  getMetadata(): ConnectorMetadata;

  /**
   * Initialize the connector with configuration
   */
  initialize(config: ConnectorConfig): Promise<void>;

  /**
   * Test the connection and validate credentials
   */
  testConnection(): Promise<ConnectorResponse<boolean>>;

  /**
   * Check the health status of the connector
   */
  getHealthStatus(): Promise<ConnectorHealthStatus>;

  /**
   * Get usage statistics for the connector
   */
  getUsageStats(): Promise<ConnectorUsageStats>;

  /**
   * Execute a generic request to the external service
   */
  executeRequest(request: ConnectorRequest): Promise<ConnectorResponse>;

  /**
   * Execute a specific action by ID
   */
  executeAction(actionId: string, input: any): Promise<ConnectorResponse>;

  /**
   * Set up webhook endpoint for receiving events
   */
  setupWebhook?(events: string[]): Promise<ConnectorResponse<string>>;

  /**
   * Process incoming webhook events
   */
  processWebhook?(payload: any, headers: Record<string, string>): Promise<WebhookEvent[]>;

  /**
   * Refresh OAuth tokens if applicable
   */
  refreshTokens?(): Promise<OAuthTokens>;

  /**
   * Cleanup resources when connector is destroyed
   */
  destroy(): Promise<void>;
}

export interface IDataConnector extends IConnector {
  /**
   * Create a new record
   */
  create(data: any): Promise<ConnectorResponse>;

  /**
   * Read/fetch records with optional pagination and filtering
   */
  read(request?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Update an existing record
   */
  update(id: string, data: any): Promise<ConnectorResponse>;

  /**
   * Delete a record
   */
  delete(id: string): Promise<ConnectorResponse>;

  /**
   * Search for records
   */
  search(query: string, options?: any): Promise<ConnectorResponse>;

  /**
   * Execute bulk operations
   */
  bulk<T>(operation: BulkOperation<T>): Promise<BulkOperationResult<T>>;
}

export interface ICommunicationConnector extends IConnector {
  /**
   * Send a message
   */
  sendMessage(to: string | string[], message: any): Promise<ConnectorResponse>;

  /**
   * Get message history
   */
  getMessages(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Get contact/user information
   */
  getContact(contactId: string): Promise<ConnectorResponse>;

  /**
   * Create or update contact
   */
  upsertContact(contact: any): Promise<ConnectorResponse>;
}

export interface IStorageConnector extends IConnector {
  /**
   * Upload a file
   */
  uploadFile(filePath: string, content: Buffer | string, metadata?: any): Promise<ConnectorResponse>;

  /**
   * Download a file
   */
  downloadFile(filePath: string): Promise<ConnectorResponse<Buffer>>;

  /**
   * List files in a directory
   */
  listFiles(directoryPath?: string, options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Delete a file
   */
  deleteFile(filePath: string): Promise<ConnectorResponse>;

  /**
   * Create a directory
   */
  createDirectory(directoryPath: string): Promise<ConnectorResponse>;

  /**
   * Get file metadata
   */
  getFileMetadata(filePath: string): Promise<ConnectorResponse>;

  /**
   * Share a file and get shareable link
   */
  shareFile(filePath: string, permissions?: any): Promise<ConnectorResponse<string>>;
}

export interface IAnalyticsConnector extends IConnector {
  /**
   * Track an event
   */
  trackEvent(eventName: string, properties?: any, userId?: string): Promise<ConnectorResponse>;

  /**
   * Get analytics data
   */
  getAnalytics(query: any): Promise<ConnectorResponse>;

  /**
   * Create a custom report
   */
  createReport(reportConfig: any): Promise<ConnectorResponse>;

  /**
   * Get user profiles
   */
  getUserProfiles(userIds?: string[]): Promise<ConnectorResponse>;
}

export interface IMarketingConnector extends IConnector {
  /**
   * Create a campaign
   */
  createCampaign(campaign: any): Promise<ConnectorResponse>;

  /**
   * Send email to contacts
   */
  sendEmail(email: any): Promise<ConnectorResponse>;

  /**
   * Get campaign statistics
   */
  getCampaignStats(campaignId: string): Promise<ConnectorResponse>;

  /**
   * Manage contact lists
   */
  manageContacts(operation: 'add' | 'remove' | 'update', listId: string, contacts: any[]): Promise<ConnectorResponse>;
}

export interface IEcommerceConnector extends IConnector {
  /**
   * Get products
   */
  getProducts(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Create/update product
   */
  upsertProduct(product: any): Promise<ConnectorResponse>;

  /**
   * Get orders
   */
  getOrders(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Process payment
   */
  processPayment(paymentData: any): Promise<ConnectorResponse>;

  /**
   * Get customers
   */
  getCustomers(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Handle inventory management
   */
  updateInventory(productId: string, quantity: number): Promise<ConnectorResponse>;
}

export interface IAIConnector extends IConnector {
  /**
   * Generate text completion
   */
  generateText(prompt: string, options?: any): Promise<ConnectorResponse>;

  /**
   * Generate image
   */
  generateImage?(prompt: string, options?: any): Promise<ConnectorResponse>;

  /**
   * Analyze text
   */
  analyzeText?(text: string, analysisType: string): Promise<ConnectorResponse>;

  /**
   * Process image
   */
  processImage?(imageData: Buffer, operation: string): Promise<ConnectorResponse>;

  /**
   * Get model information
   */
  getModels(): Promise<ConnectorResponse>;
}

export interface IProjectManagementConnector extends IConnector {
  /**
   * Create a task/ticket
   */
  createTask(task: any): Promise<ConnectorResponse>;

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, status: string): Promise<ConnectorResponse>;

  /**
   * Get tasks with filtering
   */
  getTasks(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Assign task to user
   */
  assignTask(taskId: string, userId: string): Promise<ConnectorResponse>;

  /**
   * Get project information
   */
  getProjects(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Create/update project
   */
  upsertProject(project: any): Promise<ConnectorResponse>;
}

export interface ISocialConnector extends IConnector {
  /**
   * Post content to social platform
   */
  postContent(content: any): Promise<ConnectorResponse>;

  /**
   * Get social media posts
   */
  getPosts(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Get user profile
   */
  getUserProfile(userId?: string): Promise<ConnectorResponse>;

  /**
   * Get followers/following
   */
  getConnections(type: 'followers' | 'following', options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Schedule a post
   */
  schedulePost(content: any, scheduledTime: Date): Promise<ConnectorResponse>;
}

export interface IFormConnector extends IConnector {
  /**
   * Create a form
   */
  createForm(form: any): Promise<ConnectorResponse>;

  /**
   * Get form responses
   */
  getFormResponses(formId: string, options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Update form configuration
   */
  updateForm(formId: string, updates: any): Promise<ConnectorResponse>;

  /**
   * Get form analytics
   */
  getFormAnalytics(formId: string): Promise<ConnectorResponse>;
}

export interface IVideoConnector extends IConnector {
  /**
   * Upload video
   */
  uploadVideo(videoData: Buffer, metadata: any): Promise<ConnectorResponse>;

  /**
   * Get video information
   */
  getVideo(videoId: string): Promise<ConnectorResponse>;

  /**
   * Process video (transcode, edit, etc.)
   */
  processVideo(videoId: string, operations: any): Promise<ConnectorResponse>;

  /**
   * Get video analytics
   */
  getVideoAnalytics(videoId: string): Promise<ConnectorResponse>;

  /**
   * Create live stream
   */
  createLiveStream?(streamConfig: any): Promise<ConnectorResponse>;
}

export interface ISupportConnector extends IConnector {
  /**
   * Create a support ticket
   */
  createTicket(ticket: any): Promise<ConnectorResponse>;

  /**
   * Update ticket status
   */
  updateTicket(ticketId: string, updates: any): Promise<ConnectorResponse>;

  /**
   * Get tickets
   */
  getTickets(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Add comment to ticket
   */
  addComment(ticketId: string, comment: any): Promise<ConnectorResponse>;

  /**
   * Get knowledge base articles
   */
  getKnowledgeBase(query?: string): Promise<ConnectorResponse>;
}

export interface IFinanceConnector extends IConnector {
  /**
   * Get accounts
   */
  getAccounts(): Promise<ConnectorResponse>;

  /**
   * Get transactions
   */
  getTransactions(accountId?: string, options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Create invoice
   */
  createInvoice(invoice: any): Promise<ConnectorResponse>;

  /**
   * Process payment
   */
  processPayment(payment: any): Promise<ConnectorResponse>;

  /**
   * Get financial reports
   */
  getReports(reportType: string, dateRange?: any): Promise<ConnectorResponse>;
}

export interface ICRMConnector extends IConnector {
  /**
   * Create a contact
   */
  createContact(contact: any): Promise<ConnectorResponse>;

  /**
   * Update a contact
   */
  updateContact(contactId: string, updates: any): Promise<ConnectorResponse>;

  /**
   * Get contact by ID
   */
  getContact(contactId: string): Promise<ConnectorResponse>;

  /**
   * Search contacts
   */
  searchContacts(query: string, options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Get all contacts
   */
  getContacts(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Delete a contact
   */
  deleteContact(contactId: string): Promise<ConnectorResponse>;

  /**
   * Create a deal/opportunity
   */
  createDeal(deal: any): Promise<ConnectorResponse>;

  /**
   * Update a deal/opportunity
   */
  updateDeal(dealId: string, updates: any): Promise<ConnectorResponse>;

  /**
   * Get deal by ID
   */
  getDeal(dealId: string): Promise<ConnectorResponse>;

  /**
   * Get all deals
   */
  getDeals(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Delete a deal
   */
  deleteDeal(dealId: string): Promise<ConnectorResponse>;

  /**
   * Create a company/account
   */
  createCompany(company: any): Promise<ConnectorResponse>;

  /**
   * Update a company/account
   */
  updateCompany(companyId: string, updates: any): Promise<ConnectorResponse>;

  /**
   * Get company by ID
   */
  getCompany(companyId: string): Promise<ConnectorResponse>;

  /**
   * Get all companies
   */
  getCompanies(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Create an activity/task
   */
  createActivity(activity: any): Promise<ConnectorResponse>;

  /**
   * Update an activity/task
   */
  updateActivity(activityId: string, updates: any): Promise<ConnectorResponse>;

  /**
   * Get activities
   */
  getActivities(options?: PaginatedRequest): Promise<ConnectorResponse>;

  /**
   * Execute bulk operations
   */
  bulkOperation<T>(operation: BulkOperation<T>): Promise<BulkOperationResult<T>>;

  /**
   * Get custom fields for an object type
   */
  getCustomFields(objectType: string): Promise<ConnectorResponse>;

  /**
   * Search records across multiple object types
   */
  globalSearch(query: string, objectTypes?: string[]): Promise<ConnectorResponse>;
}

export interface IDevelopmentConnector extends IConnector {
  /**
   * Create a repository
   */
  createRepository(repository: any): Promise<ConnectorResponse>;

  /**
   * Create a task/issue
   */
  createTask(owner: string, repo: string, task: any): Promise<ConnectorResponse>;

  /**
   * Get repository information
   */
  getRepository(owner: string, repo: string): Promise<ConnectorResponse>;

  /**
   * Get code/file content
   */
  getCode(owner: string, repo: string, path: string, ref?: string): Promise<ConnectorResponse>;

  /**
   * Deploy project
   */
  deployProject(owner: string, repo: string, deployment: any): Promise<ConnectorResponse>;

  /**
   * Get tasks/issues
   */
  getTasks(owner: string, repo: string, options?: PaginatedRequest): Promise<ConnectorResponse>;
}

export interface IConnectorEventEmitter {
  /**
   * Emit a connector event
   */
  emit(event: ConnectorEvent): void;

  /**
   * Subscribe to connector events
   */
  on(eventType: string, handler: (event: ConnectorEvent) => void): void;

  /**
   * Unsubscribe from connector events
   */
  off(eventType: string, handler: (event: ConnectorEvent) => void): void;
}