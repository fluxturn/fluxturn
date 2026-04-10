import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FolderOpen, ArrowLeft } from 'lucide-react'
import { GlassCard } from '../../components/ui/GlassCard'
import { api } from '../../lib/api'
import { extractRouteContext } from '../../lib/navigation-utils';

export const CreateProjectSimple: React.FC = () => {
  const navigate = useNavigate()
  const params = useParams();
  const { organizationId } = extractRouteContext(params);
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!projectName.trim()) {
      setError('Project name is required')
      return
    }

    if (!organizationId) {
      setError('You must be in an organization to create projects')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await api.post('/project/create', {
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        organizationId: organizationId,
      })

      const projectId = response?.projectId || response?.data?.projectId
      
      if (projectId) {
        // Navigate to the project dashboard
        navigate(`/org/${organizationId}/project/${projectId}`)
      } else {
        throw new Error('Failed to create project')
      }
    } catch (error: unknown) {
      console.error('Error creating project:', error)

      // The server now sends user-friendly error messages
      let errorMessage = error instanceof Error ? error.message : 'Failed to create project. Please try again.';
      
      // Additional client-side handling for specific cases
      if (errorMessage.includes('already exists') || errorMessage.includes('already taken')) {
        // Server message is already user-friendly, use it as-is
      } else if (errorMessage.includes('duplicate key')) {
        errorMessage = `A project named "${projectName}" already exists in this organization. Please choose a different name.`;
      } else if (errorMessage.includes('constraint')) {
        errorMessage = `This project name is already in use. Please try another name.`;
      } else if (errorMessage === 'API request failed' || errorMessage === 'Network error occurred') {
        errorMessage = 'Failed to create project. Please check your connection and try again.';
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
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Create Project</h1>
                  <p className="text-sm text-white/60">Set up your new project in {'your organization'}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label htmlFor="projectName" className="block text-sm font-medium text-white/80 mb-2">
                    Project Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="projectName"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter your project name"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="projectDescription" className="block text-sm font-medium text-white/80 mb-2">
                    Description <span className="text-white/40">(optional)</span>
                  </label>
                  <textarea
                    id="projectDescription"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Brief description of your project..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {error && (
                  <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

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
                    disabled={isSubmitting || !projectName.trim()}
                    className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Project'}
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