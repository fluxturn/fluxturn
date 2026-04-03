import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { XCircle, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import { AuthLayout } from "../../components/layout/AuthLayout"

export const AuthError: React.FC = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setErrorMessage(decodeURIComponent(message))
    } else {
      setErrorMessage(t('auth.authError.defaultMessage'))
    }

    // Auto-redirect to login after 5 seconds
    const timer = setTimeout(() => {
      navigate('/login')
    }, 5000)

    return () => clearTimeout(timer)
  }, [searchParams, navigate, t])

  const handleReturnToLogin = () => {
    navigate('/login')
  }

  return (
    <AuthLayout>
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-6">
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
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-gray-900" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.authError.title')}</h2>
              <p className="text-gray-600 mb-4">
                {errorMessage}
              </p>
              <p className="text-gray-500 text-sm">
                {t('auth.authError.redirectMessage')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={handleReturnToLogin}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium py-2 px-6 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('auth.authError.returnToLogin')}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center space-y-2"
            >
              <p className="text-gray-500 text-sm">
                {t('auth.authError.havingTrouble')}
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  to="/register"
                  className="text-cyan-600 hover:text-cyan-700 text-sm font-medium transition-colors"
                >
                  {t('auth.authError.createAccount')}
                </Link>
                <Link
                  to="/forgot-password"
                  className="text-cyan-600 hover:text-cyan-700 text-sm font-medium transition-colors"
                >
                  {t('auth.authError.resetPassword')}
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  )
}