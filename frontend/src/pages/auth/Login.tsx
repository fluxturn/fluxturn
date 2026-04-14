import React, { useState, useEffect, useContext } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, CheckCircle, Github, Sparkles, Zap } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { cn } from '../../lib/utils'
import { AuthContext } from '../../contexts/AuthContext'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { WorkflowAPI } from '../../lib/fluxturn'
import { PENDING_PROMPT_KEY, PENDING_PROMPT_TIMESTAMP_KEY, PENDING_TEMPLATE_KEY, PENDING_TEMPLATE_TIMESTAMP_KEY } from '../../config/pendingKeys'
import { PENDING_AI_AGENT_KEY, PENDING_AI_AGENT_TIMESTAMP_KEY } from '../../components/landing/AIAgentSection'
import type { Organization } from '../../types/organization'
import type { JsonValue } from '../../types/json'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

export const Login: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const authContext = useContext(AuthContext)
  const [form, setForm] = useState<LoginForm>({
    email: location.state?.email || '',
    password: '',
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<LoginForm>>({})
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Check for invitation parameter
  const invitationToken = searchParams.get('invitation')
  const pendingInvitation = localStorage.getItem('pendingInvitation')

  useEffect(() => {
    // Clear any stale OAuth return URLs immediately on login page load
    sessionStorage.removeItem('oauth_return_url');
    sessionStorage.removeItem('oauth_return_path');
    sessionStorage.removeItem('oauth_workflow_id');

    // Check if we have a success message from registration
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      // Clear the message after 5 seconds
      const timer = setTimeout(() => setSuccessMessage(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [location.state])

  // Helper function to create workflow from pending AI prompt using existing project
  const createWorkflowFromPrompt = async (promptText: string, orgs: Organization[]) => {
    try {
      const organizationId = orgs[0]?.id;
      if (!organizationId) {
        navigate('/orgs');
        return;
      }

      // 1. Get existing projects for this organization
      const projectsRes = await api.getProjectsByOrganization(organizationId);
      const projects = (projectsRes as { data?: { id: string }[] }).data || (projectsRes as { id: string }[]);

      if (!projects || projects.length === 0) {
        // No projects, redirect to org page
        sessionStorage.removeItem(PENDING_PROMPT_KEY);
        sessionStorage.removeItem(PENDING_PROMPT_TIMESTAMP_KEY);
        navigate(`/org/${organizationId}`);
        return;
      }

      const projectId = projects[0].id;

      // 2. Create workflow with correct structure
      const now = new Date();
      const defaultName = `AI Workflow ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

      const workflowRes = await WorkflowAPI.createWorkflow({
        name: defaultName,
        description: promptText.substring(0, 200),
        workflow: {
          triggers: [],
          steps: [],
          conditions: [],
          variables: [],
          outputs: [],
          canvas: {
            nodes: [],
            edges: [],
          },
        },
      }, organizationId, projectId);

      const workflowId = workflowRes.id;

      // 3. Store prompt for editor to pick up (it's already there, but refresh it)
      sessionStorage.setItem(PENDING_PROMPT_KEY, promptText);

      // 4. Navigate to editor with ai-generate flag
      navigate(`/org/${organizationId}/project/${projectId}/workflows/${workflowId}?ai-generate=true`);

    } catch (error) {
      console.error('Failed to create workflow from pending prompt:', error);
      // Clear the stale prompt and redirect to orgs
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
      sessionStorage.removeItem(PENDING_PROMPT_TIMESTAMP_KEY);
      navigate('/orgs');
    }
  };

  // Helper function to create workflow from pending template using existing project
  const createWorkflowFromTemplate = async (templateData: Record<string, unknown>, orgs: Organization[]) => {
    try {
      const organizationId = orgs[0]?.id;
      if (!organizationId) {
        navigate('/orgs');
        return;
      }

      // 1. Get existing projects for this organization
      const projectsRes = await api.getProjectsByOrganization(organizationId);
      const projects = (projectsRes as { data?: { id: string }[] }).data || (projectsRes as { id: string }[]);

      if (!projects || projects.length === 0) {
        // No projects, redirect to org page
        sessionStorage.removeItem(PENDING_TEMPLATE_KEY);
        sessionStorage.removeItem(PENDING_TEMPLATE_TIMESTAMP_KEY);
        navigate(`/org/${organizationId}`);
        return;
      }

      const projectId = projects[0].id;

      // 2. Create workflow with template data
      const workflowRes = await WorkflowAPI.createWorkflow({
        name: templateData.name as JsonValue,
        description: templateData.description as JsonValue,
        workflow: {
          triggers: (templateData.triggers || []) as JsonValue,
          steps: (templateData.steps || []) as JsonValue,
          conditions: (templateData.conditions || []) as JsonValue,
          variables: (templateData.variables || []) as JsonValue,
          outputs: (templateData.outputs || []) as JsonValue,
          canvas: (templateData.canvas || { nodes: [], edges: [] }) as JsonValue,
        },
      }, organizationId, projectId);

      const workflowId = workflowRes.id;

      // 3. Clear template from storage
      sessionStorage.removeItem(PENDING_TEMPLATE_KEY);
      sessionStorage.removeItem(PENDING_TEMPLATE_TIMESTAMP_KEY);

      // 4. Navigate to editor
      navigate(`/org/${organizationId}/project/${projectId}/workflows/${workflowId}`);

    } catch (error) {
      console.error('Failed to create workflow from pending template:', error);
      // Clear the stale template and redirect to orgs
      sessionStorage.removeItem(PENDING_TEMPLATE_KEY);
      sessionStorage.removeItem(PENDING_TEMPLATE_TIMESTAMP_KEY);
      navigate('/orgs');
    }
  };

  // Helper function to create AI Agent workflow
  const createAIAgentWorkflow = async (orgs: Organization[]) => {
    try {
      const organizationId = orgs[0]?.id;
      if (!organizationId) {
        navigate('/orgs');
        return;
      }

      // 1. Get existing projects for this organization
      const projectsRes = await api.getProjectsByOrganization(organizationId);
      const projects = (projectsRes as { data?: { id: string }[] }).data || (projectsRes as { id: string }[]);

      if (!projects || projects.length === 0) {
        sessionStorage.removeItem(PENDING_AI_AGENT_KEY);
        sessionStorage.removeItem(PENDING_AI_AGENT_TIMESTAMP_KEY);
        navigate(`/org/${organizationId}`);
        return;
      }

      const projectId = projects[0].id;

      // 2. Generate AI Agent canvas
      const chatTriggerId = `chat-trigger-${Date.now()}`;
      const openaiModelId = `openai-model-${Date.now() + 1}`;
      const aiAgentId = `ai-agent-${Date.now() + 2}`;

      const canvas = {
        nodes: [
          {
            id: chatTriggerId,
            type: 'CHAT_TRIGGER',
            position: { x: 100, y: 200 },
            data: {
              label: 'Chat Trigger',
              type: 'CHAT_TRIGGER',
              chatInputKey: 'chatInput',
              sessionIdKey: 'sessionId',
              placeholder: 'Type your message...',
              inputFieldLabel: 'Message',
            },
          },
          {
            id: openaiModelId,
            type: 'OPENAI_CHAT_MODEL',
            position: { x: 400, y: 100 },
            data: {
              label: 'OpenAI Chat Model',
              type: 'OPENAI_CHAT_MODEL',
              model: 'gpt-4o-mini',
              temperature: 0.7,
              maxTokens: 4096,
              topP: 1,
              frequencyPenalty: 0,
              presencePenalty: 0,
            },
          },
          {
            id: aiAgentId,
            type: 'AI_AGENT',
            position: { x: 400, y: 300 },
            data: {
              label: 'AI Agent',
              type: 'AI_AGENT',
              agentType: 'toolsAgent',
              systemPrompt: 'You are a helpful AI assistant.',
              input: '{{$json.chatInput}}',
              maxIterations: 10,
              returnIntermediateSteps: false,
              outputFormat: 'text',
              enableHttpTool: true,
              enableCalculatorTool: true,
            },
          },
        ],
        edges: [
          {
            id: `edge-${chatTriggerId}-${aiAgentId}`,
            source: chatTriggerId,
            target: aiAgentId,
            sourceHandle: 'output',
            targetHandle: 'input',
            type: 'smoothstep',
            animated: true,
          },
          {
            id: `edge-${openaiModelId}-${aiAgentId}`,
            source: openaiModelId,
            target: aiAgentId,
            sourceHandle: 'output',
            targetHandle: 'model',
            type: 'smoothstep',
            animated: true,
          },
        ],
      };

      // 3. Create workflow
      const now = new Date();
      const workflowName = `AI Agent ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

      const workflowRes = await WorkflowAPI.createWorkflow({
        name: workflowName,
        description: 'AI Agent workflow with OpenAI model',
        workflow: {
          triggers: [],
          steps: [],
          conditions: [],
          variables: [],
          outputs: [],
          canvas,
        },
      }, organizationId, projectId);

      const workflowId = workflowRes.id;

      // 4. Clear storage and navigate
      sessionStorage.removeItem(PENDING_AI_AGENT_KEY);
      sessionStorage.removeItem(PENDING_AI_AGENT_TIMESTAMP_KEY);

      navigate(`/org/${organizationId}/project/${projectId}/workflows/${workflowId}`);

    } catch (error) {
      console.error('Failed to create AI Agent workflow:', error);
      sessionStorage.removeItem(PENDING_AI_AGENT_KEY);
      sessionStorage.removeItem(PENDING_AI_AGENT_TIMESTAMP_KEY);
      navigate('/orgs');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})
    setApiError('')

    // Basic validation
    const newErrors: Partial<LoginForm> = {}
    if (!form.email) newErrors.email = t('auth.errors.emailRequired')
    if (!form.password) newErrors.password = t('auth.errors.passwordRequired')

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      // Use AuthContext login method which handles organizations
      await authContext?.login(form.email, form.password);

      // console.log('Login successful:', user)

      // Clear any stale OAuth return URLs from sessionStorage
      sessionStorage.removeItem('oauth_return_url');
      sessionStorage.removeItem('oauth_return_path');

      // Small delay to ensure organizations are loaded
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if there's a pending invitation to accept
      if (invitationToken || pendingInvitation) {
        const token = invitationToken || pendingInvitation;
        // Clear the stored invitation
        localStorage.removeItem('pendingInvitation');
        // Redirect back to invitation accept page
        navigate(`/invite/${token}`);
        return;
      }

      // Check for pending AI prompt
      const pendingPrompt = sessionStorage.getItem(PENDING_PROMPT_KEY);
      const promptTimestamp = sessionStorage.getItem(PENDING_PROMPT_TIMESTAMP_KEY);

      if (pendingPrompt && promptTimestamp) {
        const isRecent = (Date.now() - parseInt(promptTimestamp)) < 30 * 60 * 1000; // 30 min

        if (isRecent) {
          sessionStorage.removeItem(PENDING_PROMPT_TIMESTAMP_KEY);

          // Wait for organizations to be available (retry up to 5 times)
          let orgs: Organization[] = [];
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            orgs = await authContext?.refreshOrganizations() || [];
            if (orgs.length > 0) break;
          }

          if (orgs.length > 0) {
            try {
              await createWorkflowFromPrompt(pendingPrompt, orgs);
              return;
            } catch (err) {
              console.error('Failed to create workflow after login:', err);
              // Fall through to normal navigation
            }
          }
        } else {
          // Stale prompt - clear it
          sessionStorage.removeItem(PENDING_PROMPT_KEY);
          sessionStorage.removeItem(PENDING_PROMPT_TIMESTAMP_KEY);
        }
      }

      // Check for pending template
      const pendingTemplate = sessionStorage.getItem(PENDING_TEMPLATE_KEY);
      const templateTimestamp = sessionStorage.getItem(PENDING_TEMPLATE_TIMESTAMP_KEY);

      if (pendingTemplate && templateTimestamp) {
        const isRecent = (Date.now() - parseInt(templateTimestamp)) < 30 * 60 * 1000; // 30 min

        if (isRecent) {
          sessionStorage.removeItem(PENDING_TEMPLATE_TIMESTAMP_KEY);

          // Wait for organizations to be available (retry up to 5 times)
          let orgs: Organization[] = [];
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            orgs = await authContext?.refreshOrganizations() || [];
            if (orgs.length > 0) break;
          }

          if (orgs.length > 0) {
            try {
              const templateData = JSON.parse(pendingTemplate);
              await createWorkflowFromTemplate(templateData, orgs);
              return;
            } catch (err) {
              console.error('Failed to create workflow from template after login:', err);
              // Fall through to normal navigation
            }
          }
        } else {
          // Stale template - clear it
          sessionStorage.removeItem(PENDING_TEMPLATE_KEY);
          sessionStorage.removeItem(PENDING_TEMPLATE_TIMESTAMP_KEY);
        }
      }

      // Check for pending AI Agent
      const pendingAIAgent = sessionStorage.getItem(PENDING_AI_AGENT_KEY);
      const aiAgentTimestamp = sessionStorage.getItem(PENDING_AI_AGENT_TIMESTAMP_KEY);

      if (pendingAIAgent && aiAgentTimestamp) {
        const isRecent = (Date.now() - parseInt(aiAgentTimestamp)) < 30 * 60 * 1000; // 30 min

        if (isRecent) {
          sessionStorage.removeItem(PENDING_AI_AGENT_TIMESTAMP_KEY);

          // Wait for organizations to be available (retry up to 5 times)
          let orgs: Organization[] = [];
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            orgs = await authContext?.refreshOrganizations() || [];
            if (orgs.length > 0) break;
          }

          if (orgs.length > 0) {
            try {
              await createAIAgentWorkflow(orgs);
              return;
            } catch (err) {
              console.error('Failed to create AI Agent workflow after login:', err);
              // Fall through to normal navigation
            }
          }
        } else {
          // Stale data - clear it
          sessionStorage.removeItem(PENDING_AI_AGENT_KEY);
          sessionStorage.removeItem(PENDING_AI_AGENT_TIMESTAMP_KEY);
        }
      }

      // Always redirect to organizations list after login
      navigate('/orgs');
    } catch (error: unknown) {
      console.error('Login failed:', error)
      setApiError(error instanceof Error ? error.message : t('auth.errors.loginFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthLogin = (provider: string) => {
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
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.login.title')}</h2>
              <p className="text-gray-600 text-sm">
                {t('auth.login.subtitle')}
              </p>
              {(invitationToken || pendingInvitation) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Mail className="w-4 h-4 text-cyan-600" />
                  <p className="text-cyan-700 text-sm">{t('auth.login.inviteMessage')}</p>
                </motion.div>
              )}
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-green-700 text-sm">{successMessage}</p>
                </motion.div>
              )}
              {apiError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{apiError}</p>
                </div>
              )}
              {searchParams.get('intent') === 'ai-generate' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  <p className="text-cyan-700 text-sm">{t('aiPromptBuilder.loginMessage')}</p>
                </motion.div>
              )}
              {searchParams.get('intent') === 'use-template' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Zap className="w-4 h-4 text-cyan-600" />
                  <p className="text-cyan-700 text-sm">{t('templates.loginMessage', 'Sign in to use this template')}</p>
                </motion.div>
              )}
              {searchParams.get('intent') === 'try-ai-agent' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <p className="text-emerald-700 text-sm">{t('aiAgent.loginMessage', 'Sign in to try AI Agent')}</p>
                </motion.div>
              )}
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleOAuthLogin('google')}
                className="bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400 transition-all duration-300 flex items-center justify-center gap-2"
                title="Login with Google"
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
                onClick={() => handleOAuthLogin('github')}
                className="bg-[#24292e] hover:bg-[#1a1e22] border-[#24292e] hover:border-[#1a1e22] transition-all duration-300 flex items-center justify-center gap-2"
                title="Login with GitHub"
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
                <span className="bg-white px-2 text-gray-500">{t('auth.login.orContinueWith')}</span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">{t('auth.login.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.login.emailPlaceholder')}
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
                <Label htmlFor="password" className="text-gray-700 font-medium">{t('auth.login.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.login.passwordPlaceholder')}
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
                {errors.password && (
                  <p className="text-red-600 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={form.rememberMe}
                    onChange={(e) => setForm(prev => ({ ...prev, rememberMe: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 bg-white text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0"
                  />
                  <Label htmlFor="remember-me" className="text-sm text-gray-600">
                    {t('auth.login.rememberMe')}
                  </Label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm text-cyan-600 hover:text-cyan-700 transition-colors font-medium"
                >
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium py-2.5 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('auth.login.signingIn')}</span>
                  </div>
                ) : (
                  t('auth.login.signIn')
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-gray-600 text-sm">
                {t('auth.login.noAccount')}{' '}
                <Link
                  to="/register"
                  className="text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                >
                  {t('auth.login.signUp')}
                </Link>
              </p>
            </div>

            {/* Terms Footer */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {t('auth.login.termsPrefix')}{' '}
                <Link to="/terms" className="text-cyan-600 hover:text-cyan-700 transition-colors">
                  {t('auth.login.termsOfService')}
                </Link>{' '}
                {t('auth.login.and')}{' '}
                <Link to="/privacy" className="text-cyan-600 hover:text-cyan-700 transition-colors">
                  {t('auth.login.privacyPolicy')}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AuthLayout>
  )
}