import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthContext';
import { WebSocketProvider } from './WebSocketContext';
import { OrganizationProvider } from './OrganizationContext';
import { ProjectProvider } from './ProjectContext';

// Create a single query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface ContextProvidersProps {
  children: React.ReactNode;
}

/**
 * Combined context providers
 * QueryClientProvider -> AuthContext -> OrganizationContext -> ProjectContext -> WebSocketContext
 */
export const ContextProviders: React.FC<ContextProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <ProjectProvider>
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </ProjectProvider>
        </OrganizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Export individual contexts
export { AuthProvider, AuthContext } from './AuthContext';
// eslint-disable-next-line react-refresh/only-export-components
export { WebSocketProvider, useWebSocket } from './WebSocketContext';
// eslint-disable-next-line react-refresh/only-export-components
export { OrganizationProvider, useOrganization, useOrganizationFromParams } from './OrganizationContext';
// eslint-disable-next-line react-refresh/only-export-components
export { ProjectProvider, useProject, useProjectFromParams } from './ProjectContext';
