import { getEnvironmentBaseUrl } from './config';

// Simple API configuration
const API_BASE_URL = `${getEnvironmentBaseUrl()}/api/v1`;

interface ApiOptions extends RequestInit {
  token?: string;
}

// =====================================================================================
// IMAGITAR-SPECIFIC TYPES AND INTERFACES
// =====================================================================================

// API Error types
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

export class ApiErrorResponse extends Error {
  public statusCode: number;
  public code?: string;
  public details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiErrorResponse';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Response types
export interface ProcessedFileResponse {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  processingParams?: Record<string, any>;
  processingTime?: number;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
  exportId?: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  colorSpace?: string;
  channels?: number;
  bitDepth?: number;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  framerate: number;
  codec: string;
  bitrate?: number;
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  template?: string;
  slides: Slide[];
  theme?: PresentationTheme;
  settings?: Record<string, any>;
  userId: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'shared';
  createdAt: string;
  updatedAt: string;
}

export interface Slide {
  id: string;
  title: string;
  content: string;
  order: number;
  layout?: 'title' | 'content' | 'image' | 'split' | 'blank';
  background?: string;
  backgroundImage?: string;
  properties?: Record<string, any>;
  animations?: SlideAnimation[];
  duration?: number;
}

export interface SlideAnimation {
  id: string;
  elementId: string;
  type: 'fade' | 'slide' | 'zoom' | 'rotate' | 'bounce';
  direction?: 'left' | 'right' | 'up' | 'down';
  duration: number;
  delay: number;
  easing?: string;
}

export interface PresentationTheme {
  id?: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  background?: string;
  textColor: string;
  fontFamily: string;
  fontSize?: number;
  lineHeight?: number;
  properties?: Record<string, any>;
}

export interface ImageAsset {
  id: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface ImageLibraryResponse {
  images: ImageAsset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Image Projects types are now defined in ./api/imageProjects.ts
// and re-exported at the bottom of this file

class ApiClient {
  private token: string | null = null;
  private organizationId: string | null = null;
  private projectId: string | null = null;
  private appId: string | null = null;

  constructor() {
    // Initialize token and context IDs from localStorage on creation
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken');
      this.organizationId = localStorage.getItem('selectedOrganizationId');
      this.projectId = localStorage.getItem('selectedProjectId');
      this.appId = localStorage.getItem('selectedAppId');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return this.token || localStorage.getItem('accessToken');
    }
    return this.token;
  }

  setOrganizationId(organizationId: string | null) {
    // console.log('[API] setOrganizationId called with:', organizationId);
    this.organizationId = organizationId;
    // Persist to localStorage so it survives page refreshes
    if (typeof window !== 'undefined') {
      // console.log('[API] window is defined, proceeding with localStorage');
      if (organizationId) {
        // console.log('[API] Setting localStorage.selectedOrganizationId =', organizationId);
        localStorage.setItem('selectedOrganizationId', organizationId);
        // Verify it was set
        const verified = localStorage.getItem('selectedOrganizationId');
        // console.log('[API] Verification - localStorage.selectedOrganizationId =', verified);
      } else {
        // console.log('[API] Removing localStorage.selectedOrganizationId');
        localStorage.removeItem('selectedOrganizationId');
      }
    } else {
      // console.warn('[API] window is undefined, skipping localStorage');
    }
  }

  getOrganizationId(): string | null {
    // Try to get from memory first
    if (this.organizationId) {
      return this.organizationId;
    }
    // Then try to extract from URL (source of truth)
    if (typeof window !== 'undefined') {
      const urlMatch = window.location.pathname.match(/\/org\/([a-f0-9-]+)/i);
      if (urlMatch && urlMatch[1]) {
        this.organizationId = urlMatch[1];
        localStorage.setItem('selectedOrganizationId', urlMatch[1]);
        return urlMatch[1];
      }
      // Fallback to localStorage only if not in URL
      const stored = localStorage.getItem('selectedOrganizationId');
      if (stored) {
        this.organizationId = stored;
        return stored;
      }
    }
    return null;
  }

  setProjectId(projectId: string | null) {
    this.projectId = projectId;
    // Persist to localStorage so it survives page refreshes
    if (typeof window !== 'undefined') {
      if (projectId) {
        localStorage.setItem('selectedProjectId', projectId);
      } else {
        localStorage.removeItem('selectedProjectId');
      }
    }
  }

  getProjectId(): string | null {
    // Try to get from memory first
    if (this.projectId) {
      return this.projectId;
    }
    // Then try to extract from URL (source of truth)
    if (typeof window !== 'undefined') {
      const urlMatch = window.location.pathname.match(/\/project\/([a-f0-9-]+)/i);
      if (urlMatch && urlMatch[1]) {
        this.projectId = urlMatch[1];
        localStorage.setItem('selectedProjectId', urlMatch[1]);
        return urlMatch[1];
      }
      // Fallback to localStorage only if not in URL
      const stored = localStorage.getItem('selectedProjectId');
      if (stored) {
        this.projectId = stored;
        return stored;
      }
    }
    return null;
  }

  setAppId(appId: string | null) {
    this.appId = appId;
    // Persist to localStorage so it survives page refreshes
    if (typeof window !== 'undefined') {
      if (appId) {
        localStorage.setItem('selectedAppId', appId);
      } else {
        localStorage.removeItem('selectedAppId');
      }
    }
  }

  getAppId(): string | null {
    // Try to get from memory first, then from localStorage
    if (this.appId) {
      return this.appId;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedAppId');
      if (stored) {
        this.appId = stored;
        return stored;
      }
    }
    return null;
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = options.token || this.getToken();

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add multi-tenant headers
    // Send IDs as headers for backend auth context
    // Use getter methods to ensure we check localStorage as fallback
    const appId = this.getAppId();
    const projectId = this.getProjectId();
    const organizationId = this.getOrganizationId();

    if (appId) {
      headers['x-app-id'] = appId;
    }
    if (projectId) {
      headers['x-project-id'] = projectId;
    }
    if (organizationId) {
      headers['x-organization-id'] = organizationId;
    }

    const config: RequestInit = {
      ...options,
      mode: 'cors',
      credentials: 'include',
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        // Look for the error message in various possible locations
        const errorMessage = errorData.message || errorData.error || errorData.statusMessage || 'API request failed';
        throw new Error(errorMessage);
      }

      // Handle empty responses (common for DELETE requests)
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      // If no content or content-length is 0, return empty object
      if (response.status === 204 || contentLength === '0') {
        return {} as T;
      }

      // If there's no content-type or it's not JSON, try to parse as text
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        // If empty text, return empty object
        if (!text || text.trim() === '') {
          return {} as T;
        }
        // Try to parse as JSON anyway
        try {
          return JSON.parse(text);
        } catch {
          return {} as T;
        }
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // Generic HTTP methods
  async get<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    });
  }

  async put<T = any>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Helper method for FormData requests
  async requestFormData<T = any>(endpoint: string, formData: FormData, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    });
  }

  // Get headers for direct fetch calls
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = this.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use getter methods to ensure we check localStorage as fallback
    const appId = this.getAppId();
    const projectId = this.getProjectId();
    const organizationId = this.getOrganizationId();

    if (appId) {
      headers['x-app-id'] = appId;
    }
    if (projectId) {
      headers['x-project-id'] = projectId;
    }
    if (organizationId) {
      headers['x-organization-id'] = organizationId;
    }

    return headers;
  }

  // Get base URL for direct fetch calls
  get baseURL(): string {
    return API_BASE_URL;
  }

  // Navigation methods
  async getMenuData(organizationId?: string, projectId?: string, appId?: string) {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);
    if (projectId) params.append('projectId', projectId);
    if (appId) params.append('appId', appId);
    
    const query = params.toString();
    return this.get(`/navigation/menu-data${query ? `?${query}` : ''}`);
  }

  // Authentication methods
  async login(email: string, password: string) {
    const response = await this.post<{
      user: any;
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', { email, password });

    this.setToken(response.accessToken);
    return response;
  }

  async register(email: string, password: string, name: string) {
    const response = await this.post<{
      userId: string;
      email: string;
      message: string;
    }>('/auth/register', { 
      email, 
      password, 
      name // Send as single field, backend will handle splitting
    });

    // Registration doesn't return a token, user needs to login after
    return response;
  }

  async logout() {
    // For JWT-based auth, logout is handled client-side by removing the token
    this.setToken(null);
    localStorage.removeItem('refreshToken');
  }

  async refresh(refreshToken: string) {
    const response = await this.post<{
      accessToken: string;
      refreshToken: string;
      user: any;
    }>('/auth/refresh', { refreshToken });

    if (response.accessToken) {
      this.setToken(response.accessToken);
    }
    
    return response;
  }

  async forgotPassword(email: string) {
    return this.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string) {
    return this.post('/auth/reset-password', { token, password });
  }

  async verifyEmail(token: string) {
    return this.post('/auth/verify-email', { token });
  }

  async resendVerificationEmail(email: string) {
    return this.post('/auth/resend-verification', { email });
  }

  async getProfile(): Promise<any> {
    return this.get('/auth/me');
  }

  async updateProfile(data: {
    name?: string;
    bio?: string;
    website?: string;
    location?: string;
  }) {
    return this.patch('/auth/profile', data);
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return this.post('/auth/avatar', formData);
  }

  // Get all organizations for the current user
  async getUserOrganizations() {
    // console.log('[API] getUserOrganizations: Calling GET /organization/user/list');
    try {
      const result = await this.get('/organization/user/list');
      // console.log('[API] getUserOrganizations: Response received:', result);
      return result;
    } catch (error) {
      console.error('[API] getUserOrganizations: Error occurred:', error);
      throw error;
    }
  }

  // Organization methods
  async getOrganization(organizationId: string) {
    this.setOrganizationId(organizationId);
    return this.get('/organization');
  }

  async createOrganization(data: {
    name: string;
    description?: string;
    website?: string;
  }) {
    return this.post('/organization/create', data);
  }

  async updateOrganization(organizationId: string, data: {
    name?: string;
    description?: string;
    website?: string;
    settings?: Record<string, any>;
  }) {
    this.setOrganizationId(organizationId);
    return this.patch('/organization', data);
  }

  async deleteOrganization(organizationId: string) {
    this.setOrganizationId(organizationId);
    return this.delete('/organization');
  }

  // Project methods
  async getProject(projectId: string) {
    this.setProjectId(projectId);
    return this.get('/project');
  }

  async getProjectsByOrganization(organizationId: string) {
    // console.log('🔗 API: Fetching projects for organization', organizationId);
    this.setOrganizationId(organizationId);
    const result = await this.get('/organization/projects');
    // console.log('📥 API: Received', result?.data?.length || 0, 'projects');
    return result;
  }

  async getOrganizationStats(organizationId: string) {
    // console.log('🔗 API: Fetching stats for organization', organizationId);
    this.setOrganizationId(organizationId);
    const result = await this.get('/organization/stats');
    // console.log('📥 API: Received organization stats:', result?.data);
    return result;
  }

  async createProject(data: {
    name: string;
    description?: string;
    organizationId: string;
    visibility?: 'public' | 'private' | 'internal';
    settings?: Record<string, any>;
  }) {
    // Set organization context for project creation
    this.setOrganizationId(data.organizationId);
    return this.post('/project/create', data);
  }

  async updateProject(projectId: string, data: {
    name?: string;
    description?: string;
    projectUrl?: string;
    visibility?: 'public' | 'private' | 'internal';
    settings?: Record<string, any>;
  }) {
    this.setProjectId(projectId);
    return this.patch('/project', data);
  }

  async deleteProject(projectId: string) {
    this.setProjectId(projectId);
    return this.delete('/project');
  }


  // Database methods
  async getTables(schema: string = 'public', projectId?: string, appId?: string) {
    // Set context IDs if provided
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);
    
    return this.get(`/database/tables?schema=${schema}`);
  }

  async getTableInfo(tableName: string, projectId?: string, appId?: string) {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);
    
    return this.get(`/database/tables/${tableName}`);
  }

  async getTableData(tableName: string, page: number = 1, limit: number = 50, schema: string = 'public', projectId?: string, appId?: string) {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    return this.get(`/database/tables/${tableName}/data?${params}`);
  }

  async executeQuery(query: string, projectId?: string, appId?: string) {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);
    
    return this.post('/database/query', { query });
  }

  async createTable(data: { name: string; columns: any[] }, projectId?: string, appId?: string): Promise<any> {    
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.request(`/database/tables`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async renameTable(tableName: string, newName: string, projectId?: string, appId?: string): Promise<any> {   
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.request(`/database/tables/${tableName}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ newName })
    });
  }

  async deleteTable(tableName: string, projectId?: string, appId?: string) {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);
    
    return this.delete(`/database/tables/${tableName}`);
  }

  async truncateTable(tableName: string, projectId?: string, appId?: string) {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);
    
    return this.post(`/database/tables/${tableName}/truncate`);
  }

  async cloneTable(tableName: string, targetName: string, includeData: boolean, projectId?: string, appId?: string): Promise<any> {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.request(`/database/tables/${tableName}/clone`, {
      method: 'POST',
      body: JSON.stringify({ targetName, includeData })
    });
  }

  async updateCell(tableName: string, id: string, columnName: string, value: any, projectId?: string, appId?: string) {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);
    
    return this.patch(`/database/tables/${tableName}/rows/${id}`, {
      data: {
        [columnName]: value
      }
    });
  }

  async addColumn(tableName: string, column: any, projectId?: string, appId?: string): Promise<any> {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.request(`/database/tables/${tableName}/columns`, {
      method: 'POST',
      body: JSON.stringify(column)
    });
  }

  async updateColumn(tableName: string, columnName: string, updates: any, projectId?: string, appId?: string) {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);
    
    return this.patch(`/database/tables/${tableName}/columns/${columnName}`, updates);
  }

  async deleteColumn(tableName: string, columnName: string, projectId?: string, appId?: string) {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);
    
    return this.delete(`/database/tables/${tableName}/columns/${columnName}`);
  }

  async addRow(tableName: string, rowData: any, projectId?: string, appId?: string): Promise<any> {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.request(`/database/tables/${tableName}/rows`, {
      method: 'POST',
      body: JSON.stringify({ data: rowData })
    });
  }

  async updateRow(tableName: string, rowId: string, rowData: any, projectId?: string, appId?: string): Promise<any> {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.request(`/database/tables/${tableName}/rows/${rowId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: rowData })
    });
  }

  async deleteRow(tableName: string, id: string, projectId?: string, appId?: string) {
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);
    
    return this.delete(`/database/tables/${tableName}/rows/${id}`);
  }

  // =============== CHATBOT API METHODS ===============

  // Chatbot Configuration Methods
  async getChatbotConfigs(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const query = params.toString();
    return this.get(`/chatbot/configs${query ? `?${query}` : ''}`);
  }

  async getChatbotConfig(configId: string) {
    return this.get(`/chatbot/configs/${configId}`);
  }

  async createChatbotConfig(data: {
    name: string;
    description?: string;
    type: string;
    systemPrompt: string;
    welcomeMessage?: string;
    isEnabled?: boolean;
    aiConfig?: Record<string, any>;
    tags?: string[];
    uiConfig?: Record<string, any>;
  }) {
    return this.post('/chatbot/configs', data);
  }

  async updateChatbotConfig(configId: string, data: {
    name?: string;
    description?: string;
    type?: string;
    systemPrompt?: string;
    welcomeMessage?: string;
    isEnabled?: boolean;
    aiConfig?: Record<string, any>;
    tags?: string[];
    uiConfig?: Record<string, any>;
  }) {
    return this.patch(`/chatbot/configs/${configId}`, data);
  }

  async deleteChatbotConfig(configId: string) {
    return this.delete(`/chatbot/configs/${configId}`);
  }

  // Document Management Methods
  async uploadChatbotDocument(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.requestFormData('/chatbot/documents', formData);
  }

  async getChatbotDocuments(limit?: number, offset?: number): Promise<any> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const query = params.toString();
    return this.get(`/chatbot/documents${query ? `?${query}` : ''}`);
  }

  async deleteChatbotDocument(documentId: string): Promise<any> {
    return this.delete(`/chatbot/documents/${documentId}`);
  }

  // URL Processing Methods
  async processChatbotUrls(urls: string[]): Promise<any> {
    return this.post('/chatbot/urls', { urls });
  }

  // Avatar Upload Method
  async uploadChatbotAvatar(configId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.requestFormData(`/chatbot/configs/${configId}/avatar`, formData);
  }

  // Training Data Methods
  async getChatbotTrainingData(limit?: number, offset?: number): Promise<any> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const query = params.toString();
    return this.get(`/chatbot/training${query ? `?${query}` : ''}`);
  }

  // Conversation Methods
  async getChatbotConversations(params?: {
    chatbotConfigId?: string;
    userId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.chatbotConfigId) searchParams.append('chatbotConfigId', params.chatbotConfigId);
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    const query = searchParams.toString();
    return this.get(`/chatbot/conversations${query ? `?${query}` : ''}`);
  }

  async createChatbotConversation(data: {
    chatbotConfigId: string;
    userId?: string;
    title?: string;
    metadata?: Record<string, any>;
    userContext?: Record<string, any>;
  }): Promise<any> {
    return this.post('/chatbot/conversations', data);
  }

  // Message Methods
  async getChatbotMessages(conversationId: string, params?: {
    role?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    const query = searchParams.toString();
    return this.get(`/chatbot/conversations/${conversationId}/messages${query ? `?${query}` : ''}`);
  }

  async sendChatbotMessage(conversationId: string, data: {
    content: string;
    type?: string;
    attachments?: Array<{ name: string; url: string; type?: string; size?: number }>;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return this.post(`/chatbot/conversations/${conversationId}/messages`, data);
  }

  async provideChatbotFeedback(messageId: string, data: {
    rating?: number;
    feedback?: string;
    comment?: string;
    isHelpful?: boolean;
  }): Promise<any> {
    return this.post(`/chatbot/messages/${messageId}/feedback`, data);
  }

  // Analytics Methods
  async getChatbotStats(params?: {
    chatbotConfigId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.chatbotConfigId) searchParams.append('chatbotConfigId', params.chatbotConfigId);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    
    const query = searchParams.toString();
    return this.get(`/chatbot/analytics/stats${query ? `?${query}` : ''}`);
  }

  // Legacy chatbot methods for backward compatibility
  async sendChatMessage(data: {
    message: string;
    sessionId: string;
    userId?: string;
    language?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return this.post('/chatbot/send', {
      message: data.message,
      metadata: {
        sessionId: data.sessionId,
        userId: data.userId,
        language: data.language,
        ...data.metadata
      }
    });
  }

  async getChatHistory(sessionId: string, limit?: number): Promise<any> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    return this.get(`/chatbot/history/${sessionId}${query ? `?${query}` : ''}`);
  }

  // Workflow Methods - MOVED TO /lib/fluxturn/workflow.ts
  // Use: import { WorkflowAPI } from '@/lib/fluxturn';
  // Connector Methods - MOVED TO /lib/fluxturn/connector.ts
  // Use: import { ConnectorAPI } from '@/lib/fluxturn';

  // =====================================================================================
  // IMAGE EDITOR API METHODS
  // =====================================================================================

  async uploadImage(file: File, options?: {
    width?: number;
    height?: number;
    format?: string;
    quality?: number;
  }): Promise<ProcessedFileResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });
    }

    const response = await this.post('/images/upload', formData);
    return response?.data || response;
  }

  async getImageMetadata(imageId: string): Promise<ImageMetadata> {
    return this.get(`/images/${imageId}/metadata`);
  }

  async applyImageFilter(imageId: string, filter: string, options?: any): Promise<ProcessedFileResponse> {
    return this.post(`/images/${imageId}/filter`, { filter, options });
  }

  async resizeImage(imageId: string, width?: number, height?: number): Promise<ProcessedFileResponse> {
    return this.post(`/images/${imageId}/resize`, { width, height });
  }

  async cropImage(imageId: string, x: number, y: number, width: number, height: number): Promise<ProcessedFileResponse> {
    return this.post(`/images/${imageId}/crop`, { x, y, width, height });
  }

  async rotateImage(imageId: string, degrees: number): Promise<ProcessedFileResponse> {
    return this.post(`/images/${imageId}/rotate`, { degrees });
  }

  async saveBase64Image(data: {
    imageData: string;
    filename: string;
    format: 'png' | 'jpg' | 'jpeg' | 'webp';
    quality?: number;
  }): Promise<ProcessedFileResponse> {
    return this.post('/images/save-base64', data);
  }

  async aiEditImages(data: {
    images: Array<{
      imageData: string;
      imageId: string;
    }>;
    editType: string;
    intensity?: number;
    parameters?: Record<string, any>;
    outputFormat?: string;
    quality?: number;
    parallel?: boolean;
  }): Promise<ProcessedFileResponse[]> {
    return this.post('/images/ai-edit', data);
  }

  async aiEditImageFile(file: File, options: {
    editType: 'enhance' | 'denoise' | 'upscale' | 'colorize' | 'style_transfer' | 'remove_background' | 'face_enhance' | 'auto_adjust';
    intensity?: number;
    parameters?: Record<string, any>;
    outputFormat?: 'jpeg' | 'png' | 'webp';
    quality?: number;
    parallel?: boolean;
  }): Promise<ProcessedFileResponse> {
    const formData = new FormData();
    formData.append('file', file);

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    return this.post('/images/ai-edit-upload', formData);
  }

  async removeBackground(data: {
    imageData: string;
    mode: 'auto' | 'manual';
    threshold?: number;
    color?: string;
  }): Promise<{ imageData: string; format: string }> {
    const response = await this.post('/images/remove-background', data);
    return response.data;
  }

  // =====================================================================================
  // VIDEO EDITOR API METHODS
  // =====================================================================================

  async uploadVideo(file: File, options?: {
    format?: string;
    width?: number;
    height?: number;
    quality?: number;
    framerate?: number;
  }): Promise<ProcessedFileResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });
    }

    const response = await this.post('/videos/upload', formData);
    return response?.data || response;
  }

  async getVideoInfo(videoId: string): Promise<VideoInfo> {
    return this.get(`/videos/${videoId}/info`);
  }

  async trimVideo(videoId: string, startTime: number, duration: number): Promise<ProcessedFileResponse> {
    return this.post(`/videos/${videoId}/trim`, { startTime, duration });
  }

  async compressVideo(videoId: string, options: {
    bitrate?: string;
    compressionLevel?: number;
  }): Promise<ProcessedFileResponse> {
    return this.post(`/videos/${videoId}/compress`, options);
  }

  async extractThumbnail(videoId: string, options?: {
    timestamp?: number;
    width?: number;
    height?: number;
  }): Promise<ProcessedFileResponse> {
    return this.post(`/videos/${videoId}/thumbnail`, options || {});
  }

  async exportVideo(exportData: {
    clips: any[];
    format: 'mp4' | 'mov' | 'webm' | 'avi' | 'mkv';
    quality: 'low' | 'medium' | 'high' | '4k';
    resolution: { width: number; height: number };
    framerate?: number;
    bitrate?: string;
    audioTracks?: any[];
    backgroundColor?: string;
    audioCodec?: 'auto' | 'aac' | 'mp3' | 'opus';
    videoCodec?: 'auto' | 'h264' | 'h265' | 'vp9';
  }): Promise<ProcessedFileResponse> {
    const response = await this.post('/videos/export', exportData);
    return response.data;
  }

  async aiEditVideoFrame(videoId: string, data: {
    frame: string;
    mask: number[];
    prompt: string;
    timestamp: number;
  }): Promise<ProcessedFileResponse> {
    const response = await this.post(`/videos/${videoId}/ai-edit`, data);
    return response.data;
  }

  async addTextOverlay(videoId: string, options: {
    text: string;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    position?: 'center' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    startTime?: number;
    duration?: number;
    fontFamily?: string;
    padding?: number;
  }): Promise<ProcessedFileResponse> {
    const response = await this.post(`/videos/${videoId}/text-overlay`, options);
    return response.data;
  }

  // =====================================================================================
  // PRESENTATION EDITOR API METHODS
  // =====================================================================================

  private buildTenantUrl(
    organizationId?: string,
    projectId?: string,
    appId?: string
  ): string {
    if (!organizationId || !projectId) {
      throw new Error('Multi-tenant context required: organizationId and projectId must be provided');
    }

    return `/org/${organizationId}/project/${projectId}/presentations`;
  }

  async createPresentation(data: {
    title: string;
    description?: string;
    template?: string;
  }, tenantContext?: {
    organizationId?: string;
    projectId?: string;
    appId?: string;
  }): Promise<Presentation> {
    const url = this.buildTenantUrl(
      tenantContext?.organizationId || this.organizationId || undefined,
      tenantContext?.projectId || this.projectId || undefined,
      tenantContext?.appId || this.appId || undefined
    );

    const response = await this.post(url, data);
    return response.data;
  }

  async getPresentation(presentationId: string, tenantContext?: {
    organizationId?: string;
    projectId?: string;
    appId?: string;
  }): Promise<Presentation> {
    const baseUrl = this.buildTenantUrl(
      tenantContext?.organizationId || this.organizationId || undefined,
      tenantContext?.projectId || this.projectId || undefined,
      tenantContext?.appId || this.appId || undefined
    );

    const response = await this.get(`${baseUrl}/${presentationId}`);
    return response.data;
  }

  async getAllPresentations(
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    },
    isAppSpecific?: boolean
  ): Promise<Presentation[]> {
    let url = this.buildTenantUrl(
      tenantContext?.organizationId || this.organizationId || undefined,
      tenantContext?.projectId || this.projectId || undefined,
      tenantContext?.appId || this.appId || undefined
    );

    const params = new URLSearchParams();
    if (isAppSpecific !== undefined) {
      if (isAppSpecific && (tenantContext?.appId || this.appId)) {
        params.append('appId', tenantContext?.appId || this.appId!);
      } else if (isAppSpecific === false) {
        params.append('appId', 'null');
      }
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await this.get(url);
    return response.data || [];
  }

  async deletePresentation(presentationId: string, tenantContext?: {
    organizationId?: string;
    projectId?: string;
    appId?: string;
  }): Promise<void> {
    const baseUrl = this.buildTenantUrl(
      tenantContext?.organizationId || this.organizationId || undefined,
      tenantContext?.projectId || this.projectId || undefined,
      tenantContext?.appId || this.appId || undefined
    );

    return this.delete(`${baseUrl}/${presentationId}`);
  }

  async addSlide(
    presentationId: string,
    slide: Omit<Slide, 'id'>,
    position?: number,
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<Presentation> {
    const baseUrl = this.buildTenantUrl(
      tenantContext?.organizationId || this.organizationId || undefined,
      tenantContext?.projectId || this.projectId || undefined,
      tenantContext?.appId || this.appId || undefined
    );

    const response = await this.post(`${baseUrl}/${presentationId}/slides`, {
      slide: {
        title: slide.title,
        content: slide.content,
        layout: slide.layout,
        background: slide.background,
        properties: slide.properties
      },
      position
    });
    return response.data;
  }

  async updateSlide(
    presentationId: string,
    slideId: string,
    slide: Partial<Slide>,
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<Presentation> {
    const baseUrl = this.buildTenantUrl(
      tenantContext?.organizationId || this.organizationId || undefined,
      tenantContext?.projectId || this.projectId || undefined,
      tenantContext?.appId || this.appId || undefined
    );

    const response = await this.put(`${baseUrl}/${presentationId}/slides`, {
      id: slideId,
      title: slide.title,
      content: slide.content,
      layout: slide.layout,
      background: slide.background,
      properties: slide.properties
    });
    return response.data;
  }

  async deleteSlide(
    presentationId: string,
    slideId: string,
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<Presentation> {
    const baseUrl = this.buildTenantUrl(
      tenantContext?.organizationId || this.organizationId || undefined,
      tenantContext?.projectId || this.projectId || undefined,
      tenantContext?.appId || this.appId || undefined
    );

    const response = await this.delete(`${baseUrl}/${presentationId}/slides/${slideId}`);
    return response.data;
  }

  async updateTheme(
    presentationId: string,
    theme: PresentationTheme,
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<Presentation> {
    const baseUrl = this.buildTenantUrl(
      tenantContext?.organizationId || this.organizationId || undefined,
      tenantContext?.projectId || this.projectId || undefined,
      tenantContext?.appId || this.appId || undefined
    );

    const response = await this.put(`${baseUrl}/${presentationId}/theme`, theme);
    return response.data;
  }

  async exportPresentation(
    presentationId: string,
    format?: 'pdf' | 'pptx' | 'html' | 'json' | 'images',
    options?: {
      includeAnimations?: boolean;
      imageQuality?: number;
    },
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<{ data: any; filename: string; mimeType: string }> {
    const baseUrl = this.buildTenantUrl(
      tenantContext?.organizationId || this.organizationId || undefined,
      tenantContext?.projectId || this.projectId || undefined,
      tenantContext?.appId || this.appId || undefined
    );

    const response = await this.post(`${baseUrl}/${presentationId}/export`, {
      format: format || 'json',
      includeAnimations: options?.includeAnimations,
      imageQuality: options?.imageQuality
    });
    return response.data;
  }

  async getAvailableThemes(tenantContext?: {
    organizationId?: string;
    projectId?: string;
    appId?: string;
  }): Promise<PresentationTheme[]> {
    const orgId = tenantContext?.organizationId || this.organizationId;
    const projId = tenantContext?.projectId || this.projectId;

    const themesUrl = `/org/${orgId}/project/${projId}/themes`;
    const response = await this.get(themesUrl);
    return response.data;
  }

  async getAvailableTemplates(tenantContext?: {
    organizationId?: string;
    projectId?: string;
    appId?: string;
  }): Promise<Array<{
    id: string;
    name: string;
    description: string;
    slides: Partial<Slide>[];
    theme: string;
    category?: string;
  }>> {
    const orgId = tenantContext?.organizationId || this.organizationId;
    const projId = tenantContext?.projectId || this.projectId;

    const templatesUrl = `/org/${orgId}/project/${projId}/templates`;
    const response = await this.get(templatesUrl);
    return response.data;
  }

  async createPresentationFromTemplate(
    templateId: string,
    data: {
      title: string;
      description?: string;
    },
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<Presentation> {
    const baseUrl = this.buildTenantUrl(
      tenantContext?.organizationId || this.organizationId || undefined,
      tenantContext?.projectId || this.projectId || undefined,
      tenantContext?.appId || this.appId || undefined
    );

    const response = await this.post(`${baseUrl}/from-template/${templateId}`, data);
    return response.data;
  }

  async applyTemplate(
    presentationId: string,
    templateId: string,
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<Presentation> {
    const baseUrl = this.buildTenantUrl(
      tenantContext?.organizationId || this.organizationId || undefined,
      tenantContext?.projectId || this.projectId || undefined,
      tenantContext?.appId || this.appId || undefined
    );

    const response = await this.put(`${baseUrl}/${presentationId}/apply-template/${templateId}`);
    return response.data;
  }

  // =====================================================================================
  // STORAGE API METHODS
  // =====================================================================================

  async uploadAsset(
    file: File,
    options: {
      bucket?: string;
      isPublic?: boolean;
      metadata?: any;
    } = {},
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<any> {
    const bucket = options.bucket || 'presentations';

    const formData = new FormData();
    formData.append('file', file);
    if (options.isPublic !== undefined) {
      formData.append('public', String(options.isPublic));
    }
    if (options.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }

    return this.post(`/storage/buckets/${bucket}/upload`, formData);
  }

  async listStorageFiles(
    query?: {
      prefix?: string;
      contentType?: string;
      limit?: number;
      offset?: number;
    },
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<any> {
    const params = new URLSearchParams();
    if (query?.prefix) params.append('prefix', query.prefix);
    if (query?.contentType) params.append('contentType', query.contentType);
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.offset) params.append('offset', String(query.offset));

    const queryString = params.toString();
    const url = queryString ? `/storage/files?${queryString}` : '/storage/files';
    return this.get(url);
  }

  async getStorageFile(
    fileId: string,
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<any> {
    return this.get(`/storage/files/${fileId}`);
  }

  async deleteStorageFile(
    fileId: string,
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<void> {
    return this.delete(`/storage/files/${fileId}`);
  }

  async getStorageSignedUrl(
    fileId: string,
    expiresIn?: number,
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<string> {
    const params = new URLSearchParams();
    if (expiresIn) params.append('expires', String(expiresIn));

    const queryString = params.toString();
    const url = queryString
      ? `/storage/signed-url/${fileId}?${queryString}`
      : `/storage/signed-url/${fileId}`;

    const response = await this.get(url);
    return response.url;
  }

  async copyStorageFile(
    fileId: string,
    filename: string,
    tenantContext?: {
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ): Promise<any> {
    return this.post(`/storage/files/${fileId}/copy`, { filename });
  }

  async getTenantContext(): Promise<{
    organizationId?: string;
    projectId?: string;
    appId?: string;
  }> {
    return {
      organizationId: this.organizationId || undefined,
      projectId: this.projectId || undefined,
      appId: this.appId || undefined
    };
  }

  async downloadFile(url: string): Promise<Blob> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    const response = await fetch(fullUrl, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new ApiErrorResponse(
        `Download failed: ${response.statusText}`,
        response.status
      );
    }

    return response.blob();
  }

  // AI Image Edit method
  async aiImageEdit(params: {
    prompt: string;
    imageUrl?: string;
    imageData?: string;
    mask?: string;
    strength?: number;
    steps?: number;
    guidance?: number;
  }): Promise<any> {
    return this.post('/ai/image/edit', params);
  }

  // Refresh token methods
  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  setRefreshToken(token: string | null): void {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('refreshToken', token);
      } else {
        localStorage.removeItem('refreshToken');
      }
    }
  }

  async refreshAccessToken(): Promise<{ accessToken: string; refreshToken?: string }> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.post('/auth/refresh', { refreshToken });

    if (response.accessToken) {
      this.setToken(response.accessToken);
    }
    if (response.refreshToken) {
      this.setRefreshToken(response.refreshToken);
    }

    return response;
  }

  // Workflow AI methods
  async analyzePrompt(params: {
    prompt: string;
    conversationId: string;
  }): Promise<{
    understanding: string;
    plan: string[];
    estimatedNodes: number;
    requiredConnectors?: string[];
    confidence?: number;
  }> {
    return this.post("/workflow/analyze-prompt", params);
  }

  // 🆕 NEW: Multi-agent workflow generation (95% accuracy, 75% cheaper)
  async generateWorkflowWithAgents(params: {
    prompt: string;
    availableConnectors?: string[];
  }): Promise<{
    success: boolean;
    workflow?: {
      name: string;
      nodes: any[];
      connections: any[];
    };
    confidence: number;
    analysis?: {
      intent: any;
      connectors: any;
      reasoning: string;
      steps: string[];
    };
    error?: string;
  }> {
    return this.post("/workflow/ai/generate-with-agents", params);
  }

  // Chat with AI assistant (general Fluxturn questions, no workflow generation)
  async chatWithAssistant(params: {
    prompt: string;
    conversationId: string;
  }): Promise<{
    message: string;
    suggestions?: string[];
  }> {
    return this.post("/workflow/ai/chat", params);
  }

  async getTemplates(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    filter?: 'all' | 'popular' | 'verified' | 'new';
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.category) searchParams.append("category", params.category);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.filter) searchParams.append("filter", params.filter);

    const query = searchParams.toString();
    return this.get(`/workflow/templates${query ? `?${query}` : ""}`);
  }

  async createTemplate(template: any): Promise<any> {
    return this.post("/workflow/templates", template);
  }

  // Conversations Methods
  async createConversation(params: {
    title?: string;
    workflow_id?: string;
    project_id?: string;
    app_id?: string;
    initial_messages?: any[];
    organizationId?: string;
    projectId?: string;
    appId?: string;
  }): Promise<any> {
    if (params.organizationId) this.setOrganizationId(params.organizationId);
    if (params.projectId) this.setProjectId(params.projectId);
    if (params.appId) this.setAppId(params.appId);

    // Convert camelCase to snake_case and only send valid DTO fields
    const requestBody: any = {
      title: params.title,
      workflow_id: params.workflow_id,
      organization_id: params.organizationId, // Map camelCase to snake_case
      project_id: params.project_id || params.projectId, // Map camelCase to snake_case
      app_id: params.app_id || params.appId, // Map camelCase to snake_case
      initial_messages: params.initial_messages,
    };

    // Remove undefined, null, and empty string fields
    Object.keys(requestBody).forEach(key => {
      if (requestBody[key] === undefined || requestBody[key] === null || requestBody[key] === '') {
        delete requestBody[key];
      }
    });

    return this.post("/conversations", requestBody);
  }

  async getConversations(params?: {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    status?: string;
    workflow_id?: string;
    project_id?: string;
    organizationId?: string;
    projectId?: string;
    appId?: string;
  }): Promise<any> {
    if (params?.organizationId) this.setOrganizationId(params.organizationId);
    if (params?.projectId) this.setProjectId(params.projectId);
    if (params?.appId) this.setAppId(params.appId);

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.sort_by) searchParams.append("sort_by", params.sort_by);
    if (params?.sort_order) searchParams.append("sort_order", params.sort_order);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.workflow_id) searchParams.append("workflow_id", params.workflow_id);
    if (params?.project_id) searchParams.append("project_id", params.project_id);

    const query = searchParams.toString();
    return this.get(`/conversations${query ? `?${query}` : ""}`);
  }

  async getConversation(conversationId: string, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) this.setOrganizationId(organizationId);
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.get(`/conversations/${conversationId}`);
  }

  async updateConversation(conversationId: string, params: {
    title?: string;
    status?: string;
    context?: any;
  }, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) this.setOrganizationId(organizationId);
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.put(`/conversations/${conversationId}`, params);
  }

  async deleteConversation(conversationId: string, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) this.setOrganizationId(organizationId);
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.delete(`/conversations/${conversationId}`);
  }

  async hardDeleteConversation(conversationId: string, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) this.setOrganizationId(organizationId);
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.delete(`/conversations/${conversationId}/hard`);
  }

  async addMessageToConversation(conversationId: string, message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: any;
  }, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) this.setOrganizationId(organizationId);
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.post(`/conversations/${conversationId}/messages`, message);
  }

  async getConversationMessages(conversationId: string, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) this.setOrganizationId(organizationId);
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.get(`/conversations/${conversationId}/messages`);
  }

  async clearConversationMessages(conversationId: string, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) this.setOrganizationId(organizationId);
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.delete(`/conversations/${conversationId}/messages`);
  }

  async updateConversationWorkflow(conversationId: string, workflow: any, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) this.setOrganizationId(organizationId);
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.put(`/conversations/${conversationId}/workflow`, { workflow });
  }

  async detectConversationIntent(conversationId: string, message: string, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) this.setOrganizationId(organizationId);
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.post(`/conversations/${conversationId}/detect-intent`, { message });
  }

  async generateChatResponse(conversationId: string, message: string, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) this.setOrganizationId(organizationId);
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.post(`/conversations/${conversationId}/chat`, { message });
  }

  async autoConfigureConnector(conversationId: string, connector: string, credentials: Record<string, string>, organizationId?: string, projectId?: string, appId?: string): Promise<any> {
    if (organizationId) this.setOrganizationId(organizationId);
    if (projectId) this.setProjectId(projectId);
    if (appId) this.setAppId(appId);

    return this.post(`/conversations/${conversationId}/auto-configure-connector`, {
      connector,
      credentials,
    });
  }

  // Pre-registration for marketing
  async preRegister(data: { email: string }) {
    return this.post('/auth/pre-register', data);
  }

  // ============= DATABASE BROWSER API =============

  // Connection Management
  async getDatabaseConnections(organizationId: string, projectId: string, params?: { database_type?: string; status?: string; limit?: number; offset?: number }) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    const searchParams = new URLSearchParams();
    if (params?.database_type) searchParams.append('database_type', params.database_type);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    const query = searchParams.toString();
    return this.get(`/database-browser/connections${query ? `?${query}` : ''}`);
  }

  async getDatabaseConnection(connectionId: string, organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.get(`/database-browser/connections/${connectionId}`);
  }

  async createDatabaseConnection(data: {
    name: string;
    description?: string;
    database_type: 'postgresql' | 'mysql';
    config: { host: string; port: number; database: string; ssl_enabled?: boolean; connection_timeout?: number; pool_size?: number };
    credentials: { user: string; password: string };
  }, organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.post('/database-browser/connections', data);
  }

  async updateDatabaseConnection(connectionId: string, data: {
    name?: string;
    description?: string;
    config?: { host: string; port: number; database: string; ssl_enabled?: boolean; connection_timeout?: number; pool_size?: number };
    credentials?: { user: string; password: string };
    is_active?: boolean;
  }, organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.put(`/database-browser/connections/${connectionId}`, data);
  }

  async deleteDatabaseConnection(connectionId: string, organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.delete(`/database-browser/connections/${connectionId}`);
  }

  async testDatabaseConnection(connectionId: string, organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.post(`/database-browser/connections/${connectionId}/test`, {});
  }

  // Schema Browsing
  async getDatabaseSchemas(connectionId: string, organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.get(`/database-browser/connections/${connectionId}/schemas`);
  }

  async getDatabaseTables(connectionId: string, schema: string = 'public', organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.get(`/database-browser/connections/${connectionId}/tables?schema=${encodeURIComponent(schema)}`);
  }

  async getDatabaseTableColumns(connectionId: string, table: string, schema: string = 'public', organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.get(`/database-browser/connections/${connectionId}/tables/${encodeURIComponent(table)}/columns?schema=${encodeURIComponent(schema)}`);
  }

  async getDatabaseTableIndexes(connectionId: string, table: string, schema: string = 'public', organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.get(`/database-browser/connections/${connectionId}/tables/${encodeURIComponent(table)}/indexes?schema=${encodeURIComponent(schema)}`);
  }

  async getDatabaseTableForeignKeys(connectionId: string, table: string, schema: string = 'public', organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.get(`/database-browser/connections/${connectionId}/tables/${encodeURIComponent(table)}/foreign-keys?schema=${encodeURIComponent(schema)}`);
  }

  async getDatabaseTableStructure(connectionId: string, table: string, schema: string = 'public', organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.get(`/database-browser/connections/${connectionId}/tables/${encodeURIComponent(table)}/structure?schema=${encodeURIComponent(schema)}`);
  }

  // Data Operations
  async getDatabaseTableRows(connectionId: string, table: string, params: {
    schema?: string;
    columns?: string;
    limit?: number;
    offset?: number;
    order_by?: string;
  }, organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    const searchParams = new URLSearchParams();
    if (params?.schema) searchParams.append('schema', params.schema);
    if (params?.columns) searchParams.append('columns', params.columns);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.order_by) searchParams.append('order_by', params.order_by);
    const query = searchParams.toString();
    return this.get(`/database-browser/connections/${connectionId}/tables/${encodeURIComponent(table)}/rows${query ? `?${query}` : ''}`);
  }

  async insertDatabaseRows(connectionId: string, table: string, data: {
    schema: string;
    data: Record<string, any>[];
    returning?: string;
  }, organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.post(`/database-browser/connections/${connectionId}/tables/${encodeURIComponent(table)}/rows`, data);
  }

  async updateDatabaseRows(connectionId: string, table: string, data: {
    schema: string;
    data: Record<string, any>;
    where: Record<string, any>;
    returning?: string;
  }, organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.put(`/database-browser/connections/${connectionId}/tables/${encodeURIComponent(table)}/rows`, data);
  }

  async deleteDatabaseRows(connectionId: string, table: string, data: {
    schema: string;
    where: Record<string, any>;
    returning?: string;
  }, organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.request(`/database-browser/connections/${connectionId}/tables/${encodeURIComponent(table)}/rows`, {
      method: 'DELETE',
      body: JSON.stringify(data)
    });
  }

  // Raw Query Execution
  async executeDatabaseQuery(connectionId: string, data: { query: string; params?: any[]; timeout?: number }, organizationId: string, projectId: string) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    return this.post(`/database-browser/connections/${connectionId}/query`, data);
  }

  async getDatabaseQueryHistory(connectionId: string, organizationId: string, projectId: string, params?: { limit?: number; offset?: number }) {
    this.setOrganizationId(organizationId);
    this.setProjectId(projectId);
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    const query = searchParams.toString();
    return this.get(`/database-browser/connections/${connectionId}/query/history${query ? `?${query}` : ''}`);
  }

}

export const api = new ApiClient();
export const apiClient = api; // For compatibility
export default api;

// Utility function to convert image URL to data URL (replacement for corsHelper)
export async function imageUrlToDataUrl(url: string): Promise<string> {
  try {
    // If it's already a data URL, return it
    if (url.startsWith('data:')) {
      return url;
    }

    // Use the API client to download the image with proper headers
    const blob = await api.downloadFile(url);

    // Convert blob to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to data URL'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image URL to data URL:', error);
    throw error;
  }
}

// Re-export everything (not just types) from sub-modules
export * from './api/imageProjects';
export * from './api/storage';