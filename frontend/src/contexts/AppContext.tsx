import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { App } from '../types/app';

interface AppContextType {
  currentApp: App | null;
  appId?: string;
  projectId?: string;
  organizationId?: string;
  loading: boolean;
  error: string | null;
  refreshApp: () => Promise<void>;
  switchApp: (appId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const params = useParams<{ appId?: string; projectId?: string; organizationId?: string }>();
  const appId = params.appId;
  const projectId = params.projectId;
  const organizationId = params.organizationId;
  const [currentApp, setCurrentApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set the app header for all API calls when appId changes
  useEffect(() => {
    if (appId) {
      api.setAppId(appId);
    } else {
      api.setAppId(null);
    }
  }, [appId]);

  const fetchApp = useCallback(async (applicationId: string) => {
    if (!applicationId) {
      setCurrentApp(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Note: App concept removed - no longer fetching app data
      // const app = await api.getApp(applicationId);
      const app: App | null = null; // Placeholder since app concept is removed

      // Validate that the app belongs to the current project (if we have one)
      if (projectId && app?.projectId !== projectId) {
        throw new Error('App does not belong to the current project');
      }

      // Validate that the app belongs to the current organization (if we have one)
      if (organizationId && app.organizationId !== organizationId) {
        throw new Error('App does not belong to the current organization');
      }
      
      setCurrentApp(app);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch app';
      setError(errorMessage);
      setCurrentApp(null);
      console.error('Failed to fetch app:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, organizationId]);

  // Fetch app data when appId changes
  useEffect(() => {
    if (appId) {
      fetchApp(appId);
    } else {
      setCurrentApp(null);
      setError(null);
      setLoading(false);
    }
  }, [appId, fetchApp]);

  const refreshApp = useCallback(async () => {
    if (appId) {
      await fetchApp(appId);
    }
  }, [appId, fetchApp]);

  const switchApp = useCallback((newAppId: string) => {
    // This would typically involve navigation to a new route
    // For now, we'll update the API client directly
    api.setAppId(newAppId);
    fetchApp(newAppId);
  }, [fetchApp]);

  const value = {
    currentApp,
    appId,
    projectId,
    organizationId,
    loading,
    error,
    refreshApp,
    switchApp,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppRequired = () => {
  const context = useApp();
  if (!context.appId) {
    throw new Error('App ID is required but not found in the current route');
  }
  return context;
};