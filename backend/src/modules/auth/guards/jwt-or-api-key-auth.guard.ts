import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtOrApiKeyAuthGuard extends AuthGuard(['jwt', 'api-key']) {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // This will try JWT first, then API key if JWT fails
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
    // If user is authenticated by either strategy, process the user
    if (user) {
      const request = context.switchToHttp().getRequest();
      
      // Extract context from headers
      const organizationId = request.headers['x-organization-id'] || user.organizationId;
      const projectId = request.headers['x-project-id'] || user.projectId;
      const appId = request.headers['x-app-id'] || user.appId;
      
      if (user.type === 'apikey') {
        // For API key authentication
        request.auth = {
          type: 'apikey',
          apiKey: user.apiKey,
          projectId: projectId,
          appId: appId,
          organizationId: organizationId,
          permissions: user.permissions,
        };
      } else {
        // For JWT authentication
        request.auth = {
          type: 'jwt',
          userId: user.userId || user.sub,
          email: user.email,
          projectId: projectId,
          appId: appId,
          organizationId: organizationId,
        };
      }
      
      return user;
    }
    
    // If no user was authenticated, throw a more generic error
    // Don't reveal which authentication method failed
    throw new UnauthorizedException('Authentication required. Please provide a valid JWT token or API key.');
  }
}