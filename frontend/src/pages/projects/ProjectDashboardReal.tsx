import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  Users,
  FolderOpen,
  Database,
  Workflow,
  Settings,
  ExternalLink,
  RefreshCw,
  Download,
  BarChart3,
  Calendar,
  Clock,
  Plus,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  XCircle,
  Zap,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  GitBranch,
  Eye,
  Sparkles
} from 'lucide-react'
import { GlassCard } from '../../components/ui/GlassCard'
import { ProjectHierarchy } from '../../components/projects/ProjectHierarchy'
import { QuickActions } from '../../components/QuickActions'
import { useProjectFromParams } from '../../contexts/ProjectContext'
import { useOrganizationFromParams } from '../../contexts/OrganizationContext'
import { api } from '../../lib/api'
import { WorkflowAPI } from '../../lib/fluxturn'

interface WorkflowStats {
  total: number
  active: number
  paused: number
  failed: number
}

interface ExecutionStats {
  total: number
  successful: number
  failed: number
  running: number
  todayExecutions: number
  avgExecutionTime: number
}

interface RecentExecution {
  id: string
  workflow_name: string
  status: 'success' | 'failed' | 'running'
  started_at: string
  completed_at?: string
  duration?: number
}

export const ProjectDashboardReal: React.FC = () => {
  const navigate = useNavigate()
  const { currentProject, projectId, loading: projectLoading, error: projectError, refreshProject } = useProjectFromParams()
  const { currentOrganization } = useOrganizationFromParams()

  const [workflows, setWorkflows] = useState<any[]>([])
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats>({ total: 0, active: 0, paused: 0, failed: 0 })
  const [executionStats, setExecutionStats] = useState<ExecutionStats>({
    total: 0,
    successful: 0,
    failed: 0,
    running: 0,
    todayExecutions: 0,
    avgExecutionTime: 0
  })
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId && currentOrganization) {
      fetchDashboardData()
    }
  }, [projectId, currentOrganization])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch workflows and executions in parallel for better performance
      const [workflowsResponse, executionsResponse] = await Promise.all([
        WorkflowAPI.getWorkflows({ limit: 100 }).catch(err => {
          console.error('Failed to fetch workflows:', err)
          return { workflows: [] }
        }),
        WorkflowAPI.getAllExecutions({ limit: 100 }).catch(err => {
          console.error('Failed to fetch executions:', err)
          return { executions: [] }
        })
      ])

      const workflowsData = workflowsResponse.workflows || []
      // console.log('✅ Loaded workflows:', workflowsData.length, workflowsData)
      setWorkflows(workflowsData)

      // Calculate workflow stats
      const stats = {
        total: workflowsData.length,
        active: workflowsData.filter((w: any) => w.is_active).length,
        paused: workflowsData.filter((w: any) => !w.is_active).length,
        failed: 0
      }
      // console.log('📊 Workflow stats:', stats)
      setWorkflowStats(stats)

      // Process execution history
      const allExecutions: RecentExecution[] = []
      let totalSuccessful = 0
      let totalFailed = 0
      let totalRunning = 0
      let totalDuration = 0
      let durationCount = 0
      let todayCount = 0

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (executionsResponse?.executions && executionsResponse.executions.length > 0) {
        // console.log('Loaded executions:', executionsResponse.executions.length)

        // Create workflow lookup map for better performance
        const workflowMap = new Map(workflowsData.map((w: any) => [w.id, w]))

        executionsResponse.executions.forEach((exec: any) => {
          const workflow = workflowMap.get(exec.workflow_id) as any

          allExecutions.push({
            id: exec.id,
            workflow_name: workflow?.name || 'Unknown Workflow',
            status: exec.status,
            started_at: exec.started_at,
            completed_at: exec.completed_at,
            duration: exec.duration
          })

          // Count by status
          if (exec.status === 'success') totalSuccessful++
          else if (exec.status === 'failed') totalFailed++
          else if (exec.status === 'running') totalRunning++

          // Calculate avg duration
          if (exec.duration) {
            totalDuration += exec.duration
            durationCount++
          }

          // Count today's executions
          const execDate = new Date(exec.started_at)
          if (execDate >= today) {
            todayCount++
          }
        })

        // Sort by most recent
        allExecutions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
        const recentExecs = allExecutions.slice(0, 10)
        // console.log('📋 Recent executions:', recentExecs.length, recentExecs)
        setRecentExecutions(recentExecs)

        const execStats = {
          total: allExecutions.length,
          successful: totalSuccessful,
          failed: totalFailed,
          running: totalRunning,
          todayExecutions: todayCount,
          avgExecutionTime: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0
        }
        // console.log('📈 Execution stats:', execStats)
        setExecutionStats(execStats)
      }

    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
      // console.log('✨ Dashboard data loaded - workflows:', workflows.length, 'executions:', recentExecutions.length)
    }
  }

  const handleCreateWorkflow = () => {
    if (currentOrganization && projectId) {
      navigate(`/org/${currentOrganization.id}/project/${projectId}/workflows`)
    }
  }

  const handleProjectSettings = () => {
    if (currentOrganization && projectId) {
      navigate(`/org/${currentOrganization.id}/project/${projectId}/settings`)
    }
  }

  const handleViewWorkflows = () => {
    if (currentOrganization && projectId) {
      navigate(`/org/${currentOrganization.id}/project/${projectId}/workflows`)
    }
  }

  // Create breadcrumbs from current context
  const breadcrumbs = currentOrganization && currentProject ? [
    {
      id: currentOrganization.id,
      name: currentOrganization.name,
      type: 'organization' as const,
      path: `/org/${currentOrganization.id}`
    },
    {
      id: 'projects',
      name: 'Projects',
      type: 'project' as const,
      path: `/org/${currentOrganization.id}/projects`
    },
    {
      id: currentProject.id,
      name: currentProject.name,
      type: 'project' as const,
      path: `/org/${currentOrganization.id}/project/${currentProject.id}`
    }
  ] : []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'production':
      case 'active':
      case 'success':
        return 'text-green-400 bg-green-400/20'
      case 'staging':
      case 'running':
        return 'text-yellow-400 bg-yellow-400/20'
      case 'development':
        return 'text-blue-400 bg-blue-400/20'
      case 'archived':
      case 'failed':
        return 'text-red-400 bg-red-400/20'
      default:
        return 'text-gray-400 bg-gray-400/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'production':
      case 'active':
      case 'success':
        return <CheckCircle className="w-4 h-4" />
      case 'staging':
      case 'running':
        return <Play className="w-4 h-4" />
      case 'development':
        return <Activity className="w-4 h-4" />
      case 'archived':
      case 'failed':
        return <XCircle className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getSuccessRate = () => {
    if (executionStats.total === 0) return 0
    return ((executionStats.successful / executionStats.total) * 100).toFixed(1)
  }

  // Loading state
  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2 text-white/60">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading project...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (projectError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-white">Error Loading Project</h3>
            <p className="text-white/60">{projectError}</p>
          </div>
          <button
            onClick={refreshProject}
            className="px-4 py-2 bg-primary rounded-lg text-white hover:bg-primary/90 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // No project state
  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <FolderOpen className="w-12 h-12 text-white/40 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-white">Project Not Found</h3>
            <p className="text-white/60">The requested project could not be found.</p>
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

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hierarchy Navigation */}
      {breadcrumbs.length > 0 && (
        <motion.div variants={itemVariants}>
          <ProjectHierarchy
            breadcrumbs={breadcrumbs}
            onNavigate={(item) => navigate(item.path)}
            onProjectSwitch={(projectId) => navigate(`/org/${currentOrganization?.id}/project/${projectId}`)}
          />
        </motion.div>
      )}

      {/* Project Header */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-white truncate">{currentProject.name}</h1>
                  <span className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(currentProject.status)} flex-shrink-0`}>
                    {getStatusIcon(currentProject.status)}
                    <span className="capitalize">{currentProject.status}</span>
                  </span>
                </div>
                {currentProject.description && (
                  <p className="text-muted-foreground text-sm mb-2">{currentProject.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Created {new Date(currentProject.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Updated {new Date(currentProject.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5" />
                    <span className="capitalize">{currentProject.visibility}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  refreshProject()
                  fetchDashboardData()
                }}
                className="p-2.5 hover:bg-white/10 rounded-lg transition-all border border-white/10 hover:border-cyan-400/50"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/org/${currentOrganization?.id}/project/${projectId}/analytics`)}
                className="p-2.5 hover:bg-white/10 rounded-lg transition-all border border-white/10 hover:border-cyan-400/50"
                title="Analytics"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={handleProjectSettings}
                className="p-2.5 hover:bg-white/10 rounded-lg transition-all border border-white/10 hover:border-cyan-400/50"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleCreateWorkflow}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium text-sm flex items-center space-x-2 hover:from-cyan-500 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>New Workflow</span>
              </button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <GlassCard hover={false}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Total Workflows</p>
              <p className="text-3xl font-bold text-white">{workflowStats.total}</p>
              {workflowStats.total > 0 && (
                <p className="text-xs text-green-400 mt-1">
                  {workflowStats.active} active • {workflowStats.paused} paused
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
              <Workflow className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Total Executions</p>
              <p className="text-3xl font-bold text-white">{executionStats.total}</p>
              {executionStats.todayExecutions > 0 && (
                <p className="text-xs text-green-400 mt-1">
                  +{executionStats.todayExecutions} today
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Success Rate</p>
              <p className="text-3xl font-bold text-white">{getSuccessRate()}%</p>
              {executionStats.total > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {executionStats.successful} success • {executionStats.failed} failed
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Avg Duration</p>
              <p className="text-3xl font-bold text-white">
                {executionStats.avgExecutionTime > 0 ? formatDuration(executionStats.avgExecutionTime) : '—'}
              </p>
              {executionStats.avgExecutionTime > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Per execution
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Workflows & Recent Activity */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={itemVariants}
      >
        {/* Active Workflows */}
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Active Workflows</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {workflowStats.active} of {workflowStats.total} workflows active
              </p>
            </div>
            <button
              onClick={handleViewWorkflows}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View all
            </button>
          </div>

          {loading && workflows.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12">
              <Workflow className="w-16 h-16 mx-auto text-white/20 mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">No Workflows Yet</h4>
              <p className="text-white/60 mb-4">Create your first workflow to get started</p>
              <button
                onClick={handleCreateWorkflow}
                className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg hover:from-cyan-500 hover:to-blue-600 transition-all"
              >
                Create Workflow
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.slice(0, 5).map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => navigate(`/org/${currentOrganization?.id}/project/${projectId}/workflows/${workflow.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${workflow.is_active ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                      <Workflow className={`w-5 h-5 ${workflow.is_active ? 'text-green-400' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{workflow.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {workflow.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <span className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${workflow.is_active ? 'text-green-400 bg-green-400/20' : 'text-gray-400 bg-gray-400/20'}`}>
                    {workflow.is_active ? <CheckCircle className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    <span>{workflow.is_active ? 'Active' : 'Paused'}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Recent Executions */}
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Recent Executions</h3>
              <p className="text-sm text-muted-foreground mt-1">Latest workflow runs</p>
            </div>
          </div>

          {loading && recentExecutions.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : recentExecutions.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 mx-auto text-white/20 mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">No Executions Yet</h4>
              <p className="text-white/60">Workflow executions will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExecutions.slice(0, 5).map((execution) => (
                <div key={execution.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all">
                  <div className="flex items-center space-x-3">
                    <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${getStatusColor(execution.status)}`}>
                      {getStatusIcon(execution.status)}
                    </span>
                    <div>
                      <p className="font-medium text-sm text-white">{execution.workflow_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(execution.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium capitalize ${getStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                    {execution.duration && (
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(execution.duration)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Features & Tools Section */}
      <motion.div
        className="grid grid-cols-1 xl:grid-cols-2 gap-6"
        variants={itemVariants}
      >
        {/* Features */}
        <GlassCard hover={false}>
          <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">FEATURES</h3>
          <div className="space-y-3">
            <div
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => navigate(`/org/${currentOrganization?.id}/project/${projectId}`)}
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Dashboard</h4>
                <p className="text-xs text-muted-foreground">Project overview</p>
              </div>
            </div>

            <div
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => navigate(`/org/${currentOrganization?.id}/project/${projectId}/workflows`)}
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Workflow className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Workflows</h4>
                <p className="text-xs text-muted-foreground">Automation flows</p>
              </div>
            </div>

            <div
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => navigate(`/org/${currentOrganization?.id}/project/${projectId}/templates`)}
            >
              <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-pink-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Templates</h4>
                <p className="text-xs text-muted-foreground">Pre-built workflows</p>
              </div>
            </div>

            <div
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => navigate(`/org/${currentOrganization?.id}/integrations`)}
            >
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Integrations</h4>
                <p className="text-xs text-muted-foreground">Connect services</p>
              </div>
            </div>

            <div
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => navigate(`/org/${currentOrganization?.id}/project/${projectId}`)}
            >
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Analytics</h4>
                <p className="text-xs text-muted-foreground">Performance insights</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Workflow Tools */}
        <GlassCard hover={false}>
          <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">WORKFLOW TOOLS</h3>
          <div className="space-y-3">
            <div
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
              onClick={handleCreateWorkflow}
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Create Workflow</h4>
                <p className="text-xs text-muted-foreground">Build automation</p>
              </div>
            </div>

            <div
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => navigate(`/org/${currentOrganization?.id}/project/${projectId}/templates`)}
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Templates Gallery</h4>
                <p className="text-xs text-muted-foreground">Browse templates</p>
              </div>
            </div>

            <div
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => navigate(`/org/${currentOrganization?.id}/integrations`)}
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <GitBranch className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Connectors</h4>
                <p className="text-xs text-muted-foreground">Service integrations</p>
              </div>
            </div>

            <div
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => navigate(`/org/${currentOrganization?.id}/project/${projectId}/workflows`)}
            >
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Play className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Executions</h4>
                <p className="text-xs text-muted-foreground">View workflow runs</p>
              </div>
            </div>

            <div
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all cursor-pointer group"
              onClick={handleProjectSettings}
            >
              <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Settings</h4>
                <p className="text-xs text-muted-foreground">Project configuration</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        variants={itemVariants}
      >
        <GlassCard hover={true}>
          <div className="text-center space-y-4 cursor-pointer" onClick={handleCreateWorkflow}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mx-auto">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Create Workflow</h3>
              <p className="text-sm text-muted-foreground">Build a new automation workflow</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={true}>
          <div className="text-center space-y-4 cursor-pointer" onClick={() => navigate(`/org/${currentOrganization?.id}/project/${projectId}/workflows`)}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Browse Templates</h3>
              <p className="text-sm text-muted-foreground">Use pre-built workflow templates</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={true}>
          <div className="text-center space-y-4 cursor-pointer" onClick={handleProjectSettings}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Project Settings</h3>
              <p className="text-sm text-muted-foreground">Configure project preferences</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* TEMPORARY TEST SECTION - Remove after testing */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Test Section (Temporary)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-white/80 font-medium mb-2">Project ID</p>
                <code className="text-xs text-cyan-400 break-all">{projectId}</code>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-white/80 font-medium mb-2">Organization</p>
                <code className="text-xs text-cyan-400 break-all">{currentOrganization?.id || 'N/A'}</code>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-white/80 font-medium mb-2">Workflows Loaded</p>
                <code className="text-xs text-cyan-400">{workflowStats.total} total ({workflowStats.active} active, {workflowStats.paused} paused)</code>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-white/80 font-medium mb-2">Executions Loaded</p>
                <code className="text-xs text-cyan-400">{executionStats.total} total | Recent: {recentExecutions.length}</code>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-yellow-400">This section is for testing/debugging purposes only. Remove before production.</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}
