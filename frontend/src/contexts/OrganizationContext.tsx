import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Organization } from '../types/organization';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizationId: string | null;
  loading: boolean;
  error: string | null;
  setOrganizationId: (id: string | null) => void;
  refreshOrganization: () => Promise<void>;
  switchOrganization: (organizationId: string) => void;
}

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizationId, setOrgId] = useState<string | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedId = useRef<string | null>(null);

  const fetchOrganization = useCallback(async (orgId: string) => {
    if (!orgId) {
      setCurrentOrganization(null);
      return;
    }

    // Skip if already fetched this org
    if (lastFetchedId.current === orgId && currentOrganization?.id === orgId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // console.log('[OrgContext] Fetching organization:', orgId);
      const response = await api.getOrganization(orgId);
      // console.log('[OrgContext] Response:', response);

      // The backend returns { organization, projects, members }
      const organization = response?.organization || response?.data?.organization || response;

      if (!organization || !organization.id) {
        console.error('[OrgContext] Invalid organization response:', response);
        setError('Invalid organization data received');
        setCurrentOrganization(null);
        return;
      }

      // console.log('[OrgContext] Setting organization:', organization);
      lastFetchedId.current = orgId;
      setCurrentOrganization(organization);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch organization';
      console.error('[OrgContext] Error fetching organization:', err);
      setError(errorMessage);
      setCurrentOrganization(null);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id]);

  // Set organization ID and trigger fetch
  const setOrganizationId = useCallback((id: string | null) => {
    if (id === organizationId) return;

    // console.log('[OrgContext] Setting organizationId:', id);
    setOrgId(id);
    api.setOrganizationId(id);

    if (id) {
      fetchOrganization(id);
    } else {
      setCurrentOrganization(null);
      setError(null);
      lastFetchedId.current = null;
    }
  }, [organizationId, fetchOrganization]);

  const refreshOrganization = useCallback(async () => {
    if (organizationId) {
      lastFetchedId.current = null; // Force refetch
      await fetchOrganization(organizationId);
    }
  }, [organizationId, fetchOrganization]);

  const switchOrganization = useCallback((newOrganizationId: string) => {
    // console.log('🔄 Context: Switching to organization', newOrganizationId);
    setOrganizationId(newOrganizationId);
  }, [setOrganizationId]);

  const value = {
    currentOrganization,
    organizationId,
    loading,
    error,
    setOrganizationId,
    refreshOrganization,
    switchOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

/**
 * Hook that automatically sets organization ID from URL params
 * Use this in any page component that has :organizationId in the route
 */
export const useOrganizationFromParams = () => {
  const context = useOrganization();
  const params = useParams<{ organizationId?: string }>();

  useEffect(() => {
    if (params.organizationId && params.organizationId !== context.organizationId) {
      context.setOrganizationId(params.organizationId);
    }
  }, [params.organizationId, context]);

  return context;
};

export const useOrganizationRequired = () => {
  const context = useOrganization();
  if (!context.organizationId) {
    throw new Error('Organization ID is required but not found in the current route');
  }
  return context;
};