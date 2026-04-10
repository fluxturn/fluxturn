import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, ArrowLeft } from 'lucide-react'
import { GlassCard } from '../../components/ui/GlassCard'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { toast } from 'sonner'

export const CreateOrganizationSimple: React.FC = () => {
  const navigate = useNavigate()
  const { switchOrganization } = useOrganization()
  const { refreshOrganizations } = useAuth()
  
  const [orgName, setOrgName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orgName.trim()) {
      setError('Organization name is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await api.post('/organization/create', {
        name: orgName,
        projectName: 'Main Project'
      })

      const organizationId = response?.organizationId || response?.data?.organizationId

      if (organizationId) {
        // Refresh the organizations list in AuthContext
        await refreshOrganizations()

        // Switch to the new organization in context
        await switchOrganization(organizationId)

        // Show success toast
        toast.success(`Organization "${orgName}" created successfully!`)

        // Navigate to organizations list to see the new org
        // This forces OrganizationList to remount and fetch fresh data
        navigate('/orgs')
      } else {
        throw new Error('Failed to create organization')
      }
    } catch (error: unknown) {
      console.error('Error creating organization:', error)

      // Parse error message for user-friendly display
      let errorMessage = 'Failed to create organization. Please try again.';
      const errMsg = error instanceof Error ? error.message : '';

      if (errMsg) {
        if (errMsg.includes('already have an organization named') ||
            errMsg.includes('already exists')) {
          errorMessage = `An organization with the name "${orgName}" already exists. Please choose a different name.`;
        } else if (errMsg.includes('duplicate key')) {
          errorMessage = 'This organization name is already taken. Please choose a different name.';
        } else if (errMsg.includes('constraint')) {
          errorMessage = 'This organization name is already in use. Please try another name.';
        } else {
          // Use the server's error message if it's reasonably user-friendly
          errorMessage = errMsg;
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Create Organization</h1>
                  <p className="text-sm text-white/60">Set up your new organization</p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label htmlFor="orgName" className="block text-sm font-medium text-white/80 mb-2">
                    Organization Name
                  </label>
                  <input
                    id="orgName"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Enter your organization name"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                    disabled={isSubmitting}
                    autoFocus
                  />
                  {error && (
                    <p className="mt-2 text-sm text-red-400">{error}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="px-6 py-2.5 text-white/60 hover:text-white transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Organization'}
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}