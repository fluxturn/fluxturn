import { apiClient } from '../api';
import type {
  SocialAccount,
  PostContent,
  CreatePostRequest,
  AIGenerateRequest,
  AIGeneratedPost,
  BulkPostRequest,
  TagSuggestion,
  PostAnalytics,
  MarketingCampaign,
  AIFieldGenerateRequest,
  ConnectSocialAccountRequest,
  SocialPlatform,
} from '../../types/marketing';

class MarketingApi {
  private api: typeof apiClient;

  constructor() {
    this.api = apiClient;
  }

  // =====================================================================================
  // SOCIAL ACCOUNTS MANAGEMENT
  // =====================================================================================

  async getSocialAccounts(projectId?: string, appId?: string): Promise<SocialAccount[]> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.get('/marketing/social-accounts');
  }

  async connectSocialAccount(
    data: ConnectSocialAccountRequest,
    projectId?: string,
    appId?: string
  ): Promise<SocialAccount> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post('/marketing/social-accounts/connect', data);
  }

  async disconnectSocialAccount(
    accountId: string,
    projectId?: string,
    appId?: string
  ): Promise<{ success: boolean }> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.delete(`/marketing/social-accounts/${accountId}`);
  }

  async refreshSocialAccount(
    accountId: string,
    projectId?: string,
    appId?: string
  ): Promise<SocialAccount> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post(`/marketing/social-accounts/${accountId}/refresh`, {});
  }

  async getSocialAccountsByPlatform(
    platform: SocialPlatform,
    projectId?: string,
    appId?: string
  ): Promise<SocialAccount[]> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.get(`/marketing/social-accounts/platform/${platform}`);
  }

  // =====================================================================================
  // POST MANAGEMENT
  // =====================================================================================

  async getPosts(
    filters?: {
      status?: string;
      platform?: SocialPlatform;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
    projectId?: string,
    appId?: string
  ): Promise<{ posts: PostContent[]; total: number; page: number; limit: number }> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.platform) params.append('platform', filters.platform);
    if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    return this.api.get(`/marketing/posts?${params}`);
  }

  async getPost(postId: string, projectId?: string, appId?: string): Promise<PostContent> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.get(`/marketing/posts/${postId}`);
  }

  async createPost(
    data: CreatePostRequest,
    projectId?: string,
    appId?: string
  ): Promise<PostContent> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post('/marketing/posts', data);
  }

  async updatePost(
    postId: string,
    data: Partial<CreatePostRequest>,
    projectId?: string,
    appId?: string
  ): Promise<PostContent> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.patch(`/marketing/posts/${postId}`, data);
  }

  async deletePost(
    postId: string,
    projectId?: string,
    appId?: string
  ): Promise<{ success: boolean }> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.delete(`/marketing/posts/${postId}`);
  }

  async publishPost(
    postId: string,
    projectId?: string,
    appId?: string
  ): Promise<PostContent> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post(`/marketing/posts/${postId}/publish`, {});
  }

  async schedulePost(
    postId: string,
    scheduledDate: Date,
    projectId?: string,
    appId?: string
  ): Promise<PostContent> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post(`/marketing/posts/${postId}/schedule`, { scheduledDate });
  }

  // =====================================================================================
  // BULK OPERATIONS
  // =====================================================================================

  async createBulkPosts(
    data: BulkPostRequest,
    projectId?: string,
    appId?: string
  ): Promise<{ posts: PostContent[]; successful: number; failed: number }> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post('/marketing/posts/bulk', data);
  }

  async publishBulkPosts(
    postIds: string[],
    projectId?: string,
    appId?: string
  ): Promise<{ successful: number; failed: number; results: any[] }> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post('/marketing/posts/bulk/publish', { postIds });
  }

  async deleteBulkPosts(
    postIds: string[],
    projectId?: string,
    appId?: string
  ): Promise<{ successful: number; failed: number }> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post('/marketing/posts/bulk/delete', { postIds });
  }

  // =====================================================================================
  // AI GENERATION
  // =====================================================================================

  async generatePostsWithAI(
    data: AIGenerateRequest,
    projectId?: string,
    appId?: string
  ): Promise<AIGeneratedPost[]> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post('/marketing/ai/generate-posts', data);
  }

  async generateFieldWithAI(
    data: AIFieldGenerateRequest,
    projectId?: string,
    appId?: string
  ): Promise<{ value: string | string[] }> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post('/marketing/ai/generate-field', data);
  }

  async generateTagsFromContent(
    content: string,
    platform?: SocialPlatform,
    projectId?: string,
    appId?: string
  ): Promise<TagSuggestion[]> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post('/marketing/ai/generate-tags', { content, platform });
  }

  async improveContent(
    content: string,
    platform: SocialPlatform,
    projectId?: string,
    appId?: string
  ): Promise<{ improved: string; suggestions: string[] }> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post('/marketing/ai/improve-content', { content, platform });
  }

  // =====================================================================================
  // MEDIA MANAGEMENT
  // =====================================================================================

  async uploadMedia(
    file: File,
    projectId?: string,
    appId?: string
  ): Promise<{ id: string; url: string; thumbnailUrl?: string; type: 'image' | 'video' }> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    const formData = new FormData();
    formData.append('file', file);

    return this.api.post('/marketing/media/upload', formData);
  }

  async uploadBulkMedia(
    files: File[],
    projectId?: string,
    appId?: string
  ): Promise<Array<{ id: string; url: string; thumbnailUrl?: string; type: 'image' | 'video' }>> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    return this.api.post('/marketing/media/upload/bulk', formData);
  }

  // =====================================================================================
  // ANALYTICS
  // =====================================================================================

  async getPostAnalytics(
    postId: string,
    projectId?: string,
    appId?: string
  ): Promise<PostAnalytics[]> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.get(`/marketing/posts/${postId}/analytics`);
  }

  async getCampaignAnalytics(
    campaignId: string,
    projectId?: string,
    appId?: string
  ): Promise<{
    totalPosts: number;
    publishedPosts: number;
    totalImpressions: number;
    totalEngagement: number;
    platformBreakdown: Record<SocialPlatform, number>;
  }> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.get(`/marketing/campaigns/${campaignId}/analytics`);
  }

  // =====================================================================================
  // CAMPAIGNS
  // =====================================================================================

  async getCampaigns(
    projectId?: string,
    appId?: string
  ): Promise<MarketingCampaign[]> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.get('/marketing/campaigns');
  }

  async createCampaign(
    data: {
      name: string;
      description?: string;
      startDate: Date;
      endDate: Date;
    },
    projectId?: string,
    appId?: string
  ): Promise<MarketingCampaign> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.post('/marketing/campaigns', data);
  }

  async updateCampaign(
    campaignId: string,
    data: Partial<{
      name: string;
      description?: string;
      startDate: Date;
      endDate: Date;
      status: 'active' | 'scheduled' | 'completed' | 'paused';
    }>,
    projectId?: string,
    appId?: string
  ): Promise<MarketingCampaign> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.patch(`/marketing/campaigns/${campaignId}`, data);
  }

  async deleteCampaign(
    campaignId: string,
    projectId?: string,
    appId?: string
  ): Promise<{ success: boolean }> {
    if (projectId) this.api.setProjectId(projectId);
    if (appId) this.api.setAppId(appId);

    return this.api.delete(`/marketing/campaigns/${campaignId}`);
  }
}

export const marketingApi = new MarketingApi();
