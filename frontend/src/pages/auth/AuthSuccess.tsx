import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslation } from 'react-i18next'

import { api } from '../../lib/api'
import { AuthLayout } from "../../components/layout/AuthLayout"

export const AuthSuccess: React.FC = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const hasProcessed = useRef(false)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    // Prevent multiple executions using a ref
    if (hasProcessed.current) {
      return
    }

    const handleAuthSuccess = async () => {
      hasProcessed.current = true
      const token = searchParams.get('token')
      const refreshToken = searchParams.get('refreshToken')

      if (!token || !refreshToken) {
        // No token found, redirect to login
        // console.log('No auth tokens found, redirecting to login')
        navigate('/login', { replace: true })
        return
      }

      // Store tokens with correct key names
      localStorage.setItem('accessToken', token) // Changed from 'authToken' to 'accessToken'
      localStorage.setItem('refreshToken', refreshToken)

      // Clear any stale OAuth return URLs from sessionStorage
      sessionStorage.removeItem('oauth_return_url');
      sessionStorage.removeItem('oauth_return_path');

      // Set token in API client
      api.setToken(token)

      try {
        // Try to refresh user data from the API
        // This might fail if the token structure is different, but that's okay
        try {
          await refreshUser()
        } catch (userError) {
          // console.log('Could not refresh user data, continuing with token data');
        }

        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 500))

        // Smart redirect based on stored organization/project
        const storedOrgId = localStorage.getItem('selectedOrganizationId');
        const storedProjectId = localStorage.getItem('selectedProjectId');

        if (storedOrgId && storedProjectId) {
          navigate(`/org/${storedOrgId}/project/${storedProjectId}`, { replace: true })
        } else if (storedOrgId) {
          navigate(`/org/${storedOrgId}`, { replace: true })
        } else {
          navigate('/orgs', { replace: true })
        }
      } catch (error) {
        console.error('Error during auth success flow:', error)
        // Even if there's an error, if we have tokens, redirect based on stored context
        setTimeout(() => {
          const storedOrgId = localStorage.getItem('selectedOrganizationId');
          const storedProjectId = localStorage.getItem('selectedProjectId');

          if (storedOrgId && storedProjectId) {
            navigate(`/org/${storedOrgId}/project/${storedProjectId}`, { replace: true })
          } else if (storedOrgId) {
            navigate(`/org/${storedOrgId}`, { replace: true })
          } else {
            navigate('/orgs', { replace: true })
          }
        }, 1000)
      } finally {
        setIsProcessing(false)
      }
    }

    handleAuthSuccess()
  }, [])

  return (
    <AuthLayout>
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center space-y-6">
            {/* Logo */}
            <Link to="/" className="flex flex-col items-center justify-center mb-2">
              <img
                src="/logo.png"
                alt="FluxTurn Logo"
                className="w-12 h-12 object-contain mb-2"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                FluxTurn
              </h1>
            </Link>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-gray-900" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.authSuccess.title')}</h2>
              <p className="text-gray-600">
                {t('auth.authSuccess.message')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  )
}