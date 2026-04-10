import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Globe,
  Key,
  Webhook,
  AlertTriangle,
  Info,
  Database,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { GlassCard } from '../../components/ui/GlassCard'
import { cn } from '../../lib/utils'
import { api } from '../../lib/api'

export const ProjectSettings: React.FC = () => {
  const { projectId, organizationId } = useParams()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Project data from API
  const [project, setProject] = useState<Record<string, unknown> | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectUrl, setProjectUrl] = useState('')
  const [envVars, setEnvVars] = useState([
    { id: '1', key: 'DATABASE_URL', value: 'postgresql://...', isSecret: true },
    { id: '2', key: 'API_KEY', value: 'sk_test_...', isSecret: true },
    { id: '3', key: 'NODE_ENV', value: 'production', isSecret: false },
    { id: '4', key: 'PORT', value: '3000', isSecret: false }
  ])
  const [domains, setDomains] = useState([
    { id: '1', domain: 'ecommerce.acme.com', status: 'active', ssl: true, primary: true },
    { id: '2', domain: 'shop.acme.com', status: 'pending', ssl: false, primary: false }
  ])
  const [webhooks] = useState([
    { id: '1', url: 'https://api.acme.com/webhooks/deploy', events: ['deployment.success', 'deployment.failed'], active: true },
    { id: '2', url: 'https://slack.com/api/incoming/webhook', events: ['deployment.success'], active: true }
  ])
  const [apiKeys] = useState([
    { id: '1', name: 'Production API Key', key: 'pk_live_...', created: '2024-01-15', lastUsed: '2 hours ago', permissions: ['read', 'write'] },
    { id: '2', name: 'Development Key', key: 'pk_dev_...', created: '2024-02-01', lastUsed: '1 day ago', permissions: ['read'] }
  ])
  
  const [showEnvValues, setShowEnvValues] = useState<Record<string, boolean>>({})
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({})
  const [newEnvVar, setNewEnvVar] = useState({ key: '', value: '', isSecret: false })
  const [newDomain, setNewDomain] = useState('')
  const [newWebhook, setNewWebhook] = useState({ url: '', events: [] as string[] })

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return

      try {
        setLoading(true)
        const response = await api.getProject(projectId)
        const projectData = response.project

        setProject(projectData)
        setProjectName(projectData.name || '')
        setProjectDescription(projectData.description || '')
        setProjectUrl(projectData.projectUrl || '')
      } catch (error: unknown) {
        console.error('Failed to load project:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [projectId])

  const handleSaveChanges = async () => {
    if (!projectId) return

    try {
      setSaving(true)
      await api.updateProject(projectId, {
        name: projectName,
        description: projectDescription,
        projectUrl: projectUrl || undefined
      })

      toast.success('Project settings updated successfully')

      // Refresh project data
      const response = await api.getProject(projectId)
      setProject(response.project)
    } catch (error: unknown) {
      console.error('Failed to update project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!projectId) return

    try {
      setDeleting(true)
      await api.deleteProject(projectId)

      toast.success('Project deleted successfully')

      // Navigate back to org projects page
      navigate(`/org/${organizationId}/projects`)
    } catch (error: unknown) {
      console.error('Failed to delete project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete project')
      setDeleting(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
  ]

  const webhookEvents = [
    'deployment.started',
    'deployment.success', 
    'deployment.failed',
    'build.started',
    'build.success',
    'build.failed'
  ]

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => ({ ...prev, [id]: true }))
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [id]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const toggleEnvVisibility = (id: string) => {
    setShowEnvValues(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const addEnvVar = () => {
    if (newEnvVar.key && newEnvVar.value) {
      setEnvVars(prev => [...prev, {
        id: Date.now().toString(),
        ...newEnvVar
      }])
      setNewEnvVar({ key: '', value: '', isSecret: false })
    }
  }

  const removeEnvVar = (id: string) => {
    setEnvVars(prev => prev.filter(env => env.id !== id))
  }

  const addDomain = () => {
    if (newDomain) {
      setDomains(prev => [...prev, {
        id: Date.now().toString(),
        domain: newDomain,
        status: 'pending',
        ssl: false,
        primary: false
      }])
      setNewDomain('')
    }
  }

  const removeDomain = (id: string) => {
    setDomains(prev => prev.filter(domain => domain.id !== id))
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
            </div>

            {project && (
              <div>
                <label className="block text-sm font-medium mb-2">Project ID</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={project.id}
                    disabled
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg opacity-60"
                  />
                  <button
                    onClick={() => copyToClipboard(project.id, 'project-id')}
                    className="p-3 glass hover:bg-white/10 rounded-lg transition-all"
                  >
                    {copiedItems['project-id'] ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This is your project's unique identifier and cannot be changed.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Project URL</label>
              <input
                type="url"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                placeholder="http://localhost:5173"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
              <p className="text-xs text-muted-foreground mt-2">
                URL where this project is hosted or running locally
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveChanges}
                disabled={saving || loading}
                className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        )

      case 'environment':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Environment Variables</h3>
                <p className="text-sm text-muted-foreground">Manage your project's environment variables</p>
              </div>
            </div>

            {/* Add New Environment Variable */}
            <GlassCard>
              <h4 className="font-medium mb-4">Add New Variable</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Variable name"
                  value={newEnvVar.key}
                  onChange={(e) => setNewEnvVar(prev => ({ ...prev, key: e.target.value }))}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
                <input
                  type="text"
                  placeholder="Variable value"
                  value={newEnvVar.value}
                  onChange={(e) => setNewEnvVar(prev => ({ ...prev, value: e.target.value }))}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newEnvVar.isSecret}
                      onChange={(e) => setNewEnvVar(prev => ({ ...prev, isSecret: e.target.checked }))}
                      className="rounded border-white/10 bg-white/5"
                    />
                    <span>Secret</span>
                  </label>
                  <button
                    onClick={addEnvVar}
                    className="px-4 py-2 bg-cyan-400/20 text-cyan-400 rounded-lg hover:bg-cyan-400/30 transition-all flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </GlassCard>

            {/* Environment Variables List */}
            <div className="space-y-3">
              {envVars.map((envVar) => (
                <GlassCard key={envVar.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-cyan-400" />
                        <code className="font-mono text-sm">{envVar.key}</code>
                        {envVar.isSecret && (
                          <Lock className="w-3 h-3 text-yellow-400" />
                        )}
                      </div>
                      <div className="flex items-center space-x-2 flex-1">
                        <input
                          type={showEnvValues[envVar.id] ? "text" : "password"}
                          value={envVar.value}
                          disabled
                          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm font-mono flex-1"
                        />
                        <button
                          onClick={() => toggleEnvVisibility(envVar.id)}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          {showEnvValues[envVar.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(envVar.value, `env-${envVar.id}`)}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          {copiedItems[`env-${envVar.id}`] ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeEnvVar(envVar.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )

      case 'domains':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Custom Domains</h3>
              <p className="text-sm text-muted-foreground">Configure custom domains and SSL certificates</p>
            </div>

            {/* Add New Domain */}
            <GlassCard>
              <h4 className="font-medium mb-4">Add Custom Domain</h4>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  placeholder="yourdomain.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
                <button
                  onClick={addDomain}
                  className="px-4 py-2 bg-cyan-400/20 text-cyan-400 rounded-lg hover:bg-cyan-400/30 transition-all flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Domain</span>
                </button>
              </div>
            </GlassCard>

            {/* Domains List */}
            <div className="space-y-3">
              {domains.map((domain) => (
                <GlassCard key={domain.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Globe className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{domain.domain}</span>
                          {domain.primary && (
                            <span className="px-2 py-1 bg-cyan-400/20 text-cyan-400 rounded-full text-xs">Primary</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                          <span className={cn(
                            "flex items-center space-x-1",
                            domain.status === 'active' ? 'text-green-400' : 
                            domain.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                          )}>
                            <span className="w-2 h-2 rounded-full bg-current"></span>
                            <span className="capitalize">{domain.status}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            {domain.ssl ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            <span>{domain.ssl ? 'SSL Enabled' : 'SSL Pending'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeDomain(domain.id)}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-400 mb-1">Domain Configuration</p>
                  <p className="text-blue-300/80">
                    To connect your custom domain, add a CNAME record pointing to <code>your-project.fluxturn.app</code>. 
                    SSL certificates are automatically provisioned once the domain is verified.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'webhooks':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Webhooks</h3>
              <p className="text-sm text-muted-foreground">Configure webhooks to receive notifications about your project</p>
            </div>

            {/* Add New Webhook */}
            <GlassCard>
              <h4 className="font-medium mb-4">Add Webhook</h4>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="https://your-endpoint.com/webhook"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
                <div>
                  <p className="text-sm font-medium mb-2">Events</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {webhookEvents.map((event) => (
                      <label key={event} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newWebhook.events.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWebhook(prev => ({ ...prev, events: [...prev.events, event] }))
                            } else {
                              setNewWebhook(prev => ({ ...prev, events: prev.events.filter(e => e !== event) }))
                            }
                          }}
                          className="rounded border-white/10 bg-white/5"
                        />
                        <span>{event}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button className="px-4 py-2 bg-cyan-400/20 text-cyan-400 rounded-lg hover:bg-cyan-400/30 transition-all flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Webhook</span>
                </button>
              </div>
            </GlassCard>

            {/* Webhooks List */}
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <GlassCard key={webhook.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Webhook className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-medium">{webhook.url}</p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            webhook.active ? "bg-green-400" : "bg-gray-400"
                          )}></span>
                          <span>{webhook.active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                        <Settings className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-1 bg-white/10 rounded-full text-xs"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )

      case 'api-keys':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">API Keys</h3>
              <p className="text-sm text-muted-foreground">Manage API keys for programmatic access to your project</p>
            </div>

            <button className="px-4 py-2 bg-cyan-400/20 text-cyan-400 rounded-lg hover:bg-cyan-400/30 transition-all flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Generate New API Key</span>
            </button>

            {/* API Keys List */}
            <div className="space-y-3">
              {apiKeys.map((apiKey) => (
                <GlassCard key={apiKey.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Key className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-medium">{apiKey.name}</p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <code className="font-mono">{apiKey.key}</code>
                          <button
                            onClick={() => copyToClipboard(apiKey.key, `api-${apiKey.id}`)}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            {copiedItems[`api-${apiKey.id}`] ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-1">
                          <span>Created: {new Date(apiKey.created).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Last used: {apiKey.lastUsed}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex flex-wrap gap-1">
                        {apiKey.permissions.map((permission) => (
                          <span
                            key={permission}
                            className="px-2 py-1 bg-white/10 rounded-full text-xs capitalize"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                      <button className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-400 mb-1">Security Notice</p>
                  <p className="text-yellow-300/80">
                    Keep your API keys secure and never share them publicly. If you suspect a key has been compromised, 
                    revoke it immediately and generate a new one.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'danger':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">This action is irreversible. Please proceed with caution.</p>
            </div>

            <GlassCard className="border-red-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-red-400">Delete Project</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this project and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete Project'}
                </button>
              </div>
            </GlassCard>

            {showDeleteConfirm && (
              <GlassCard className="border-red-500/20 bg-red-500/5">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-400 mb-1">Are you absolutely sure?</p>
                      <p className="text-sm text-red-300/80">
                        This will permanently delete <strong>{projectName}</strong> and all associated data.
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteProject}
                      disabled={deleting}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete Project'}
                    </button>
                  </div>
                </div>
              </GlassCard>
            )}

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-400 mb-1">Important</p>
                  <p className="text-red-300/80">
                    Before deleting this project, make sure you have backed up any important data.
                    Once deleted, all apps, databases, and project history will be permanently lost.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project settings...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="flex items-center space-x-4"
        variants={itemVariants}
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gradient">Project Settings</h1>
          <p className="text-muted-foreground">{project.name}</p>
        </div>
      </motion.div>

      {/* Settings Interface */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        {/* Settings Navigation */}
        <GlassCard hover={false} className="lg:col-span-1">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left",
                    activeTab === tab.id 
                      ? "bg-cyan-400/20 text-cyan-400" 
                      : "hover:bg-white/5 text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </GlassCard>

        {/* Settings Content */}
        <GlassCard hover={false} className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}