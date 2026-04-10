import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  Plus,
  Building2,
  Users,
  FolderOpen,
  Activity,
  ArrowUpDown,
  Grid3X3,
  List,
  ChevronDown
} from 'lucide-react'
import { StatCard, GlassCard } from '../../components/ui/GlassCard'
import { OrganizationCard } from '../../components/organizations/OrganizationCard'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { Link, useNavigate } from 'react-router-dom'
import { organizationApi } from '../../lib/api/organization'
import { toast } from 'sonner'

type SortField = 'name' | 'createdAt' | 'memberCount' | 'projectCount' | 'storageUsed'
type SortDirection = 'asc' | 'desc'
type ViewMode = 'grid' | 'list'
type StatusFilter = 'all' | 'active' | 'pending' | 'suspended'

export const OrganizationList: React.FC = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; description: string; status?: string; createdAt?: string; [key: string]: unknown }>>([])
  const [, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; organizationId: string | null; organizationName: string }>({
    open: false,
    organizationId: null,
    organizationName: ''
  })

  // Fetch organizations from API
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true)
        const response = await organizationApi.getUserOrganizations()
        setOrganizations(response.data || [])
      } catch (error: unknown) {
        console.error('Failed to fetch organizations:', error)
        toast.error('Failed to load organizations')
        // Fallback to empty array
        setOrganizations([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizations()

    // Refetch when window regains focus (helps with navigation back scenarios)
    const handleFocus = () => {
      fetchOrganizations()
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Filter and sort organizations
  const filteredAndSortedOrganizations = useMemo(() => {
    const filtered = organizations.filter(org => {
      const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           org.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || org.status === statusFilter
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      let aValue: unknown = a[sortField]
      let bValue: unknown = b[sortField]

      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [organizations, searchQuery, statusFilter, sortField, sortDirection])

  // Calculate stats
  const stats = useMemo(() => {
    const totalOrgs = organizations.length
    const activeOrgs = organizations.filter(org => org.status === 'active').length
    const totalProjects = organizations.reduce((sum, org) => sum + (org.projectCount || 0), 0)
    const totalUsers = organizations.reduce((sum, org) => sum + (org.memberCount || 0), 0)

    return { totalOrgs, activeOrgs, totalProjects, totalUsers }
  }, [organizations])

  const handleDelete = (organizationId: string) => {
    const org = organizations.find(o => o.id === organizationId)
    setDeleteDialog({
      open: true,
      organizationId,
      organizationName: org?.name || 'this organization'
    })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.organizationId) return

    try {
      await organizationApi.deleteOrganization(deleteDialog.organizationId)
      toast.success('Organization deleted successfully')

      // Refresh the list
      setOrganizations(organizations.filter(o => o.id !== deleteDialog.organizationId))

      // Close dialog
      setDeleteDialog({ open: false, organizationId: null, organizationName: '' })
    } catch (error: unknown) {
      console.error('Failed to delete organization:', error)
      const errObj = error as { response?: { data?: { message?: string } } }
      toast.error(errObj.response?.data?.message || 'Failed to delete organization')
    }
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
      {/* Header */}
      <motion.div 
        className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">Organizations</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor all organizations in your system
          </p>
        </div>
        
        <Link to="/orgs/new">
          <motion.button
            className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl font-medium flex items-center space-x-2 hover:shadow-lg hover:shadow-cyan-400/25 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-5 h-5" />
            <span>Create Organization</span>
          </motion.button>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <StatCard
          title="Total Organizations"
          value={stats.totalOrgs}
          icon={<Building2 className="w-5 h-5" />}
          color="from-cyan-400 to-blue-500"
        />
        <StatCard
          title="Active Organizations"
          value={stats.activeOrgs}
          icon={<Activity className="w-5 h-5" />}
          color="from-green-400 to-teal-500"
        />
        <StatCard
          title="Total Projects"
          value={stats.totalProjects}
          icon={<FolderOpen className="w-5 h-5" />}
          color="from-blue-400 to-indigo-500"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="w-5 h-5" />}
          color="from-teal-400 to-cyan-500"
        />
      </motion.div>

      {/* Filters and Search */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-cyan-400/20 text-cyan-400' : 'hover:bg-white/10'
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-cyan-400/20 text-cyan-400' : 'hover:bg-white/10'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 hover:bg-white/10 rounded-lg transition-all flex items-center space-x-2"
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
              <motion.div
                animate={{ rotate: showFilters ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {/* Sort Field */}
                <div>
                  <label className="block text-sm font-medium mb-2">Sort By</label>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  >
                    <option value="name">Name</option>
                    <option value="createdAt">Date Created</option>
                    <option value="memberCount">Member Count</option>
                    <option value="projectCount">Project Count</option>
                    <option value="storageUsed">Storage Used</option>
                  </select>
                </div>

                {/* Sort Direction */}
                <div>
                  <label className="block text-sm font-medium mb-2">Direction</label>
                  <button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    <span>{sortDirection === 'asc' ? 'Ascending' : 'Descending'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>

      {/* Results Count */}
      <motion.div variants={itemVariants}>
        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedOrganizations.length} of {organizations.length} organizations
        </p>
      </motion.div>

      {/* Organizations Grid/List */}
      <motion.div 
        className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}
        variants={itemVariants}
      >
        {filteredAndSortedOrganizations.map((organization, index) => (
          <motion.div
            key={organization.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <OrganizationCard
              organization={organization}
              onView={(id) => navigate(`/org/${id}`)}
              onEdit={(id) => navigate(`/org/${id}/settings`)}
              onDelete={handleDelete}
              className={viewMode === 'list' ? 'flex-row' : ''}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {filteredAndSortedOrganizations.length === 0 && (
        <motion.div
          className="text-center py-12"
          variants={itemVariants}
        >
          <GlassCard hover={false}>
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No organizations found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'Get started by creating your first organization'
              }
            </p>
            <Link to="/orgs/new">
              <button className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl font-medium flex items-center space-x-2 mx-auto hover:shadow-lg hover:shadow-cyan-400/25 transition-all">
                <Plus className="w-5 h-5" />
                <span>Create Organization</span>
              </button>
            </Link>
          </GlassCard>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Organization"
        description={`Are you sure you want to delete "${deleteDialog.organizationName}"? This action cannot be undone and will permanently delete all projects, data, and settings associated with this organization.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </motion.div>
  )
}