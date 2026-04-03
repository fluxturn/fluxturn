import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Database,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Shield,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Search,
  Filter,
  FileText,
  CheckCircle2,
  XCircle,
  Info,
  Server
} from 'lucide-react'
import { GlassCard, StatCard } from '../../components/ui/GlassCard'
import { ProjectHierarchy } from '../../components/projects/ProjectHierarchy'
import { cn } from '../../lib/utils'

// Mock data
const projectData = {
  id: '1',
  name: 'E-commerce Platform',
  organization: { id: '1', name: 'Acme Corporation' }
}

const breadcrumbs = [
  { id: '1', name: 'Acme Corporation', type: 'organization' as const, path: '/org/1' },
  { id: 'projects', name: 'Projects', type: 'project' as const, path: '/org/1/projects' },
  { id: '1', name: 'E-commerce Platform', type: 'project' as const, path: '/org/1/projects/1' },
  { id: 'environment', name: 'Environment', type: 'project' as const, path: '/org/1/projects/1/environment' }
]

const environments = ['development', 'staging', 'production'] as const
type Environment = typeof environments[number]

interface EnvironmentVariable {
  id: string
  key: string
  value: string
  isSecret: boolean
  environment: Environment[]
  description?: string
  lastUpdated: string
  updatedBy: string
  isRequired: boolean
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
  }
}

const mockEnvVars: EnvironmentVariable[] = [
  {
    id: '1',
    key: 'DATABASE_URL',
    value: 'postgresql://user:password@host:5432/dbname',
    isSecret: true,
    environment: ['development', 'staging', 'production'],
    description: 'Primary database connection string',
    lastUpdated: '2024-03-10T14:30:00Z',
    updatedBy: 'John Doe',
    isRequired: true,
    validation: { minLength: 10 }
  },
  {
    id: '2',
    key: 'STRIPE_SECRET_KEY',
    value: 'sk_test_...',
    isSecret: true,
    environment: ['development', 'staging'],
    description: 'Stripe payment processing secret key',
    lastUpdated: '2024-03-08T10:15:00Z',
    updatedBy: 'Jane Smith',
    isRequired: true,
    validation: { pattern: '^sk_(test|live)_' }
  },
  {
    id: '3',
    key: 'NODE_ENV',
    value: 'production',
    isSecret: false,
    environment: ['production'],
    description: 'Node.js environment mode',
    lastUpdated: '2024-03-07T16:22:00Z',
    updatedBy: 'Bob Johnson',
    isRequired: true
  },
  {
    id: '4',
    key: 'API_BASE_URL',
    value: 'https://api.acme.com',
    isSecret: false,
    environment: ['development', 'staging', 'production'],
    description: 'Base URL for API endpoints',
    lastUpdated: '2024-03-05T11:30:00Z',
    updatedBy: 'Alice Brown',
    isRequired: true,
    validation: { pattern: '^https?://' }
  },
  {
    id: '5',
    key: 'REDIS_URL',
    value: 'redis://localhost:6379',
    isSecret: false,
    environment: ['development', 'staging', 'production'],
    description: 'Redis cache connection string',
    lastUpdated: '2024-03-03T09:45:00Z',
    updatedBy: 'Charlie Wilson',
    isRequired: false
  }
]

export const ProjectEnvironment: React.FC = () => {
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>('development')
  const [envVars, setEnvVars] = useState<EnvironmentVariable[]>(mockEnvVars)
  const [showEnvValues, setShowEnvValues] = useState<Record<string, boolean>>({})
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'secrets' | 'public' | 'required'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [newEnvVar, setNewEnvVar] = useState({
    key: '',
    value: '',
    isSecret: false,
    description: '',
    isRequired: false,
    environments: [] as Environment[]
  })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  }

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

  const removeEnvVar = (id: string) => {
    setEnvVars(prev => prev.filter(env => env.id !== id))
  }

  const addEnvVar = () => {
    if (newEnvVar.key && newEnvVar.value) {
      const envVar: EnvironmentVariable = {
        id: Date.now().toString(),
        key: newEnvVar.key,
        value: newEnvVar.value,
        isSecret: newEnvVar.isSecret,
        environment: newEnvVar.environments,
        description: newEnvVar.description,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Current User',
        isRequired: newEnvVar.isRequired
      }
      setEnvVars(prev => [...prev, envVar])
      setNewEnvVar({
        key: '',
        value: '',
        isSecret: false,
        description: '',
        isRequired: false,
        environments: []
      })
      setShowAddModal(false)
    }
  }

  const getEnvironmentColor = (env: Environment) => {
    switch (env) {
      case 'production':
        return 'text-red-400 bg-red-400/20'
      case 'staging':
        return 'text-yellow-400 bg-yellow-400/20'
      case 'development':
        return 'text-green-400 bg-green-400/20'
      default:
        return 'text-gray-400 bg-gray-400/20'
    }
  }

  const validateVariable = (envVar: EnvironmentVariable) => {
    if (!envVar.validation) return { isValid: true, error: null }
    
    const { pattern, minLength, maxLength } = envVar.validation
    
    if (minLength && envVar.value.length < minLength) {
      return { isValid: false, error: `Minimum length: ${minLength}` }
    }
    
    if (maxLength && envVar.value.length > maxLength) {
      return { isValid: false, error: `Maximum length: ${maxLength}` }
    }
    
    if (pattern && !new RegExp(pattern).test(envVar.value)) {
      return { isValid: false, error: 'Invalid format' }
    }
    
    return { isValid: true, error: null }
  }

  const filteredEnvVars = envVars.filter(envVar => {
    const matchesSearch = envVar.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         envVar.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' ||
                         (filterType === 'secrets' && envVar.isSecret) ||
                         (filterType === 'public' && !envVar.isSecret) ||
                         (filterType === 'required' && envVar.isRequired)
    
    const matchesEnvironment = envVar.environment.includes(selectedEnvironment)
    
    return matchesSearch && matchesFilter && matchesEnvironment
  })

  const stats = {
    total: envVars.filter(v => v.environment.includes(selectedEnvironment)).length,
    secrets: envVars.filter(v => v.isSecret && v.environment.includes(selectedEnvironment)).length,
    required: envVars.filter(v => v.isRequired && v.environment.includes(selectedEnvironment)).length,
    invalid: envVars.filter(v => !validateVariable(v).isValid && v.environment.includes(selectedEnvironment)).length
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hierarchy Navigation */}
      <motion.div variants={itemVariants}>
        <ProjectHierarchy
          breadcrumbs={breadcrumbs}
          onNavigate={(item) => console.log('Navigate to:', item)}
          onProjectSwitch={(projectId) => console.log('Switch to project:', projectId)}
        />
      </motion.div>

      {/* Header */}
      <motion.div 
        className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0"
        variants={itemVariants}
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Environment Variables</h1>
            <p className="text-muted-foreground">{projectData.name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 glass hover:bg-white/10 rounded-xl transition-all flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button className="px-4 py-2 glass hover:bg-white/10 rounded-xl transition-all flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl font-medium flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Variable</span>
          </button>
        </div>
      </motion.div>

      {/* Environment Selector */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Environment</h3>
            <div className="flex items-center space-x-2">
              {environments.map((env) => (
                <button
                  key={env}
                  onClick={() => setSelectedEnvironment(env)}
                  className={cn(
                    "px-4 py-2 rounded-lg transition-all capitalize flex items-center space-x-2",
                    selectedEnvironment === env
                      ? "bg-cyan-400/20 text-cyan-400"
                      : "hover:bg-white/5 text-muted-foreground"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", getEnvironmentColor(env).split(' ')[1])}></span>
                  <span>{env}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-400 mb-1">Environment Configuration</p>
                <p className="text-blue-300/80">
                  Variables are automatically deployed to the selected environment. 
                  Changes take effect on the next deployment.
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Stats */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <StatCard
          title="Total Variables"
          value={stats.total.toString()}
          icon={<Database className="w-5 h-5" />}
          color="from-cyan-400 to-blue-500"
        />
        <StatCard
          title="Secrets"
          value={stats.secrets.toString()}
          icon={<Lock className="w-5 h-5" />}
          color="from-purple-400 to-pink-500"
        />
        <StatCard
          title="Required"
          value={stats.required.toString()}
          icon={<Shield className="w-5 h-5" />}
          color="from-green-400 to-emerald-500"
        />
        <StatCard
          title="Invalid"
          value={stats.invalid.toString()}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="from-orange-400 to-red-500"
        />
      </motion.div>

      {/* Variables List */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
            <h3 className="text-lg font-semibold">Variables</h3>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search variables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              >
                <option value="all">All Variables</option>
                <option value="secrets">Secrets Only</option>
                <option value="public">Public Only</option>
                <option value="required">Required Only</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredEnvVars.map((envVar) => {
              const validation = validateVariable(envVar)
              
              return (
                <div key={envVar.id} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-cyan-400" />
                        <code className="font-mono text-sm font-medium">{envVar.key}</code>
                        {envVar.isSecret && <Lock className="w-3 h-3 text-yellow-400" />}
                        {envVar.isRequired && <Shield className="w-3 h-3 text-green-400" />}
                        {!validation.isValid && <AlertTriangle className="w-3 h-3 text-red-400" />}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type={showEnvValues[envVar.id] ? "text" : "password"}
                            value={envVar.value}
                            disabled
                            className="bg-white/5 border border-white/10 rounded px-3 py-1 text-sm font-mono flex-1 max-w-md"
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

                        {envVar.description && (
                          <p className="text-sm text-muted-foreground">{envVar.description}</p>
                        )}

                        {!validation.isValid && (
                          <p className="text-sm text-red-400">{validation.error}</p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Updated by {envVar.updatedBy}</span>
                          <span>•</span>
                          <span>{new Date(envVar.lastUpdated).toLocaleString()}</span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {envVar.environment.map((env) => (
                            <span
                              key={env}
                              className={cn("px-2 py-1 rounded-full text-xs capitalize", getEnvironmentColor(env))}
                            >
                              {env}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeEnvVar(envVar.id)}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {filteredEnvVars.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No environment variables found</p>
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Add Variable Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl"
            >
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Add Environment Variable</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Variable Name</label>
                      <input
                        type="text"
                        placeholder="API_KEY"
                        value={newEnvVar.key}
                        onChange={(e) => setNewEnvVar(prev => ({ ...prev, key: e.target.value }))}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Value</label>
                      <input
                        type="text"
                        placeholder="your-secret-value"
                        value={newEnvVar.value}
                        onChange={(e) => setNewEnvVar(prev => ({ ...prev, value: e.target.value }))}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      placeholder="Describe what this variable is used for..."
                      value={newEnvVar.description}
                      onChange={(e) => setNewEnvVar(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Environments</label>
                    <div className="flex items-center space-x-3">
                      {environments.map((env) => (
                        <label key={env} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={newEnvVar.environments.includes(env)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewEnvVar(prev => ({ ...prev, environments: [...prev.environments, env] }))
                              } else {
                                setNewEnvVar(prev => ({ ...prev, environments: prev.environments.filter(e => e !== env) }))
                              }
                            }}
                            className="rounded border-white/10 bg-white/5"
                          />
                          <span className="capitalize">{env}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newEnvVar.isSecret}
                        onChange={(e) => setNewEnvVar(prev => ({ ...prev, isSecret: e.target.checked }))}
                        className="rounded border-white/10 bg-white/5"
                      />
                      <Lock className="w-4 h-4" />
                      <span>Secret variable</span>
                    </label>

                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newEnvVar.isRequired}
                        onChange={(e) => setNewEnvVar(prev => ({ ...prev, isRequired: e.target.checked }))}
                        className="rounded border-white/10 bg-white/5"
                      />
                      <Shield className="w-4 h-4" />
                      <span>Required</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 glass hover:bg-white/10 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addEnvVar}
                    disabled={!newEnvVar.key || !newEnvVar.value || newEnvVar.environments.length === 0}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Variable
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Notice */}
      <motion.div variants={itemVariants}>
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-400 mb-1">Security Best Practices</p>
              <ul className="text-yellow-300/80 space-y-1 text-xs">
                <li>• Never commit environment variables to version control</li>
                <li>• Use different values for each environment</li>
                <li>• Regularly rotate sensitive credentials</li>
                <li>• Mark sensitive data as secrets to prevent accidental exposure</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}