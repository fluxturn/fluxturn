import React from 'react';
import { useRoles } from '../../hooks/useRoles';

interface RoleBasedContentProps {
  requiredRole?: string;
  requiredRoles?: string[];
  adminOnly?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component for conditionally rendering content based on user roles
 */
export const RoleBasedContent: React.FC<RoleBasedContentProps> = ({
  requiredRole,
  requiredRoles,
  adminOnly,
  children,
  fallback = null,
}) => {
  const { isAdmin, hasRole, hasAnyRole } = useRoles();

  // Check if user has permission to view content
  const hasPermission = (() => {
    if (adminOnly) {
      return isAdmin();
    }
    
    if (requiredRole) {
      return hasRole(requiredRole);
    }
    
    if (requiredRoles && requiredRoles.length > 0) {
      return hasAnyRole(requiredRoles);
    }
    
    // If no requirements specified, show content
    return true;
  })();

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};