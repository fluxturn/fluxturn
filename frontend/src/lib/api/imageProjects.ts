import { api } from '../api';

// Types for image project API
export interface CreateImageProjectRequest {
  name: string;
  projectId: string;
  thumbnailUrl?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface ImageProject {
  id: string;
  name: string;
  projectId: string;
  thumbnailUrl?: string;
  canvasWidth: number;
  canvasHeight: number;
  layerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImageProjectDetail extends ImageProject {
  layers?: any[]; // Will be defined later when implementing layers
  filters?: any; // Will be defined later when implementing filters
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedImageProjectsResponse {
  data: ImageProject[];
  pagination: PaginationInfo;
}

// Image Projects API Service
export class ImageProjectsApi {
  /**
   * Create a new image project
   */
  async createImageProject(
    data: CreateImageProjectRequest,
    context: {
      organizationId: string;
      projectId: string;
      appId?: string;
    }
  ): Promise<ImageProject> {
    // Set the context in the API client (FluxTurn pattern)
    api.setOrganizationId(context.organizationId);
    api.setProjectId(context.projectId);
    if (context.appId) {
      api.setAppId(context.appId);
    }

    // Use the new /api/v1/content API for creating image projects
    const response = await api.request('/content', {
      method: 'POST',
      body: JSON.stringify({
        // Required fields for content API
        contentType: 'image',  // Content type for image projects
        content: {
          // Image project specific data
          name: data.name,
          projectId: data.projectId,
          canvasWidth: data.canvasWidth || 1920,
          canvasHeight: data.canvasHeight || 1080,
          thumbnailUrl: data.thumbnailUrl,
          layers: [],  // Initialize with empty layers
          filters: {},
          settings: {}
        },

        // Optional fields
        title: data.name,  // Use project name as title
        source: 'image-editor',
        sourceDetails: {
          editor: 'imagitar-image-editor',
          version: '1.0.0',
          browser: navigator.userAgent
        },
        parameters: {
          format: 'image-project',
          canvasWidth: data.canvasWidth || 1920,
          canvasHeight: data.canvasHeight || 1080,
        },
        metadata: {
          type: 'image-project',
          projectId: data.projectId,
          thumbnailUrl: data.thumbnailUrl,
          layerCount: 0,
          createdFrom: 'web-app'
        },
        status: 'active'
      }),
    });

    // Transform the response to match ImageProject interface
    const contentData = (response as any).data || response;

    // Map content API response to ImageProject format
    const imageProject: ImageProject = {
      id: contentData.id,
      name: contentData.title || contentData.content.name,
      projectId: contentData.projectId || data.projectId,
      thumbnailUrl: contentData.metadata?.thumbnailUrl || contentData.content?.thumbnailUrl,
      canvasWidth: contentData.parameters?.canvasWidth || contentData.content?.canvasWidth || 1920,
      canvasHeight: contentData.parameters?.canvasHeight || contentData.content?.canvasHeight || 1080,
      layerCount: contentData.metadata?.layerCount || 0,
      createdAt: contentData.createdAt,
      updatedAt: contentData.updatedAt
    };

    return imageProject;
  }

  /**
   * Get image projects for a project (list) with pagination
   */
  async getImageProjects(
    projectId: string,
    context: {
      organizationId: string;
      projectId: string;
      appId?: string;
    },
    options: {
      page?: number;
      limit?: number;
      appSpecific?: boolean; // Add option to filter app-specific projects
    } = {}
  ): Promise<PaginatedImageProjectsResponse> {
    // Set the context in the API client (FluxTurn pattern)
    api.setOrganizationId(context.organizationId);
    api.setProjectId(context.projectId);
    if (context.appId) {
      api.setAppId(context.appId);
    }

    // Build query parameters for content API
    const params = new URLSearchParams();
    params.append('contentType', 'image');  // Filter by image content type
    params.append('page', String(options.page || 1));
    params.append('limit', String(options.limit || 10));

    // Add app filtering based on context
    if (options.appSpecific && context.appId) {
      // For app-specific modal: fetch only projects with this specific appId
      params.append('appId', context.appId);
    } else if (options.appSpecific === false) {
      // For regular modal: fetch only projects without appId (project-level)
      params.append('appId', 'null');
    }

    // Use the new /api/v1/content API to get image projects
    const response = await api.request(`/content?${params}`, {
      method: 'GET',
    }) as any;

    // Transform content API response to ImageProject format
    const responseData = (response as any);

    if (responseData?.success && responseData?.data && Array.isArray(responseData.data)) {
      // Map content items to ImageProject format
      const imageProjects: ImageProject[] = responseData.data.map((item: any) => ({
        id: item.id,
        name: item.title || item.content?.name || 'Untitled Project',
        projectId: item.project_id || item.content?.projectId || projectId,
        thumbnailUrl: item.metadata?.thumbnailUrl || item.content?.thumbnailUrl,
        canvasWidth: item.parameters?.canvasWidth || item.content?.canvasWidth || 1920,
        canvasHeight: item.parameters?.canvasHeight || item.content?.canvasHeight || 1080,
        layerCount: item.metadata?.layerCount || item.content?.layers?.length || 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      return {
        data: imageProjects,
        pagination: {
          page: responseData.pagination?.page || 1,
          limit: responseData.pagination?.limit || 10,
          total: responseData.pagination?.totalItems || 0,
          totalPages: responseData.pagination?.totalPages || 0,
          hasNext: responseData.pagination?.hasNext || false,
          hasPrevious: responseData.pagination?.hasPrevious || false
        }
      };
    }

    // Fallback for unexpected response format
    return {
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false
      }
    };
  }

  /**
   * Get detailed image project data
   */
  async getImageProjectDetail(
    id: string,
    context: {
      organizationId: string;
      projectId: string;
      appId?: string;
    }
  ): Promise<ImageProjectDetail> {
    // Set the context in the API client (FluxTurn pattern)
    api.setOrganizationId(context.organizationId);
    api.setProjectId(context.projectId);
    if (context.appId) {
      api.setAppId(context.appId);
    }

    // Use the new /api/v1/content API to get image project detail
    const response = await api.request(`/content/${id}`, {
      method: 'GET',
    });

    // Transform content API response to ImageProjectDetail format
    const contentData = (response as any).data || response;

    const imageProjectDetail: ImageProjectDetail = {
      id: contentData.id,
      name: contentData.title || contentData.content?.name || 'Untitled Project',
      projectId: contentData.projectId || contentData.content?.projectId,
      thumbnailUrl: contentData.metadata?.thumbnailUrl || contentData.content?.thumbnailUrl,
      canvasWidth: contentData.parameters?.canvasWidth || contentData.content?.canvasWidth || 1920,
      canvasHeight: contentData.parameters?.canvasHeight || contentData.content?.canvasHeight || 1080,
      layerCount: contentData.metadata?.layerCount || contentData.content?.layers?.length || 0,
      createdAt: contentData.createdAt,
      updatedAt: contentData.updatedAt,
      // Additional detail fields
      layers: contentData.content?.layers || [],
      filters: contentData.content?.filters || {}
    };

    return imageProjectDetail;
  }

  /**
   * Update an image project
   */
  async updateImageProject(
    id: string,
    data: Partial<CreateImageProjectRequest>,
    context: {
      organizationId: string;
      projectId: string;
      appId?: string;
    }
  ): Promise<ImageProject> {
    // Set the context in the API client (FluxTurn pattern)
    api.setOrganizationId(context.organizationId);
    api.setProjectId(context.projectId);
    if (context.appId) {
      api.setAppId(context.appId);
    }

    // Prepare update data for content API
    const updateData: any = {};

    // Update title if name is provided
    if (data.name) {
      updateData.title = data.name;
    }

    // Update content fields
    if (data.name || data.thumbnailUrl || data.canvasWidth || data.canvasHeight) {
      updateData.content = {};
      if (data.name) updateData.content.name = data.name;
      if (data.thumbnailUrl) updateData.content.thumbnailUrl = data.thumbnailUrl;
      if (data.canvasWidth) updateData.content.canvasWidth = data.canvasWidth;
      if (data.canvasHeight) updateData.content.canvasHeight = data.canvasHeight;
    }

    // Update parameters
    if (data.canvasWidth || data.canvasHeight) {
      updateData.parameters = {};
      if (data.canvasWidth) updateData.parameters.canvasWidth = data.canvasWidth;
      if (data.canvasHeight) updateData.parameters.canvasHeight = data.canvasHeight;
    }

    // Update metadata
    if (data.thumbnailUrl) {
      updateData.metadata = {
        thumbnailUrl: data.thumbnailUrl
      };
    }

    // Use the new /api/v1/content API to update image project
    const response = await api.request(`/content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    // Transform content API response to ImageProject format
    const contentData = (response as any).data || response;

    const imageProject: ImageProject = {
      id: contentData.id,
      name: contentData.title || contentData.content?.name || 'Untitled Project',
      projectId: contentData.projectId || contentData.content?.projectId || context.projectId,
      thumbnailUrl: contentData.metadata?.thumbnailUrl || contentData.content?.thumbnailUrl,
      canvasWidth: contentData.parameters?.canvasWidth || contentData.content?.canvasWidth || 1920,
      canvasHeight: contentData.parameters?.canvasHeight || contentData.content?.canvasHeight || 1080,
      layerCount: contentData.metadata?.layerCount || contentData.content?.layers?.length || 0,
      createdAt: contentData.createdAt,
      updatedAt: contentData.updatedAt
    };

    return imageProject;
  }

  /**
   * Delete an image project
   */
  async deleteImageProject(
    id: string,
    context: {
      organizationId: string;
      projectId: string;
      appId?: string;
    }
  ): Promise<void> {
    // Set the context in the API client (FluxTurn pattern)
    api.setOrganizationId(context.organizationId);
    api.setProjectId(context.projectId);
    if (context.appId) {
      api.setAppId(context.appId);
    }

    // Use the new /api/v1/content API to delete image project
    await api.request(`/content/${id}`, {
      method: 'DELETE',
    });
  }
}

// Create singleton instance
export const imageProjectsApi = new ImageProjectsApi();