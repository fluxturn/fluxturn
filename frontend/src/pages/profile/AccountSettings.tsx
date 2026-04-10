import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield,
  Key,
  Mail,
  Smartphone,
  Globe,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Lock,
  Plus,
  RotateCcw,
  Clock,
  Monitor,
  MapPin,
  Chrome,
  Github,
  Twitter,
  Bell
} from 'lucide-react'
import { GlassCard, StatCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { cn } from '../../lib/utils'

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface ApiToken {
  id: string
  name: string
  lastUsed: Date
  createdAt: Date
  permissions: string[]
  isActive: boolean
}

interface ConnectedAccount {
  id: string
  provider: 'google' | 'github' | 'twitter'
  email: string
  connectedAt: Date
  isActive: boolean
}

interface Session {
  id: string
  device: string
  location: string
  ipAddress: string
  browser: string
  lastActive: Date
  isCurrent: boolean
}

export const AccountSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'security' | 'email' | 'connected' | 'sessions' | 'tokens' | 'danger'>('security')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const mockTokens: ApiToken[] = [
    {
      id: '1',
      name: 'Production API',
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      permissions: ['read', 'write'],
      isActive: true
    },
    {
      id: '2',
      name: 'Development CLI',
      lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      permissions: ['read'],
      isActive: true
    },
    {
      id: '3',
      name: 'Mobile App',
      lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      permissions: ['read', 'write', 'delete'],
      isActive: false
    }
  ]

  const mockConnectedAccounts: ConnectedAccount[] = [
    {
      id: '1',
      provider: 'google',
      email: 'user@example.com',
      connectedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      isActive: true
    },
    {
      id: '2',
      provider: 'github',
      email: 'user@example.com',
      connectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      isActive: true
    }
  ]

  const mockSessions: Session[] = [
    {
      id: '1',
      device: 'MacBook Pro',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.100',
      browser: 'Chrome 120',
      lastActive: new Date(),
      isCurrent: true
    },
    {
      id: '2',
      device: 'iPhone 15',
      location: 'San Francisco, CA',
      ipAddress: '192.168.1.101',
      browser: 'Safari Mobile',
      lastActive: new Date(Date.now() - 3 * 60 * 60 * 1000),
      isCurrent: false
    },
    {
      id: '3',
      device: 'Windows PC',
      location: 'New York, NY',
      ipAddress: '10.0.0.50',
      browser: 'Firefox 115',
      lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isCurrent: false
    }
  ]

  const handlePasswordChange = async () => {
    setIsChangingPassword(true)
    try {
      // TODO: Implement password change
      await new Promise(resolve => setTimeout(resolve, 2000))
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      console.error('Password change failed:', error)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      // TODO: Implement account deletion
      await new Promise(resolve => setTimeout(resolve, 3000))
    } catch (error) {
      console.error('Account deletion failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const revokeToken = (_tokenId: string) => {
    // TODO: Implement token revocation
  }

  const disconnectAccount = (_accountId: string) => {
    // TODO: Implement account disconnection
  }

  const revokeSession = (_sessionId: string) => {
    // TODO: Implement session revocation
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return <Chrome className="w-4 h-4" />
      case 'github':
        return <Github className="w-4 h-4" />
      case 'twitter':
        return <Twitter className="w-4 h-4" />
      default:
        return <Globe className="w-4 h-4" />
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} minutes ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else {
      return `${Math.floor(diffInHours / 24)} days ago`
    }
  }

  const tabs = [
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
    { id: 'connected', label: 'Connected Accounts', icon: <Globe className="w-4 h-4" /> },
    { id: 'sessions', label: 'Sessions', icon: <Monitor className="w-4 h-4" /> },
    { id: 'tokens', label: 'API Tokens', icon: <Key className="w-4 h-4" /> },
    { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="w-4 h-4" /> }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-gray-400 mt-1">Manage your security, privacy, and account preferences</p>
        </motion.div>

        {/* Security Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <StatCard
            title="Security Score"
            value="98%"
            change={5}
            icon={<Shield className="w-6 h-6" />}
            color="from-green-500 to-emerald-500"
          />
          <StatCard
            title="Active Sessions"
            value={mockSessions.length}
            icon={<Monitor className="w-6 h-6" />}
            color="from-cyan-500 to-teal-500"
          />
          <StatCard
            title="API Tokens"
            value={mockTokens.filter(t => t.isActive).length}
            icon={<Key className="w-6 h-6" />}
            color="from-purple-500 to-indigo-500"
          />
          <StatCard
            title="Connected Accounts"
            value={mockConnectedAccounts.filter(a => a.isActive).length}
            icon={<Globe className="w-6 h-6" />}
            color="from-orange-500 to-red-500"
          />
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <GlassCard hover={false} className="p-2">
            <div className="flex flex-wrap gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Password Change */}
              <GlassCard hover={false}>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2">
                    Change Password
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="current-password"
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="pl-10 pr-10 bg-white/5 border-white/10 focus-visible:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400"
                        >
                          {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="new-password"
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="pl-10 pr-10 bg-white/5 border-white/10 focus-visible:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400"
                        >
                          {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="confirm-password"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="pl-10 pr-10 bg-white/5 border-white/10 focus-visible:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400"
                        >
                          {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handlePasswordChange}
                    disabled={isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                    className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Changing Password...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                </div>
              </GlassCard>

              {/* Two-Factor Authentication */}
              <GlassCard hover={false}>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2">
                    Two-Factor Authentication
                  </h3>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-medium text-white">Authenticator App</p>
                        <p className="text-sm text-gray-400">Use an authenticator app to generate codes</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {twoFactorEnabled && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Enabled
                        </Badge>
                      )}
                      <Switch
                        checked={twoFactorEnabled}
                        onCheckedChange={setTwoFactorEnabled}
                      />
                    </div>
                  </div>
                  
                  {twoFactorEnabled && (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                      <div className="flex items-center space-x-2 text-green-400 mb-2">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Two-factor authentication is active</span>
                      </div>
                      <p className="text-sm text-gray-400">
                        Your account is protected with two-factor authentication. Recovery codes are available if you lose access to your authenticator app.
                      </p>
                      <Button variant="outline" size="sm" className="mt-3 border-green-500/30 text-green-400 hover:bg-green-500/10">
                        View Recovery Codes
                      </Button>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === 'email' && (
            <GlassCard hover={false}>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2">
                  Email Preferences
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-medium text-white">Security Alerts</p>
                        <p className="text-sm text-gray-400">Get notified about security events and suspicious activity</p>
                      </div>
                    </div>
                    <Switch
                      checked={securityAlerts}
                      onCheckedChange={setSecurityAlerts}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="font-medium text-white">Email Notifications</p>
                        <p className="text-sm text-gray-400">Receive email notifications about your account activity</p>
                      </div>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Change Email Address</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="current-email">Current Email</Label>
                      <Input
                        id="current-email"
                        value="user@example.com"
                        disabled
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-email">New Email</Label>
                      <Input
                        id="new-email"
                        type="email"
                        placeholder="Enter new email"
                        className="bg-white/5 border-white/10 focus-visible:border-cyan-400"
                      />
                    </div>
                  </div>
                  <Button className="mt-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600">
                    Send Verification Email
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === 'connected' && (
            <GlassCard hover={false}>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2">
                  Connected Accounts
                </h3>
                
                <div className="space-y-3">
                  {mockConnectedAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                          {getProviderIcon(account.provider)}
                        </div>
                        <div>
                          <p className="font-medium text-white capitalize">{account.provider}</p>
                          <p className="text-sm text-gray-400">{account.email}</p>
                          <p className="text-xs text-gray-500">Connected {formatTime(account.connectedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectAccount(account.id)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-4">Connect New Account</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                      <Chrome className="w-4 h-4 mr-2" />
                      Connect Google
                    </Button>
                    <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                      <Github className="w-4 h-4 mr-2" />
                      Connect GitHub
                    </Button>
                    <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10">
                      <Twitter className="w-4 h-4 mr-2" />
                      Connect Twitter
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === 'sessions' && (
            <GlassCard hover={false}>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2">
                  Active Sessions
                </h3>
                
                <div className="space-y-3">
                  {mockSessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border",
                        session.isCurrent
                          ? "bg-cyan-500/10 border-cyan-500/30"
                          : "bg-white/5 border-white/10"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                          <Monitor className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-white">{session.device}</p>
                            {session.isCurrent && (
                              <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{session.browser}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {session.location}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(session.lastActive)}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeSession(session.id)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/10">
                  <Button
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Revoke All Other Sessions
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === 'tokens' && (
            <GlassCard hover={false}>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="text-xl font-semibold text-white">API Tokens</h3>
                  <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Token
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {mockTokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                          <Key className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-white">{token.name}</p>
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                token.isActive 
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                              )}
                            >
                              {token.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">
                              Created {formatTime(token.createdAt)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Last used {formatTime(token.lastUsed)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            {token.permissions.map((permission) => (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Regenerate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeToken(token.id)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === 'danger' && (
            <GlassCard hover={false}>
              <div className="space-y-6">
                <div className="flex items-center space-x-2 text-red-400 border-b border-white/10 pb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-xl font-semibold">Danger Zone</h3>
                </div>
                
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-400 mb-2">Delete Account</h4>
                      <p className="text-sm text-gray-400 mb-4">
                        Once you delete your account, there is no going back. Please be certain. 
                        This will permanently delete your account, all projects, and remove all associated data.
                      </p>
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-red-400">What will be deleted:</p>
                        <ul className="text-sm text-gray-400 space-y-1 ml-4">
                          <li>• All your projects and applications</li>
                          <li>• All deployments and associated data</li>
                          <li>• All API tokens and integrations</li>
                          <li>• Your profile and account settings</li>
                          <li>• All team memberships and collaborations</li>
                        </ul>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="mt-4 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete My Account
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900 border-red-500/30">
                          <DialogHeader>
                            <DialogTitle className="text-red-400">Are you absolutely sure?</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="confirm-deletion" className="text-white">
                                Type "DELETE" to confirm
                              </Label>
                              <Input
                                id="confirm-deletion"
                                placeholder="DELETE"
                                className="bg-white/5 border-red-500/30 focus-visible:border-red-400"
                              />
                            </div>
                            <div className="flex space-x-3">
                              <Button
                                onClick={handleDeleteAccount}
                                disabled={isDeleting}
                                className="bg-red-500 hover:bg-red-600 text-white"
                              >
                                {isDeleting ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Account
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </div>
  )
}