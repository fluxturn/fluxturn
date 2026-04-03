export interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  logo?: string;
  plan?: string;
  settings?: Record<string, any>;
  createdAt: string; // Backend returns camelCase
  updatedAt: string; // Backend returns camelCase
  _count?: {
    projects: number;
    members: number;
  };
}

export interface OrganizationMember {
  id: string;
  userId: string; // Backend returns camelCase
  organizationId: string; // Backend returns camelCase
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string; // Backend returns camelCase
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface OrganizationStats {
  total: number;
  active: number;
  totalProjects: number;
  totalMembers: number;
}