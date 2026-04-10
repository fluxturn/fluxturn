import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Palette,
  Monitor,
  Sun,
  Moon,
  Code,
  Settings,
  Keyboard,
  Volume2,
  Layout,
  Type,
  Zap,
  Save,
  RotateCcw,
  FileText,
  Grid,
  Download,
  Bell
} from 'lucide-react'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Slider } from '../../components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { Badge } from '../../components/ui/badge'
import { cn } from '../../lib/utils'

interface Preferences {
  theme: 'light' | 'dark' | 'system'
  accentColor: string
  fontSize: number
  fontFamily: string
  editorTheme: string
  lineNumbers: boolean
  wordWrap: boolean
  minimap: boolean
  autoSave: boolean
  autoComplete: boolean
  formatOnSave: boolean
  tabSize: number
  showWhitespace: boolean
  compactMode: boolean
  animationsEnabled: boolean
  soundEnabled: boolean
  notifications: boolean
  autoUpdates: boolean
  experimentalFeatures: boolean
  language: string
  timezone: string
  dateFormat: string
  shortcuts: Record<string, string>
}

interface ShortcutItem {
  id: string
  label: string
  description: string
  defaultKey: string
  currentKey: string
  category: 'general' | 'editor' | 'navigation' | 'project'
}

export const Preferences: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'editor' | 'keyboard' | 'general'>('appearance')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  const [preferences, setPreferences] = useState<Preferences>({
    theme: 'dark',
    accentColor: 'cyan',
    fontSize: 14,
    fontFamily: 'JetBrains Mono',
    editorTheme: 'dracula',
    lineNumbers: true,
    wordWrap: true,
    minimap: true,
    autoSave: true,
    autoComplete: true,
    formatOnSave: true,
    tabSize: 2,
    showWhitespace: false,
    compactMode: false,
    animationsEnabled: true,
    soundEnabled: false,
    notifications: true,
    autoUpdates: true,
    experimentalFeatures: false,
    language: 'en',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/dd/yyyy',
    shortcuts: {}
  })

  const mockShortcuts: ShortcutItem[] = [
    {
      id: '1',
      label: 'New Project',
      description: 'Create a new project',
      defaultKey: 'Ctrl+N',
      currentKey: 'Ctrl+N',
      category: 'general'
    },
    {
      id: '2',
      label: 'Quick Search',
      description: 'Open search dialog',
      defaultKey: 'Ctrl+K',
      currentKey: 'Ctrl+K',
      category: 'general'
    },
    {
      id: '3',
      label: 'Save All',
      description: 'Save all open files',
      defaultKey: 'Ctrl+Shift+S',
      currentKey: 'Ctrl+Shift+S',
      category: 'editor'
    },
    {
      id: '4',
      label: 'Format Document',
      description: 'Format current document',
      defaultKey: 'Ctrl+Shift+F',
      currentKey: 'Ctrl+Shift+F',
      category: 'editor'
    },
    {
      id: '5',
      label: 'Toggle Sidebar',
      description: 'Show/hide sidebar',
      defaultKey: 'Ctrl+B',
      currentKey: 'Ctrl+B',
      category: 'navigation'
    },
    {
      id: '6',
      label: 'Switch Project',
      description: 'Quick project switcher',
      defaultKey: 'Ctrl+P',
      currentKey: 'Ctrl+P',
      category: 'project'
    }
  ]

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
    setHasUnsavedChanges(true)
  }

  const handleSave = () => {
    // TODO: Save preferences to backend
    // console.log('Saving preferences:', preferences)
    setHasUnsavedChanges(false)
  }

  const handleReset = () => {
    // TODO: Reset to default preferences
    setHasUnsavedChanges(false)
  }

  const accentColors = [
    { name: 'Cyan', value: 'cyan', color: 'from-cyan-500 to-teal-500' },
    { name: 'Blue', value: 'blue', color: 'from-blue-500 to-indigo-500' },
    { name: 'Purple', value: 'purple', color: 'from-purple-500 to-pink-500' },
    { name: 'Green', value: 'green', color: 'from-green-500 to-emerald-500' },
    { name: 'Orange', value: 'orange', color: 'from-orange-500 to-red-500' }
  ]

  const fontFamilies = [
    'JetBrains Mono',
    'Fira Code',
    'Source Code Pro',
    'Monaco',
    'Consolas',
    'SF Mono',
    'Ubuntu Mono'
  ]

  const editorThemes = [
    'Dracula',
    'VS Dark',
    'Monokai',
    'Solarized Dark',
    'GitHub Dark',
    'One Dark Pro',
    'Material Theme'
  ]

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' }
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

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'editor', label: 'Editor', icon: <Code className="w-4 h-4" /> },
    { id: 'keyboard', label: 'Keyboard', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'general', label: 'General', icon: <Settings className="w-4 h-4" /> }
  ]

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
              Preferences
            </h1>
            <p className="text-gray-400 mt-1">Customize your development experience</p>
          </div>
          
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {activeTab === 'appearance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Theme Settings */}
              <GlassCard hover={false}>
                <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">
                  Theme
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-white mb-3 block">Color Theme</Label>
                    <RadioGroup
                      value={preferences.theme}
                      onValueChange={(value: string) => updatePreference('theme', value as 'light' | 'dark' | 'system')}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <RadioGroupItem value="light" id="light" />
                        <Sun className="w-4 h-4 text-yellow-400" />
                        <Label htmlFor="light" className="text-white">Light</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <RadioGroupItem value="dark" id="dark" />
                        <Moon className="w-4 h-4 text-cyan-400" />
                        <Label htmlFor="dark" className="text-white">Dark</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <RadioGroupItem value="system" id="system" />
                        <Monitor className="w-4 h-4 text-purple-400" />
                        <Label htmlFor="system" className="text-white">System</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-white mb-3 block">Accent Color</Label>
                    <div className="grid grid-cols-5 gap-3">
                      {accentColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => updatePreference('accentColor', color.value)}
                          className={cn(
                            'aspect-square rounded-lg bg-gradient-to-br p-0.5 transition-all duration-200',
                            color.color,
                            preferences.accentColor === color.value
                              ? 'scale-110 ring-2 ring-white/50'
                              : 'hover:scale-105'
                          )}
                        >
                          <div className="w-full h-full rounded-lg bg-slate-800 flex items-center justify-center">
                            {preferences.accentColor === color.value && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Display Settings */}
              <GlassCard hover={false}>
                <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">
                  Display
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Layout className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-medium text-white">Compact Mode</p>
                        <p className="text-sm text-gray-400">Reduce spacing and padding</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.compactMode}
                      onCheckedChange={(checked) => updatePreference('compactMode', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="font-medium text-white">Animations</p>
                        <p className="text-sm text-gray-400">Enable smooth transitions and effects</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.animationsEnabled}
                      onCheckedChange={(checked) => updatePreference('animationsEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Volume2 className="w-5 h-5 text-orange-400" />
                      <div>
                        <p className="font-medium text-white">Sound Effects</p>
                        <p className="text-sm text-gray-400">Play sounds for actions and notifications</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.soundEnabled}
                      onCheckedChange={(checked) => updatePreference('soundEnabled', checked)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-white">Font Size</Label>
                      <span className="text-sm text-cyan-400">{preferences.fontSize}px</span>
                    </div>
                    <Slider
                      value={[preferences.fontSize]}
                      onValueChange={([value]) => updatePreference('fontSize', value)}
                      min={10}
                      max={24}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Editor Appearance */}
              <GlassCard hover={false}>
                <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">
                  Editor Appearance
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="font-family">Font Family</Label>
                    <Select
                      value={preferences.fontFamily}
                      onValueChange={(value) => updatePreference('fontFamily', value)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 focus:border-cyan-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontFamilies.map((font) => (
                          <SelectItem key={font} value={font}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="editor-theme">Editor Theme</Label>
                    <Select
                      value={preferences.editorTheme}
                      onValueChange={(value) => updatePreference('editorTheme', value)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 focus:border-cyan-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {editorThemes.map((theme) => (
                          <SelectItem key={theme} value={theme.toLowerCase().replace(/\s+/g, '-')}>
                            {theme}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-white">Tab Size</Label>
                      <span className="text-sm text-cyan-400">{preferences.tabSize} spaces</span>
                    </div>
                    <Slider
                      value={[preferences.tabSize]}
                      onValueChange={([value]) => updatePreference('tabSize', value)}
                      min={2}
                      max={8}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </GlassCard>

              {/* Editor Behavior */}
              <GlassCard hover={false}>
                <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">
                  Editor Behavior
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-medium text-white">Line Numbers</p>
                        <p className="text-sm text-gray-400">Show line numbers in editor</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.lineNumbers}
                      onCheckedChange={(checked) => updatePreference('lineNumbers', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Type className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="font-medium text-white">Word Wrap</p>
                        <p className="text-sm text-gray-400">Wrap long lines to fit viewport</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.wordWrap}
                      onCheckedChange={(checked) => updatePreference('wordWrap', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Grid className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="font-medium text-white">Minimap</p>
                        <p className="text-sm text-gray-400">Show code minimap on the right</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.minimap}
                      onCheckedChange={(checked) => updatePreference('minimap', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Save className="w-5 h-5 text-orange-400" />
                      <div>
                        <p className="font-medium text-white">Auto Save</p>
                        <p className="text-sm text-gray-400">Automatically save changes</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.autoSave}
                      onCheckedChange={(checked) => updatePreference('autoSave', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-medium text-white">Auto Complete</p>
                        <p className="text-sm text-gray-400">Show code completion suggestions</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.autoComplete}
                      onCheckedChange={(checked) => updatePreference('autoComplete', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Code className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="font-medium text-white">Format on Save</p>
                        <p className="text-sm text-gray-400">Auto-format code when saving</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.formatOnSave}
                      onCheckedChange={(checked) => updatePreference('formatOnSave', checked)}
                    />
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === 'keyboard' && (
            <GlassCard hover={false}>
              <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">
                Keyboard Shortcuts
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400">Customize keyboard shortcuts for faster workflow</p>
                  <Button variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                    Reset All
                  </Button>
                </div>

                <div className="space-y-2">
                  {['general', 'editor', 'navigation', 'project'].map((category) => (
                    <div key={category}>
                      <h4 className="text-lg font-semibold text-white capitalize mb-3">{category}</h4>
                      <div className="space-y-2">
                        {mockShortcuts
                          .filter(shortcut => shortcut.category === category)
                          .map((shortcut) => (
                            <div
                              key={shortcut.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/30 transition-colors"
                            >
                              <div>
                                <p className="font-medium text-white">{shortcut.label}</p>
                                <p className="text-sm text-gray-400">{shortcut.description}</p>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Badge variant="outline" className="font-mono">
                                  {shortcut.currentKey}
                                </Badge>
                                <Button variant="ghost" size="sm">
                                  <Keyboard className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Localization */}
              <GlassCard hover={false}>
                <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">
                  Localization
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label>Language</Label>
                    <Select
                      value={preferences.language}
                      onValueChange={(value) => updatePreference('language', value)}
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

                  <div>
                    <Label>Timezone</Label>
                    <Select
                      value={preferences.timezone}
                      onValueChange={(value) => updatePreference('timezone', value)}
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
                    <Label>Date Format</Label>
                    <Select
                      value={preferences.dateFormat}
                      onValueChange={(value) => updatePreference('dateFormat', value)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 focus:border-cyan-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (US)</SelectItem>
                        <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (UK)</SelectItem>
                        <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (ISO)</SelectItem>
                        <SelectItem value="dd.MM.yyyy">dd.MM.yyyy (DE)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </GlassCard>

              {/* System */}
              <GlassCard hover={false}>
                <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-2 mb-4">
                  System
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="font-medium text-white">Notifications</p>
                        <p className="text-sm text-gray-400">Show system notifications</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.notifications}
                      onCheckedChange={(checked) => updatePreference('notifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Download className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="font-medium text-white">Auto Updates</p>
                        <p className="text-sm text-gray-400">Automatically update the application</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.autoUpdates}
                      onCheckedChange={(checked) => updatePreference('autoUpdates', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="font-medium text-white">Experimental Features</p>
                        <p className="text-sm text-gray-400">Enable beta and experimental features</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.experimentalFeatures}
                      onCheckedChange={(checked) => updatePreference('experimentalFeatures', checked)}
                    />
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-white">Storage Usage</h4>
                      <span className="text-sm text-cyan-400">2.4 GB used</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="bg-gradient-to-r from-cyan-500 to-teal-500 h-2 rounded-full w-3/4" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0 GB</span>
                      <span>5 GB limit</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </motion.div>

        {/* Floating Save Button */}
        {hasUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-lg"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}