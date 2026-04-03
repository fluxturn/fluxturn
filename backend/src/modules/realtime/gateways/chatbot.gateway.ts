import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards, Optional, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { SocketAuthGuard, SocketRateLimit } from '../guards/socket-auth.guard';
import { AuthService } from '../../auth/auth.service';
import { RealtimeService } from '../realtime.service';
import { AuthContext } from '../types/auth.types';

interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'bot';
  timestamp: string;
  sessionId: string;
  appId?: string;
  metadata?: any;
}

interface ChatSession {
  id: string;
  appId: string;
  userId: string;
  organizationId: string;
  status: 'active' | 'paused' | 'ended';
  createdAt: string;
  lastActivity: string;
}

@Injectable()
@WebSocketGateway({
  namespace: '/chatbot',
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatbotGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatbotGateway.name);
  private readonly activeSessions = new Map<string, ChatSession>();
  private readonly userSessions = new Map<string, Set<string>>();

  constructor(
    @Optional()
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService | null
  ) {}

  // === SESSION MANAGEMENT ===

  @UseGuards(SocketAuthGuard)
  @SocketRateLimit(20, 60000)
  @SubscribeMessage('session:start')
  async handleStartSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { appId: string; metadata?: any }
  ) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const { appId, metadata } = data;

      if (!appId) {
        client.emit('session:error', { message: 'App ID is required' });
        return;
      }

      // Check if user can access this app
      const canAccess = await this.authService.canAccessApp(authContext, appId);
      if (!canAccess) {
        client.emit('session:error', { message: 'Access denied to app' });
        return;
      }

      // Create new session
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const session: ChatSession = {
        id: sessionId,
        appId,
        userId: authContext.userId,
        organizationId: authContext.organizationId,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      // Store session
      this.activeSessions.set(sessionId, session);
      
      // Track user sessions
      if (!this.userSessions.has(authContext.userId)) {
        this.userSessions.set(authContext.userId, new Set());
      }
      this.userSessions.get(authContext.userId).add(sessionId);

      // Join session room
      await client.join(`session-${sessionId}`);
      await client.join(`app-${appId}`);

      client.emit('session:started', {
        sessionId,
        appId,
        status: 'active',
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Chat session started: ${sessionId} for app ${appId} by user ${authContext.userId}`);
    } catch (error) {
      this.logger.error('Error starting chat session:', error);
      client.emit('session:error', { message: 'Failed to start session' });
    }
  }

  @UseGuards(SocketAuthGuard)
  @SocketRateLimit(20, 60000)
  @SubscribeMessage('session:end')
  async handleEndSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string }
  ) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const { sessionId } = data;

      if (!sessionId) {
        client.emit('session:error', { message: 'Session ID is required' });
        return;
      }

      const session = this.activeSessions.get(sessionId);
      if (!session) {
        client.emit('session:error', { message: 'Session not found' });
        return;
      }

      // Check ownership
      if (session.userId !== authContext.userId) {
        client.emit('session:error', { message: 'Access denied to session' });
        return;
      }

      // Update session status
      session.status = 'ended';
      session.lastActivity = new Date().toISOString();

      // Leave rooms
      await client.leave(`session-${sessionId}`);

      // Remove from tracking
      this.activeSessions.delete(sessionId);
      const userSessions = this.userSessions.get(authContext.userId);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessions.delete(authContext.userId);
        }
      }

      client.emit('session:ended', {
        sessionId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Chat session ended: ${sessionId} by user ${authContext.userId}`);
    } catch (error) {
      this.logger.error('Error ending chat session:', error);
      client.emit('session:error', { message: 'Failed to end session' });
    }
  }

  // === MESSAGE HANDLING ===

  @UseGuards(SocketAuthGuard)
  @SocketRateLimit(100, 60000)
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; message: string; metadata?: any }
  ) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const { sessionId, message, metadata } = data;

      if (!sessionId || !message) {
        client.emit('message:error', { message: 'Session ID and message are required' });
        return;
      }

      const session = this.activeSessions.get(sessionId);
      if (!session) {
        client.emit('message:error', { message: 'Session not found' });
        return;
      }

      // Check ownership
      if (session.userId !== authContext.userId) {
        client.emit('message:error', { message: 'Access denied to session' });
        return;
      }

      // Create message
      const chatMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message,
        sender: 'user',
        timestamp: new Date().toISOString(),
        sessionId,
        appId: session.appId,
        metadata,
      };

      // Update session activity
      session.lastActivity = new Date().toISOString();

      // Emit message to session room
      this.server.to(`session-${sessionId}`).emit('message:received', chatMessage);

      // Emit to app room for monitoring
      this.server.to(`app-${session.appId}`).emit('message:user', {
        sessionId,
        message: chatMessage,
        userId: authContext.userId,
      });

      this.logger.debug(`Message sent in session ${sessionId}: ${message.substring(0, 50)}`);
    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('message:error', { message: 'Failed to send message' });
    }
  }

  @UseGuards(SocketAuthGuard)
  @SocketRateLimit(10, 60000)
  @SubscribeMessage('message:typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; isTyping: boolean }
  ) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const { sessionId, isTyping } = data;

      if (!sessionId) {
        return;
      }

      const session = this.activeSessions.get(sessionId);
      if (!session || session.userId !== authContext.userId) {
        return;
      }

      // Emit typing indicator to session room (excluding sender)
      client.to(`session-${sessionId}`).emit('message:typing', {
        sessionId,
        userId: authContext.userId,
        isTyping,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error handling typing indicator:', error);
    }
  }

  // === SESSION INFO ===

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage('session:list')
  async handleListSessions(@ConnectedSocket() client: Socket) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const userSessions = this.userSessions.get(authContext.userId);
      
      if (!userSessions) {
        client.emit('session:list', { sessions: [] });
        return;
      }

      const sessions = Array.from(userSessions)
        .map(sessionId => this.activeSessions.get(sessionId))
        .filter(session => session !== undefined);

      client.emit('session:list', {
        sessions,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error listing sessions:', error);
      client.emit('session:error', { message: 'Failed to list sessions' });
    }
  }

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage('session:info')
  async handleSessionInfo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string }
  ) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const { sessionId } = data;

      if (!sessionId) {
        client.emit('session:error', { message: 'Session ID is required' });
        return;
      }

      const session = this.activeSessions.get(sessionId);
      if (!session) {
        client.emit('session:error', { message: 'Session not found' });
        return;
      }

      if (session.userId !== authContext.userId) {
        client.emit('session:error', { message: 'Access denied to session' });
        return;
      }

      client.emit('session:info', {
        session,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error getting session info:', error);
      client.emit('session:error', { message: 'Failed to get session info' });
    }
  }

  // === PUBLIC METHODS FOR BOT RESPONSES ===

  /**
   * Emit bot response to a session
   */
  emitBotResponse(sessionId: string, message: string, metadata?: any) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Bot response to non-existent session: ${sessionId}`);
      return;
    }

    const chatMessage: ChatMessage = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      sender: 'bot',
      timestamp: new Date().toISOString(),
      sessionId,
      appId: session.appId,
      metadata,
    };

    // Update session activity
    session.lastActivity = new Date().toISOString();

    // Emit to session room
    this.server.to(`session-${sessionId}`).emit('message:received', chatMessage);

    // Emit to app room for monitoring
    this.server.to(`app-${session.appId}`).emit('message:bot', {
      sessionId,
      message: chatMessage,
    });
  }

  /**
   * Emit bot typing indicator
   */
  emitBotTyping(sessionId: string, isTyping: boolean) {
    this.server.to(`session-${sessionId}`).emit('message:typing', {
      sessionId,
      sender: 'bot',
      isTyping,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      activeSessions: this.activeSessions.size,
      uniqueUsers: this.userSessions.size,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ChatSession | undefined {
    return this.activeSessions.get(sessionId);
  }
}