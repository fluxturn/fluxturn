// AI Marketing Types

export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'youtube'
  | 'tiktok'
  | 'linkedin'
  | 'reddit'
  | 'whatsapp'
  | 'telegram'
  | 'pinterest'
  | 'snapchat'
  | 'discord';

export type PostType = 'text' | 'image' | 'video' | 'carousel';

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'pending';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
  username?: string;
  profileImage?: string;
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  followers?: number;
  connectorConfigId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  file?: File;
  alt?: string;
  duration?: number; // for videos
  size?: number;
  mimeType?: string;
}

export interface PostContent {
  id: string;
  title?: string;
  description: string;
  media: MediaItem[];
  tags: string[];
  platforms: SocialPlatform[];
  scheduledDate?: Date;
  scheduledTime?: string;
  status: PostStatus;
  generatedByAI?: boolean;
  aiPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostRequest {
  title?: string;
  description: string;
  media?: MediaItem[];
  tags?: string[];
  platforms: SocialPlatform[];
  scheduledDate?: Date;
  scheduledTime?: string;
  socialAccountIds: string[];
  generateWithAI?: boolean;
  aiPrompt?: string;
}

export interface AIGenerateRequest {
  prompt: string;
  platforms?: SocialPlatform[];
  numberOfPosts?: number;
  startDate?: Date;
  endDate?: Date;
  timeSlots?: string[];
  includeMedia?: boolean;
  generateMultipleVariants?: boolean;
}

export interface AIGeneratedPost {
  title?: string;
  description: string;
  tags: string[];
  suggestedPlatforms: SocialPlatform[];
  suggestedSchedule?: Date;
  mediaPrompt?: string;
}

export interface BulkPostRequest {
  posts: CreatePostRequest[];
  socialAccountIds: string[];
  executeNow?: boolean;
}

export interface TagSuggestion {
  tag: string;
  relevance: number;
  trending?: boolean;
}

export interface PostAnalytics {
  postId: string;
  platform: SocialPlatform;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  updatedAt: Date;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  description?: string;
  posts: PostContent[];
  startDate: Date;
  endDate: Date;
  status: 'active' | 'scheduled' | 'completed' | 'paused';
  totalPosts: number;
  publishedPosts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIFieldGenerateRequest {
  fieldName: 'title' | 'description' | 'tags';
  context?: {
    title?: string;
    description?: string;
    platforms?: SocialPlatform[];
    media?: MediaItem[];
  };
  prompt?: string;
}

export interface ConnectSocialAccountRequest {
  platform: SocialPlatform;
  authCode?: string;
  accessToken?: string;
  accountName?: string;
}

export interface PostSchedule {
  date: Date;
  timeSlots: string[];
}

export interface BulkGenerateOptions {
  concept: string;
  platforms: SocialPlatform[];
  numberOfPosts: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  timeSlots: string[];
  mediaFiles?: File[];
  autoGenerateOnUpload?: boolean;
  imagesPerPost?: number;
  generateVariants?: boolean;
}
