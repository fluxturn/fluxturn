import { api } from '../api';
import type {
  ImageProject,
  CreateImageProjectRequest,
  PaginatedImageProjectsResponse,
  ImageLibraryResponse,
  ImageAsset,
  ProcessedFileResponse,
} from './types';

export interface UpdateImageProjectRequest {
  name?: string;
  description?: string;
  coverImage?: string;
  tags?: string[];
}

export interface AddImageToProjectRequest {
  imageUrl: string;
  filename: string;
  metadata?: Record<string, unknown>;
}

export interface ImageProjectsListOptions {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
}

class ImageProjectsAPI {
  // List all image projects
  async listProjects(options?: ImageProjectsListOptions): Promise<PaginatedImageProjectsResponse> {
    const params = new URLSearchParams();

    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.search) params.append('search', options.search);
    if (options?.tags?.length) params.append('tags', options.tags.join(','));

    const queryString = params.toString();
    const url = queryString ? `/image-projects?${queryString}` : '/image-projects';

    return api.get<PaginatedImageProjectsResponse>(url);
  }

  // Get a single image project
  async getProject(projectId: string): Promise<ImageProject> {
    return api.get<ImageProject>(`/image-projects/${projectId}`);
  }

  // Create a new image project
  async createProject(data: CreateImageProjectRequest): Promise<ImageProject> {
    return api.post<ImageProject>('/image-projects', data);
  }

  // Update an image project
  async updateProject(projectId: string, data: UpdateImageProjectRequest): Promise<ImageProject> {
    return api.patch<ImageProject>(`/image-projects/${projectId}`, data);
  }

  // Delete an image project
  async deleteProject(projectId: string): Promise<{ deleted: boolean; id: string }> {
    return api.delete<{ deleted: boolean; id: string }>(`/image-projects/${projectId}`);
  }

  // Add an image to a project
  async addImageToProject(projectId: string, data: AddImageToProjectRequest): Promise<ImageAsset> {
    return api.post<ImageAsset>(`/image-projects/${projectId}/images`, data);
  }

  // Remove an image from a project
  async removeImageFromProject(projectId: string, imageId: string): Promise<{ deleted: boolean }> {
    return api.delete<{ deleted: boolean }>(`/image-projects/${projectId}/images/${imageId}`);
  }

  // Upload and add image to project
  async uploadImageToProject(projectId: string, file: File): Promise<ProcessedFileResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return api.requestFormData<ProcessedFileResponse>(`/image-projects/${projectId}/upload`, formData);
  }

  // Get all images in a project
  async getProjectImages(projectId: string, page?: number, limit?: number): Promise<ImageLibraryResponse> {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));

    const queryString = params.toString();
    const url = queryString
      ? `/image-projects/${projectId}/images?${queryString}`
      : `/image-projects/${projectId}/images`;

    return api.get<ImageLibraryResponse>(url);
  }

  // Reorder images in a project
  async reorderImages(projectId: string, imageIds: string[]): Promise<ImageProject> {
    return api.patch<ImageProject>(`/image-projects/${projectId}/reorder`, { imageIds });
  }

  // Update image metadata
  async updateImageMetadata(
    projectId: string,
    imageId: string,
    metadata: Record<string, unknown>
  ): Promise<ImageAsset> {
    return api.patch<ImageAsset>(
      `/image-projects/${projectId}/images/${imageId}`,
      { metadata }
    );
  }

  // Process image (resize, optimize, etc.)
  async processImage(
    imageId: string,
    operations: {
      resize?: { width?: number; height?: number; fit?: string };
      format?: string;
      quality?: number;
      optimize?: boolean;
    }
  ): Promise<ProcessedFileResponse> {
    return api.post<ProcessedFileResponse>(`/images/${imageId}/process`, operations);
  }

  // Duplicate a project
  async duplicateProject(projectId: string, name: string): Promise<ImageProject> {
    return api.post<ImageProject>(`/image-projects/${projectId}/duplicate`, { name });
  }

  // Export project
  async exportProject(
    projectId: string,
    format: 'zip' | 'json'
  ): Promise<Blob> {
    const response = await fetch(`${api.baseURL}/image-projects/${projectId}/export?format=${format}`, {
      method: 'GET',
      headers: api.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to export project: ${response.statusText}`);
    }

    return response.blob();
  }
}

export const imageProjectsAPI = new ImageProjectsAPI();
export const imageProjectsApi = imageProjectsAPI; // Alias for consistent naming
export default imageProjectsAPI;
