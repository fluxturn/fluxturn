import React from 'react'
import { motion } from 'framer-motion'
import { 
  Building2, 
  Users, 
  FolderOpen, 
  HardDrive,
  MoreVertical,
  Settings,
  Eye,
  Trash2
} from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { cn } from '../../lib/utils'

interface OrganizationCardProps {
  organization: {
    id: string
    name: string
    description: string
    logo?: string
    projectCount: number
    memberCount: number
    storageUsed: number
    storageLimit: number
    createdAt: string
    status: 'active' | 'suspended' | 'pending'
  }
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

export const OrganizationCard: React.FC<OrganizationCardProps> = ({
  organization,
  onView,
  onEdit,
  onDelete,
  className
}) => {
  const [showActions, setShowActions] = React.useState(false)
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger onView if clicking on the card itself, not on action buttons
    if (e.target === e.currentTarget || !(e.target as Element).closest('.action-button')) {
      onView?.(organization.id)
    }
  }
  const storagePercentage = (organization.storageUsed / organization.storageLimit) * 100

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(1)} GB`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-400/20'
      case 'suspended':
        return 'text-red-400 bg-red-400/20'
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/20'
      default:
        return 'text-gray-400 bg-gray-400/20'
    }
  }

  return (
    <GlassCard 
      className={cn("relative group cursor-pointer", className)}
      hover={true}
      glow={true}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {organization.logo ? (
            <img 
              src={organization.logo} 
              alt={`${organization.name} logo`}
              className="w-12 h-12 rounded-xl object-cover border border-white/10"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold">{organization.name}</h3>
            <span className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize",
              getStatusColor(organization.status)
            )}>
              {organization.status}
            </span>
          </div>
        </div>
        
        {/* Actions Menu */}
        <div className="relative action-button">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowActions(!showActions)
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 action-button"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 glass rounded-lg border border-white/10 py-2 z-10 action-button"
            >
              {onView && (
                <button
                  onClick={(e) => { e.stopPropagation(); onView(organization.id); }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center space-x-2 action-button"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(organization.id); }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center space-x-2 action-button"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(organization.id); }}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-white/10 flex items-center space-x-2 text-red-400 action-button"
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
      <p className="text-sm text-muted-foreground mb-6 line-clamp-2">
        {organization.description}
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-muted-foreground">Projects</span>
          </div>
          <p className="text-xl font-semibold">{organization.projectCount}</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-teal-400" />
            <span className="text-sm text-muted-foreground">Members</span>
          </div>
          <p className="text-xl font-semibold">{organization.memberCount}</p>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-muted-foreground">Storage</span>
          </div>
          <span className="text-sm font-medium">
            {formatStorage(organization.storageUsed)} / {formatStorage(organization.storageLimit)}
          </span>
        </div>
        
        <div className="w-full bg-white/10 rounded-full h-2">
          <motion.div
            className={cn(
              "h-2 rounded-full transition-all duration-500",
              storagePercentage > 90 ? "bg-red-400" :
              storagePercentage > 70 ? "bg-yellow-400" :
              "bg-gradient-to-r from-cyan-400 to-blue-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${storagePercentage}%` }}
            transition={{ duration: 1, delay: 0.2 }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-white/10 text-xs text-muted-foreground">
        Created {new Date(organization.createdAt).toLocaleDateString()}
      </div>

      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </GlassCard>
  )
}