import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles are allowed to access a route
 * @param roles - Array of role names that are allowed
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorator to require admin role
 * Accepts both 'admin' and 'owner' roles since owners have admin privileges
 */
export const RequireAdmin = () => SetMetadata(ROLES_KEY, ['admin', 'owner']);