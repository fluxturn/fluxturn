import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  Github,
  Twitter,
  Linkedin,
  Youtube,
  MessageSquare,
  FileText,
  Heart,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { apiClient } from '../../lib/api'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../ui/LanguageSwitcher'


export function Footer() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [subscribeMessage, setSubscribeMessage] = useState('')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubscribing(true)
    setSubscribeStatus('idle')

    try {
      const response = await apiClient.post('/newsletter/subscribe', {
        email,
        source: 'footer'
      })

      setSubscribeStatus('success')
      setSubscribeMessage(response.data.message || 'Successfully subscribed to newsletter')
      setEmail('')
    } catch (error: unknown) {
      setSubscribeStatus('error')
      const errObj = error as { response?: { status?: number; data?: { message?: string } } }
      if (errObj.response?.status === 409) {
        setSubscribeMessage('Email already subscribed')
      } else {
        setSubscribeMessage(errObj.response?.data?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setIsSubscribing(false)
      setTimeout(() => {
        setSubscribeStatus('idle')
        setSubscribeMessage('')
      }, 5000)
    }
  }

  const isScrollLink = (href: string) => href.startsWith('/#')

  const handleScrollLink = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isScrollLink(href)) {
      e.preventDefault()
      const targetId = href.substring(2)
      const element = document.getElementById(targetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const footerLinkKeys = {
    product: [
      { key: 'features', href: '/features' },
      { key: 'visualBuilders', href: '/docs/visual-builder' },
      { key: 'aiPlatform', href: '/docs/ai' },
      { key: 'integrations', href: '/docs/integrations-overview' },
    ],
    developers: [
      { key: 'documentation', href: '/docs' },
      { key: 'tutorials', href: '/tutorials' },
      { key: 'apiReference', href: '/docs/api' },
      { key: 'examples', href: '/docs/examples' },
    ],
    company: [
      { key: 'support', href: '/support' },
    ],
    legal: [
      { key: 'privacy', href: '/privacy' },
      { key: 'terms', href: '/terms' },
      { key: 'security', href: '/security' },
    ],
  }

  const socialLinks = [
    { name: 'GitHub', icon: Github, href: 'https://github.com/fluxturn' },
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/fluxturn' },
    { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/fluxturn' },
    { name: 'YouTube', icon: Youtube, href: 'https://youtube.com/@fluxturn' },
  ]

  return (
    <footer className="relative z-10 backdrop-blur-md bg-gray-900/50 border-t border-emerald-500/20">
      {/* Main Footer */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" onClick={scrollToTop} className="flex items-center space-x-2 mb-4">
              <img 
                src="/logo.png" 
                alt="FluxTurn Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                FluxTurn
              </span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-xs">
              {t('footer.description')}
            </p>
            <div className="flex space-x-4 mb-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-emerald-400 transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
            <LanguageSwitcher variant="footer" showLabel={true} showFlag={true} />
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.sections.product')}</h3>
            <ul className="space-y-3">
              {footerLinkKeys.product.map((link) => (
                <li key={link.key}>
                  {isScrollLink(link.href) ? (
                    <a
                      href={link.href}
                      onClick={(e) => handleScrollLink(e, link.href)}
                      className="text-gray-400 hover:text-emerald-400 transition-colors text-sm cursor-pointer"
                    >
                      {t(`footer.links.${link.key}`)}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      onClick={scrollToTop}
                      className="text-gray-400 hover:text-emerald-400 transition-colors text-sm"
                    >
                      {t(`footer.links.${link.key}`)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.sections.developers')}</h3>
            <ul className="space-y-3">
              {footerLinkKeys.developers.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.href}
                    onClick={scrollToTop}
                    className="text-gray-400 hover:text-emerald-400 transition-colors text-sm inline-flex items-center gap-1"
                  >
                    {t(`footer.links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.sections.company')}</h3>
            <ul className="space-y-3">
              {footerLinkKeys.company.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.href}
                    onClick={scrollToTop}
                    className="text-gray-400 hover:text-emerald-400 transition-colors text-sm"
                  >
                    {t(`footer.links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.sections.legal')}</h3>
            <ul className="space-y-3">
              {footerLinkKeys.legal.map((link) => (
                <li key={link.key}>
                  <Link
                    to={link.href}
                    onClick={scrollToTop}
                    className="text-gray-400 hover:text-emerald-400 transition-colors text-sm"
                  >
                    {t(`footer.links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-12 pt-8 border-t border-emerald-500/20">
          <div className="max-w-md">
            <h3 className="text-white font-semibold mb-2">{t('footer.newsletter.title')}</h3>
            <p className="text-gray-400 text-sm mb-4">
              {t('footer.newsletter.description')}
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder={t('footer.newsletter.placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-900/50 border border-emerald-500/20 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-400/50"
                disabled={isSubscribing}
                required
              />
              <button
                type="submit"
                disabled={isSubscribing}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isSubscribing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('footer.newsletter.subscribing')}</span>
                  </>
                ) : (
                  t('footer.newsletter.subscribe')
                )}
              </button>
            </form>

            {subscribeStatus !== 'idle' && (
              <div className={`mt-3 flex items-center gap-2 text-sm ${
                subscribeStatus === 'success' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {subscribeStatus === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{subscribeMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-900/30 backdrop-blur-sm border-t border-emerald-500/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-1 text-sm text-gray-400">
              <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
              <span className="mx-2">•</span>
              <span className="flex items-center">
                {t('footer.builtWith')} <Heart className="h-3 w-3 mx-1 text-red-500" /> {t('footer.byTeam')}
              </span>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <Link
                to="/support"
                onClick={scrollToTop}
                className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                <MessageSquare className="h-4 w-4" />
                {t('footer.links.support')}
              </Link>
              <Link
                to="/docs"
                onClick={scrollToTop}
                className="text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                {t('footer.docs')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}