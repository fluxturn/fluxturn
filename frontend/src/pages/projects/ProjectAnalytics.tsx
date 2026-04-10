import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Clock,
  AlertTriangle,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Globe,
  Smartphone,
  Monitor,
  Zap,
  Activity,
  MapPin,
  MousePointer,
  Target,
  Share2,
  Settings
} from 'lucide-react'
import { GlassCard, StatCard, ChartCard } from '../../components/ui/GlassCard'
import { ProjectHierarchy } from '../../components/projects/ProjectHierarchy'
import { cn } from '../../lib/utils'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  { id: 'analytics', name: 'Analytics', type: 'project' as const, path: '/org/1/projects/1/analytics' }
]

const trafficData = [
  { name: 'Jan', visitors: 12400, pageViews: 34200, sessions: 18600, bounceRate: 32 },
  { name: 'Feb', visitors: 15800, pageViews: 42800, sessions: 23400, bounceRate: 28 },
  { name: 'Mar', visitors: 18200, pageViews: 51200, sessions: 28100, bounceRate: 24 },
  { name: 'Apr', visitors: 22100, pageViews: 58900, sessions: 32800, bounceRate: 22 },
  { name: 'May', visitors: 26700, pageViews: 67400, sessions: 38900, bounceRate: 26 },
  { name: 'Jun', visitors: 31200, pageViews: 78200, sessions: 45200, bounceRate: 29 },
  { name: 'Jul', visitors: 28900, pageViews: 72100, sessions: 41800, bounceRate: 31 }
]

const performanceData = [
  { name: 'Mon', avgLoadTime: 1.2, requests: 8400, errors: 12 },
  { name: 'Tue', avgLoadTime: 1.1, requests: 9200, errors: 8 },
  { name: 'Wed', avgLoadTime: 1.3, requests: 7800, errors: 15 },
  { name: 'Thu', avgLoadTime: 1.0, requests: 10100, errors: 6 },
  { name: 'Fri', avgLoadTime: 1.4, requests: 11300, errors: 18 },
  { name: 'Sat', avgLoadTime: 0.9, requests: 6200, errors: 4 },
  { name: 'Sun', avgLoadTime: 1.1, requests: 5900, errors: 7 }
]

const deviceData = [
  { name: 'Desktop', value: 45.2, color: '#00d4ff' },
  { name: 'Mobile', value: 38.7, color: '#00ffcc' },
  { name: 'Tablet', value: 16.1, color: '#ff6b6b' }
]

const browserData = [
  { name: 'Chrome', value: 52.3, color: '#00d4ff' },
  { name: 'Safari', value: 23.8, color: '#00ffcc' },
  { name: 'Firefox', value: 14.2, color: '#ff6b6b' },
  { name: 'Edge', value: 7.1, color: '#ffd93d' },
  { name: 'Other', value: 2.6, color: '#6bcf7f' }
]

const topPages = [
  { page: '/products', views: 15420, uniqueViews: 12340, avgTime: '2:34' },
  { page: '/checkout', views: 8930, uniqueViews: 7850, avgTime: '4:12' },
  { page: '/product/shoes', views: 6780, uniqueViews: 5920, avgTime: '1:45' },
  { page: '/cart', views: 5440, uniqueViews: 4880, avgTime: '1:23' },
  { page: '/search', views: 4320, uniqueViews: 3940, avgTime: '0:58' }
]

const errorData = [
  { type: '404 Not Found', count: 245, percentage: 42.1 },
  { type: '500 Server Error', count: 128, percentage: 22.0 },
  { type: '403 Forbidden', count: 89, percentage: 15.3 },
  { type: '401 Unauthorized', count: 67, percentage: 11.5 },
  { type: 'Connection Timeout', count: 53, percentage: 9.1 }
]

const customEvents = [
  { event: 'Product Purchase', count: 1240, revenue: '$54,320' },
  { event: 'Email Signup', count: 890, revenue: null },
  { event: 'Cart Addition', count: 3420, revenue: null },
  { event: 'Wishlist Add', count: 670, revenue: null },
  { event: 'Share Product', count: 340, revenue: null }
]

const geographicData = [
  { country: 'United States', visitors: 12400, percentage: 35.2 },
  { country: 'Canada', visitors: 6800, percentage: 19.3 },
  { country: 'United Kingdom', visitors: 4200, percentage: 11.9 },
  { country: 'Germany', visitors: 3100, percentage: 8.8 },
  { country: 'France', visitors: 2900, percentage: 8.2 },
  { country: 'Other', visitors: 5800, percentage: 16.6 }
]

export const ProjectAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedMetric, setSelectedMetric] = useState('visitors')

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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'traffic', label: 'Traffic', icon: TrendingUp },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'errors', label: 'Errors', icon: AlertTriangle },
    { id: 'events', label: 'Events', icon: Target },
    { id: 'geography', label: 'Geography', icon: MapPin }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ChartCard 
                title="Traffic Overview" 
                subtitle="Visitors and page views over time"
                actions={
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  >
                    <option value="visitors">Visitors</option>
                    <option value="pageViews">Page Views</option>
                    <option value="sessions">Sessions</option>
                  </select>
                }
              >
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trafficData}>
                    <defs>
                      <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
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
                      dataKey={selectedMetric} 
                      stroke="#00d4ff" 
                      fillOpacity={1} 
                      fill="url(#trafficGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Device Breakdown" subtitle="Traffic by device type">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name: string; percent?: number }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard hover={false}>
                <h4 className="font-semibold mb-4">Top Pages</h4>
                <div className="space-y-3">
                  {topPages.map((page, index) => (
                    <div key={page.page} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-cyan-400/20 text-cyan-400 text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium font-mono text-sm">{page.page}</p>
                          <p className="text-xs text-muted-foreground">{page.views.toLocaleString()} views</p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Avg time</p>
                        <p className="font-medium">{page.avgTime}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <ChartCard title="Browser Usage" subtitle="Traffic by browser">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={browserData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
                    <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.5)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="#00d4ff" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )

      case 'performance':
        return (
          <div className="space-y-6">
            <ChartCard 
              title="Performance Metrics" 
              subtitle="Average load time and error rate"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                  <YAxis yAxisId="left" stroke="rgba(255,255,255,0.5)" />
                  <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.5)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="avgLoadTime" stroke="#00d4ff" strokeWidth={3} name="Avg Load Time (s)" />
                  <Line yAxisId="right" type="monotone" dataKey="errors" stroke="#ff4444" strokeWidth={2} name="Errors" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )

      case 'errors':
        return (
          <div className="space-y-6">
            <GlassCard hover={false}>
              <h4 className="font-semibold mb-4">Error Breakdown</h4>
              <div className="space-y-3">
                {errorData.map((error, index) => (
                  <div key={error.type} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <div>
                        <p className="font-medium">{error.type}</p>
                        <p className="text-sm text-muted-foreground">{error.count} occurrences</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{error.percentage}%</p>
                      <div className="w-20 bg-white/10 rounded-full h-2 mt-1">
                        <div 
                          className="h-2 rounded-full bg-red-400"
                          style={{ width: `${error.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )

      case 'events':
        return (
          <div className="space-y-6">
            <GlassCard hover={false}>
              <h4 className="font-semibold mb-4">Custom Events</h4>
              <div className="space-y-3">
                {customEvents.map((event, index) => (
                  <div key={event.event} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-3">
                      <Target className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-medium">{event.event}</p>
                        <p className="text-sm text-muted-foreground">{event.count} times</p>
                      </div>
                    </div>
                    {event.revenue && (
                      <div className="text-right">
                        <p className="font-medium text-green-400">{event.revenue}</p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )

      case 'geography':
        return (
          <div className="space-y-6">
            <GlassCard hover={false}>
              <h4 className="font-semibold mb-4">Traffic by Country</h4>
              <div className="space-y-3">
                {geographicData.map((country, index) => (
                  <div key={country.country} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-medium">{country.country}</p>
                        <p className="text-sm text-muted-foreground">{country.visitors.toLocaleString()} visitors</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{country.percentage}%</p>
                      <div className="w-20 bg-white/10 rounded-full h-2 mt-1">
                        <div 
                          className="h-2 rounded-full bg-cyan-400"
                          style={{ width: `${country.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )

      default:
        return null
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

      {/* Header */}
      <motion.div 
        className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0"
        variants={itemVariants}
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Analytics</h1>
            <p className="text-muted-foreground">{projectData.name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
            <option value="1y">Last year</option>
          </select>
          
          <button className="p-3 glass hover:bg-white/10 rounded-xl transition-all">
            <RefreshCw className="w-5 h-5" />
          </button>
          
          <button className="px-4 py-2 glass hover:bg-white/10 rounded-xl transition-all flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          <button className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl font-medium flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Configure</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <StatCard
          title="Total Visitors"
          value="127.8K"
          change={18.2}
          icon={<Users className="w-5 h-5" />}
          color="from-cyan-400 to-blue-500"
        />
        <StatCard
          title="Page Views"
          value="342.1K"
          change={12.4}
          icon={<Eye className="w-5 h-5" />}
          color="from-green-400 to-emerald-500"
        />
        <StatCard
          title="Avg Session"
          value="3m 24s"
          change={-5.2}
          icon={<Clock className="w-5 h-5" />}
          color="from-purple-400 to-pink-500"
        />
        <StatCard
          title="Bounce Rate"
          value="28.7%"
          change={-8.1}
          icon={<TrendingDown className="w-5 h-5" />}
          color="from-orange-400 to-red-500"
        />
      </motion.div>

      {/* Analytics Tabs */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex items-center space-x-1 mb-6 border-b border-white/10 pb-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all",
                    activeTab === tab.id
                      ? "bg-cyan-400/20 text-cyan-400"
                      : "hover:bg-white/5 text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {renderTabContent()}
        </GlassCard>
      </motion.div>

      {/* Real-time Activity */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-400" />
              <span>Real-time Activity</span>
            </h3>
            <div className="flex items-center space-x-2 text-sm text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>24 active users</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Current Visitors</span>
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">24</p>
              <p className="text-xs text-green-400">+3 from last hour</p>
            </div>
            
            <div className="p-4 rounded-lg bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Pages/Session</span>
                <Eye className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">2.8</p>
              <p className="text-xs text-red-400">-0.2 from average</p>
            </div>
            
            <div className="p-4 rounded-lg bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg Duration</span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold">4m 12s</p>
              <p className="text-xs text-green-400">+15s from average</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}