/**
 * Video API client
 * Handles all video-related API calls with proper error handling and timeouts
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL as string);

// API Error types
export class VideoApiError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.name = 'VideoApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Timeout configurations
const TIMEOUT_SHORT = 30000; // 30 seconds for regular requests
const TIMEOUT_LONG = 300000; // 5 minutes for export/processing operations

export interface VideoUploadOptions {
  format?: string;
  width?: number;
  height?: number;
  quality?: number;
  framerate?: number;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  framerate: number;
  codec: string;
  bitrate?: number;
}

export interface VideoTrimOptions {
  startTime: number;
  duration: number;
}

export interface VideoCompressOptions {
  bitrate?: string;
  compressionLevel?: number;
}

export interface VideoThumbnailOptions {
  timestamp?: number;
  width?: number;
  height?: number;
}

export interface VideoExportOptions {
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
}

export interface VideoAIEditData {
  frame: string;      // Base64 encoded PNG
  mask: number[];     // ImageData array
  prompt: string;     // AI prompt
  timestamp: number;  // Current time in video
}

export interface VideoTextOverlayOptions {
  text: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  position?: 'center' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  startTime?: number;
  duration?: number;
  fontFamily?: string;
  padding?: number;
}

export interface VideoSession {
  id: string;
  name: string;
  thumbnail?: string;
  lastModified: string;
  createdAt: string;
}

export interface VideoSessionData {
  id?: string;
  name: string;
  timelineData: any;
  thumbnail?: string;
  lastModified?: string;
  createdAt?: string;
  clipCount?: number;
  duration?: number;
  updatedAt?: string;
}

export interface VideoSessionListResponse {
  sessions: VideoSession[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProcessedVideoResponse {
  id: string;
  exportId?: string; // For tracking export progress
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
  processingParams?: any;
  processingTime?: number;
}

export interface VideoListOptions {
  limit?: number;
  offset?: number;
  search?: string;
  contentType?: string;
  tags?: string[];
}

export interface VideoFile {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  contentType: string;
  size: number;
  metadata?: any;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface VideoListResponse {
  videos: VideoFile[];
  total: number;
  limit: number;
  offset: number;
}

class VideoAPI {
  /**
   * Wrapper for fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string, 
    options: RequestInit = {}, 
    timeoutMs: number = TIMEOUT_SHORT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new VideoApiError(
          `Request timeout after ${timeoutMs / 1000} seconds`,
          408,
          'TIMEOUT_ERROR'
        );
      }
      throw error;
    }
  }

  private getHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');

    // Extract context from URL
    const pathParts = window.location.pathname.split('/');
    const orgIndex = pathParts.indexOf('org');
    const projectIndex = pathParts.indexOf('project');
    const appIndex = pathParts.indexOf('app');

    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Try to get from URL first, then fallback to localStorage
    if (orgIndex > -1 && pathParts[orgIndex + 1]) {
      headers['x-organization-id'] = pathParts[orgIndex + 1];
    } else {
      // Fallback to localStorage for simplified routes like /video-editor
      const lastOrgId = localStorage.getItem('lastOrganizationId');
      if (lastOrgId) {
        headers['x-organization-id'] = lastOrgId;
      }
    }

    if (projectIndex > -1 && pathParts[projectIndex + 1]) {
      headers['x-project-id'] = pathParts[projectIndex + 1];
    } else {
      // Fallback to localStorage for simplified routes like /video-editor
      const lastProjectId = localStorage.getItem('lastProjectId');
      if (lastProjectId) {
        headers['x-project-id'] = lastProjectId;
      }
    }

    // Extract app ID if in app context
    if (appIndex > -1 && pathParts[appIndex + 1]) {
      headers['x-app-id'] = pathParts[appIndex + 1];
    }

    return headers;
  }

  /**
   * List videos for the current project
   */
  async list(options?: VideoListOptions): Promise<VideoListResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.contentType) params.append('contentType', options.contentType);
    
    const response = await this.fetchWithTimeout(
      `${API_BASE_URL}/videos?${params}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new VideoApiError(
        errorData.message || `Failed to list videos: ${response.statusText}`,
        response.status,
        errorData.code
      );
    }
    
    return response.json();
  }

  /**
   * Get recent videos
   */
  async getRecent(limit = 10): Promise<VideoFile[]> {
    const response = await fetch(`${API_BASE_URL}/videos/recent?limit=${limit}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get recent videos: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get video details
   */
  async get(videoId: string): Promise<VideoFile> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get video: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Delete a video
   */
  async delete(videoId: string): Promise<{ deleted: boolean; id: string }> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete video: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Upload a video file using storage bucket endpoint
   */
  async upload(file: File, options?: VideoUploadOptions & { title?: string; description?: string; tags?: string[]; bucket?: string }): Promise<ProcessedVideoResponse> {
    // console.log('Uploading video using storage bucket endpoint...');

    const formData = new FormData();
    formData.append('file', file);

    // Use storage bucket endpoint
    const bucket = options?.bucket || 'videos';
    const response = await fetch(`${API_BASE_URL}/storage/buckets/${bucket}/upload`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to upload video: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    // console.log('Video upload response:', result);
    
    // Handle different response formats from the backend
    if (result.data) {
      return result.data;
    } else if (result.id && result.url) {
      // Direct response format
      return result;
    } else if (result.file) {
      // Storage API format
      return {
        id: result.file.id,
        originalName: result.file.filename || result.file.originalFilename,
        url: result.file.url || result.file.publicUrl,
        size: result.file.size,
        mimeType: result.file.contentType || result.file.mimeType,
        createdAt: result.file.createdAt || new Date().toISOString()
      };
    } else {
      // Fallback
      return result;
    }
  }

  /**
   * Get video stream URL
   */
  async getStreamUrl(videoId: string): Promise<string> {
    const headers = this.getHeaders();
    const params = new URLSearchParams();
    Object.entries(headers).forEach(([key, value]) => {
      if (key.startsWith('x-')) {
        params.append(key, value);
      }
    });
    return `${API_BASE_URL}/videos/${videoId}/stream?${params}`;
  }

  /**
   * Get signed URL for video access
   */
  async getSignedUrl(videoId: string, expires = 3600): Promise<{ url: string; expires: number }> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/signed-url?expires=${expires}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Download a video
   */
  async download(videoId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/download`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }
    
    return response.blob();
  }

  /**
   * Trim video
   */
  async trim(videoId: string, options: VideoTrimOptions): Promise<ProcessedVideoResponse> {
    const response = await this.fetchWithTimeout(
      `${API_BASE_URL}/videos/${videoId}/trim`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(),
        },
        body: JSON.stringify(options),
      },
      TIMEOUT_LONG // Use 5-minute timeout for processing
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to trim video: ${errorData.message || response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || result;
  }

  /**
   * Compress video
   */
  async compress(videoId: string, options: VideoCompressOptions): Promise<ProcessedVideoResponse> {
    const response = await this.fetchWithTimeout(
      `${API_BASE_URL}/videos/${videoId}/compress`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(),
        },
        body: JSON.stringify(options),
      },
      TIMEOUT_LONG // Use 5-minute timeout for processing
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to compress video: ${errorData.message || response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || result;
  }

  /**
   * Extract thumbnail from video
   */
  async extractThumbnail(videoId: string, options?: VideoThumbnailOptions): Promise<ProcessedVideoResponse> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getHeaders(),
      },
      body: JSON.stringify(options || {}),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to extract thumbnail: ${errorData.message || response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || result;
  }

  /**
   * Export timeline as video
   */
  async export(options: VideoExportOptions): Promise<ProcessedVideoResponse> {
    const response = await this.fetchWithTimeout(
      `${API_BASE_URL}/videos/export`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(),
        },
        body: JSON.stringify(options),
      },
      TIMEOUT_LONG // Use 5-minute timeout for export
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to export video: ${errorData.message || response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || result;
  }


  /**
   * Stream export progress via Server-Sent Events
   */
  streamExportProgress(exportId: string, onProgress: (data: { progress: number; timemark?: string; fps?: number }) => void): EventSource {
    // Simplified SSE connection without auth for now
    const url = `${API_BASE_URL}/videos/export/${exportId}/progress`;
    // console.log('[VideoAPI] Creating SSE connection to:', url);
    
    const eventSource = new EventSource(url);
    
    eventSource.onopen = () => {
      // console.log('[VideoAPI] SSE connection opened for export:', exportId);
    };
    
    eventSource.onmessage = (event) => {
      try {
        // console.log('[VideoAPI] Received SSE message event:', event.data);
        const data = JSON.parse(event.data);
        // console.log('[VideoAPI] Parsed SSE data:', data);
        onProgress(data);
      } catch (error) {
        console.error('Error parsing progress data:', error, event.data);
      }
    };
    
    eventSource.onerror = (event) => {
      console.error('SSE error:', event);
      // console.log('SSE readyState:', eventSource.readyState);
    };
    
    return eventSource;
  }

  /**
   * Apply AI edit to video frame
   * Sends frame data with mask and prompt to backend
   * Backend will process with AI in the future
   */
  async aiEditFrame(videoId: string, data: VideoAIEditData): Promise<ProcessedVideoResponse> {
    try {
      // console.log('[VideoAPI] Sending AI edit request:', {
      //   videoId,
      //   frameSize: data.frame.length,
      //   maskSize: data.mask.length,
      //   prompt: data.prompt,
      //   timestamp: data.timestamp
      // });

      const response = await fetch(`${API_BASE_URL}/videos/${videoId}/ai-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getHeaders(),
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Failed to apply AI edit: ${errorData.message || response.statusText}`);
      }
      
      const result = await response.json();
      // console.log('[VideoAPI] AI edit response:', result);
      
      return result.data || result;
    } catch (error) {
      console.error('[VideoAPI] AI edit failed:', error);
      throw error;
    }
  }

  /**
   * Apply AI edit to an image/frame using the AI image edit endpoint
   */
  async aiEditImage(imageBlob: Blob, maskBase64: string | null, prompt: string): Promise<{ url: string; taskUUID?: string }> {
    try {
      // console.log('[VideoAPI] Sending AI image edit request');

      const formData = new FormData();
      formData.append('image', imageBlob, 'frame.png');
      formData.append('prompt', prompt);

      // Only add mask if provided
      if (maskBase64) {
        formData.append('mask', maskBase64);
      }

      // Add size parameter for better quality
      formData.append('size', '1024x1024');

      // Don't set Content-Type for FormData - browser will set it with boundary
      const headers = this.getHeaders();
      delete headers['Content-Type']; // Remove Content-Type if it exists

      const response = await fetch(`${API_BASE_URL}/ai/image/edit`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Failed to apply AI edit: ${errorData.message || response.statusText}`);
      }
      
      const result = await response.json();
      // console.log('[VideoAPI] AI edit response:', result);

      if (!result.success || !result.data?.images || result.data.images.length === 0) {
        console.error('[VideoAPI] AI edit failed response:', result);
        throw new Error(result.error || 'No image generated');
      }

      return {
        url: result.data.images[0].url,
        taskUUID: result.data.images[0].taskUUID || `ai-frame-${Date.now()}`
      };
    } catch (error) {
      console.error('[VideoAPI] AI image edit failed:', error);
      console.error('[VideoAPI] Request details:', {
        endpoint: `${API_BASE_URL}/ai/image/edit`,
        promptLength: prompt.length,
        hasMask: !!maskBase64,
        blobSize: imageBlob.size,
        blobType: imageBlob.type
      });
      throw error;
    }
  }

  /**
   * Add text overlay to video
   */
  async addTextOverlay(videoId: string, options: VideoTextOverlayOptions): Promise<ProcessedVideoResponse> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/text-overlay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getHeaders(),
      },
      body: JSON.stringify(options),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to add text overlay: ${errorData.message || response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || result;
  }

  /**
   * Save video editing session
   */
  async saveSession(sessionData: {
    name: string;
    timelineData: any;
    thumbnail?: string;
  }): Promise<{ id: string; createdAt: string }> {
    const response = await fetch(`${API_BASE_URL}/videos/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getHeaders(),
      },
      body: JSON.stringify(sessionData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to save session: ${errorData.message || response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * List saved video editing sessions
   */
  async listSessions(options?: { limit?: number; offset?: number }): Promise<VideoSessionListResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await fetch(`${API_BASE_URL}/videos/saved?${params}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to list sessions: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();

    // Transform backend response to match expected interface
    return {
      sessions: data.data?.map((session: any) => ({
        id: session.id,
        name: session.title,
        thumbnail: session.metadata?.thumbnail,
        clipCount: 0, // Backend doesn't provide this info
        duration: 0,  // Backend doesn't provide this info
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      })) || [],
      total: data.total || 0,
      limit: data.limit || 20,
      offset: data.offset || 0,
    };
  }

  /**
   * Load a saved video editing session
   */
  async loadSession(sessionId: string): Promise<VideoSessionData> {
    const response = await fetch(`${API_BASE_URL}/videos/saved/${sessionId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to load session: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();

    // Transform backend response to match expected interface
    return {
      id: data.id,
      name: data.title,
      thumbnail: data.metadata?.thumbnail,
      clipCount: data.content?.clips?.length || 0,
      duration: Math.max(...(data.content?.clips || []).map((c: any) => c.endTime || 0), 0),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      timelineData: data.content || {},
    };
  }

  /**
   * Update a saved video editing session
   */
  async updateSession(sessionId: string, sessionData: {
    name?: string;
    timelineData?: any;
    thumbnail?: string;
  }): Promise<{ id: string; updated: boolean; updatedAt: string }> {
    const response = await fetch(`${API_BASE_URL}/videos/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getHeaders(),
      },
      body: JSON.stringify(sessionData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to update session: ${errorData.message || response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Delete a saved video editing session
   */
  async deleteSession(sessionId: string): Promise<{ deleted: boolean; id: string }> {
    const response = await fetch(`${API_BASE_URL}/videos/saved/${sessionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to delete session: ${errorData.message || response.statusText}`);
    }
    
    return response.json();
  }
}

// Export singleton instance
export const videoAPI = new VideoAPI();