import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle, Shield, XCircle } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { cn } from '../../lib/utils'
import { api } from '../../lib/api'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { useTranslation } from 'react-i18next'

interface ResetForm {
  password: string
  confirmPassword: string
}

interface PasswordStrength {
  score: number
  feedback: string[]
}

export const ResetPassword: React.FC = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [form, setForm] = useState<ResetForm>({
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Partial<ResetForm>>({})
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  const checkPasswordStrength = (password: string): PasswordStrength => {
    let score = 0
    const feedback: string[] = []

    if (password.length >= 8) score++
    else feedback.push(t('auth.register.passwordRequirements.minLength'))

    if (/[A-Z]/.test(password)) score++
    else feedback.push(t('auth.register.passwordRequirements.uppercase'))

    if (/[a-z]/.test(password)) score++
    else feedback.push(t('auth.register.passwordRequirements.lowercase'))

    if (/\d/.test(password)) score++
    else feedback.push(t('auth.register.passwordRequirements.number'))

    if (/[^A-Za-z0-9]/.test(password)) score++
    else feedback.push(t('auth.register.passwordRequirements.special'))

    return { score, feedback }
  }

  const passwordStrength = checkPasswordStrength(form.password)

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false)
        return
      }

      try {
        // For reset password, we'll validate the token when user submits the form
        // rather than making a separate validation call
        // console.log('Token present:', token)
        setTokenValid(true)
      } catch (error) {
        console.error('Token validation failed:', error)
        setTokenValid(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    // Validation
    const newErrors: Partial<ResetForm> = {}
    if (!form.password) newErrors.password = t('auth.errors.passwordRequired')
    else if (passwordStrength.score < 3) newErrors.password = t('auth.errors.passwordTooWeak')
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = t('auth.errors.passwordMismatch')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      if (!token) {
        throw new Error(t('auth.resetPassword.tokenMissing'))
      }

      await api.resetPassword(token, form.password)
      // console.log('Password reset successful')
      setIsSuccess(true)
    } catch (error: unknown) {
      console.error('Password reset failed:', error)
      const errMsg = error instanceof Error ? error.message : '';

      // Handle token validation errors
      if (errMsg?.includes('token') || errMsg?.includes('expired') || errMsg?.includes('invalid')) {
        setTokenValid(false)
      } else {
        setErrors({ password: errMsg || t('auth.resetPassword.resetFailed') })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'from-red-500 to-red-600'
    if (passwordStrength.score === 3) return 'from-yellow-500 to-orange-500'
    if (passwordStrength.score === 4) return 'from-purple-500 to-pink-500'
    return 'from-green-500 to-emerald-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength.score <= 2) return t('auth.register.passwordStrength.weak')
    if (passwordStrength.score === 3) return t('auth.register.passwordStrength.fair')
    if (passwordStrength.score === 4) return t('auth.register.passwordStrength.good')
    return t('auth.register.passwordStrength.strong')
  }

  // Loading state while validating token
  if (tokenValid === null) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center space-y-4">
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
              <div className="w-8 h-8 border-2 border-gray-300 border-t-cyan-600 rounded-full animate-spin mx-auto" />
              <p className="text-gray-600">{t('auth.resetPassword.validating')}</p>
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center space-y-4">
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

              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>

              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.resetPassword.invalidLink')}</h2>
                <p className="text-gray-600 text-sm mb-6">
                  {t('auth.resetPassword.invalidLinkMessage')}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-md hover:shadow-lg"
                >
                  <Link to="/forgot-password">{t('auth.resetPassword.requestNewLink')}</Link>
                </Button>

                <Link
                  to="/login"
                  className="inline-flex items-center space-x-2 text-cyan-600 hover:text-cyan-700 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('auth.resetPassword.backToLogin')}</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </AuthLayout>
    )
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
                    <Shield className="w-6 h-6 text-cyan-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.resetPassword.title')}</h2>
                  <p className="text-gray-600 text-sm">
                    {t('auth.resetPassword.subtitle')}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium">{t('auth.resetPassword.newPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                        value={form.password}
                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                        className={cn(
                          "pl-10 pr-10 bg-white border-gray-300 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/20",
                          errors.password && "border-red-500 focus-visible:border-red-500"
                        )}
                        disabled={isLoading}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {form.password && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{t('auth.register.passwordStrengthLabel')}</span>
                          <span className={cn(
                            "text-xs font-medium",
                            passwordStrength.score <= 2 ? "text-red-600" :
                            passwordStrength.score === 3 ? "text-yellow-400" :
                            passwordStrength.score === 4 ? "text-cyan-400" : "text-green-400"
                          )}>
                            {getPasswordStrengthText()}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                          <div
                            className={cn(
                              "h-1.5 rounded-full bg-gradient-to-r transition-all duration-300",
                              getPasswordStrengthColor()
                            )}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        {passwordStrength.feedback.length > 0 && (
                          <div className="text-xs text-gray-400">
                            {t('auth.register.missing')}: {passwordStrength.feedback.join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {errors.password && (
                      <p className="text-red-600 text-xs mt-1">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">{t('auth.resetPassword.confirmPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                        value={form.confirmPassword}
                        onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className={cn(
                          "pl-10 pr-10 bg-white border-gray-300 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/20",
                          errors.confirmPassword && "border-red-500 focus-visible:border-red-500"
                        )}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Match Indicator */}
                    {form.confirmPassword && (
                      <div className="flex items-center space-x-2 text-xs">
                        {form.password === form.confirmPassword ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">{t('auth.register.passwordsMatch')}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span className="text-red-600">{t('auth.register.passwordsNotMatch')}</span>
                          </>
                        )}
                      </div>
                    )}

                    {errors.confirmPassword && (
                      <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>
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
                        <span>{t('auth.resetPassword.updating')}</span>
                      </div>
                    ) : (
                      t('auth.resetPassword.updatePassword')
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
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.resetPassword.passwordUpdated')}</h2>
                  <p className="text-gray-600 text-sm mb-6">
                    {t('auth.resetPassword.passwordUpdatedMessage')}
                  </p>
                </div>

                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-md hover:shadow-lg"
                >
                  <Link to="/login">{t('auth.resetPassword.continueToLogin')}</Link>
                </Button>
              </motion.div>
            )}

            {/* Back to Login */}
            {!isSuccess && (
              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-2 text-cyan-600 hover:text-cyan-700 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('auth.resetPassword.backToLogin')}</span>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  )
}