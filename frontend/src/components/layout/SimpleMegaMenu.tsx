import React, { useState, useEffect, useRef, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Building,
  FolderOpen,
  Globe,
  Plus,
  User,
  LogOut,
  Settings,
  CreditCard,
  HelpCircle,
  ExternalLink,
  Check,
  Search,
  ArrowRight,
  Users,
  LayoutGrid,
  BarChart3,
  Sparkles,
  FileText,
  Layers,
  Workflow,
  Database,
  Brain,
  Zap,
  Activity,
  Lock,
  Key,
  Code,
  Monitor,
  Terminal,
  GitBranch,
  TrendingUp,
  MessageSquare
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { buildContextPath } from '../../lib/navigation-utils'
import { AuthContext } from '../../contexts/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { PreviewBadge } from '../ui/PreviewBadge'

interface OrgItem { id: string; name: string; description?: string; [key: string]: unknown }
interface ProjectItem { id: string; name: string; description?: string; organizationId?: string; [key: string]: unknown }

interface MenuData {
  organizations: OrgItem[]
  selectedOrganization: OrgItem | null
  projects: ProjectItem[]
  selectedProject: ProjectItem | null
}

export const SimpleMegaMenu: React.FC = () => {
  const { organizationId, projectId } = useParams()
  const navigate = useNavigate()
  const authContext = useContext(AuthContext)
  const user = authContext?.user
  
  // Simple state - just menu data and dropdown visibility
  const [menuData, setMenuData] = useState<MenuData>({
    organizations: [],
    selectedOrganization: null,
    projects: [],
    selectedProject: null
  })

  const [showOrgDropdown, setShowOrgDropdown] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const orgDropdownRef = useRef<HTMLDivElement>(null)
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  
  // Single function to fetch all menu data
  const fetchMenuData = async () => {
    try {
      const data = await api.getMenuData(organizationId, projectId)

      setMenuData(data)

      // Auto-navigate if backend selected something new (but not if we're on special pages)
      const currentPath = window.location.pathname
      const isOnSpecialPage = currentPath === '/orgs' ||
                              currentPath.endsWith('/projects') ||
                              currentPath.endsWith('/create') ||
                              currentPath.includes('/new') ||
                              currentPath.includes('/workflows') ||
                              currentPath.includes('/ai-service') ||
                              currentPath.includes('/settings') ||
                              currentPath.includes('/members') ||
                              currentPath.includes('/integrations') ||
                              currentPath.includes('/collaborators') ||
                              currentPath.includes('/deployments') ||
                              currentPath.startsWith('/admin') ||
                              currentPath === '/dashboard' ||
                              // Don't redirect if we're on org or project dashboard (exact match)
                              currentPath.match(/^\/org\/[^/]+$/) ||
                              currentPath.match(/^\/org\/[^/]+\/project\/[^/]+$/)

      // Only auto-navigate if we're not on a special page
      if (!isOnSpecialPage) {
        if (data.selectedOrganization && data.selectedProject) {
          const newPath = `/org/${data.selectedOrganization.id}/project/${data.selectedProject.id}/workflows`
          if (currentPath !== newPath) {
            navigate(newPath)
          }
        } else if (data.selectedOrganization) {
          const newPath = `/org/${data.selectedOrganization.id}`
          if (currentPath !== newPath) {
            navigate(newPath)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch menu data:', error)
    }
  }
  
  // Fetch menu data when user logs in or URL changes
  useEffect(() => {
    if (user) {
      fetchMenuData()
    }
  }, [user, organizationId, projectId])
  
  // Handle selections - just navigate and let useEffect refetch
  const handleOrganizationSelect = (org: OrgItem) => {
    navigate(`/org/${org.id}`)
    setShowOrgDropdown(false)
  }
  
  const handleProjectSelect = (project: ProjectItem) => {
    if (menuData.selectedOrganization) {
      navigate(`/org/${menuData.selectedOrganization.id}/project/${project.id}`)
    }
    setShowProjectDropdown(false)
  }
  
  
  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setShowOrgDropdown(false)
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleLogout = async () => {
    await authContext?.logout()
    navigate('/login')
  }
  
  const displayName = user?.fullName || user?.name || user?.username || user?.email?.split('@')[0] || 'User'
  const userInitials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  
  return (
    <div className="relative z-50">
      <nav className="glass border-b border-white/10 px-6 py-3 relative z-50">
        <div className="flex items-center">
          {/* Logo */}
          <div
            className="flex items-center space-x-3 mr-8 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
          >
            <img
              src="/logo.png"
              alt="FluxTurn Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">FluxTurn</span>
            <div className="ml-2 mb-2">
              <PreviewBadge />
            </div>
          </div>

          {/* Navigation Dropdowns */}
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
                <span className="text-sm font-medium">
                  {menuData.selectedOrganization?.name || 'Select Organization'}
                </span>
                <ChevronDown className={cn(
                  "w-3 h-3 transition-transform duration-200",
                  showOrgDropdown && "rotate-180"
                )} />
              </button>
              
              <AnimatePresence>
                {showOrgDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 w-[600px] bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl"
                  >
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Left Column - Organizations List */}
                        <div>
                          <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">
                            Organizations ({menuData.organizations.length})
                          </div>
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {menuData.organizations.map((org) => (
                              <button
                                key={org.id}
                                onClick={() => handleOrganizationSelect(org)}
                                className={cn(
                                  "flex items-center justify-between w-full px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-all",
                                  menuData.selectedOrganization?.id === org.id && "bg-white/10 ring-1 ring-primary/50"
                                )}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white font-bold text-sm">
                                    {org.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-white">{org.name}</div>
                                    <div className="text-xs text-white/60">{org.plan || 'Free'} Plan</div>
                                  </div>
                                </div>
                                {menuData.selectedOrganization?.id === org.id && (
                                  <Check className="w-4 h-4 text-primary" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Right Column - Quick Actions (show when org is selected) */}
                        {menuData.selectedOrganization && (
                          <div>
                            <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Quick Actions</div>
                            <div className="space-y-2">
                              <div>
                                <div className="text-xs text-white/50 mb-2 px-2">Organization</div>
                                <div className="space-y-1">
                                  <button
                                    onClick={() => {
                                      navigate(`/org/${menuData.selectedOrganization.id}/settings`)
                                      setShowOrgDropdown(false)
                                    }}
                                    className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-all group"
                                  >
                                    <Settings className="w-4 h-4 text-primary" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-white">Overview</div>
                                      <div className="text-xs text-white/60">Organization settings</div>
                                    </div>
                                    <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigate(`/org/${menuData.selectedOrganization.id}/members`)
                                      setShowOrgDropdown(false)
                                    }}
                                    className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-all group"
                                  >
                                    <Users className="w-4 h-4 text-primary" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-white">Members</div>
                                      <div className="text-xs text-white/60">Manage team members</div>
                                    </div>
                                    <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" />
                                  </button>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-white/50 mb-2 px-2">Quick Actions</div>
                                <div className="space-y-1">
                                  <button
                                    onClick={() => {
                                      navigate(`/org/${menuData.selectedOrganization.id}/projects/new`)
                                      setShowOrgDropdown(false)
                                    }}
                                    className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-all group"
                                  >
                                    <Plus className="w-4 h-4 text-primary" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-white">Create Project</div>
                                      <div className="text-xs text-white/60">Start a new project</div>
                                    </div>
                                    <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-white/10 mt-4 pt-4">
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
            
            {/* Project Dropdown - Show when org is selected */}
            {menuData.selectedOrganization && (
              <>
                <div className="text-white/30">/</div>
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
                      {menuData.selectedProject?.name || 
                       (menuData.projects.length > 0 ? 'Select Project' : 'No Projects')}
                    </span>
                    <ChevronDown className={cn(
                      "w-3 h-3 transition-transform duration-200",
                      showProjectDropdown && "rotate-180"
                    )} />
                  </button>
                  
                  <AnimatePresence>
                    {showProjectDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 mt-2 w-[900px] bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl"
                      >
                        <div className="p-4">
                          <div className="grid grid-cols-3 gap-4">
                            {/* Left Column - Projects List */}
                            <div className="col-span-1">
                              <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">
                                Projects ({menuData.projects.length})
                              </div>
                              <div className="space-y-1 max-h-64 overflow-y-auto">
                                {menuData.projects.length > 0 ? (
                                  menuData.projects.map((project) => (
                                    <button
                                      key={project.id}
                                      onClick={() => handleProjectSelect(project)}
                                      className={cn(
                                        "flex items-center justify-between w-full px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-all",
                                        menuData.selectedProject?.id === project.id && "bg-white/10 ring-1 ring-primary/50"
                                      )}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                          {project.name.charAt(0)}
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-white">{project.name}</div>
                                          <div className="text-xs text-white/60">{project.status || 'active'}</div>
                                        </div>
                                      </div>
                                      {menuData.selectedProject?.id === project.id && (
                                        <Check className="w-4 h-4 text-primary" />
                                      )}
                                    </button>
                                  ))
                                ) : (
                                  <div className="text-center py-8">
                                    <FolderOpen className="w-8 h-8 text-white/40 mx-auto mb-2" />
                                    <div className="text-sm text-white/60">No projects yet</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Middle & Right Columns - Quick Actions (show when project is selected) */}
                            {menuData.selectedProject && (
                              <div className="col-span-2">
                                <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">QUICK ACCESS</div>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => {
                                      navigate(`/org/${menuData.selectedOrganization.id}/project/${menuData.selectedProject.id}/workflows`)
                                      setShowProjectDropdown(false)
                                    }}
                                    className="flex items-start space-x-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-all group"
                                  >
                                    <Plus className="w-4 h-4 text-cyan-400 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-white">Create Workflow</div>
                                      <div className="text-xs text-white/60">Build automation</div>
                                    </div>
                                  </button>

                                  <button
                                    onClick={() => {
                                      navigate(`/org/${menuData.selectedOrganization.id}/project/${menuData.selectedProject.id}/templates`)
                                      setShowProjectDropdown(false)
                                    }}
                                    className="flex items-start space-x-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-all group"
                                  >
                                    <Sparkles className="w-4 h-4 text-purple-400 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-white">Templates</div>
                                      <div className="text-xs text-white/60">Browse templates</div>
                                    </div>
                                  </button>

                                  <button
                                    onClick={() => {
                                      navigate(`/org/${menuData.selectedOrganization.id}/integrations`)
                                      setShowProjectDropdown(false)
                                    }}
                                    className="flex items-start space-x-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-all group"
                                  >
                                    <GitBranch className="w-4 h-4 text-blue-400 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-white">Connectors</div>
                                      <div className="text-xs text-white/60">Service integrations</div>
                                    </div>
                                  </button>

                                  <button
                                    onClick={() => {
                                      navigate(`/org/${menuData.selectedOrganization.id}/integrations`)
                                      setShowProjectDropdown(false)
                                    }}
                                    className="flex items-start space-x-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-all group"
                                  >
                                    <Zap className="w-4 h-4 text-green-400 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-white">Integrations</div>
                                      <div className="text-xs text-white/60">Connect services</div>
                                    </div>
                                  </button>

                                  <button
                                    onClick={() => {
                                      navigate(`/org/${menuData.selectedOrganization.id}/project/${menuData.selectedProject.id}/settings`)
                                      setShowProjectDropdown(false)
                                    }}
                                    className="flex items-start space-x-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 transition-all group col-span-2"
                                  >
                                    <Settings className="w-4 h-4 text-gray-400 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-white">Settings</div>
                                      <div className="text-xs text-white/60">Project configuration</div>
                                    </div>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-white/10 mt-4 pt-4">
                            <button
                              onClick={() => {
                                navigate(`/org/${menuData.selectedOrganization.id}/projects/new`)
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

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-1.5 hover:bg-white/10 rounded-lg transition-all"
              >
                <div className="w-8 h-8 rounded-full gradient-secondary flex items-center justify-center text-white font-semibold text-sm">
                  {userInitials}
                </div>
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
                    className="absolute right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl rounded-lg shadow-xl border border-white/10"
                  >
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full gradient-secondary flex items-center justify-center text-white font-semibold">
                          {userInitials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={() => {
                          // Navigate to AI Workflow dashboard if project available
                          if (menuData.selectedOrganization && menuData.selectedProject) {
                            navigate(`/org/${menuData.selectedOrganization.id}/project/${menuData.selectedProject.id}/workflows`)
                          } else if (menuData.selectedOrganization) {
                            navigate(`/org/${menuData.selectedOrganization.id}`)
                          } else {
                            navigate('/orgs')
                          }
                          setShowUserMenu(false)
                        }}
                        className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
                      >
                        <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Dashboard</span>
                      </button>

                      {/* Admin - only visible for admin users */}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            navigate('/admin/users')
                            setShowUserMenu(false)
                          }}
                          className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
                        >
                          <Users className="w-4 h-4 text-purple-400" />
                          <span className="text-sm">Manage Users</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          navigate(buildContextPath(menuData, 'settings/profile'))
                          setShowUserMenu(false)
                        }}
                        className="flex items-center space-x-3 w-full px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Profile Settings</span>
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