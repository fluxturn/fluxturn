import { Injectable, Logger, CanActivate, ExecutionContext, Optional, Inject, forwardRef } from '@nestjs/common';
import { Socket } from 'socket.io';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class SocketAuthGuard implements CanActivate {
  private readonly logger = new Logger(SocketAuthGuard.name);

  constructor(
    @Optional()
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService | null
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();

    // Skip authentication if authService is not available
    if (!this.authService) {
      this.logger.warn(`WebSocket auth not available - allowing unauthenticated access for: ${client.id}`);
      return true;
    }

    try {
      // Check if already authenticated
      if (client.data?.authContext) {
        return true;
      }

      // Authenticate the socket
      const authContext = await this.authService.authenticateSocket(client);
      if (!authContext) {
        this.logger.warn(`Authentication failed for socket: ${client.id}`);
        client.emit('auth:error', { message: 'Authentication failed' });
        client.disconnect();
        return false;
      }

      // Store auth context in socket data
      client.data.authContext = authContext;
      client.data.userId = authContext.userId;
      client.data.organizationId = authContext.organizationId;
      client.data.projectId = authContext.projectId;
      client.data.appId = authContext.appId;

      this.logger.debug(`Socket authenticated: ${client.id} (User: ${authContext.userId})`);
      return true;
    } catch (error) {
      this.logger.error(`Socket auth guard error: ${error.message}`);
      client.emit('auth:error', { message: 'Authentication error' });
      client.disconnect();
      return false;
    }
  }
}

/**
 * Decorator to get auth context from socket
 */
export const GetAuthContext = () => {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    const existingMetadata = Reflect.getMetadata('custom:auth_context_indexes', target[propertyKey]) || [];
    existingMetadata.push(parameterIndex);
    Reflect.defineMetadata('custom:auth_context_indexes', existingMetadata, target[propertyKey]);
  };
};

/**
 * Rate limiting decorator for socket events
 */
export const SocketRateLimit = (maxEvents: number = 100, windowMs: number = 60000) => {
  const eventCounts = new Map<string, { count: number; resetTime: number }>();

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const client = args.find(arg => arg && arg.id && arg.emit); // Find Socket object
      
      if (!client) {
        return originalMethod.apply(this, args);
      }

      const now = Date.now();
      const key = `${client.id}:${propertyKey}`;
      const record = eventCounts.get(key);

      if (!record || now > record.resetTime) {
        eventCounts.set(key, { count: 1, resetTime: now + windowMs });
        return originalMethod.apply(this, args);
      }

      if (record.count >= maxEvents) {
        client.emit('rate_limit_exceeded', {
          message: 'Too many events',
          event: propertyKey,
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
        return;
      }

      record.count++;
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
};