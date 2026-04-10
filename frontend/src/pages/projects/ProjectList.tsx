import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Users,
  Activity,
  X,
  ChevronDown,
  Rocket,
  FolderOpen
} from 'lucide-react'
import { GlassCard } from '../../components/ui/GlassCard'
import { ProjectCard } from '../../components/projects/ProjectCard'
import { ProjectHierarchy } from '../../components/projects/ProjectHierarchy'
import { cn } from '../../lib/utils'
import { Link } from 'react-router-dom'

// Mock data
const mockOrganization = {
  id: '1',
  name: 'Acme Corporation',
  projects: [
    {
      id: '1',
      name: 'E-commerce Platform',
      description: 'Modern e-commerce platform with React and Node.js',
      status: 'active' as const,
      type: 'web' as const,
      techStack: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
      appCount: 3,
      memberCount: 8,
      deploymentStatus: 'deployed' as const,
      lastCommit: {
        message: 'Add payment gateway integration',
        author: 'John Doe',
        time: '2 hours ago',
        hash: 'abc123d'
      },
      previewImage: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
      createdAt: '2024-01-15',
      updatedAt: '2024-03-10',
      organization: { id: '1', name: 'Acme Corporation' }
    },
    {
      id: '2',
      name: 'Mobile Banking App',
      description: 'Secure mobile banking application built with Flutter',
      status: 'active' as const,
      type: 'mobile' as const,
      techStack: ['Flutter', 'Firebase', 'Node.js'],
      appCount: 2,
      memberCount: 5,
      deploymentStatus: 'deploying' as const,
      lastCommit: {
        message: 'Fix authentication flow',
        author: 'Jane Smith',
        time: '4 hours ago',
        hash: 'def456e'
      },
      previewImage: 'https://images.unsplash.com/photo-1563207153-f403bf289096?w=400',
      createdAt: '2024-02-01',
      updatedAt: '2024-03-09',
      organization: { id: '1', name: 'Acme Corporation' }
    },
    {
      id: '3',
      name: 'API Gateway',
      description: 'Microservices API gateway with rate limiting and analytics',
      status: 'completed' as const,
      type: 'api' as const,
      techStack: ['NestJS', 'Redis', 'MongoDB', 'TypeScript'],
      appCount: 1,
      memberCount: 3,
      deploymentStatus: 'deployed' as const,
      lastCommit: {
        message: 'Update rate limiting configuration',
        author: 'Bob Johnson',
        time: '1 day ago',
        hash: 'ghi789f'
      },
      createdAt: '2023-11-20',
      updatedAt: '2024-03-05',
      organization: { id: '1', name: 'Acme Corporation' }
    },
    {
      id: '4',
      name: 'Analytics Dashboard',
      description: 'Real-time analytics dashboard with interactive charts',
      status: 'paused' as const,
      type: 'web' as const,
      techStack: ['React', 'D3.js', 'Express', 'MySQL'],
      appCount: 2,
      memberCount: 4,
      deploymentStatus: 'failed' as const,
      lastCommit: {
        message: 'Add new chart components',
        author: 'Alice Brown',
        time: '3 days ago',
        hash: 'jkl012g'
      },
      previewImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
      createdAt: '2024-01-08',
      updatedAt: '2024-02-28',
      organization: { id: '1', name: 'Acme Corporation' }
    }
  ]
}

const breadcrumbs = [
  { id: '1', name: 'Acme Corporation', type: 'organization' as const, path: '/org/1' },
  { id: 'projects', name: 'Projects', type: 'project' as const, path: '/org/1/projects' }
]

type SortField = 'name' | 'status' | 'type' | 'updatedAt' | 'createdAt' | 'memberCount'
type SortOrder = 'asc' | 'desc'
type ViewMode = 'grid' | 'list'
type StatusFilter = 'all' | 'active' | 'completed' | 'paused' | 'archived'
type TypeFilter = 'all' | 'web' | 'mobile' | 'api' | 'desktop'

export const ProjectList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [teamFilter, setTeamFilter] = useState<'all' | 'my-projects'>('all')

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    const filtered = mockOrganization.projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.techStack.some(tech => tech.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter
      const matchesType = typeFilter === 'all' || project.type === typeFilter
      // For demo purposes, assuming all projects are "my projects"
      const matchesTeam = teamFilter === 'all' || teamFilter === 'my-projects'

      return matchesSearch && matchesStatus && matchesType && matchesTeam
    })

    // Sort projects
    filtered.sort((a, b) => {
      let aValue: unknown = a[sortField as keyof typeof a]
      let bValue: unknown = b[sortField as keyof typeof b]

      if (sortField === 'updatedAt' || sortField === 'createdAt') {
        aValue = new Date(aValue as string | number).getTime()
        bValue = new Date(bValue as string | number).getTime()
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = (bValue as string).toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [searchTerm, statusFilter, typeFilter, sortField, sortOrder, teamFilter])


  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setTypeFilter('all')
    setTeamFilter('all')
    setSortField('updatedAt')
    setSortOrder('desc')
  }

  const activeFiltersCount = [
    searchTerm,
    statusFilter !== 'all' ? statusFilter : null,
    typeFilter !== 'all' ? typeFilter : null,
    teamFilter !== 'all' ? teamFilter : null
  ].filter(Boolean).length

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
      <motion.div variants={itemVariants}>
        <ProjectHierarchy
          breadcrumbs={breadcrumbs}
          currentOrganization={mockOrganization}
          onNavigate={(item) => console.log('Navigate to:', item)}
          onProjectSwitch={(projectId) => console.log('Switch to project:', projectId)}
        />
      </motion.div>

      {/* Header */}
      <motion.div 
        className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize your projects within {mockOrganization.name}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-3 glass hover:bg-white/10 rounded-xl transition-all"
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
          </button>
          <Link to="/projects/new">
            <button className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl font-medium flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>New Project</span>
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 glass rounded-lg hover:bg-white/10 transition-all"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 bg-cyan-400/20 text-cyan-400 rounded-full text-xs">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  showFilters && "rotate-180"
                )} />
              </button>

              {/* Sort */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <option value="updatedAt">Last Updated</option>
                  <option value="createdAt">Created Date</option>
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                  <option value="type">Type</option>
                  <option value="memberCount">Team Size</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 glass hover:bg-white/10 rounded-lg transition-all"
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </button>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 rounded-lg transition-all"
                >
                  Clear all
                </button>
              )}

              {/* Results Count */}
              <div className="text-sm text-muted-foreground ml-auto">
                {filteredProjects.length} of {mockOrganization.projects.length} projects
              </div>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Status Filter */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Status</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                        >
                          <option value="all">All Statuses</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="paused">Paused</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>

                      {/* Type Filter */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Type</label>
                        <select
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                        >
                          <option value="all">All Types</option>
                          <option value="web">Web</option>
                          <option value="mobile">Mobile</option>
                          <option value="api">API</option>
                          <option value="desktop">Desktop</option>
                        </select>
                      </div>

                      {/* Team Filter */}
                      <div>
                        <label className="block text-sm font-medium mb-2">Team</label>
                        <select
                          value={teamFilter}
                          onChange={(e) => setTeamFilter(e.target.value as 'all' | 'my-projects')}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                        >
                          <option value="all">All Projects</option>
                          <option value="my-projects">My Projects</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </motion.div>

      {/* Projects Grid/List */}
      <motion.div variants={itemVariants}>
        {filteredProjects.length > 0 ? (
          <div className={cn(
            "grid gap-6",
            viewMode === 'grid' 
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
              : "grid-cols-1"
          )}>
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ProjectCard
                  project={project}
                  onView={(id) => console.log('View project:', id)}
                  onEdit={(id) => console.log('Edit project:', id)}
                  onDelete={(id) => console.log('Delete project:', id)}
                  onDeploy={(id) => console.log('Deploy project:', id)}
                  onAnalytics={(id) => console.log('Analytics for project:', id)}
                  className={viewMode === 'list' ? 'w-full' : ''}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard className="text-center py-12">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 
                "Try adjusting your search or filters" : 
                "Get started by creating your first project"
              }
            </p>
            <Link to="/projects/new">
              <button className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl font-medium flex items-center space-x-2 mx-auto">
                <Plus className="w-5 h-5" />
                <span>Create Project</span>
              </button>
            </Link>
          </GlassCard>
        )}
      </motion.div>

      {/* Quick Stats */}
      {filteredProjects.length > 0 && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
          variants={itemVariants}
        >
          <GlassCard hover={false}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-cyan-400/20 flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{filteredProjects.length}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard hover={false}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-green-400/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {filteredProjects.filter(p => p.status === 'active').length}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard hover={false}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-blue-400/20 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deployed</p>
                <p className="text-2xl font-bold">
                  {filteredProjects.filter(p => p.deploymentStatus === 'deployed').length}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard hover={false}>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-teal-400/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold">
                  {filteredProjects.reduce((sum, p) => sum + p.memberCount, 0)}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </motion.div>
  )
}