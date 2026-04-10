import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit, Check, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { AddCredentialModalV2 } from './AddCredentialModalV2';
import { EditCredentialModal } from './EditCredentialModal';

interface Credential {
  id: string;
  name: string;
  connector_type: string;
  description?: string;
  is_active: boolean;
  last_tested_at?: string;
  test_status?: string;
  created_at: string;
  updated_at: string;
}

interface AuthField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'secret' | 'email' | 'url' | 'select' | 'textarea' | 'number';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  description?: string;
  helpUrl?: string;
  helpText?: string;
  options?: { label: string; value: string }[];
  rows?: number;
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

export const CredentialsManager: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchCredentials();
    fetchConnectors();

    // Handle OAuth callback from Google
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const email = urlParams.get('email');
    const credentialId = urlParams.get('credentialId');

    if (success === 'true') {
      toast.success(`Successfully connected to Google${email ? ` as ${email}` : ''}!`, {
        description: 'Your credential is ready to use in workflows.',
        duration: 5000,
      });

      // Check if we should return to a previous page
      const returnUrl = sessionStorage.getItem('oauth_return_url');
      if (returnUrl && returnUrl !== '/credentials') {
        sessionStorage.removeItem('oauth_return_url');
        // Redirect back to the original page after a short delay
        setTimeout(() => {
          window.location.href = returnUrl;
        }, 1500);
      } else {
        // Clean URL and stay on credentials page
        window.history.replaceState({}, document.title, window.location.pathname);
        // Refresh credentials list
        setTimeout(() => {
          fetchCredentials();
        }, 1000);
      }
    } else if (error) {
      toast.error('OAuth connection failed', {
        description: decodeURIComponent(error),
        duration: 7000,
      });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Clear return URL on error
      sessionStorage.removeItem('oauth_return_url');
    }
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ connectors: Credential[]; total: number; limit: number; offset: number }>('/connectors');
      // console.log('Credentials data:', data);

      if (data && data.connectors) {
        setCredentials(data.connectors);
      } else {
        setCredentials([]);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch credentials:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load credentials');
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectors = async () => {
    try {
      const data = await api.get<Connector[]>('/connectors/available');
      // console.log('Available connectors:', data);
      setConnectors(data || []);
    } catch (error: unknown) {
      console.error('Failed to fetch connectors:', error);
      toast.error('Failed to load available connectors');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    // Show confirmation toast
    toast.custom((t) => (
      <div className="bg-gray-900 border border-red-500/50  p-4 shadow-lg max-w-md rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">Delete Credential?</h3>
            <p className="text-sm text-gray-400 mb-3">
              Are you sure you want to delete "{name}"? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  toast.dismiss(t);
                  // Proceed with deletion
                  try {
                    toast.loading(`Deleting "${name}"...`);
                    await api.delete(`/connectors/${id}`);
                    // Update state after successful deletion
                    setCredentials(credentials.filter(c => c.id !== id));
                    toast.dismiss();
                    toast.success(`"${name}" deleted successfully`);
                  } catch (err: unknown) {
                    toast.dismiss();

                    const errObj = err as { statusCode?: number; message?: string };
                    // Handle 404 specifically - credential was already deleted or doesn't exist
                    if (errObj.statusCode === 404 || errObj.message?.includes('not found')) {
                      toast.warning(`"${name}" was already deleted or doesn't exist. Refreshing list...`);
                      // Refresh to sync with backend
                      await fetchCredentials();
                    } else {
                      // Other errors
                      toast.error(errObj.message || 'Failed to delete credential');
                    }
                  }
                }}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => toast.dismiss(t)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    ), {
      duration: Infinity, // Don't auto-dismiss
    });
  };

  const handleEdit = (credential: Credential) => {
    setEditingCredential(credential);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    fetchCredentials();
    setShowEditModal(false);
    setEditingCredential(null);
  };

  const getConnectorDisplayName = (connectorType: string) => {
    const connector = connectors.find(c => c.name === connectorType);
    return connector?.display_name || connectorType;
  };

  const getAuthBadge = (connectorType: string) => {
    const connector = connectors.find(c => c.name === connectorType);
    const authType = connector?.auth_type || 'unknown';

    const colors: Record<string, string> = {
      oauth2: 'bg-blue-500/20 text-blue-400',
      api_key: 'bg-green-500/20 text-green-400',
      basic: 'bg-yellow-500/20 text-yellow-400',
      unknown: 'bg-gray-500/20 text-gray-400'
    };

    return (
      <span className={`text-xs px-2 py-1 rounded ${colors[authType] || colors.unknown}`}>
        {authType === 'oauth2' ? 'OAuth2' : authType === 'api_key' ? 'API Key' : authType.toUpperCase()}
      </span>
    );
  };

  const getStatusIcon = (testStatus?: string) => {
    if (!testStatus) return null;

    if (testStatus === 'success') {
      return <Check className="w-4 h-4 text-green-400" />;
    }
    return <X className="w-4 h-4 text-red-400" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredCredentials = credentials.filter(cred =>
    cred.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getConnectorDisplayName(cred.connector_type).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Credentials</h3>
            <p className="text-sm text-gray-400 mt-1">Manage your app connections and credentials</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Credential
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search credentials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Credentials List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p>Loading credentials...</p>
            </div>
          ) : filteredCredentials.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/20 rounded-lg">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                <Plus className="w-8 h-8 text-cyan-400" />
              </div>
              <p className="text-gray-400 mb-4">
                {searchQuery ? 'No credentials found matching your search' : 'No credentials yet'}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add your first credential
              </button>
            </div>
          ) : (
            <AnimatePresence>
              {filteredCredentials.map((credential) => (
                <motion.div
                  key={credential.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-4 rounded-lg border border-white/10 hover:border-cyan-500/50 hover:bg-white/5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {getConnectorDisplayName(credential.connector_type).charAt(0)}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-medium text-white">
                            {credential.name}
                          </h3>
                          {getAuthBadge(credential.connector_type)}
                          {getStatusIcon(credential.test_status)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{getConnectorDisplayName(credential.connector_type)}</span>
                          <span className="text-gray-600">•</span>
                          <span>Last updated {formatDate(credential.updated_at)}</span>
                          {credential.last_tested_at && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span>Tested {formatDate(credential.last_tested_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(credential)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit credential"
                      >
                        <Edit className="w-4 h-4 text-gray-400 hover:text-white" />
                      </button>

                      <button
                        onClick={() => handleDelete(credential.id, credential.name)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete credential"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Add Credential Modal */}
      <AddCredentialModalV2
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        connectors={connectors}
        onSuccess={() => {
          fetchCredentials();
          setShowAddModal(false);
        }}
      />

      {/* Edit Credential Modal */}
      {editingCredential && (
        <EditCredentialModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingCredential(null);
          }}
          credential={editingCredential}
          connector={connectors.find(c => c.name === editingCredential.connector_type)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
};
