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
  layers?: unknown[]; // Will be defined later when implementing layers
  filters?: Record<string, unknown>; // Will be defined later when implementing filters
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
    const contentData = (response as unknown as { data?: Record<string, unknown> }).data || (response as Record<string, unknown>);
    const cdContent = contentData.content as Record<string, unknown> | undefined;
    const cdMetadata = contentData.metadata as Record<string, unknown> | undefined;
    const cdParameters = contentData.parameters as Record<string, unknown> | undefined;

    // Map content API response to ImageProject format
    const imageProject: ImageProject = {
      id: contentData.id as string,
      name: (contentData.title as string) || (cdContent?.name as string),
      projectId: (contentData.projectId as string) || data.projectId,
      thumbnailUrl: (cdMetadata?.thumbnailUrl as string | undefined) || (cdContent?.thumbnailUrl as string | undefined),
      canvasWidth: (cdParameters?.canvasWidth as number) || (cdContent?.canvasWidth as number) || 1920,
      canvasHeight: (cdParameters?.canvasHeight as number) || (cdContent?.canvasHeight as number) || 1080,
      layerCount: (cdMetadata?.layerCount as number) || 0,
      createdAt: contentData.createdAt as string,
      updatedAt: contentData.updatedAt as string
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
    }) as unknown;

    // Transform content API response to ImageProject format
    const responseData = response as { success?: boolean; data?: Array<Record<string, unknown>>; pagination?: { page?: number; limit?: number; totalItems?: number; totalPages?: number; hasNext?: boolean; hasPrevious?: boolean } };

    if (responseData?.success && responseData?.data && Array.isArray(responseData.data)) {
      // Map content items to ImageProject format
      const imageProjects: ImageProject[] = responseData.data.map((item) => {
        const content = item.content as Record<string, unknown> | undefined;
        const metadata = item.metadata as Record<string, unknown> | undefined;
        const parameters = item.parameters as Record<string, unknown> | undefined;
        return {
          id: item.id as string,
          name: (item.title as string) || (content?.name as string) || 'Untitled Project',
          projectId: (item.project_id as string) || (content?.projectId as string) || projectId,
          thumbnailUrl: (metadata?.thumbnailUrl as string | undefined) || (content?.thumbnailUrl as string | undefined),
          canvasWidth: (parameters?.canvasWidth as number) || (content?.canvasWidth as number) || 1920,
          canvasHeight: (parameters?.canvasHeight as number) || (content?.canvasHeight as number) || 1080,
          layerCount: (metadata?.layerCount as number) || (content?.layers as unknown[] | undefined)?.length || 0,
          createdAt: item.created_at as string,
          updatedAt: item.updated_at as string,
        };
      });

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
    const contentData = (response as unknown as { data?: Record<string, unknown> }).data || (response as Record<string, unknown>);
    const detContent = contentData.content as Record<string, unknown> | undefined;
    const detMetadata = contentData.metadata as Record<string, unknown> | undefined;
    const detParameters = contentData.parameters as Record<string, unknown> | undefined;

    const imageProjectDetail: ImageProjectDetail = {
      id: contentData.id as string,
      name: (contentData.title as string) || (detContent?.name as string) || 'Untitled Project',
      projectId: (contentData.projectId as string) || (detContent?.projectId as string),
      thumbnailUrl: (detMetadata?.thumbnailUrl as string | undefined) || (detContent?.thumbnailUrl as string | undefined),
      canvasWidth: (detParameters?.canvasWidth as number) || (detContent?.canvasWidth as number) || 1920,
      canvasHeight: (detParameters?.canvasHeight as number) || (detContent?.canvasHeight as number) || 1080,
      layerCount: (detMetadata?.layerCount as number) || (detContent?.layers as unknown[] | undefined)?.length || 0,
      createdAt: contentData.createdAt as string,
      updatedAt: contentData.updatedAt as string,
      // Additional detail fields
      layers: (detContent?.layers as unknown[]) || [],
      filters: (detContent?.filters as Record<string, unknown>) || {}
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
    const updateData: {
      title?: string;
      content?: Record<string, unknown>;
      parameters?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    } = {};

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
    const contentData = (response as unknown as { data?: Record<string, unknown> }).data || (response as Record<string, unknown>);
    const upContent = contentData.content as Record<string, unknown> | undefined;
    const upMetadata = contentData.metadata as Record<string, unknown> | undefined;
    const upParameters = contentData.parameters as Record<string, unknown> | undefined;

    const imageProject: ImageProject = {
      id: contentData.id as string,
      name: (contentData.title as string) || (upContent?.name as string) || 'Untitled Project',
      projectId: (contentData.projectId as string) || (upContent?.projectId as string) || context.projectId,
      thumbnailUrl: (upMetadata?.thumbnailUrl as string | undefined) || (upContent?.thumbnailUrl as string | undefined),
      canvasWidth: (upParameters?.canvasWidth as number) || (upContent?.canvasWidth as number) || 1920,
      canvasHeight: (upParameters?.canvasHeight as number) || (upContent?.canvasHeight as number) || 1080,
      layerCount: (upMetadata?.layerCount as number) || (upContent?.layers as unknown[] | undefined)?.length || 0,
      createdAt: contentData.createdAt as string,
      updatedAt: contentData.updatedAt as string
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