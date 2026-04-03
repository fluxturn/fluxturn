import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Globe,
  Smartphone,
  Server,
  Database,
  GitBranch,
  Users,
  Settings,
  Play,
  Code,
  Palette,
  Zap,
  Shield,
  Search,
  Star,
  Clock,
  Download,
  ExternalLink,
  Plus,
  RefreshCw
} from 'lucide-react'
import { GlassCard } from '../../components/ui/GlassCard'
import { ProjectHierarchy } from '../../components/projects/ProjectHierarchy'
import { cn } from '../../lib/utils'

// Template data
const templates = {
  react: [
    {
      id: 'react-basic',
      name: 'Basic React App',
      description: 'Simple React application with TypeScript and Vite',
      image: 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=400',
      tags: ['React', 'TypeScript', 'Vite'],
      complexity: 'Beginner',
      setupTime: '5 min',
      features: ['Modern React 18', 'TypeScript', 'Hot Module Replacement', 'ESLint & Prettier'],
      popularity: 95
    },
    {
      id: 'react-ecommerce',
      name: 'E-commerce Platform',
      description: 'Full-featured e-commerce platform with cart, payments, and admin panel',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400',
      tags: ['React', 'Redux', 'Stripe', 'Firebase'],
      complexity: 'Advanced',
      setupTime: '15 min',
      features: ['Shopping Cart', 'Payment Integration', 'User Authentication', 'Admin Dashboard'],
      popularity: 88
    },
    {
      id: 'react-dashboard',
      name: 'Analytics Dashboard',
      description: 'Beautiful dashboard with charts, tables, and real-time data',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
      tags: ['React', 'Chart.js', 'Material-UI'],
      complexity: 'Intermediate',
      setupTime: '10 min',
      features: ['Interactive Charts', 'Data Visualization', 'Real-time Updates', 'Responsive Design'],
      popularity: 92
    }
  ],
  flutter: [
    {
      id: 'flutter-basic',
      name: 'Flutter Starter',
      description: 'Basic Flutter app with navigation and state management',
      image: 'https://images.unsplash.com/photo-1563207153-f403bf289096?w=400',
      tags: ['Flutter', 'Dart', 'Provider'],
      complexity: 'Beginner',
      setupTime: '8 min',
      features: ['Cross-platform', 'State Management', 'Navigation', 'Material Design'],
      popularity: 78
    },
    {
      id: 'flutter-social',
      name: 'Social Media App',
      description: 'Social media app with posts, comments, and user profiles',
      image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400',
      tags: ['Flutter', 'Firebase', 'BLoC'],
      complexity: 'Advanced',
      setupTime: '20 min',
      features: ['User Authentication', 'Real-time Chat', 'Image Upload', 'Push Notifications'],
      popularity: 85
    }
  ],
  nestjs: [
    {
      id: 'nestjs-api',
      name: 'REST API',
      description: 'RESTful API with authentication, validation, and database integration',
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400',
      tags: ['NestJS', 'PostgreSQL', 'JWT'],
      complexity: 'Intermediate',
      setupTime: '12 min',
      features: ['JWT Authentication', 'Database Integration', 'API Documentation', 'Input Validation'],
      popularity: 81
    },
    {
      id: 'nestjs-microservices',
      name: 'Microservices',
      description: 'Microservices architecture with message queues and service discovery',
      image: 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=400',
      tags: ['NestJS', 'Redis', 'RabbitMQ'],
      complexity: 'Expert',
      setupTime: '25 min',
      features: ['Microservices', 'Message Queues', 'Load Balancing', 'Health Checks'],
      popularity: 73
    }
  ]
}

const breadcrumbs = [
  { id: '1', name: 'Acme Corporation', type: 'organization' as const, path: '/org/1' },
  { id: 'projects', name: 'Projects', type: 'project' as const, path: '/org/1/projects' },
  { id: 'create', name: 'Create Project', type: 'project' as const, path: '/org/1/projects/new' }
]

const steps = [
  { id: 1, name: 'Template Selection', description: 'Choose your project template' },
  { id: 2, name: 'Project Configuration', description: 'Configure your project settings' },
  { id: 3, name: 'Team & GitHub', description: 'Set up team access and repository' },
  { id: 4, name: 'Initial Settings', description: 'Configure deployment and environment' }
]

const teamMembers = [
  { id: '1', name: 'John Doe', email: 'john@acme.com', role: 'Admin', avatar: null },
  { id: '2', name: 'Jane Smith', email: 'jane@acme.com', role: 'Developer', avatar: null },
  { id: '3', name: 'Bob Johnson', email: 'bob@acme.com', role: 'Designer', avatar: null },
  { id: '4', name: 'Alice Brown', email: 'alice@acme.com', role: 'Developer', avatar: null }
]

export const CreateProject: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<'react' | 'flutter' | 'nestjs'>('react')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Project configuration
  const [projectConfig, setProjectConfig] = useState({
    name: '',
    description: '',
    isPublic: false,
    enableAnalytics: true,
    enableAutoDeployment: true
  })

  // GitHub configuration
  const [githubConfig, setGithubConfig] = useState({
    createRepo: true,
    repoName: '',
    repoDescription: '',
    isPrivate: true,
    includeReadme: true
  })

  // Team configuration
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  // Environment configuration
  const [envConfig, setEnvConfig] = useState({
    environment: 'production',
    region: 'us-east-1',
    instanceType: 'small',
    autoScaling: false
  })

  const [isCreating, setIsCreating] = useState(false)

  const categories = [
    { 
      id: 'react' as const, 
      name: 'Web Applications', 
      icon: Globe, 
      description: 'React, Vue, Angular applications',
      color: 'from-blue-400 to-cyan-500'
    },
    { 
      id: 'flutter' as const, 
      name: 'Mobile Apps', 
      icon: Smartphone, 
      description: 'Flutter, React Native applications',
      color: 'from-teal-400 to-cyan-500'
    },
    { 
      id: 'nestjs' as const, 
      name: 'Backend APIs', 
      icon: Server, 
      description: 'NestJS, Express, FastAPI backends',
      color: 'from-purple-400 to-pink-500'
    }
  ]

  const filteredTemplates = templates[selectedCategory]?.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Beginner': return 'text-green-400 bg-green-400/20'
      case 'Intermediate': return 'text-yellow-400 bg-yellow-400/20'
      case 'Advanced': return 'text-orange-400 bg-orange-400/20'
      case 'Expert': return 'text-red-400 bg-red-400/20'
      default: return 'text-gray-400 bg-gray-400/20'
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreateProject = async () => {
    setIsCreating(true)
    // Simulate project creation
    setTimeout(() => {
      setIsCreating(false)
      // console.log('Project created successfully!')
      // Redirect to project dashboard
    }, 3000)
  }

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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Category Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose Project Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {categories.map((category) => {
                  const Icon = category.icon
                  return (
                    <motion.button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "p-6 rounded-xl transition-all text-left",
                        selectedCategory === category.id
                          ? "bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border-2 border-cyan-400/50"
                          : "glass hover:bg-white/10 border-2 border-transparent"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br",
                        category.color
                      )}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-semibold mb-1">{category.name}</h4>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Template Search */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Template</h3>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedTemplate === template.id ? "scale-105" : ""
                  )}
                  onClick={() => setSelectedTemplate(template.id)}
                  whileHover={{ y: -5 }}
                >
                  <GlassCard 
                    className={cn(
                      "relative overflow-hidden",
                      selectedTemplate === template.id 
                        ? "ring-2 ring-cyan-400/50 bg-gradient-to-br from-cyan-400/10 to-blue-500/10" 
                        : ""
                    )}
                    hover={true}
                    glow={selectedTemplate === template.id}
                  >
                    {/* Template Image */}
                    <div className="h-40 -m-6 mb-4 overflow-hidden rounded-t-xl">
                      <img 
                        src={template.image} 
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/60" />
                    </div>

                    {/* Selection Indicator */}
                    {selectedTemplate === template.id && (
                      <div className="absolute top-4 right-4 w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}

                    {/* Template Content */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{template.name}</h4>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-yellow-400">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{template.popularity}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-white/10 rounded-md text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="px-2 py-1 bg-white/10 rounded-md text-xs">
                            +{template.tags.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{template.setupTime}</span>
                          </div>
                          <span className={cn(
                            "px-2 py-1 rounded-full font-medium",
                            getComplexityColor(template.complexity)
                          )}>
                            {template.complexity}
                          </span>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Key Features:</p>
                        <ul className="text-xs space-y-0.5">
                          {template.features.slice(0, 2).map((feature) => (
                            <li key={feature} className="flex items-center space-x-2">
                              <Check className="w-3 h-3 text-green-400" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-8">
                <Search className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground">No templates found matching your search</p>
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-lg font-semibold">Project Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Project Name *</label>
                <input
                  type="text"
                  value={projectConfig.name}
                  onChange={(e) => setProjectConfig(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  placeholder="My Awesome Project"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={projectConfig.description}
                  onChange={(e) => setProjectConfig(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  placeholder="Brief description of your project..."
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Project Settings</h4>
                
                <label className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Public Project</span>
                    <p className="text-sm text-muted-foreground">Make this project visible to everyone</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={projectConfig.isPublic}
                    onChange={(e) => setProjectConfig(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="toggle"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Enable Analytics</span>
                    <p className="text-sm text-muted-foreground">Track project performance and usage</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={projectConfig.enableAnalytics}
                    onChange={(e) => setProjectConfig(prev => ({ ...prev, enableAnalytics: e.target.checked }))}
                    className="toggle"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Auto Deployment</span>
                    <p className="text-sm text-muted-foreground">Automatically deploy on git push</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={projectConfig.enableAutoDeployment}
                    onChange={(e) => setProjectConfig(prev => ({ ...prev, enableAutoDeployment: e.target.checked }))}
                    className="toggle"
                  />
                </label>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6 max-w-4xl">
            <h3 className="text-lg font-semibold">Team & GitHub Integration</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* GitHub Configuration */}
              <GlassCard>
                <div className="flex items-center space-x-2 mb-4">
                  <GitBranch className="w-5 h-5 text-green-400" />
                  <h4 className="font-medium">GitHub Repository</h4>
                </div>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">Create new repository</span>
                    <input
                      type="checkbox"
                      checked={githubConfig.createRepo}
                      onChange={(e) => setGithubConfig(prev => ({ ...prev, createRepo: e.target.checked }))}
                      className="toggle"
                    />
                  </label>

                  {githubConfig.createRepo && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2">Repository Name</label>
                        <input
                          type="text"
                          value={githubConfig.repoName}
                          onChange={(e) => setGithubConfig(prev => ({ ...prev, repoName: e.target.value }))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                          placeholder="my-awesome-project"
                        />
                      </div>

                      <label className="flex items-center justify-between">
                        <span className="text-sm">Private repository</span>
                        <input
                          type="checkbox"
                          checked={githubConfig.isPrivate}
                          onChange={(e) => setGithubConfig(prev => ({ ...prev, isPrivate: e.target.checked }))}
                          className="toggle"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-sm">Include README</span>
                        <input
                          type="checkbox"
                          checked={githubConfig.includeReadme}
                          onChange={(e) => setGithubConfig(prev => ({ ...prev, includeReadme: e.target.checked }))}
                          className="toggle"
                        />
                      </label>
                    </>
                  )}
                </div>
              </GlassCard>

              {/* Team Members */}
              <GlassCard>
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="w-5 h-5 text-teal-400" />
                  <h4 className="font-medium">Team Members</h4>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers(prev => [...prev, member.id])
                          } else {
                            setSelectedMembers(prev => prev.filter(id => id !== member.id))
                          }
                        }}
                        className="rounded border-white/10 bg-white/5"
                      />
                    </label>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6 max-w-2xl">
            <h3 className="text-lg font-semibold">Initial Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Environment</label>
                <select
                  value={envConfig.environment}
                  onChange={(e) => setEnvConfig(prev => ({ ...prev, environment: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Region</label>
                <select
                  value={envConfig.region}
                  onChange={(e) => setEnvConfig(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <option value="us-east-1">US East (Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">Europe (Ireland)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Instance Type</label>
                <select
                  value={envConfig.instanceType}
                  onChange={(e) => setEnvConfig(prev => ({ ...prev, instanceType: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <option value="small">Small (1 CPU, 512MB RAM)</option>
                  <option value="medium">Medium (2 CPU, 1GB RAM)</option>
                  <option value="large">Large (4 CPU, 2GB RAM)</option>
                </select>
              </div>

              <label className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Enable Auto Scaling</span>
                  <p className="text-sm text-muted-foreground">Automatically scale based on traffic</p>
                </div>
                <input
                  type="checkbox"
                  checked={envConfig.autoScaling}
                  onChange={(e) => setEnvConfig(prev => ({ ...prev, autoScaling: e.target.checked }))}
                  className="toggle"
                />
              </label>
            </div>

            {/* Project Summary */}
            <GlassCard className="mt-8">
              <h4 className="font-medium mb-4">Project Summary</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template:</span>
                  <span>{templates[selectedCategory]?.find(t => t.id === selectedTemplate)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Name:</span>
                  <span>{projectConfig.name || 'Untitled Project'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team Members:</span>
                  <span>{selectedMembers.length} members</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Environment:</span>
                  <span className="capitalize">{envConfig.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region:</span>
                  <span>{envConfig.region}</span>
                </div>
              </div>
            </GlassCard>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hierarchy Navigation */}
      <motion.div variants={itemVariants}>
        <ProjectHierarchy
          breadcrumbs={breadcrumbs}
          onNavigate={(item) => console.log('Navigate to:', item)}
          onProjectSwitch={(projectId) => console.log('Switch to project:', projectId)}
        />
      </motion.div>

      {/* Header */}
      <motion.div 
        className="flex items-center space-x-4"
        variants={itemVariants}
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
          <Plus className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gradient">Create New Project</h1>
          <p className="text-muted-foreground">Set up your project with our guided wizard</p>
        </div>
      </motion.div>

      {/* Progress Steps */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false}>
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    currentStep === step.id ? "bg-cyan-400 text-white" :
                    currentStep > step.id ? "bg-green-400 text-white" :
                    "bg-white/10 text-muted-foreground"
                  )}>
                    {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                  </div>
                  <div className="ml-3">
                    <p className={cn(
                      "text-sm font-medium",
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-16 h-px mx-4 transition-all",
                    currentStep > step.id ? "bg-green-400" : "bg-white/20"
                  )} />
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Step Content */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false} className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* Navigation */}
      <motion.div 
        className="flex items-center justify-between"
        variants={itemVariants}
      >
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className={cn(
            "flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all",
            currentStep === 1 
              ? "opacity-50 cursor-not-allowed bg-white/5" 
              : "glass hover:bg-white/10"
          )}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Previous</span>
        </button>

        <div className="flex items-center space-x-3">
          {currentStep === steps.length ? (
            <button
              onClick={handleCreateProject}
              disabled={!selectedTemplate || !projectConfig.name || isCreating}
              className={cn(
                "flex items-center space-x-2 px-8 py-3 rounded-xl font-medium transition-all",
                (!selectedTemplate || !projectConfig.name || isCreating)
                  ? "opacity-50 cursor-not-allowed bg-white/5"
                  : "bg-gradient-to-r from-cyan-400 to-blue-500"
              )}
            >
              {isCreating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw className="w-5 h-5" />
                  </motion.div>
                  <span>Creating Project...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Create Project</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={
                (currentStep === 1 && !selectedTemplate) ||
                (currentStep === 2 && !projectConfig.name)
              }
              className={cn(
                "flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all",
                (currentStep === 1 && !selectedTemplate) ||
                (currentStep === 2 && !projectConfig.name)
                  ? "opacity-50 cursor-not-allowed bg-white/5"
                  : "bg-gradient-to-r from-cyan-400 to-blue-500"
              )}
            >
              <span>Next</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}