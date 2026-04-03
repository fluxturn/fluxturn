import { api } from '../api';

// Types based on backend DTOs
export interface TenantUser {
  id: string;
  email: string;
  emailVerified: boolean;
  fullName?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  loginCount?: number;
  metadata?: Record<string, any>;
}

export interface TenantAuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
}

export interface TenantTeam {
  id: string;
  name: string;
  description?: string;
  role: string;
  joinedAt: string;
}

export interface TenantTeamMember {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
  fullName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

export interface SocialProvider {
  provider: string;
  configured: boolean;
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
}

export interface TenantSession {
  id: string;
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActive: string;
  createdAt: string;
  isCurrent?: boolean;
}

export interface SecurityEvent {
  id: string;
  userId: string;
  eventType: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
  createdAt: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitedBy: string;
  inviterName?: string;
  teamId?: string;
  teamName?: string;
  expiresAt: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

// Enums
export const TeamRole = {
  OWNER: 'owner' as const,
  ADMIN: 'admin' as const,
  EDITOR: 'editor' as const,
  VIEWER: 'viewer' as const,
  MEMBER: 'member' as const,
};
export type TeamRole = typeof TeamRole[keyof typeof TeamRole];

export const SocialProviderType = {
  GOOGLE: 'google' as const,
  GITHUB: 'github' as const,
  FACEBOOK: 'facebook' as const,
  APPLE: 'apple' as const,
  TWITTER: 'twitter' as const,
};
export type SocialProviderType = typeof SocialProviderType[keyof typeof SocialProviderType];

export interface RegisterData {
  email: string;
  password: string;
  fullName?: string;
  metadata?: Record<string, any>;
  frontendUrl?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
  frontendUrl: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface InviteMemberData {
  teamId: string;
  email: string;
  role: TeamRole;
  frontendUrl: string;
}

export interface ConfigureSocialProviderData {
  provider: SocialProviderType;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  enabled?: boolean;
}

export class TenantAuthAPI {
  // Authentication endpoints
  async register(data: RegisterData): Promise<TenantAuthResponse> {
    return api.request<TenantAuthResponse>('/tenant-auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<TenantAuthResponse> {
    return api.request<TenantAuthResponse>('/tenant-auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(token: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>('/tenant-auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async forgotPassword(data: ForgotPasswordData): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>('/tenant-auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetPassword(data: ResetPasswordData): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>('/tenant-auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string): Promise<TenantAuthResponse> {
    return api.request<TenantAuthResponse>('/tenant-auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(refreshToken?: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>('/tenant-auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }


  // User Management
  async getUsers(page?: number, limit?: number, search?: string, role?: string): Promise<{ users: TenantUser[]; total: number }> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    
    const queryString = params.toString();
    const url = queryString ? `/tenant-auth/users?${queryString}` : '/tenant-auth/users';
    
    return api.request<{ users: TenantUser[]; total: number }>(url, {
      method: 'GET',
    });
  }

  async getUser(userId: string): Promise<TenantUser> {
    return api.request<TenantUser>(`/tenant-auth/users/${userId}`, {
      method: 'GET',
    });
  }

  async updateUser(userId: string, data: Partial<TenantUser>): Promise<{ success: boolean; user: TenantUser }> {
    return api.request<{ success: boolean; user: TenantUser }>(`/tenant-auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>(`/tenant-auth/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async verifyUser(userId: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>(`/tenant-auth/users/${userId}/verify`, {
      method: 'PUT',
    });
  }

  // Social Provider Configuration
  async configureSocialProvider(data: ConfigureSocialProviderData): Promise<{ success: boolean; message?: string }> {
    return api.request<{ success: boolean; message?: string }>('/tenant-auth/social/configure', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSessions(): Promise<TenantSession[]> {
    return api.request<TenantSession[]>('/tenant-auth/sessions', {
      method: 'GET',
    });
  }

  async getAuthAnalytics(period: string): Promise<any> {
    return api.request<any>(`/tenant-auth/analytics?period=${period}`, {
      method: 'GET',
    });
  }

  async getPendingInvitations(): Promise<UserInvitation[]> {
    return api.request<UserInvitation[]>('/tenant-auth/invitations/pending', {
      method: 'GET',
    });
  }

  async getSecurityEvents(page: number, limit: number): Promise<{ events: SecurityEvent[]; total: number }> {
    return api.request<{ events: SecurityEvent[]; total: number }>(`/tenant-auth/security-events?page=${page}&limit=${limit}`, {
      method: 'GET',
    });
  }

  async getSocialProviders(): Promise<SocialProvider[]> {
    const response = await api.request<{ success: boolean; providers: SocialProvider[] }>(
      '/tenant-auth/social/providers',
      { method: 'GET' }
    );
    return response.providers;
  }

  async getTeams(): Promise<TenantTeam[]> {
    return api.request<TenantTeam[]>('/tenant-auth/teams', {
      method: 'GET',
    });
  }

  async getLoginAttempts(page?: number, limit?: number): Promise<{ attempts: LoginAttempt[]; total: number }> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = queryString ? `/tenant-auth/login-attempts?${queryString}` : '/tenant-auth/login-attempts';

    return api.request<{ attempts: LoginAttempt[]; total: number }>(url, {
      method: 'GET',
    });
  }

  async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>(`/tenant-auth/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async revokeAllSessions(): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>('/tenant-auth/sessions/revoke-all', {
      method: 'POST',
    });
  }

  async cancelInvitation(invitationId: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>(`/tenant-auth/invitations/${invitationId}/cancel`, {
      method: 'PUT',
    });
  }

  async resendInvitation(invitationId: string): Promise<{ success: boolean }> {
    return api.request<{ success: boolean }>(`/tenant-auth/invitations/${invitationId}/resend`, {
      method: 'POST',
    });
  }

}

export const tenantAuthAPI = new TenantAuthAPI();