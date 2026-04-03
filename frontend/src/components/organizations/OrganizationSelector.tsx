import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  Building2, 
  Search, 
  Plus,
  Check,
  ArrowRight
} from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { cn } from '../../lib/utils'

interface Organization {
  id: string
  name: string
  description: string
  logo?: string
  memberCount: number
  status: 'active' | 'suspended' | 'pending'
}

interface OrganizationSelectorProps {
  currentOrganization: Organization
  organizations: Organization[]
  onSelect: (organization: Organization) => void
  onCreateNew?: () => void
  className?: string
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  currentOrganization,
  organizations,
  onSelect,
  onCreateNew,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-400'
      case 'suspended':
        return 'bg-red-400'
      case 'pending':
        return 'bg-yellow-400'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className={cn("relative", className)}>
      {/* Current Organization Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 glass hover:bg-white/10 rounded-xl transition-all duration-300 group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {currentOrganization.logo ? (
              <img 
                src={currentOrganization.logo} 
                alt={`${currentOrganization.name} logo`}
                className="w-8 h-8 rounded-lg object-cover border border-white/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="text-left">
              <p className="font-medium text-sm">{currentOrganization.name}</p>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  getStatusColor(currentOrganization.status)
                )} />
                <span className="text-xs text-muted-foreground capitalize">
                  {currentOrganization.status}
                </span>
              </div>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </motion.div>
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 left-0 right-0 z-50"
            >
              <GlassCard hover={false} className="p-0 overflow-hidden">
                {/* Search */}
                <div className="p-4 border-b border-white/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search organizations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all"
                    />
                  </div>
                </div>

                {/* Organizations List */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredOrganizations.map((org) => (
                    <motion.button
                      key={org.id}
                      onClick={() => {
                        onSelect(org)
                        setIsOpen(false)
                        setSearchQuery('')
                      }}
                      className="w-full p-4 hover:bg-white/5 transition-all duration-200 group border-b border-white/5 last:border-b-0"
                      whileHover={{ x: 5 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {org.logo ? (
                            <img 
                              src={org.logo} 
                              alt={`${org.name} logo`}
                              className="w-10 h-10 rounded-lg object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div className="text-left flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium">{org.name}</p>
                              {org.id === currentOrganization.id && (
                                <Check className="w-4 h-4 text-cyan-400" />
                              )}
                            </div>
                            <div className="flex items-center space-x-3 mt-1">
                              <div className="flex items-center space-x-1">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  getStatusColor(org.status)
                                )} />
                                <span className="text-xs text-muted-foreground capitalize">
                                  {org.status}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {org.memberCount} members
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {org.description}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.button>
                  ))}

                  {filteredOrganizations.length === 0 && searchQuery && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No organizations found</p>
                      <p className="text-sm">Try adjusting your search terms</p>
                    </div>
                  )}
                </div>

                {/* Create New Organization */}
                {onCreateNew && (
                  <div className="p-4 border-t border-white/10">
                    <motion.button
                      onClick={() => {
                        onCreateNew()
                        setIsOpen(false)
                        setSearchQuery('')
                      }}
                      className="w-full p-3 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 hover:from-cyan-400/30 hover:to-blue-500/30 border border-cyan-400/30 rounded-lg transition-all duration-200 group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <Plus className="w-4 h-4 text-cyan-400" />
                        <span className="font-medium text-cyan-400">Create New Organization</span>
                      </div>
                    </motion.button>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}