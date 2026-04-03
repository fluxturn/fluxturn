import { Strategy } from 'passport-custom';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(req: any): Promise<any> {
    const apiKey = this.extractApiKey(req);

    if (!apiKey) {
      throw new UnauthorizedException('API key not found');
    }

    // Only accept API keys with service_ or anon_ prefix
    if (!apiKey.startsWith('service_') && !apiKey.startsWith('anon_')) {
      throw new UnauthorizedException('Invalid API key format. Must start with service_ or anon_');
    }

    try {
      const authInfo = await this.authService.validateApiKey(apiKey);

      if (!authInfo) {
        throw new UnauthorizedException('Invalid API key');
      }

      // Return user object that will be attached to request.user
      return {
        type: 'apikey',
        apiKey: authInfo.apiKey,
        projectId: authInfo.projectId,
        appId: authInfo.appId,
        organizationId: authInfo.organizationId,
        permissions: authInfo.permissions,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private extractApiKey(req: any): string | null {
    // Check x-api-key header first (preferred for API keys)
    if (req.headers['x-api-key']) {
      return req.headers['x-api-key'];
    }

    // Check authorization header for API keys
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Only accept tokens that start with service_ or anon_ (our API key prefixes)
      if (token.startsWith('service_') || token.startsWith('anon_')) {
        return token;
      }
    }

    // Check query parameter (for webhooks and special cases)
    if (req.query?.api_key) {
      return req.query.api_key;
    }

    return null;
  }
}