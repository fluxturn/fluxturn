import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getEnvironmentBaseUrl } from '../lib/config';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinAppRoom: (appId: string) => void;
  leaveAppRoom: (appId: string) => void;
  joinTerminal: (sessionId: string) => void;
  sendTerminalInput: (sessionId: string, input: string) => void;
  onAppProgress: (callback: (data: any) => void) => void;
  onAppStatus: (callback: (data: any) => void) => void;
  onFileUpdate: (callback: (data: any) => void) => void;
  onTerminalOutput: (callback: (data: any) => void) => void;
  removeAllListeners: () => void;
}

export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    // Return a fallback object when context is not available
    return {
      socket: null,
      connected: false,
      joinAppRoom: () => {},
      leaveAppRoom: () => {},
      joinTerminal: () => {},
      sendTerminalInput: () => {},
      onAppProgress: () => {},
      onAppStatus: () => {},
      onFileUpdate: () => {},
      onTerminalOutput: () => {},
      removeAllListeners: () => {},
    };
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('accessToken');
      const baseUrl = getEnvironmentBaseUrl();
      
      const newSocket = io(baseUrl, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = newSocket;

      newSocket.on('connect', () => {
        // console.log('WebSocket connected');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        // console.log('WebSocket disconnected');
        setConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const joinAppRoom = useCallback((appId: string) => {
    if (socket) {
      socket.emit('app:join', { appId });
      // console.log(`Joined app room: ${appId}`);
    }
  }, [socket]);

  const leaveAppRoom = useCallback((appId: string) => {
    if (socket) {
      socket.emit('app:leave', { appId });
      // console.log(`Left app room: ${appId}`);
    }
  }, [socket]);

  const joinTerminal = useCallback((sessionId: string) => {
    if (socket) {
      socket.emit('terminal:join', { sessionId });
      // console.log(`Joined terminal session: ${sessionId}`);
    }
  }, [socket]);

  const sendTerminalInput = useCallback((sessionId: string, input: string) => {
    if (socket) {
      socket.emit('terminal:input', { sessionId, input });
    }
  }, [socket]);

  const onAppProgress = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('app:progress', callback);
    }
  }, [socket]);

  const onAppStatus = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('app:status', callback);
    }
  }, [socket]);

  const onFileUpdate = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('app:file-update', callback);
    }
  }, [socket]);

  const onTerminalOutput = useCallback((callback: (data: any) => void) => {
    if (socket) {
      socket.on('terminal:output', callback);
    }
  }, [socket]);

  const removeAllListeners = useCallback(() => {
    if (socket) {
      socket.removeAllListeners('app:progress');
      socket.removeAllListeners('app:status');
      socket.removeAllListeners('app:file-update');
      socket.removeAllListeners('terminal:output');
    }
  }, [socket]);

  const value = {
    socket,
    connected,
    joinAppRoom,
    leaveAppRoom,
    joinTerminal,
    sendTerminalInput,
    onAppProgress,
    onAppStatus,
    onFileUpdate,
    onTerminalOutput,
    removeAllListeners,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};