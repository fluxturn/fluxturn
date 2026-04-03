import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = this.extractTokenFromClient(client);
      
      if (!token) {
        throw new WsException('Unauthorized');
      }

      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      
      return true;
    } catch (err) {
      throw new WsException('Unauthorized');
    }
  }

  private extractTokenFromClient(client: Socket): string | undefined {
    // Try to get token from auth object
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }
    
    // Try to get token from authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Try to get token from query params
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }
    
    return undefined;
  }
}