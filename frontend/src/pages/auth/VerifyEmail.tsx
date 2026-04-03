import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Mail, CheckCircle, XCircle, RefreshCw, ArrowLeft, Clock } from 'lucide-react'


import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'
import { api } from '../../lib/api'
import { AuthLayout } from "../../components/layout/AuthLayout"
import { useTranslation } from 'react-i18next'

type VerificationState = 'pending' | 'verifying' | 'success' | 'error' | 'resent'

export const VerifyEmail: React.FC = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  
  const [state, setState] = useState<VerificationState>('pending')
  const [isResending, setIsResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  // Auto-verify if token is present
  useEffect(() => {
    if (token) {
      verifyEmail(token)
    }
  }, [token])

  // Countdown timer for resend button
  useEffect(() => {
    if (state === 'resent' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setCanResend(true)
    }
  }, [countdown, state])

  const verifyEmail = async (verificationToken: string) => {
    setState('verifying')
    
    try {
      await api.verifyEmail(verificationToken)
      // console.log('Email verification successful')
      setState('success')
      
      // Auto-navigate to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error: any) {
      console.error('Email verification failed:', error)
      setState('error')
    }
  }

  const handleResendEmail = async () => {
    setIsResending(true)
    
    try {
      if (email) {
        await api.resendVerificationEmail(email)
        // console.log('Verification email resent to:', email)
        setState('resent')
        setCountdown(60)
        setCanResend(false)
      } else {
        throw new Error('Email address is required to resend verification')
      }
    } catch (error: any) {
      console.error('Failed to resend email:', error)
      // You could set an error state here if needed
    } finally {
      setIsResending(false)
    }
  }

  const renderContent = () => {
    switch (state) {
      case 'pending':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/20 mb-4">
              <Mail className="w-8 h-8 text-cyan-400" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.verifyEmail.title')}</h2>
              <p className="text-gray-600 text-sm mb-4">
                {t('auth.verifyEmail.sentTo')}
              </p>
              {email && (
                <p className="text-cyan-600 font-medium break-all mb-4">
                  {email}
                </p>
              )}
              <p className="text-gray-600 text-sm">
                {t('auth.verifyEmail.clickLink')}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4 space-y-4">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-gray-900 text-sm font-medium">{t('auth.verifyEmail.checkEmail')}</p>
                  <p className="text-gray-600 text-xs mt-1">
                    {t('auth.verifyEmail.linkExpires')}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-gray-300 text-sm mb-3">
                  {t('auth.verifyEmail.didntReceive')}
                </p>

                {canResend ? (
                  <Button
                    onClick={handleResendEmail}
                    disabled={isResending}
                    variant="outline"
                    className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/50 transition-all duration-300"
                  >
                    {isResending ? (
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t('auth.verifyEmail.sending')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>{t('auth.verifyEmail.resendEmail')}</span>
                      </div>
                    )}
                  </Button>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full bg-white/5 border-white/10 opacity-50 cursor-not-allowed"
                  >
                    {countdown > 0 ? t('auth.verifyEmail.resendIn', { countdown }) : t('auth.verifyEmail.resendEmail')}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )

      case 'verifying':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/20 mb-4">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.verifyEmail.verifying')}</h2>
              <p className="text-gray-600 text-sm">
                {t('auth.verifyEmail.verifyingMessage')}
              </p>
            </div>

            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-400"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )

      case 'success':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.verifyEmail.verified')}</h2>
              <p className="text-gray-600 text-sm mb-6">
                {t('auth.verifyEmail.verifiedMessage')}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                asChild
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                <Link to="/orgs">{t('auth.verifyEmail.goToDashboard')}</Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/50"
              >
                <Link to="/login">{t('auth.verifyEmail.signIn')}</Link>
              </Button>
            </div>
          </motion.div>
        )

      case 'error':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.verifyEmail.failed')}</h2>
              <p className="text-gray-600 text-sm mb-6">
                {t('auth.verifyEmail.failedMessage')}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                {isResending ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('auth.verifyEmail.sending')}</span>
                  </div>
                ) : (
                  t('auth.verifyEmail.sendNewEmail')
                )}
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/50"
              >
                <Link to="/login">{t('auth.verifyEmail.backToLogin')}</Link>
              </Button>
            </div>
          </motion.div>
        )

      case 'resent':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/20 mb-4">
              <CheckCircle className="w-8 h-8 text-cyan-400" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.verifyEmail.emailSent')}</h2>
              <p className="text-gray-600 text-sm mb-4">
                {t('auth.verifyEmail.newEmailSent')}
              </p>
              {email && (
                <p className="text-cyan-600 font-medium break-all mb-4">
                  {email}
                </p>
              )}
              <p className="text-gray-600 text-sm">
                {t('auth.verifyEmail.checkInbox')}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-300 text-sm mb-3">
                {t('auth.verifyEmail.stillNotSeeingIt')}
              </p>

              {canResend ? (
                <Button
                  onClick={handleResendEmail}
                  disabled={isResending}
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 hover:bg-white/10 hover:border-cyan-400/50 transition-all duration-300"
                >
                  {t('auth.verifyEmail.resendAgain')}
                </Button>
              ) : (
                <Button
                  disabled
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 opacity-50 cursor-not-allowed"
                >
                  {t('auth.verifyEmail.waitBeforeResending', { countdown })}
                </Button>
              )}
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <AuthLayout>
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo/Brand */}
          <Link to="/">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center mb-8 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl">
                <img
                  src="/logo.png"
                  alt="FluxTurn Logo"
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                FluxTurn
              </h1>
              <p className="text-gray-600 text-sm mt-2">
                {state === 'success' ? t('auth.verifyEmail.welcomeMessage') : t('auth.verifyEmail.verifyToGetStarted')}
              </p>
            </motion.div>
          </Link>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            {renderContent()}

            {/* Back to Login - shown for non-success states */}
            {state !== 'success' && (
              <div className="text-center mt-6 pt-6 border-t border-white/10">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-2 text-cyan-600 hover:text-cyan-700 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('auth.verifyEmail.backToLogin')}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-center mt-8"
          >
            <p className="text-xs text-gray-500">
              {t('auth.verifyEmail.needHelp')}{' '}
              <Link to="/support" className="text-cyan-600 hover:text-cyan-700 transition-colors">
                {t('auth.verifyEmail.supportTeam')}
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </AuthLayout>
  )
}