import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server: Server;
  private readonly connectedClients = new Map<string, Socket>();
  private readonly userSockets = new Map<string, Set<string>>();
  private chatbotGateway: any;
  private notificationGateway: any;

  setServer(server: Server) {
    this.server = server;
    this.logger.log('Realtime server initialized');
  }

  // Store client connection
  addClient(clientId: string, socket: Socket, userId?: string) {
    this.connectedClients.set(clientId, socket);
    
    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(clientId);
    }
    
    this.logger.log(`Client connected: ${clientId}, Total clients: ${this.connectedClients.size}`);
  }

  // Remove client connection
  removeClient(clientId: string) {
    const socket = this.connectedClients.get(clientId);
    this.connectedClients.delete(clientId);
    
    // Remove from user sockets
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.has(clientId)) {
        sockets.delete(clientId);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
    
    this.logger.log(`Client disconnected: ${clientId}, Remaining clients: ${this.connectedClients.size}`);
  }

  // Send message to specific client
  sendToClient(clientId: string, event: string, data: any) {
    const socket = this.connectedClients.get(clientId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }


  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
      this.logger.log(`Broadcasted event '${event}' to all clients`);
    }
  }

  // Broadcast to specific room
  broadcastToRoom(room: string, event: string, data: any) {
    if (this.server) {
      this.server.to(room).emit(event, data);
      this.logger.log(`Broadcasted event '${event}' to room '${room}'`);
    }
  }

  // Join client to room
  joinRoom(clientId: string, room: string) {
    const socket = this.connectedClients.get(clientId);
    if (socket) {
      socket.join(room);
      this.logger.log(`Client ${clientId} joined room ${room}`);
      return true;
    }
    return false;
  }

  // Leave room
  leaveRoom(clientId: string, room: string) {
    const socket = this.connectedClients.get(clientId);
    if (socket) {
      socket.leave(room);
      this.logger.log(`Client ${clientId} left room ${room}`);
      return true;
    }
    return false;
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get user's active connections
  getUserConnections(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Emit to specific namespace
  emitToNamespace(namespace: string, event: string, data: any) {
    if (this.server) {
      this.server.of(namespace).emit(event, data);
      this.logger.log(`Emitted event '${event}' to namespace '${namespace}'`);
    }
  }

  // === APP PROGRESS METHODS (Compatible with SocketClientService) ===

  sendAppProgress(appId: string, progress: number, message: string, status: string) {
    if (this.server) {
      this.server.of('/app').emit('app:progress', {
        appId,
        progress,
        message,
        status,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug(`App progress: ${appId} - ${progress}% - ${message}`);
    }
  }

  emitAppProgress(appId: string, progress: number, message: string, status: string) {
    this.sendAppProgress(appId, progress, message, status);
  }

  sendAppStatus(appId: string, status: string, data?: any) {
    if (this.server) {
      this.server.of('/app').emit('app:status', {
        appId,
        status,
        data,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug(`App status: ${appId} - ${status}`);
    }
  }

  emitAppStatus(appId: string, status: string, data?: any) {
    this.sendAppStatus(appId, status, data);
  }

  sendFileUpdate(appId: string, file: any) {
    if (this.server) {
      this.server.of('/app').emit('app:file:update', {
        appId,
        file,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug(`File update for app: ${appId}`);
    }
  }

  emitFileUpdate(appId: string, file: any) {
    this.sendFileUpdate(appId, file);
  }

  // === TERMINAL METHODS ===

  sendTerminalOutput(sessionId: string, output: string, type: 'stdout' | 'stderr' = 'stdout') {
    if (this.server) {
      this.server.of('/terminal').emit('terminal:output', {
        sessionId,
        output,
        type,
        timestamp: new Date().toISOString(),
      });
    }
  }

  emitTerminalOutput(sessionId: string, output: string, type: 'stdout' | 'stderr' = 'stdout') {
    this.sendTerminalOutput(sessionId, output, type);
  }

  // === NOTIFICATION METHODS ===

  sendNotificationToUser(
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    options: {
      data?: any;
      expiresIn?: number;
      actions?: any[];
    } = {}
  ) {
    if (this.notificationGateway?.sendToUser) {
      this.notificationGateway.sendToUser(userId, type, title, message, options);
    } else if (this.server) {
      this.server.of('/notifications').emit('notification:user', {
        userId,
        type,
        title,
        message,
        ...options,
        timestamp: new Date().toISOString(),
      });
    }
  }

  sendNotificationToOrganization(
    organizationId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    options: {
      data?: any;
      expiresIn?: number;
      actions?: any[];
      excludeUserId?: string;
    } = {}
  ) {
    if (this.notificationGateway?.sendToOrganization) {
      this.notificationGateway.sendToOrganization(organizationId, type, title, message, options);
    } else if (this.server) {
      this.server.of('/notifications').emit('notification:organization', {
        organizationId,
        type,
        title,
        message,
        ...options,
        timestamp: new Date().toISOString(),
      });
    }
  }

  sendNotificationToProject(
    projectId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    options: {
      data?: any;
      expiresIn?: number;
      actions?: any[];
    } = {}
  ) {
    if (this.notificationGateway?.sendToProject) {
      this.notificationGateway.sendToProject(projectId, type, title, message, options);
    } else if (this.server) {
      this.server.of('/notifications').emit('notification:project', {
        projectId,
        type,
        title,
        message,
        ...options,
        timestamp: new Date().toISOString(),
      });
    }
  }

  sendNotificationToApp(
    appId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    options: {
      data?: any;
      expiresIn?: number;
      actions?: any[];
    } = {}
  ) {
    if (this.notificationGateway?.sendToApp) {
      this.notificationGateway.sendToApp(appId, type, title, message, options);
    } else if (this.server) {
      this.server.of('/notifications').emit('notification:app', {
        appId,
        type,
        title,
        message,
        ...options,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // === CHATBOT METHODS ===

  sendBotResponse(sessionId: string, message: string, metadata?: any) {
    if (this.chatbotGateway?.emitBotResponse) {
      this.chatbotGateway.emitBotResponse(sessionId, message, metadata);
    } else if (this.server) {
      this.server.of('/chatbot').emit('chatbot:response', {
        sessionId,
        message,
        metadata,
        timestamp: new Date().toISOString(),
      });
    }
  }

  sendBotTyping(sessionId: string, isTyping: boolean) {
    if (this.chatbotGateway?.emitBotTyping) {
      this.chatbotGateway.emitBotTyping(sessionId, isTyping);
    } else if (this.server) {
      this.server.of('/chatbot').emit('chatbot:typing', {
        sessionId,
        isTyping,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // === Set Gateway References ===

  setChatbotGateway(gateway: any) {
    this.chatbotGateway = gateway;
  }

  setNotificationGateway(gateway: any) {
    this.notificationGateway = gateway;
  }

  // === BACKWARD COMPATIBILITY METHODS ===

  sendToOrganization(organizationId: string, event: string, data: any) {
    if (this.server) {
      this.server.emit(event, {
        organizationId,
        ...data,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug(`Event sent to organization ${organizationId}: ${event}`);
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    if (this.server) {
      this.server.emit(event, {
        userId,
        ...data,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug(`Event sent to user ${userId}: ${event}`);
    }
  }

  sendToProject(projectId: string, event: string, data: any) {
    if (this.server) {
      this.server.emit(event, {
        projectId,
        ...data,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug(`Event sent to project ${projectId}: ${event}`);
    }
  }

  sendToApp(appId: string, event: string, data: any) {
    if (this.server) {
      this.server.emit(event, {
        appId,
        ...data,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug(`Event sent to app ${appId}: ${event}`);
    }
  }

  // === UTILITY METHODS ===

  isConnected(): boolean {
    return this.server !== null && this.server !== undefined;
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected(),
      totalClients: this.connectedClients.size,
      totalUsers: this.userSockets.size,
      timestamp: new Date().toISOString(),
    };
  }
}