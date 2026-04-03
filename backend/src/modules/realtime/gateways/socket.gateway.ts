import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, Optional, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../auth/auth.service';
import { SocketAuthGuard, SocketRateLimit } from '../guards/socket-auth.guard';
import { RealtimeService } from '../realtime.service';
import { AuthContext } from '../types/auth.types';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private readonly connectedClients = new Map<string, Socket>();
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService | null,
    private readonly realtimeService: RealtimeService,
  ) {}

  async afterInit(server: Server) {
    // Initialize realtime service
    this.realtimeService.setServer(server);
    
    // Configure CORS
    const corsOrigins = this.configService.get<string>('CORS_ORIGIN', '*').split(',');
    this.logger.log(`WebSocket Gateway initialized with CORS origins: ${corsOrigins.join(', ')}`);
  }

  async handleConnection(client: Socket) {
    try {
      // Skip authentication if authService is not available
      if (!this.authService) {
        this.logger.warn(`WebSocket auth not available - skipping authentication for: ${client.id}`);
        client.emit('auth:warning', { message: 'Authentication unavailable, connection allowed without auth' });
        this.connectedClients.set(client.id, client);
        return;
      }

      const authContext = await this.authService.authenticateSocket(client);

      if (!authContext) {
        this.logger.warn(`Unauthenticated connection attempt: ${client.id}`);
        client.emit('auth:error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Store auth context
      client.data.authContext = authContext;
      client.data.userId = authContext.userId;
      client.data.organizationId = authContext.organizationId;
      client.data.projectId = authContext.projectId;
      client.data.appId = authContext.appId;

      // Track connection
      this.connectedClients.set(client.id, client);

      // Track user sockets
      if (!this.userSockets.has(authContext.userId)) {
        this.userSockets.set(authContext.userId, new Set());
      }
      this.userSockets.get(authContext.userId).add(client.id);

      // Join default rooms
      const rooms = this.authService.getUserRooms(authContext);
      await Promise.all(rooms.map(room => client.join(room)));

      this.logger.log(
        `Client connected: ${client.id} (User: ${authContext.userId}, Org: ${authContext.organizationId})`
      );

      // Send authentication success
      client.emit('auth:success', {
        userId: authContext.userId,
        organizationId: authContext.organizationId,
        projectId: authContext.projectId,
        appId: authContext.appId,
        rooms: rooms,
      });

      // Send connection stats
      client.emit('connection:stats', {
        connectedClients: this.connectedClients.size,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Connection error for ${client.id}:`, error);
      client.emit('auth:error', { message: 'Connection failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    try {
      const authContext = client.data?.authContext as AuthContext;
      
      // Remove from tracking
      this.connectedClients.delete(client.id);

      if (authContext?.userId) {
        const userSockets = this.userSockets.get(authContext.userId);
        if (userSockets) {
          userSockets.delete(client.id);
          if (userSockets.size === 0) {
            this.userSockets.delete(authContext.userId);
          }
        }
      }

      this.logger.log(`Client disconnected: ${client.id}`);
    } catch (error) {
      this.logger.error(`Disconnect error for ${client.id}:`, error);
    }
  }

  // === ROOM MANAGEMENT ===

  @UseGuards(SocketAuthGuard)
  @SocketRateLimit(50, 60000)
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string }
  ) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const { room } = data;

      if (!room) {
        client.emit('room:error', { message: 'Room name is required' });
        return;
      }

      // Skip authorization check if authService is not available
      if (this.authService) {
        const canJoin = await this.authService.canJoinRoom(authContext, room);
        if (!canJoin) {
          client.emit('room:error', { message: 'Access denied to room' });
          return;
        }
      }

      await client.join(room);
      client.emit('room:joined', { room });
      this.logger.debug(`Client ${client.id} joined room: ${room}`);
    } catch (error) {
      this.logger.error(`Error joining room:`, error);
      client.emit('room:error', { message: 'Failed to join room' });
    }
  }

  @UseGuards(SocketAuthGuard)
  @SocketRateLimit(50, 60000)
  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string }
  ) {
    try {
      const { room } = data;

      if (!room) {
        client.emit('room:error', { message: 'Room name is required' });
        return;
      }

      await client.leave(room);
      client.emit('room:left', { room });
      this.logger.debug(`Client ${client.id} left room: ${room}`);
    } catch (error) {
      this.logger.error(`Error leaving room:`, error);
      client.emit('room:error', { message: 'Failed to leave room' });
    }
  }

  // === PING/PONG ===

  @UseGuards(SocketAuthGuard)
  @SocketRateLimit(10, 60000)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  // === STATUS ===

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage('status:get')
  handleGetStatus(@ConnectedSocket() client: Socket) {
    const authContext = client.data.authContext as AuthContext;
    
    client.emit('status:response', {
      connected: true,
      userId: authContext.userId,
      organizationId: authContext.organizationId,
      projectId: authContext.projectId,
      appId: authContext.appId,
      rooms: Array.from(client.rooms),
      timestamp: new Date().toISOString(),
    });
  }

  // === BROADCASTING METHODS ===

  /**
   * Emit to specific user (all their connections)
   */
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user-${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit to organization
   */
  emitToOrganization(organizationId: string, event: string, data: any) {
    this.server.to(`org-${organizationId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit to project
   */
  emitToProject(projectId: string, event: string, data: any) {
    this.server.to(`project-${projectId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit to app
   */
  emitToApp(appId: string, event: string, data: any) {
    this.server.to(`app-${appId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit to specific room
   */
  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // === UTILITY METHODS ===

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      totalConnections: this.connectedClients.size,
      uniqueUsers: this.userSockets.size,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get user's active connections
   */
  getUserConnections(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Disconnect all connections for a user
   */
  disconnectUser(userId: string, reason?: string) {
    const socketIds = this.getUserConnections(userId);
    
    socketIds.forEach(socketId => {
      const socket = this.connectedClients.get(socketId);
      if (socket) {
        if (reason) {
          socket.emit('disconnect:reason', { reason });
        }
        socket.disconnect();
      }
    });
  }
}