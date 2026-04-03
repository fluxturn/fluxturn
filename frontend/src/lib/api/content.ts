/**
 * Content management API endpoints for Imagitar
 * Built on top of FluxTurn API client with CRUD operations and version management
 */

import { api as fluxturnApi } from "../api";
import type {
  ContentItem,
  ContentVersion,
  ContentCreateRequest,
  ContentUpdateRequest,
  ApiResponse,
  PaginatedResponse,
  SearchQuery,
  SearchResponse
} from '../../types/fluxturn';

// =============================================================================
// CONTENT MANAGEMENT ENDPOINTS
// =============================================================================

export const contentApi = {
  // =============================================================================
  // CONTENT CRUD OPERATIONS
  // =============================================================================

  /**
   * Create new content item
   */
  async createContent(data: ContentCreateRequest): Promise<ContentItem> {
    try {
      const response = await fluxturnApi.post<ApiResponse<ContentItem>>('/content', data);
      return ((response as any).data || response) as ContentItem;
    } catch (error: any) {
      if (error.statusCode === 400) {
        throw new Error('Invalid content data. Please check your input and try again.');
      }
      if (error.statusCode === 403) {
        throw new Error('You do not have permission to create content.');
      }
      throw error;
    }
  },

  /**
   * Get content item by ID
   */
  async getContent(contentId: string, includeVersions: boolean = false): Promise<ContentItem> {
    try {
      const params = new URLSearchParams();
      if (includeVersions) params.append('includeVersions', 'true');

      const query = params.toString();
      const response = await fluxturnApi.get<ApiResponse<ContentItem>>(
        `/content/${contentId}${query ? `?${query}` : ''}`
      );
      return ((response as any).data || response) as ContentItem;
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content not found.');
      }
      if (error.statusCode === 403) {
        throw new Error('You do not have permission to view this content.');
      }
      throw error;
    }
  },

  /**
   * Update content item
   */
  async updateContent(contentId: string, data: ContentUpdateRequest): Promise<ContentItem> {
    try {
      const response = await fluxturnApi.put<ApiResponse<ContentItem>>(`/content/${contentId}`, data);
      return ((response as any).data || response) as ContentItem;
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content not found.');
      }
      if (error.statusCode === 403) {
        throw new Error('You do not have permission to edit this content.');
      }
      if (error.statusCode === 409) {
        throw new Error('Content has been modified by another user. Please refresh and try again.');
      }
      throw error;
    }
  },

  /**
   * Delete content item
   */
  async deleteContent(contentId: string): Promise<void> {
    try {
      await fluxturnApi.delete(`/content/${contentId}`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content not found.');
      }
      if (error.statusCode === 403) {
        throw new Error('You do not have permission to delete this content.');
      }
      throw error;
    }
  },

  /**
   * List content items with filtering and pagination
   */
  async listContent(options?: {
    page?: number;
    limit?: number;
    type?: 'document' | 'image' | 'video' | 'audio' | 'template';
    status?: 'draft' | 'published' | 'archived';
    visibility?: 'public' | 'private' | 'shared';
    category?: string;
    tags?: string[];
    sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'version';
    sortOrder?: 'asc' | 'desc';
    search?: string;
    parentId?: string;
  }): Promise<PaginatedResponse<ContentItem>> {
    try {
      const params = new URLSearchParams();
      
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.type) params.append('type', options.type);
      if (options?.status) params.append('status', options.status);
      if (options?.visibility) params.append('visibility', options.visibility);
      if (options?.category) params.append('category', options.category);
      if (options?.tags) {
        options.tags.forEach(tag => params.append('tags', tag));
      }
      if (options?.sortBy) params.append('sortBy', options.sortBy);
      if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
      if (options?.search) params.append('search', options.search);
      if (options?.parentId) params.append('parentId', options.parentId);

      const query = params.toString();
      const response = await fluxturnApi.get<PaginatedResponse<ContentItem>>(
        `/content${query ? `?${query}` : ''}`
      );

      return ((response as any).data || response) as PaginatedResponse<ContentItem>;
    } catch (error: any) {
      // Return empty results on error
      // console.warn('Content list API failed, returning empty results:', error);
      return {
        data: [],
        total: 0,
        page: options?.page || 1,
        limit: options?.limit || 20,
        totalPages: 0
      };
    }
  },

  /**
   * Search content items
   */
  async searchContent(query: SearchQuery): Promise<SearchResponse<ContentItem>> {
    try {
      const response = await fluxturnApi.post<SearchResponse<ContentItem>>('/content/search', query);
      return ((response as any).data || response) as SearchResponse<ContentItem>;
    } catch (error: any) {
      // console.warn('Content search API failed, falling back to list with search:', error);
      
      // Fallback to list API with search parameter
      const listResponse = await this.listContent({
        search: query.q,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy as any,
        sortOrder: query.sortOrder
      });
      
      return {
        ...listResponse,
        query: query.q || '',
        filters: query.filters,
        facets: {}
      };
    }
  },

  // =============================================================================
  // VERSION MANAGEMENT
  // =============================================================================

  /**
   * Get content version history
   */
  async getContentVersions(contentId: string, options?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ContentVersion>> {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());

      const query = params.toString();
      const response = await fluxturnApi.get<PaginatedResponse<ContentVersion>>(
        `/content/${contentId}/versions${query ? `?${query}` : ''}`
      );

      return ((response as any).data || response) as PaginatedResponse<ContentVersion>;
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content not found.');
      }
      throw error;
    }
  },

  /**
   * Get specific content version
   */
  async getContentVersion(contentId: string, version: number): Promise<ContentVersion> {
    try {
      const response = await fluxturnApi.get<ApiResponse<ContentVersion>>(
        `/content/${contentId}/versions/${version}`
      );
      return ((response as any).data || response) as ContentVersion;
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content version not found.');
      }
      throw error;
    }
  },

  /**
   * Restore content to specific version
   */
  async restoreContentVersion(contentId: string, version: number, changeDescription?: string): Promise<ContentItem> {
    try {
      const response = await fluxturnApi.post<ApiResponse<ContentItem>>(
        `/content/${contentId}/versions/${version}/restore`,
        { changeDescription }
      );
      return ((response as any).data || response) as ContentItem;
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content or version not found.');
      }
      if (error.statusCode === 403) {
        throw new Error('You do not have permission to restore this content.');
      }
      throw error;
    }
  },

  /**
   * Compare two content versions
   */
  async compareVersions(contentId: string, fromVersion: number, toVersion: number): Promise<{
    diff: string;
    changes: Array<{
      type: 'added' | 'removed' | 'modified';
      field: string;
      oldValue?: any;
      newValue?: any;
    }>;
  }> {
    try {
      const response = await fluxturnApi.get<ApiResponse<any>>(
        `/content/${contentId}/versions/compare?from=${fromVersion}&to=${toVersion}`
      );
      return ((response as any).data || response) as { diff: string; changes: Array<{ type: 'added' | 'removed' | 'modified'; field: string; oldValue?: any; newValue?: any; }>; };
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content or versions not found.');
      }
      throw error;
    }
  },

  // =============================================================================
  // CONTENT ORGANIZATION
  // =============================================================================

  /**
   * Get content categories
   */
  async getCategories(): Promise<Array<{ name: string; count: number; description?: string }>> {
    try {
      const response = await fluxturnApi.get<ApiResponse<any>>('/content/categories');
      return ((response as any).data || response) as Array<{ name: string; count: number; description?: string }>;
    } catch (error: any) {
      // Return default categories if API fails
      return [
        { name: 'Documents', count: 0, description: 'Text documents and articles' },
        { name: 'Images', count: 0, description: 'Photos and graphics' },
        { name: 'Videos', count: 0, description: 'Video content' },
        { name: 'Templates', count: 0, description: 'Reusable templates' }
      ];
    }
  },

  /**
   * Get popular tags
   */
  async getTags(limit: number = 50): Promise<Array<{ name: string; count: number }>> {
    try {
      const response = await fluxturnApi.get<ApiResponse<any>>(`/content/tags?limit=${limit}`);
      return ((response as any).data || response) as Array<{ name: string; count: number }>;
    } catch (error: any) {
      // Return empty tags if API fails
      return [];
    }
  },

  /**
   * Get content hierarchy/tree structure
   */
  async getContentTree(parentId?: string): Promise<Array<ContentItem & { children?: ContentItem[] }>> {
    try {
      const params = new URLSearchParams();
      if (parentId) params.append('parentId', parentId);

      const query = params.toString();
      const response = await fluxturnApi.get<ApiResponse<any>>(
        `/content/tree${query ? `?${query}` : ''}`
      );
      return ((response as any).data || response) as Array<ContentItem & { children?: ContentItem[] }>;
    } catch (error: any) {
      // console.warn('Content tree API failed, returning flat list:', error);
      
      // Fallback to flat list
      const listResponse = await this.listContent({ parentId });
      return listResponse.data;
    }
  },

  // =============================================================================
  // CONTENT SHARING & COLLABORATION
  // =============================================================================

  /**
   * Share content with users
   */
  async shareContent(contentId: string, data: {
    userIds?: string[];
    emails?: string[];
    permission: 'view' | 'edit' | 'admin';
    message?: string;
    expiresAt?: string;
  }): Promise<void> {
    try {
      await fluxturnApi.post(`/content/${contentId}/share`, data);
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content not found.');
      }
      if (error.statusCode === 403) {
        throw new Error('You do not have permission to share this content.');
      }
      throw error;
    }
  },

  /**
   * Get content sharing settings
   */
  async getContentSharing(contentId: string): Promise<{
    visibility: 'public' | 'private' | 'shared';
    sharedWith: Array<{
      userId?: string;
      email?: string;
      permission: string;
      sharedAt: string;
      expiresAt?: string;
    }>;
    publicUrl?: string;
  }> {
    try {
      const response = await fluxturnApi.get<ApiResponse<any>>(`/content/${contentId}/sharing`);
      return ((response as any).data || response) as { visibility: 'public' | 'private' | 'shared'; sharedWith: Array<{ userId?: string; email?: string; permission: string; sharedAt: string; expiresAt?: string; }>; publicUrl?: string; };
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content not found.');
      }
      throw error;
    }
  },

  /**
   * Update content sharing settings
   */
  async updateContentSharing(contentId: string, data: {
    visibility?: 'public' | 'private' | 'shared';
    allowPublicView?: boolean;
    allowPublicEdit?: boolean;
  }): Promise<void> {
    try {
      await fluxturnApi.patch(`/content/${contentId}/sharing`, data);
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content not found.');
      }
      if (error.statusCode === 403) {
        throw new Error('You do not have permission to change sharing settings.');
      }
      throw error;
    }
  },

  // =============================================================================
  // CONTENT OPERATIONS
  // =============================================================================

  /**
   * Duplicate content item
   */
  async duplicateContent(contentId: string, newTitle?: string): Promise<ContentItem> {
    try {
      const response = await fluxturnApi.post<ApiResponse<ContentItem>>(
        `/content/${contentId}/duplicate`,
        { newTitle }
      );
      return ((response as any).data || response) as ContentItem;
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content not found.');
      }
      throw error;
    }
  },

  /**
   * Move content to different parent/folder
   */
  async moveContent(contentId: string, newParentId?: string): Promise<ContentItem> {
    try {
      const response = await fluxturnApi.patch<ApiResponse<ContentItem>>(
        `/content/${contentId}/move`,
        { parentId: newParentId }
      );
      return ((response as any).data || response) as ContentItem;
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Content not found.');
      }
      throw error;
    }
  },

  /**
   * Archive content item
   */
  async archiveContent(contentId: string): Promise<ContentItem> {
    try {
      const response = await this.updateContent(contentId, { status: 'archived' });
      return response;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Publish content item
   */
  async publishContent(contentId: string): Promise<ContentItem> {
    try {
      const response = await this.updateContent(contentId, { status: 'published' });
      return response;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Get content analytics/stats
   */
  async getContentAnalytics(contentId: string, timeRange?: {
    startDate: string;
    endDate: string;
  }): Promise<{
    views: number;
    downloads: number;
    shares: number;
    edits: number;
    timeline: Array<{
      date: string;
      views: number;
      downloads: number;
    }>;
  }> {
    try {
      const params = new URLSearchParams();
      if (timeRange?.startDate) params.append('startDate', timeRange.startDate);
      if (timeRange?.endDate) params.append('endDate', timeRange.endDate);

      const query = params.toString();
      const response = await fluxturnApi.get<ApiResponse<any>>(
        `/content/${contentId}/analytics${query ? `?${query}` : ''}`
      );
      return ((response as any).data || response) as { views: number; downloads: number; shares: number; edits: number; timeline: Array<{ date: string; views: number; downloads: number; }>; };
    } catch (error: any) {
      // Return mock analytics if API fails
      return {
        views: 0,
        downloads: 0,
        shares: 0,
        edits: 1,
        timeline: []
      };
    }
  }
};

export default contentApi;