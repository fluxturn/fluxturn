import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Mail, 
  Globe, 
  Clock, 
  Languages, 
  Bell, 
  Activity, 
  Edit3, 
  Camera,
  Save,
  X,
  Link as LinkIcon,
  Github,
  Twitter,
  Linkedin,
  MapPin,
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react'
import { GlassCard, StatCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Switch } from '../../components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { cn } from '../../lib/utils'

interface UserProfileData {
  name: string
  email: string
  bio: string
  avatar: string
  location: string
  website: string
  github: string
  twitter: string
  linkedin: string
  timezone: string
  language: string
  publicProfile: boolean
  emailNotifications: boolean
  activityNotifications: boolean
  marketingEmails: boolean
}

interface ActivityItem {
  id: string
  type: 'project' | 'deployment' | 'collaboration' | 'settings'
  title: string
  description: string
  timestamp: Date
  icon: React.ReactNode
}

export const UserProfile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'activity' | 'notifications'>('profile')
  const [profile, setProfile] = useState<UserProfileData>({
    name: 'Alex Thompson',
    email: 'user@example.com',
    bio: 'Full-stack developer passionate about AI-driven development tools. Building the future one app at a time.',
    avatar: '/api/placeholder/120/120',
    location: 'San Francisco, CA',
    website: 'https://alexthompson.dev',
    github: 'alexthompson',
    twitter: 'alex_codes',
    linkedin: 'alexthompsondev',
    timezone: 'America/Los_Angeles',
    language: 'en',
    publicProfile: true,
    emailNotifications: true,
    activityNotifications: true,
    marketingEmails: false
  })

  const [editingProfile, setEditingProfile] = useState<UserProfileData>(profile)

  const handleSave = () => {
    setProfile(editingProfile)
    setIsEditing(false)
    // TODO: Save to backend
  }

  const handleCancel = () => {
    setEditingProfile(profile)
    setIsEditing(false)
  }

  const mockActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'project',
      title: 'Created new project',
      description: 'E-commerce Dashboard - React + TypeScript',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: <Activity className="w-4 h-4 text-cyan-400" />
    },
    {
      id: '2',
      type: 'deployment',
      title: 'Deployed to production',
      description: 'Task Manager App v2.1.0',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      icon: <Globe className="w-4 h-4 text-green-400" />
    },
    {
      id: '3',
      type: 'collaboration',
      title: 'Joined team workspace',
      description: 'FluxTurn Internal Tools',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      icon: <User className="w-4 h-4 text-purple-400" />
    },
    {
      id: '4',
      type: 'settings',
      title: 'Updated profile settings',
      description: 'Changed timezone to PST',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      icon: <Clock className="w-4 h-4 text-orange-400" />
    }
  ]

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> }
  ]

  const timezones = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'Europe/London', label: 'GMT' },
    { value: 'Europe/Berlin', label: 'Central European Time' },
    { value: 'Asia/Tokyo', label: 'Japan Time' }
  ]

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' }
  ]

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Profile Settings
            </h1>
            <p className="text-gray-400 mt-1">Manage your profile and account preferences</p>
          </div>
          
          {activeTab === 'profile' && (
            <Button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <StatCard
            title="Projects Created"
            value={24}
            change={12}
            icon={<Activity className="w-6 h-6" />}
            color="from-cyan-500 to-teal-500"
          />
          <StatCard
            title="Deployments"
            value={156}
            change={8}
            icon={<Globe className="w-6 h-6" />}
            color="from-green-500 to-emerald-500"
          />
          <StatCard
            title="Team Projects"
            value={8}
            change={-2}
            icon={<User className="w-6 h-6" />}
            color="from-purple-500 to-indigo-500"
          />
          <StatCard
            title="Profile Views"
            value={342}
            change={25}
            icon={<Eye className="w-6 h-6" />}
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
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
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
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'profile' && (
              <GlassCard hover={false}>
                <div className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 p-0.5">
                        <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
                          <User className="w-8 h-8 text-cyan-400" />
                        </div>
                      </div>
                      {isEditing && (
                        <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white hover:bg-cyan-600 transition-colors">
                          <Camera className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{profile.name}</h3>
                      <p className="text-gray-400">{profile.email}</p>
                      {profile.publicProfile && (
                        <div className="flex items-center mt-1">
                          <Eye className="w-3 h-3 text-green-400 mr-1" />
                          <span className="text-xs text-green-400">Public Profile</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      Basic Information
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={isEditing ? editingProfile.name : profile.name}
                          onChange={(e) => setEditingProfile(prev => ({ ...prev, name: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-white/5 border-white/10 focus-visible:border-cyan-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={isEditing ? editingProfile.email : profile.email}
                          onChange={(e) => setEditingProfile(prev => ({ ...prev, email: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-white/5 border-white/10 focus-visible:border-cyan-400"
                        />
                      </div>
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="location"
                            value={isEditing ? editingProfile.location : profile.location}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, location: e.target.value }))}
                            disabled={!isEditing}
                            className="pl-10 bg-white/5 border-white/10 focus-visible:border-cyan-400"
                            placeholder="City, Country"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="website"
                            value={isEditing ? editingProfile.website : profile.website}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, website: e.target.value }))}
                            disabled={!isEditing}
                            className="pl-10 bg-white/5 border-white/10 focus-visible:border-cyan-400"
                            placeholder="https://yourwebsite.com"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={isEditing ? editingProfile.bio : profile.bio}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, bio: e.target.value }))}
                        disabled={!isEditing}
                        className="bg-white/5 border-white/10 focus-visible:border-cyan-400 min-h-[100px]"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      Social Links
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="github">GitHub</Label>
                        <div className="relative">
                          <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="github"
                            value={isEditing ? editingProfile.github : profile.github}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, github: e.target.value }))}
                            disabled={!isEditing}
                            className="pl-10 bg-white/5 border-white/10 focus-visible:border-cyan-400"
                            placeholder="username"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="twitter">Twitter</Label>
                        <div className="relative">
                          <Twitter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="twitter"
                            value={isEditing ? editingProfile.twitter : profile.twitter}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, twitter: e.target.value }))}
                            disabled={!isEditing}
                            className="pl-10 bg-white/5 border-white/10 focus-visible:border-cyan-400"
                            placeholder="@username"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="linkedin"
                            value={isEditing ? editingProfile.linkedin : profile.linkedin}
                            onChange={(e) => setEditingProfile(prev => ({ ...prev, linkedin: e.target.value }))}
                            disabled={!isEditing}
                            className="pl-10 bg-white/5 border-white/10 focus-visible:border-cyan-400"
                            placeholder="username"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preferences */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      Preferences
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Timezone</Label>
                        <Select
                          value={isEditing ? editingProfile.timezone : profile.timezone}
                          onValueChange={(value) => setEditingProfile(prev => ({ ...prev, timezone: value }))}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 focus:border-cyan-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timezones.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Language</Label>
                        <Select
                          value={isEditing ? editingProfile.language : profile.language}
                          onValueChange={(value) => setEditingProfile(prev => ({ ...prev, language: value }))}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 focus:border-cyan-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {languages.map((lang) => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Public Profile Settings */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                      Privacy Settings
                    </h4>
                    
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center space-x-3">
                        {profile.publicProfile ? <Eye className="w-5 h-5 text-green-400" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                        <div>
                          <p className="font-medium text-white">Public Profile</p>
                          <p className="text-sm text-gray-400">Make your profile visible to other users</p>
                        </div>
                      </div>
                      <Switch
                        checked={isEditing ? editingProfile.publicProfile : profile.publicProfile}
                        onCheckedChange={(checked) => setEditingProfile(prev => ({ ...prev, publicProfile: checked }))}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isEditing && (
                    <div className="flex space-x-3 pt-4 border-t border-white/10">
                      <Button
                        onClick={handleSave}
                        className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="border-white/20 hover:bg-white/10"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </GlassCard>
            )}

            {activeTab === 'activity' && (
              <GlassCard hover={false}>
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                    Recent Activity
                  </h4>
                  
                  <div className="space-y-3">
                    {mockActivity.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/30 transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-white">{item.title}</h5>
                          <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                          <p className="text-xs text-gray-500 mt-2">{formatTime(item.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            )}

            {activeTab === 'notifications' && (
              <GlassCard hover={false}>
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                    Notification Preferences
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-cyan-400" />
                        <div>
                          <p className="font-medium text-white">Email Notifications</p>
                          <p className="text-sm text-gray-400">Receive updates about your projects and account</p>
                        </div>
                      </div>
                      <Switch
                        checked={profile.emailNotifications}
                        onCheckedChange={(checked) => setProfile(prev => ({ ...prev, emailNotifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center space-x-3">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="font-medium text-white">Activity Notifications</p>
                          <p className="text-sm text-gray-400">Get notified about deployment status and team activity</p>
                        </div>
                      </div>
                      <Switch
                        checked={profile.activityNotifications}
                        onCheckedChange={(checked) => setProfile(prev => ({ ...prev, activityNotifications: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center space-x-3">
                        <Bell className="w-5 h-5 text-orange-400" />
                        <div>
                          <p className="font-medium text-white">Marketing Emails</p>
                          <p className="text-sm text-gray-400">Receive news, updates, and promotional content</p>
                        </div>
                      </div>
                      <Switch
                        checked={profile.marketingEmails}
                        onCheckedChange={(checked) => setProfile(prev => ({ ...prev, marketingEmails: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <GlassCard hover={false}>
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                  Profile Summary
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Member since</span>
                    <span className="text-white font-medium">Jan 2024</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Last active</span>
                    <span className="text-white font-medium">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Profile views</span>
                    <span className="text-white font-medium">342</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Projects shared</span>
                    <span className="text-white font-medium">18</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Account Status */}
            <GlassCard hover={false}>
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                  Account Status
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-sm text-white">Email Verified</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-sm text-white">Two-Factor Enabled</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span className="text-sm text-white">Pro Plan Active</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </motion.div>
      </div>
    </div>
  )
}