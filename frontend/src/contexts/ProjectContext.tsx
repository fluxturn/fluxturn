import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Project } from '../types/project';

interface ProjectContextType {
  currentProject: Project | null;
  projectId: string | null;
  loading: boolean;
  error: string | null;
  setProjectId: (id: string | null) => void;
  refreshProject: () => Promise<void>;
  switchProject: (projectId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectId, setProjectIdState] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedId = useRef<string | null>(null);

  const fetchProject = useCallback(async (projId: string) => {
    if (!projId) {
      setCurrentProject(null);
      return;
    }

    // Skip if already fetched this project
    if (lastFetchedId.current === projId && currentProject?.id === projId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // console.log('[ProjectContext] Fetching project:', projId);
      const response = await api.getProject(projId);
      // console.log('[ProjectContext] Response:', response);

      // Backend returns { project, apps } - extract the project
      const project = response?.project || response?.data?.project || response;

      if (!project || !project.id) {
        console.error('[ProjectContext] Invalid project response:', response);
        setError('Invalid project data received');
        setCurrentProject(null);
        return;
      }

      // console.log('[ProjectContext] Setting project:', project);
      lastFetchedId.current = projId;
      setCurrentProject(project);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch project';
      console.error('[ProjectContext] Error fetching project:', err);
      setError(errorMessage);
      setCurrentProject(null);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  // Set project ID and trigger fetch
  const setProjectId = useCallback((id: string | null) => {
    if (id === projectId) return;

    // console.log('[ProjectContext] Setting projectId:', id);
    setProjectIdState(id);
    api.setProjectId(id);

    if (id) {
      fetchProject(id);
    } else {
      setCurrentProject(null);
      setError(null);
      lastFetchedId.current = null;
    }
  }, [projectId, fetchProject]);

  const refreshProject = useCallback(async () => {
    if (projectId) {
      lastFetchedId.current = null; // Force refetch
      await fetchProject(projectId);
    }
  }, [projectId, fetchProject]);

  const switchProject = useCallback((newProjectId: string) => {
    // console.log('🔄 ProjectContext: Switching to project', newProjectId);
    setProjectId(newProjectId);
  }, [setProjectId]);

  const value = {
    currentProject,
    projectId,
    loading,
    error,
    setProjectId,
    refreshProject,
    switchProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

/**
 * Hook that automatically sets project ID from URL params
 * Use this in any page component that has :projectId in the route
 */
export const useProjectFromParams = () => {
  const context = useProject();
  const params = useParams<{ projectId?: string }>();

  useEffect(() => {
    if (params.projectId && params.projectId !== context.projectId) {
      context.setProjectId(params.projectId);
    }
  }, [params.projectId, context]);

  return context;
};

export const useProjectRequired = () => {
  const context = useProject();
  if (!context.projectId) {
    throw new Error('Project ID is required but not found in the current route');
  }
  return context;
};
