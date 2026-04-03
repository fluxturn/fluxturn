import { api } from '../lib/api';

export interface AdminUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  status?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface AdminUserWithOrganizations extends AdminUser {
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
}

export interface GetUsersParams {
  search?: string;
  role?: 'admin' | 'user' | 'all';
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name' | 'email' | 'created_at' | 'last_login_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface GetUsersResponse {
  users: AdminUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AdminStats {
  totalUsers: number;
  totalOrganizations: number;
  activeUsers: number;
  adminUsers: number;
}

export const adminService = {
  /**
   * Get all users with pagination and filters
   */
  async getUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
    const searchParams = new URLSearchParams();

    if (params?.search) searchParams.append('search', params.search);
    if (params?.role) searchParams.append('role', params.role);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const query = searchParams.toString();
    return api.get(`/admin/users${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single user by ID with organization memberships
   */
  async getUserById(userId: string): Promise<AdminUserWithOrganizations> {
    return api.get(`/admin/users/${userId}`);
  },

  /**
   * Update user's platform role (admin/user)
   */
  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<{
    success: boolean;
    message: string;
    userId: string;
    newRole: string;
  }> {
    return api.patch(`/admin/users/${userId}/role`, { role });
  },

  /**
   * Activate or deactivate a user
   */
  async updateUserStatus(userId: string, isActive: boolean): Promise<{
    success: boolean;
    message: string;
    userId: string;
    isActive: boolean;
  }> {
    return api.patch(`/admin/users/${userId}/status`, { isActive });
  },

  /**
   * Delete a user permanently
   */
  async deleteUser(userId: string): Promise<{
    success: boolean;
    message: string;
    userId: string;
  }> {
    return api.delete(`/admin/users/${userId}`);
  },

  /**
   * Get admin dashboard statistics
   */
  async getStats(): Promise<AdminStats> {
    return api.get('/admin/stats');
  },
};

export default adminService;
