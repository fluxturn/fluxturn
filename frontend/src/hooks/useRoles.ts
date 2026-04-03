import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for role-based access control
 * Provides utility functions for checking user roles and permissions
 */
export function useRoles() {
  const { user } = useAuth();
  
  const userRole = user?.role?.toLowerCase() || '';
  
  /**
   * Check if the current user is an admin
   */
  const isAdmin = () => {
    return userRole === 'admin' || userRole === 'administrator' || userRole === 'owner';
  };
  
  /**
   * Check if the current user has a specific role
   * @param role - The role to check for
   */
  const hasRole = (role: string) => {
    return userRole === role.toLowerCase();
  };
  
  /**
   * Check if the current user has any of the specified roles
   * @param roles - Array of roles to check for
   */
  const hasAnyRole = (roles: string[]) => {
    return roles.some(role => hasRole(role));
  };
  
  /**
   * Check if the current user can access something based on required role
   * Admin can access everything
   * @param requiredRole - The required role for access
   */
  const canAccess = (requiredRole: string) => {
    return isAdmin() || hasRole(requiredRole);
  };
  
  return {
    userRole,
    isAdmin,
    hasRole,
    hasAnyRole,
    canAccess,
    user
  };
}