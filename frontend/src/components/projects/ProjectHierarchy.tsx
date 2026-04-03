import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  FolderOpen, 
  Smartphone,
  Search,
  X
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { GlassCard } from '../ui/GlassCard'

interface BreadcrumbItem {
  id: string
  name: string
  type: 'organization' | 'project' | 'app'
  path: string
}

interface ProjectHierarchyProps {
  breadcrumbs: BreadcrumbItem[]
  currentOrganization?: {
    id: string
    name: string
    projects: Array<{
      id: string
      name: string
      type: 'web' | 'mobile' | 'api' | 'desktop'
      status: 'active' | 'paused' | 'completed' | 'archived'
    }>
  }
  currentProject?: {
    id: string
    name: string
    apps: Array<{
      id: string
      name: string
      type: 'web' | 'mobile' | 'api' | 'desktop'
      status: 'active' | 'paused' | 'completed' | 'archived'
    }>
  }
  onNavigate: (item: BreadcrumbItem) => void
  onProjectSwitch: (projectId: string) => void
  onAppSwitch?: (appId: string) => void
  className?: string
}

export const ProjectHierarchy: React.FC<ProjectHierarchyProps> = ({
  breadcrumbs,
  currentOrganization,
  currentProject,
  onNavigate,
  onProjectSwitch,
  onAppSwitch,
  className
}) => {
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false)
  const [showAppSwitcher, setShowAppSwitcher] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const getItemIcon = (type: string, itemType?: string) => {
    if (type === 'organization') {
      return <Building2 className="w-4 h-4" />
    }
    if (type === 'project') {
      return <FolderOpen className="w-4 h-4" />
    }
    if (type === 'app') {
      switch (itemType) {
        case 'mobile':
          return <Smartphone className="w-4 h-4" />
        default:
          return <FolderOpen className="w-4 h-4" />
      }
    }
    return <FolderOpen className="w-4 h-4" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-400'
      case 'paused':
        return 'bg-yellow-400'
      case 'completed':
        return 'bg-blue-400'
      case 'archived':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  const filteredProjects = currentOrganization?.projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const filteredApps = currentProject?.apps.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <button
              onClick={() => onNavigate(item)}
              className={cn(
                "flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all",
                index === breadcrumbs.length - 1
                  ? "text-cyan-400 bg-cyan-400/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {getItemIcon(item.type)}
              <span className="font-medium">{item.name}</span>
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Context-Aware Switchers */}
      <div className="flex items-center space-x-4">
        {/* Project Switcher */}
        {currentOrganization && (
          <div className="relative">
            <button
              onClick={() => setShowProjectSwitcher(!showProjectSwitcher)}
              className="flex items-center space-x-2 px-4 py-2 glass rounded-lg hover:bg-white/10 transition-all"
            >
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              <span className="font-medium">
                {currentProject ? currentProject.name : 'Select Project'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showProjectSwitcher && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 mt-2 z-50"
                >
                  <GlassCard className="w-80 max-h-96 overflow-hidden">
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Project List */}
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {filteredProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => {
                            onProjectSwitch(project.id)
                            setShowProjectSwitcher(false)
                            setSearchTerm('')
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg transition-all text-left",
                            currentProject?.id === project.id
                              ? "bg-cyan-400/20 text-cyan-400"
                              : "hover:bg-white/5"
                          )}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                              {getItemIcon('project', project.type)}
                            </div>
                            <div>
                              <p className="font-medium">{project.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {project.type} • {project.status}
                              </p>
                            </div>
                          </div>
                          <div className={cn("w-2 h-2 rounded-full", getStatusColor(project.status))} />
                        </button>
                      ))}
                      {filteredProjects.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No projects found</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* App Switcher */}
        {currentProject && onAppSwitch && (
          <div className="relative">
            <button
              onClick={() => setShowAppSwitcher(!showAppSwitcher)}
              className="flex items-center space-x-2 px-4 py-2 glass rounded-lg hover:bg-white/10 transition-all"
            >
              <Smartphone className="w-4 h-4 text-teal-400" />
              <span className="font-medium">Apps ({currentProject.apps.length})</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {showAppSwitcher && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 mt-2 z-50"
                >
                  <GlassCard className="w-80 max-h-96 overflow-hidden">
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search apps..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* App List */}
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {filteredApps.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => {
                            onAppSwitch(app.id)
                            setShowAppSwitcher(false)
                            setSearchTerm('')
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                              {getItemIcon('app', app.type)}
                            </div>
                            <div>
                              <p className="font-medium">{app.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {app.type} • {app.status}
                              </p>
                            </div>
                          </div>
                          <div className={cn("w-2 h-2 rounded-full", getStatusColor(app.status))} />
                        </button>
                      ))}
                      {filteredApps.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No apps found</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Close switchers when clicking outside */}
      {(showProjectSwitcher || showAppSwitcher) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowProjectSwitcher(false)
            setShowAppSwitcher(false)
            setSearchTerm('')
          }}
        />
      )}
    </div>
  )
}