// Common API Types

// Pagination Types
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// Error Response
export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode?: number;
  timestamp?: string;
}

// Image Project Types
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  aspectRatio?: string;
  colorSpace?: string;
  hasAlpha?: boolean;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  format: string;
  codec: string;
  bitrate: number;
  fps: number;
  size: number;
}

export interface ProcessedFileResponse {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  contentType: string;
  size: number;
  metadata?: ImageMetadata | VideoInfo;
  processedAt: string;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ImageAsset {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  metadata: ImageMetadata;
  uploadedAt: string;
}

export interface ImageProject {
  id: string;
  name: string;
  description?: string;
  images: ImageAsset[];
  coverImage?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
}

export interface CreateImageProjectRequest {
  name: string;
  description?: string;
  coverImage?: string;
  tags?: string[];
}

export interface ImageLibraryResponse {
  images: ImageAsset[];
  pagination: PaginationInfo;
}

export interface PaginatedImageProjectsResponse {
  projects: ImageProject[];
  pagination: PaginationInfo;
}

// Presentation Types
export interface Slide {
  id: string;
  order: number;
  title?: string;
  content?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  layout: 'title' | 'content' | 'two-column' | 'image' | 'blank';
  notes?: string;
  animations?: unknown[];
  transition?: string;
}

export interface PresentationTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: {
    title: number;
    heading: number;
    body: number;
  };
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  slides: Slide[];
  theme: PresentationTheme;
  coverImage?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
  isPublic: boolean;
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
