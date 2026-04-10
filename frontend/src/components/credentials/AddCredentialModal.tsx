import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowLeft, Loader2, ExternalLink, Copy, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getEnvironmentBaseUrl } from '@/lib/config';

interface AuthField {
  name: string;
  key?: string; // Alternative to name
  label: string;
  type: 'string' | 'text' | 'password' | 'secret' | 'email' | 'url' | 'select' | 'textarea' | 'number' | 'boolean';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  default?: string | number | boolean; // Alternative to defaultValue
  description?: string;
  helpUrl?: string;
  helpText?: string;
  options?: { label: string; value: string; description?: string }[];
  rows?: number;
  displayOptions?: Record<string, string | string[]>; // For conditional display
}

interface Connector {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  auth_type: string;
  auth_fields?: AuthField[];
  status: string;
}

// Helper function to map connector names to OAuth provider names
const getOAuthProviderName = (connectorName: string): string => {
  // Google services all use 'google' provider
  if (connectorName.startsWith('google_')) {
    return 'google';
  }
  
  // Microsoft services use 'microsoft'  
  if (connectorName === 'teams' || connectorName.startsWith('microsoft_')) {
    return 'microsoft';
  }
  
  // For other connectors, use the connector name as-is
  return connectorName;
};

interface AddCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectors: Connector[];
  onSuccess: (credentialId?: string) => void;
  nodeId?: string; // Optional node ID to apply credential to after creation
}

export const AddCredentialModal: React.FC<AddCredentialModalProps> = ({
  isOpen,
  onClose,
  connectors,
  onSuccess,
  nodeId,
}) => {
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [credentialName, setCredentialName] = useState('');
  const [authConfig, setAuthConfig] = useState<Record<string, string | number | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);

  // Credential selection mode: 'select' for existing credentials, 'create' for new
  const [credentialMode, setCredentialMode] = useState<'select' | 'create'>('select');
  const [existingCredentials, setExistingCredentials] = useState<Array<{ id: string; name: string; connector_type: string; is_active?: boolean }>>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [loadingCredentials, setLoadingCredentials] = useState(false);

  // Track pending OAuth credential for cleanup on modal close
  const pendingOAuthCredentialRef = useRef<string | null>(null);
  const oauthCompletedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      // Clean up pending OAuth credential if modal closes before OAuth completes
      if (pendingOAuthCredentialRef.current && !oauthCompletedRef.current) {
        const credentialToDelete = pendingOAuthCredentialRef.current;
        // console.log('Modal closed before OAuth completed, deleting credential:', credentialToDelete);
        api.delete(`/connectors/${credentialToDelete}`).catch(e =>
          console.error('Failed to delete credential on modal close:', e)
        );
        // Clean up sessionStorage
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_credential_id');
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_organization_id');
        sessionStorage.removeItem('oauth_project_id');
        sessionStorage.removeItem('oauth_app_id');
      }
      // Reset refs
      pendingOAuthCredentialRef.current = null;
      oauthCompletedRef.current = false;

      // Reset state when modal closes
      setStep('select');
      setSearchQuery('');
      setSelectedConnector(null);
      setCredentialName('');
      setAuthConfig({});
      setCredentialMode('select');
      setExistingCredentials([]);
      setSelectedCredentialId('');
    }
  }, [isOpen]);

  const handleConnectorSelect = (connector: Connector) => {
    setSelectedConnector(connector);
    setStep('configure');
    setCredentialName(`${connector.display_name} account`);

    // Initialize auth config
    const initialConfig: Record<string, string | number | boolean> = {};

    // For OAuth2 connectors, set redirect_uri automatically (for custom OAuth only)
    // Centralized OAuth uses backend-configured redirect URIs
    if (connector.auth_type?.toLowerCase() === 'oauth2') {
      initialConfig.redirect_uri = `${getEnvironmentBaseUrl()}/api/oauth/${getOAuthProviderName(connector.name)}/callback`;
    }

    // Initialize all auth fields with their default values
    if (connector.auth_fields && Array.isArray(connector.auth_fields)) {
      connector.auth_fields.forEach((field: AuthField) => {
        const fieldName = field.name || field.key;
        const defaultValue = field.default ?? field.defaultValue;

        // Only set default if it exists and field is not already set
        if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
          initialConfig[fieldName] = defaultValue;
        }

        // Special handling for authType field
        if ((field.name === 'authType' || field.key === 'authType') && defaultValue) {
          // If default is oauth2, set redirect_uri
          if (typeof defaultValue === 'string' && defaultValue.toLowerCase() === 'oauth2') {
            initialConfig.redirect_uri = `${getEnvironmentBaseUrl()}/api/oauth/${getOAuthProviderName(connector.name)}/callback`;
          }
        }
      });
    }

    setAuthConfig(initialConfig);

    // Fetch existing credentials for this connector type
    fetchExistingCredentials(connector.name);
  };

  // Fetch existing credentials for a connector type
  const fetchExistingCredentials = async (connectorType: string) => {
    try {
      setLoadingCredentials(true);
      const response = await api.get(`/connectors?connector_type=${connectorType}`);

      // Filter for active credentials
      const credentials = Array.isArray(response)
        ? response.filter((cred: { id: string; name: string; connector_type: string; is_active?: boolean }) => cred.is_active !== false)
        : [];

      setExistingCredentials(credentials);

      // If there are existing credentials, default to 'select' mode, otherwise 'create' mode
      if (credentials.length > 0) {
        setCredentialMode('select');
      } else {
        setCredentialMode('create');
      }
    } catch (error) {
      console.error('Failed to fetch existing credentials:', error);
      setExistingCredentials([]);
      setCredentialMode('create');
    } finally {
      setLoadingCredentials(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedConnector(null);
    setAuthConfig({});
    setCredentialMode('select');
    setExistingCredentials([]);
    setSelectedCredentialId('');
  };

  // Handle centralized OAuth (one-click) - Works with Google, Slack, etc.
  const handleCentralizedOAuth = async (shop?: string) => {
    if (!selectedConnector) return;

    // IMPORTANT: Open popup IMMEDIATELY on user click to avoid browser blocking
    // Browsers only allow popups from direct user gestures, not after async operations
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Open popup with a loading page first
    const popup = window.open(
      'about:blank',
      'oauth_popup',
      `popup=yes,width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site.');
      return;
    }

    // Show loading state in popup
    popup.document.write(`
      <html>
        <head>
          <title>Connecting...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
              color: white;
            }
            .loader {
              text-align: center;
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 3px solid rgba(255,255,255,0.3);
              border-radius: 50%;
              border-top-color: #10b981;
              animation: spin 1s ease-in-out infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loader">
            <div class="spinner"></div>
            <p>Connecting to ${selectedConnector.display_name}...</p>
          </div>
        </body>
      </html>
    `);

    try {
      setOauthLoading(true);

      // Create the credential placeholder with shop subdomain if Shopify
      const config: Record<string, string> = {
        authType: 'oauth2',
        authMode: 'oneclick' // Mark this as one-click OAuth for backend
      };
      if (shop && selectedConnector.name === 'shopify') {
        config.shopSubdomain = shop;
      }

      // Extract OAuth configuration flags from authConfig
      // These are needed for LinkedIn (organization_support, legacy) and similar connectors
      // For LinkedIn: always enable organization_support by default for one-click OAuth
      const isLinkedIn = selectedConnector.name === 'linkedin';
      const organization_support = isLinkedIn ? true : (authConfig.organization_support === true);
      const legacy = authConfig.legacy === true;

      const createResponse = await api.post<{ id: string }>('/connectors', {
        connector_type: selectedConnector.name,
        name: credentialName,
        config,
        credentials: {
          organization_support,
          legacy,
        }
      });

      const credentialId = createResponse.id;

      // Track this credential for cleanup if modal closes before OAuth completes
      pendingOAuthCredentialRef.current = credentialId;
      oauthCompletedRef.current = false;

      // Get current user ID from API
      const userResponse = await api.get('/auth/me');
      const userId = userResponse.user?.id || userResponse.id;

      if (!userId) {
        popup.close();
        throw new Error('User ID not found. Please ensure you are logged in.');
      }

      // Build OAuth authorization URL
      const baseUrl = getEnvironmentBaseUrl();

      // Determine OAuth provider based on connector type
      // YouTube, Gmail, and other Google services use Google OAuth
      const googleConnectors = ['youtube', 'gmail', 'google_drive', 'google_sheets', 'google_docs', 'google_calendar', 'google_analytics', 'google_forms'];

      // Map connector names to OAuth providers
      let oauthProvider = selectedConnector.name;

      if (selectedConnector.name.includes('google') || googleConnectors.includes(selectedConnector.name)) {
        oauthProvider = 'google';
      } else if (selectedConnector.name === 'facebook_graph') {
        oauthProvider = 'facebook';
      }

      // For popup flow, no return URL needed - callback will use postMessage
      let authUrl = `${baseUrl}/api/v1/oauth/${oauthProvider}/authorize?userId=${userId}&credentialId=${credentialId}&connectorType=${selectedConnector.name}`;

      // Add shop parameter for Shopify
      if (shop && selectedConnector.name === 'shopify') {
        authUrl += `&shop=${encodeURIComponent(shop)}`;
      }

      // console.log('Opening OAuth popup for:', oauthProvider);

      // Save node ID if provided (to apply credential after OAuth)
      if (nodeId) {
        sessionStorage.setItem('oauth_pending_node_id', nodeId);
        // console.log('Saved pending node ID for OAuth:', nodeId);
      }

      // Save workflow if we're on the workflow editor
      if (window.location.pathname.includes('/workflows/')) {
        // console.log('Attempting to save workflow before OAuth...');

        try {
          // Dispatch event to request workflow save
          const saveEvent = new CustomEvent('oauth:request-workflow-save', {
            detail: { credentialId }
          });
          window.dispatchEvent(saveEvent);

          // Wait for workflow to be saved
          await new Promise(resolve => setTimeout(resolve, 500));

          sessionStorage.getItem('oauth_workflow_id');
        } catch {
          // console.warn('Could not save workflow:', err);
        }
      }

      // Navigate the already-opened popup to the OAuth URL
      popup.location.href = authUrl;

      // Track if OAuth completed
      let oauthCompleted = false;

      // Listen for OAuth success message from popup
      const handleMessage = (event: MessageEvent) => {
        // Verify origin for security — local-only.
        if (!event.origin.includes('localhost')) {
          return;
        }

        if (event.data.type === 'oauth_success') {
          // console.log('OAuth success received:', event.data);
          oauthCompleted = true;
          oauthCompletedRef.current = true;
          pendingOAuthCredentialRef.current = null;
          clearInterval(checkPopup);
          window.removeEventListener('message', handleMessage);
          setOauthLoading(false);

          toast.success(`Successfully connected to ${selectedConnector.display_name}!`);

          // Close modal and trigger success callback
          onSuccess(event.data.credentialId || credentialId);
        } else if (event.data.type === 'oauth_error') {
          console.error('OAuth error received:', event.data);
          pendingOAuthCredentialRef.current = null; // OAuthCallback handles deletion
          clearInterval(checkPopup);
          window.removeEventListener('message', handleMessage);
          setOauthLoading(false);

          toast.error(event.data.message || 'OAuth authentication failed');
        }
      };

      window.addEventListener('message', handleMessage);

      // Cleanup if popup is closed without completing OAuth
      // Note: COOP may block popup.closed check for cross-origin OAuth pages
      const checkPopup = setInterval(async () => {
        try {
          if (popup.closed && !oauthCompleted) {
            clearInterval(checkPopup);
            window.removeEventListener('message', handleMessage);
            setOauthLoading(false);
            // console.log('OAuth popup closed, deleting credential:', credentialId);

            // Delete the broken credential
            try {
              await api.delete(`/connectors/${credentialId}`);
              // console.log('Deleted credential after OAuth popup closed');
            } catch (e) {
              console.error('Failed to delete credential:', e);
            }
            pendingOAuthCredentialRef.current = null;
            toast.error('OAuth was cancelled');
          }
        } catch {
          // COOP blocks popup.closed access for cross-origin pages - this is expected
          // We'll rely on message events and modal close cleanup instead
        }
      }, 500);

    } catch (error: unknown) {
      console.error('OAuth flow error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize OAuth');
      setOauthLoading(false);
      // Clear pending credential ref - if credential was created, modal close will clean it up
      // Or it will be cleaned up when user retries
    }
  };

  const handleOAuthFlow = async () => {
    if (!selectedConnector) return;

    try {
      setOauthLoading(true);

      // Split authConfig: non-sensitive goes to config, sensitive/oauth-related goes to credentials
      const {
        client_secret,
        clientSecret,
        organization_support, // LinkedIn organization permission
        legacy, // LinkedIn legacy mode
        ...configFields
      } = authConfig;

      // Preserve the selected authType, default to 'oauth2' if not set
      const config = {
        ...configFields,
        authType: authConfig.authType || 'oauth2', // Use selected authType or default to oauth2
      };

      // First create the credential config
      // Note: organization_support and legacy go to credentials because the OAuth flow reads from there
      const createResponse = await api.post<{ id: string }>('/connectors', {
        connector_type: selectedConnector.name,
        name: credentialName,
        config, // client_id, clientId, redirect_uri, authType, instanceUrl, etc.
        credentials: {
          ...(client_secret && { client_secret }),
          ...(clientSecret && { clientSecret }),
          ...(organization_support !== undefined && { organization_support }),
          ...(legacy !== undefined && { legacy }),
        } // Sensitive credentials and OAuth config flags go here
      });

      const credentialId = createResponse.id;

      // Track this credential for cleanup if modal closes before OAuth completes
      pendingOAuthCredentialRef.current = credentialId;
      oauthCompletedRef.current = false;

      // Get OAuth URL
      const oauthResponse = await api.get<{ authorization_url: string; state: string; code_verifier?: string }>(`/connectors/${credentialId}/oauth/url`);
      const { authorization_url, state, code_verifier } = oauthResponse;

      // Store state and code_verifier for verification
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_credential_id', credentialId);

      // Store code_verifier for PKCE (Twitter OAuth 2.0)
      if (code_verifier) {
        sessionStorage.setItem('oauth_code_verifier', code_verifier);
      }

      // Store organization context for OAuth callback
      const tenantContext = await api.getTenantContext();
      if (tenantContext.organizationId) {
        sessionStorage.setItem('oauth_organization_id', tenantContext.organizationId);
      }
      if (tenantContext.projectId) {
        sessionStorage.setItem('oauth_project_id', tenantContext.projectId);
      }
      if (tenantContext.appId) {
        sessionStorage.setItem('oauth_app_id', tenantContext.appId);
      }

      // Open OAuth window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authorization_url,
        'oauth_window',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      // Check if popup was blocked
      if (!popup) {
        toast.error('Popup was blocked. Please allow popups for this site.');
        // Delete the credential since OAuth can't proceed
        try {
          await api.delete(`/connectors/${credentialId}`);
        } catch (e) {
          console.error('Failed to delete credential after popup blocked:', e);
        }
        setOauthLoading(false);
        return;
      }

      // Track if OAuth completed successfully
      let oauthCompleted = false;
      const popupCheckInterval: ReturnType<typeof setInterval>;
      const timeout: ReturnType<typeof setTimeout>;

      // Cleanup function to delete credential and clear sessionStorage
      const cleanupOnFailure = async () => {
        try {
          await api.delete(`/connectors/${credentialId}`);
          // console.log('Deleted credential after OAuth was cancelled/failed');
        } catch (e) {
          console.error('Failed to delete credential:', e);
        }
        // Clear refs so modal close doesn't try to delete again
        pendingOAuthCredentialRef.current = null;
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_credential_id');
        sessionStorage.removeItem('oauth_code_verifier');
        sessionStorage.removeItem('oauth_organization_id');
        sessionStorage.removeItem('oauth_project_id');
        sessionStorage.removeItem('oauth_app_id');
      };

      // Wrapped message handler that tracks OAuth completion
      const wrappedHandleMessage = (event: MessageEvent) => {
        if (event.data.type === 'oauth_success') {
          oauthCompleted = true;
          oauthCompletedRef.current = true; // Mark OAuth as complete for modal close cleanup
          pendingOAuthCredentialRef.current = null; // Clear pending credential
          clearInterval(popupCheckInterval);
          clearTimeout(timeout);
          window.removeEventListener('message', wrappedHandleMessage);
          setOauthLoading(false);
          toast.success('Credential connected successfully!');
          onSuccess(event.data.credentialId);
        } else if (event.data.type === 'oauth_error') {
          pendingOAuthCredentialRef.current = null; // Credential cleanup is handled by OAuthCallback.tsx
          clearInterval(popupCheckInterval);
          clearTimeout(timeout);
          window.removeEventListener('message', wrappedHandleMessage);
          setOauthLoading(false);
          toast.error(event.data.message || 'OAuth authentication failed');
        }
      };

      window.addEventListener('message', wrappedHandleMessage);

      // Poll to detect when popup is closed manually
      popupCheckInterval = setInterval(async () => {
        if (popup.closed && !oauthCompleted) {
          clearInterval(popupCheckInterval);
          clearTimeout(timeout);
          window.removeEventListener('message', wrappedHandleMessage);
          setOauthLoading(false);
          await cleanupOnFailure();
          toast.error('OAuth was cancelled');
        }
      }, 500);

      // Set a timeout to handle popup close or user cancellation (5 minutes)
      timeout = setTimeout(async () => {
        clearInterval(popupCheckInterval);
        window.removeEventListener('message', wrappedHandleMessage);
        setOauthLoading(false);
        if (!oauthCompleted) {
          toast.error('OAuth flow timed out');
          await cleanupOnFailure();
        }
      }, 5 * 60 * 1000);

    } catch (error: unknown) {
      console.error('OAuth flow error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize OAuth flow');
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedConnector) return;

    // If user selected an existing credential, just use that
    if (credentialMode === 'select' && selectedCredentialId) {
      toast.success('Credential selected successfully!');
      onSuccess(selectedCredentialId);
      return;
    }

    // For OAuth connectors, use OAuth flow
    // For connectors with multiple auth options (authType selector), use the selected authType
    // Otherwise, use the connector's main auth_type
    const selectedAuthType = String(authConfig.authType || '').toLowerCase();

    // Check if connector has an authType selector field (multi-auth connector)
    const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
      selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

    // Check if connector has an authMode selector (dual OAuth support like Dropbox)
    // If authMode is 'accessToken', skip OAuth flow and save directly
    const hasAuthModeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
      selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authMode');
    const selectedAuthMode = String(authConfig.authMode || '').toLowerCase();
    const isUsingAccessTokenMode = hasAuthModeSelector && selectedAuthMode === 'accesstoken';

    // For multi-auth connectors, ONLY use selectedAuthType
    // For single-auth connectors, use connector's main auth_type
    // Skip OAuth if using direct accessToken mode
    const isOAuth = isUsingAccessTokenMode
      ? false
      : hasAuthTypeSelector
        ? selectedAuthType === 'oauth2'
        : selectedConnector.auth_type?.toLowerCase() === 'oauth2';

    if (isOAuth) {
      await handleOAuthFlow();
      return;
    }

    // For other auth types, save directly
    try {
      setLoading(true);

      const createResponse = await api.post<{ id: string }>('/connectors', {
        connector_type: selectedConnector.name,
        name: credentialName,
        config: {
          authType: authConfig.authType || selectedConnector.auth_type, // Store auth type in config
          ...(authConfig.authMode && { authMode: authConfig.authMode }) // Store authMode if present
        },
        credentials: authConfig // Auth fields are credentials for connectors
      });

      // Test the connection immediately after creation
      try {
        const testResponse = await api.post(`/connectors/${createResponse.id}/test`);
        if (testResponse.success) {
          toast.success(`Successfully connected to ${selectedConnector.display_name}! Your credential is ready to use.`);
        } else {
          toast.warning('Credential saved but connection test failed. Please check your settings.');
        }
      } catch (testError: unknown) {
        console.error('Credential test error:', testError);
        toast.warning(`Credential saved but could not test connection: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
      }

      onSuccess(createResponse.id); // Pass credential ID
    } catch (error: unknown) {
      console.error('Failed to create credential:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create credential');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string | number | boolean) => {
    setAuthConfig((prev) => {
      const newConfig = {
        ...prev,
        [fieldName]: value,
      };
      
      // If authType field is changed to oauth2, set redirect_uri
      if (fieldName === 'authType' && typeof value === 'string' && value.toLowerCase() === 'oauth2') {
        newConfig.redirect_uri = `${getEnvironmentBaseUrl()}/api/oauth/${getOAuthProviderName(selectedConnector.name)}/callback`;
      }
      
      return newConfig;
    });
  };

  const renderAuthField = (field: AuthField) => {
    const fieldName = field.name || field.key;
    const value = authConfig[fieldName] ?? field.defaultValue ?? field.default ?? "";

    // Handle different field types
    switch (field.type) {
      case "string":
      case "text":
      case "email":
      case "url":
        return (
          <div key={fieldName} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              type={field.type === "password" ? "password" : "text"}
              value={value}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              placeholder={field.placeholder || ''}
              className="bg-gray-800 border-gray-700 text-white"
              required={field.required}
            />
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
            {field.helpUrl && (
              <p className="text-xs text-gray-400">
                Learn more:{' '}
                <a
                  href={field.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  {field.helpText || 'Documentation'}
                </a>
              </p>
            )}
          </div>
        );

      case "password":
      case "secret":
        return (
          <div key={fieldName} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              type="password"
              value={value}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              placeholder={field.placeholder || ''}
              className="bg-gray-800 border-gray-700 text-white"
              required={field.required}
            />
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
            {field.helpUrl && (
              <p className="text-xs text-gray-400">
                Learn more:{' '}
                <a
                  href={field.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  {field.helpText || 'Documentation'}
                </a>
              </p>
            )}
          </div>
        );

      case "select":
        return (
          <div key={fieldName} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <select
              value={value}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              required={field.required}
            >
              <option value="">{field.placeholder || 'Select...'}</option>
              {field.options?.map((option: { label: string; value: string; description?: string }) => (
                <option key={option.value} value={option.value} title={option.description}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
            {/* Show description of selected option if available */}
            {value && field.options && (
              <p className="text-xs text-gray-300">
                {field.options.find((opt: { value: string }) => opt.value === value)?.description}
              </p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={fieldName} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              placeholder={field.placeholder || ''}
              rows={field.rows || 3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              required={field.required}
            />
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={fieldName} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(fieldName, e.target.valueAsNumber)}
              placeholder={field.placeholder || ''}
              className="bg-gray-800 border-gray-700 text-white"
              required={field.required}
            />
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
          </div>
        );

      case "boolean":
        return (
          <div key={fieldName} className="space-y-2">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id={fieldName}
                checked={value === true || value === 'true'}
                onChange={(e) => handleFieldChange(fieldName, e.target.checked)}
                className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-700 rounded focus:ring-cyan-500 focus:ring-2"
              />
              <Label htmlFor={fieldName} className="text-white cursor-pointer">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </Label>
            </div>
            {field.description && (
              <p className="text-xs text-gray-400 ml-7">{field.description}</p>
            )}
            {field.helpUrl && (
              <p className="text-xs text-gray-400 ml-7">
                Learn more:{' '}
                <a
                  href={field.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  {field.helpText || 'Documentation'}
                </a>
              </p>
            )}
          </div>
        );

      default:
        // Fallback to text input
        return (
          <div key={fieldName} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              value={value}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
              placeholder={field.placeholder || ''}
              className="bg-gray-800 border-gray-700 text-white"
              required={field.required}
            />
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
          </div>
        );
    }
  };

  const renderAuthFields = () => {
    if (!selectedConnector) return null;

    // Check if this is a Google service that supports centralized OAuth
    const googleServices = ['gmail', 'google_sheets', 'google_drive', 'google_docs', 'google_calendar', 'google_analytics', 'youtube', 'google_forms'];
    const isGoogleService = googleServices.includes(selectedConnector.name);

    // Check if this is LinkedIn
    const isLinkedIn = selectedConnector.name === 'linkedin';

    // Check if this is Twitter
    const isTwitter = selectedConnector.name === 'twitter';

    // Check if this is GitHub
    const isGitHub = selectedConnector.name === 'github';

    // Check if this is Slack
    const isSlack = selectedConnector.name === 'slack';

    // Check if this is Notion
    const isNotion = selectedConnector.name === 'notion';

    // Check if this is Discord
    const isDiscord = selectedConnector.name === 'discord';

    // Check if this is Reddit
    const isReddit = selectedConnector.name === 'reddit';

    // Check if this is Shopify
    const isShopify = selectedConnector.name === 'shopify';

    // Check if this is Pinterest
    const isPinterest = selectedConnector.name === 'pinterest';

    // Check if this is Microsoft Teams
    const isTeams = selectedConnector.name === 'teams';

    // Check if this is HubSpot
    const isHubSpot = selectedConnector.name === 'hubspot';

    // Check if this is Zoom
    const isZoom = selectedConnector.name === 'zoom';

    // Check if this is ClickUp
    const isClickUp = selectedConnector.name === 'clickup';

    // Check if this is Facebook
    const isFacebook = selectedConnector.name === 'facebook_graph';

    // Render one-click OAuth button for LinkedIn
    const renderLinkedInOAuthButton = () => {
      if (!isLinkedIn || selectedConnector.auth_type?.toLowerCase() !== 'oauth2') return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#0077B5] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your LinkedIn account with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#0077B5] hover:bg-[#006399] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to LinkedIn...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span>Sign in with LinkedIn</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom OAuth credentials</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for Google
    const renderGoogleOAuthButton = () => {
      if (!isGoogleService || selectedConnector.auth_type?.toLowerCase() !== 'oauth2') return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                  <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                  <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                  <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your Google account with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-50 text-gray-800 font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed border-2 border-transparent hover:border-blue-500"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
                  <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
                  <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
                  <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom OAuth credentials</span>
            </div>
          </div>
        </div>
      );
    }

    // Render one-click OAuth button for Twitter
    const renderTwitterOAuthButton = () => {
      if (!isTwitter || selectedConnector.auth_type?.toLowerCase() !== 'oauth2') return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-blue-400/10 to-sky-500/10 border border-blue-400/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#1DA1F2] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your Twitter/X account with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Twitter/X...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>Sign in with Twitter/X</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom OAuth credentials</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for Facebook
    const renderFacebookOAuthButton = () => {
      if (!isFacebook || selectedConnector.auth_type?.toLowerCase() !== 'oauth2') return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-600/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#1877F2] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your Facebook account with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Facebook...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Sign in with Facebook</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom OAuth credentials</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for GitHub
    const renderGitHubOAuthButton = () => {
      if (!isGitHub || selectedConnector.auth_type?.toLowerCase() !== 'oauth2') return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-gray-700/10 to-gray-900/10 border border-gray-600/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#24292e] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your GitHub account with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#24292e] hover:bg-[#1a1f23] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to GitHub...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                <span>Sign in with GitHub</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom OAuth credentials</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for Slack
    const renderSlackOAuthButton = () => {
      if (!isSlack || selectedConnector.auth_type?.toLowerCase() !== 'oauth2') return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#4A154B] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your Slack workspace with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#4A154B] hover:bg-[#3d1139] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Slack...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
                <span>Sign in with Slack</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom OAuth credentials</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for Notion
    const renderNotionOAuthButton = () => {
      if (!isNotion || selectedConnector.auth_type?.toLowerCase() !== 'oauth2') return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-gray-800/10 to-slate-900/10 border border-gray-600/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
                  <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="#000"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.724 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z" fill="#fff"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your Notion workspace with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-black hover:bg-gray-900 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Notion...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 100 100" fill="none">
                  <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z" fill="#fff"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.724 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z" fill="#000"/>
                </svg>
                <span>Sign in with Notion</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom OAuth credentials</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for Discord
    const renderDiscordOAuthButton = () => {
      // Check if Discord is selected AND OAuth2 is the selected auth type
      const selectedAuthType = String(authConfig.authType || '').toLowerCase();
      if (!isDiscord || (selectedConnector.auth_type !== 'oauth2' && selectedAuthType !== 'oauth2')) return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-600/10 border border-indigo-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#5865F2] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your Discord account with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Discord...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>Sign in with Discord</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom authentication</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for Reddit
    const renderRedditOAuthButton = () => {
      // Check if Reddit is selected AND OAuth2 is the selected auth type
      const selectedAuthType = String(authConfig.authType || '').toLowerCase();
      if (!isReddit || (selectedConnector.auth_type !== 'oauth2' && selectedAuthType !== 'oauth2')) return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-orange-500/10 to-red-600/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#FF4500] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your Reddit account with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#FF4500] hover:bg-[#FF5700] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Reddit...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                </svg>
                <span>Sign in with Reddit</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom authentication</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for Shopify
    const renderShopifyOAuthButton = () => {
      // Check if Shopify is selected AND OAuth2 is the selected auth type
      const selectedAuthType = String(authConfig.authType || '').toLowerCase();
      if (!isShopify || (selectedConnector.auth_type !== 'oauth2' && selectedAuthType !== 'oauth2')) return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      // Get shop subdomain from form data
      const shopSubdomain = authConfig.shopSubdomain || '';

      return (
        <>
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-600/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#96bf48] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M15.337 2.783c-.107-.08-.223-.112-.368-.096-.848.096-1.664.608-2.4 1.44-.624.704-1.184 1.68-1.504 2.848-.992.096-1.888.224-2.672.368l-.032.016c-2.144.4-3.664 1.024-4.496 1.856C2.817 10.263 2.657 11.671 3.505 13.591c.096.224.208.432.32.64.032.064.064.128.096.192v.016l4.976 8.528c.208.352.592.592 1.008.608h.096c.4 0 .8-.208 1.008-.544l2.848-4.528 5.152.528c.432.048.848-.128 1.12-.48.272-.352.368-.8.24-1.216L18.009 8.471c-.048-.176-.144-.336-.272-.464-.832-.832-2.352-1.456-4.496-1.856l-.016-.016c.304-1.008.832-1.824 1.392-2.304.512-.448 1.008-.624 1.408-.608.4.016.688.208.88.512.176.288.256.656.224 1.024-.016.352.064.704.256.992s.48.496.8.592c.16.048.336.08.512.08.48 0 .96-.192 1.296-.56.448-.48.672-1.152.592-1.792-.096-.8-.496-1.472-1.12-1.92-.848-.608-1.968-.816-3.088-.544-.208-.128-.432-.224-.672-.272-.656-.144-1.36-.096-2.032.144-.176.064-.336.128-.496.208-.08-.112-.176-.208-.272-.304-.624-.608-1.472-.912-2.368-.848-.672.048-1.312.304-1.888.736-.064.048-.128.096-.176.144C7.889 2.671 7.777 2.783 7.697 2.895c-.016 0-.032.016-.032.016-.592.688-1.008 1.536-1.216 2.496-.208.944-.192 1.968.048 2.976.032.128.064.256.112.384-.464.144-.896.32-1.296.528C4.145 10.039 3.409 10.887 2.945 11.895c-.464 1.008-.608 2.176-.4 3.296.192 1.104.672 2.144 1.392 2.96.72.816 1.648 1.392 2.72 1.68.368.096.752.144 1.136.144.368 0 .736-.048 1.104-.144.368-.096.72-.224 1.056-.4l-1.44-2.464c-.352.128-.72.192-1.088.192-.528 0-1.04-.144-1.472-.416-.432-.272-.768-.672-.944-1.136-.176-.464-.224-.976-.128-1.472.096-.496.32-.944.656-1.312.336-.368.768-.64 1.248-.8.48-.144.992-.192 1.504-.128l.032.016c.176.032.352.064.528.112l5.344 9.168c.096.16.24.288.416.368.176.08.368.112.56.096.192-.016.368-.096.528-.208.16-.112.288-.272.368-.448.16-.352.096-.768-.144-1.056l-5.216-8.944c.208-.016.416-.016.624-.016h.032c.096 0 .192 0 .288.016l4.624 7.92c.096.16.24.288.416.368.176.08.368.112.56.096.192-.016.368-.096.528-.208.16-.112.288-.272.368-.448.16-.352.096-.768-.144-1.056L11.185 8.647c.304-.096.624-.176.96-.24l4.304 7.376c.096.16.24.288.416.368.176.08.368.112.56.096.192-.016.368-.096.528-.208.16-.112.288-.272.368-.448.16-.352.096-.768-.144-1.056l-4.16-7.136c.4-.048.816-.08 1.248-.096l3.92 6.72c.096.16.24.288.416.368.176.08.368.112.56.096.192-.016.368-.096.528-.208.16-.112.288-.272.368-.448.16-.352.096-.768-.144-1.056l-3.792-6.496c.608.032 1.2.096 1.76.192.56.096 1.088.24 1.568.432l2.352 8.032c.08.288.272.528.528.688.256.16.56.224.864.176s.576-.208.768-.448c.192-.24.272-.544.224-.848l-2.24-7.664c-.048-.176-.144-.336-.272-.464-.832-.832-2.352-1.456-4.496-1.856l-.016-.016z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your Shopify store with a single click. No need to create access tokens or manage API keys.
                </p>
              </div>
            </div>
          </div>

          {/* Shop Subdomain Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-200">
              Shop Subdomain <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={shopSubdomain}
                onChange={(e) => setAuthConfig({ ...authConfig, shopSubdomain: e.target.value })}
                placeholder="your-shop"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                .myshopify.com
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Enter your Shopify store subdomain (without .myshopify.com)
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!shopSubdomain) {
                toast.error('Please enter your shop subdomain first');
                return;
              }
              handleCentralizedOAuth(shopSubdomain);
            }}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#96bf48] hover:bg-[#7ea83a] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Shopify...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M15.337 2.783c-.107-.08-.223-.112-.368-.096-.848.096-1.664.608-2.4 1.44-.624.704-1.184 1.68-1.504 2.848-.992.096-1.888.224-2.672.368l-.032.016c-2.144.4-3.664 1.024-4.496 1.856C2.817 10.263 2.657 11.671 3.505 13.591c.096.224.208.432.32.64.032.064.064.128.096.192v.016l4.976 8.528c.208.352.592.592 1.008.608h.096c.4 0 .8-.208 1.008-.544l2.848-4.528 5.152.528c.432.048.848-.128 1.12-.48.272-.352.368-.8.24-1.216L18.009 8.471c-.048-.176-.144-.336-.272-.464-.832-.832-2.352-1.456-4.496-1.856l-.016-.016c.304-1.008.832-1.824 1.392-2.304.512-.448 1.008-.624 1.408-.608.4.016.688.208.88.512.176.288.256.656.224 1.024-.016.352.064.704.256.992s.48.496.8.592c.16.048.336.08.512.08.48 0 .96-.192 1.296-.56.448-.48.672-1.152.592-1.792-.096-.8-.496-1.472-1.12-1.92-.848-.608-1.968-.816-3.088-.544-.208-.128-.432-.224-.672-.272-.656-.144-1.36-.096-2.032.144-.176.064-.336.128-.496.208-.08-.112-.176-.208-.272-.304-.624-.608-1.472-.912-2.368-.848-.672.048-1.312.304-1.888.736-.064.048-.128.096-.176.144C7.889 2.671 7.777 2.783 7.697 2.895c-.016 0-.032.016-.032.016-.592.688-1.008 1.536-1.216 2.496-.208.944-.192 1.968.048 2.976.032.128.064.256.112.384-.464.144-.896.32-1.296.528C4.145 10.039 3.409 10.887 2.945 11.895c-.464 1.008-.608 2.176-.4 3.296.192 1.104.672 2.144 1.392 2.96.72.816 1.648 1.392 2.72 1.68.368.096.752.144 1.136.144.368 0 .736-.048 1.104-.144.368-.096.72-.224 1.056-.4l-1.44-2.464c-.352.128-.72.192-1.088.192-.528 0-1.04-.144-1.472-.416-.432-.272-.768-.672-.944-1.136-.176-.464-.224-.976-.128-1.472.096-.496.32-.944.656-1.312.336-.368.768-.64 1.248-.8.48-.144.992-.192 1.504-.128l.032.016c.176.032.352.064.528.112l5.344 9.168c.096.16.24.288.416.368.176.08.368.112.56.096.192-.016.368-.096.528-.208.16-.112.288-.272.368-.448.16-.352.096-.768-.144-1.056l-5.216-8.944c.208-.016.416-.016.624-.016h.032c.096 0 .192 0 .288.016l4.624 7.92c.096.16.24.288.416.368.176.08.368.112.56.096.192-.016.368-.096.528-.208.16-.112.288-.272.368-.448.16-.352.096-.768-.144-1.056L11.185 8.647c.304-.096.624-.176.96-.24l4.304 7.376c.096.16.24.288.416.368.176.08.368.112.56.096.192-.016.368-.096.528-.208.16-.112.288-.272.368-.448.16-.352.096-.768-.144-1.056l-4.16-7.136c.4-.048.816-.08 1.248-.096l3.92 6.72c.096.16.24.288.416.368.176.08.368.112.56.096.192-.016.368-.096.528-.208.16-.112.288-.272.368-.448.16-.352.096-.768-.144-1.056l-3.792-6.496c.608.032 1.2.096 1.76.192.56.096 1.088.24 1.568.432l2.352 8.032c.08.288.272.528.528.688.256.16.56.224.864.176s.576-.208.768-.448c.192-.24.272-.544.224-.848l-2.24-7.664c-.048-.176-.144-.336-.272-.464-.832-.832-2.352-1.456-4.496-1.856l-.016-.016z"/>
                </svg>
                <span>Connect with Shopify</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use manual access token</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for Pinterest
    const renderPinterestOAuthButton = () => {
      // Check if Pinterest is selected AND OAuth2 is the selected auth type
      const selectedAuthType = String(authConfig.authType || '').toLowerCase();
      if (!isPinterest || (selectedConnector.auth_type !== 'oauth2' && selectedAuthType !== 'oauth2')) return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-red-500/10 to-rose-600/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#E60023] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your Pinterest account with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#E60023] hover:bg-[#C9002C] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Pinterest...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
                </svg>
                <span>Sign in with Pinterest</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom authentication</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for Microsoft Teams
    const renderTeamsOAuthButton = () => {
      // Check if Teams is selected AND OAuth2 is the selected auth type
      const selectedAuthType = String(authConfig.authType || '').toLowerCase();
      if (!isTeams || (selectedConnector.auth_type !== 'oauth2' && selectedAuthType !== 'oauth2')) return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-purple-500/10 to-indigo-600/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#5558AF] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M20.625 0H3.375A3.375 3.375 0 0 0 0 3.375v13.5A3.375 3.375 0 0 0 3.375 20.25h5.625v3.375a.375.375 0 0 0 .643.265l4.5-4.5a.375.375 0 0 0-.265-.64H3.375a2.625 2.625 0 0 1-2.625-2.625v-13.5A2.625 2.625 0 0 1 3.375.75h17.25a2.625 2.625 0 0 1 2.625 2.625v13.5a2.625 2.625 0 0 1-2.625 2.625h-5.25v.75h5.25A3.375 3.375 0 0 0 24 16.875v-13.5A3.375 3.375 0 0 0 20.625 0z"/>
                  <circle cx="12" cy="8.25" r="1.5"/>
                  <circle cx="16.5" cy="8.25" r="1.5"/>
                  <circle cx="7.5" cy="8.25" r="1.5"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your Microsoft Teams account with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#5558AF] hover:bg-[#464CAD] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Microsoft Teams...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M20.625 0H3.375A3.375 3.375 0 0 0 0 3.375v13.5A3.375 3.375 0 0 0 3.375 20.25h5.625v3.375a.375.375 0 0 0 .643.265l4.5-4.5a.375.375 0 0 0-.265-.64H3.375a2.625 2.625 0 0 1-2.625-2.625v-13.5A2.625 2.625 0 0 1 3.375.75h17.25a2.625 2.625 0 0 1 2.625 2.625v13.5a2.625 2.625 0 0 1-2.625 2.625h-5.25v.75h5.25A3.375 3.375 0 0 0 24 16.875v-13.5A3.375 3.375 0 0 0 20.625 0z"/>
                  <circle cx="12" cy="8.25" r="1.5"/>
                  <circle cx="16.5" cy="8.25" r="1.5"/>
                  <circle cx="7.5" cy="8.25" r="1.5"/>
                </svg>
                <span>Sign in with Microsoft Teams</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom authentication</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for HubSpot
    const renderHubSpotOAuthButton = () => {
      // Check if HubSpot is selected AND OAuth2 is the selected auth type
      const selectedAuthType = String(authConfig.authType || '').toLowerCase();
      if (!isHubSpot || (selectedConnector.auth_type !== 'oauth2' && selectedAuthType !== 'oauth2')) return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-orange-500/10 to-amber-600/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#ff7a59] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm1-11h-2v4H7v2h4v4h2v-4h4v-2h-4V8z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your HubSpot account with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#ff7a59] hover:bg-[#ff6644] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to HubSpot...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm1-11h-2v4H7v2h4v4h2v-4h4v-2h-4V8z"/>
                </svg>
                <span>Sign in with HubSpot</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom authentication</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for Zoom
    const renderZoomOAuthButton = () => {
      // Check if Zoom is selected AND OAuth2 is the selected auth type
      const selectedAuthType = String(authConfig.authType || '').toLowerCase();
      if (!isZoom || (selectedConnector.auth_type !== 'oauth2' && selectedAuthType !== 'oauth2')) return null;

      // Check if connector has authType selector (dual OAuth support)
      const hasAuthTypeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => (field.key ?? field.name) === 'authType');

      // If connector supports both OAuth types, only show this button when 'oauth2' is selected
      if (hasAuthTypeSelector && String(authConfig.authType || '').toLowerCase() !== 'oauth2') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-600/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#2D8CFF] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M5.5 5.5h4v4h-4v-4zm0 5h4v4h-4v-4zm5-5h4v4h-4v-4zm0 5h4v4h-4v-4zm5-5h4v4h-4v-4zm0 5h4v4h-4v-4zM2 2h8v8H2V2zm12 0h8v8h-8V2zM2 14h8v8H2v-8zm12 0h8v8h-8v-8z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your Zoom account with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#2D8CFF] hover:bg-[#1E7EEE] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to Zoom...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M5.5 5.5h4v4h-4v-4zm0 5h4v4h-4v-4zm5-5h4v4h-4v-4zm0 5h4v4h-4v-4zm5-5h4v4h-4v-4zm0 5h4v4h-4v-4zM2 2h8v8H2V2zm12 0h8v8h-8V2zM2 14h8v8H2v-8zm12 0h8v8h-8v-8z"/>
                </svg>
                <span>Sign in with Zoom</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom authentication</span>
            </div>
          </div>
        </>
      );
    };

    // Render one-click OAuth button for ClickUp
    const renderClickUpOAuthButton = () => {
      if (!isClickUp || selectedConnector.auth_type?.toLowerCase() !== 'oauth2') return null;

      // Check if connector has authMode selector (dual OAuth support)
      const hasAuthModeSelector = selectedConnector.auth_fields && Array.isArray(selectedConnector.auth_fields) &&
        selectedConnector.auth_fields.some((field: AuthField) => field.key === 'authMode');

      // If connector supports both OAuth modes, only show this button when 'oneclick' is selected (or no mode selected yet)
      if (hasAuthModeSelector && authConfig.authMode && String(authConfig.authMode || '').toLowerCase() !== 'oneclick') {
        return null;
      }

      return (
        <>
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-[#7B68EE] rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                  <path d="M2 6h7v7H2V6zm9 0h7v7h-7V6zm-9 9h7v7H2v-7zm9 0h7v7h-7v-7z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">One-Click Setup</h4>
                <p className="text-sm text-gray-300">
                  Connect your ClickUp workspace with a single click. No need to create OAuth credentials or manage API keys.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCentralizedOAuth()}
            disabled={oauthLoading || !credentialName}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#7B68EE] hover:bg-[#6A57DD] text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting to ClickUp...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                  <path d="M2 6h7v7H2V6zm9 0h7v7h-7V6zm-9 9h7v7H2v-7zm9 0h7v7h-7v-7z"/>
                </svg>
                <span>Sign in with ClickUp</span>
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or use custom OAuth credentials</span>
            </div>
          </div>
        </>
      );
    };

    // Show OAuth info banner for OAuth2 connectors
    // Check for OAuth2 with case-insensitive comparison
    // Also check if OAuth2 is selected in the authType field for connectors with multiple auth types
    const directOAuth = selectedConnector.auth_type?.toLowerCase() === 'oauth2';
    const selectedAuthType = String(authConfig.authType || '').toLowerCase();
    const isOAuth = directOAuth || selectedAuthType === 'oauth2';
    

    // Get auth fields from connector metadata
    const authFieldsRaw = selectedConnector.auth_fields;


    // Handle case where auth_fields might be null, undefined, or not an array
    let authFields: AuthField[] = [];

    if (Array.isArray(authFieldsRaw)) {
      // Map array items to ensure they have 'name' field
      authFields = authFieldsRaw.map((field: AuthField) => ({
        ...field,
        name: field.name || field.key, // Use 'key' if 'name' is not present
      }));
    } else if (authFieldsRaw && typeof authFieldsRaw === 'object') {
      // If it's an object, try to convert it to an array
      authFields = Object.entries(authFieldsRaw).map(([key, value]: [string, Record<string, unknown>]) => ({
        name: key,
        label: (value.label as string) || key,
        type: (value.type as AuthField['type']) || 'text',
        placeholder: value.placeholder as string | undefined,
        required: value.required as boolean | undefined,
        defaultValue: value.defaultValue as string | number | boolean | undefined,
        description: value.description as string | undefined,
        helpUrl: value.helpUrl as string | undefined,
        helpText: value.helpText as string | undefined,
        options: value.options as AuthField['options'],
        rows: value.rows as number | undefined,
      }));
    } else if (!authFieldsRaw) {
      // If auth_fields is null/undefined, generate basic fields based on auth_type

      switch (selectedConnector.auth_type) {
        case 'oauth2':
          authFields = [
            {
              name: 'client_id',
              label: 'Client ID',
              type: 'text',
              placeholder: 'Your OAuth Client ID',
              required: true,
              description: 'Get this from the provider\'s developer console'
            },
            {
              name: 'client_secret',
              label: 'Client Secret',
              type: 'password',
              placeholder: 'Your OAuth Client Secret',
              required: true
            },
            {
              name: 'redirect_uri',
              label: 'Redirect URI',
              type: 'url',
              placeholder: `${window.location.origin}/oauth/callback`,
              defaultValue: `${window.location.origin}/oauth/callback`,
              required: true,
              description: 'Make sure this URI is configured in the provider\'s settings'
            }
          ];
          break;

        case 'api_key':
          authFields = [
            {
              name: 'api_key',
              label: 'API Key',
              type: 'password',
              placeholder: 'Enter your API key',
              required: true
            }
          ];
          break;

        case 'basic':
          authFields = [
            {
              name: 'username',
              label: 'Username',
              type: 'text',
              placeholder: 'Enter username',
              required: true
            },
            {
              name: 'password',
              label: 'Password',
              type: 'password',
              placeholder: 'Enter password',
              required: true
            }
          ];
          break;

        default:
          // console.warn('Unknown auth_type:', selectedConnector.auth_type);
      }
    }

    if (authFields.length === 0) {
      return (
        <div className="text-center text-gray-400 py-8">
          <p>No authentication fields configured for this connector</p>
          <p className="text-xs mt-2">Auth type: {selectedConnector.auth_type}</p>
        </div>
      );
    }

    const handleCopyRedirectUri = () => {
      const redirectUri = authConfig.redirect_uri || `${window.location.origin}/oauth/callback`;
      navigator.clipboard.writeText(redirectUri);
      setCopiedRedirectUri(true);
      toast.success('Redirect URI copied to clipboard');
      setTimeout(() => setCopiedRedirectUri(false), 2000);
    };

    return (
      <div className="space-y-4">
        {/* Show LinkedIn, Google, Twitter, GitHub, Slack, or Notion one-click OAuth button if available */}
        {/* Show LinkedIn, Google, Twitter, GitHub, Discord, Reddit, or Shopify one-click OAuth button if available */}
        {renderLinkedInOAuthButton()}
        {renderGoogleOAuthButton()}
        {renderTwitterOAuthButton()}
        {renderFacebookOAuthButton()}
        {renderGitHubOAuthButton()}
        {renderSlackOAuthButton()}
        {renderNotionOAuthButton()}
        {renderDiscordOAuthButton()}
        {renderRedditOAuthButton()}
        {renderShopifyOAuthButton()}
        {renderPinterestOAuthButton()}
        {renderTeamsOAuthButton()}
        {renderHubSpotOAuthButton()}
        {renderZoomOAuthButton()}
        {renderClickUpOAuthButton()}

        {isOAuth && (
          <>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                <ExternalLink className="w-4 h-4 inline mr-2" />
                You'll be redirected to authorize access to your {selectedConnector.display_name} account.
              </p>
            </div>

            {/* OAuth Redirect URL - Show prominently */}
            <div className="space-y-2">
              <Label className="text-white">OAuth Redirect URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={authConfig.redirect_uri || `${getEnvironmentBaseUrl()}/api/oauth/${getOAuthProviderName(selectedConnector.name)}/callback`}
                  readOnly
                  className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                />
                <Button
                  type="button"
                  onClick={handleCopyRedirectUri}
                  className="bg-gray-700 hover:bg-gray-600 shrink-0"
                  title="Copy to clipboard"
                >
                  {copiedRedirectUri ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                In {selectedConnector.display_name}, use the URL above when prompted to enter an OAuth callback or redirect URL
              </p>
            </div>
          </>
        )}

        {authFields.map((field: AuthField, index: number) => {
          // Skip redirect_uri field since we show it above
          if (isOAuth && field.name === 'redirect_uri') {
            return null;
          }
          
          // Check displayOptions to conditionally render fields
          if (field.displayOptions) {
            let shouldDisplay = true;

            // Handle nested displayOptions structure with 'show' property
            const displayConditions = field.displayOptions.show || field.displayOptions;

            // Check each display condition
            for (const [conditionField, expectedValues] of Object.entries(displayConditions)) {
              const currentValue = authConfig[conditionField];
              const expectedArray = Array.isArray(expectedValues) ? expectedValues : [expectedValues];

              if (!expectedArray.includes(currentValue)) {
                shouldDisplay = false;
                break;
              }
            }

            if (!shouldDisplay) {
              return null;
            }
          }
          
          return <React.Fragment key={field.name || `field-${index}`}>{renderAuthField(field)}</React.Fragment>;
        })}
      </div>
    );
  };


  const filteredConnectors = connectors
    .filter(c => c.status === 'active')
    .filter(c =>
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase())
    );


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl text-white">
            {step === 'configure' && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <span className="text-white">
              {step === 'select' ? 'Add new credential' : `Configure ${selectedConnector?.display_name}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className="space-y-4 mt-4">
            <p className="text-gray-400">Select an app or service to connect to</p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search for app..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Connectors List */}
            <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
              {filteredConnectors.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No apps found matching "{searchQuery}"
                </div>
              ) : (
                filteredConnectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => handleConnectorSelect(connector)}
                    className="p-4 rounded-lg border border-white/10 hover:border-cyan-500/50 hover:bg-white/5 transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {connector.display_name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white group-hover:text-cyan-500 transition-colors">
                          {connector.display_name}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {connector.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-gray-300">
                            {connector.category}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                            {connector.auth_type === 'oauth2' ? 'OAuth2' : connector.auth_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* Credential Selection or Name */}
            <div className="space-y-2">
              <Label className="text-white">Credential</Label>

              {credentialMode === 'select' && existingCredentials.length > 0 ? (
                // Show credential selector when there are existing credentials
                <div className="flex gap-2">
                  <Select
                    value={selectedCredentialId}
                    onValueChange={(value) => {
                      setSelectedCredentialId(value);
                      // Find the selected credential and populate its name
                      const selectedCred = existingCredentials.find(c => c.id === value);
                      if (selectedCred) {
                        setCredentialName(selectedCred.name);
                        // Note: We don't populate authConfig here as we're using an existing credential
                      }
                    }}
                    disabled={loadingCredentials}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white flex-1">
                      <SelectValue
                        placeholder={loadingCredentials ? "Loading credentials..." : "Select existing credential"}
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {existingCredentials.map((credential) => (
                        <SelectItem key={credential.id} value={credential.id} className="text-white hover:bg-gray-700">
                          {credential.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      setCredentialMode('create');
                      setSelectedCredentialId('');
                      setCredentialName(`${selectedConnector?.display_name} account`);
                    }}
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    title="Create new credential"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                // Show text input for new credential
                <div className="space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        value={credentialName}
                        onChange={(e) => setCredentialName(e.target.value)}
                        placeholder="My Gmail Account"
                        className="bg-gray-800 border-gray-700 text-white"
                        required
                      />
                    </div>
                    {existingCredentials.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCredentialMode('select');
                          setCredentialName('');
                        }}
                        className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 whitespace-nowrap"
                      >
                        Use Existing
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    A descriptive name to identify this credential
                  </p>
                </div>
              )}
            </div>

            {/* Auth Fields - Only show when creating new credential */}
            {credentialMode === 'create' && renderAuthFields()}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || oauthLoading || (credentialMode === 'select' && !selectedCredentialId)}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
              >
                {loading || oauthLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {selectedConnector?.auth_type === 'oauth2' ? 'Connecting...' : 'Creating...'}
                  </>
                ) : credentialMode === 'select' ? (
                  'Use Selected Credential'
                ) : (
                  selectedConnector?.auth_type === 'oauth2' ? 'Connect with OAuth' : 'Create Credential'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
