import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity,
  Database,
  Globe,
  Zap,
  GitBranch,
  Play,
  Pause,
  Settings,
  ExternalLink,
  RefreshCw,
  Download,
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Code
} from 'lucide-react'
import { StatCard, ChartCard, GlassCard } from '../../components/ui/GlassCard'
import { ProjectHierarchy } from '../../components/projects/ProjectHierarchy'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
  description: 'Modern e-commerce platform with React and Node.js',
  status: 'active' as const,
  type: 'web' as const,
  organization: {
    id: '1',
    name: 'Acme Corporation'
  },
  createdAt: '2024-01-15',
  lastDeployment: '2024-03-10T14:30:00Z',
  repository: 'https://github.com/acme/ecommerce',
  liveUrl: 'https://ecommerce.acme.com',
  techStack: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'Redis']
}

const breadcrumbs = [
  { id: '1', name: 'Acme Corporation', type: 'organization' as const, path: '/org/1' },
  { id: 'projects', name: 'Projects', type: 'project' as const, path: '/org/1/projects' },
  { id: '1', name: 'E-commerce Platform', type: 'project' as const, path: '/org/1/projects/1' }
]

const apps = [
  {
    id: '1',
    name: 'Frontend App',
    type: 'web',
    status: 'deployed',
    url: 'https://app.ecommerce.acme.com',
    lastDeploy: '2 hours ago',
    version: 'v1.2.3',
    health: 'healthy'
  },
  {
    id: '2',
    name: 'Admin Dashboard',
    type: 'web',
    status: 'deployed',
    url: 'https://admin.ecommerce.acme.com',
    lastDeploy: '1 day ago',
    version: 'v1.1.8',
    health: 'healthy'
  },
  {
    id: '3',
    name: 'API Gateway',
    type: 'api',
    status: 'deployed',
    url: 'https://api.ecommerce.acme.com',
    lastDeploy: '3 hours ago',
    version: 'v2.0.1',
    health: 'warning'
  }
]

const edgeFunctions = [
  { id: '1', name: 'Image Optimizer', status: 'active', executions: 15420, avgDuration: '125ms' },
  { id: '2', name: 'Product Search', status: 'active', executions: 8930, avgDuration: '89ms' },
  { id: '3', name: 'User Analytics', status: 'paused', executions: 0, avgDuration: '0ms' }
]

const databases = [
  { 
    id: '1', 
    name: 'Primary Database', 
    type: 'PostgreSQL', 
    status: 'healthy', 
    connections: 45, 
    maxConnections: 100,
    size: '2.3GB'
  },
  { 
    id: '2', 
    name: 'Cache Store', 
    type: 'Redis', 
    status: 'healthy', 
    connections: 12, 
    maxConnections: 50,
    size: '156MB'
  }
]

const deploymentHistory = [
  { id: '1', version: 'v1.2.3', status: 'success', timestamp: '2024-03-10T14:30:00Z', duration: '2m 15s', author: 'John Doe' },
  { id: '2', version: 'v1.2.2', status: 'success', timestamp: '2024-03-09T10:15:00Z', duration: '1m 48s', author: 'Jane Smith' },
  { id: '3', version: 'v1.2.1', status: 'failed', timestamp: '2024-03-08T16:22:00Z', duration: '45s', author: 'Bob Johnson' },
  { id: '4', version: 'v1.2.0', status: 'success', timestamp: '2024-03-07T11:30:00Z', duration: '3m 12s', author: 'Alice Brown' },
  { id: '5', version: 'v1.1.9', status: 'success', timestamp: '2024-03-05T09:45:00Z', duration: '2m 8s', author: 'Charlie Wilson' }
]

const activityData = [
  { name: 'Mon', requests: 4200, errors: 12, latency: 145 },
  { name: 'Tue', requests: 5100, errors: 8, latency: 138 },
  { name: 'Wed', requests: 4800, errors: 15, latency: 152 },
  { name: 'Thu', requests: 6200, errors: 6, latency: 128 },
  { name: 'Fri', requests: 7800, errors: 4, latency: 135 },
  { name: 'Sat', requests: 5900, errors: 9, latency: 142 },
  { name: 'Sun', requests: 4500, errors: 11, latency: 149 }
]

const teamActivity = [
  { id: 1, user: 'John Doe', action: 'Deployed v1.2.3 to production', time: '2 hours ago', type: 'deploy' },
  { id: 2, user: 'Jane Smith', action: 'Updated environment variables', time: '4 hours ago', type: 'config' },
  { id: 3, user: 'Bob Johnson', action: 'Added new API endpoint /products/search', time: '6 hours ago', type: 'code' },
  { id: 4, user: 'Alice Brown', action: 'Scaled edge functions capacity', time: '1 day ago', type: 'scale' }
]

export const ProjectDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d')

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'deployed':
      case 'active':
      case 'success':
        return 'text-green-400 bg-green-400/20'
      case 'warning':
        return 'text-yellow-400 bg-yellow-400/20'
      case 'error':
      case 'failed':
        return 'text-red-400 bg-red-400/20'
      case 'paused':
        return 'text-gray-400 bg-gray-400/20'
      default:
        return 'text-gray-400 bg-gray-400/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'deployed':
      case 'active':
      case 'success':
        return <CheckCircle className="w-4 h-4" />
      case 'warning':
        return <AlertCircle className="w-4 h-4" />
      case 'error':
      case 'failed':
        return <XCircle className="w-4 h-4" />
      case 'paused':
        return <Pause className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deploy':
        return <Play className="w-4 h-4" />
      case 'config':
        return <Settings className="w-4 h-4" />
      case 'code':
        return <Code className="w-4 h-4" />
      case 'scale':
        return <TrendingUp className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'deploy':
        return 'bg-green-500/20 text-green-400'
      case 'config':
        return 'bg-blue-500/20 text-blue-400'
      case 'code':
        return 'bg-purple-500/20 text-purple-400'
      case 'scale':
        return 'bg-cyan-500/20 text-cyan-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
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

      {/* Project Header */}
      <motion.div 
        className="flex flex-col lg:flex-row lg:items-start justify-between space-y-4 lg:space-y-0"
        variants={itemVariants}
      >
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">{projectData.name}</h1>
            <p className="text-muted-foreground mt-1">{projectData.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Created {new Date(projectData.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Last deploy {new Date(projectData.lastDeployment).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span className="capitalize">{projectData.status}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="p-3 glass hover:bg-white/10 rounded-xl transition-all">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="p-3 glass hover:bg-white/10 rounded-xl transition-all">
            <Download className="w-5 h-5" />
          </button>
          <button className="p-3 glass hover:bg-white/10 rounded-xl transition-all">
            <BarChart3 className="w-5 h-5" />
          </button>
          <a
            href={projectData.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl font-medium flex items-center space-x-2"
          >
            <ExternalLink className="w-5 h-5" />
            <span>View Live</span>
          </a>
        </div>
      </motion.div>

      {/* Real-time Metrics */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <StatCard
          title="Uptime"
          value="99.9%"
          change={0.1}
          icon={<Activity className="w-5 h-5" />}
          color="from-green-400 to-emerald-500"
        />
        <StatCard
          title="Response Time"
          value="142ms"
          change={-5.2}
          icon={<TrendingUp className="w-5 h-5" />}
          color="from-blue-400 to-cyan-500"
        />
        <StatCard
          title="Daily Requests"
          value="24.8K"
          change={12.4}
          icon={<BarChart3 className="w-5 h-5" />}
          color="from-purple-400 to-pink-500"
        />
        <StatCard
          title="Error Rate"
          value="0.02%"
          change={-15.6}
          icon={<AlertCircle className="w-5 h-5" />}
          color="from-orange-400 to-red-500"
        />
      </motion.div>

      {/* Apps List */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Applications</h3>
            <button className="text-sm text-cyan-400 hover:text-cyan-300">View all</button>
          </div>
          <div className="space-y-4">
            {apps.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                    {app.type === 'web' ? <Globe className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-medium">{app.name}</h4>
                    <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                      <span>Last deploy: {app.lastDeploy}</span>
                      <span>•</span>
                      <span>Version: {app.version}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.health)}`}>
                    {getStatusIcon(app.health)}
                    <span className="capitalize">{app.health}</span>
                  </span>
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Charts Row */}
      <motion.div 
        className="grid grid-cols-1 xl:grid-cols-2 gap-6"
        variants={itemVariants}
      >
        <ChartCard 
          title="Performance Metrics" 
          subtitle="Requests, errors, and latency over time"
          actions={
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              <option value="24h">24H</option>
              <option value="7d">7D</option>
              <option value="30d">30D</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityData}>
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
              <Line type="monotone" dataKey="requests" stroke="#00d4ff" strokeWidth={3} />
              <Line type="monotone" dataKey="errors" stroke="#ff4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard 
          title="Response Time Trend" 
          subtitle="Average response time (ms)"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ffcc" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00ffcc" stopOpacity={0}/>
                </linearGradient>
              </defs>
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
              <Area 
                type="monotone" 
                dataKey="latency" 
                stroke="#00ffcc" 
                fillOpacity={1} 
                fill="url(#latencyGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      {/* Bottom Section */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        variants={itemVariants}
      >
        {/* Edge Functions */}
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold">Edge Functions</h3>
            </div>
            <button className="text-sm text-cyan-400 hover:text-cyan-300">Manage</button>
          </div>
          <div className="space-y-3">
            {edgeFunctions.map((func) => (
              <div key={func.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all">
                <div>
                  <p className="font-medium">{func.name}</p>
                  <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                    <span>{func.executions.toLocaleString()} calls</span>
                    <span>•</span>
                    <span>{func.avgDuration} avg</span>
                  </div>
                </div>
                <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(func.status)}`}>
                  {getStatusIcon(func.status)}
                  <span className="capitalize">{func.status}</span>
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Database Connections */}
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold">Databases</h3>
            </div>
            <button className="text-sm text-cyan-400 hover:text-cyan-300">Manage</button>
          </div>
          <div className="space-y-4">
            {databases.map((db) => (
              <div key={db.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{db.name}</p>
                    <p className="text-sm text-muted-foreground">{db.type} • {db.size}</p>
                  </div>
                  <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(db.status)}`}>
                    {getStatusIcon(db.status)}
                    <span className="capitalize">{db.status}</span>
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Connections</span>
                    <span>{db.connections}/{db.maxConnections}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      style={{ width: `${(db.connections / db.maxConnections) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Team Activity */}
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <button className="text-sm text-cyan-400 hover:text-cyan-300">View all</button>
          </div>
          <div className="space-y-3">
            {teamActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.user}</p>
                  <p className="text-sm text-muted-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Deployment History */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <GitBranch className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold">Recent Deployments</h3>
            </div>
            <button className="text-sm text-cyan-400 hover:text-cyan-300">View all</button>
          </div>
          <div className="space-y-3">
            {deploymentHistory.slice(0, 5).map((deployment) => (
              <div key={deployment.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all">
                <div className="flex items-center space-x-4">
                  <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deployment.status)}`}>
                    {getStatusIcon(deployment.status)}
                  </span>
                  <div>
                    <p className="font-medium">{deployment.version}</p>
                    <p className="text-sm text-muted-foreground">by {deployment.author}</p>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{new Date(deployment.timestamp).toLocaleDateString()}</p>
                  <p>{deployment.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}