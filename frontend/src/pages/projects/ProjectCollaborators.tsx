import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users,
  UserPlus,
  Settings,
  Crown,
  Shield,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Calendar,
  Clock,
  Activity,
  Key,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Send
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
  { id: 'collaborators', name: 'Collaborators', type: 'project' as const, path: '/org/1/projects/1/collaborators' }
]

type Permission = 'owner' | 'admin' | 'editor' | 'viewer'

interface Collaborator {
  id: string
  name: string
  email: string
  avatar?: string
  permission: Permission
  status: 'active' | 'pending' | 'suspended'
  joinedAt: string
  lastActive: string
  invitedBy: string
  accessCount: number
}

const mockCollaborators: Collaborator[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@acme.com',
    permission: 'owner',
    status: 'active',
    joinedAt: '2024-01-15T10:30:00Z',
    lastActive: '2024-03-10T14:30:00Z',
    invitedBy: 'System',
    accessCount: 450
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@acme.com',
    permission: 'admin',
    status: 'active',
    joinedAt: '2024-01-20T09:15:00Z',
    lastActive: '2024-03-10T12:45:00Z',
    invitedBy: 'John Doe',
    accessCount: 320
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob.johnson@contractor.com',
    permission: 'editor',
    status: 'active',
    joinedAt: '2024-02-01T14:20:00Z',
    lastActive: '2024-03-09T16:22:00Z',
    invitedBy: 'Jane Smith',
    accessCount: 180
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice.brown@acme.com',
    permission: 'viewer',
    status: 'pending',
    joinedAt: '2024-03-08T11:30:00Z',
    lastActive: 'Never',
    invitedBy: 'John Doe',
    accessCount: 0
  },
  {
    id: '5',
    name: 'Charlie Wilson',
    email: 'charlie.wilson@freelance.com',
    permission: 'editor',
    status: 'suspended',
    joinedAt: '2024-01-25T16:45:00Z',
    lastActive: '2024-02-28T10:15:00Z',
    invitedBy: 'Jane Smith',
    accessCount: 95
  }
]

const activityFeed = [
  {
    id: '1',
    user: 'Jane Smith',
    action: 'deployed v2.1.3 to production',
    timestamp: '2024-03-10T14:30:00Z',
    type: 'deploy'
  },
  {
    id: '2',
    user: 'Bob Johnson',
    action: 'updated environment variables',
    timestamp: '2024-03-10T12:15:00Z',
    type: 'config'
  },
  {
    id: '3',
    user: 'John Doe',
    action: 'added new collaborator Alice Brown',
    timestamp: '2024-03-08T11:30:00Z',
    type: 'team'
  },
  {
    id: '4',
    user: 'Jane Smith',
    action: 'created new API endpoint /products/search',
    timestamp: '2024-03-07T16:45:00Z',
    type: 'code'
  },
  {
    id: '5',
    user: 'Bob Johnson',
    action: 'updated project settings',
    timestamp: '2024-03-06T09:20:00Z',
    type: 'settings'
  }
]

const permissionLevels = {
  owner: {
    label: 'Owner',
    icon: Crown,
    color: 'text-yellow-400 bg-yellow-400/20',
    description: 'Full access to everything including billing and project deletion'
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'text-red-400 bg-red-400/20',
    description: 'Can manage settings, deployments, and team members'
  },
  editor: {
    label: 'Editor',
    icon: Edit,
    color: 'text-blue-400 bg-blue-400/20',
    description: 'Can deploy, manage environment variables, and access logs'
  },
  viewer: {
    label: 'Viewer',
    icon: Eye,
    color: 'text-green-400 bg-green-400/20',
    description: 'Read-only access to project dashboard and analytics'
  }
}

export const ProjectCollaborators: React.FC = () => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>(mockCollaborators)
  const [searchTerm, setSearchTerm] = useState('')
  const [permissionFilter, setPermissionFilter] = useState<'all' | Permission>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState<string | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    permission: 'viewer' as Permission,
    message: ''
  })
  const [copiedInvite, setCopiedInvite] = useState(false)

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-400/20'
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/20'
      case 'suspended':
        return 'text-red-400 bg-red-400/20'
      default:
        return 'text-gray-400 bg-gray-400/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'suspended':
        return <Ban className="w-4 h-4" />
      default:
        return <XCircle className="w-4 h-4" />
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deploy':
        return 'bg-green-500/20 text-green-400'
      case 'config':
        return 'bg-blue-500/20 text-blue-400'
      case 'team':
        return 'bg-purple-500/20 text-purple-400'
      case 'code':
        return 'bg-cyan-500/20 text-cyan-400'
      case 'settings':
        return 'bg-orange-500/20 text-orange-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const sendInvite = () => {
    if (inviteForm.email && inviteForm.permission) {
      const newCollaborator: Collaborator = {
        id: Date.now().toString(),
        name: inviteForm.email.split('@')[0],
        email: inviteForm.email,
        permission: inviteForm.permission,
        status: 'pending',
        joinedAt: new Date().toISOString(),
        lastActive: 'Never',
        invitedBy: 'Current User',
        accessCount: 0
      }
      setCollaborators(prev => [...prev, newCollaborator])
      setInviteForm({ email: '', permission: 'viewer', message: '' })
      setShowInviteModal(false)
    }
  }

  const updatePermission = (collaboratorId: string, newPermission: Permission) => {
    setCollaborators(prev => 
      prev.map(collab => 
        collab.id === collaboratorId 
          ? { ...collab, permission: newPermission }
          : collab
      )
    )
    setShowPermissionModal(null)
  }

  const removeCollaborator = (collaboratorId: string) => {
    setCollaborators(prev => prev.filter(collab => collab.id !== collaboratorId))
  }

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/invite/${projectData.id}?token=abc123`
    navigator.clipboard.writeText(inviteLink)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 2000)
  }

  const filteredCollaborators = collaborators.filter(collaborator => {
    const matchesSearch = collaborator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         collaborator.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPermission = permissionFilter === 'all' || collaborator.permission === permissionFilter
    const matchesStatus = statusFilter === 'all' || collaborator.status === statusFilter
    
    return matchesSearch && matchesPermission && matchesStatus
  })

  const stats = {
    total: collaborators.length,
    active: collaborators.filter(c => c.status === 'active').length,
    pending: collaborators.filter(c => c.status === 'pending').length,
    suspended: collaborators.filter(c => c.status === 'suspended').length
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
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Team Collaboration</h1>
            <p className="text-muted-foreground">{projectData.name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={copyInviteLink}
            className="px-4 py-2 glass hover:bg-white/10 rounded-xl transition-all flex items-center space-x-2"
          >
            {copiedInvite ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>Copy Invite Link</span>
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl font-medium flex items-center space-x-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Invite Member</span>
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <StatCard
          title="Total Members"
          value={stats.total.toString()}
          icon={<Users className="w-5 h-5" />}
          color="from-cyan-400 to-blue-500"
        />
        <StatCard
          title="Active Members"
          value={stats.active.toString()}
          icon={<CheckCircle className="w-5 h-5" />}
          color="from-green-400 to-emerald-500"
        />
        <StatCard
          title="Pending Invites"
          value={stats.pending.toString()}
          icon={<Clock className="w-5 h-5" />}
          color="from-yellow-400 to-orange-500"
        />
        <StatCard
          title="Suspended"
          value={stats.suspended.toString()}
          icon={<Ban className="w-5 h-5" />}
          color="from-red-400 to-pink-500"
        />
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Collaborators List */}
        <motion.div className="xl:col-span-2" variants={itemVariants}>
          <GlassCard hover={false}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
              <h3 className="text-lg font-semibold">Team Members</h3>
              
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  />
                </div>
                
                <select
                  value={permissionFilter}
                  onChange={(e) => setPermissionFilter(e.target.value as typeof permissionFilter)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <option value="all">All Permissions</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredCollaborators.map((collaborator) => {
                const PermissionIcon = permissionLevels[collaborator.permission].icon
                
                return (
                  <div key={collaborator.id} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                          <span className="text-white font-medium text-lg">
                            {collaborator.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{collaborator.name}</h4>
                            <span className={cn(
                              "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
                              getStatusColor(collaborator.status)
                            )}>
                              {getStatusIcon(collaborator.status)}
                              <span className="capitalize">{collaborator.status}</span>
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">{collaborator.email}</p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                            <span>Joined {new Date(collaborator.joinedAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Last active: {collaborator.lastActive === 'Never' ? 'Never' : new Date(collaborator.lastActive).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{collaborator.accessCount} accesses</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "flex items-center space-x-2 px-3 py-2 rounded-lg",
                          permissionLevels[collaborator.permission].color
                        )}>
                          <PermissionIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {permissionLevels[collaborator.permission].label}
                          </span>
                        </div>

                        <button
                          onClick={() => setShowPermissionModal(collaborator.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-all"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        
                        {collaborator.permission !== 'owner' && (
                          <button
                            onClick={() => removeCollaborator(collaborator.id)}
                            className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredCollaborators.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No team members found</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Activity Feed */}
        <motion.div variants={itemVariants}>
          <GlassCard hover={false}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span>Recent Activity</span>
              </h3>
              <button className="text-sm text-cyan-400 hover:text-cyan-300">View all</button>
            </div>
            
            <div className="space-y-3">
              {activityFeed.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    getActivityIcon(activity.type)
                  )}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>
                      {' '}{activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Permission Levels Guide */}
          <GlassCard hover={false} className="mt-6">
            <h4 className="font-semibold mb-4">Permission Levels</h4>
            <div className="space-y-3">
              {Object.entries(permissionLevels).map(([key, level]) => {
                const Icon = level.icon
                return (
                  <div key={key} className="flex items-start space-x-3">
                    <div className={cn("p-2 rounded-lg", level.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{level.label}</p>
                      <p className="text-xs text-muted-foreground">{level.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
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
              className="w-full max-w-lg"
            >
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Invite Team Member</h3>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email Address</label>
                    <input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Permission Level</label>
                    <select
                      value={inviteForm.permission}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, permission: e.target.value as Permission }))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {permissionLevels[inviteForm.permission].description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Personal Message (Optional)</label>
                    <textarea
                      placeholder="Add a personal message to the invitation..."
                      value={inviteForm.message}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 glass hover:bg-white/10 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendInvite}
                    disabled={!inviteForm.email}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Invitation</span>
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Modal */}
      <AnimatePresence>
        {showPermissionModal && (
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
              className="w-full max-w-md"
            >
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Update Permissions</h3>
                  <button
                    onClick={() => setShowPermissionModal(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {Object.entries(permissionLevels).filter(([key]) => key !== 'owner').map(([key, level]) => {
                    const Icon = level.icon
                    return (
                      <button
                        key={key}
                        onClick={() => updatePermission(showPermissionModal!, key as Permission)}
                        className={cn(
                          "w-full flex items-center space-x-3 p-3 rounded-lg transition-all text-left",
                          level.color.replace('text-', 'hover:text-').replace('bg-', 'hover:bg-'),
                          "hover:bg-opacity-30"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <div>
                          <p className="font-medium">{level.label}</p>
                          <p className="text-xs opacity-80">{level.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}