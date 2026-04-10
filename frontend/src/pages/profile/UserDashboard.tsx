import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Activity, 
  FolderOpen, 
  Globe, 
  Star, 
  Clock, 
  TrendingUp, 
  Bell, 
  Plus, 
  ExternalLink, 
  GitBranch, 
  Code, 
  Zap,
  Calendar,
  MapPin,
  Heart,
  MessageSquare,
  Share2,
  Eye,
  Download,
  Filter,
  Search,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react'
import { GlassCard, StatCard, ChartCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { cn } from '../../lib/utils'

interface Project {
  id: string
  name: string
  description: string
  framework: 'React' | 'Flutter' | 'NestJS' | 'Next.js'
  status: 'active' | 'deployed' | 'draft' | 'archived'
  lastUpdated: Date
  deployments: number
  stars: number
  views: number
  isPublic: boolean
  color: string
}

interface ActivityItem {
  id: string
  type: 'deployment' | 'star' | 'fork' | 'comment' | 'update' | 'create'
  title: string
  description: string
  timestamp: Date
  projectId?: string
  projectName?: string
  icon: React.ReactNode
  color: string
}

interface NotificationItem {
  id: string
  type: 'success' | 'info' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
}

export const UserDashboard: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'starred'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d')

  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'E-commerce Dashboard',
      description: 'Modern e-commerce admin dashboard with analytics',
      framework: 'React',
      status: 'deployed',
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
      deployments: 12,
      stars: 24,
      views: 342,
      isPublic: true,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: '2',
      name: 'Task Manager App',
      description: 'Collaborative task management with real-time sync',
      framework: 'Flutter',
      status: 'active',
      lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000),
      deployments: 8,
      stars: 18,
      views: 156,
      isPublic: true,
      color: 'from-purple-500 to-indigo-500'
    },
    {
      id: '3',
      name: 'API Gateway Service',
      description: 'Microservices API gateway with authentication',
      framework: 'NestJS',
      status: 'active',
      lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      deployments: 15,
      stars: 32,
      views: 89,
      isPublic: false,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: '4',
      name: 'Blog Platform',
      description: 'Modern blog platform with markdown support',
      framework: 'Next.js',
      status: 'draft',
      lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      deployments: 3,
      stars: 7,
      views: 45,
      isPublic: false,
      color: 'from-orange-500 to-red-500'
    }
  ]

  const mockActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'deployment',
      title: 'Deployed to production',
      description: 'E-commerce Dashboard v2.1.0',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      projectId: '1',
      projectName: 'E-commerce Dashboard',
      icon: <Globe className="w-4 h-4" />,
      color: 'text-green-400'
    },
    {
      id: '2',
      type: 'star',
      title: 'Project starred',
      description: 'Task Manager App received 3 new stars',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      projectId: '2',
      projectName: 'Task Manager App',
      icon: <Star className="w-4 h-4" />,
      color: 'text-yellow-400'
    },
    {
      id: '3',
      type: 'update',
      title: 'Code updated',
      description: 'Updated authentication service',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      projectId: '3',
      projectName: 'API Gateway Service',
      icon: <Code className="w-4 h-4" />,
      color: 'text-cyan-400'
    },
    {
      id: '4',
      type: 'create',
      title: 'New project created',
      description: 'Blog Platform project initialized',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      projectId: '4',
      projectName: 'Blog Platform',
      icon: <Plus className="w-4 h-4" />,
      color: 'text-purple-400'
    }
  ]

  const mockNotifications: NotificationItem[] = [
    {
      id: '1',
      type: 'success',
      title: 'Deployment Successful',
      message: 'E-commerce Dashboard deployed successfully to production',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      isRead: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'High Memory Usage',
      message: 'Task Manager App is using 85% of allocated memory',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      isRead: false
    },
    {
      id: '3',
      type: 'info',
      title: 'New Feature Available',
      message: 'Real-time collaboration features now available',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isRead: true
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'active':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      case 'draft':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'archived':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return <Bell className="w-4 h-4 text-cyan-400" />
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} minutes ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else {
      return `${Math.floor(diffInHours / 24)} days ago`
    }
  }

  const filteredProjects = mockProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false

    switch (activeFilter) {
      case 'recent':
        return Date.now() - project.lastUpdated.getTime() < 7 * 24 * 60 * 60 * 1000
      case 'starred':
        return project.stars > 15
      default:
        return true
    }
  })

  const totalStats = {
    projects: mockProjects.length,
    deployments: mockProjects.reduce((sum, p) => sum + p.deployments, 0),
    stars: mockProjects.reduce((sum, p) => sum + p.stars, 0),
    views: mockProjects.reduce((sum, p) => sum + p.views, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Welcome back, Alex!
            </h1>
            <p className="text-gray-400 mt-1">Here's what's happening with your projects today</p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <StatCard
            title="Total Projects"
            value={totalStats.projects}
            change={12}
            icon={<FolderOpen className="w-6 h-6" />}
            color="from-cyan-500 to-teal-500"
          />
          <StatCard
            title="Deployments"
            value={totalStats.deployments}
            change={25}
            icon={<Globe className="w-6 h-6" />}
            color="from-green-500 to-emerald-500"
          />
          <StatCard
            title="Total Stars"
            value={totalStats.stars}
            change={18}
            icon={<Star className="w-6 h-6" />}
            color="from-yellow-500 to-orange-500"
          />
          <StatCard
            title="Profile Views"
            value={totalStats.views}
            change={32}
            icon={<Eye className="w-6 h-6" />}
            color="from-purple-500 to-indigo-500"
          />
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Projects Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Projects Header */}
            <GlassCard hover={false}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <h2 className="text-xl font-semibold text-white">Recent Projects</h2>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 focus-visible:border-cyan-400"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    {['all', 'recent', 'starred'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter as typeof activeFilter)}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize',
                          activeFilter === filter
                            ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        )}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Projects List */}
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  className="cursor-pointer"
                >
                  <GlassCard>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                          project.color
                        )}>
                          <Code className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                            <Badge variant="secondary" className={getStatusColor(project.status)}>
                              {project.status}
                            </Badge>
                            {project.isPublic && (
                              <Badge variant="outline" className="text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                Public
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{project.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatTime(project.lastUpdated)}
                            </span>
                            <span className="flex items-center">
                              <Globe className="w-3 h-3 mr-1" />
                              {project.deployments} deployments
                            </span>
                            <span className="flex items-center">
                              <Star className="w-3 h-3 mr-1" />
                              {project.stars}
                            </span>
                            <span className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {project.views}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {project.framework}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <GlassCard hover={false}>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
                <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                  <Download className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                  <GitBranch className="w-4 h-4 mr-2" />
                  Clone Repo
                </Button>
                <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                  <Zap className="w-4 h-4 mr-2" />
                  Templates
                </Button>
              </div>
            </GlassCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Activity Feed */}
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Activity Feed</h3>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                {mockActivity.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                      <span className={item.color}>{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-gray-400 truncate">{item.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatTime(item.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button variant="ghost" className="w-full mt-4 text-cyan-400 hover:text-cyan-300">
                View All Activity
              </Button>
            </GlassCard>

            {/* Notifications */}
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  {mockNotifications.filter(n => !n.isRead).length} new
                </Badge>
              </div>
              
              <div className="space-y-3">
                {mockNotifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                      notification.isRead
                        ? "bg-white/5 border-white/10"
                        : "bg-cyan-500/10 border-cyan-500/20"
                    )}
                  >
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{notification.title}</p>
                      <p className="text-xs text-gray-400">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatTime(notification.timestamp)}</p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                ))}
              </div>
              
              <Button variant="ghost" className="w-full mt-4 text-cyan-400 hover:text-cyan-300">
                View All Notifications
              </Button>
            </GlassCard>

            {/* Performance Chart */}
            <ChartCard title="Performance Overview" subtitle="Last 7 days">
              <div className="h-32 flex items-end justify-between space-x-1">
                {[65, 42, 78, 56, 89, 67, 92].map((height, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-t from-cyan-500 to-teal-500 rounded-t flex-1"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
            </ChartCard>

            {/* Profile Summary */}
            <GlassCard hover={false}>
              <h3 className="text-lg font-semibold text-white mb-4">Profile Summary</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Member since</span>
                  <span className="text-white font-medium">Jan 2024</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Public projects</span>
                  <span className="text-white font-medium">{mockProjects.filter(p => p.isPublic).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total contributions</span>
                  <span className="text-white font-medium">248</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Reputation</span>
                  <span className="text-white font-medium">1,432 pts</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </motion.div>
      </div>
    </div>
  )
}