import { api } from '../api';

// Storage File Interface matching backend
export interface StorageFile {
  id: string;
  filename: string;
  originalFilename?: string;
  s3Key: string;
  s3Bucket: string;
  s3Url?: string;
  url?: string; // Public URL for the file
  contentType: string;
  size: number;
  organizationId?: string;
  projectId?: string;
  appId?: string;
  userId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  byContentType: Record<string, { count: number; size: number }>;
}

export interface ListFilesOptions {
  limit?: number;
  offset?: number;
  prefix?: string;
  contentType?: string;
}

export interface ListFilesResponse {
  files: StorageFile[];
  total: number;
}

export interface UploadOptions {
  public?: boolean;
  process?: ProcessingOptions;
  bucket?: string;
  metadata?: Record<string, unknown>;
  folder?: string;
}

export interface ProcessingOptions {
  resize?: {
    width: number;
    height: number;
    fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  };
  optimize?: boolean;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
  thumbnail?: boolean;
  watermark?: { text?: string; image?: string; position?: string };
}

export interface PreSignedUploadResponse {
  url: string;
  key: string;
  fileId: string;
}

// File type detection helpers
export const FileTypes = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'],
  video: ['mp4', 'webm', 'avi', 'mov', 'wmv', 'flv', 'mkv', '3gp'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
  archive: ['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz'],
  code: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb', 'html', 'css', 'json', 'xml', 'yaml', 'yml'],
};

export const getFileType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  for (const [type, extensions] of Object.entries(FileTypes)) {
    if (extensions.includes(extension)) {
      return type;
    }
  }
  
  return 'other';
};

export const getFileIcon = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Specific file type icons
  const iconMap: Record<string, string> = {
    // Images
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image', webp: 'image',
    
    // Videos
    mp4: 'video', webm: 'video', avi: 'video', mov: 'video',
    
    // Documents
    pdf: 'file-text', doc: 'file-text', docx: 'file-text', 
    xls: 'file-spreadsheet', xlsx: 'file-spreadsheet',
    ppt: 'presentation', pptx: 'presentation',
    txt: 'file-text',
    
    // Audio
    mp3: 'music', wav: 'music', ogg: 'music', flac: 'music',
    
    // Archives
    zip: 'archive', rar: 'archive', tar: 'archive', gz: 'archive',
    
    // Code
    js: 'code', ts: 'code', jsx: 'code', tsx: 'code', py: 'code', java: 'code',
    html: 'code', css: 'code', json: 'code', xml: 'code', yaml: 'code',
    
    // Default
    folder: 'folder',
  };
  
  return iconMap[extension] || 'file';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isPreviewable = (filename: string): boolean => {
  const type = getFileType(filename);
  return ['image', 'video', 'document', 'audio'].includes(type);
};

class StorageAPI {
  // Upload a single file
  async uploadFile(file: File, options?: UploadOptions): Promise<StorageFile> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options?.public !== undefined) {
      formData.append('public', String(options.public));
    }
    if (options?.bucket) {
      formData.append('bucket', options.bucket);
    }
    if (options?.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }
    if (options?.process) {
      formData.append('process', JSON.stringify(options.process));
    }

    return api.requestFormData<StorageFile>('/storage/upload', formData);
  }

  // Upload to specific bucket
  async uploadFileToBucket(bucket: string, file: File, options?: UploadOptions): Promise<StorageFile> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options?.public !== undefined) {
      formData.append('public', String(options.public));
    }
    if (options?.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }
    if (options?.process) {
      formData.append('process', JSON.stringify(options.process));
    }

    return api.requestFormData<StorageFile>(`/storage/buckets/${bucket}/upload`, formData);
  }

  // Upload multiple files
  async uploadMultipleFiles(files: File[], options?: UploadOptions): Promise<{ files: StorageFile[] }> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    if (options?.public !== undefined) {
      formData.append('public', String(options.public));
    }
    if (options?.process) {
      formData.append('process', JSON.stringify(options.process));
    }

    return api.requestFormData<{ files: StorageFile[] }>('/storage/upload-multiple', formData);
  }

  // List files
  async listFiles(options?: ListFilesOptions): Promise<ListFilesResponse> {
    const params = new URLSearchParams();
    
    if (options?.prefix) params.append('prefix', options.prefix);
    if (options?.contentType) params.append('contentType', options.contentType);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    
    const queryString = params.toString();
    const url = queryString ? `/storage/files?${queryString}` : '/storage/files';
    
    return api.request<ListFilesResponse>(url, {
      method: 'GET',
    });
  }

  // Get file details
  async getFile(fileId: string): Promise<StorageFile> {
    return api.request<StorageFile>(`/storage/files/${fileId}`, {
      method: 'GET',
    });
  }

  // Download file
  async downloadFile(fileId: string): Promise<Blob> {
    const response = await fetch(`${api.baseURL}/storage/files/${fileId}/download`, {
      method: 'GET',
      headers: api.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // Stream file
  async streamFile(fileId: string): Promise<Response> {
    return fetch(`${api.baseURL}/storage/files/${fileId}/stream`, {
      method: 'GET',
      headers: api.getHeaders(),
    });
  }

  // Delete file
  async deleteFile(fileId: string): Promise<{ deleted: boolean; id: string }> {
    return api.request<{ deleted: boolean; id: string }>(`/storage/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // Copy file
  async copyFile(fileId: string, filename: string): Promise<StorageFile> {
    return api.request<StorageFile>(`/storage/files/${fileId}/copy`, {
      method: 'POST',
      body: JSON.stringify({ filename }),
    });
  }

  // Get signed URL
  async getSignedUrl(fileId: string, expires?: number): Promise<{ url: string; expires: number }> {
    const params = expires ? `?expires=${expires}` : '';
    return api.request<{ url: string; expires: number }>(`/storage/signed-url/${fileId}${params}`, {
      method: 'GET',
    });
  }

  // Get pre-signed upload URL
  async getUploadUrl(filename: string, contentType?: string, expires?: number): Promise<PreSignedUploadResponse> {
    return api.request<PreSignedUploadResponse>('/storage/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        filename,
        contentType: contentType || 'application/octet-stream',
        expires: expires || 3600,
      }),
    });
  }

  // Confirm pre-signed upload
  async confirmUpload(fileId: string): Promise<StorageFile> {
    return api.request<StorageFile>(`/storage/confirm-upload/${fileId}`, {
      method: 'POST',
    });
  }

  // Get storage statistics
  async getStorageStats(): Promise<StorageStats> {
    return api.request<StorageStats>('/storage/stats', {
      method: 'GET',
    });
  }

  // Create folder
  async createFolder(path: string, bucket?: string): Promise<void> {
    return api.request<void>('/storage/folders', {
      method: 'POST',
      body: JSON.stringify({ path, bucket }),
    });
  }

  // Delete folder
  async deleteFolder(path: string, bucket?: string): Promise<void> {
    return api.request<void>('/storage/folders', {
      method: 'DELETE',
      body: JSON.stringify({ path, bucket }),
    });
  }
}

export const storageAPI = new StorageAPI();
export const storageApi = storageAPI; // Alias for lowercase 'api'
export default storageAPI;