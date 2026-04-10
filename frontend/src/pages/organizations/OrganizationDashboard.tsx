import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  FolderOpen,
  HardDrive,
  Activity,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Settings,
  FileText,
  Calendar,
  Plus,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react'
import { GlassCard } from '../../components/ui/GlassCard'
import { useOrganization } from '../../contexts/OrganizationContext'
import { api } from '../../lib/api'
import { useNavigate, useParams } from 'react-router-dom'
import { organizationApi } from '../../lib/api/organization'

interface OrganizationStats {
  overview: {
    memberCount: number;
    projectCount: number;
    workflowCount: number;
    storageBytes: number;
    storageMB: string;
    storageGB: string;
    emailsSent30d: number;
    activeUsers30d: number;
  };
  workflows: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: string;
    avgDurationMs: number;
  };
  storage: {
    breakdown: Array<{
      contentType: string;
      fileCount: number;
      totalSize: number;
      totalSizeMB: string;
    }>;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceId: string;
    userName: string;
    userEmail: string;
    timestamp: string;
  }>;
  teamMembers: Array<{
    id: string;
    role: string;
    email: string;
    displayName: string;
    profileImage: string | null;
    joinedAt: string;
    actionsLast7d: number;
    lastActive: string | null;
    status: 'online' | 'away' | 'offline';
  }>;
}

export const OrganizationDashboard: React.FC = () => {
  const params = useParams<{ organizationId: string }>()
  const { currentOrganization, loading, error, refreshOrganization, setOrganizationId, organizationId: contextOrgId } = useOrganization()
  const organizationId = params.organizationId

  const navigate = useNavigate()
  const [stats, setStats] = useState<OrganizationStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [attemptedRedirect, setAttemptedRedirect] = useState(false)
  const [projects, setProjects] = useState<Array<{ id: string; name: string; description?: string; [key: string]: unknown }>>([])

  // Set organization ID from URL params - this triggers the fetch in context
  useEffect(() => {
    if (organizationId && organizationId !== contextOrgId) {
      setOrganizationId(organizationId)
    }
  }, [organizationId, contextOrgId, setOrganizationId])

  // Fetch organization statistics
  const fetchStats = async () => {
    if (!organizationId || !currentOrganization) return

    setLoadingStats(true)
    try {
      // console.log('📊 Fetching organization data for:', organizationId)

      // Fetch projects and members in parallel
      const [projectsResponse, membersData] = await Promise.all([
        api.getProjectsByOrganization(organizationId).catch(err => {
          console.error('Failed to fetch projects:', err)
          return { data: [] }
        }),
        organizationApi.getMembers(organizationId).catch(err => {
          console.error('Failed to fetch members:', err)
          return []
        })
      ])

      const projects = ((projectsResponse as Record<string, unknown>).data || []) as Array<{ id: string; name: string; description?: string; [key: string]: unknown }>
      const members = Array.isArray(membersData) ? membersData : []

      // console.log('✅ Loaded projects:', projects.length, projects)
      // console.log('✅ Loaded members:', members.length, members)

      // Store projects in state
      setProjects(projects)

      // Build stats object from fetched data
      const statsData: OrganizationStats = {
        overview: {
          memberCount: members.length,
          projectCount: projects.length,
          workflowCount: 0,
          storageBytes: 0,
          storageMB: '0',
          storageGB: '0',
          emailsSent30d: 0,
          activeUsers30d: members.filter((m: { status?: string }) => m.status === 'online' || m.status === 'away').length
        },
        workflows: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          successRate: '0',
          avgDurationMs: 0
        },
        storage: {
          breakdown: []
        },
        recentActivity: [],
        teamMembers: members.map((member: { userId?: string; id?: string; role?: string; user?: { email?: string; firstName?: string; lastName?: string; username?: string }; email?: string; joinedAt?: string }) => ({
          id: member.userId || member.id,
          role: member.role,
          email: member.user?.email || member.email,
          displayName: member.user?.firstName
            ? `${member.user.firstName} ${member.user.lastName || ''}`.trim()
            : member.user?.username || member.user?.email || member.email,
          profileImage: null,
          joinedAt: member.joinedAt,
          actionsLast7d: 0,
          lastActive: null,
          status: 'offline' as const
        }))
      }

      // console.log('📊 Built stats:', statsData)
      setStats(statsData)
    } catch (err) {
      console.error('❌ Failed to fetch organization data:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization, organizationId])

  // Auto-redirect to user's first organization if current one isn't found (only once)
  useEffect(() => {
    if (loading || attemptedRedirect || currentOrganization) return

    // Only attempt redirect once when we have an error
    if (error || !currentOrganization) {
      setAttemptedRedirect(true)
      const currentOrgId = organizationId // Capture current value

      api.getUserOrganizations().then(response => {
        // Response is { data: Organization[], total: number }
        const orgs = ((response as Record<string, unknown>)?.data || []) as Array<{ id: string; [key: string]: unknown }>
        if (orgs.length > 0) {
          // Only redirect if it's a different org than the current URL
          if (orgs[0].id !== currentOrgId) {
            navigate(`/org/${orgs[0].id}`, { replace: true })
          }
        }
      }).catch(err => {
        console.error('Failed to fetch user organizations:', err)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, currentOrganization, navigate, attemptedRedirect])

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    )
  }

  // Handle retry - reset attemptedRedirect and refresh
  const handleRetry = () => {
    setAttemptedRedirect(false)
    refreshOrganization()
  }

  // Show error state
  if (error || !currentOrganization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Organization not found'}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-primary rounded-lg hover:bg-primary/80 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-400'
      case 'away': return 'bg-yellow-400'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create':
      case 'created': return <FileText className="w-4 h-4" />
      case 'update':
      case 'updated': return <Settings className="w-4 h-4" />
      case 'delete':
      case 'deleted': return <XCircle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'create':
      case 'created': return 'bg-green-500/20 text-green-400'
      case 'update':
      case 'updated': return 'bg-cyan-500/20 text-cyan-400'
      case 'delete':
      case 'deleted': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
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
        <GlassCard hover={false}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-white">
                  {currentOrganization.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-white truncate">{currentOrganization.name}</h1>
                  <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-400/20 text-green-400 flex-shrink-0">
                    <CheckCircle className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mb-2">
                  {currentOrganization.description || 'No description provided'}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Since {new Date(currentOrganization.createdAt).getFullYear()}</span>
                  </div>
                  {stats && (
                    <>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{stats.overview.memberCount} {stats.overview.memberCount === 1 ? 'member' : 'members'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>{stats.overview.projectCount} {stats.overview.projectCount === 1 ? 'project' : 'projects'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => fetchStats()}
                className="p-2.5 hover:bg-white/10 rounded-lg transition-all border border-white/10 hover:border-cyan-400/50"
                title="Refresh"
                disabled={loadingStats}
              >
                <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => navigate(`/org/${organizationId}/projects/new`)}
                className="px-5 py-2.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-lg font-medium text-sm flex items-center space-x-2 hover:from-green-500 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
              <button
                onClick={() => navigate(`/org/${organizationId}/settings`)}
                className="p-2.5 hover:bg-white/10 rounded-lg transition-all border border-white/10 hover:border-cyan-400/50"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <GlassCard hover={false}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Active Services</p>
              <p className="text-3xl font-bold text-white">{stats?.overview.projectCount || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Total projects</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">API Calls Today</p>
              <p className="text-3xl font-bold text-white">
                {stats && stats.workflows.totalExecutions > 1000
                  ? `${(stats.workflows.totalExecutions / 1000).toFixed(1)}k`
                  : stats?.workflows.totalExecutions || 0}
              </p>
              <p className="text-xs text-green-400 mt-1">
                {stats?.workflows.successRate || 0}% success rate
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Storage Used</p>
              <p className="text-3xl font-bold text-white">{stats?.overview.storageGB || '0'} GB</p>
              {stats && stats.storage.breakdown.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.storage.breakdown.reduce((sum, item) => sum + item.fileCount, 0)} files
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Active Users</p>
              <p className="text-3xl font-bold text-white">{stats?.overview.activeUsers30d || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Main Content Grid - Always show sections */}
      <motion.div
        className="grid grid-cols-1 xl:grid-cols-2 gap-6"
        variants={itemVariants}
      >
        {/* Projects Overview */}
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Projects</h2>
            <button
              onClick={() => navigate(`/org/${organizationId}/projects`)}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View all
            </button>
          </div>

          {loadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-white/5 animate-pulse">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-white/10"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 rounded w-1/3"></div>
                      <div className="h-3 bg-white/10 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="space-y-3">
              {projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/org/${organizationId}/project/${project.id}`)}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-all cursor-pointer group border border-white/5 hover:border-cyan-400/30"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-cyan-400 transition-colors">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === 'active'
                        ? 'bg-green-400/20 text-green-400'
                        : 'bg-gray-400/20 text-gray-400'
                    }`}>
                      {String(project.status || 'active')}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}

              {projects.length > 5 && (
                <button
                  onClick={() => navigate(`/org/${organizationId}/projects`)}
                  className="w-full py-3 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-white/5 rounded-lg transition-all border border-white/10 hover:border-cyan-400/30"
                >
                  View all {projects.length} projects
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 mx-auto text-white/20 mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">No Projects Yet</h4>
              <p className="text-white/60 mb-4">Create your first project to get started</p>
              <button
                onClick={() => navigate(`/org/${organizationId}/projects/new`)}
                className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg hover:from-cyan-500 hover:to-blue-600 transition-all"
              >
                Create Project
              </button>
            </div>
          )}
        </GlassCard>

        {/* Team Members */}
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Team Members</h2>
            <button
              onClick={() => navigate(`/org/${organizationId}/members`)}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View all
            </button>
          </div>

          {loadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-white/10"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-white/10 rounded w-24"></div>
                      <div className="h-3 bg-white/10 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-3 bg-white/10 rounded w-16"></div>
                    <div className="h-3 bg-white/10 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : stats && stats.teamMembers && stats.teamMembers.length > 0 ? (
            <div className="space-y-3">
              {stats.teamMembers.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {member.profileImage ? (
                        <img src={member.profileImage} alt={member.displayName} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {member.displayName?.charAt(0) || member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-background`}></span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{member.displayName || member.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{member.actionsLast7d} actions</p>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-white/20 mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">No Team Members</h4>
              <p className="text-white/60 mb-4">Invite members to collaborate</p>
              <button
                onClick={() => navigate(`/org/${organizationId}/members`)}
                className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-500 text-white rounded-lg hover:from-purple-500 hover:to-pink-600 transition-all"
              >
                Invite Members
              </button>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Recent Activity Section */}
      {stats && stats.recentActivity && stats.recentActivity.length > 0 && (
        <motion.div variants={itemVariants}>
          <GlassCard hover={false}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
            </div>

            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.action)}`}>
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-medium">{activity.userName}</span>
                      {' '}
                      <span className="text-muted-foreground">{activity.action}</span>
                      {' '}
                      <span className="text-cyan-400">{activity.resourceType}</span>
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{formatTimestamp(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Storage Breakdown */}
      {stats && stats.storage.breakdown.length > 0 && (
        <motion.div variants={itemVariants}>
          <GlassCard>
            <h2 className="text-xl font-bold text-white mb-6">Storage Breakdown</h2>
            <div className="space-y-4">
              {stats.storage.breakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <HardDrive className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-white">{item.contentType || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{item.fileCount} files</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-primary">{item.totalSizeMB} MB</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

    </motion.div>
  )
}
