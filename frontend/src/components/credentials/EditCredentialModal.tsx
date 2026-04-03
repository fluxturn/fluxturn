import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface AuthField {
  name: string;
  label: string;
  type: 'string' | 'text' | 'password' | 'secret' | 'email' | 'url' | 'select' | 'textarea' | 'number' | 'boolean';
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  description?: string;
  helpUrl?: string;
  helpText?: string;
  options?: { label: string; value: string }[];
  rows?: number;
}

interface Credential {
  id: string;
  name: string;
  connector_type: string;
  description?: string;
  is_active: boolean;
}

interface Connector {
  id: string;
  name: string;
  display_name: string;
  description: string;
  auth_type: string;
  auth_fields?: AuthField[];
}

interface EditCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: Credential;
  connector?: Connector;
  onSuccess: () => void;
}

export const EditCredentialModal: React.FC<EditCredentialModalProps> = ({
  isOpen,
  onClose,
  credential,
  connector,
  onSuccess,
}) => {
  const [credentialName, setCredentialName] = useState(credential.name);
  const [authConfig, setAuthConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCredentialName(credential.name);
      setAuthConfig({});
    }
  }, [isOpen, credential]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const updatePayload: any = {
        name: credentialName,
      };

      // Only include credentials if any auth fields were changed
      if (Object.keys(authConfig).length > 0) {
        updatePayload.credentials = authConfig;
      }

      await api.put(`/connectors/${credential.id}`, updatePayload);

      toast.success('Credential updated successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to update credential:', error);
      toast.error(error.message || 'Failed to update credential');
    } finally {
      setLoading(false);
    }
  };

  const handleReauthorize = async () => {
    if (connector?.auth_type !== 'oauth2') {
      toast.error('Re-authorization is only available for OAuth2 connectors');
      return;
    }

    try {
      setLoading(true);

      // Save configuration options (like organization_support, legacy) before OAuth
      // This ensures the backend has the latest settings when generating OAuth URL
      if (Object.keys(authConfig).length > 0) {
        await api.put(`/connectors/${credential.id}`, {
          name: credentialName,
          credentials: authConfig,
        });
      }

      // Get OAuth URL
      const oauthResponse = await api.get<{ authorization_url: string; state: string; code_verifier?: string }>(
        `/connectors/${credential.id}/oauth/url`
      );
      const { authorization_url, state, code_verifier } = oauthResponse;

      // Store state and code_verifier for verification
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_credential_id', credential.id);

      // Store code_verifier for PKCE (Twitter OAuth 2.0)
      if (code_verifier) {
        sessionStorage.setItem('oauth_code_verifier', code_verifier);
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

      // Listen for OAuth callback
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'oauth_success') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
          toast.success('Credential re-authorized successfully!');
          onSuccess();
        } else if (event.data.type === 'oauth_error') {
          clearTimeout(timeout);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
          toast.error(event.data.message || 'OAuth authentication failed');
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was blocked
      if (!popup) {
        toast.error('Popup was blocked. Please allow popups for this site.');
        setLoading(false);
        return;
      }

      // Set a timeout to handle popup close or user cancellation (5 minutes)
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        setLoading(false);
        toast.error('OAuth flow timed out or was cancelled');
      }, 5 * 60 * 1000);
    } catch (error: any) {
      console.error('Re-authorization error:', error);
      toast.error(error.message || 'Failed to start re-authorization');
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setAuthConfig((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const renderAuthField = (field: AuthField) => {
    const value = authConfig[field.name] ?? "";
    const isPasswordField = field.type === 'password' || field.type === 'secret';

    // For password fields, show placeholder to indicate existing value
    const placeholder = isPasswordField && !authConfig[field.name]
      ? '••••••••••••'
      : field.placeholder || '';

    // Handle different field types
    switch (field.type) {
      case "string":
      case "text":
      case "email":
      case "url":
        return (
          <div key={field.name} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              type={field.type}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={placeholder}
              className="bg-gray-800 border-gray-700 text-white"
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
          <div key={field.name} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              type="password"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={placeholder}
              className="bg-gray-800 border-gray-700 text-white"
            />
            {!authConfig[field.name] && (
              <p className="text-xs text-gray-400">
                Leave empty to keep existing value
              </p>
            )}
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
          <div key={field.name} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <select
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option value="">{field.placeholder || 'Select...'}</option>
              {field.options?.map((option: any) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={field.name} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={placeholder}
              rows={field.rows || 3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={field.name} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.valueAsNumber)}
              placeholder={placeholder}
              className="bg-gray-800 border-gray-700 text-white"
            />
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
          </div>
        );

      case "boolean":
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id={field.name}
                checked={value === true || value === 'true'}
                onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-700 rounded focus:ring-cyan-500 focus:ring-2"
              />
              <Label htmlFor={field.name} className="text-white cursor-pointer">
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
          <div key={field.name} className="space-y-2">
            <Label className="text-white">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <Input
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={placeholder}
              className="bg-gray-800 border-gray-700 text-white"
            />
            {field.description && (
              <p className="text-xs text-gray-400">{field.description}</p>
            )}
          </div>
        );
    }
  };

  const renderAuthFields = () => {
    if (!connector) return null;

    // Get auth fields from connector metadata
    const authFieldsRaw = connector.auth_fields;
    let authFields: AuthField[] = [];

    if (Array.isArray(authFieldsRaw)) {
      authFields = authFieldsRaw.map((field: any) => ({
        ...field,
        name: field.name || field.key,
      }));
    } else if (authFieldsRaw && typeof authFieldsRaw === 'object') {
      authFields = Object.entries(authFieldsRaw).map(([key, value]: [string, any]) => ({
        name: key,
        label: value.label || key,
        type: value.type || 'text',
        placeholder: value.placeholder,
        required: value.required,
        defaultValue: value.defaultValue,
        description: value.description,
        helpUrl: value.helpUrl,
        helpText: value.helpText,
        options: value.options,
        rows: value.rows,
      }));
    } else if (!authFieldsRaw) {
      // Generate basic fields based on auth_type
      switch (connector.auth_type) {
        case 'api_key':
          authFields = [
            {
              name: 'api_key',
              label: 'API Key',
              type: 'password',
              placeholder: 'Enter your API key',
              required: false,
              description: 'Leave empty to keep existing value'
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
              required: false
            },
            {
              name: 'password',
              label: 'Password',
              type: 'password',
              placeholder: 'Enter password',
              required: false,
              description: 'Leave empty to keep existing value'
            }
          ];
          break;

        default:
          return null;
      }
    }

    if (authFields.length === 0) {
      return null;
    }

    // For OAuth2 connectors, only show configuration fields (boolean, select) not credentials
    const isOAuth2 = connector.auth_type === 'oauth2';
    const filteredFields = isOAuth2
      ? authFields.filter((field: AuthField) =>
          field.type === 'boolean' ||
          field.type === 'select' ||
          // Also include fields explicitly marked as configuration (not credentials)
          field.name === 'organization_support' ||
          field.name === 'legacy'
        )
      : authFields;

    if (filteredFields.length === 0) {
      return null;
    }

    return (
      <div className="space-y-4">
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-sm font-medium text-white mb-3">
            {isOAuth2 ? 'Configuration Options' : 'Authentication Details'}
          </h4>
          <p className="text-xs text-gray-400 mb-4">
            {isOAuth2
              ? 'Update configuration options. Re-authorize after changing these settings.'
              : 'Update authentication credentials. Leave password fields empty to keep existing values.'
            }
          </p>
        </div>
        {filteredFields.map((field: AuthField, index: number) => (
          <React.Fragment key={field.name || `field-${index}`}>
            {renderAuthField(field)}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Edit {connector?.display_name || credential.connector_type} Credential
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Credential Name */}
          <div className="space-y-2">
            <Label className="text-white">Credential Name</Label>
            <Input
              value={credentialName}
              onChange={(e) => setCredentialName(e.target.value)}
              placeholder="My Account"
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
            <p className="text-xs text-gray-400">
              A descriptive name to identify this credential
            </p>
          </div>

          {/* Auth Fields (for non-OAuth connectors) */}
          {renderAuthFields()}

          {/* OAuth Re-authorization */}
          {connector?.auth_type === 'oauth2' && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-400 font-medium mb-2">
                    OAuth Token Expired or Invalid?
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    If your credential is not working, you may need to re-authorize access to your account.
                  </p>
                  <Button
                    type="button"
                    onClick={handleReauthorize}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 h-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Re-authorize
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
