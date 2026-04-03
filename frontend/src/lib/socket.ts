import { io, Socket } from 'socket.io-client';
import { getEnvironmentBaseUrl } from './config';

let socketInstance: Socket | null = null;

export const initSocket = (token?: string): Socket => {
  if (!socketInstance) {
    const baseUrl = getEnvironmentBaseUrl();
    
    socketInstance = io(baseUrl, {
      auth: {
        token: token || localStorage.getItem('accessToken'),
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  
  return socketInstance;
};

export const getSocket = (): Socket | null => {
  return socketInstance;
};

export const disconnectSocket = (): void => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};