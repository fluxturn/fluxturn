import { useState, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, 
  ChevronDown,
  Home,
  Book,
  Code2,
  Rocket,
  Database,
  Shield,
  Mail,
  Bell,
  Search,
  Cloud,
  Cpu,
  Key,
  BarChart3,
  Image,
  FileCode,
  Package,
  Smartphone,
  Monitor,
  Globe,
  Zap,
  Brain,
  Terminal,
  GitBranch,
  HelpCircle,
  ExternalLink,
  Menu,
  X,
  Eye,
  Github,
  RefreshCw,
  MessageSquare,
  Layers,
  Wrench,
  FileText,
  ScanText,
  CreditCard
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Header } from './Header'
import { LanguageProvider } from '../../contexts/LanguageContext'

interface NavItem {
  title: string
  href?: string
  icon?: any
  items?: NavItem[]
  badge?: string
  isNew?: boolean
  isComingSoon?: boolean
}

const navigation: NavItem[] = [
  {
    title: 'Getting Started',
    icon: Rocket,
    items: [
      { title: 'Introduction', href: '/docs', icon: Home },
      { title: 'Quick Start', href: '/docs/quickstart', icon: Zap },
      { title: 'Installation', href: '/docs/installation', icon: Package },
      { title: 'Authentication', href: '/docs/authentication', icon: Key },
    ]
  },
  {
    title: 'SDKs',
    icon: Code2,
    items: [
      { title: 'Node.js SDK', href: '/docs/sdk/nodejs', icon: Terminal, badge: 'v1.0' },
      { title: 'Flutter SDK', href: '/docs/sdk/flutter', icon: Smartphone, badge: 'v1.0' },
    ]
  },
  {
    title: 'Database',
    icon: Database,
    items: [
      { title: 'Overview', href: '/docs/database', icon: Database },
      { title: 'Schema Design', href: '/docs/database/schema', icon: FileCode },
      { title: 'Queries', href: '/docs/database/queries', icon: Search },
      { title: 'Relationships', href: '/docs/database/relationships', icon: GitBranch },
      { title: 'Transactions', href: '/docs/database/transactions', icon: RefreshCw },
      { title: 'Real-time', href: '/docs/database/realtime', icon: Zap },
    ]
  },
  {
    title: 'Storage',
    icon: Image,
    items: [
      { title: 'File Upload', href: '/docs/storage/upload', icon: Cloud },
      { title: 'Image Processing', href: '/docs/storage/images', icon: Image },
      { title: 'CDN', href: '/docs/storage/cdn', icon: Globe },
      { title: 'Security', href: '/docs/storage/security', icon: Shield },
    ]
  },
  {
    title: 'Notifications',
    icon: Bell,
    items: [
      { title: 'Push Notifications', href: '/docs/notifications/push', icon: Bell },
      { title: 'Email', href: '/docs/notifications/email', icon: Mail },
      { title: 'SMS', href: '/docs/notifications/sms', icon: Smartphone, isComingSoon: true },
      { title: 'In-App', href: '/docs/notifications/in-app', icon: Monitor },
    ]
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    items: [
      { title: 'Real-time Analytics', href: '/docs/analytics/realtime', icon: Zap },
    ]
  },
  {
    title: 'AI & ML',
    icon: Brain,
    items: [
      { title: 'Overview', href: '/docs/ai', icon: Brain },
      { title: 'Text Generation', href: '/docs/ai/generation', icon: FileCode },
      { title: 'Media Generation', href: '/docs/ai/media', icon: Image },
      { title: 'Content Analysis', href: '/docs/ai/analysis', icon: BarChart3 },
      { title: 'Embeddings', href: '/docs/ai/embeddings', icon: Cpu },
    ]
  },
  {
    title: 'Tools',
    icon: Wrench,
    items: [
      { title: 'Document Conversion', href: '/docs/tools/document-conversion', icon: FileText },
      { title: 'Image Processing', href: '/docs/tools/image-processing', icon: Image },
      { title: 'OCR', href: '/docs/tools/ocr', icon: ScanText },
      { title: 'Payment Processing', href: '/docs/tools/payment', icon: CreditCard },
      { title: 'PDF Processing', href: '/docs/tools/pdf', icon: FileCode },
    ]
  },
  {
    title: 'No-Code Builder',
    icon: Brain,
    isNew: true,
    items: [
      { title: 'Overview', href: '/docs/nocode/overview', icon: Book },
      { title: 'Visual Editor', href: '/docs/nocode/editor', icon: Monitor },
      { title: 'AI Assistant', href: '/docs/nocode/ai', icon: Brain, isNew: true },
      { title: 'Templates', href: '/docs/nocode/templates', icon: FileCode },
      { title: 'Components', href: '/docs/nocode/components', icon: Layers },
    ]
  },
  {
    title: 'Deployment',
    icon: Cloud,
    items: [
      { title: 'Environments', href: '/docs/deployment/environments', icon: GitBranch },
      { title: 'GitHub Integration', href: '/docs/deployment/github', icon: Github },
      { title: 'Preview Deployments', href: '/docs/deployment/preview', icon: Eye },
      { title: 'Production Deploy', href: '/docs/deployment/production', icon: Rocket },
      { title: 'CI/CD Pipeline', href: '/docs/deployment/cicd', icon: RefreshCw },
    ]
  },
  {
    title: 'IDE Features',
    icon: Code2,
    items: [
      { title: 'Code Editor', href: '/docs/ide/editor', icon: FileCode },
      { title: 'AI Chat', href: '/docs/ide/chat', icon: MessageSquare },
      { title: 'Model Selection', href: '/docs/ide/models', icon: Brain },
      { title: 'Terminal', href: '/docs/ide/terminal', icon: Terminal },
      { title: 'Version Control', href: '/docs/ide/git', icon: GitBranch },
    ]
  }
]

interface DocsLayoutProps {
  children: React.ReactNode
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Force scroll to top when DocsLayout mounts (first time entering docs)
  useEffect(() => {
    // Immediately scroll to top when entering docs
    window.scrollTo(0, 0)

    // Also force scroll after a short delay to override any other scroll behavior
    const timer = setTimeout(() => {
      window.scrollTo(0, 0)
    }, 50)

    return () => clearTimeout(timer)
  }, [])

  // Also scroll to top when pathname changes within docs
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Auto-expand active sections
  useEffect(() => {
    const activeSection = navigation.find(section =>
      section.items?.some(item => item.href === pathname)
    )
    if (activeSection) {
      setExpandedItems(prev =>
        prev.includes(activeSection.title) ? prev : [...prev, activeSection.title]
      )
    }
  }, [pathname])

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const handleLandingPageLink = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    // Handle links to landing page sections (e.g., /#features, /#pricing)
    if (href.startsWith('/#')) {
      e.preventDefault()
      const targetId = href.substring(2)
      // Navigate with state to prevent ScrollToTop from interfering
      navigate('/', { state: { scrollToSection: targetId } })
    }
  }

  const filteredNavigation = navigation.filter(section => {
    if (!searchQuery) return true
    return section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.items?.some(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
  })

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-gray-850 to-zinc-800 flex flex-col">
        {/* Ultra Modern Professional Lighting System */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Primary Ultra-Bright Light Sources */}
          <div className="absolute top-[8%] left-[12%] w-40 h-40 bg-emerald-400/70 rounded-full blur-3xl animate-pulse shadow-2xl shadow-emerald-400/80" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-[22%] left-[78%] w-44 h-44 bg-blue-500/65 rounded-full blur-3xl animate-pulse shadow-2xl shadow-blue-500/80" style={{ animationDelay: '1.2s' }}></div>
          <div className="absolute top-[45%] left-[25%] w-38 h-38 bg-cyan-400/75 rounded-full blur-3xl animate-pulse shadow-2xl shadow-cyan-400/80" style={{ animationDelay: '2.4s' }}></div>
          <div className="absolute top-[65%] left-[82%] w-36 h-36 bg-teal-500/70 rounded-full blur-3xl animate-pulse shadow-2xl shadow-teal-500/80" style={{ animationDelay: '3.6s' }}></div>
          <div className="absolute top-[85%] left-[18%] w-42 h-42 bg-indigo-500/68 rounded-full blur-3xl animate-pulse shadow-2xl shadow-indigo-500/80" style={{ animationDelay: '4.8s' }}></div>
          
          {/* Secondary Ultra-Bright Accents */}
          <div className="absolute top-[35%] left-[55%] w-32 h-32 bg-violet-400/60 rounded-full blur-2xl animate-pulse shadow-2xl shadow-violet-400/70" style={{ animationDelay: '1.8s' }}></div>
          <div className="absolute top-[72%] left-[45%] w-34 h-34 bg-sky-400/65 rounded-full blur-2xl animate-pulse shadow-2xl shadow-sky-400/70" style={{ animationDelay: '3s' }}></div>
          <div className="absolute top-[15%] left-[88%] w-30 h-30 bg-emerald-300/70 rounded-full blur-2xl animate-pulse shadow-2xl shadow-emerald-300/70" style={{ animationDelay: '0.6s' }}></div>
          <div className="absolute top-[92%] left-[65%] w-32 h-32 bg-cyan-300/60 rounded-full blur-2xl animate-pulse shadow-2xl shadow-cyan-300/70" style={{ animationDelay: '4.2s' }}></div>
          
          {/* Tertiary Professional Glow */}
          <div className="absolute top-[28%] left-[40%] w-24 h-24 bg-blue-300/55 rounded-full blur-xl animate-pulse shadow-xl shadow-blue-300/60" style={{ animationDelay: '1.4s' }}></div>
          <div className="absolute top-[52%] left-[70%] w-28 h-28 bg-emerald-300/60 rounded-full blur-xl animate-pulse shadow-xl shadow-emerald-300/60" style={{ animationDelay: '2.6s' }}></div>
          <div className="absolute top-[78%] left-[35%] w-26 h-26 bg-teal-300/58 rounded-full blur-xl animate-pulse shadow-xl shadow-teal-300/60" style={{ animationDelay: '3.8s' }}></div>
          
          {/* Ultra-Bright Modern Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.12] via-white/[0.06] to-emerald-500/[0.12]"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.10] via-transparent to-teal-500/[0.10]"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/[0.08] via-transparent to-violet-500/[0.08]"></div>
          <div className="absolute inset-0 bg-radial-gradient from-white/[0.15] via-emerald-400/[0.04] to-transparent"></div>
          
          {/* Modern Professional Spotlights */}
          <div className="absolute top-[5%] left-[50%] w-16 h-16 bg-white/70 rounded-full blur-lg animate-pulse shadow-2xl shadow-white/80" style={{ animationDelay: '0.3s' }}></div>
          <div className="absolute top-[30%] left-[5%] w-18 h-18 bg-emerald-400/65 rounded-full blur-lg animate-pulse shadow-2xl shadow-emerald-400/80" style={{ animationDelay: '1.3s' }}></div>
          <div className="absolute top-[60%] left-[95%] w-16 h-16 bg-cyan-400/70 rounded-full blur-lg animate-pulse shadow-2xl shadow-cyan-400/80" style={{ animationDelay: '2.3s' }}></div>
          <div className="absolute top-[90%] left-[75%] w-18 h-18 bg-teal-400/65 rounded-full blur-lg animate-pulse shadow-2xl shadow-teal-400/80" style={{ animationDelay: '3.3s' }}></div>
          
          {/* Contemporary Tech Grid */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(52,211,153,0.08)_1px,transparent_1px)] bg-[length:80px_80px]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(59,130,246,0.06)_1px,transparent_1px)] bg-[length:100px_100px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,165,233,0.05)_1px,transparent_1px)] bg-[length:120px_120px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(16,185,129,0.04)_1px,transparent_1px)] bg-[length:140px_140px]"></div>
          
          {/* Dynamic Professional Glow */}
          <div className="absolute top-1/4 left-1/2 w-96 h-96 bg-emerald-400/[0.15] rounded-full blur-3xl opacity-80"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/[0.12] rounded-full blur-3xl opacity-75"></div>
          <div className="absolute top-3/4 left-1/4 w-88 h-88 bg-cyan-400/[0.14] rounded-full blur-3xl opacity-70"></div>
        </div>

      {/* Header */}
      <Header />
      
      {/* Preview Warning Bar */}
      <div className="bg-red-600 text-white py-2 px-4 text-center text-sm font-medium border-b border-red-500 mt-16">
        ⚠️ PREVIEW MODE - This is a development preview. Data may be reset. Not for production use.
      </div>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-24 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-gray-900/50 backdrop-blur-sm border border-emerald-500/20"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isMobileMenuOpen || true) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "fixed left-0 top-0 h-full w-80 bg-gray-900/50 backdrop-blur-xl border-r border-emerald-500/20 overflow-y-auto z-40",
              "lg:translate-x-0",
              !isMobileMenuOpen && "hidden lg:block"
            )}
          >
            <div className="p-6 pt-24">
              {/* Logo */}
              <Link to="/" className="flex items-center space-x-2 mb-8">
                <img 
                  src="/logo.png" 
                  alt="FluxTurn Logo" 
                  className="w-8 h-8 object-contain"
                />
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  FluxTurn Docs
                </span>
              </Link>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-400/50" />
                <Input
                  type="search"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-900/50 border-emerald-500/20 text-white placeholder:text-gray-500 focus:border-emerald-400/50"
                />
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                {filteredNavigation.map((section) => (
                  <div key={section.title}>
                    <button
                      onClick={() => section.items && toggleExpanded(section.title)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all",
                        "hover:bg-emerald-500/10 hover:text-emerald-400",
                        expandedItems.includes(section.title) && "text-emerald-400"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        {section.icon && <section.icon className="h-4 w-4" />}
                        <span>{section.title}</span>
                        {section.isNew && (
                          <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                            NEW
                          </span>
                        )}
                      </div>
                      {section.items && (
                        expandedItems.includes(section.title) 
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    <AnimatePresence>
                      {section.items && expandedItems.includes(section.title) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-4 mt-1 space-y-1 overflow-hidden"
                        >
                          {section.items.map((item) => (
                            <Link
                              key={item.href || item.title}
                              to={item.href || '#'}
                              className={cn(
                                "flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-all",
                                pathname === item.href
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "text-gray-400 hover:text-white hover:bg-emerald-500/10",
                                item.isComingSoon && "opacity-50 cursor-not-allowed"
                              )}
                              onClick={(e) => {
                                if (item.isComingSoon) {
                                  e.preventDefault()
                                } else {
                                  setIsMobileMenuOpen(false)
                                }
                              }}
                            >
                              {item.icon && <item.icon className="h-4 w-4" />}
                              <span className="flex-1">{item.title}</span>
                              {item.badge && (
                                <span className="px-2 py-0.5 text-xs bg-gray-800 text-gray-400 rounded">
                                  {item.badge}
                                </span>
                              )}
                              {item.isNew && (
                                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                                  NEW
                                </span>
                              )}
                              {item.isComingSoon && (
                                <span className="px-2 py-0.5 text-xs bg-gray-800 text-gray-500 rounded">
                                  SOON
                                </span>
                              )}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </nav>

              {/* Footer Links */}
              <div className="mt-8 pt-8 border-t border-emerald-500/20">
                <div className="space-y-2">
                  <a
                    href="https://github.com/fluxturn"
                    className="flex items-center space-x-2 text-sm text-gray-400 hover:text-emerald-400 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GitBranch className="h-4 w-4" />
                    <span>GitHub</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <Link
                    to="/support"
                    className="flex items-center space-x-2 text-sm text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Support</span>
                  </Link>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all relative z-10 pt-20",
        "lg:pl-80"
      )}>
        <div className="max-w-5xl mx-auto px-6 py-12">
          {children}
        </div>
      </main>

      {/* Footer */}
      <div className="lg:pl-80">
        <footer className="relative z-10 bg-gray-900/50 backdrop-blur-xl border-t border-emerald-500/20 py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">FluxTurn</h3>
                <p className="text-gray-400">Build amazing applications with our comprehensive development environment.</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Product</h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="/#features"
                      onClick={(e) => handleLandingPageLink(e, '/#features')}
                      className="text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      Features
                    </a>
                  </li>
                  <li>
                    <a
                      href="/#pricing"
                      onClick={(e) => handleLandingPageLink(e, '/#pricing')}
                      className="text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      Pricing
                    </a>
                  </li>
                  <li><Link to="/docs" className="text-gray-400 hover:text-emerald-400 transition-colors">Documentation</Link></li>
                  <li>
                    <a
                      href="/#desktop"
                      onClick={(e) => handleLandingPageLink(e, '/#desktop')}
                      className="text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      Downloads
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Company</h4>
                <ul className="space-y-2">
                  <li><Link to="/support" className="text-gray-400 hover:text-emerald-400 transition-colors">Support</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li><Link to="/privacy" className="text-gray-400 hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                  <li><Link to="/terms" className="text-gray-400 hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                  <li><Link to="/security" className="text-gray-400 hover:text-emerald-400 transition-colors">Security</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-800 text-center">
              <p className="text-gray-400">&copy; 2025 FluxTurn. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      </div>
    </LanguageProvider>
  )
}