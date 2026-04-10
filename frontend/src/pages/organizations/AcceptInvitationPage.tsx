import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, CheckCircle, AlertTriangle, Users } from 'lucide-react'
import { toast } from 'sonner'
import { organizationApi } from '../../lib/api/organization'
import { useAuth } from '../../contexts/AuthContext'

export const AcceptInvitationPage = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [invitation, setInvitation] = useState<{ email: string; organizationName?: string; organizationId?: string; role?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link')
        setLoading(false)
        return
      }

      try {
        const data = await organizationApi.getInvitationByToken(token)
        setInvitation(data)

        // Check if user is authenticated and email matches
        if (isAuthenticated && user && user.email !== data.email) {
          setError(`This invitation was sent to ${data.email}. Please log in with that email address or log out first.`)
        }
      } catch (err: unknown) {
        console.error('Failed to fetch invitation:', err)

        // If user is already logged in and invitation is invalid/expired,
        // they might have already accepted it - redirect to organizations
        if (isAuthenticated) {
          toast.info('Redirecting to your organizations...')
          setTimeout(() => {
            navigate('/orgs')
          }, 1500)
          return
        }

        const errObj = err as { response?: { data?: { message?: string } } }
        setError(errObj.response?.data?.message || 'Invalid or expired invitation')
        toast.error('Invalid or expired invitation')
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [token, isAuthenticated, user, navigate])

  const handleAccept = async () => {
    if (!token) return

    // Check authentication
    if (!isAuthenticated) {
      // Store invitation token in localStorage
      localStorage.setItem('pendingInvitation', token)
      toast.info('Please log in to accept this invitation')
      navigate(`/login?redirect=/invite/${token}`)
      return
    }

    // Verify email matches
    if (user && invitation && user.email !== invitation.email) {
      toast.error(`This invitation is for ${invitation.email}. Please log in with that email.`)
      return
    }

    try {
      setAccepting(true)
      const response = await organizationApi.acceptInvitation(token, user?.id)
      toast.success('Invitation accepted! Redirecting...')

      // Refresh organizations (if you have this in AuthContext)
      // await refreshOrganizations()

      // Redirect to organization page
      setTimeout(() => {
        if (response.organizationId) {
          navigate(`/org/${response.organizationId}/projects`)
        } else {
          navigate('/organizations')
        }
      }, 1500)
    } catch (err: unknown) {
      console.error('Failed to accept invitation:', err)
      const errObj = err as { response?: { data?: { message?: string } } }
      const errorMsg = errObj.response?.data?.message || 'Failed to accept invitation'

      // If error says user needs to log in
      if (errorMsg.toLowerCase().includes('log in') || errorMsg.toLowerCase().includes('account')) {
        localStorage.setItem('pendingInvitation', token)
        toast.error('Please log in or create an account first')
        navigate(`/login?redirect=/invite/${token}`)
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    if (!token) return

    if (!confirm('Are you sure you want to decline this invitation?')) return

    try {
      await organizationApi.declineInvitation(token)
      toast.success('Invitation declined')
      navigate('/')
    } catch (err: unknown) {
      console.error('Failed to decline invitation:', err)
      toast.error('Failed to decline invitation')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white/70">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
          <p className="text-white/70 mb-6">{error || 'This invitation link is invalid or has expired.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-400/25 transition-all"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">You've Been Invited!</h1>
          <p className="text-white/70">Join your team on FluxTurn</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center space-x-3 mb-3">
              <Users className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-white">Organization</h3>
            </div>
            <p className="text-white/90 font-medium">{invitation.organizationName || 'Organization'}</p>
          </div>

          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="font-semibold text-white mb-2">Invitation Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Role:</span>
                <span className="text-white font-medium capitalize">{invitation.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Invited by:</span>
                <span className="text-white font-medium">{invitation.inviterName || invitation.inviterEmail}</span>
              </div>
              {invitation.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-white/70">Expires:</span>
                  <span className="text-white font-medium">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {invitation.message && (
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <h3 className="font-semibold text-white mb-2">Personal Message</h3>
              <p className="text-white/70 text-sm italic">"{invitation.message}"</p>
            </div>
          )}
        </div>

        {!isAuthenticated && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-200 text-sm text-center">
              You need to log in to accept this invitation
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDecline}
            disabled={accepting}
            className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all border border-white/10"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-400/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {accepting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Accepting...</span>
              </>
            ) : !isAuthenticated ? (
              <>
                <Mail className="w-5 h-5" />
                <span>Log In to Accept</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Accept Invitation</span>
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-white/50 mt-6">
          By accepting this invitation, you agree to join this organization and follow their policies.
        </p>
      </motion.div>
    </div>
  )
}

export default AcceptInvitationPage
