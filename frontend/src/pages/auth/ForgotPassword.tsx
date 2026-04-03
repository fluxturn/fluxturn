import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle, Send } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { cn } from '../../lib/utils'
import { api } from '../../lib/api'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { useTranslation } from 'react-i18next'

export const ForgotPassword: React.FC = () => {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Basic validation
    if (!email.trim()) {
      setError(t('auth.errors.emailRequired'))
      setIsLoading(false)
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('auth.errors.invalidEmail'))
      setIsLoading(false)
      return
    }

    try {
      await api.forgotPassword(email)
      // console.log('Password reset request sent for:', email)
      setIsSuccess(true)
    } catch (error: any) {
      console.error('Password reset failed:', error)
      setError(error.message || t('auth.forgotPassword.sendFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setIsLoading(true)
    try {
      await api.forgotPassword(email)
      // console.log('Password reset email resent for:', email)
    } catch (error: any) {
      console.error('Failed to resend email:', error)
      setError(error.message || t('auth.forgotPassword.resendFailed'))
    } finally {
      setIsLoading(false)
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
          {/* Card */}
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

            {!isSuccess ? (
              <>
                {/* Header */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-50 mb-4">
                    <Mail className="w-6 h-6 text-cyan-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.forgotPassword.title')}</h2>
                  <p className="text-gray-600 text-sm">
                    {t('auth.forgotPassword.subtitle')}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">{t('auth.forgotPassword.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('auth.forgotPassword.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={cn(
                          "pl-10 bg-white border-gray-300 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/20",
                          error && "border-red-500 focus-visible:border-red-500"
                        )}
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>
                    {error && (
                      <p className="text-red-600 text-xs mt-1">{error}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-md hover:shadow-lg text-white font-medium py-2.5 transition-all duration-300"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('auth.forgotPassword.sending')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Send className="w-4 h-4" />
                        <span>{t('auth.forgotPassword.sendResetEmail')}</span>
                      </div>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              /* Success State */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-4"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>

                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.forgotPassword.checkEmail')}</h2>
                  <p className="text-gray-600 text-sm mb-4">
                    {t('auth.forgotPassword.sentTo')}
                  </p>
                  <p className="text-cyan-600 font-medium break-all">
                    {email}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <p className="text-gray-600 text-sm">
                    {t('auth.forgotPassword.didntReceive')}
                  </p>

                  <Button
                    onClick={handleResend}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full bg-white border-gray-300 hover:bg-gray-50 hover:border-cyan-500/50 transition-all duration-300"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{t('auth.forgotPassword.resending')}</span>
                      </div>
                    ) : (
                      t('auth.forgotPassword.resendEmail')
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Back to Login */}
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center space-x-2 text-cyan-600 hover:text-cyan-700 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('auth.forgotPassword.backToLogin')}</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  )
}