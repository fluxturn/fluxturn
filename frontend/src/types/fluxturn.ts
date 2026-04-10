/**
 * FluxTurn API types for Imagitar integration
 */

import type { JsonObject, JsonValue } from './json';

// =============================================================================
// CORE API TYPES
// =============================================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  statusCode?: number;
  success?: boolean;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: JsonValue;
}

// =============================================================================
// USER & AUTHENTICATION TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string; // Backwards compatibility
  role?: string;
  status?: 'active' | 'inactive' | 'pending';
  avatarUrl?: string;
  bio?: string;
  website?: string;
  location?: string;
  twoFactorEnabled?: boolean;
  organization?: Organization;
  organizationId?: string;
  projectId?: string;
  emailVerified?: boolean;
  plan?: string; // e.g., 'free', 'pro', 'enterprise'
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  firstName?: string;
  lastName?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// =============================================================================
// ORGANIZATION & PROJECT TYPES
// =============================================================================

export interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  settings?: JsonObject;
  members?: OrganizationMember[];
  projects?: Project[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  user?: User;
  invitedAt?: string;
  joinedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  visibility: 'public' | 'private' | 'internal';
  status: 'active' | 'archived' | 'deleted';
  settings?: JsonObject;
  organization?: Organization;
  apps?: App[];
  createdAt: string;
  updatedAt: string;
}

export interface App {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  organizationId: string;
  type: 'web' | 'mobile' | 'api' | 'desktop';
  framework: 'react' | 'vue' | 'angular' | 'flutter' | 'react-native' | 'nestjs' | 'express' | 'next' | 'nuxt';
  status: 'development' | 'staging' | 'production' | 'archived';
  url?: string;
  repositoryUrl?: string;
  buildConfig?: JsonObject;
  environmentVariables?: Record<string, string>;
  settings?: JsonObject;
  project?: Project;
  organization?: Organization;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// FILE & STORAGE TYPES
// =============================================================================

export interface FileUpload {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  path: string;
  userId?: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
  metadata?: JsonObject;
  createdAt: string;
  updatedAt: string;
}

export interface FileUploadOptions {
  folder?: string;
  quality?: number;
  width?: number;
  height?: number;
  format?: string;
  generateThumbnail?: boolean;
  metadata?: JsonObject;
}

export interface SignedUrlRequest {
  filename: string;
  mimetype: string;
  size?: number;
  folder?: string;
  expiresIn?: number;
}

export interface SignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  fileId: string;
  expiresAt: string;
}

// =============================================================================
// AI & PROCESSING TYPES
// =============================================================================

export interface ImageAIRequest {
  imageData?: string; // base64 encoded
  imageUrl?: string;
  imageId?: string;
  editType: 'enhance' | 'denoise' | 'upscale' | 'colorize' | 'style_transfer' | 'remove_background' | 'face_enhance' | 'auto_adjust';
  intensity?: number;
  parameters?: JsonObject;
  outputFormat?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  prompt?: string;
}

export interface VideoAIRequest {
  videoId: string;
  editType: 'enhance' | 'stabilize' | 'denoise' | 'upscale' | 'style_transfer' | 'object_removal' | 'color_grade';
  parameters?: JsonObject;
  outputFormat?: 'mp4' | 'mov' | 'webm';
  quality?: 'low' | 'medium' | 'high' | '4k';
  prompt?: string;
  startTime?: number;
  endTime?: number;
}

export interface ContentGenerationRequest {
  type: 'text' | 'image' | 'video' | 'audio';
  prompt: string;
  style?: string;
  parameters?: JsonObject;
  outputFormat?: string;
  quality?: string;
}

export interface ProcessedFileResponse {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  metadata?: JsonObject;
  processingParams?: JsonObject;
  processingTime?: number;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
}

// =============================================================================
// CONTENT MANAGEMENT TYPES
// =============================================================================

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'template';
  content?: string;
  metadata?: JsonObject;
  tags?: string[];
  category?: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'shared';
  version: number;
  parentId?: string;
  children?: ContentItem[];
  versions?: ContentVersion[];
  userId: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentVersion {
  id: string;
  contentId: string;
  version: number;
  title: string;
  content?: string;
  metadata?: JsonObject;
  changeDescription?: string;
  userId: string;
  createdAt: string;
}

export interface ContentCreateRequest {
  title: string;
  description?: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'template';
  content?: string;
  metadata?: JsonObject;
  tags?: string[];
  category?: string;
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'private' | 'shared';
  parentId?: string;
}

export interface ContentUpdateRequest {
  title?: string;
  description?: string;
  content?: string;
  metadata?: JsonObject;
  tags?: string[];
  category?: string;
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'private' | 'shared';
  changeDescription?: string;
}

// =============================================================================
// PRESENTATION TYPES
// =============================================================================

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  template?: string;
  slides: Slide[];
  theme?: PresentationTheme;
  settings?: JsonObject;
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
  properties?: JsonObject;
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
  textColor: string;
  fontFamily: string;
  fontSize?: number;
  lineHeight?: number;
  properties?: JsonObject;
}

export interface PresentationCreateRequest {
  title: string;
  description?: string;
  template?: string;
  theme?: PresentationTheme;
  slides?: Omit<Slide, 'id'>[];
  settings?: JsonObject;
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'private' | 'shared';
}

export interface PresentationUpdateRequest {
  title?: string;
  description?: string;
  template?: string;
  theme?: PresentationTheme;
  slides?: Slide[];
  settings?: JsonObject;
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'private' | 'shared';
}

// =============================================================================
// SEARCH & FILTER TYPES
// =============================================================================

export interface SearchQuery {
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: JsonObject;
}

export interface SearchResponse<T = unknown> extends PaginatedResponse<T> {
  query: string;
  filters?: JsonObject;
  facets?: JsonObject;
}

// =============================================================================
// WEBHOOK & EVENT TYPES
// =============================================================================

export interface WebhookEvent {
  id: string;
  type: string;
  payload: JsonObject;
  timestamp: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
}

// =============================================================================
// ANALYTICS & METRICS TYPES
// =============================================================================

export interface MetricPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, string>;
}

export interface Metric {
  name: string;
  description?: string;
  unit?: string;
  points: MetricPoint[];
}

export interface AnalyticsQuery {
  metric: string;
  startDate: string;
  endDate: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  filters?: JsonObject;
  groupBy?: string[];
}

// =============================================================================
// WORKSPACE & COLLABORATION TYPES
// =============================================================================

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  type: 'personal' | 'team' | 'organization';
  members?: WorkspaceMember[];
  projects?: Project[];
  settings?: JsonObject;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions?: string[];
  user?: User;
  joinedAt: string;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export interface FluxTurnConfig {
  apiBaseUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    ai: boolean;
    storage: boolean;
    analytics: boolean;
    collaboration: boolean;
    webhooks: boolean;
  };
  limits: {
    fileSize: number;
    requestRate: number;
    concurrentProcessing: number;
  };
  integrations: {
    openai?: boolean;
    aws?: boolean;
    gcp?: boolean;
    azure?: boolean;
  };
}

// =============================================================================
// API CLIENT OPTIONS
// =============================================================================

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  defaultHeaders?: Record<string, string>;
  interceptors?: {
    request?: (config: RequestInit) => RequestInit;
    response?: (response: Response) => Response;
  };
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  organizationId?: string;
  projectId?: string;
  appId?: string;
}
