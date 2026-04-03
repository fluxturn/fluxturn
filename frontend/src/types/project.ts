export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  status: 'active' | 'inactive' | 'archived';
  visibility: 'public' | 'private' | 'internal';
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  _count?: {
    apps: number;
    members: number;
  };
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface ProjectStats {
  total: number;
  active: number;
  totalApps: number;
  totalMembers: number;
}