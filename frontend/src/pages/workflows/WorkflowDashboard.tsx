import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  TrendingUp,
  Activity,
  Package,
  RefreshCw,
  Trash2,
  Check,
} from 'lucide-react';
import { WorkflowAPI } from '@/lib/fluxturn';
import { toast } from 'sonner';
import { StatCard, ChartCard, GlassCard } from '@/components/ui/GlassCard';
import { CredentialsManager } from '@/components/credentials/CredentialsManager';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface Tab {
  id: string;
  label: string;
  active: boolean;
  badge?: string;
}

const tabs: Tab[] = [
  { id: 'workflows', label: 'Workflows', active: true },
  { id: 'credentials', label: 'Credentials', active: false },
  { id: 'executions', label: 'Executions', active: false },
];

interface Execution {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  trigger_type: string;
  steps_completed: number;
  total_steps: number;
  duration_ms: number;
  started_at: string;
  completed_at: string;
  error_message: string;
  execution_number: number;
}

export const WorkflowDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { organizationId, projectId } = useParams<{ organizationId: string; projectId: string }>();
  const [activeTab, setActiveTab] = useState('workflows');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name' | 'status'>('updated');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [executionStats, setExecutionStats] = useState({
    totalExecutions: 0,
    successRate: 0,
    last7Days: 0,
  });
  const [chartData, setChartData] = useState<Array<{
    name: string;
    success: number;
    failed: number;
  }>>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [executionsLoading, setExecutionsLoading] = useState(false);
  const [executionsPagination, setExecutionsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [executionSearchQuery, setExecutionSearchQuery] = useState('');
  const [executionStatusFilter, setExecutionStatusFilter] = useState<string>('all');
  const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Redirect to first organization on mount - DISABLED to allow viewing /dashboard
  // useEffect(() => {
  //   const redirectToOrganization = async () => {
  //     try {
  //       const response = await api.getOrganizations();
  //       const organizations = response.organizations || [];

  //       if (organizations.length > 0) {
  //         // Redirect to the first organization
  //         navigate(`/org/${organizations[0].id}`, { replace: true });
  //       } else {
  //         // No organizations, redirect to create one
  //         navigate('/orgs/new', { replace: true });
  //       }
  //     } catch (error) {
  //       console.error('Failed to fetch organizations:', error);
  //       toast.error('Failed to load organizations');
  //       // Fallback to organizations list
  //       navigate('/orgs', { replace: true });
  //     }
  //   };

  //   redirectToOrganization();
  // }, [navigate]);

  useEffect(() => {
    fetchWorkflows();
    fetchExecutionStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'executions') {
      fetchExecutions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, executionsPagination.page, executionStatusFilter]);

  useEffect(() => {
    // Debounce search - only fetch after user stops typing for 500ms
    if (activeTab === 'executions') {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }

      const timer = setTimeout(() => {
        setExecutionsPagination(prev => ({ ...prev, page: 1 }));
        fetchExecutions();
      }, 500);

      setSearchDebounceTimer(timer);

      return () => {
        if (timer) clearTimeout(timer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionSearchQuery]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await WorkflowAPI.getWorkflows({ limit: 50 }) as { workflows?: Workflow[] };
      setWorkflows(response.workflows || []);
    } catch (error: unknown) {
      console.error('Failed to fetch workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutionStats = async () => {
    try {
      const stats = await WorkflowAPI.getExecutionStats() as {
        last7Days?: number;
        successRate?: number;
        dailyData?: { date: string; success: number; failed: number }[];
      };
      setExecutionStats({
        totalExecutions: stats.last7Days || 0,
        successRate: stats.successRate || 0,
        last7Days: stats.last7Days || 0,
      });

      // Transform daily data for charts
      if (stats.dailyData && stats.dailyData.length > 0) {
        const transformedData = stats.dailyData.map((day: { date: string; success: number; failed: number }) => {
          const date = new Date(day.date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          return {
            name: dayName,
            success: Number(day.success) || 0,
            failed: Number(day.failed) || 0,
          };
        });
        setChartData(transformedData);
      } else {
        // If no data, show empty state for last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          last7Days.push({ name: dayName, success: 0, failed: 0 });
        }
        setChartData(last7Days);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch execution stats:', error);
      // Don't show error toast for stats, just use default values
      // Set empty chart data for last 7 days
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        last7Days.push({ name: dayName, success: 0, failed: 0 });
      }
      setChartData(last7Days);
    }
  };

  const fetchExecutions = async () => {
    try {
      setExecutionsLoading(true);
      const response = await WorkflowAPI.getAllExecutions({
        page: executionsPagination.page,
        limit: executionsPagination.limit,
        status: executionStatusFilter !== 'all' ? executionStatusFilter : undefined,
        // TODO: Add search parameter support to API
        // search: executionSearchQuery || undefined,
      }) as { executions?: Execution[]; pagination: { total: number; totalPages: number } };
      setExecutions(response.executions || []);
      setExecutionsPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      }));
    } catch (error: unknown) {
      console.error('Failed to fetch executions:', error);
      toast.error('Failed to load executions');
    } finally {
      setExecutionsLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      // Generate default workflow name with timestamp
      const now = new Date();
      const defaultName = `My workflow ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

      toast.info('Creating workflow...');

      // Create workflow with default name
      const response = await WorkflowAPI.createWorkflow({
        name: defaultName,
        description: 'New workflow',
        workflow: {
          triggers: [],
          steps: [],
          conditions: [],
          variables: [],
          outputs: [],
          canvas: {
            nodes: [],
            edges: [],
          },
        },
      });

      toast.success('Workflow created! Redirecting to canvas...');

      // Navigate to the new workflow in the canvas
      navigate(`/org/${organizationId}/project/${projectId}/workflows/${response.id}`);
    } catch (error: unknown) {
      console.error('Failed to create workflow:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create workflow');
    }
  };

  const handleDeleteWorkflow = async (workflowId: string, workflowName: string) => {
    // Show confirmation toast
    toast.custom((t) => (
      <div className="bg-gray-900 border border-red-500/50 rounded-lg p-4 shadow-lg max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-medium mb-1">Delete Workflow?</h3>
            <p className="text-sm text-gray-400 mb-3">
              Are you sure you want to delete "{workflowName}"? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  toast.dismiss(t);
                  // Proceed with deletion
                  toast.promise(
                    async () => {
                      await WorkflowAPI.deleteWorkflow(workflowId);
                      // Update state after successful deletion
                      setWorkflows(workflows.filter(w => w.id !== workflowId));
                    },
                    {
                      loading: `Deleting "${workflowName}"...`,
                      success: `"${workflowName}" deleted successfully`,
                      error: (err) => err.message || 'Failed to delete workflow',
                    }
                  );
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  };

  const formatCreatedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  };

  const formatExecutionDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (durationMs: number) => {
    if (!durationMs) return '-';
    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
    return `${(durationMs / 60000).toFixed(1)}m`;
  };

  const sortWorkflows = (workflows: Workflow[]) => {
    const sorted = [...workflows];
    switch (sortBy) {
      case 'updated':
        return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      case 'created':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'status':
        return sorted.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return 0;
        });
      default:
        return sorted;
    }
  };

  const filteredWorkflows = sortWorkflows(
    workflows.filter(workflow =>
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header with Quick Actions */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Workflow</h1>
          <p className="text-gray-400 mt-1">Build and manage your automation flows</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/org/${organizationId}/project/${projectId}/templates`)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/50 text-white font-medium rounded-lg transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Browse Templates
          </button>
          <button
            onClick={handleCreateWorkflow}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/25"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Workflow
          </button>
        </div>
      </motion.div>

      {/* Stats Grid - Combining original stats with workflow metrics */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <StatCard
          title="Total Workflows"
          value={workflows.length.toString()}
          change={12.5}
          icon={<Package className="w-5 h-5" />}
          color="from-cyan-400 to-blue-500"
        />
        <StatCard
          title="Active Workflows"
          value={workflows.filter(w => w.status === 'active').length.toString()}
          change={8.2}
          icon={<Activity className="w-5 h-5" />}
          color="from-teal-400 to-cyan-500"
        />
        <StatCard
          title="Executions (7d)"
          value={executionStats.last7Days.toString()}
          change={15.3}
          icon={<TrendingUp className="w-5 h-5" />}
          color="from-blue-400 to-indigo-500"
        />
        <StatCard
          title="Success Rate"
          value={`${executionStats.successRate.toFixed(1)}%`}
          change={2.1}
          icon={<Activity className="w-5 h-5" />}
          color="from-cyan-500 to-teal-500"
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={itemVariants}
      >
        <ChartCard
          title="Workflow Executions"
          subtitle="Success vs Failed executions this week"
          actions={
            <button
              onClick={fetchExecutionStats}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
              title="Refresh chart data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ff4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="success"
                stroke="#00d4ff"
                fillOpacity={1}
                fill="url(#colorSuccess)"
              />
              <Area
                type="monotone"
                dataKey="failed"
                stroke="#ff4444"
                fillOpacity={1}
                fill="url(#colorFailed)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Daily Activity"
          subtitle="Workflow executions by day"
          actions={
            <button
              onClick={fetchExecutionStats}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
              title="Refresh chart data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="success" fill="#00d4ff" radius={[8, 8, 0, 0]} />
              <Bar dataKey="failed" fill="#ff4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      {/* Workflows Section */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Your Workflows</h3>
              <p className="text-sm text-gray-400 mt-1">Manage and monitor your automation workflows</p>
            </div>
            <button
              onClick={handleCreateWorkflow}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              Create Workflow
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-white/10 mb-6">
            <div className="flex items-center gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 px-1 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'text-cyan-500 border-b-2 border-cyan-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-gray-400">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search and Filter Bar */}
          {activeTab === 'workflows' && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-sm text-gray-300"
                >
                  Sort by {sortBy === 'updated' ? 'last updated' : sortBy === 'created' ? 'created date' : sortBy === 'name' ? 'name' : 'status'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showSortDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSortDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setSortBy('updated');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-3 ${
                            sortBy === 'updated' ? 'text-cyan-400 bg-white/5' : 'text-gray-300'
                          }`}
                        >
                          <RefreshCw className="w-4 h-4" />
                          Last Updated
                        </button>
                        <button
                          onClick={() => {
                            setSortBy('created');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-3 ${
                            sortBy === 'created' ? 'text-cyan-400 bg-white/5' : 'text-gray-300'
                          }`}
                        >
                          <Package className="w-4 h-4" />
                          Created Date
                        </button>
                        <button
                          onClick={() => {
                            setSortBy('name');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-3 ${
                            sortBy === 'name' ? 'text-cyan-400 bg-white/5' : 'text-gray-300'
                          }`}
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                          Name (A-Z)
                        </button>
                        <button
                          onClick={() => {
                            setSortBy('status');
                            setShowSortDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-3 ${
                            sortBy === 'status' ? 'text-cyan-400 bg-white/5' : 'text-gray-300'
                          }`}
                        >
                          <Activity className="w-4 h-4" />
                          Status
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Workflow List */}
          {activeTab === 'workflows' && (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-500" />
                  <p>Loading workflows...</p>
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/20 rounded-lg">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p className="text-gray-400 mb-4">
                    {searchQuery ? 'No workflows found matching your search' : 'No workflows yet'}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => navigate(`/org/${organizationId}/project/${projectId}/templates`)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors"
                    >
                      Browse Templates
                    </button>
                    <button
                      onClick={handleCreateWorkflow}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                    >
                      Create your first workflow
                    </button>
                  </div>
                </div>
              ) : (
                filteredWorkflows.map((workflow) => (
                  <motion.div
                    key={workflow.id}
                    onClick={() => navigate(`/org/${organizationId}/project/${projectId}/workflows/${workflow.id}`)}
                    className="p-4 rounded-lg border border-white/10 hover:border-cyan-500/50 hover:bg-white/5 transition-all cursor-pointer group"
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-base font-medium text-white group-hover:text-cyan-500 transition-colors">
                            {workflow.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span>Updated {formatDate(workflow.updated_at)}</span>
                            <span className="text-gray-600">•</span>
                            <span>Created {formatCreatedDate(workflow.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          workflow.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {workflow.status === 'active' ? 'Active' : 'Inactive'}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkflow(workflow.id, workflow.name);
                          }}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete workflow"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Credentials Tab */}
          {activeTab === 'credentials' && (
            <CredentialsManager />
          )}

          {/* Executions Tab */}
          {activeTab === 'executions' && (
            <div className="space-y-4">
              {/* Search and Filter Bar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by workflow name..."
                    value={executionSearchQuery}
                    onChange={(e) => setExecutionSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowStatusFilterDropdown(!showStatusFilterDropdown)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-sm text-gray-300 whitespace-nowrap"
                  >
                    Status: {executionStatusFilter === 'all' ? 'All' : executionStatusFilter.charAt(0).toUpperCase() + executionStatusFilter.slice(1)}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showStatusFilterDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showStatusFilterDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowStatusFilterDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden">
                        <div className="py-1">
                          {['all', 'completed', 'failed', 'running', 'pending'].map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                setExecutionStatusFilter(status);
                                setShowStatusFilterDropdown(false);
                                setExecutionsPagination(prev => ({ ...prev, page: 1 }));
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-3 ${
                                executionStatusFilter === status ? 'text-cyan-400 bg-white/5' : 'text-gray-300'
                              }`}
                            >
                              {status === 'completed' && <Check className="w-4 h-4" />}
                              {status === 'failed' && <Trash2 className="w-4 h-4" />}
                              {status === 'running' && <RefreshCw className="w-4 h-4" />}
                              {status === 'pending' && <Activity className="w-4 h-4" />}
                              {status === 'all' && <SlidersHorizontal className="w-4 h-4" />}
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {executionsLoading ? (
                <div className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-500" />
                  <p>Loading executions...</p>
                </div>
              ) : executions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/20 rounded-lg">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p className="text-gray-400">
                    {executionSearchQuery || executionStatusFilter !== 'all'
                      ? 'No executions found matching your filters'
                      : 'No workflow executions yet'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Executions Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Workflow</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Trigger</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Progress</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Duration</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Started</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executions.map((execution) => (
                          <motion.tr
                            key={execution.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                            onClick={() => navigate(`/org/${organizationId}/project/${projectId}/workflows/${execution.workflow_id}`)}
                            whileHover={{ x: 2 }}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                                  <Package className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{execution.workflow_name || 'Untitled Workflow'}</p>
                                  <p className="text-xs text-gray-500">#{execution.execution_number}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                execution.status === 'completed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : execution.status === 'failed'
                                  ? 'bg-red-500/20 text-red-400'
                                  : execution.status === 'running'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {execution.status === 'completed' && <Check className="w-3 h-3" />}
                                {execution.status === 'running' && <RefreshCw className="w-3 h-3 animate-spin" />}
                                {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-300">
                                {execution.trigger_type || 'Manual'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-[100px]">
                                  <div
                                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all"
                                    style={{
                                      width: `${execution.total_steps > 0
                                        ? (execution.steps_completed / execution.total_steps) * 100
                                        : 0
                                      }%`
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400">
                                  {execution.steps_completed}/{execution.total_steps}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-300">
                                {formatDuration(execution.duration_ms)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-400">
                                {formatExecutionDate(execution.started_at)}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {executionsPagination.total > 0 && (
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <span className="text-sm text-gray-400">
                        Showing {(executionsPagination.page - 1) * executionsPagination.limit + 1} to{' '}
                        {Math.min(executionsPagination.page * executionsPagination.limit, executionsPagination.total)} of{' '}
                        {executionsPagination.total} execution{executionsPagination.total !== 1 ? 's' : ''}
                        {(executionSearchQuery || executionStatusFilter !== 'all') && ' (filtered)'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExecutionsPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          disabled={executionsPagination.page === 1}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(executionsPagination.totalPages, 5) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setExecutionsPagination(prev => ({ ...prev, page: pageNum }))}
                                className={`px-3 py-1 rounded transition-colors ${
                                  executionsPagination.page === pageNum
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setExecutionsPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          disabled={executionsPagination.page === executionsPagination.totalPages}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Pagination */}
          {activeTab === 'workflows' && filteredWorkflows.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <span className="text-sm text-gray-400">
                Showing {filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-colors">
                  Previous
                </button>
                <button className="px-3 py-1 bg-cyan-500 text-white rounded">1</button>
                <button className="px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Quick Actions */}
      {/* <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: <Upload className="w-5 h-5" />,
                label: 'Import Workflow',
                color: 'from-cyan-400 to-blue-500',
              },
              {
                icon: <Download className="w-5 h-5" />,
                label: 'Export Data',
                color: 'from-teal-400 to-cyan-500',
              },
              {
                icon: <Users className="w-5 h-5" />,
                label: 'Team Settings',
                color: 'from-blue-400 to-indigo-500',
              },
              {
                icon: <RefreshCw className="w-5 h-5" />,
                label: 'Sync Workflows',
                color: 'from-cyan-500 to-teal-500',
              },
            ].map((action, index) => (
              <motion.button
                key={index}
                className="p-4 rounded-lg glass hover:bg-white/10 transition-all group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform`}
                >
                  <span className="text-white">{action.icon}</span>
                </div>
                <p className="text-sm font-medium">{action.label}</p>
              </motion.button>
            ))}
          </div>
        </GlassCard>
      </motion.div> */}
    </motion.div>
  );
};
