import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FolderOpen, 
  Users, 
  Calendar,
  Activity,
  MoreVertical,
  ExternalLink,
  Settings,
  Eye,
  Trash2,
  Play,
  BarChart3,
  GitBranch,
  Globe,
  Database,
  Zap
} from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { cn } from '../../lib/utils'

interface ProjectCardProps {
  project: {
    id: string
    name: string
    description: string
    status: 'active' | 'completed' | 'paused' | 'archived'
    type: 'web' | 'mobile' | 'api' | 'desktop'
    techStack: string[]
    appCount: number
    memberCount: number
    deploymentStatus: 'deployed' | 'deploying' | 'failed' | 'pending'
    lastCommit: {
      message: string
      author: string
      time: string
      hash: string
    }
    previewImage?: string
    createdAt: string
    updatedAt: string
    organization: {
      id: string
      name: string
    }
  }
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onDeploy?: (id: string) => void
  onAnalytics?: (id: string) => void
  className?: string
}

const techStackColors: Record<string, string> = {
  'React': 'bg-blue-500/20 text-blue-400 border-blue-400/20',
  'Vue': 'bg-green-500/20 text-green-400 border-green-400/20',
  'Angular': 'bg-red-500/20 text-red-400 border-red-400/20',
  'Flutter': 'bg-cyan-500/20 text-cyan-400 border-cyan-400/20',
  'React Native': 'bg-purple-500/20 text-purple-400 border-purple-400/20',
  'Node.js': 'bg-lime-500/20 text-lime-400 border-lime-400/20',
  'NestJS': 'bg-pink-500/20 text-pink-400 border-pink-400/20',
  'Express': 'bg-gray-500/20 text-gray-400 border-gray-400/20',
  'Python': 'bg-yellow-500/20 text-yellow-400 border-yellow-400/20',
  'TypeScript': 'bg-indigo-500/20 text-indigo-400 border-indigo-400/20',
  'JavaScript': 'bg-orange-500/20 text-orange-400 border-orange-400/20',
  'PostgreSQL': 'bg-teal-500/20 text-teal-400 border-teal-400/20',
  'MongoDB': 'bg-emerald-500/20 text-emerald-400 border-emerald-400/20',
  'Redis': 'bg-red-600/20 text-red-300 border-red-600/20',
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onView,
  onEdit,
  onDelete,
  onDeploy,
  onAnalytics,
  className
}) => {
  const [showActions, setShowActions] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-400/20 border-green-400/20'
      case 'completed':
        return 'text-blue-400 bg-blue-400/20 border-blue-400/20'
      case 'paused':
        return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/20'
      case 'archived':
        return 'text-gray-400 bg-gray-400/20 border-gray-400/20'
      default:
        return 'text-gray-400 bg-gray-400/20 border-gray-400/20'
    }
  }

  const getDeploymentStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'text-green-400 bg-green-400/20'
      case 'deploying':
        return 'text-blue-400 bg-blue-400/20'
      case 'failed':
        return 'text-red-400 bg-red-400/20'
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/20'
      default:
        return 'text-gray-400 bg-gray-400/20'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'web':
        return <Globe className="w-4 h-4" />
      case 'mobile':
        return <Activity className="w-4 h-4" />
      case 'api':
        return <Database className="w-4 h-4" />
      case 'desktop':
        return <FolderOpen className="w-4 h-4" />
      default:
        return <FolderOpen className="w-4 h-4" />
    }
  }

  return (
    <GlassCard 
      className={cn("relative group overflow-hidden", className)}
      hover={true}
      glow={true}
    >
      {/* Preview Image */}
      {project.previewImage && (
        <div className="h-48 -m-6 mb-4 overflow-hidden rounded-t-xl">
          <img 
            src={project.previewImage} 
            alt={`${project.name} preview`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/60" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
            {getTypeIcon(project.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-semibold truncate">{project.name}</h3>
              <span className={cn(
                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border capitalize",
                getStatusColor(project.status)
              )}>
                {project.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{project.organization.name}</p>
          </div>
        </div>
        
        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 glass rounded-lg border border-white/10 py-2 z-10"
            >
              {onView && (
                <button
                  onClick={() => onView(project.id)}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              )}
              {onDeploy && (
                <button
                  onClick={() => onDeploy(project.id)}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Deploy</span>
                </button>
              )}
              {onAnalytics && (
                <button
                  onClick={() => onAnalytics(project.id)}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center space-x-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(project.id)}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(project.id)}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center space-x-2 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {project.description}
      </p>

      {/* Tech Stack */}
      <div className="flex flex-wrap gap-2 mb-4">
        {project.techStack.slice(0, 3).map((tech) => (
          <span
            key={tech}
            className={cn(
              "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border",
              techStackColors[tech] || techStackColors['JavaScript']
            )}
          >
            {tech}
          </span>
        ))}
        {project.techStack.length > 3 && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-400/20">
            +{project.techStack.length - 3}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-muted-foreground">Apps</span>
          </div>
          <p className="text-lg font-semibold">{project.appCount}</p>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-teal-400" />
            <span className="text-sm text-muted-foreground">Members</span>
          </div>
          <p className="text-lg font-semibold">{project.memberCount}</p>
        </div>
      </div>

      {/* Deployment Status */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-white/5">
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            project.deploymentStatus === 'deploying' ? 'animate-pulse' : '',
            getDeploymentStatusColor(project.deploymentStatus)
          )} />
          <span className="text-sm font-medium capitalize">{project.deploymentStatus}</span>
        </div>
        {project.deploymentStatus === 'deployed' && (
          <button className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1">
            <ExternalLink className="w-3 h-3" />
            <span>View Live</span>
          </button>
        )}
      </div>

      {/* Last Commit */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-muted-foreground">Latest Commit</span>
        </div>
        <div className="pl-6 space-y-1">
          <p className="text-sm font-medium line-clamp-1">{project.lastCommit.message}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>by {project.lastCommit.author}</span>
            <span>{project.lastCommit.time}</span>
          </div>
          <code className="text-xs text-cyan-400 font-mono">{project.lastCommit.hash}</code>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs text-muted-foreground">
        <div className="flex items-center space-x-1">
          <Calendar className="w-3 h-3" />
          <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>
        <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Quick Actions - Visible on Hover */}
      <div className="absolute bottom-4 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all">
        {onDeploy && project.deploymentStatus !== 'deploying' && (
          <motion.button
            onClick={() => onDeploy(project.id)}
            className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Play className="w-4 h-4" />
          </motion.button>
        )}
        {onAnalytics && (
          <motion.button
            onClick={() => onAnalytics(project.id)}
            className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <BarChart3 className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </GlassCard>
  )
}