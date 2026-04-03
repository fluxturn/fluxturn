export interface AuthContext {
  type: 'jwt' | 'api-key';
  userId: string;
  email?: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
  roles?: string[];
  permissions?: string[];
}