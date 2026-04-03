import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Only accept API keys with cgx_ prefix
    if (!apiKey.startsWith('cgx_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    try {
      const authInfo = await this.authService.validateApiKey(apiKey);

      if (!authInfo) {
        throw new UnauthorizedException('Invalid API key');
      }

      // Attach auth info to request
      request.auth = {
        type: 'apikey',
        apiKey: authInfo.apiKey,
        projectId: authInfo.projectId,
        appId: authInfo.appId,
        organizationId: authInfo.organizationId,
        permissions: authInfo.permissions,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private extractApiKey(request: any): string | null {
    // Check header first
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    if (request.headers['x-api-key']) {
      return request.headers['x-api-key'];
    }

    // Check query parameter
    if (request.query?.api_key) {
      return request.query.api_key;
    }

    return null;
  }
}