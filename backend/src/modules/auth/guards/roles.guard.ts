import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request
    const { user } = context.switchToHttp().getRequest();
    
    // If no user or no role, deny access
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied. No role assigned.');
    }

    // Check if user has one of the required roles
    const hasRole = requiredRoles.some((role) => 
      user.role.toLowerCase() === role.toLowerCase()
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}`
      );
    }

    return true;
  }
}