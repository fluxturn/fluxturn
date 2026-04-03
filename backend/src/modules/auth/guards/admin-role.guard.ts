import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PlatformService } from '../../database';

/**
 * AdminRoleGuard - Checks if user has admin role in the users table (platform-level role)
 * This is different from RolesGuard which checks organization-level roles
 * Use this guard for features that require platform-wide admin access like blog management
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly platformService: PlatformService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    // Query the users table directly to check platform-level role
    const result = await this.platformService.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new ForbiddenException('User not found');
    }

    const userRole = result.rows[0].role;

    // Check if user has admin role
    if (userRole !== 'admin') {
      throw new ForbiddenException('Admin access required. Only administrators can perform this action.');
    }

    return true;
  }
}
