import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { Organization } from '../types/organization';

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string; // Backwards compatibility
  role?: string;
  status?: string;
  avatarUrl?: string;
  bio?: string;
  website?: string;
  location?: string;
  twoFactorEnabled?: boolean;
  organization?: { id: string; name: string; [key: string]: unknown };
  organizationId?: string;
  projectId?: string;
}

interface AuthContextType {
  user: User | null;
  organizations: Organization[];
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refreshOrganizations: () => Promise<Organization[]>;
  updateUser: (userData: Partial<User>) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const refreshOrgTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      // Debounce organization refresh to prevent rapid repeated calls
      if (refreshOrgTimeoutRef.current) {
        clearTimeout(refreshOrgTimeoutRef.current);
      }

      refreshOrgTimeoutRef.current = setTimeout(() => {
        refreshOrganizations();
      }, 500); // 500ms debounce
    }

    return () => {
      if (refreshOrgTimeoutRef.current) {
        clearTimeout(refreshOrgTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkAuth = async () => {
    try {
      const token = api.getToken();
      if (!token) {
        // No token, user is not logged in
        setLoading(false);
        return;
      }

      // Check if token is expired (basic check - you might want to decode JWT)
      try {
        // Try to get profile with the token
        const response = await api.getProfile() as { user?: Record<string, string | undefined>; [key: string]: unknown };

        // The /auth/me endpoint returns: { user: { ... } }
        const profile = (response.user || response) as Record<string, string | undefined>;
        
        const userData: User = {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          firstName: profile.firstName,
          lastName: profile.lastName,
          fullName: profile.fullName,
          name: profile.fullName || profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email.split('@')[0],
          role: profile.role || 'user',
          status: profile.status || 'active',
          avatarUrl: profile.avatarUrl,
          organizationId: profile.organizationId,
          projectId: profile.projectId,
          organization: profile.organizationId ? { id: profile.organizationId } : null
        };
        
        setUser(userData);
        
        // Load organizations after user is authenticated
        await loadUserData();
      } catch (error: unknown) {
        // Token might be expired or invalid
        console.error('Auth check failed:', error);
        const errMsg = error instanceof Error ? error.message : '';

        // If we get a 401, token is invalid/expired
        if (errMsg?.includes('Unauthorized') || errMsg?.includes('401')) {
          // Try to refresh the token if we have a refresh token
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const refreshResponse = await api.refresh(refreshToken);
              if (refreshResponse?.user) {
                setUser(refreshResponse.user);
                await loadUserData();
                return; // Successfully refreshed
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
            }
          }
        }
        
        // Clear everything if we can't authenticate
        api.setToken(null);
        localStorage.removeItem('refreshToken');
        setUser(null);
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      api.setToken(null);
      localStorage.removeItem('refreshToken');
      setUser(null);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      // console.log('Loading user data...');
      // Load organizations using user-specific endpoint
      const orgsResponse = await api.getUserOrganizations();
      // console.log('Organizations response in auth:', orgsResponse);

      // Backend returns paginated response with data array
      const orgs = orgsResponse?.data || (Array.isArray(orgsResponse) ? orgsResponse : []);
      // console.log('Setting organizations:', orgs);
      setOrganizations(orgs);

      // Set organization and project context for API calls
      if (orgs.length > 0) {
        const firstOrg = orgs[0];
        api.setOrganizationId(firstOrg.id);
        // console.log('Set organization ID for API context:', firstOrg.id);

        // Load projects for the first organization
        try {
          const projectsResponse = await api.getProjectsByOrganization(firstOrg.id);
          const projects = projectsResponse?.data || [];

          if (projects.length > 0) {
            const firstProject = projects[0];
            api.setProjectId(firstProject.id);
            // console.log('Set project ID for API context:', firstProject.id);
          } else {
            // console.warn('No projects found for organization:', firstOrg.id);
          }
        } catch (projectError) {
          console.error('Failed to load projects:', projectError);
        }
      } else {
        // console.warn('No organizations found for user');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      // Don't clear user data on failure, just log the error
    }
  };

  const isRefreshingOrgsRef = React.useRef(false);

  const refreshOrganizations = async (): Promise<Organization[]> => {
    // Prevent multiple simultaneous calls
    if (isRefreshingOrgsRef.current) {
      // console.log('Organization refresh already in progress, skipping...');
      return organizations; // Return current organizations
    }

    isRefreshingOrgsRef.current = true;

    try {
      const orgsResponse = await api.getUserOrganizations();
      // console.log('Refreshing organizations response:', orgsResponse);

      // Backend returns paginated response with data array
      const orgs = orgsResponse?.data || (Array.isArray(orgsResponse) ? orgsResponse : []);
      // console.log('Setting refreshed organizations:', orgs);
      setOrganizations(orgs);

      // Update API context with first organization and project
      if (orgs.length > 0) {
        const firstOrg = orgs[0];
        api.setOrganizationId(firstOrg.id);

        try {
          const projectsResponse = await api.getProjectsByOrganization(firstOrg.id);
          const projects = projectsResponse?.data || [];

          if (projects.length > 0) {
            api.setProjectId(projects[0].id);
          }
        } catch (projectError) {
          console.error('Failed to refresh projects:', projectError);
        }
      }

      return orgs;
    } catch (error) {
      console.error('Failed to refresh organizations:', error);
      return [];
    } finally {
      isRefreshingOrgsRef.current = false;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      // Set loading to true while logging in
      setLoading(true);

      // Clear any existing state first
      setUser(null);
      setOrganizations([]);

      const response = await api.login(email, password);
      setUser(response.user);

      // Save refresh token if provided
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }

      // Small delay to ensure token is saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load organizations after login, but don't fail if it errors
      try {
        // console.log('🔄 [LOGIN] Fetching organizations for user...');
        // Load organizations using user-specific endpoint
        const orgsResponse = await api.getUserOrganizations();
        // console.log('📦 [LOGIN] Organizations response:', orgsResponse);

        const userOrgs = orgsResponse?.data || (Array.isArray(orgsResponse) ? orgsResponse : []);
        // console.log('📊 [LOGIN] Parsed organizations:', userOrgs.length, 'orgs');

        setOrganizations(userOrgs);

        // Set organization and project context for API calls
        if (userOrgs.length > 0) {
          const firstOrg = userOrgs[0];
          // console.log('🏢 [LOGIN] Setting first organization:', firstOrg.id, firstOrg.name);

          api.setOrganizationId(firstOrg.id);
          // console.log('✅ [LOGIN] Called api.setOrganizationId()');

          // Verify localStorage was updated
          // console.log('💾 [LOGIN] localStorage check - selectedOrganizationId:', localStorage.getItem('selectedOrganizationId'));

          // Load projects for the first organization
          try {
            const projectsResponse = await api.getProjectsByOrganization(firstOrg.id);
            const projects = projectsResponse?.data || [];

            if (projects.length > 0) {
              const firstProject = projects[0];
              api.setProjectId(firstProject.id);
              // console.log('📁 [LOGIN] Set project ID for API context:', firstProject.id);

              // Verify project was stored
              // console.log('💾 [LOGIN] localStorage check - selectedProjectId:', localStorage.getItem('selectedProjectId'));
            } else {
              // console.warn('⚠️  [LOGIN] No projects found for organization:', firstOrg.id);
            }
          } catch (projectError) {
            console.error('❌ [LOGIN] Failed to load projects:', projectError);
          }
        } else {
          // console.warn('⚠️  [LOGIN] No organizations found for user');
        }
      } catch (error) {
        console.error('❌ [LOGIN] Failed to load initial data after login:', error);
        // Continue with login even if loading user data fails
      }

      // Set loading to false after everything is loaded
      setLoading(false);

      // Return the user for redirect logic
      return response.user;
    } catch (error) {
      console.error('Login failed:', error);
      setLoading(false);
      throw error; // Re-throw to be handled by the login page
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      
      // Register the user with single name field - backend will handle splitting
      await api.register(email, password, name);
      
      // Registration successful but user needs to login
      setLoading(false);
      
      // Don't set user or organizations since registration doesn't log the user in
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear all auth state
    setUser(null);
    setOrganizations([]);
    setLoading(false);

    // Clear any other cached data
    if (typeof window !== 'undefined') {
      // Clear localStorage completely for auth-related data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('selectedOrganizationId');
      localStorage.removeItem('selectedProjectId');
      localStorage.removeItem('selectedAppId');
    }

    // Clear API client context
    api.setOrganizationId(null);
    api.setProjectId(null);
    api.setAppId(null);
  };

  const refreshUser = async () => {
    try {
      const response = await api.getProfile() as { user?: Record<string, string | undefined>; [key: string]: unknown };

      // The /auth/me endpoint returns: { user: { ... } }
      const profile = (response.user || response) as Record<string, string | undefined>;

      if (!profile) {
        console.error('No profile data received');
        return;
      }

      const userData: User = {
        id: profile.id || profile.userId,
        email: profile.email,
        username: profile.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
        fullName: profile.fullName,
        name: profile.fullName || profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email?.split('@')[0],
        role: profile.role || 'user',
        status: profile.status || 'active',
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        website: profile.website,
        location: profile.location,
        twoFactorEnabled: profile.twoFactorEnabled,
        organizationId: profile.organizationId,
        projectId: profile.projectId,
        organization: profile.organization || (profile.organizationId ? { id: profile.organizationId } : null)
      };

      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, don't crash - just log the error
    }
  };

  // Add refreshAuth alias for compatibility
  const refreshAuth = async () => {
    await refreshUser();
    await refreshOrganizations();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        refreshAuth,
        refreshOrganizations,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
