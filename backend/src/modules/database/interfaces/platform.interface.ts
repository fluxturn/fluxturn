export interface PlatformUser {
  id: string;
  email: string;
  username?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string; // For frontend compatibility
  avatarUrl?: string;
  bio?: string;
  website?: string;
  location?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  organizationId?: string; // Optional, determined from organization_members
  role?: 'owner' | 'admin' | 'member'; // Optional, determined from organization_members
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  oauthProviders?: string[];
  githubId?: string;
  googleId?: string;
  facebookId?: string;
  twitterId?: string;
  appleId?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  ownerId: string;
  plan?: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  databaseName: string;
  serviceRoleKey: string;
  anonKey: string;
  isActive: boolean;
  projectUrl?: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface App {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  organizationId: string;
  databaseName: string;
  serviceRoleKey: string;
  anonKey: string;
  isActive: boolean;
  type: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  projectId?: string;
  appId?: string;
  organizationId: string;
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInvitation {
  id: string;
  email: string;
  organizationId: string;
  invitedById: string;
  role: 'admin' | 'member';
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  organizationId?: string;
  projectId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string; // Frontend sends this
  firstName?: string;
  lastName?: string;
  username?: string;
  organizationId?: string;
  role?: 'owner' | 'admin' | 'member';
}

export interface CreateOrganizationInput {
  name: string;
  description?: string;
  ownerId: string;
  settings?: Record<string, any>;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  organizationId: string;
  settings?: Record<string, any>;
}

export interface CreateAppInput {
  name: string;
  organizationId: string,
  projectId: string;
  description?: string;
  type?: string; // Will be determined from framework
  framework: string; // Primary framework (required)
  frameworks?: string[]; // All frameworks including auto-added backend
  status?: string;
  deploymentUrl?: string;
  repositoryUrl?: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CreateApiKeyInput {
  name: string;
  projectId?: string;
  appId?: string;
  organizationId: string;
  permissions: string[];
  expiresAt?: Date;
}

export interface CreateInvitationInput {
  email: string;
  organizationId: string;
  invitedById: string;
  role: 'admin' | 'member';
  expiresAt?: Date;
}

// Project member interfaces
export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  joinedAt: Date;
  invitedAt?: Date;
  invitedBy?: string;
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  email: string;
  userId?: string;
  role: 'admin' | 'member' | 'viewer';
  invitedBy: string;
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectMemberInput {
  projectId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions?: string[];
  invitedBy?: string;
}

export interface CreateProjectInvitationInput {
  projectId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  invitedBy: string;
  expiresAt?: Date;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  userId?: string;
  role: 'admin' | 'member';
  invitedBy: string;
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationInvitationInput {
  organizationId: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  expiresAt?: Date;
}