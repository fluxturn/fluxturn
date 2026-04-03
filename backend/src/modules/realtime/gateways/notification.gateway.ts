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

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  userId?: string;
  organizationId?: string;
  projectId?: string;
  appId?: string;
  data?: any;
  timestamp: string;
  expiresAt?: string;
  read: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  id: string;
  label: string;
  action: string;
  data?: any;
}

interface NotificationSubscription {
  userId: string;
  types: string[];
  filters: {
    organizationId?: string;
    projectId?: string;
    appId?: string;
  };
}

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly userNotifications = new Map<string, Notification[]>();
  private readonly subscriptions = new Map<string, NotificationSubscription>();

  constructor(
    @Optional()
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService | null
  ) {}

  // === SUBSCRIPTION MANAGEMENT ===

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      types?: string[];
      organizationId?: string;
      projectId?: string;
      appId?: string;
    }
  ) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const { types = ['*'], organizationId, projectId, appId } = data;

      // Validate access to specified resources
      if (organizationId && organizationId !== authContext.organizationId) {
        client.emit('notification:error', { message: 'Access denied to organization' });
        return;
      }

      if (projectId && !(await this.authService.canAccessProject(authContext, projectId))) {
        client.emit('notification:error', { message: 'Access denied to project' });
        return;
      }

      if (appId && !(await this.authService.canAccessApp(authContext, appId))) {
        client.emit('notification:error', { message: 'Access denied to app' });
        return;
      }

      // Store subscription
      const subscription: NotificationSubscription = {
        userId: authContext.userId,
        types,
        filters: {
          organizationId: organizationId || authContext.organizationId,
          projectId,
          appId,
        },
      };

      this.subscriptions.set(client.id, subscription);

      // Join notification rooms
      await client.join(`notifications-${authContext.userId}`);
      
      if (organizationId || authContext.organizationId) {
        await client.join(`notifications-org-${organizationId || authContext.organizationId}`);
      }
      
      if (projectId) {
        await client.join(`notifications-project-${projectId}`);
      }
      
      if (appId) {
        await client.join(`notifications-app-${appId}`);
      }

      client.emit('notification:subscribed', {
        subscription,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Notification subscription created for user ${authContext.userId}`);
    } catch (error) {
      this.logger.error('Error subscribing to notifications:', error);
      client.emit('notification:error', { message: 'Failed to subscribe' });
    }
  }

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(@ConnectedSocket() client: Socket) {
    try {
      const subscription = this.subscriptions.get(client.id);
      if (subscription) {
        this.subscriptions.delete(client.id);
        client.emit('notification:unsubscribed', {
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error('Error unsubscribing from notifications:', error);
      client.emit('notification:error', { message: 'Failed to unsubscribe' });
    }
  }

  // === NOTIFICATION MANAGEMENT ===

  @UseGuards(SocketAuthGuard)
  @SocketRateLimit(100, 60000)
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationIds: string[] }
  ) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const { notificationIds } = data;

      if (!notificationIds || !Array.isArray(notificationIds)) {
        client.emit('notification:error', { message: 'Notification IDs array is required' });
        return;
      }

      const userNotifications = this.userNotifications.get(authContext.userId) || [];
      let markedCount = 0;

      notificationIds.forEach(id => {
        const notification = userNotifications.find(n => n.id === id);
        if (notification && !notification.read) {
          notification.read = true;
          markedCount++;
        }
      });

      client.emit('notification:marked_read', {
        markedCount,
        notificationIds,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Marked ${markedCount} notifications as read for user ${authContext.userId}`);
    } catch (error) {
      this.logger.error('Error marking notifications as read:', error);
      client.emit('notification:error', { message: 'Failed to mark notifications as read' });
    }
  }

  @UseGuards(SocketAuthGuard)
  @SocketRateLimit(50, 60000)
  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() client: Socket) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const userNotifications = this.userNotifications.get(authContext.userId) || [];
      
      let markedCount = 0;
      userNotifications.forEach(notification => {
        if (!notification.read) {
          notification.read = true;
          markedCount++;
        }
      });

      client.emit('notification:all_marked_read', {
        markedCount,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Marked all ${markedCount} notifications as read for user ${authContext.userId}`);
    } catch (error) {
      this.logger.error('Error marking all notifications as read:', error);
      client.emit('notification:error', { message: 'Failed to mark all notifications as read' });
    }
  }

  @UseGuards(SocketAuthGuard)
  @SubscribeMessage('get_notifications')
  async handleGetNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { limit?: number; offset?: number; unreadOnly?: boolean }
  ) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const { limit = 50, offset = 0, unreadOnly = false } = data;

      let userNotifications = this.userNotifications.get(authContext.userId) || [];

      if (unreadOnly) {
        userNotifications = userNotifications.filter(n => !n.read);
      }

      // Sort by timestamp (newest first)
      userNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const paginatedNotifications = userNotifications.slice(offset, offset + limit);

      client.emit('notification:list', {
        notifications: paginatedNotifications,
        total: userNotifications.length,
        unreadCount: userNotifications.filter(n => !n.read).length,
        limit,
        offset,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error getting notifications:', error);
      client.emit('notification:error', { message: 'Failed to get notifications' });
    }
  }

  @UseGuards(SocketAuthGuard)
  @SocketRateLimit(10, 60000)
  @SubscribeMessage('action')
  async handleNotificationAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string; actionId: string }
  ) {
    try {
      const authContext = client.data.authContext as AuthContext;
      const { notificationId, actionId } = data;

      if (!notificationId || !actionId) {
        client.emit('notification:error', { message: 'Notification ID and action ID are required' });
        return;
      }

      const userNotifications = this.userNotifications.get(authContext.userId) || [];
      const notification = userNotifications.find(n => n.id === notificationId);

      if (!notification) {
        client.emit('notification:error', { message: 'Notification not found' });
        return;
      }

      const action = notification.actions?.find(a => a.id === actionId);
      if (!action) {
        client.emit('notification:error', { message: 'Action not found' });
        return;
      }

      // Mark notification as read when action is taken
      notification.read = true;

      client.emit('notification:action_executed', {
        notificationId,
        action,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Notification action executed: ${actionId} for notification ${notificationId}`);
    } catch (error) {
      this.logger.error('Error executing notification action:', error);
      client.emit('notification:error', { message: 'Failed to execute action' });
    }
  }

  // === PUBLIC METHODS FOR SENDING NOTIFICATIONS ===

  /**
   * Send notification to specific user
   */
  sendToUser(
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    options: {
      data?: any;
      expiresIn?: number; // minutes
      actions?: NotificationAction[];
    } = {}
  ) {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      userId,
      data: options.data,
      timestamp: new Date().toISOString(),
      expiresAt: options.expiresIn ? 
        new Date(Date.now() + options.expiresIn * 60000).toISOString() : undefined,
      read: false,
      actions: options.actions,
    };

    // Store notification
    if (!this.userNotifications.has(userId)) {
      this.userNotifications.set(userId, []);
    }
    this.userNotifications.get(userId).push(notification);

    // Clean up old notifications (keep last 1000)
    const userNotifs = this.userNotifications.get(userId);
    if (userNotifs.length > 1000) {
      userNotifs.splice(0, userNotifs.length - 1000);
    }

    // Emit to user
    this.server.to(`notifications-${userId}`).emit('notification:new', notification);

    this.logger.debug(`Notification sent to user ${userId}: ${title}`);
  }

  /**
   * Send notification to organization
   */
  sendToOrganization(
    organizationId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    options: {
      data?: any;
      expiresIn?: number;
      actions?: NotificationAction[];
      excludeUserId?: string;
    } = {}
  ) {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      organizationId,
      data: options.data,
      timestamp: new Date().toISOString(),
      expiresAt: options.expiresIn ? 
        new Date(Date.now() + options.expiresIn * 60000).toISOString() : undefined,
      read: false,
      actions: options.actions,
    };

    // Emit to organization room
    const emitter = options.excludeUserId ? 
      this.server.to(`notifications-org-${organizationId}`).except(`notifications-${options.excludeUserId}`) :
      this.server.to(`notifications-org-${organizationId}`);

    emitter.emit('notification:new', notification);

    this.logger.debug(`Notification sent to organization ${organizationId}: ${title}`);
  }

  /**
   * Send notification to project
   */
  sendToProject(
    projectId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    options: {
      data?: any;
      expiresIn?: number;
      actions?: NotificationAction[];
    } = {}
  ) {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      projectId,
      data: options.data,
      timestamp: new Date().toISOString(),
      expiresAt: options.expiresIn ? 
        new Date(Date.now() + options.expiresIn * 60000).toISOString() : undefined,
      read: false,
      actions: options.actions,
    };

    // Emit to project room
    this.server.to(`notifications-project-${projectId}`).emit('notification:new', notification);

    this.logger.debug(`Notification sent to project ${projectId}: ${title}`);
  }

  /**
   * Send notification to app
   */
  sendToApp(
    appId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message: string,
    options: {
      data?: any;
      expiresIn?: number;
      actions?: NotificationAction[];
    } = {}
  ) {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      appId,
      data: options.data,
      timestamp: new Date().toISOString(),
      expiresAt: options.expiresIn ? 
        new Date(Date.now() + options.expiresIn * 60000).toISOString() : undefined,
      read: false,
      actions: options.actions,
    };

    // Emit to app room
    this.server.to(`notifications-app-${appId}`).emit('notification:new', notification);

    this.logger.debug(`Notification sent to app ${appId}: ${title}`);
  }

  /**
   * Get notification statistics
   */
  getNotificationStats() {
    const totalNotifications = Array.from(this.userNotifications.values())
      .reduce((total, notifications) => total + notifications.length, 0);
    
    const unreadNotifications = Array.from(this.userNotifications.values())
      .reduce((total, notifications) => 
        total + notifications.filter(n => !n.read).length, 0);

    return {
      totalUsers: this.userNotifications.size,
      totalNotifications,
      unreadNotifications,
      activeSubscriptions: this.subscriptions.size,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clean up expired notifications
   */
  cleanupExpiredNotifications() {
    const now = new Date();
    let cleanedCount = 0;

    this.userNotifications.forEach((notifications, userId) => {
      const validNotifications = notifications.filter(notification => {
        if (notification.expiresAt && new Date(notification.expiresAt) < now) {
          cleanedCount++;
          return false;
        }
        return true;
      });

      this.userNotifications.set(userId, validNotifications);
    });

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired notifications`);
    }

    return cleanedCount;
  }
}