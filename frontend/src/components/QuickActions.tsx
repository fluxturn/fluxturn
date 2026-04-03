import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Database,
  HardDrive,
  Shield,
  Mail,
  List,
  Brain,
  Workflow,
  BarChart3,
  FileText,
  Cloud,
  Lock,
  Zap,
  Globe,
  Terminal,
  Settings,
  Sparkles
} from 'lucide-react'

interface QuickActionsProps {
  level: 'organization' | 'project'
  organizationId: string
  projectId?: string
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  level,
  organizationId,
  projectId
}) => {
  const navigate = useNavigate()

  const getBasePath = () => {
    if (level === 'organization') {
      return `/org/${organizationId}`
    }
    if (level === 'project' && projectId) {
      return `/org/${organizationId}/project/${projectId}`
    }
    return `/org/${organizationId}`
  }

  const basePath = getBasePath()

  // Organization level quick actions
  const orgQuickActions = [
    {
      id: 'create-project',
      title: 'Create Project',
      description: 'Start a new project',
      icon: Zap,
      color: 'from-green-500 to-green-600',
      path: `${basePath}/projects/new`,
      enabled: true
    },
    {
      id: 'view-projects',
      title: 'View Projects',
      description: 'Browse all projects',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      path: `${basePath}/projects`,
      enabled: true
    },
    {
      id: 'team',
      title: 'Team Members',
      description: 'Manage team access',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      path: `${basePath}/members`,
      enabled: true
    },
    {
      id: 'billing',
      title: 'Billing',
      description: 'Subscription & usage',
      icon: BarChart3,
      color: 'from-orange-500 to-orange-600',
      path: `${basePath}/billing`,
      enabled: true
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Connected services',
      icon: Globe,
      color: 'from-pink-500 to-pink-600',
      path: `${basePath}/integrations`,
      enabled: true
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Organization settings',
      icon: Settings,
      color: 'from-gray-500 to-gray-600',
      path: `${basePath}/settings`,
      enabled: true
    }
  ]

  // Project level quick actions (Fluxturn is workflow-focused)
  const projectQuickActions = [
    {
      id: 'workflows',
      title: 'AI Workflow',
      description: 'Build automation flows',
      icon: Workflow,
      color: 'from-teal-500 to-teal-600',
      path: `${basePath}/workflows`,
      enabled: true
    },
    {
      id: 'templates',
      title: 'Templates',
      description: 'Browse workflow templates',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-600',
      path: `${basePath}/templates`,
      enabled: true
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Project settings',
      icon: Settings,
      color: 'from-slate-500 to-slate-600',
      path: `${basePath}/settings`,
      enabled: true
    }
  ]

  // Choose the right set of actions based on level
  const actionsToShow = level === 'organization' ? orgQuickActions : projectQuickActions
  const enabledActions = actionsToShow.filter(action => action.enabled)

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Quick Actions</h2>
        <p className="text-gray-400">
          {level === 'organization'
            ? 'Manage your organization resources'
            : 'Build and manage workflow automation'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {enabledActions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <button
              onClick={() => navigate(action.path)}
              className="w-full group relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-md border border-white/10 p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              {/* Gradient background on hover */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
              />
              
              {/* Icon */}
              <div className={`relative w-12 h-12 mx-auto mb-3 rounded-lg bg-gradient-to-br ${action.color} p-2.5 group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className="w-full h-full text-white" />
              </div>
              
              {/* Title */}
              <h3 className="relative text-sm font-semibold text-white mb-1 group-hover:text-white transition-colors">
                {action.title}
              </h3>
              
              {/* Description */}
              <p className="relative text-xs text-gray-400 group-hover:text-gray-300 transition-colors line-clamp-2">
                {action.description}
              </p>

              {/* Corner indicator */}
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Active Services</p>
              <p className="text-xl font-bold text-white">{enabledActions.length}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">API Calls Today</p>
              <p className="text-xl font-bold text-white">1.2k</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Storage Used</p>
              <p className="text-xl font-bold text-white">45.2 GB</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Active Users</p>
              <p className="text-xl font-bold text-white">127</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Lock className="w-4 h-4 text-orange-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}