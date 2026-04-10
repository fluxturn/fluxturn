/**
 * AI processing API endpoints for Imagitar
 * Built on top of FluxTurn API client with fallback to existing imagitar API
 */

import { api } from '../api';
import type {
  ImageAIRequest,
  VideoAIRequest,
  ContentGenerationRequest,
  ProcessedFileResponse,
  ApiResponse
} from '../../types/fluxturn';
import type { ProcessedFileResponse as CreativeProcessedFileResponse } from '../api';

// Note: Both ProcessedFileResponse types are now compatible, no conversion needed

// =============================================================================
// AI PROCESSING ENDPOINTS
// =============================================================================

export const aiApi = {
  // =============================================================================
  // IMAGE AI PROCESSING
  // =============================================================================

  /**
   * Process image with AI enhancement
   */
  async processImage(request: ImageAIRequest): Promise<ProcessedFileResponse> {
    try {
      // Try FluxTurn AI API first
      const response = await api.post<ApiResponse<ProcessedFileResponse>>(
        '/ai/image/process',
        request
      );
      return response.data || response as ProcessedFileResponse;
    } catch (apiError: unknown) {
      // Fallback to imagitar AI API
      // console.warn('FluxTurn AI API failed, falling back to imagitar API:', apiError);
      
      try {
        // Map to imagitar API structure
        if (request.imageData) {
          const result = await api.aiEditImages({
            images: [{
              imageData: request.imageData,
              imageId: request.imageId || 'temp'
            }],
            editType: request.editType,
            intensity: request.intensity,
            parameters: request.parameters,
            outputFormat: request.outputFormat,
            quality: request.quality
          });
          return { ...result[0], status: result[0].status || 'completed' };
        } else {
          throw new Error('Image data required for processing');
        }
      } catch (fallbackError: unknown) {
        throw new Error(`AI image processing failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }
  },

  /**
   * Process image file with AI enhancement
   */
  async processImageFile(file: File, request: Omit<ImageAIRequest, 'imageData'>): Promise<ProcessedFileResponse> {
    try {
      // Try FluxTurn AI API first
      const formData = new FormData();
      formData.append('file', file);
      formData.append('editType', request.editType);
      
      if (request.intensity !== undefined) formData.append('intensity', request.intensity.toString());
      if (request.outputFormat) formData.append('outputFormat', request.outputFormat);
      if (request.quality !== undefined) formData.append('quality', request.quality.toString());
      if (request.prompt) formData.append('prompt', request.prompt);
      if (request.parameters) formData.append('parameters', JSON.stringify(request.parameters));

      const response = await api.post<ApiResponse<ProcessedFileResponse>>(
        '/ai/image/process-file',
        formData
      );
      return response.data || response as ProcessedFileResponse;
    } catch (apiError: unknown) {
      // Fallback to imagitar AI API
      // console.warn('FluxTurn AI API failed, falling back to imagitar API:', apiError);
      
      try {
        const result = await api.aiEditImageFile(file, {
          editType: request.editType,
          intensity: request.intensity,
          parameters: request.parameters,
          outputFormat: request.outputFormat,
          quality: request.quality
        });
        return { ...result, status: result.status || 'completed' };
      } catch (fallbackError: unknown) {
        throw new Error(`AI image processing failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }
  },

  /**
   * Generate image from text prompt using DALL-E API
   */
  async generateImage(params: {
    prompt: string;
    size?: string;
    quality?: string;
    n?: number;
    style?: string;
  }): Promise<{
    images: { url: string; revised_prompt?: string; taskUUID?: string; stored?: boolean; contentId?: string }[];
    size?: string;
    quality?: string;
  }> {
    try {
      const response = await api.post<{
        success: boolean;
        data: {
          images: Array<{
            url: string;
            revised_prompt?: string;
            taskUUID?: string;
            stored?: boolean;
            contentId?: string;
          }>;
          prompt: string;
          taskUUID: string;
          size: string;
          quality: string;
        };
      }>('/ai/image/generate', params);

      // The response from api.post is the actual response data
      // Check if it has the expected structure
      if (response && response.data) {
        return {
          images: response.data.images || [],
          size: response.data.size,
          quality: response.data.quality
        };
      } else if (response && (response as unknown as { images?: unknown }).images) {
        // Fallback if response structure is different
        const fallback = response as unknown as { images: { url: string; revised_prompt?: string; taskUUID?: string; stored?: boolean; contentId?: string }[]; size?: string; quality?: string };
        return {
          images: fallback.images,
          size: fallback.size,
          quality: fallback.quality
        };
      } else {
        throw new Error('Invalid response structure from image generation API');
      }
    } catch (error: unknown) {
      console.error('AI image generation failed:', error);
      // Mock implementation for development
      // console.warn('Falling back to mock implementation');

      // Return mock response for development
      const mockResponse = {
        url: 'https://via.placeholder.com/1024x1024/4F46E5/ffffff?text=' + encodeURIComponent(params.prompt.slice(0, 20)),
        taskUUID: `mock-${Date.now()}`,
        stored: true,
        contentId: `mock-content-${Date.now()}`
      };

      return {
        images: Array(params.n || 1).fill(mockResponse),
        size: params.size || '1024x1024',
        quality: params.quality || 'standard'
      };
    }
  },

  /**
   * Upscale image using AI
   */
  async upscaleImage(imageId: string, scale: 2 | 4 | 8): Promise<ProcessedFileResponse> {
    try {
      const response = await api.post<ApiResponse<ProcessedFileResponse>>(
        `/ai/image/${imageId}/upscale`,
        { scale }
      );
      return response.data || response as ProcessedFileResponse;
    } catch (error: unknown) {
      throw new Error(`AI upscaling failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Remove background from image
   */
  async removeBackground(imageId: string): Promise<ProcessedFileResponse> {
    try {
      const response = await api.post<ApiResponse<ProcessedFileResponse>>(
        `/ai/image/${imageId}/remove-background`
      );
      return response.data || response as ProcessedFileResponse;
    } catch (error: unknown) {
      throw new Error(`Background removal failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Edit image with AI using prompt and mask
   */
  async editImage(request: {
    image: File | Blob;
    prompt: string;
    mask?: File | Blob;
    size?: '256x256' | '512x512' | '1024x1024';
  }): Promise<{ url: string; taskUUID: string; cost: number }> {
    try {
      const formData = new FormData();
      
      // Add image file
      formData.append('image', request.image);
      
      // Add prompt
      formData.append('prompt', request.prompt);
      
      // Add mask if provided
      if (request.mask) {
        formData.append('mask', request.mask);
      }
      
      // Add size
      formData.append('size', request.size || '1024x1024');

      const response = await api.post<{
        success: boolean;
        data: {
          images: Array<{
            url: string;
            stored: boolean;
            cost: number;
            taskUUID: string;
          }>;
        };
      }>('/ai/image/edit', formData);

      if (!response.success) {
        throw new Error('AI image edit failed');
      }

      return response.data.images[0];
    } catch (error: unknown) {
      throw new Error(`AI image edit failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // =============================================================================
  // VIDEO AI PROCESSING
  // =============================================================================

  /**
   * Process video with AI enhancement
   */
  async processVideo(request: VideoAIRequest): Promise<ProcessedFileResponse> {
    try {
      const response = await api.post<ApiResponse<ProcessedFileResponse>>(
        '/ai/video/process',
        request
      );
      return response.data || response as ProcessedFileResponse;
    } catch (apiError: unknown) {
      // Fallback to imagitar AI API
      // console.warn('FluxTurn AI API failed, falling back to imagitar API:', apiError);
      
      try {
        // Map to imagitar API structure for video AI editing
        const result = await api.aiEditVideoFrame(request.videoId, {
          frame: '', // Would need frame extraction
          mask: [],
          prompt: request.prompt || '',
          timestamp: request.startTime || 0
        });
        return { ...result, status: result.status || 'completed' };
      } catch (fallbackError: unknown) {
        throw new Error(`AI video processing failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }
  },

  /**
   * Generate video from text prompt
   */
  async generateVideo(options: {
    prompt: string;
    duration?: number;
    style?: string;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    quality?: 'standard' | 'high';
    fps?: 24 | 30 | 60;
    model?: string;
  }): Promise<ProcessedFileResponse> {
    const { prompt, ...restOptions } = options;
    try {
      const response = await api.post<ApiResponse<ProcessedFileResponse>>(
        '/ai/video/generate',
        {
          prompt,
          ...restOptions
        }
      );
      return response.data || response as ProcessedFileResponse;
    } catch (error: unknown) {
      // Mock implementation for development
      // console.warn('AI video generation API not available, using mock implementation');
      
      const mockResponse: ProcessedFileResponse = {
        id: `generated-video-${Date.now()}`,
        originalName: 'generated-video.mp4',
        size: 1024 * 1024 * 10, // 10MB
        mimeType: 'video/mp4',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://via.placeholder.com/1920x1080/4F46E5/ffffff?text=' + encodeURIComponent(prompt.slice(0, 20)),
        metadata: {
          prompt,
          duration: restOptions?.duration || 10,
          model: restOptions?.model || 'vidu:2@0',
          generated: true
        },
        processingParams: restOptions,
        processingTime: 30000,
        createdAt: new Date().toISOString(),
        status: 'completed'
      };
      return mockResponse;
    }
  },

  /**
   * Stabilize video using AI
   */
  async stabilizeVideo(videoId: string): Promise<ProcessedFileResponse> {
    try {
      const response = await api.post<ApiResponse<ProcessedFileResponse>>(
        `/ai/video/${videoId}/stabilize`
      );
      return response.data || response as ProcessedFileResponse;
    } catch (error: unknown) {
      throw new Error(`Video stabilization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Enhance video quality using AI
   */
  async enhanceVideo(videoId: string, options?: {
    upscale?: boolean;
    denoise?: boolean;
    sharpen?: boolean;
  }): Promise<ProcessedFileResponse> {
    try {
      const response = await api.post<ApiResponse<ProcessedFileResponse>>(
        `/ai/video/${videoId}/enhance`,
        options || {}
      );
      return response.data || response as ProcessedFileResponse;
    } catch (error: unknown) {
      throw new Error(`Video enhancement failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // =============================================================================
  // CONTENT GENERATION
  // =============================================================================

  /**
   * Generate content using AI
   */
  async generateContent(request: ContentGenerationRequest): Promise<unknown> {
    try {
      const response = await api.post<ApiResponse<unknown>>(
        '/ai/content/generate',
        request
      );
      return response.data || response;
    } catch (error: unknown) {
      // Mock implementation for development
      // console.warn('AI content generation API not available, using mock implementation');
      
      switch (request.type) {
        case 'text':
          return {
            content: `Generated content for: ${request.prompt}. This is a mock response for development purposes.`,
            metadata: {
              prompt: request.prompt,
              style: request.style,
              wordCount: 50
            }
          };
        
        case 'image':
          return {
            url: 'https://via.placeholder.com/1024x1024/4F46E5/ffffff?text=' + encodeURIComponent(request.prompt.slice(0, 20)),
            metadata: {
              prompt: request.prompt,
              style: request.style
            }
          };
        
        case 'video':
          return {
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            metadata: {
              prompt: request.prompt,
              duration: 10
            }
          };
        
        default:
          throw new Error(`Content type ${request.type} not supported in mock mode`);
      }
    }
  },

  /**
   * Generate text content
   */
  async generateText(prompt: string, options?: {
    maxLength?: number;
    style?: 'casual' | 'formal' | 'creative' | 'technical';
    language?: string;
  }): Promise<{ content: string; metadata: Record<string, unknown> }> {
    try {
      const response = await api.post<ApiResponse<unknown>>(
        '/ai/content/text',
        {
          prompt,
          ...options
        }
      );
      return (response.data || response) as { content: string; metadata: Record<string, unknown> };
    } catch (error: unknown) {
      // Mock implementation
      return {
        content: `Generated text content for: ${prompt}. This is a mock response that would normally be generated by AI based on your prompt. The style would be ${options?.style || 'casual'} and it would respect the maximum length of ${options?.maxLength || 'unlimited'} characters.`,
        metadata: {
          prompt,
          style: options?.style || 'casual',
          wordCount: 42,
          language: options?.language || 'en'
        }
      };
    }
  },

  /**
   * Analyze image content
   */
  async analyzeImage(imageId: string, options?: {
    detectObjects?: boolean;
    readText?: boolean;
    describeSafe?: boolean;
    generateCaption?: boolean;
  }): Promise<{
    objects?: Array<{ name: string; confidence: number; bbox: number[] }>;
    text?: string;
    safetyScore?: number;
    caption?: string;
    metadata: Record<string, unknown>;
  }> {
    try {
      const response = await api.post<ApiResponse<unknown>>(
        `/ai/image/${imageId}/analyze`,
        options || {}
      );
      return (response.data || response) as {
        objects?: Array<{ name: string; confidence: number; bbox: number[] }>;
        text?: string;
        safetyScore?: number;
        caption?: string;
        metadata: Record<string, unknown>;
      };
    } catch (error: unknown) {
      // Mock implementation
      return {
        objects: options?.detectObjects ? [
          { name: 'person', confidence: 0.95, bbox: [100, 100, 200, 300] },
          { name: 'background', confidence: 0.87, bbox: [0, 0, 1024, 1024] }
        ] : undefined,
        text: options?.readText ? 'Sample text detected in image' : undefined,
        safetyScore: options?.describeSafe ? 0.98 : undefined,
        caption: options?.generateCaption ? 'A detailed AI-generated description of the image content.' : undefined,
        metadata: {
          imageId,
          processingTime: 2000,
          model: 'vision-ai-v1'
        }
      };
    }
  },

  /**
   * Get AI processing status
   */
  async getProcessingStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    result?: ProcessedFileResponse;
    error?: string;
  }> {
    try {
      const response = await api.get<ApiResponse<unknown>>(`/ai/jobs/${jobId}/status`);
      return (response.data || response) as {
        status: 'pending' | 'processing' | 'completed' | 'failed';
        progress?: number;
        result?: ProcessedFileResponse;
        error?: string;
      };
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        throw new Error('Processing job not found.');
      }
      throw error;
    }
  },

  /**
   * Text-to-speech conversion
   */
  async textToSpeech(options: {
    text: string;
    voice?: string;
    speed?: number;
    pitch?: number;
  }): Promise<{ audioUrl: string; duration: number }> {
    try {
      const response = await api.post<ApiResponse<{ audioUrl: string; duration: number }>>(
        '/ai/audio/text-to-speech',
        options
      );
      return response.data || response as { audioUrl: string; duration: number };
    } catch (error: unknown) {
      throw new Error(`Text-to-speech failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  /**
   * Cancel AI processing job
   */
  async cancelProcessing(jobId: string): Promise<void> {
    try {
      await api.post(`/ai/jobs/${jobId}/cancel`);
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        throw new Error('Processing job not found.');
      }
      if ((error as { statusCode?: number }).statusCode === 400) {
        throw new Error('Processing job cannot be cancelled.');
      }
      throw error;
    }
  }
};

export default aiApi;