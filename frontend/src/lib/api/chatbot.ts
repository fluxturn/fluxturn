import { api } from '../api';

// =================== TYPES ===================

export interface ChatbotConfig {
  id: string;
  name: string;
  enabled: boolean;
  welcomeMessage: string;
  placeholder: string;
  primaryColor: string;
  secondaryColor: string;
  textColor?: string;
  avatarUrl?: string;
  position: string;
  model: string;
  temperature: number;
  maxTokens: number;
  language: string;
  enableMultilingual: boolean;
  enableFileUpload: boolean;
  enableVoice: boolean;
  customInstructions?: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Conversation {
  id: string;
  sessionId: string;
  status: 'active' | 'pending_agent' | 'assigned' | 'resolved';
  priority: 'low' | 'normal' | 'high';
  lastActivityAt: string;
  assignedAgent?: Agent;
  messages: Message[];
  customer?: {
    name: string;
    email?: string;
  };
  tags: string[];
  sentimentScore?: number;
  handoffReason?: string;
  chatbotConfigId: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  createdAt: string;
  isAgentMessage?: boolean;
  agent?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  tokens?: number;
  language?: string;
  sources?: unknown[];
  feedback?: string;
  metadata?: Record<string, unknown>;
}

export interface Agent {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  status: 'online' | 'away' | 'offline';
  isAvailable: boolean;
  currentChatCount: number;
  maxConcurrentChats: number;
  skills: string[];
  languages: string[];
}

// =================== CHATBOT CONFIG API ===================

export interface CreateChatbotConfigDto {
  name: string;
  description?: string;
  type: 'customer_support' | 'sales_assistant' | 'knowledge_base' | 'general';
  systemPrompt: string;
  welcomeMessage?: string;
  isEnabled?: boolean;
  aiConfig?: Record<string, unknown>;
  tags?: string[];
  uiConfig?: Record<string, unknown>;
}

export type UpdateChatbotConfigDto = Partial<CreateChatbotConfigDto>

export const chatbotConfigApi = {
  // Get chatbot configurations by context
  getConfigs: async (organizationId?: string, projectId?: string, appId?: string, limit = 50, offset = 0): Promise<{ data: ChatbotConfig[]; total: number }> => {
    // Set context in API client
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    return api.get(`/chatbot/configs?${params}`);
  },

  // Create new chatbot configuration
  createConfig: async (data: CreateChatbotConfigDto): Promise<{ data: ChatbotConfig }> => {
    return api.post('/chatbot/configs', data);
  },

  // Update chatbot configuration
  updateConfig: async (id: string, data: UpdateChatbotConfigDto): Promise<{ data: ChatbotConfig }> => {
    return api.patch(`/chatbot/configs/${id}`, data);
  },

  // Delete chatbot configuration
  deleteConfig: async (id: string): Promise<{ success: boolean }> => {
    return api.delete(`/chatbot/configs/${id}`);
  },
};

// =================== CONVERSATION API ===================

export interface CreateConversationDto {
  chatbotConfigId: string;
  sessionId?: string;
  userId?: string;
  initialMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface GetConversationsParams {
  chatbotConfigId?: string;
  userId?: string;
  status?: 'active' | 'pending_agent' | 'assigned' | 'resolved';
  limit?: number;
  offset?: number;
}

export const conversationApi = {
  // Get conversations by context
  getConversations: async (organizationId?: string, projectId?: string, appId?: string, params?: GetConversationsParams): Promise<{ data: Conversation[]; total: number }> => {
    // Set context in API client
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const searchParams = new URLSearchParams();
    if (params?.chatbotConfigId) searchParams.append('chatbotConfigId', params.chatbotConfigId);
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    return api.get(`/chatbot/conversations?${searchParams}`);
  },

  // Create new conversation
  createConversation: async (data: CreateConversationDto): Promise<{ data: Conversation }> => {
    return api.post('/chatbot/conversations', data);
  },
};

// =================== MESSAGE API ===================

export interface SendMessageDto {
  message: string; // Backend expects 'message' field
  content?: string; // Optional alias
  type?: 'text' | 'image' | 'file' | 'system';
  role?: 'user' | 'agent';
  isAgentMessage?: boolean;
  agentId?: string;
  attachments?: Array<{
    name: string;
    url: string;
    type?: string;
    size?: number;
  }>;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
  stream?: boolean;
}

export interface GetMessagesParams {
  role?: 'user' | 'assistant' | 'agent' | 'system';
  limit?: number;
  offset?: number;
}

export const messageApi = {
  // Get messages for a conversation
  getMessages: async (conversationId: string, params?: GetMessagesParams): Promise<{ data: Message[]; total: number }> => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    return api.get(`/chatbot/conversations/${conversationId}/messages?${searchParams}`);
  },

  // Send message in conversation
  sendMessage: async (conversationId: string, data: SendMessageDto): Promise<{ data: Message }> => {
    return api.post(`/chatbot/conversations/${conversationId}/messages`, data);
  },

  // Provide feedback for a message
  provideFeedback: async (messageId: string, feedback: { type: 'helpful' | 'not_helpful'; comment?: string }): Promise<{ success: boolean }> => {
    return api.post(`/chatbot/messages/${messageId}/feedback`, feedback);
  },
};

// =================== ANALYTICS API ===================

export interface ChatbotStatsParams {
  chatbotConfigId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ChatbotStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  averageResponseTime: number;
  resolutionRate: number;
  customerSatisfaction: number;
  topIntents?: Array<{ intent: string; count: number }>;
  languageDistribution?: Array<{ language: string; count: number }>;
  hourlyStats?: Array<{ hour: number; conversations: number; messages: number }>;
}

export const analyticsApi = {
  // Get chatbot analytics and statistics
  getStats: async (organizationId?: string, projectId?: string, appId?: string, params?: ChatbotStatsParams): Promise<{ data: ChatbotStats }> => {
    // Set context in API client
    if (organizationId) api.setOrganizationId(organizationId);
    if (projectId) api.setProjectId(projectId);
    if (appId) api.setAppId(appId);

    const searchParams = new URLSearchParams();
    if (params?.chatbotConfigId) searchParams.append('chatbotConfigId', params.chatbotConfigId);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    
    return api.get(`/chatbot/analytics/stats?${searchParams}`);
  },
};

// =================== LEGACY API FOR BACKWARDS COMPATIBILITY ===================

export const legacyChatbotApi = {
  // Send message (legacy endpoint)
  sendMessage: async (data: { message: string; sessionId: string; userId?: string; language?: string }): Promise<{ answer: string; sources: unknown[]; tokens: number }> => {
    return api.post('/chatbot/send', {
      message: data.message,
      metadata: {
        sessionId: data.sessionId,
        userId: data.userId,
        language: data.language
      }
    });
  },

  // Get conversation history (legacy endpoint)
  getHistory: async (sessionId: string, limit = 20): Promise<Message[]> => {
    const params = new URLSearchParams({ limit: limit.toString() });
    return api.get(`/chatbot/history/${sessionId}?${params}`);
  },
};

// =================== COMBINED API EXPORT ===================

export const chatbotApi = {
  config: chatbotConfigApi,
  conversations: conversationApi,
  messages: messageApi,
  analytics: analyticsApi,
  legacy: legacyChatbotApi,
};

export default chatbotApi;