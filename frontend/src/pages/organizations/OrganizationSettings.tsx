import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  AlertTriangle,
  Save,
  Trash2,
  Building,
  Shield
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { GlassCard } from '../../components/ui/GlassCard'
import { cn } from '../../lib/utils'
import { organizationApi } from '../../lib/api/organization'

interface Organization {
  id: string
  name: string
  description?: string
  slug: string
  isActive: boolean
  ownerId: string
  createdAt: string
  updatedAt: string
}

export const OrganizationSettings: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'general' | 'danger'>('general')

  // State
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  // Fetch organization data
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!organizationId) return

      try {
        setLoading(true)
        const data = await organizationApi.getOrganizationDetails(organizationId) as { organization?: Record<string, unknown>; name?: string; description?: string }

        const org = data.organization || data
        setOrganization(org)
        setFormData({
          name: org.name || '',
          description: org.description || ''
        })
      } catch (err: unknown) {
        console.error('Failed to load organization:', err)
        toast.error('Failed to load organization settings')
      } finally {
        setLoading(false)
      }
    }

    fetchOrganization()
  }, [organizationId])

  const handleSaveProfile = async () => {
    if (!organizationId) return

    try {
      setSaving(true)
      await organizationApi.updateOrganization(organizationId, formData)
      toast.success('Organization updated successfully')

      // Refresh data
      const data = await organizationApi.getOrganizationDetails(organizationId) as { organization?: Record<string, unknown>; name?: string; description?: string }
      const org = data.organization || data
      setOrganization(org)
    } catch (err: unknown) {
      console.error('Failed to update organization:', err)
      const errObj = err as { response?: { data?: { message?: string } } }
      toast.error(errObj.response?.data?.message || 'Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOrganization = async () => {
    if (!organizationId || !organization) return

    if (deleteConfirmName !== organization.name) {
      toast.error('Organization name does not match')
      return
    }

    try {
      setDeleting(true)
      await organizationApi.deleteOrganization(organizationId)
      toast.success('Organization deleted successfully')

      // Navigate to home or organizations list
      navigate('/')
    } catch (err: unknown) {
      console.error('Failed to delete organization:', err)
      const errObj = err as { response?: { data?: { message?: string } } }
      toast.error(errObj.response?.data?.message || 'Failed to delete organization')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Building },
    { id: 'danger' as const, label: 'Danger Zone', icon: AlertTriangle }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center text-white">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent mb-4" />
            <p>Loading organization settings...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto text-center text-white">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold mb-2">Organization Not Found</h2>
          <p className="text-gray-400">The organization you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Organization Settings</h1>
          </div>
          <p className="text-gray-400">
            Manage your organization profile and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        {activeTab === 'general' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Organization Profile</h3>

                  <div className="space-y-4">
                    {/* Organization Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        placeholder="Enter organization name"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                        placeholder="Describe your organization"
                      />
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Organization ID
                        </label>
                        <p className="text-white font-mono text-sm">{organization.id}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Created At
                        </label>
                        <p className="text-white text-sm">
                          {new Date(organization.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {activeTab === 'danger' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-6 border-red-500/20">
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Danger Zone</h3>
                    <p className="text-gray-400 text-sm">
                      Irreversible and destructive actions
                    </p>
                  </div>
                </div>

                {!showDeleteConfirm ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">Delete Organization</h4>
                        <p className="text-gray-400 text-sm mb-4">
                          Once you delete an organization, there is no going back. This will permanently delete:
                        </p>
                        <ul className="text-gray-400 text-sm space-y-1 ml-4">
                          <li className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                            <span>All projects and applications</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                            <span>All databases and data</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                            <span>All members and invitations</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                            <span>All API keys and configurations</span>
                          </li>
                        </ul>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ml-4"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Organization</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <h4 className="text-white font-semibold mb-4">Confirm Deletion</h4>
                    <p className="text-gray-300 mb-4">
                      Please type <span className="font-mono font-bold text-white">{organization.name}</span> to confirm deletion:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-red-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors mb-4"
                      placeholder={organization.name}
                    />
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmName('')
                        }}
                        className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteOrganization}
                        disabled={deleting || deleteConfirmName !== organization.name}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{deleting ? 'Deleting...' : 'I understand, delete this organization'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  )
}
