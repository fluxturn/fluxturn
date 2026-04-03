import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Rocket,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
  Terminal,
  Settings,
  GitBranch,
  Calendar,
  User,
  Download,
  ExternalLink,
  MoreVertical,
  Zap,
  Database,
  Eye,
  Filter,
  Search,
  ChevronDown
} from 'lucide-react'
import { GlassCard, StatCard, ChartCard } from '../../components/ui/GlassCard'
import { ProjectHierarchy } from '../../components/projects/ProjectHierarchy'
import { cn } from '../../lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

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
  { id: 'deployments', name: 'Deployments', type: 'project' as const, path: '/org/1/projects/1/deployments' }
]

const environments = ['development', 'staging', 'production'] as const
type Environment = typeof environments[number]

const deploymentHistory = [
  {
    id: '1',
    version: 'v2.1.3',
    status: 'success',
    environment: 'production' as Environment,
    timestamp: '2024-03-10T14:30:00Z',
    duration: '3m 45s',
    author: 'John Doe',
    commit: 'fix: resolve payment gateway timeout issues',
    branch: 'main',
    buildTime: '2m 15s',
    deployTime: '1m 30s'
  },
  {
    id: '2',
    version: 'v2.1.2',
    status: 'success',
    environment: 'staging',
    timestamp: '2024-03-10T12:15:00Z',
    duration: '2m 18s',
    author: 'Jane Smith',
    commit: 'feat: add new product filtering options',
    branch: 'feature/product-filters',
    buildTime: '1m 48s',
    deployTime: '30s'
  },
  {
    id: '3',
    version: 'v2.1.1',
    status: 'failed',
    environment: 'production',
    timestamp: '2024-03-09T16:22:00Z',
    duration: '1m 15s',
    author: 'Bob Johnson',
    commit: 'refactor: optimize database queries',
    branch: 'main',
    buildTime: '45s',
    deployTime: 'failed',
    error: 'Database migration failed: connection timeout'
  },
  {
    id: '4',
    version: 'v2.1.0',
    status: 'success',
    environment: 'production',
    timestamp: '2024-03-08T11:30:00Z',
    duration: '4m 12s',
    author: 'Alice Brown',
    commit: 'feat: implement new checkout flow',
    branch: 'main',
    buildTime: '3m 12s',
    deployTime: '1m 0s'
  }
]

const environmentConfigs = {
  development: {
    autoDeployBranch: 'develop',
    autoDeployEnabled: true,
    buildSettings: {
      nodeVersion: '18.x',
      buildCommand: 'npm run build:dev',
      outputDir: 'dist',
      envFile: '.env.development'
    }
  },
  staging: {
    autoDeployBranch: 'main',
    autoDeployEnabled: true,
    buildSettings: {
      nodeVersion: '18.x',
      buildCommand: 'npm run build:staging',
      outputDir: 'dist',
      envFile: '.env.staging'
    }
  },
  production: {
    autoDeployBranch: 'main',
    autoDeployEnabled: false,
    buildSettings: {
      nodeVersion: '18.x',
      buildCommand: 'npm run build',
      outputDir: 'dist',
      envFile: '.env.production'
    }
  }
}

const deploymentStats = [
  { name: 'Mon', successful: 12, failed: 1, duration: 180 },
  { name: 'Tue', successful: 8, failed: 0, duration: 165 },
  { name: 'Wed', successful: 15, failed: 2, duration: 195 },
  { name: 'Thu', successful: 10, failed: 1, duration: 155 },
  { name: 'Fri', successful: 18, failed: 0, duration: 142 },
  { name: 'Sat', successful: 5, failed: 0, duration: 138 },
  { name: 'Sun', successful: 3, failed: 0, duration: 145 }
]

export const ProjectDeployments: React.FC = () => {
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>('production')
  const [showLogs, setShowLogs] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [timeRange, setTimeRange] = useState('7d')

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />
      case 'failed':
        return <XCircle className="w-4 h-4" />
      case 'running':
        return <RefreshCw className="w-4 h-4 animate-spin" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400 bg-green-400/20'
      case 'failed':
        return 'text-red-400 bg-red-400/20'
      case 'running':
        return 'text-blue-400 bg-blue-400/20'
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/20'
      default:
        return 'text-gray-400 bg-gray-400/20'
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

  const filteredDeployments = deploymentHistory.filter(deployment => {
    const matchesSearch = deployment.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deployment.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deployment.commit.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || deployment.status === statusFilter
    const matchesEnvironment = deployment.environment === selectedEnvironment
    
    return matchesSearch && matchesStatus && matchesEnvironment
  })

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
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Deployments</h1>
            <p className="text-muted-foreground">{projectData.name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 glass hover:bg-white/10 rounded-xl transition-all flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl font-medium flex items-center space-x-2">
            <Rocket className="w-5 h-5" />
            <span>Deploy Now</span>
          </button>
        </div>
      </motion.div>

      {/* Environment Selector */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Environments</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Auto Deploy</span>
                <div className={cn(
                  "w-4 h-4 rounded-full",
                  environmentConfigs[selectedEnvironment].autoDeployEnabled ? "bg-green-400" : "bg-gray-400"
                )}></div>
              </div>
              <p className="font-medium">
                {environmentConfigs[selectedEnvironment].autoDeployEnabled ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-xs text-muted-foreground">
                Branch: {environmentConfigs[selectedEnvironment].autoDeployBranch}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Node Version</span>
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="font-medium">{environmentConfigs[selectedEnvironment].buildSettings.nodeVersion}</p>
              <p className="text-xs text-muted-foreground">
                Output: {environmentConfigs[selectedEnvironment].buildSettings.outputDir}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Build Command</span>
                <Terminal className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="font-medium font-mono text-sm">
                {environmentConfigs[selectedEnvironment].buildSettings.buildCommand}
              </p>
              <p className="text-xs text-muted-foreground">
                Env: {environmentConfigs[selectedEnvironment].buildSettings.envFile}
              </p>
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
          title="Total Deployments"
          value="147"
          change={8.2}
          icon={<Rocket className="w-5 h-5" />}
          color="from-cyan-400 to-blue-500"
        />
        <StatCard
          title="Success Rate"
          value="94.2%"
          change={2.1}
          icon={<CheckCircle className="w-5 h-5" />}
          color="from-green-400 to-emerald-500"
        />
        <StatCard
          title="Avg Duration"
          value="2m 34s"
          change={-12.3}
          icon={<Clock className="w-5 h-5" />}
          color="from-purple-400 to-pink-500"
        />
        <StatCard
          title="Failed This Week"
          value="3"
          change={-40.0}
          icon={<AlertCircle className="w-5 h-5" />}
          color="from-orange-400 to-red-500"
        />
      </motion.div>

      {/* Charts */}
      <motion.div 
        className="grid grid-cols-1 xl:grid-cols-2 gap-6"
        variants={itemVariants}
      >
        <ChartCard 
          title="Deployment Activity" 
          subtitle="Successful vs failed deployments"
          actions={
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              <option value="7d">7D</option>
              <option value="30d">30D</option>
              <option value="90d">90D</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deploymentStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="successful" fill="#00d4ff" name="Successful" />
              <Bar dataKey="failed" fill="#ff4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard 
          title="Average Duration" 
          subtitle="Deployment duration trend (seconds)"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={deploymentStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="duration" 
                stroke="#00ffcc" 
                strokeWidth={3}
                dot={{ fill: '#00ffcc', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      {/* Deployment History */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
            <h3 className="text-lg font-semibold">Deployment History</h3>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search deployments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredDeployments.map((deployment) => (
              <div key={deployment.id} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <span className={cn(
                      "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium mt-1",
                      getStatusColor(deployment.status)
                    )}>
                      {getStatusIcon(deployment.status)}
                      <span className="capitalize">{deployment.status}</span>
                    </span>

                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium">{deployment.version}</h4>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs",
                          getEnvironmentColor(deployment.environment as Environment)
                        )}>
                          {deployment.environment}
                        </span>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <GitBranch className="w-3 h-3" />
                          <span>{deployment.branch}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">{deployment.commit}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{deployment.author}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(deployment.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{deployment.duration}</span>
                        </div>
                      </div>

                      {deployment.error && (
                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                          Error: {deployment.error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowLogs(showLogs === deployment.id ? null : deployment.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all"
                      title="View logs"
                    >
                      <Terminal className="w-4 h-4" />
                    </button>
                    
                    {deployment.status === 'success' && (
                      <button
                        className="p-2 hover:bg-white/10 rounded-lg transition-all"
                        title="Rollback to this version"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Deployment Logs */}
                {showLogs === deployment.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 bg-black/50 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium">Deployment Logs</h5>
                      <button className="text-xs text-cyan-400 hover:text-cyan-300">
                        Download Full Log
                      </button>
                    </div>
                    <div className="font-mono text-xs text-green-400 space-y-1 max-h-48 overflow-y-auto">
                      <div>✓ Build started at {deployment.timestamp}</div>
                      <div>✓ Installing dependencies...</div>
                      <div>✓ Running build command: {environmentConfigs[deployment.environment as Environment].buildSettings.buildCommand}</div>
                      <div>✓ Build completed in {deployment.buildTime}</div>
                      {deployment.status === 'success' ? (
                        <>
                          <div>✓ Deploying to {deployment.environment}...</div>
                          <div>✓ Deployment completed successfully in {deployment.deployTime}</div>
                        </>
                      ) : (
                        <div className="text-red-400">✗ Deployment failed: {deployment.error}</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
            
            {filteredDeployments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Rocket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No deployments found</p>
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}