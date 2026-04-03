# Fluxez API Documentation

This directory contains all API-related code for the Fluxez frontend application.

## Structure

```
api/
├── ai.ts                 - AI service API (text, image, audio, video generation)
├── storage.ts            - File storage and management API
├── image-projects.ts     - Image project management API
├── types.ts              - Shared TypeScript types
├── billing.ts            - Billing and subscription API
├── chatbot.ts            - Chatbot configuration and messaging API
├── database.ts           - Database operations API
├── email.ts              - Email service API
├── organization.ts       - Organization management API
├── payment.ts            - Payment processing API
├── queue.ts              - Queue service API
├── tenant-auth.ts        - Tenant authentication API
└── config.ts             - API configuration
```

## Main API Client

The main API client is exported from `src/lib/api.ts`:

```typescript
import { api, apiClient } from '@/lib/api';

// Both `api` and `apiClient` refer to the same instance
await api.get('/endpoint');
await apiClient.post('/endpoint', data);
```

## Available Exports from `@/lib/api`

### Core API Instance
- `api` - Main API client instance
- `apiClient` - Alias for `api`

### AI Service
- `aiApi` / `aiAPI` - AI service instance
- `getAIApiService()` - Function to get AI service instance
- AI types: `AIResponse`, `TextGenerationRequest`, `ChatMessage`, `ImageGenerationRequest`, etc.

### Storage Service
- `storageApi` / `storageAPI` - Storage service instance
- Storage types: `StorageFile`, `UploadOptions`, `ProcessingOptions`, etc.
- Utility functions: `getFileType()`, `getFileIcon()`, `formatFileSize()`, `isPreviewable()`

### Image Projects Service
- `imageProjectsApi` / `imageProjectsAPI` - Image projects service instance
- Image types: `ImageProject`, `ImageAsset`, `CreateImageProjectRequest`, etc.

### Common Types
- `PaginationInfo` - Pagination metadata
- `ApiErrorResponse` - Error response structure
- `ApiResponse<T>` - Generic API response wrapper
- `ImageMetadata` - Image file metadata
- `VideoInfo` - Video file metadata
- `ProcessedFileResponse` - Processed file response

### Presentation Types
- `Presentation` - Full presentation object
- `Slide` - Individual slide
- `PresentationTheme` - Theme configuration

## Usage Examples

### Using AI Service

```typescript
import { aiApi } from '@/lib/api';

// Generate text
const response = await aiApi.generateText({
  prompt: 'Write a story about...',
  systemMessage: 'You are a creative writer'
});

// Generate image
const image = await aiApi.generateImage({
  prompt: 'A beautiful sunset',
  size: '1024x1024'
});
```

### Using Storage Service

```typescript
import { storageApi } from '@/lib/api';

// Upload a file
const file = event.target.files[0];
const uploadedFile = await storageApi.uploadFile(file, {
  public: true,
  process: {
    resize: { width: 800, height: 600 },
    optimize: true
  }
});

// List files
const { files, total } = await storageApi.listFiles({
  limit: 20,
  offset: 0,
  contentType: 'image/*'
});

// Download a file
const blob = await storageApi.downloadFile(fileId);
```

### Using Image Projects Service

```typescript
import { imageProjectsApi } from '@/lib/api';

// Create a project
const project = await imageProjectsApi.createProject({
  name: 'My Portfolio',
  description: 'Professional photography portfolio',
  tags: ['photography', 'portfolio']
});

// Upload image to project
const image = await imageProjectsApi.uploadImageToProject(
  projectId,
  imageFile
);

// List all projects
const { projects, pagination } = await imageProjectsApi.listProjects({
  page: 1,
  limit: 20,
  search: 'portfolio'
});
```

### Using Main API Client

```typescript
import { api } from '@/lib/api';

// Authentication
await api.login(email, password);
await api.logout();

// Organizations
const orgs = await api.getUserOrganizations();
await api.createOrganization({ name: 'My Org' });

// Projects
const projects = await api.getProjectsByOrganization(orgId);
await api.createProject({ name: 'My Project', organizationId: orgId });

// Database operations
const tables = await api.getTables('public');
const data = await api.getTableData('users');
```

## Type Safety

All API methods are fully typed. Import types as needed:

```typescript
import type {
  ImageProject,
  CreateImageProjectRequest,
  PaginatedImageProjectsResponse,
  ImageMetadata,
  StorageFile,
  AIResponse,
} from '@/lib/api';
```

## Error Handling

All API methods throw errors on failure. Use try-catch:

```typescript
try {
  const result = await api.someMethod();
} catch (error) {
  console.error('API Error:', error.message);
}
```

## Multi-tenant Context

The API client supports multi-tenant operations via headers:

```typescript
// Set context for subsequent requests
api.setOrganizationId(orgId);
api.setProjectId(projectId);
api.setAppId(appId);

// Or pass context to specific methods
await api.getTables('public', projectId, appId);
```

## Authentication

The API client automatically handles authentication tokens:

```typescript
// Login (sets token automatically)
await api.login(email, password);

// Token is now used for all subsequent requests

// Logout (clears token)
await api.logout();

// Manual token management
api.setToken(token);
const token = api.getToken();
```
