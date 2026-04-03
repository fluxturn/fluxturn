/**
 * Navigation utilities for handling project level routing
 */

export type ServiceType =
  | 'ai-service'
  | 'ai-marketing'
  | 'databases'
  | 'tenant-auth'
  | 'storage'
  | 'email-service'
  | 'notifications'
  | 'api-keys'
  | 'analytics'
  | 'workflows'
  | 'connectors'
  | 'queue'
  | 'image'
  | 'video'
  | 'presentation';

interface BuildPathOptions {
  organizationId: string;
  projectId: string;
  service: ServiceType;
  subPath?: string;
}

/**
 * Builds a dynamic path for project level navigation
 * @param options - The options for building the path
 * @returns The constructed path string
 *
 * @example
 * // Project level
 * buildServicePath({
 *   organizationId: '123',
 *   projectId: '456',
 *   service: 'databases'
 * })
 * // Returns: /org/123/project/456/databases
 */
export function buildServicePath(options: BuildPathOptions): string {
  const { organizationId, projectId, service, subPath } = options;

  // Build base path with /org prefix
  const basePath = `/org/${organizationId}/project/${projectId}/${service}`;

  // Append subPath if provided
  if (subPath) {
    // Remove leading slash if present to avoid double slashes
    const cleanSubPath = subPath.startsWith('/') ? subPath.slice(1) : subPath;
    return `${basePath}/${cleanSubPath}`;
  }

  return basePath;
}

/**
 * Extracts context (organizationId, projectId) from React Router params
 * @param params - The params object from useParams()
 * @returns Object containing organizationId and projectId
 */
export function extractRouteContext(params: Record<string, string | undefined>) {
  return {
    organizationId: params.organizationId || '',
    projectId: params.projectId || ''
  };
}

/**
 * Helper function to build common service paths
 */
export const servicePaths = {
  aiservice: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'ai-service', subPath }),
  aiMarketing: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'ai-marketing', subPath }),
  databases: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'databases', subPath }),

  tenantAuth: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'tenant-auth', subPath }),

  storage: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'storage', subPath }),

  emailService: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'email-service', subPath }),

  notifications: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'notifications', subPath }),

  apiKeys: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'api-keys', subPath }),

  analytics: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'analytics', subPath }),

  workflows: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'workflows', subPath }),

  connectors: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'connectors', subPath }),

  queue: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'queue', subPath }),

  image: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'image', subPath }),

  video: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'video', subPath }),

  presentation: (context: { organizationId: string; projectId: string }, subPath?: string) =>
    buildServicePath({ ...context, service: 'presentation', subPath }),
};

/**
 * Get the current service context for API calls
 */
export function getServiceContext(params: Record<string, string | undefined>) {
  return {
    projectId: params.projectId || ''
  };
}

/**
 * Build a context-aware path preserving the current org/project hierarchy
 * @param menuData - Menu data containing selected organization and project
 * @param path - The target path (e.g., '/settings/profile')
 * @returns The full context-aware path
 */
export function buildContextPath(
  menuData: {
    selectedOrganization?: { id: string } | null;
    selectedProject?: { id: string } | null;
  },
  path: string
): string {
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Build base path based on current context
  if (menuData.selectedOrganization && menuData.selectedProject) {
    return `/org/${menuData.selectedOrganization.id}/project/${menuData.selectedProject.id}/${cleanPath}`;
  } else if (menuData.selectedOrganization) {
    return `/org/${menuData.selectedOrganization.id}/${cleanPath}`;
  }

  // Fallback to root-level path
  return `/${cleanPath}`;
}