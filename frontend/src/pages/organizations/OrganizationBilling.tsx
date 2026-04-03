import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  CreditCard,
  DollarSign,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Settings,
  Plus,
  Trash2,
  Edit,
  Bell,
  Shield,
  Zap,
  Users,
  HardDrive,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ExternalLink,
  Info,
  AlertCircle
} from 'lucide-react'
import { GlassCard, StatCard, ChartCard } from '../../components/ui/GlassCard'
import { cn } from '../../lib/utils'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts'

interface PaymentMethod {
  id: string
  type: 'credit_card' | 'bank_account' | 'paypal'
  last4: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
  bankName?: string
  accountType?: string
}

interface Invoice {
  id: string
  number: string
  date: string
  dueDate: string
  amount: number
  status: 'paid' | 'pending' | 'overdue' | 'failed'
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  downloadUrl?: string
}

interface UsageData {
  category: string
  current: number
  limit: number
  unit: string
  cost: number
}

interface BillingAlert {
  id: string
  type: 'usage_warning' | 'payment_failed' | 'plan_limit' | 'upcoming_renewal'
  title: string
  message: string
  severity: 'info' | 'warning' | 'error'
  date: string
  dismissed: boolean
}

const currentPlan = {
  id: 'professional',
  name: 'Professional',
  price: 99,
  billingCycle: 'monthly',
  features: [
    'Unlimited projects',
    'Up to 100 team members',
    '500GB storage',
    'Advanced analytics',
    'Priority support',
    'Custom integrations',
    'API access',
    'White-label options'
  ],
  limits: {
    projects: -1, // unlimited
    members: 100,
    storage: 500, // GB
    apiCalls: 100000
  }
}

const availablePlans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    billingCycle: 'monthly',
    description: 'Perfect for small teams',
    features: ['Up to 10 projects', '25 team members', '100GB storage', 'Basic support'],
    popular: false
  },
  {
    id: 'professional',
    name: 'Professional', 
    price: 99,
    billingCycle: 'monthly',
    description: 'For growing businesses',
    features: ['Unlimited projects', '100 team members', '500GB storage', 'Priority support'],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    billingCycle: 'monthly',
    description: 'For large organizations',
    features: ['Everything in Professional', 'Unlimited members', '2TB storage', 'Dedicated support'],
    popular: false
  }
]

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '1',
    type: 'credit_card',
    last4: '4242',
    brand: 'Visa',
    expiryMonth: 12,
    expiryYear: 2025,
    isDefault: true
  },
  {
    id: '2',
    type: 'credit_card',
    last4: '5555',
    brand: 'Mastercard',
    expiryMonth: 8,
    expiryYear: 2026,
    isDefault: false
  }
]

const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'INV-2023-001',
    date: '2023-12-01',
    dueDate: '2023-12-15',
    amount: 99.00,
    status: 'paid',
    items: [
      { description: 'Professional Plan - December 2023', quantity: 1, unitPrice: 99.00, total: 99.00 }
    ]
  },
  {
    id: '2',
    number: 'INV-2023-002',
    date: '2023-11-01',
    dueDate: '2023-11-15',
    amount: 99.00,
    status: 'paid',
    items: [
      { description: 'Professional Plan - November 2023', quantity: 1, unitPrice: 99.00, total: 99.00 }
    ]
  },
  {
    id: '3',
    number: 'INV-2023-003',
    date: '2023-10-01',
    dueDate: '2023-10-15',
    amount: 99.00,
    status: 'paid',
    items: [
      { description: 'Professional Plan - October 2023', quantity: 1, unitPrice: 99.00, total: 99.00 }
    ]
  }
]

const usageData: UsageData[] = [
  { category: 'Storage', current: 342, limit: 500, unit: 'GB', cost: 0 },
  { category: 'Team Members', current: 45, limit: 100, unit: 'users', cost: 0 },
  { category: 'API Calls', current: 67500, limit: 100000, unit: 'calls', cost: 0 },
  { category: 'Projects', current: 23, limit: -1, unit: 'projects', cost: 0 }
]

const billingHistory = [
  { month: 'Jun', amount: 99, usage: 85 },
  { month: 'Jul', amount: 99, usage: 92 },
  { month: 'Aug', amount: 99, usage: 78 },
  { month: 'Sep', amount: 99, usage: 95 },
  { month: 'Oct', amount: 99, usage: 88 },
  { month: 'Nov', amount: 99, usage: 96 },
  { month: 'Dec', amount: 99, usage: 68 }
]

const usageBreakdown = [
  { name: 'Storage', value: 342, color: '#00d4ff' },
  { name: 'Compute', value: 125, color: '#00ffcc' },
  { name: 'API Calls', value: 89, color: '#0099cc' },
  { name: 'Bandwidth', value: 67, color: '#00aadd' }
]

const billingAlerts: BillingAlert[] = [
  {
    id: '1',
    type: 'usage_warning',
    title: 'Storage Usage Warning',
    message: 'You are using 68% of your storage limit. Consider upgrading your plan.',
    severity: 'warning',
    date: '2023-12-03',
    dismissed: false
  },
  {
    id: '2',
    type: 'upcoming_renewal',
    title: 'Upcoming Renewal',
    message: 'Your Professional plan will renew on December 15, 2023 for $99.00',
    severity: 'info',
    date: '2023-12-01',
    dismissed: false
  }
]

export const OrganizationBilling: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'invoices' | 'payment-methods' | 'plans'>('overview')
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [alerts, setAlerts] = useState(billingAlerts)

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'overdue': return 'bg-red-500/20 text-red-400'
      case 'failed': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'bg-blue-500/10 border-blue-500/20 text-blue-400'
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
      case 'error': return 'bg-red-500/10 border-red-500/20 text-red-400'
      default: return 'bg-gray-500/10 border-gray-500/20 text-gray-400'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'usage_warning': return <AlertTriangle className="w-5 h-5" />
      case 'payment_failed': return <CreditCard className="w-5 h-5" />
      case 'upcoming_renewal': return <Calendar className="w-5 h-5" />
      default: return <Info className="w-5 h-5" />
    }
  }

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ))
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Billing Alerts */}
      {alerts.filter(a => !a.dismissed).length > 0 && (
        <div className="space-y-3">
          {alerts.filter(a => !a.dismissed).map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "p-4 rounded-lg border",
                getAlertColor(alert.severity)
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getAlertIcon(alert.type)}
                  <div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm opacity-90 mt-1">{alert.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Current Plan & Next Bill */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Current Plan</h3>
            <button 
              onClick={() => setShowPlanChangeModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg text-sm font-medium"
            >
              Change Plan
            </button>
          </div>
          
          <div className="text-center mb-6">
            <h4 className="text-2xl font-bold text-gradient mb-2">{currentPlan.name}</h4>
            <p className="text-3xl font-bold mb-1">${currentPlan.price}</p>
            <p className="text-sm text-muted-foreground">per month</p>
          </div>

          <div className="space-y-2">
            {currentPlan.features.slice(0, 4).map((feature, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Next Bill</h3>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Dec 15, 2023</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span>Professional Plan</span>
              <span className="font-medium">$99.00</span>
            </div>
            
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-gradient">$99.00</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Will be charged to Visa ****4242
              </p>
            </div>

            <button className="w-full px-4 py-2 glass hover:bg-white/10 rounded-lg transition-all flex items-center justify-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>Preview Invoice</span>
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Billing Chart */}
      <ChartCard 
        title="Billing History" 
        subtitle="Monthly billing amounts and usage trends"
        actions={
          <div className="flex items-center space-x-2">
            <select className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50">
              <option value="6M">6 Months</option>
              <option value="1Y">1 Year</option>
              <option value="2Y">2 Years</option>
            </select>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={billingHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#00d4ff" 
              strokeWidth={3}
              dot={{ r: 6 }}
              name="Billing Amount ($)"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Payment Method */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Payment Method</h3>
          <button 
            onClick={() => setActiveTab('payment-methods')}
            className="text-sm text-cyan-400 hover:underline"
          >
            Manage
          </button>
        </div>
        
        <div className="flex items-center space-x-4 p-4 glass rounded-lg">
          <CreditCard className="w-8 h-8 text-cyan-400" />
          <div className="flex-1">
            <p className="font-medium">Visa ending in 4242</p>
            <p className="text-sm text-muted-foreground">Expires 12/2025</p>
          </div>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
            Default
          </span>
        </div>
      </GlassCard>
    </div>
  )

  const renderUsageTab = () => (
    <div className="space-y-6">
      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {usageData.map((usage, index) => (
          <GlassCard key={index} hover={false}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{usage.category}</h4>
                <span className="text-sm text-muted-foreground">{usage.unit}</span>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">
                    {usage.current.toLocaleString()}
                  </span>
                  {usage.limit > 0 && (
                    <span className="text-sm text-muted-foreground">
                      / {usage.limit.toLocaleString()}
                    </span>
                  )}
                </div>
                
                {usage.limit > 0 && (
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        (usage.current / usage.limit) > 0.8 ? "bg-red-400" :
                        (usage.current / usage.limit) > 0.6 ? "bg-yellow-400" :
                        "bg-gradient-to-r from-cyan-400 to-blue-500"
                      )}
                      style={{ width: `${Math.min((usage.current / usage.limit) * 100, 100)}%` }}
                    />
                  </div>
                )}
                
                {usage.limit > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {((usage.current / usage.limit) * 100).toFixed(1)}% used
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Usage Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Usage Trends" subtitle="Resource usage over time">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={billingHistory}>
              <defs>
                <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="usage" 
                stroke="#00d4ff" 
                fillOpacity={1} 
                fill="url(#usageGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Usage Breakdown" subtitle="Current resource distribution">
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={usageBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {usageBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Usage Alerts Settings */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Usage Alerts</h3>
            <p className="text-sm text-muted-foreground">Get notified when you approach usage limits</p>
          </div>
          <button className="px-4 py-2 glass hover:bg-white/10 rounded-lg transition-all flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Configure</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Storage Alert', threshold: '80%', enabled: true },
            { name: 'Member Limit Alert', threshold: '90%', enabled: true },
            { name: 'API Usage Alert', threshold: '75%', enabled: false },
            { name: 'Billing Alert', threshold: '$150', enabled: true }
          ].map((alert, index) => (
            <div key={index} className="flex items-center justify-between p-3 glass rounded-lg">
              <div>
                <p className="font-medium">{alert.name}</p>
                <p className="text-sm text-muted-foreground">Alert at {alert.threshold}</p>
              </div>
              <button className={cn(
                "w-12 h-6 rounded-full transition-all",
                alert.enabled ? "bg-cyan-400" : "bg-white/20"
              )}>
                <div className={cn(
                  "w-5 h-5 bg-white rounded-full transition-all",
                  alert.enabled ? "translate-x-6" : "translate-x-0.5"
                )} />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )

  const renderInvoicesTab = () => (
    <div className="space-y-6">
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Billing History</h3>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 glass hover:bg-white/10 rounded-lg transition-all flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export All</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {mockInvoices.map((invoice) => (
            <div key={invoice.id} className="p-4 glass rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-medium">{invoice.number}</h4>
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize",
                        getStatusColor(invoice.status)
                      )}>
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(invoice.date).toLocaleDateString()} • Due {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">${invoice.amount.toFixed(2)}</p>
                  <div className="flex items-center space-x-2">
                    <button className="p-1 hover:bg-white/10 rounded transition-all">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1 hover:bg-white/10 rounded transition-all">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {mockInvoices.length === 0 && (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No invoices found</p>
          </div>
        )}
      </GlassCard>
    </div>
  )

  const renderPaymentMethodsTab = () => (
    <div className="space-y-6">
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Payment Methods</h3>
          <button 
            onClick={() => setShowAddPaymentModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg font-medium flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment Method</span>
          </button>
        </div>

        <div className="space-y-3">
          {mockPaymentMethods.map((method) => (
            <div key={method.id} className="p-4 glass rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <h4 className="font-medium">
                        {method.brand} ending in {method.last4}
                      </h4>
                      {method.isDefault && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-all text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Billing Address */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Billing Address</h3>
          <button className="px-4 py-2 glass hover:bg-white/10 rounded-lg transition-all flex items-center space-x-2">
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </button>
        </div>

        <div className="p-4 glass rounded-lg">
          <div className="space-y-2 text-sm">
            <p className="font-medium">Acme Corporation</p>
            <p>123 Business Avenue</p>
            <p>Suite 100</p>
            <p>San Francisco, CA 94105</p>
            <p>United States</p>
          </div>
        </div>
      </GlassCard>
    </div>
  )

  const renderPlansTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {availablePlans.map((plan) => (
          <GlassCard 
            key={plan.id}
            hover={false}
            className={cn(
              "relative",
              plan.popular && "border-cyan-400/50",
              currentPlan.id === plan.id && "bg-cyan-400/5"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h4 className="text-xl font-bold mb-2">{plan.name}</h4>
              <p className="text-3xl font-bold text-gradient mb-2">${plan.price}</p>
              <p className="text-sm text-muted-foreground">per month</p>
              <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
            </div>

            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={() => {
                setSelectedPlan(plan.id)
                setShowPlanChangeModal(true)
              }}
              disabled={currentPlan.id === plan.id}
              className={cn(
                "w-full py-3 rounded-lg font-medium transition-all",
                currentPlan.id === plan.id
                  ? "bg-green-500/20 text-green-400 cursor-not-allowed"
                  : plan.popular
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-400/25"
                    : "glass hover:bg-white/10"
              )}
            >
              {currentPlan.id === plan.id ? 'Current Plan' : 'Select Plan'}
            </button>
          </GlassCard>
        ))}
      </div>

      {/* Plan Comparison */}
      <GlassCard hover={false}>
        <h3 className="text-lg font-semibold mb-6">Plan Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4">Feature</th>
                <th className="text-center py-3 px-4">Starter</th>
                <th className="text-center py-3 px-4">Professional</th>
                <th className="text-center py-3 px-4">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Projects', starter: '10', professional: 'Unlimited', enterprise: 'Unlimited' },
                { name: 'Team Members', starter: '25', professional: '100', enterprise: 'Unlimited' },
                { name: 'Storage', starter: '100GB', professional: '500GB', enterprise: '2TB' },
                { name: 'API Calls', starter: '10K/month', professional: '100K/month', enterprise: '1M/month' },
                { name: 'Support', starter: 'Email', professional: 'Priority', enterprise: 'Dedicated' },
                { name: 'Custom Integrations', starter: '✗', professional: '✓', enterprise: '✓' },
                { name: 'White-label', starter: '✗', professional: '✗', enterprise: '✓' }
              ].map((feature, index) => (
                <tr key={index} className="border-b border-white/10">
                  <td className="py-3 px-4 font-medium">{feature.name}</td>
                  <td className="py-3 px-4 text-center">{feature.starter}</td>
                  <td className="py-3 px-4 text-center">{feature.professional}</td>
                  <td className="py-3 px-4 text-center">{feature.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'overview': return renderOverviewTab()
      case 'usage': return renderUsageTab()
      case 'invoices': return renderInvoicesTab()
      case 'payment-methods': return renderPaymentMethodsTab()
      case 'plans': return renderPlansTab()
      default: return renderOverviewTab()
    }
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center space-x-4 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Billing & Usage</h1>
            <p className="text-muted-foreground">Manage your subscription, billing, and usage</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <StatCard
          title="Current Bill"
          value="$99.00"
          icon={<DollarSign className="w-5 h-5" />}
          color="from-cyan-400 to-blue-500"
        />
        <StatCard
          title="Next Bill"
          value="Dec 15"
          icon={<Calendar className="w-5 h-5" />}
          color="from-orange-400 to-red-500"
        />
        <StatCard
          title="Storage Used"
          value="68%"
          change={5.2}
          icon={<HardDrive className="w-5 h-5" />}
          color="from-green-400 to-teal-500"
        />
        <StatCard
          title="Total Invoices"
          value={mockInvoices.length}
          icon={<BarChart3 className="w-5 h-5" />}
          color="from-purple-400 to-pink-500"
        />
      </motion.div>

      {/* Tabs Navigation */}
      <motion.div variants={itemVariants}>
        <GlassCard hover={false} className="p-2">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'usage', label: 'Usage', icon: <Activity className="w-4 h-4" /> },
              { id: 'invoices', label: 'Invoices', icon: <Download className="w-4 h-4" /> },
              { id: 'payment-methods', label: 'Payment Methods', icon: <CreditCard className="w-4 h-4" /> },
              { id: 'plans', label: 'Plans', icon: <Zap className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                  activeTab === tab.id 
                    ? "bg-gradient-to-r from-cyan-400/20 to-blue-500/20 text-cyan-400 border border-cyan-400/30" 
                    : "hover:bg-white/10"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={itemVariants}>
        {renderCurrentTab()}
      </motion.div>
    </motion.div>
  )
}