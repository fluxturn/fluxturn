import { useContext } from 'react';
import { WebSocketContext } from '../contexts/WebSocketContext';

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