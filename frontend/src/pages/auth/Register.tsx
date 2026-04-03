import React, { useState, useContext } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Github, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { cn } from '../../lib/utils'
import { AuthContext } from '../../contexts/AuthContext'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { useTranslation } from 'react-i18next'

interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

interface RegisterFormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  acceptTerms?: string
}

interface PasswordStrength {
  score: number
  feedback: string[]
}

export const Register: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const authContext = useContext(AuthContext)
  const [form, setForm] = useState<RegisterForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<RegisterFormErrors>({})
  const [apiError, setApiError] = useState('')

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})
    setApiError('')

    // Validation
    const newErrors: RegisterFormErrors = {}
    if (!form.name.trim()) newErrors.name = t('auth.errors.nameRequired')
    if (!form.email) newErrors.email = t('auth.errors.emailRequired')
    if (!form.password) newErrors.password = t('auth.errors.passwordRequired')
    else if (passwordStrength.score < 3) newErrors.password = t('auth.errors.passwordTooWeak')
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = t('auth.errors.passwordMismatch')
    if (!form.acceptTerms) newErrors.acceptTerms = t('auth.errors.acceptTermsRequired')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      // Use AuthContext register method
      await authContext?.register(form.email, form.password, form.name)

      // After successful registration, navigate to login with success message
      navigate('/login', {
        state: {
          message: t('auth.register.successMessage'),
          email: form.email
        }
      })
    } catch (error: any) {
      console.error('Registration failed:', error)

      // Handle specific validation errors from backend
      if (error.message?.includes('email')) {
        setErrors({ email: error.message })
      } else if (error.message?.includes('password')) {
        setErrors({ password: error.message })
      } else if (error.message?.includes('name')) {
        setErrors({ name: error.message })
      } else {
        setApiError(error.message || t('auth.errors.registrationFailed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthRegister = (provider: string) => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL

    switch (provider) {
      case 'github':
        window.location.href = `${apiUrl}/api/v1/auth/oauth/github`
        break
      case 'google':
        window.location.href = `${apiUrl}/api/v1/auth/oauth/google`
        break
      default:
        // console.log(`${provider} OAuth not yet implemented`)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'from-red-500 to-red-600'
    if (passwordStrength.score === 3) return 'from-yellow-500 to-orange-500'
    if (passwordStrength.score === 4) return 'from-cyan-500 to-teal-500'
    return 'from-green-500 to-emerald-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength.score <= 2) return t('auth.register.weak')
    if (passwordStrength.score === 3) return t('auth.register.fair')
    if (passwordStrength.score === 4) return t('auth.register.good')
    return t('auth.register.strong')
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

            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.register.title')}</h2>
              <p className="text-gray-600 text-sm">
                {t('auth.register.subtitle')}
              </p>
              {apiError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{apiError}</p>
                </div>
              )}
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleOAuthRegister('google')}
                className="bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400 transition-all duration-300 flex items-center justify-center gap-2"
                title="Sign up with Google"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm text-gray-700 font-medium">Google</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuthRegister('github')}
                className="bg-[#24292e] hover:bg-[#1a1e22] border-[#24292e] hover:border-[#1a1e22] transition-all duration-300 flex items-center justify-center gap-2"
                title="Sign up with GitHub"
              >
                <Github className="w-5 h-5 text-white" />
                <span className="text-sm text-white font-medium">GitHub</span>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500">{t('auth.register.orContinueWith')}</span>
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 font-medium">{t('auth.register.name')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('auth.register.namePlaceholder')}
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className={cn(
                      "pl-10 bg-white border-gray-300 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/20",
                      errors.name && "border-red-500 focus-visible:border-red-500"
                    )}
                    disabled={isLoading}
                  />
                </div>
                {errors.name && (
                  <p className="text-red-600 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">{t('auth.register.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.register.emailPlaceholder')}
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className={cn(
                      "pl-10 bg-white border-gray-300 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/20",
                      errors.email && "border-red-500 focus-visible:border-red-500"
                    )}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-600 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">{t('auth.register.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.register.passwordPlaceholder')}
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    className={cn(
                      "pl-10 pr-10 bg-white border-gray-300 focus-visible:border-cyan-500 focus-visible:ring-cyan-500/20",
                      errors.password && "border-red-500 focus-visible:border-red-500"
                    )}
                    disabled={isLoading}
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
                      <span className="text-xs text-gray-400">{t('auth.register.passwordStrength')}</span>
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
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">{t('auth.register.confirmPassword')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t('auth.register.confirmPasswordPlaceholder')}
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
                        <span className="text-red-600">{t('auth.register.passwordsNoMatch')}</span>
                      </>
                    )}
                  </div>
                )}

                {errors.confirmPassword && (
                  <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <input
                    id="accept-terms"
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(e) => setForm(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded border-gray-300 bg-white text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0",
                      errors.acceptTerms && "border-red-500"
                    )}
                  />
                  <Label htmlFor="accept-terms" className="text-sm text-gray-600 leading-5">
                    {t('auth.register.agreeToTerms')}{' '}
                    <Link to="/terms" className="text-cyan-600 hover:text-cyan-700 transition-colors">
                      {t('auth.register.termsOfService')}
                    </Link>{' '}
                    {t('auth.register.and')}{' '}
                    <Link to="/privacy" className="text-cyan-600 hover:text-cyan-700 transition-colors">
                      {t('auth.register.privacyPolicy')}
                    </Link>
                  </Label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-red-600 text-xs mt-1">{errors.acceptTerms}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium py-2.5 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('auth.register.creating')}</span>
                  </div>
                ) : (
                  t('auth.register.createAccount')
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-gray-600 text-sm">
                {t('auth.register.haveAccount')}{' '}
                <Link
                  to="/login"
                  className="text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                >
                  {t('auth.register.signIn')}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  )
}