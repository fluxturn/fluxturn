import React, { useState, useContext, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  LayoutGrid, 
  Users, 
  BarChart3, 
  Settings, 
  FileText,
  Shield,
  Database,
  Globe,
  Zap,
  Package,
  Layers,
  Activity,
  Cloud,
  Lock,
  Terminal,
  Bell,
  Building,
  FolderOpen,
  Sparkles,
  Brain,
  Key,
  User,
  LogOut,
  CreditCard,
  HelpCircle,
  Plus,
  Check,
  Search,
  ArrowRight,
  ExternalLink,
  Code,
  Workflow,
  Target,
  TrendingUp,
  Palette,
  GitBranch,
  Monitor,
  Smartphone,
  Server,
  BookOpen
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { AuthContext } from '../../contexts/AuthContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useProject } from '../../contexts/ProjectContext'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Organization } from '../../types/organization'
import type { Project } from '../../types/project'

// App type is no longer used but keeping interface definition for reference in removed code
interface App {
  id: string
  name: string
  framework: string
  status: string
  _count?: any
}

interface MenuCategory {
  title: string
  icon: React.ReactNode
  items: {
    title: string
    description: string
    href: string
    icon: React.ReactNode
    isNew?: boolean
    isPro?: boolean
  }[]
}

// Recent items storage
const getRecentOrganizations = (): Organization[] => {
  if (typeof window === 'undefined') return []
  const recent = localStorage.getItem('recent-organizations')
  return recent ? JSON.parse(recent) : []
}

const getRecentProjects = (): Project[] => {
  if (typeof window === 'undefined') return []
  const recent = localStorage.getItem('recent-projects')
  return recent ? JSON.parse(recent) : []
}

const addToRecent = (type: 'organizations' | 'projects', item: Organization | Project) => {
  if (typeof window === 'undefined') return

  const key = `recent-${type}`
  const current = JSON.parse(localStorage.getItem(key) || '[]')
  const updated = [item, ...current.filter((i: any) => i.id !== item.id)].slice(0, 5)
  localStorage.setItem(key, JSON.stringify(updated))
}

interface MenuItem {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  isNew?: boolean
  isPro?: boolean
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

// Organization menu sections
const getOrganizationMenuSections = (orgId: string): MenuSection[] => [
  {
    title: 'Organization',
    items: [
      { title: 'Overview', description: 'Organization dashboard', href: `/org/${orgId}`, icon: <LayoutGrid className="w-5 h-5" /> },
      { title: 'Settings', description: 'Organization settings', href: `/org/${orgId}/settings`, icon: <Settings className="w-5 h-5" /> },
      { title: 'Members', description: 'Manage team members', href: `/org/${orgId}/members`, icon: <Users className="w-5 h-5" /> },
      { title: 'Billing', description: 'Plans and billing', href: `/org/${orgId}/billing`, icon: <CreditCard className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Quick Actions',
    items: [
      { title: 'Create Project', description: 'Start a new project', href: `/org/${orgId}/projects/new`, icon: <Plus className="w-5 h-5" /> },
      { title: 'Invite Members', description: 'Add team members', href: `/org/${orgId}/members/invite`, icon: <Users className="w-5 h-5" /> },
    ]
  }
]

// Project menu sections
const getProjectMenuSections = (orgId: string, projectId: string): MenuSection[] => [
  {
    title: 'Build & Deploy',
    items: [
      { title: 'AI App Builder', description: 'Generate apps with AI', href: `/org/${orgId}/project/${projectId}/app-builder`, icon: <Sparkles className="w-5 h-5" />, isNew: true },
      { title: 'AI Workflow', description: 'Build automation flows', href: `/org/${orgId}/project/${projectId}/workflows`, icon: <Workflow className="w-5 h-5" />, isNew: true },
      { title: 'Templates', description: 'Browse app templates', href: `/org/${orgId}/project/${projectId}/templates`, icon: <FileText className="w-5 h-5" /> },
      { title: 'Components', description: '30,000+ UI components', href: `/org/${orgId}/project/${projectId}/components`, icon: <Layers className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Data & Infrastructure',
    items: [
      { title: 'Databases', description: 'Manage databases', href: `/org/${orgId}/project/${projectId}/databases`, icon: <Database className="w-5 h-5" /> },
      { title: 'Vector Store', description: 'AI embeddings', href: `/org/${orgId}/project/${projectId}/vector-store`, icon: <Brain className="w-5 h-5" />, isPro: true },
      { title: 'Analytics', description: 'Data insights', href: `/org/${orgId}/project/${projectId}/analytics`, icon: <BarChart3 className="w-5 h-5" /> },
      { title: 'Functions', description: 'Serverless functions', href: `/org/${orgId}/project/${projectId}/functions`, icon: <Zap className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Platform',
    items: [
      { title: 'Authentication', description: 'User auth settings', href: `/org/${orgId}/project/${projectId}/auth`, icon: <Lock className="w-5 h-5" /> },
      { title: 'API Keys', description: 'Manage API access', href: `/org/${orgId}/project/${projectId}/api-keys`, icon: <Key className="w-5 h-5" /> },
      { title: 'Monitoring', description: 'System monitoring', href: `/org/${orgId}/project/${projectId}/monitoring`, icon: <Activity className="w-5 h-5" /> },
      { title: 'Settings', description: 'Project settings', href: `/org/${orgId}/project/${projectId}/settings`, icon: <Settings className="w-5 h-5" /> },
    ]
  }
]


export const MegaMenu: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showOrgDropdown, setShowOrgDropdown] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [orgSearch, setOrgSearch] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([])
  const [organizationProjects, setOrganizationProjects] = useState<Project[]>([])
  const [hoveredOrgId, setHoveredOrgId] = useState<string | null>(null)
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null)
  
  const userMenuRef = useRef<HTMLDivElement>(null)
  const orgDropdownRef = useRef<HTMLDivElement>(null)
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  
  const authContext = useContext(AuthContext)
  const { currentOrganization, organizationId, switchOrganization } = useOrganization()
  const { currentProject, projectId } = useProject()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ organizationId?: string; projectId?: string }>()
  
  
  
  const user = authContext?.user
  const displayName = user?.fullName || user?.name || user?.username || user?.email?.split('@')[0] || 'User'
  const userInitials = displayName ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'
  
  // Track if initial load has been done
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  
  // Fetch user organizations
  const fetchUserOrganizations = useCallback(async () => {
    try {
      const response = await api.getUserOrganizations()
      const orgs = response.data || []
      setUserOrganizations(orgs)
      return orgs
    } catch (error) {
      console.error('Failed to fetch user organizations:', error)
      setUserOrganizations([])
      return []
    }
  }, [])

  // Fetch organization projects
  const fetchOrganizationProjects = useCallback(async (orgId: string, autoSelect = false) => {
    try {
      // console.log('🔍 Fetching projects for organization:', orgId)
      const response = await api.getProjectsByOrganization(orgId)
      const projects = response.data || []
      // console.log('📋 Found', projects.length, 'projects for org', orgId)
      setOrganizationProjects(projects)
      
      // Auto-select first project if requested and none selected
      if (autoSelect && projects.length > 0 && !projectId) {
        const latestProject = projects[0]
        addToRecent('projects', latestProject)
        navigate(`/org/${orgId}/project/${latestProject.id}`)
      }
      
      return projects
    } catch (error) {
      console.error('❌ Failed to fetch organization projects:', error)
      setOrganizationProjects([])
      return []
    }
  }, [projectId, navigate])



  // Initial load: fetch organizations when user is authenticated
  useEffect(() => {
    const loadInitialData = async () => {
      if (user && !initialLoadDone) {
        const orgs = await fetchUserOrganizations()
        setInitialLoadDone(true)

        // Don't auto-navigate if user is on the orgs list page
        const isOnOrgsListPage = location.pathname === '/orgs' || location.pathname === '/orgs/new'

        if (isOnOrgsListPage) {
          // User is viewing the org list, don't auto-navigate
          return
        }

        // If we already have IDs in the URL, just fetch the data
        if (organizationId) {
          // We have an org in the URL, fetch its projects
          await fetchOrganizationProjects(organizationId, false)
        } else if (orgs.length > 0) {
          // No org selected, select the first one only if not on orgs list
          const firstOrg = orgs[0]
          addToRecent('organizations', firstOrg)
          switchOrganization(firstOrg.id)

          // Fetch projects and auto-select first one
          const projects = await fetchOrganizationProjects(firstOrg.id, true)

          if (!projects || projects.length === 0) {
            navigate(`/org/${firstOrg.id}`)
          }
        }
      }
    }
    loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initialLoadDone, location.pathname])

  // Fetch projects when organization changes
  useEffect(() => {
    if (organizationId) {
      // console.log('🔄 Organization changed to:', organizationId)
      // Always fetch projects for the current organization
      // Don't auto-select if we already have a projectId in the URL
      fetchOrganizationProjects(organizationId, false)
    } else {
      setOrganizationProjects([])
    }
  }, [organizationId, fetchOrganizationProjects])


  // Load data when dropdowns are opened (for refresh)
  useEffect(() => {
    if (showOrgDropdown && user) {
      fetchUserOrganizations()
    }
  }, [showOrgDropdown, user, fetchUserOrganizations])

  useEffect(() => {
    if (showProjectDropdown && organizationId) {
      fetchOrganizationProjects(organizationId, false)
    }
  }, [showProjectDropdown, organizationId, fetchOrganizationProjects])

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setShowOrgDropdown(false)
        setOrgSearch('')
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
        setProjectSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleLogout = async () => {
    await authContext?.logout()
    navigate('/login')
  }

  // Filter functions
  const filteredOrganizations = userOrganizations.filter(org => 
    org.name.toLowerCase().includes(orgSearch.toLowerCase())
  )

  const filteredProjects = organizationProjects.filter(project =>
    project.name.toLowerCase().includes(projectSearch.toLowerCase())
  )

  // Get recent items
  const recentOrganizations = getRecentOrganizations().filter(org =>
    userOrganizations.some(userOrg => userOrg.id === org.id)
  ).slice(0, 3)

  const recentProjects = getRecentProjects().filter(project =>
    organizationProjects.some(orgProject => orgProject.id === project.id)
  ).slice(0, 3)

  // Navigation helpers
  const handleOrganizationSelect = async (org: Organization) => {
    // console.log('🎯 Switching to organization:', org.name, `(${org.id})`)
    addToRecent('organizations', org)

    // Also update the context directly for immediate state synchronization
    switchOrganization(org.id)

    // Fetch projects and auto-select first one if switching to a different org
    const shouldAutoSelect = org.id !== organizationId
    const projects = await fetchOrganizationProjects(org.id, shouldAutoSelect)

    // If we didn't auto-select a project, just navigate to the org
    if (!shouldAutoSelect || !projects || projects.length === 0) {
      navigate(`/org/${org.id}`)
    }
    // If we auto-selected, navigation was handled by fetchOrganizationProjects

    setShowOrgDropdown(false)
    setOrgSearch('')
  }

  const handleProjectSelect = async (project: Project) => {
    const orgId = currentOrganization?.id || organizationId
    if (!orgId) return
    addToRecent('projects', project)

    navigate(`/org/${orgId}/project/${project.id}`)

    setShowProjectDropdown(false)
    setProjectSearch('')
  }


  return (
    <div className="relative z-50">
      <nav className="glass border-b border-white/10 px-6 py-3 relative z-50">
        <div className="flex items-center">
          {/* Logo and Brand */}
          <div
            className="flex items-center space-x-3 mr-8 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/orgs')}
          >
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-xl glow-cyan">
              C
            </div>
            <span className="text-xl font-bold text-gradient">FluxTurn</span>
          </div>

          {/* AppWrite-style Navigation Dropdowns */}
          <div className="flex items-center space-x-1">
            {/* Organization Dropdown */}
            <div className="relative" ref={orgDropdownRef}>
              <button
                onClick={() => {
                  setShowOrgDropdown(!showOrgDropdown)
                  setShowProjectDropdown(false)
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 border border-white/10"
              >
                <Building className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{currentOrganization?.name || 'Select Organization'}</span>
                <ChevronDown className={cn(
                  "w-3 h-3 transition-transform duration-200",
                  showOrgDropdown && "rotate-180"
                )} />
              </button>
              
              <AnimatePresence>
                {showOrgDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-[600px] glass-solid rounded-xl border border-white/20 shadow-2xl z-[100] backdrop-blur-xl"
                  >
                    <div className="p-4">
                      {/* Search Bar */}
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                          type="text"
                          placeholder="Search organizations..."
                          value={orgSearch}
                          onChange={(e) => setOrgSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Left Column - Organizations List */}
                        <div>
                          {recentOrganizations.length > 0 && !orgSearch && (
                            <>
                              <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 px-2">Recent</div>
                              <div className="space-y-1 mb-4">
                                {recentOrganizations.map((org) => (
                                  <button
                                    key={org.id}
                                    onClick={() => handleOrganizationSelect(org)}
                                    onMouseEnter={() => setHoveredOrgId(org.id)}
                                    onMouseLeave={() => setHoveredOrgId(null)}
                                    className={cn(
                                      "flex items-center justify-between w-full px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-all group",
                                      currentOrganization?.id === org.id && "bg-white/10 ring-1 ring-primary/50"
                                    )}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white font-bold text-sm glow-sm">
                                        {org.name.charAt(0)}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-white truncate">{org.name}</div>
                                        <div className="text-xs text-white/60">{org.plan || 'Free'} Plan</div>
                                      </div>
                                    </div>
                                    {currentOrganization?.id === org.id && <Check className="w-4 h-4 text-primary" />}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}

                          <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 px-2">
                            {orgSearch ? 'Search Results' : 'All Organizations'}
                          </div>
                          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                            {filteredOrganizations.length > 0 ? (
                              filteredOrganizations.map((org) => (
                                <button
                                  key={org.id}
                                  onClick={() => handleOrganizationSelect(org)}
                                  onMouseEnter={() => setHoveredOrgId(org.id)}
                                  onMouseLeave={() => setHoveredOrgId(null)}
                                  className={cn(
                                    "flex items-center justify-between w-full px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-all group",
                                    currentOrganization?.id === org.id && "bg-white/10 ring-1 ring-primary/50"
                                  )}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white font-bold text-sm glow-sm">
                                      {org.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium text-white truncate">{org.name}</div>
                                      <div className="text-xs text-white/60 flex items-center gap-2">
                                        {org.plan || 'Free'} Plan
                                        {org._count?.projects && (
                                          <span className="text-white/40">• {org._count.projects} projects</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {currentOrganization?.id === org.id && <Check className="w-4 h-4 text-primary" />}
                                    <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" />
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="text-center py-8">
                                <Building className="w-8 h-8 text-white/40 mx-auto mb-2" />
                                <div className="text-sm text-white/60 mb-4">No organizations found</div>
                                <button
                                  onClick={() => {
                                    navigate('/orgs/new')
                                    setShowOrgDropdown(false)
                                  }}
                                  className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-all text-sm"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>Create Your First Organization</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Column - Quick Actions */}
                        {(hoveredOrgId || currentOrganization || organizationId) && (
                          <div>
                            <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 px-2">Quick Actions</div>
                            <div className="space-y-2">
                              {getOrganizationMenuSections(hoveredOrgId || currentOrganization?.id || organizationId || '').map((section) => (
                              <div key={section.title}>
                                <div className="text-xs text-white/50 mb-2 px-2">{section.title}</div>
                                <div className="space-y-1">
                                  {section.items.map((item) => (
                                    <button
                                      key={item.title}
                                      onClick={() => {
                                        navigate(item.href)
                                        setShowOrgDropdown(false)
                                      }}
                                      className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-all group"
                                    >
                                      <div className="text-primary">{item.icon}</div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white">{item.title}</div>
                                        <div className="text-xs text-white/60">{item.description}</div>
                                      </div>
                                      <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="border-t border-white/10 mt-4 pt-4 flex items-center justify-between">
                        <button
                          onClick={() => {
                            navigate('/organizations')
                            setShowOrgDropdown(false)
                          }}
                          className="text-sm text-white/60 hover:text-white transition-colors flex items-center space-x-1"
                        >
                          <span>View all organizations</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            navigate('/orgs/new')
                            setShowOrgDropdown(false)
                          }}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-all text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Organization</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Separator and Project Dropdown - Show when org is selected */}
            {(currentOrganization || organizationId) && (
              <>
                <div className="text-white/30">/</div>
                
                {/* Project Dropdown */}
                <div className="relative" ref={projectDropdownRef}>
              <button
                onClick={() => {
                  setShowProjectDropdown(!showProjectDropdown)
                  setShowOrgDropdown(false)
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 border border-white/10"
              >
                <FolderOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {currentProject?.name || (organizationProjects.length > 0 ? 'Select Project' : 'No Projects Yet')}
                </span>
                <ChevronDown className={cn(
                  "w-3 h-3 transition-transform duration-200",
                  showProjectDropdown && "rotate-180"
                )} />
              </button>
              
              <AnimatePresence>
                {showProjectDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-[900px] glass-solid rounded-xl border border-white/20 shadow-2xl z-[100] backdrop-blur-xl"
                  >
                    <div className="p-4">
                      {/* Search Bar */}
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                          type="text"
                          placeholder="Search projects..."
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {/* Left Column - Projects List */}
                        <div className="col-span-1">
                          {recentProjects.length > 0 && !projectSearch && (
                            <>
                              <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 px-2">Recent</div>
                              <div className="space-y-1 mb-4">
                                {recentProjects.map((project) => (
                                  <button
                                    key={project.id}
                                    onClick={() => handleProjectSelect(project)}
                                    onMouseEnter={() => setHoveredProjectId(project.id)}
                                    onMouseLeave={() => setHoveredProjectId(null)}
                                    className={cn(
                                      "flex items-center w-full px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-all group",
                                      currentProject?.id === project.id && "bg-white/10 ring-1 ring-primary/50"
                                    )}
                                  >
                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm glow-sm">
                                        {project.name.charAt(0)}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-white truncate">{project.name}</div>
                                        <div className="text-xs text-white/60 flex items-center gap-2">
                                          <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            project.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                                          )} />
                                          {project.status}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}

                          <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 px-2">
                            {projectSearch ? 'Search Results' : 'All Projects'}
                          </div>
                          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                            {filteredProjects.length > 0 ? (
                              filteredProjects.map((project) => (
                                <button
                                  key={project.id}
                                  onClick={() => handleProjectSelect(project)}
                                  onMouseEnter={() => setHoveredProjectId(project.id)}
                                  onMouseLeave={() => setHoveredProjectId(null)}
                                  className={cn(
                                    "flex items-center w-full px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-all group",
                                    currentProject?.id === project.id && "bg-white/10 ring-1 ring-primary/50"
                                  )}
                                >
                                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm glow-sm">
                                      {project.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-medium text-white truncate">{project.name}</div>
                                      <div className="text-xs text-white/60 flex items-center gap-2">
                                        <div className={cn(
                                          "w-2 h-2 rounded-full",
                                          project.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                                        )} />
                                        {project.status}
                                      </div>
                                    </div>
                                  </div>
                                  {currentProject?.id === project.id && <Check className="w-4 h-4 text-primary ml-2" />}
                                </button>
                              ))
                            ) : (
                              <div className="text-center py-8">
                                <FolderOpen className="w-8 h-8 text-white/40 mx-auto mb-2" />
                                <div className="text-sm text-white/60 mb-4">No projects found</div>
                                <button
                                  onClick={() => {
                                    navigate(`/org/${currentOrganization?.id || organizationId}/projects/new`)
                                    setShowProjectDropdown(false)
                                  }}
                                  className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-all text-sm"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>Create Your First Project</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Middle & Right Columns - Menu Sections */}
                        {(hoveredProjectId || currentProject || projectId) && (
                          <div className="col-span-2">
                            <div className="grid grid-cols-3 gap-4 h-full">
                              {getProjectMenuSections(currentOrganization?.id || organizationId || '', hoveredProjectId || currentProject?.id || projectId || '').map((section, index) => (
                              <div key={section.title}>
                                <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">{section.title}</div>
                                <div className="space-y-1">
                                  {section.items.map((item) => (
                                    <button
                                      key={item.title}
                                      onClick={() => {
                                        navigate(item.href)
                                        setShowProjectDropdown(false)
                                      }}
                                      className="flex items-start space-x-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-all group"
                                    >
                                      <div className="text-primary mt-0.5">{item.icon}</div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm font-medium text-white">{item.title}</span>
                                          {item.isNew && (
                                            <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-medium">New</span>
                                          )}
                                          {item.isPro && (
                                            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">Pro</span>
                                          )}
                                        </div>
                                        <div className="text-xs text-white/60 mt-1">{item.description}</div>
                                      </div>
                                      <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors opacity-0 group-hover:opacity-100 mt-1" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="border-t border-white/10 mt-4 pt-4 flex items-center justify-between">
                        <button
                          onClick={() => {
                            navigate(`/org/${currentOrganization?.id || organizationId}/projects`)
                            setShowProjectDropdown(false)
                          }}
                          className="text-sm text-white/60 hover:text-white transition-colors flex items-center space-x-1"
                        >
                          <span>View all projects</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            navigate(`/org/${currentOrganization?.id || organizationId}/projects/new`)
                            setShowProjectDropdown(false)
                          }}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-all text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Project</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4 ml-auto">
            <div className="relative">
              <input
                type="search"
                placeholder="Search..."
                className="glass px-4 py-2 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
              />
            </div>
            <button className="p-2 hover:bg-white/10 rounded-lg transition-all relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            
            {/* User Profile Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-1.5 hover:bg-white/10 rounded-lg transition-all"
              >
                {user?.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full gradient-secondary flex items-center justify-center text-white font-semibold text-sm">
                    {userInitials}
                  </div>
                )}
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  showUserMenu && "rotate-180"
                )} />
              </button>
              
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-64 glass-solid rounded-lg shadow-xl border border-white/10 overflow-hidden z-[100]"
                  >
                    {/* User Info */}
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        {user?.avatarUrl ? (
                          <img 
                            src={user.avatarUrl} 
                            alt={user.name} 
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full gradient-secondary flex items-center justify-center text-white font-semibold">
                            {userInitials}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          navigate('/settings/profile')
                          setShowUserMenu(false)
                        }}
                        className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Profile Settings</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          navigate('/settings/billing')
                          setShowUserMenu(false)
                        }}
                        className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
                      >
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Billing & Plans</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          navigate('/settings')
                          setShowUserMenu(false)
                        }}
                        className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Settings</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          navigate('/help')
                          setShowUserMenu(false)
                        }}
                        className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
                      >
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Help & Support</span>
                      </button>
                      
                      <div className="border-t border-white/10 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>
    </div>
  )
}