export interface TenantUser {
  id: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  metadata: Record<string, any>;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  lastSignInAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantTeam {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantTeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  permissions: string[];
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantProfile {
  id: string;
  userId: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  timezone?: string;
  preferences: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantUserInput {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  metadata?: Record<string, any>;
}

export interface CreateTenantSessionInput {
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateTenantTeamInput {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface CreateTenantTeamMemberInput {
  teamId: string;
  userId: string;
  role: string;
  permissions?: string[];
}

export interface CreateTenantProfileInput {
  userId: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  timezone?: string;
  preferences?: Record<string, any>;
}

export interface TenantDatabaseInfo {
  databaseName: string;
  serviceRoleKey?: string;
  anonKey?: string;
  projectId?: string;
  appId?: string;
  type?: 'project' | 'app';
  organizationId: string;
}

export interface TenantConnectionPool {
  databaseName: string;
  pool: any;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface TenantQuery {
  query: string;
  params?: any[];
  timeout?: number;
}

export interface TenantQueryOptions {
  transaction?: boolean;
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  timeout?: number;
}