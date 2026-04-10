import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Key,
  Shield,
  Zap,
  Info,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getEnvironmentBaseUrl } from '@/lib/config';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AuthFieldOption {
  label: string;
  value: string;
  description?: string;
}

interface AuthField {
  key?: string;
  name?: string; // Legacy - some connectors use name instead of key
  label: string;
  type: 'string' | 'text' | 'password' | 'secret' | 'email' | 'url' | 'select' | 'textarea' | 'number' | 'boolean';
  placeholder?: string;
  required?: boolean;
  default?: string | number | boolean;
  defaultValue?: string | number | boolean;
  description?: string;
  helpUrl?: string;
  helpText?: string;
  options?: AuthFieldOption[];
  rows?: number;
  displayOptions?: Record<string, string[]>; // Conditional display based on other field values
}

interface Connector {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  auth_type: string;
  auth_fields?: AuthField[];
  oauth_config?: {
    authorization_url?: string;
    token_url?: string;
    scopes?: string[];
  };
  status: string;
}

interface AddCredentialModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  connectors: Connector[];
  onSuccess: (credentialId?: string) => void;
  preSelectedConnector?: string; // Pre-select a connector by name
  preSelectedAuthType?: string; // Pre-select auth type for multi-auth connectors
  nodeId?: string;  
}

// ============================================================================
// Constants
// ============================================================================

const OAUTH_PROVIDERS: Record<string, string> = {
  google_calendar: 'google',
  google_drive: 'google',
  google_sheets: 'google',
  gmail: 'google',
  teams: 'microsoft',
  microsoft_teams: 'microsoft',
};

const getOAuthProvider = (connectorName: string): string => {
  return OAUTH_PROVIDERS[connectorName] || connectorName;
};

// Connectors that support one-click OAuth
const ONE_CLICK_OAUTH_CONNECTORS = [
  'github', 'google', 'gmail', 'google_calendar', 'google_drive', 'google_sheets',
  'slack', 'discord', 'twitter', 'facebook', 'linkedin', 'notion', 'shopify',
  'hubspot', 'zoom', 'teams', 'microsoft_teams', 'reddit', 'pinterest', 'clickup'
];

// ============================================================================
// Helper Components
// ============================================================================

const FieldDescription: React.FC<{ description?: string; helpUrl?: string; helpText?: string }> = ({
  description,
  helpUrl,
  helpText
}) => {
  if (!description && !helpUrl) return null;

  return (
    <div className="flex items-start gap-2 mt-1.5">
      <Info className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
      <div className="text-xs text-gray-500">
        {description}
        {helpUrl && (
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
          >
            {helpText || 'Learn more'}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

const ConnectorIcon: React.FC<{ name: string; className?: string; displayName?: string }> = ({ name, className, displayName }) => {
  const [imgError, setImgError] = useState(false);
  const iconPath = `/icons/connectors/${name}.png`;

  // Generate a consistent color based on connector name
  const getColorClass = (connectorName: string) => {
    const colors = [
      'bg-blue-500/20 text-blue-400',
      'bg-green-500/20 text-green-400',
      'bg-purple-500/20 text-purple-400',
      'bg-orange-500/20 text-orange-400',
      'bg-pink-500/20 text-pink-400',
      'bg-cyan-500/20 text-cyan-400',
      'bg-yellow-500/20 text-yellow-400',
      'bg-red-500/20 text-red-400',
    ];
    const index = connectorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const firstLetter = (displayName || name || 'C').charAt(0).toUpperCase();

  return (
    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", imgError ? getColorClass(name) : "bg-white", className)}>
      {imgError ? (
        <span className="text-lg font-semibold">{firstLetter}</span>
      ) : (
        <img
          src={iconPath}
          alt={name}
          className="w-6 h-6 object-contain"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const AddCredentialModalV2: React.FC<AddCredentialModalV2Props> = ({
  isOpen,
  onClose,
  connectors,
  onSuccess,
  preSelectedConnector,
  preSelectedAuthType,
  // nodeId is reserved for future use (auto-apply credential to node after creation)
}) => {
  // State
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [credentialName, setCredentialName] = useState('');
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCustomOAuth, setShowCustomOAuth] = useState(false);

  // Refs for OAuth cleanup
  const pendingCredentialRef = useRef<string | null>(null);
  const oauthCompletedRef = useRef(false);

  // ============================================================================
  // Effects
  // ============================================================================

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Handle pre-selected connector
      if (preSelectedConnector) {
        const connector = connectors.find(c => c.name === preSelectedConnector);
        if (connector) {
          handleSelectConnector(connector, preSelectedAuthType);
        }
      }
    } else {
      // Cleanup on close
      if (pendingCredentialRef.current && !oauthCompletedRef.current) {
        api.delete(`/connectors/${pendingCredentialRef.current}`).catch(() => {});
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_code_verifier');
      }

      // Reset state
      setTimeout(() => {
        setStep('select');
        setSearchQuery('');
        setSelectedConnector(null);
        setCredentialName('');
        setFormData({});
        setShowCustomOAuth(false);
        pendingCredentialRef.current = null;
        oauthCompletedRef.current = false;
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preSelectedConnector, connectors]);

  // Listen for OAuth callback messages from popup
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Handle success message from OAuth popup
      if (event.data?.type === 'oauth_success') {
        oauthCompletedRef.current = true;
        setOauthLoading(false);
        toast.success('Successfully connected!');
        // Pass the credential ID from the event or fallback to pending ref
        const credentialId = event.data.credentialId || pendingCredentialRef.current;
        onSuccess(credentialId);
        onClose();
      }
      // Handle error message from OAuth popup
      else if (event.data?.type === 'oauth_error') {
        setOauthLoading(false);
        toast.error(event.data?.message || 'OAuth connection failed');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onSuccess, onClose]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Filter connectors by search
  const filteredConnectors = useMemo(() => {
    if (!searchQuery.trim()) return connectors;

    const query = searchQuery.toLowerCase();
    return connectors.filter(c =>
      c.display_name.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      c.category.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query)
    );
  }, [connectors, searchQuery]);

  // Group connectors by category
  const groupedConnectors = useMemo(() => {
    const groups: Record<string, Connector[]> = {};
    filteredConnectors.forEach(c => {
      const category = c.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(c);
    });
    return groups;
  }, [filteredConnectors]);

  // Get visible auth fields based on displayOptions
  const visibleFields = useMemo(() => {
    if (!selectedConnector?.auth_fields) return [];

    return selectedConnector.auth_fields.filter(field => {
      if (!field.displayOptions) return true;

      // Check all displayOptions conditions
      return Object.entries(field.displayOptions).every(([dependsOn, allowedValues]) => {
        const currentValue = String(formData[dependsOn] ?? '');
        return allowedValues.includes(currentValue);
      });
    });
  }, [selectedConnector, formData]);

  // Check if OAuth is selected
  const isOAuthSelected = useMemo(() => {
    if (!selectedConnector) return false;

    const authType = selectedConnector.auth_type?.toLowerCase();
    const selectedAuthType = typeof formData.authType === 'string' ? formData.authType.toLowerCase() : undefined;

    // For multiple auth type connectors
    if (authType === 'multiple') {
      return selectedAuthType === 'oauth2';
    }

    // For single auth type connectors
    return authType === 'oauth2';
  }, [selectedConnector, formData.authType]);

  // Check if one-click OAuth is available
  const hasOneClickOAuth = useMemo(() => {
    if (!selectedConnector) return false;
    return ONE_CLICK_OAUTH_CONNECTORS.includes(selectedConnector.name);
  }, [selectedConnector]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSelectConnector = (connector: Connector, authType?: string) => {
    setSelectedConnector(connector);
    setCredentialName(`My ${connector.display_name} Credential`);
    setStep('configure');

    // Initialize form data with defaults
    const initialData: Record<string, string | number | boolean> = {};
    connector.auth_fields?.forEach(field => {
      const key = field.key || field.name;
      if (key) {
        const defaultVal = field.default ?? field.defaultValue;
        if (defaultVal !== undefined) {
          initialData[key] = defaultVal;
        }
      }
    });

    // Override authType if pre-selected (from node config modal)
    if (authType) {
      initialData.authType = authType;
    }

    // Set redirect_uri for OAuth
    if (connector.auth_type?.toLowerCase() === 'oauth2' || connector.auth_type === 'multiple') {
      initialData.redirect_uri = `${getEnvironmentBaseUrl()}/api/oauth/${getOAuthProvider(connector.name)}/callback`;
    }

    setFormData(initialData);
  };

  const handleFieldChange = (key: string, value: string | number | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [key]: value };

      // Update redirect_uri if authType changes to oauth2
      if (key === 'authType' && value === 'oauth2' && selectedConnector) {
        newData.redirect_uri = `${getEnvironmentBaseUrl()}/api/oauth/${getOAuthProvider(selectedConnector.name)}/callback`;
      }

      return newData;
    });
  };

  const handleCopy = async (text: string, fieldKey: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleOneClickOAuth = async () => {
    if (!selectedConnector) return;

    try {
      setOauthLoading(true);

      // Create credential placeholder
      const createResponse = await api.post<{ id: string }>('/connectors', {
        connector_type: selectedConnector.name,
        name: credentialName,
        config: {
          authType: 'oauth2',
          authMode: 'oneclick'
        },
        credentials: {}
      });

      const credentialId = createResponse.id;
      pendingCredentialRef.current = credentialId;

      // Get current user ID from API
      const userResponse = await api.get<{ user?: { id: string }; id?: string }>('/auth/me');
      const userId = userResponse.user?.id || userResponse.id;

      if (!userId) {
        throw new Error('User ID not found. Please ensure you are logged in.');
      }

      // Build OAuth URL with required parameters
      const baseUrl = getEnvironmentBaseUrl();
      const provider = getOAuthProvider(selectedConnector.name);
      const authUrl = `${baseUrl}/api/v1/oauth/${provider}/authorize?userId=${userId}&credentialId=${credentialId}&connectorType=${selectedConnector.name}`;

      // Store credential ID for callback
      sessionStorage.setItem('oauth_credential_id', credentialId);

      // Open OAuth popup
      const popup = window.open(authUrl, 'oauth', 'width=600,height=700');

      if (!popup) {
        toast.error('Please allow popups to connect with OAuth');
        setOauthLoading(false);
        return;
      }

      // Poll for popup close
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          if (!oauthCompletedRef.current) {
            setOauthLoading(false);
          }
        }
      }, 500);

    } catch (error: unknown) {
      setOauthLoading(false);
      toast.error(error instanceof Error ? error.message : 'Failed to start OAuth flow');
    }
  };

  const handleManualSubmit = async () => {
    if (!selectedConnector) return;

    // Validate required fields
    const missingFields = visibleFields
      .filter(f => f.required && !formData[f.key || f.name || ''])
      .map(f => f.label);

    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setLoading(true);

      // Separate config and credentials
      const config: Record<string, string | number | boolean> = {};
      const credentials: Record<string, string | number | boolean> = {};

      visibleFields.forEach(field => {
        const key = field.key || field.name || '';
        const value = formData[key];

        // Config fields (non-sensitive)
        if (['authType', 'authMode', 'redirect_uri', 'instanceUrl', 'region'].includes(key)) {
          config[key] = value;
        } else {
          // Credential fields (sensitive)
          credentials[key] = value;
        }
      });

      const response = await api.post<{ id: string }>('/connectors', {
        connector_type: selectedConnector.name,
        name: credentialName,
        config,
        credentials
      });

      toast.success('Credential created successfully!');
      onSuccess(response.id);
      onClose();

    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create credential');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderField = (field: AuthField) => {
    const key = field.key || field.name || '';
    const value = formData[key] ?? '';
    const fieldType = field.type;

    // Don't render authType selector field directly - we handle it separately
    if (key === 'authType') return null;

    return (
      <div key={key} className="space-y-2">
        <Label className="text-white flex items-center gap-2">
          {field.label}
          {field.required && <span className="text-red-400">*</span>}
        </Label>

        {fieldType === 'select' && field.options ? (
          <Select value={String(value)} onValueChange={(v) => handleFieldChange(key, v)}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {field.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-white">
                  <div>
                    <div>{opt.label}</div>
                    {opt.description && (
                      <div className="text-xs text-gray-400">{opt.description}</div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : fieldType === 'textarea' ? (
          <Textarea
            value={String(value)}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 3}
            className="bg-gray-800 border-gray-700 text-white resize-none"
          />
        ) : fieldType === 'boolean' ? (
          <div className="flex items-center gap-3">
            <Switch
              checked={!!value}
              onCheckedChange={(checked) => handleFieldChange(key, checked)}
            />
            <span className="text-sm text-gray-400">
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        ) : (
          <div className="relative">
            <Input
              type={fieldType === 'password' || fieldType === 'secret' ? 'password' : 'text'}
              value={String(value)}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              placeholder={field.placeholder}
              className="bg-gray-800 border-gray-700 text-white pr-10"
            />
            {(key === 'redirect_uri' || key === 'redirectUri') && value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => handleCopy(String(value), key)}
              >
                {copiedField === key ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </Button>
            )}
          </div>
        )}

        <FieldDescription
          description={field.description}
          helpUrl={field.helpUrl}
          helpText={field.helpText}
        />
      </div>
    );
  };

  const renderAuthTypeSelector = () => {
    const authTypeField = selectedConnector?.auth_fields?.find(
      f => (f.key === 'authType' || f.name === 'authType')
    );

    if (!authTypeField || !authTypeField.options) return null;

    return (
      <div className="space-y-3">
        <Label className="text-white text-sm font-medium">Authentication Method</Label>
        <div className="grid grid-cols-1 gap-2">
          {authTypeField.options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleFieldChange('authType', option.value)}
              className={cn(
                "p-4 rounded-lg border text-left transition-all",
                formData.authType === option.value
                  ? "bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30"
                  : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
              )}
            >
              <div className="flex items-center gap-3">
                {option.value === 'oauth2' ? (
                  <Shield className="w-5 h-5 text-cyan-400" />
                ) : (
                  <Key className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <div className="text-white font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-400 mt-0.5">{option.description}</div>
                  )}
                </div>
                {option.value === 'oauth2' && (
                  <Badge className="ml-auto bg-cyan-500/20 text-cyan-400 border-0">
                    Recommended
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderOAuthSection = () => {
    if (!isOAuthSelected) return null;

    return (
      <div className="space-y-4">
        {hasOneClickOAuth ? (
          <>
            <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-cyan-400 mt-0.5" />
                <div>
                  <div className="text-white font-medium">One-Click OAuth Available</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Connect instantly without creating your own OAuth app.
                    We'll handle the authentication for you.
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleOneClickOAuth}
              disabled={oauthLoading || !credentialName.trim()}
              className="w-full h-12 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium"
            >
              {oauthLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Connect with {selectedConnector?.display_name}
                </>
              )}
            </Button>

            {/* Toggle for custom OAuth app */}
            <button
              type="button"
              onClick={() => setShowCustomOAuth(!showCustomOAuth)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-400 py-2 transition-colors"
            >
              {showCustomOAuth ? 'Hide custom OAuth options' : 'Use my own OAuth app instead'}
            </button>

            {/* Custom OAuth fields - only shown when toggled */}
            {showCustomOAuth && (
              <div className="space-y-4 pt-2 border-t border-gray-700/50">
                <p className="text-xs text-gray-500">
                  Provide your own OAuth app credentials if you prefer not to use one-click authentication.
                </p>
                {visibleFields.map(renderField)}
                <Button
                  type="button"
                  onClick={handleManualSubmit}
                  disabled={loading}
                  className="w-full h-11 bg-gray-700 hover:bg-gray-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create with Custom OAuth'
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Manual OAuth fields for connectors without one-click */}
            <div className="space-y-4">
              {visibleFields.map(renderField)}
            </div>

            {visibleFields.length > 0 && (
              <Button
                type="button"
                onClick={handleManualSubmit}
                disabled={loading}
                className="w-full h-11 bg-cyan-600 hover:bg-cyan-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Credential'
                )}
              </Button>
            )}
          </>
        )}
      </div>
    );
  };

  const renderManualAuthSection = () => {
    if (isOAuthSelected) return null;

    return (
      <div className="space-y-4">
        {visibleFields.length === 0 ? (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <div className="text-white font-medium">No fields configured</div>
                <div className="text-sm text-gray-400 mt-1">
                  This connector doesn't have any authentication fields configured.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {visibleFields.map(renderField)}

            <Button
              type="button"
              onClick={handleManualSubmit}
              disabled={loading}
              className="w-full h-11 bg-cyan-600 hover:bg-cyan-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Credential'
              )}
            </Button>
          </>
        )}
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            {step === 'configure' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white"
                onClick={() => {
                  setStep('select');
                  setSelectedConnector(null);
                }}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="text-xl text-white">
                {step === 'select' ? 'Add New Credential' : `Connect ${selectedConnector?.display_name}`}
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-1">
                {step === 'select'
                  ? 'Select a connector to create a new credential'
                  : 'Configure your connection settings'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 'select' ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search connectors..."
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>

              {/* Connector Grid */}
              <div className="space-y-6">
                {Object.entries(groupedConnectors).map(([category, categoryConnectors]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categoryConnectors.map(connector => (
                        <button
                          key={connector.id}
                          type="button"
                          onClick={() => handleSelectConnector(connector)}
                          className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 hover:bg-gray-800 transition-all text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <ConnectorIcon name={connector.name} displayName={connector.display_name} className="w-10 h-10" />
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium truncate">
                                {connector.display_name}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                {connector.description}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="flex-shrink-0 text-xs border-gray-600 text-gray-400"
                            >
                              {connector.auth_type === 'oauth2' ? 'OAuth' :
                               connector.auth_type === 'multiple' ? 'Multi' :
                               connector.auth_type === 'api_key' ? 'API Key' :
                               connector.auth_type}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredConnectors.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No connectors found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connector Header */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <ConnectorIcon name={selectedConnector?.name || ''} displayName={selectedConnector?.display_name} className="w-12 h-12" />
                <div>
                  <h3 className="text-white font-medium">{selectedConnector?.display_name}</h3>
                  <p className="text-sm text-gray-400">{selectedConnector?.description}</p>
                </div>
              </div>

              {/* Credential Name */}
              <div className="space-y-2">
                <Label className="text-white">Credential Name</Label>
                <Input
                  value={credentialName}
                  onChange={(e) => setCredentialName(e.target.value)}
                  placeholder="Enter a name for this credential"
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500">
                  Give this credential a memorable name to identify it later
                </p>
              </div>

              <Separator className="bg-gray-700" />

              {/* Auth Type Selector (for multi-auth connectors) */}
              {selectedConnector?.auth_type === 'multiple' && renderAuthTypeSelector()}

              {/* OAuth Section */}
              {renderOAuthSection()}

              {/* Manual Auth Section */}
              {renderManualAuthSection()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCredentialModalV2;
