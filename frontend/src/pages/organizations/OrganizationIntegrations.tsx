import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Puzzle,
  Github,
  GitBranch,
  MessageSquare,
  Calendar,
  Database,
  Cloud,
  Webhook,
  Key,
  Settings,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Zap,
  Filter,
  Search,
  Download,
  Code,
  Globe,
} from 'lucide-react'
import { GlassCard, StatCard } from '../../components/ui/GlassCard'
import { cn } from '../../lib/utils'

interface Integration {
  id: string
  name: string
  description: string
  category: 'development' | 'communication' | 'productivity' | 'monitoring' | 'storage' | 'other'
  icon: React.ReactNode
  status: 'connected' | 'available' | 'error'
  connectedAt?: string
  lastSync?: string
  permissions?: string[]
  settings?: Record<string, unknown>
  webhookUrl?: string
  apiCalls?: number
  monthlyLimit?: number
}

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  status: 'active' | 'inactive' | 'error'
  createdAt: string
  lastTriggered?: string
  totalCalls: number
  secret: string
}

interface ApiKey {
  id: string
  name: string
  key: string
  permissions: string[]
  createdAt: string
  lastUsed?: string
  status: 'active' | 'inactive' | 'expired'
  callCount: number
  monthlyLimit: number
}

interface ActivityLog {
  id: string
  action: string
  integration: string
  timestamp: string
  status: 'success' | 'failed' | 'warning'
  details?: string
}

const availableIntegrations: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect your GitHub repositories for seamless code management',
    category: 'development',
    icon: <Github className="w-6 h-6" />,
    status: 'connected',
    connectedAt: '2023-11-15',
    lastSync: '2 minutes ago',
    permissions: ['repo', 'user', 'webhooks'],
    apiCalls: 1250,
    monthlyLimit: 5000
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Integrate with GitLab for repository and CI/CD management',
    category: 'development',
    icon: <GitBranch className="w-6 h-6" />,
    status: 'available'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications and updates to your Slack channels',
    category: 'communication',
    icon: <MessageSquare className="w-6 h-6" />,
    status: 'connected',
    connectedAt: '2023-11-10',
    lastSync: '5 minutes ago',
    permissions: ['channels:read', 'chat:write', 'incoming-webhook'],
    apiCalls: 850,
    monthlyLimit: 2000
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Connect with Discord for team communication and notifications',
    category: 'communication',
    icon: <MessageSquare className="w-6 h-6" />,
    status: 'error',
    connectedAt: '2023-11-08',
    lastSync: 'Failed 1 hour ago'
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync project deadlines and milestones with Google Calendar',
    category: 'productivity',
    icon: <Calendar className="w-6 h-6" />,
    status: 'available'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync your project data with Notion workspace',
    category: 'productivity',
    icon: <Database className="w-6 h-6" />,
    status: 'available'
  },
  {
    id: 'aws-s3',
    name: 'AWS S3',
    description: 'Store and backup your project files in Amazon S3',
    category: 'storage',
    icon: <Cloud className="w-6 h-6" />,
    status: 'connected',
    connectedAt: '2023-10-20',
    lastSync: '30 minutes ago',
    apiCalls: 2100,
    monthlyLimit: 10000
  },
  {
    id: 'datadog',
    name: 'Datadog',
    description: 'Monitor application performance and infrastructure',
    category: 'monitoring',
    icon: <Activity className="w-6 h-6" />,
    status: 'available'
  }
]

const mockWebhooks: Webhook[] = [
  {
    id: '1',
    name: 'Project Status Updates',
    url: 'https://api.fluxturn.com/webhooks/project-status',
    events: ['project.created', 'project.updated', 'project.completed'],
    status: 'active',
    createdAt: '2023-11-01',
    lastTriggered: '2 hours ago',
    totalCalls: 156,
    secret: 'whsec_4eC39HqLyjWDarjtT1zdp7dc'
  },
  {
    id: '2',
    name: 'Team Notifications',
    url: 'https://example.com/webhooks/team-notifications',
    events: ['member.invited', 'member.joined', 'member.removed'],
    status: 'active',
    createdAt: '2023-10-15',
    lastTriggered: '1 day ago',
    totalCalls: 89,
    secret: 'whsec_1234567890abcdef'
  },
  {
    id: '3',
    name: 'Billing Updates',
    url: 'https://api.example.com/billing-webhook',
    events: ['billing.payment_succeeded', 'billing.payment_failed'],
    status: 'error',
    createdAt: '2023-09-20',
    lastTriggered: '3 days ago',
    totalCalls: 23,
    secret: 'whsec_abcdef1234567890'
  }
]

const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: 'Production API',
    key: 'cg_live_4eC39HqLyjWDarjtT1zdp7dc',
    permissions: ['read:projects', 'write:projects', 'read:users', 'manage:webhooks'],
    createdAt: '2023-10-01',
    lastUsed: '2 hours ago',
    status: 'active',
    callCount: 15670,
    monthlyLimit: 100000
  },
  {
    id: '2',
    name: 'Development API',
    key: 'cg_test_BQokikJOvBiI2HlWgH4olfQ2',
    permissions: ['read:projects', 'write:projects', 'read:users'],
    createdAt: '2023-11-15',
    lastUsed: '30 minutes ago',
    status: 'active',
    callCount: 2340,
    monthlyLimit: 10000
  },
  {
    id: '3',
    name: 'Legacy API',
    key: 'cg_live_26BBN2JGnV7VU8Ktzo7R5M1L',
    permissions: ['read:projects'],
    createdAt: '2023-08-15',
    lastUsed: '2 weeks ago',
    status: 'inactive',
    callCount: 5890,
    monthlyLimit: 50000
  }
]

const mockActivityLog: ActivityLog[] = [
  {
    id: '1',
    action: 'GitHub integration sync completed',
    integration: 'GitHub',
    timestamp: '2023-12-03T10:30:00Z',
    status: 'success',
    details: 'Synchronized 15 repositories and 234 commits'
  },
  {
    id: '2',
    action: 'Slack notification sent',
    integration: 'Slack',
    timestamp: '2023-12-03T09:45:00Z',
    status: 'success',
    details: 'Project update notification sent to #general channel'
  },
  {
    id: '3',
    action: 'Discord connection failed',
    integration: 'Discord',
    timestamp: '2023-12-03T08:15:00Z',
    status: 'failed',
    details: 'Invalid webhook URL or expired token'
  },
  {
    id: '4',
    action: 'AWS S3 backup completed',
    integration: 'AWS S3',
    timestamp: '2023-12-03T06:00:00Z',
    status: 'success',
    details: 'Backed up 2.3GB of project data'
  },
  {
    id: '5',
    action: 'API key usage limit warning',
    integration: 'Production API',
    timestamp: '2023-12-02T16:20:00Z',
    status: 'warning',
    details: 'API key has used 80% of monthly limit'
  }
]

export const OrganizationIntegrations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'integrations' | 'webhooks' | 'api-keys' | 'logs'>('integrations')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({})
  const [showWebhookSecret, setShowWebhookSecret] = useState<{ [key: string]: boolean }>({})
  const [, setShowAddWebhookModal] = useState(false)
  const [, setShowAddApiKeyModal] = useState(false)

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

  const filteredIntegrations = availableIntegrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || integration.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || integration.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const stats = {
    totalIntegrations: availableIntegrations.length,
    connectedIntegrations: availableIntegrations.filter(i => i.status === 'connected').length,
    activeWebhooks: mockWebhooks.filter(w => w.status === 'active').length,
    apiKeys: mockApiKeys.filter(k => k.status === 'active').length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
      case 'success': return 'bg-green-500/20 text-green-400'
      case 'available':
      case 'inactive': return 'bg-gray-500/20 text-gray-400'
      case 'error':
      case 'failed': return 'bg-red-500/20 text-red-400'
      case 'warning': return 'bg-yellow-500/20 text-yellow-400'
      case 'expired': return 'bg-orange-500/20 text-orange-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
      case 'success': return <CheckCircle className="w-4 h-4" />
      case 'available': return <Plus className="w-4 h-4" />
      case 'error':
      case 'failed': return <XCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'inactive': return <XCircle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'development': return <Code className="w-4 h-4" />
      case 'communication': return <MessageSquare className="w-4 h-4" />
      case 'productivity': return <Zap className="w-4 h-4" />
      case 'monitoring': return <Activity className="w-4 h-4" />
      case 'storage': return <Database className="w-4 h-4" />
      default: return <Puzzle className="w-4 h-4" />
    }
  }

  const toggleApiKeyVisibility = (keyId: string) => {
    setShowApiKey(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const toggleWebhookSecretVisibility = (webhookId: string) => {
    setShowWebhookSecret(prev => ({ ...prev, [webhookId]: !prev[webhookId] }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Show toast notification
  }

  const renderIntegrationsTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <GlassCard hover={false}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <option value="all">All Categories</option>
            <option value="development">Development</option>
            <option value="communication">Communication</option>
            <option value="productivity">Productivity</option>
            <option value="monitoring">Monitoring</option>
            <option value="storage">Storage</option>
            <option value="other">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <option value="all">All Status</option>
            <option value="connected">Connected</option>
            <option value="available">Available</option>
            <option value="error">Error</option>
          </select>
        </div>
      </GlassCard>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => (
          <motion.div key={integration.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard hover={true} className="h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white">
                    {integration.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{integration.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center space-x-1">
                        {getCategoryIcon(integration.category)}
                        <span className="capitalize">{integration.category}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize",
                  getStatusColor(integration.status)
                )}>
                  {getStatusIcon(integration.status)}
                  <span className="ml-1">{integration.status}</span>
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {integration.description}
              </p>

              {integration.status === 'connected' && (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Connected {new Date(integration.connectedAt!).toLocaleDateString()}</span>
                    <span>Synced {integration.lastSync}</span>
                  </div>
                  
                  {integration.apiCalls && integration.monthlyLimit && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>API Usage</span>
                        <span>{integration.apiCalls.toLocaleString()} / {integration.monthlyLimit.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1">
                        <div
                          className={cn(
                            "h-1 rounded-full transition-all",
                            (integration.apiCalls / integration.monthlyLimit) > 0.8 ? "bg-red-400" :
                            (integration.apiCalls / integration.monthlyLimit) > 0.6 ? "bg-yellow-400" :
                            "bg-gradient-to-r from-cyan-400 to-blue-500"
                          )}
                          style={{ width: `${Math.min((integration.apiCalls / integration.monthlyLimit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-cyan-400 transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  <span>Learn more</span>
                </button>
                <div className="flex items-center space-x-2">
                  {integration.status === 'connected' && (
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                  <button className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    integration.status === 'connected'
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : integration.status === 'available'
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-400/25"
                        : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                  )}>
                    {integration.status === 'connected' ? 'Disconnect' :
                     integration.status === 'available' ? 'Connect' :
                     'Reconnect'}
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="text-center py-12">
          <Puzzle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No integrations found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria or filters
          </p>
        </div>
      )}
    </div>
  )

  const renderWebhooksTab = () => (
    <div className="space-y-6">
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Webhook Endpoints</h3>
            <p className="text-sm text-muted-foreground">Manage webhook URLs for real-time notifications</p>
          </div>
          <button 
            onClick={() => setShowAddWebhookModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Webhook</span>
          </button>
        </div>

        <div className="space-y-4">
          {mockWebhooks.map((webhook) => (
            <div key={webhook.id} className="p-4 glass rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold">{webhook.name}</h4>
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize",
                      getStatusColor(webhook.status)
                    )}>
                      {getStatusIcon(webhook.status)}
                      <span className="ml-1">{webhook.status}</span>
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4" />
                      <span className="font-mono bg-white/5 px-2 py-1 rounded truncate">
                        {webhook.url}
                      </span>
                      <button
                        onClick={() => copyToClipboard(webhook.url)}
                        className="p-1 hover:bg-white/10 rounded transition-all"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4" />
                      <span className="font-mono bg-white/5 px-2 py-1 rounded">
                        {showWebhookSecret[webhook.id] ? webhook.secret : '••••••••••••••••••••••••'}
                      </span>
                      <button
                        onClick={() => toggleWebhookSecretVisibility(webhook.id)}
                        className="p-1 hover:bg-white/10 rounded transition-all"
                      >
                        {showWebhookSecret[webhook.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(webhook.secret)}
                        className="p-1 hover:bg-white/10 rounded transition-all"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-all text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Events:</span>
                  <div className="mt-1 space-y-1">
                    {webhook.events.map((event, index) => (
                      <span key={index} className="inline-block px-2 py-1 bg-white/10 rounded text-xs mr-1 mb-1">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Statistics:</span>
                  <div className="mt-1">
                    <p>Total calls: {webhook.totalCalls}</p>
                    <p>Last triggered: {webhook.lastTriggered || 'Never'}</p>
                  </div>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <div className="mt-1">
                    <p>{new Date(webhook.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )

  const renderApiKeysTab = () => (
    <div className="space-y-6">
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">API Keys</h3>
            <p className="text-sm text-muted-foreground">Manage API keys for programmatic access</p>
          </div>
          <button 
            onClick={() => setShowAddApiKeyModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create API Key</span>
          </button>
        </div>

        <div className="space-y-4">
          {mockApiKeys.map((apiKey) => (
            <div key={apiKey.id} className="p-4 glass rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold">{apiKey.name}</h4>
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize",
                      getStatusColor(apiKey.status)
                    )}>
                      {getStatusIcon(apiKey.status)}
                      <span className="ml-1">{apiKey.status}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    <Key className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono bg-white/5 px-2 py-1 rounded">
                      {showApiKey[apiKey.id] ? apiKey.key : apiKey.key.substring(0, 12) + '••••••••••••••••••••'}
                    </span>
                    <button
                      onClick={() => toggleApiKeyVisibility(apiKey.id)}
                      className="p-1 hover:bg-white/10 rounded transition-all"
                    >
                      {showApiKey[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(apiKey.key)}
                      className="p-1 hover:bg-white/10 rounded transition-all"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Permissions:</span>
                      <div className="mt-1 space-y-1">
                        {apiKey.permissions.map((permission, index) => (
                          <span key={index} className="inline-block px-2 py-1 bg-white/10 rounded text-xs mr-1 mb-1">
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>API Calls This Month</span>
                        <span>{apiKey.callCount.toLocaleString()} / {apiKey.monthlyLimit.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1">
                        <div
                          className={cn(
                            "h-1 rounded-full transition-all",
                            (apiKey.callCount / apiKey.monthlyLimit) > 0.8 ? "bg-red-400" :
                            (apiKey.callCount / apiKey.monthlyLimit) > 0.6 ? "bg-yellow-400" :
                            "bg-gradient-to-r from-cyan-400 to-blue-500"
                          )}
                          style={{ width: `${Math.min((apiKey.callCount / apiKey.monthlyLimit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-all text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground border-t border-white/10 pt-4">
                <div>
                  <span>Created:</span>
                  <p className="font-medium">{new Date(apiKey.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <span>Last used:</span>
                  <p className="font-medium">{apiKey.lastUsed || 'Never'}</p>
                </div>
                <div>
                  <span>Usage:</span>
                  <p className="font-medium">{((apiKey.callCount / apiKey.monthlyLimit) * 100).toFixed(1)}% of limit</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* API Documentation */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">API Documentation</h3>
          <button className="px-4 py-2 glass hover:bg-white/10 rounded-lg transition-all flex items-center space-x-2">
            <ExternalLink className="w-4 h-4" />
            <span>View Docs</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="font-medium mb-2">Base URL</h4>
            <code className="text-cyan-400">https://api.fluxturn.com/v1</code>
          </div>
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="font-medium mb-2">Authentication</h4>
            <code className="text-cyan-400">Bearer {'{API_KEY}'}</code>
          </div>
          <div className="p-4 bg-white/5 rounded-lg">
            <h4 className="font-medium mb-2">Rate Limits</h4>
            <p>1000 requests/hour</p>
          </div>
        </div>
      </GlassCard>
    </div>
  )

  const renderLogsTab = () => (
    <GlassCard hover={false}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Activity Logs</h3>
          <p className="text-sm text-muted-foreground">Integration events and API access logs</p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 glass hover:bg-white/10 rounded-lg transition-all flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
          <button className="px-4 py-2 glass hover:bg-white/10 rounded-lg transition-all flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {mockActivityLog.map((log) => (
          <div key={log.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-white/5 transition-all">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              getStatusColor(log.status)
            )}>
              {getStatusIcon(log.status)}
            </div>
            <div className="flex-1">
              <p className="font-medium">{log.action}</p>
              <p className="text-sm text-muted-foreground">{log.integration}</p>
              {log.details && (
                <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(log.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'integrations': return renderIntegrationsTab()
      case 'webhooks': return renderWebhooksTab()
      case 'api-keys': return renderApiKeysTab()
      case 'logs': return renderLogsTab()
      default: return renderIntegrationsTab()
    }
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center space-x-4 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Puzzle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Integrations</h1>
            <p className="text-muted-foreground">Connect with your favorite tools and services</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <StatCard
          title="Available Integrations"
          value={stats.totalIntegrations}
          icon={<Puzzle className="w-5 h-5" />}
          color="from-cyan-400 to-blue-500"
        />
        <StatCard
          title="Connected"
          value={stats.connectedIntegrations}
          change={25.0}
          icon={<CheckCircle className="w-5 h-5" />}
          color="from-green-400 to-teal-500"
        />
        <StatCard
          title="Active Webhooks"
          value={stats.activeWebhooks}
          icon={<Webhook className="w-5 h-5" />}
          color="from-purple-400 to-pink-500"
        />
        <StatCard
          title="API Keys"
          value={stats.apiKeys}
          icon={<Key className="w-5 h-5" />}
          color="from-orange-400 to-red-500"
        />
      </motion.div>

      {/* Tabs Navigation */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false} className="p-2">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'integrations', label: 'Integrations', icon: <Puzzle className="w-4 h-4" /> },
              { id: 'webhooks', label: 'Webhooks', icon: <Webhook className="w-4 h-4" /> },
              { id: 'api-keys', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
              { id: 'logs', label: 'Activity Logs', icon: <Activity className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  activeTab === tab.id 
                    ? "bg-gradient-to-r from-cyan-400/20 to-blue-500/20 text-cyan-400 border border-cyan-400/30" 
                    : "hover:bg-white/10"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={itemVariants}>
        {renderCurrentTab()}
      </motion.div>
    </motion.div>
  )
}