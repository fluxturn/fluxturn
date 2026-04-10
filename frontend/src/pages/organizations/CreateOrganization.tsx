import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Upload,
  Check,
  X,
  ArrowLeft,
  Save,
  Globe,
  Users,
  CreditCard,
  Shield,
  AlertCircle,
  Info
} from 'lucide-react'
import { GlassCard } from '../../components/ui/GlassCard'
import { cn } from '../../lib/utils'
import { Link, useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../lib/api'
import { toast } from 'sonner'

interface FormData {
  name: string
  slug: string
  description: string
  industry: string
  teamSize: string
  organizationType: 'personal' | 'team' | 'enterprise'
  website: string
  logo?: File | null
  billingEmail: string
  paymentMethod: string
  termsAccepted: boolean
  privacyAccepted: boolean
  marketingAccepted: boolean
}

interface FormDataErrors {
  name?: string
  slug?: string
  description?: string
  industry?: string
  teamSize?: string
  organizationType?: string
  website?: string
  logo?: string
  billingEmail?: string
  paymentMethod?: string
  termsAccepted?: string
  privacyAccepted?: string
  marketingAccepted?: string
}

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Real Estate',
  'Consulting',
  'Marketing',
  'Media',
  'Non-profit',
  'Government',
  'Other'
]

const teamSizes = [
  '1-10',
  '11-50',
  '51-200',
  '201-1000',
  '1000+'
]

const organizationTypes = [
  {
    id: 'personal' as const,
    name: 'Personal',
    description: 'For individual projects and personal use',
    price: 'Free',
    features: ['Up to 3 projects', '5GB storage', 'Basic support']
  },
  {
    id: 'team' as const,
    name: 'Team',
    description: 'For small teams and growing businesses',
    price: '$29/month',
    features: ['Unlimited projects', '100GB storage', 'Team collaboration', 'Priority support']
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    description: 'For large organizations with advanced needs',
    price: 'Custom',
    features: ['Unlimited everything', 'Advanced security', 'Custom integrations', 'Dedicated support']
  }
]

export const CreateOrganization: React.FC = () => {
  const navigate = useNavigate()
  const { switchOrganization } = useOrganization()
  const { refreshOrganizations } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    description: '',
    industry: '',
    teamSize: '',
    organizationType: 'team',
    website: '',
    logo: null,
    billingEmail: '',
    paymentMethod: '',
    termsAccepted: false,
    privacyAccepted: false,
    marketingAccepted: false
  })
  const [dragOver, setDragOver] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormDataErrors>({})

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }

    // Auto-generate slug from name
    if (field === 'name') {
      const slug = String(value).toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setFormData(prev => ({ ...prev, slug }))
    }
  }

  const handleFileUpload = (file: File) => {
    if (file.type.startsWith('image/')) {
      setFormData(prev => ({ ...prev, logo: file }))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files[0]) {
      handleFileUpload(files[0])
    }
  }

  const validateStep = (step: number) => {
    const newErrors: FormDataErrors = {}

    if (step === 1) {
      if (!formData.name) newErrors.name = 'Organization name is required'
      if (!formData.slug) newErrors.slug = 'Organization slug is required'
      if (!formData.description) newErrors.description = 'Description is required'
      if (!formData.industry) newErrors.industry = 'Industry selection is required'
      if (!formData.teamSize) newErrors.teamSize = 'Team size is required'
    }

    if (step === 2) {
      // Type selection is always valid as it has a default
    }

    if (step === 3 && formData.organizationType !== 'personal') {
      if (!formData.billingEmail) newErrors.billingEmail = 'Billing email is required'
    }

    if (step === 4) {
      if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms'
      if (!formData.privacyAccepted) newErrors.privacyAccepted = 'You must accept the privacy policy'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      // Create the organization with a default project
      const response = await api.post('/organization/create', {
        name: formData.name,
        projectName: 'Main Project' // Default project name
      })

      // console.log('Organization creation response:', response) // Debug log

      // Check if organizationId exists in response or response.data
      const resp = response as Record<string, unknown>;
      const respData = resp?.data as Record<string, unknown> | undefined;
      const organizationId = (resp?.organizationId || respData?.organizationId) as string | undefined

      if (organizationId) {
        // Refresh the organizations list in AuthContext
        await refreshOrganizations()

        // Switch to the new organization in context
        await switchOrganization(organizationId)

        // Show success toast
        toast.success(`Organization "${formData.name}" created successfully!`)

        // Navigate to organizations list to see the new org
        // This forces OrganizationList to remount and fetch fresh data
        navigate('/orgs')
      } else {
        console.error('No organizationId in response:', response)
        throw new Error('Failed to create organization - no organizationId returned')
      }
    } catch (error) {
      console.error('Error creating organization:', error)
      toast.error('Failed to create organization. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
            currentStep >= step
              ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white"
              : "bg-white/10 text-muted-foreground"
          )}>
            {currentStep > step ? <Check className="w-5 h-5" /> : step}
          </div>
          {step < 4 && (
            <div className={cn(
              "w-16 h-0.5 transition-all",
              currentStep > step ? "bg-gradient-to-r from-cyan-400 to-blue-500" : "bg-white/10"
            )} />
          )}
        </div>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <GlassCard hover={false}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Basic Information</h3>
          <p className="text-sm text-muted-foreground">Tell us about your organization</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div className="text-center">
          <label className="block text-sm font-medium mb-3">Organization Logo</label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative w-32 h-32 mx-auto rounded-2xl border-2 border-dashed transition-all cursor-pointer",
              dragOver
                ? "border-cyan-400 bg-cyan-400/10"
                : "border-white/20 hover:border-cyan-400/50"
            )}
          >
            {formData.logo ? (
              <div className="relative w-full h-full">
                <img
                  src={URL.createObjectURL(formData.logo)}
                  alt="Organization logo"
                  className="w-full h-full object-cover rounded-2xl"
                />
                <button
                  onClick={() => setFormData(prev => ({ ...prev, logo: null }))}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Upload Logo</span>
                <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Organization Name & Slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Organization Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={cn(
                "w-full p-3 bg-white/5 border rounded-lg focus:outline-none focus:ring-2 transition-all",
                errors.name
                  ? "border-red-500 focus:ring-red-400/50"
                  : "border-white/10 focus:ring-cyan-400/50"
              )}
              placeholder="Enter organization name"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Organization Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              className={cn(
                "w-full p-3 bg-white/5 border rounded-lg focus:outline-none focus:ring-2 transition-all",
                errors.slug
                  ? "border-red-500 focus:ring-red-400/50"
                  : "border-white/10 focus:ring-cyan-400/50"
              )}
              placeholder="organization-slug"
            />
            {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              This will be used in URLs: fluxturn.com/{formData.slug || 'your-org'}
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className={cn(
              "w-full p-3 bg-white/5 border rounded-lg focus:outline-none focus:ring-2 transition-all",
              errors.description
                ? "border-red-500 focus:ring-red-400/50"
                : "border-white/10 focus:ring-cyan-400/50"
            )}
            placeholder="Describe what your organization does..."
          />
          {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
        </div>

        {/* Industry & Team Size */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Industry *</label>
            <select
              value={formData.industry}
              onChange={(e) => handleInputChange('industry', e.target.value)}
              className={cn(
                "w-full p-3 bg-white/5 border rounded-lg focus:outline-none focus:ring-2 transition-all",
                errors.industry
                  ? "border-red-500 focus:ring-red-400/50"
                  : "border-white/10 focus:ring-cyan-400/50"
              )}
            >
              <option value="">Select industry</option>
              {industries.map((industry) => (
                <option key={industry} value={industry} className="bg-slate-800">
                  {industry}
                </option>
              ))}
            </select>
            {errors.industry && <p className="text-red-400 text-xs mt-1">{errors.industry}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Team Size *</label>
            <select
              value={formData.teamSize}
              onChange={(e) => handleInputChange('teamSize', e.target.value)}
              className={cn(
                "w-full p-3 bg-white/5 border rounded-lg focus:outline-none focus:ring-2 transition-all",
                errors.teamSize
                  ? "border-red-500 focus:ring-red-400/50"
                  : "border-white/10 focus:ring-cyan-400/50"
              )}
            >
              <option value="">Select team size</option>
              {teamSizes.map((size) => (
                <option key={size} value={size} className="bg-slate-800">
                  {size} people
                </option>
              ))}
            </select>
            {errors.teamSize && <p className="text-red-400 text-xs mt-1">{errors.teamSize}</p>}
          </div>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium mb-2">Website</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              placeholder="https://your-website.com"
            />
          </div>
        </div>
      </div>
    </GlassCard>
  )

  const renderStep2 = () => (
    <GlassCard hover={false}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Choose Your Plan</h3>
          <p className="text-sm text-muted-foreground">Select the plan that fits your needs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {organizationTypes.map((type) => (
          <div
            key={type.id}
            className={cn(
              "relative p-6 rounded-xl border-2 cursor-pointer transition-all",
              formData.organizationType === type.id
                ? "border-cyan-400 bg-cyan-400/10"
                : "border-white/20 hover:border-cyan-400/50"
            )}
            onClick={() => handleInputChange('organizationType', type.id)}
          >
            {formData.organizationType === type.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            
            <div className="text-center">
              <h4 className="text-lg font-semibold mb-2">{type.name}</h4>
              <p className="text-2xl font-bold mb-2 text-gradient">{type.price}</p>
              <p className="text-sm text-muted-foreground mb-4">{type.description}</p>
              
              <ul className="space-y-2 text-sm">
                {type.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {formData.organizationType === 'enterprise' && (
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-400 mb-1">Enterprise Plan</h4>
              <p className="text-sm text-muted-foreground">
                Contact our sales team to discuss your specific requirements and get a custom quote.
              </p>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  )

  const renderStep3 = () => (
    <GlassCard hover={false}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Billing Information</h3>
          <p className="text-sm text-muted-foreground">Set up your payment details</p>
        </div>
      </div>

      {formData.organizationType === 'personal' ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h4 className="text-lg font-semibold mb-2">No Payment Required</h4>
          <p className="text-muted-foreground">
            The Personal plan is free. You can upgrade to a paid plan later if needed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Plan Summary */}
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{organizationTypes.find(t => t.id === formData.organizationType)?.name} Plan</h4>
                <p className="text-sm text-muted-foreground">
                  {organizationTypes.find(t => t.id === formData.organizationType)?.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gradient">
                  {organizationTypes.find(t => t.id === formData.organizationType)?.price}
                </p>
              </div>
            </div>
          </div>

          {/* Billing Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Billing Email *</label>
            <input
              type="email"
              value={formData.billingEmail}
              onChange={(e) => handleInputChange('billingEmail', e.target.value)}
              className={cn(
                "w-full p-3 bg-white/5 border rounded-lg focus:outline-none focus:ring-2 transition-all",
                errors.billingEmail
                  ? "border-red-500 focus:ring-red-400/50"
                  : "border-white/10 focus:ring-cyan-400/50"
              )}
              placeholder="billing@yourcompany.com"
            />
            {errors.billingEmail && <p className="text-red-400 text-xs mt-1">{errors.billingEmail}</p>}
          </div>

          {/* Payment Method Placeholder */}
          <div>
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Payment method will be set up after creation</p>
                  <p className="text-sm text-muted-foreground">
                    You'll be redirected to secure payment setup
                  </p>
                </div>
              </div>
            </div>
          </div>

          {formData.organizationType === 'enterprise' && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-400 mb-1">Enterprise Billing</h4>
                  <p className="text-sm text-muted-foreground">
                    Our team will contact you within 24 hours to set up enterprise billing and discuss your requirements.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )

  const renderStep4 = () => (
    <GlassCard hover={false}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">Review & Accept</h3>
          <p className="text-sm text-muted-foreground">Review your organization details and accept our terms</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Organization Summary */}
        <div className="p-4 bg-white/5 rounded-lg">
          <h4 className="font-semibold mb-4">Organization Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>
              <span className="ml-2 font-medium">{formData.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Slug:</span>
              <span className="ml-2 font-medium">{formData.slug}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Industry:</span>
              <span className="ml-2 font-medium">{formData.industry}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Team Size:</span>
              <span className="ml-2 font-medium">{formData.teamSize}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Plan:</span>
              <span className="ml-2 font-medium">{organizationTypes.find(t => t.id === formData.organizationType)?.name}</span>
            </div>
            {formData.billingEmail && (
              <div>
                <span className="text-muted-foreground">Billing Email:</span>
                <span className="ml-2 font-medium">{formData.billingEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <button
              type="button"
              onClick={() => handleInputChange('termsAccepted', !formData.termsAccepted)}
              className={cn(
                "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                formData.termsAccepted
                  ? "bg-cyan-400 border-cyan-400"
                  : errors.termsAccepted
                    ? "border-red-500"
                    : "border-white/20"
              )}
            >
              {formData.termsAccepted && <Check className="w-3 h-3 text-white" />}
            </button>
            <div>
              <p className="text-sm">
                I accept the{' '}
                <a href="#" className="text-cyan-400 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-cyan-400 hover:underline">Service Level Agreement</a> *
              </p>
              {errors.termsAccepted && <p className="text-red-400 text-xs mt-1">{errors.termsAccepted}</p>}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <button
              type="button"
              onClick={() => handleInputChange('privacyAccepted', !formData.privacyAccepted)}
              className={cn(
                "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                formData.privacyAccepted
                  ? "bg-cyan-400 border-cyan-400"
                  : errors.privacyAccepted
                    ? "border-red-500"
                    : "border-white/20"
              )}
            >
              {formData.privacyAccepted && <Check className="w-3 h-3 text-white" />}
            </button>
            <div>
              <p className="text-sm">
                I accept the{' '}
                <a href="#" className="text-cyan-400 hover:underline">Privacy Policy</a> *
              </p>
              {errors.privacyAccepted && <p className="text-red-400 text-xs mt-1">{errors.privacyAccepted}</p>}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <button
              type="button"
              onClick={() => handleInputChange('marketingAccepted', !formData.marketingAccepted)}
              className={cn(
                "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                formData.marketingAccepted
                  ? "bg-cyan-400 border-cyan-400"
                  : "border-white/20"
              )}
            >
              {formData.marketingAccepted && <Check className="w-3 h-3 text-white" />}
            </button>
            <p className="text-sm">
              I would like to receive marketing communications and product updates (optional)
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      default: return renderStep1()
    }
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        variants={itemVariants}
      >
        <div className="flex items-center space-x-4">
          <Link
            to="/organizations"
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Create Organization</h1>
            <p className="text-muted-foreground">Set up your new organization in just a few steps</p>
          </div>
        </div>
      </motion.div>

      {/* Step Indicator */}
      <motion.div variants={itemVariants}>
        {renderStepIndicator()}
      </motion.div>

      {/* Step Content */}
      <motion.div variants={itemVariants}>
        {renderCurrentStep()}
      </motion.div>

      {/* Navigation Buttons */}
      <motion.div 
        className="flex items-center justify-between pt-6"
        variants={itemVariants}
      >
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className={cn(
            "px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-all",
            currentStep === 1
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-white/10"
          )}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Previous</span>
        </button>

        <div className="flex items-center space-x-3">
          {currentStep < 4 ? (
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium flex items-center space-x-2 hover:shadow-lg hover:shadow-cyan-400/25 transition-all"
            >
              <span>Continue</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "px-8 py-3 bg-gradient-to-r from-green-400 to-cyan-500 rounded-lg font-medium flex items-center space-x-2 transition-all",
                isSubmitting
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:shadow-lg hover:shadow-green-400/25"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Create Organization</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}