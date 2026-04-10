import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  User,
  Eye,
  Settings,
  Mail,
  Send,
  Search,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  Download,
  Calendar
} from 'lucide-react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { GlassCard, StatCard } from '../../components/ui/GlassCard'
import { cn } from '../../lib/utils'
import { organizationApi, OrganizationMember, OrganizationInvitation } from '../../lib/api/organization'

const roleHierarchy = {
  owner: { level: 4, label: 'Owner', color: 'bg-purple-500/20 text-purple-400' },
  admin: { level: 3, label: 'Admin', color: 'bg-cyan-500/20 text-cyan-400' },
  developer: { level: 2, label: 'Developer', color: 'bg-blue-500/20 text-blue-400' },
  viewer: { level: 1, label: 'Viewer', color: 'bg-gray-500/20 text-gray-400' }
}

const rolePermissions = {
  owner: ['All permissions'],
  admin: ['Manage users', 'Manage projects', 'Manage billing', 'View analytics'],
  developer: ['Manage projects', 'View analytics'],
  viewer: ['View projects']
}

export const OrganizationMembers: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>()
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'activity'>('members')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showMemberDetails, setShowMemberDetails] = useState<string | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member' as 'admin' | 'member',
    message: ''
  })

  // Real API state
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data on mount and when organizationId changes
  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return

      try {
        setLoading(true)
        setError(null)
        const [membersData, invitationsData] = await Promise.all([
          organizationApi.getMembers(organizationId),
          organizationApi.getInvitations(organizationId)
        ])
        setMembers(membersData)
        setInvitations(invitationsData)
      } catch (err: unknown) {
        console.error('Failed to load organization data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
        toast.error('Failed to load organization members')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [organizationId])

  // Auto-refresh on window focus
  useEffect(() => {
    const handleFocus = async () => {
      if (organizationId) {
        try {
          const [membersData, invitationsData] = await Promise.all([
            organizationApi.getMembers(organizationId),
            organizationApi.getInvitations(organizationId)
          ])
          setMembers(membersData)
          setInvitations(invitationsData)
        } catch {
          // Silent fail on background refresh
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [organizationId])

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

  const filteredMembers = members.filter(member => {
    const memberName = `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || member.user.email
    const matchesSearch = memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  const stats = {
    totalMembers: members.length,
    activeMembers: members.length,
    pendingInvitations: invitations.filter(i => i.status === 'pending').length,
    adminCount: members.filter(m => m.role === 'admin').length
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4" />
      case 'admin': return <Shield className="w-4 h-4" />
      case 'developer': return <User className="w-4 h-4" />
      case 'viewer': return <Eye className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invite': return <Mail className="w-4 h-4" />
      case 'role_change': return <Settings className="w-4 h-4" />
      case 'remove': return <UserMinus className="w-4 h-4" />
      case 'join': return <UserPlus className="w-4 h-4" />
      case 'login': return <Activity className="w-4 h-4" />
      case 'permission': return <Shield className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'invite': return 'bg-blue-500/20 text-blue-400'
      case 'role_change': return 'bg-orange-500/20 text-orange-400'
      case 'remove': return 'bg-red-500/20 text-red-400'
      case 'join': return 'bg-green-500/20 text-green-400'
      case 'login': return 'bg-cyan-500/20 text-cyan-400'
      case 'permission': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const handleInviteMember = async () => {
    if (!organizationId) return

    try {
      await organizationApi.inviteMember(
        organizationId,
        inviteForm.email,
        inviteForm.role,
        inviteForm.message || undefined
      )
      toast.success('Invitation sent successfully!')
      setShowInviteModal(false)
      setInviteForm({ email: '', role: 'member', message: '' })

      // Refresh invitations
      const updatedInvitations = await organizationApi.getInvitations(organizationId)
      setInvitations(updatedInvitations)
    } catch (err: unknown) {
      console.error('Failed to invite member:', err)
      const errObj = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(errObj.response?.data?.message || 'Failed to send invitation')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!organizationId) return

    // Show confirmation dialog first
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      await organizationApi.removeMember(organizationId, userId)
      toast.success('Member removed')

      // Update local state
      setMembers(prev => prev.filter(m => m.userId !== userId))
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } }
      toast.error(errObj.response?.data?.message || 'Failed to remove member')
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    if (!organizationId) return

    try {
      await organizationApi.resendInvitation(organizationId, invitationId)
      toast.success('Invitation resent')
    } catch {
      toast.error('Failed to resend invitation')
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!organizationId) return

    try {
      await organizationApi.cancelInvitation(organizationId, invitationId)
      toast.success('Invitation cancelled')

      // Update local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    } catch {
      toast.error('Failed to cancel invitation')
    }
  }

  const copyInvitationLink = (invitationId: string) => {
    const invitation = invitations.find(i => i.id === invitationId)
    if (!invitation) return

    const link = `${window.location.origin}/invite/${invitation.token}`
    navigator.clipboard.writeText(link)
    toast.success('Invitation link copied to clipboard')
  }

  const renderMembersTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <GlassCard hover={false}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="developer">Developer</option>
            <option value="viewer">Viewer</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Invite Button */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium flex items-center space-x-2 hover:shadow-lg hover:shadow-cyan-400/25 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            <span>Invite Member</span>
          </button>
        </div>
      </GlassCard>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Members</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      )}

      {/* Members List */}
      {!loading && !error && (
        <div className="space-y-4">
          {filteredMembers.map((member) => {
            const memberName = `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || member.user.email
            const initials = member.user.firstName && member.user.lastName
              ? `${member.user.firstName[0]}${member.user.lastName[0]}`
              : member.user.email.substring(0, 2).toUpperCase()

            return (
              <motion.div key={member.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard hover={true} className="group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                          <span className="text-lg font-semibold text-white">
                            {initials}
                          </span>
                        </div>
                        {member.role === 'owner' && (
                          <Crown className="absolute -top-1 -right-1 w-6 h-6 text-yellow-400" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-lg font-semibold">{memberName}</h3>
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            roleHierarchy[member.role]?.color
                          )}>
                            {getRoleIcon(member.role)}
                            <span className="ml-1">{roleHierarchy[member.role]?.label}</span>
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowMemberDetails(member.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {member.role !== 'owner' && (
                        <>
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 text-red-400"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}

      {filteredMembers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No members found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria or invite new members
          </p>
        </div>
      )}
    </div>
  )

  const renderInvitationsTab = () => (
    <div className="space-y-6">
      {/* Pending Invitations */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Pending Invitations</h3>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium flex items-center space-x-2 text-sm"
            >
              <Mail className="w-4 h-4" />
              <span>Send Invite</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {invitations.map((invitation) => {
            const inviterName = `${invitation.invitedBy.firstName || ''} ${invitation.invitedBy.lastName || ''}`.trim() || invitation.invitedBy.email

            return (
              <div
                key={invitation.id}
                className={cn(
                  "p-4 rounded-lg border",
                  invitation.status === 'pending'
                    ? "bg-blue-500/5 border-blue-500/20"
                    : "bg-red-500/5 border-red-500/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Invited as {roleHierarchy[invitation.role]?.label || invitation.role} by {inviterName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Invited {new Date(invitation.createdAt).toLocaleDateString()}</span>
                      <span>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</span>
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize",
                        invitation.status === 'pending'
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-red-500/20 text-red-400"
                      )}>
                        {invitation.status === 'pending' ? <Clock className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {invitation.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyInvitationLink(invitation.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all"
                      title="Copy invitation link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleResendInvitation(invitation.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all"
                      title="Resend invitation"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all text-red-400"
                      title="Cancel invitation"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {invitations.length === 0 && (
          <div className="text-center py-8">
            <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No pending invitations</p>
          </div>
        )}
      </GlassCard>
    </div>
  )

  const renderActivityTab = () => (
    <GlassCard hover={false}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Activity Log</h3>
          <p className="text-sm text-muted-foreground">Recent member-related activities</p>
        </div>
        <button className="px-4 py-2 glass hover:bg-white/10 rounded-lg transition-all flex items-center space-x-2 text-sm">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      <div className="space-y-4">
        {([] as Array<{ id: string; type: string; description: string; user: string; date: string; action?: string; target?: string; timestamp?: string }>).map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-all">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              getActivityColor(activity.type)
            )}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium">{activity.user}</span>
                {' '}{activity.action}
                {activity.target && <span className="font-medium"> {activity.target}</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )

  const renderInviteModal = () => (
    showInviteModal && (
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowInviteModal(false)}
      >
        <motion.div
          className="bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Invite Team Member</h3>
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
                value={inviteForm.email}
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                placeholder="colleague@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as 'member' | 'admin' }))}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <div className="mt-2 p-3 bg-white/5 rounded-lg">
                <h4 className="text-sm font-medium mb-2">
                  {inviteForm.role === 'admin' ? 'Admin' : 'Member'} Permissions:
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {inviteForm.role === 'admin' ? (
                    <>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span>Manage users</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span>Manage projects</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span>Manage billing</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span>View analytics</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span>View projects</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span>Basic access</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Personal Message (Optional)</label>
              <textarea
                value={inviteForm.message}
                onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                placeholder="Welcome to our team! Looking forward to working with you..."
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 hover:bg-white/10 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteMember}
                className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send Invitation</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  )

  const renderMemberDetails = () => {
    const member = members.find(m => m.id === showMemberDetails)
    if (!member) return null

    return (
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowMemberDetails(null)}
      >
        <motion.div
          className="bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Member Details</h3>
            <button
              onClick={() => setShowMemberDetails(null)}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Member Info */}
            <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <span className="text-xl font-semibold text-white">
                    {member.user.email.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                {member.role === 'owner' && (
                  <Crown className="absolute -top-1 -right-1 w-6 h-6 text-yellow-400" />
                )}
              </div>
              <div>
                <h4 className="text-lg font-semibold">
                  {member.user.firstName && member.user.lastName
                    ? `${member.user.firstName} ${member.user.lastName}`
                    : member.user.username || member.user.email}
                </h4>
                <p className="text-muted-foreground">{member.user.email}</p>
                <div className="flex items-center space-x-3 mt-2">
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                    roleHierarchy[member.role]?.color
                  )}>
                    {getRoleIcon(member.role)}
                    <span className="ml-1">{roleHierarchy[member.role]?.label}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h5 className="font-medium">Contact Information</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{member.user.email}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-medium">Organization Details</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h5 className="font-medium mb-3">Permissions</h5>
              <div className="space-y-2">
                {member.role === 'owner' ? (
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>All permissions (Organization Owner)</span>
                  </div>
                ) : (
                  rolePermissions[member.role]?.map((permission, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>{permission}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            {member.role !== 'owner' && (
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                <button className="px-4 py-2 hover:bg-white/10 rounded-lg transition-all flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Edit Role</span>
                </button>
                <button className="px-4 py-2 hover:bg-white/10 rounded-lg transition-all flex items-center space-x-2 text-red-400">
                  <UserMinus className="w-4 h-4" />
                  <span>Remove Member</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="max-w-7xl mx-auto px-6 py-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Team Members</h1>
          <p className="text-muted-foreground">Manage your organization's team members and permissions</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <StatCard
          title="Total Members"
          value={stats.totalMembers}
          change={12.5}
          icon={<Users className="w-5 h-5" />}
          color="from-cyan-400 to-blue-500"
        />
        <StatCard
          title="Active Members"
          value={stats.activeMembers}
          change={8.3}
          icon={<Activity className="w-5 h-5" />}
          color="from-green-400 to-teal-500"
        />
        <StatCard
          title="Pending Invites"
          value={stats.pendingInvitations}
          icon={<Mail className="w-5 h-5" />}
          color="from-orange-400 to-red-500"
        />
        <StatCard
          title="Administrators"
          value={stats.adminCount}
          icon={<Shield className="w-5 h-5" />}
          color="from-purple-400 to-pink-500"
        />
      </motion.div>

      {/* Tabs Navigation */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false} className="p-2">
          <div className="flex space-x-2">
            {[
              { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
              { id: 'invitations', label: 'Invitations', icon: <Mail className="w-4 h-4" /> },
              { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'members' | 'invitations' | 'activity')}
                className={cn(
                  "flex items-center space-x-2 px-6 py-3 rounded-lg transition-all text-sm font-medium",
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
        {activeTab === 'members' && renderMembersTab()}
        {activeTab === 'invitations' && renderInvitationsTab()}
        {activeTab === 'activity' && renderActivityTab()}
      </motion.div>

      {/* Modals */}
      {renderInviteModal()}
      {renderMemberDetails()}
    </motion.div>
  )
}