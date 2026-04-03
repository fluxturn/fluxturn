import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  Calendar,
  Users,
  Mail,
  Bell,
  HardDrive,
  Zap,
  Crown,
  ChevronDown,
  ChevronUp,
  Bot,
  Database,
  Code,
  Lock,
  Headphones,
  Workflow,
  Building2,
  Heart,
  Sparkles,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { api } from '../../lib/api';
import {
  billingAPI,
  type Subscription,
  type UsageData,
  type UsageResource,
  type Invoice,
  type CheckoutSessionResponse,
  type BillingPortalResponse,
  type OrganizationMetrics,
  type WorkflowUsageData
} from '../../lib/api/billing';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

// Type definitions
interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  settings?: Record<string, any>;
}

// Match the pricing page plans with ACCURATE BACKEND LIMITS
const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Perfect for trying out FluxTurn',
    icon: Heart,
    color: 'gray',
    mainFeatures: [
      '2 Projects, 2 Apps total',
      '2 Team Members',
      '500MB Storage',
      '5 AI Workflow Generations',
      '50 Workflow Executions'
    ],
    allFeatures: {
      'App Development': [
        'React, Flutter, NestJS generators',
        '75+ app types (e-commerce, blog, etc)',
        'Visual page editor',
        'Code export',
        'Basic deployment'
      ],
      'Database & Backend': [
        'Relational database',
        'Schema migration tools',
        'Auto-generated REST APIs',
        'Real-time data synchronization',
        'Full-text search',
        'In-memory caching'
      ],
      'AI & Automation': [
        'AI workflow generation: 5/month',
        'Workflow executions: 50/month',
        'Vector database for AI',
        'Basic RAG support',
        '54 connectors available'
      ],
      'Communication': [
        'Email delivery: 100/month',
        'Push notifications: 500/month'
      ],
      'Advanced Features': [
        'Conditional logic & scheduling',
        'Manual workflow creation',
        'Template library access'
      ],
      'Storage & Files': [
        '500MB storage quota',
        'Cloud storage',
        'Basic file processing'
      ],
      'Team & Collaboration': [
        '2 team members',
        'Basic authentication',
        'API key management'
      ],
      'Support': [
        'Community support',
        'Documentation'
      ]
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9.99,
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    description: 'Great for small teams and individual projects',
    icon: Sparkles,
    color: 'blue',
    mainFeatures: [
      '5 Projects, 5 Apps total',
      '5 Team Members',
      '2GB Storage',
      '50 AI Workflow Generations',
      '5,000 Workflow Executions'
    ],
    allFeatures: {
      'App Development': [
        'Everything in Free',
        'Advanced app templates',
        'Custom branding',
        'Multi-platform deployment'
      ],
      'Database & Backend': [
        'Everything in Free',
        'Analytics database',
        'Advanced search capabilities',
        'Database backups'
      ],
      'AI & Automation': [
        'AI workflow generation: 50/month',
        'Workflow executions: 5,000/month',
        'Advanced RAG support',
        'Document training',
        'Custom AI agents',
        'API access for automation'
      ],
      'Communication': [
        'Email delivery: 1,000/month',
        'Push notifications: 5,000/month',
        'SMS and messaging',
        'Slack integration'
      ],
      'Advanced Features': [
        'Parallel processing',
        'Cron scheduling',
        'Error handling & retries',
        'Workflow versioning'
      ],
      'Storage & Files': [
        '2GB storage quota',
        'Image processing & optimization',
        'File versioning'
      ],
      'Team & Collaboration': [
        '5 team members',
        'Role-based access control (RBAC)',
        'OAuth integration',
        'Team activity logs'
      ],
      'Support': [
        'Email support (48h response)',
        'Priority documentation'
      ]
    },
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 19.99,
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    description: 'For professionals and growing teams',
    icon: Zap,
    color: 'purple',
    popular: true,
    mainFeatures: [
      '15 Projects, 15 Apps total',
      '20 Team Members',
      '5GB Storage',
      '200 AI Workflow Generations',
      '50,000 Workflow Executions'
    ],
    allFeatures: {
      'App Development': [
        'Everything in Starter',
        'White-label deployment',
        'Custom domain support',
        'Advanced analytics dashboard',
        'A/B testing',
        'Production monitoring'
      ],
      'Database & Backend': [
        'Everything in Starter',
        'Multi-database support',
        'Multi-database support (SQL, search, analytics, vector, cache)',
        'Advanced schema management',
        'Database replication',
        'Performance optimization'
      ],
      'AI & Automation': [
        'AI workflow generation: 200/month',
        'Workflow executions: 50,000/month',
        'Advanced AI agents',
        'Custom model integration',
        'Voice & audio support',
        'Video analysis',
        'Custom AI training'
      ],
      'Communication': [
        'Email delivery: 10,000/month',
        'Push notifications: 50,000/month',
        'SMS and messaging unlimited',
        'Discord & Teams integration',
        'Email templates',
        'Rich notifications'
      ],
      'Advanced Features': [
        '54 production connectors',
        '15+ categories (AI/ML, Cloud, Payments)',
        'Complex conditional logic',
        'Error handling & retries',
        'Workflow analytics',
        'Custom connector development'
      ],
      'Storage & Files': [
        '5GB storage quota',
        'Advanced image processing',
        'CDN delivery',
        'Automatic backups'
      ],
      'Team & Collaboration': [
        '20 team members',
        'Advanced RBAC',
        'SSO support',
        'Audit logs',
        'Team workspace'
      ],
      'Support': [
        'Priority support (24h response)',
        'Live chat support',
        'Video tutorials'
      ]
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49.99,
    monthlyPrice: 49.99,
    yearlyPrice: 499.99,
    description: 'For large organizations with advanced needs',
    icon: Crown,
    color: 'amber',
    mainFeatures: [
      '40 Projects, 40 Apps total',
      'Unlimited Team Members',
      '20GB Storage',
      'Unlimited AI Workflow Generations',
      'Unlimited Workflow Executions'
    ],
    allFeatures: {
      'App Development': [
        'Everything in Pro',
        'Unlimited deployments',
        'Custom integrations',
        'Dedicated infrastructure',
        'SLA guarantee (99.9% uptime)',
        'Custom feature development'
      ],
      'Database & Backend': [
        'Everything in Pro',
        'Dedicated database instances',
        'Advanced security & compliance',
        'Custom database configurations',
        'Priority performance optimization',
        'Database migration assistance'
      ],
      'AI & Automation': [
        'Unlimited AI workflow generation',
        'Unlimited workflow executions',
        'Custom AI model training',
        'Priority AI processing',
        'Advanced AI agent features',
        '200+ workflow templates',
        'Natural language workflow generation',
        'Dedicated AI infrastructure'
      ],
      'Communication': [
        'Email: 100,000/month',
        'Push notifications: 1,000,000/month',
        'Unlimited SMS/WhatsApp',
        'All integrations included',
        'Custom communication channels',
        'Dedicated IP addresses'
      ],
      'Advanced Features': [
        '54 production connectors',
        'Custom connector development',
        'RapidAPI integration (40,000+ APIs)',
        'Advanced orchestration',
        'Dedicated workflow infrastructure',
        'White-label deployment'
      ],
      'Storage & Files': [
        '20GB storage quota',
        'Unlimited bandwidth',
        'Custom storage solutions',
        'Compliance-ready storage'
      ],
      'Team & Collaboration': [
        'Unlimited team members',
        'Enterprise SSO/SAML',
        'Advanced audit logs',
        'Custom roles & permissions',
        'Dedicated workspace',
        'Account manager'
      ],
      'Support': [
        'Dedicated support (same-day response)',
        'Account manager',
        'Custom training & onboarding',
        '24/7 priority support',
        'Quarterly business reviews'
      ]
    },
  },
];

export function OrganizationBillingPage() {
  const { organizationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<{[key: string]: boolean}>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Check for success/cancel query parameters
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const canceled = params.get('canceled');

    if (success === 'true') {
      setShowSuccessModal(true);
      // Poll for subscription update (webhook might take a moment)
      const pollSubscription = async () => {
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          await queryClient.invalidateQueries({ queryKey: ['organization-subscription'] });
        }
      };
      pollSubscription();
      // Remove query params
      navigate(`/org/${organizationId}/billing`, { replace: true });
    } else if (canceled === 'true') {
      setShowCancelModal(true);
      // Remove query params
      navigate(`/org/${organizationId}/billing`, { replace: true });
    }
  }, [organizationId, navigate, queryClient]);

  // Fetch organization details
  const { data: organization } = useQuery<Organization>({
    queryKey: ['organization', organizationId],
    queryFn: () => api.getOrganization(organizationId!),
    enabled: !!organizationId,
  });

  // Fetch current subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery<Subscription>({
    queryKey: ['organization-subscription', organizationId],
    queryFn: async () => {
      const sub = await billingAPI.getOrganizationSubscription(organizationId!);
      // Debug logging
      if (sub?.currentPeriodEnd) {
        // console.log('Current Period End:', sub.currentPeriodEnd);
        // console.log('Current Period End Date:', new Date(sub.currentPeriodEnd));
      }
      return sub;
    },
    enabled: !!organizationId,
  });

  // Set current plan as selected when subscription data loads
  React.useEffect(() => {
    if (subscription?.plan) {
      setSelectedPlan(subscription.plan);
      // Set interval from subscription, or default to 'monthly' if not set (e.g., free plan)
      const interval = subscription.interval as 'monthly' | 'yearly';
      if (interval === 'monthly' || interval === 'yearly') {
        setSelectedInterval(interval);
      }
    }
  }, [subscription]);

  // Fetch usage data
  const { data: usage } = useQuery<UsageData>({
    queryKey: ['organization-usage', organizationId],
    queryFn: () => billingAPI.getOrganizationUsage(organizationId!),
    enabled: !!organizationId,
  });

  // Fetch invoices
  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ['organization-invoices', organizationId],
    queryFn: () => billingAPI.getOrganizationInvoices(organizationId!),
    enabled: !!organizationId && subscription?.plan !== 'free',
  });

  const { data: workflowUsage } = useQuery<WorkflowUsageData>({
    queryKey: ['workflow-usage', organizationId],
    queryFn: () => billingAPI.getWorkflowUsage(organizationId!),
    enabled: !!organizationId,
  });

  const toggleCard = (planId: string): void => {
    setExpandedCards(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };

  // Check if subscription is expired
  const isSubscriptionExpired = (): boolean => {
    if (!subscription?.currentPeriodEnd) return false;
    if (subscription?.plan === 'free') return false;
    const endDate = new Date(subscription.currentPeriodEnd);
    return endDate < new Date();
  };

  const getCategoryIcon = (category: string): React.JSX.Element => {
    switch (category) {
      case 'App Development': return <Code className="h-4 w-4" />;
      case 'Database & Backend': return <Database className="h-4 w-4" />;
      case 'AI & Automation': return <Bot className="h-4 w-4" />;
      case 'Communication': return <Mail className="h-4 w-4" />;
      case 'Advanced Features': return <Workflow className="h-4 w-4" />;
      case 'Storage & Files': return <HardDrive className="h-4 w-4" />;
      case 'Team & Collaboration': return <Users className="h-4 w-4" />;
      case 'Enterprise Features': return <Building2 className="h-4 w-4" />;
      case 'Team & Security': return <Lock className="h-4 w-4" />;
      case 'Support': return <Headphones className="h-4 w-4" />;
      default: return <Check className="h-4 w-4" />;
    }
  };

  const handleManageBilling = async (): Promise<void> => {
    try {
      const response = await billingAPI.createBillingPortalSession({
        organizationId: organizationId!,
        returnUrl: window.location.href,
      });

      window.location.href = response.url;
    } catch (error) {
      toast.error( 'Failed to open billing portal. Please try again.');
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const getUsagePercentage = (used: number, limit: number): number => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  if (subscriptionLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 animate-in fade-in zoom-in duration-300">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold">Payment Successful!</h2>
                <p className="text-muted-foreground">
                  Your subscription has been updated successfully. Your new plan benefits are now active.
                </p>
                <Button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                >
                  Continue to Billing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 animate-in fade-in zoom-in duration-300">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                  <X className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold">Payment Cancelled</h2>
                <p className="text-muted-foreground">
                  Your payment was cancelled. Your subscription remains unchanged.
                </p>
                <Button
                  onClick={() => setShowCancelModal(false)}
                  variant="outline"
                  className="w-full"
                >
                  Back to Billing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{organization?.name} - Billing</h1>
          <p className="text-muted-foreground mt-2">
            Manage billing and subscription for your organization
          </p>
        </div>

      <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Current Plan
                {subscription?.plan !== 'free' && (
                  <Button variant="outline" size="sm" onClick={handleManageBilling}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage Billing
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Subscription Expired Warning */}
              {isSubscriptionExpired() && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-start gap-3 mb-4">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900 dark:text-red-100">
                      Subscription Expired
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1 mb-3">
                      Your subscription expired on {subscription?.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'N/A'}. AI workflow generation and advanced features are currently blocked. Please renew your subscription to continue.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleManageBilling}
                    >
                      Renew Now
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-semibold capitalize flex items-center gap-2">
                    {plans.find(p => p.id === subscription?.plan)?.name || subscription?.plan || 'Free'}
                    {subscription?.interval && subscription?.plan !== 'free' && (
                      <span className="text-lg text-muted-foreground font-normal">
                        ({subscription.interval === 'yearly' ? 'Yearly' : 'Monthly'})
                      </span>
                    )}
                    {subscription?.plan === 'enterprise' && <Crown className="h-5 w-5 text-yellow-500" />}
                    {subscription?.cancelAtPeriodEnd && (
                      <Badge variant="secondary" className="text-xs">Canceling</Badge>
                    )}
                  </h3>
                  <p className="text-muted-foreground">
                    {subscription?.cancelAtPeriodEnd ? 'Subscription ending' : subscription?.status === 'active' ? 'Active subscription' : 'No active subscription'}
                  </p>
                </div>
              </div>

              {/* Billing Details */}
              {subscription?.plan !== 'free' && subscription?.currentPeriodStart && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg mb-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Started On</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {subscription?.currentPeriodStart
                        ? new Date(subscription.currentPeriodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className={cn(
                      "text-xs uppercase tracking-wider",
                      isSubscriptionExpired() ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {isSubscriptionExpired() ? 'Expired On' : subscription?.cancelAtPeriodEnd ? 'Ends On' : 'Next Billing'}
                    </p>
                    <p className={cn(
                      "font-medium flex items-center gap-1.5",
                      isSubscriptionExpired() && "text-red-500"
                    )}>
                      <Calendar className={cn("h-4 w-4", isSubscriptionExpired() ? "text-red-500" : "text-muted-foreground")} />
                      {subscription?.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Billing Cycle</p>
                    <p className="font-medium capitalize">
                      {subscription?.interval === 'yearly' ? 'Annual' : 'Monthly'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {subscription?.interval === 'yearly' ? 'Annual Cost' : 'Monthly Cost'}
                    </p>
                    <p className="font-medium text-emerald-500">
                      {formatPrice(
                        subscription?.interval === 'yearly'
                          ? (plans.find(p => p.id === subscription.plan)?.yearlyPrice || 0)
                          : (plans.find(p => p.id === subscription.plan)?.monthlyPrice || 0)
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Free Plan Message */}
              {subscription?.plan === 'free' && (
                <div className="p-4 bg-muted/30 rounded-lg mb-4">
                  <p className="text-muted-foreground text-center">
                    You're on the free plan. Upgrade to unlock more features and higher limits.
                  </p>
                </div>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      Subscription ending
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                      Your subscription will remain active until {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. After that, you will be downgraded to the Free plan.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleManageBilling}
                      className="text-xs"
                    >
                      Reactivate Subscription
                    </Button>
                  </div>
                </div>
              )}

              {subscription?.gracePeriodEnd && new Date(subscription.gracePeriodEnd) > new Date() && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-start gap-2 mt-4">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-100">
                      Payment failed - Grace period active
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Please update your payment method by {new Date(subscription.gracePeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' })} to avoid service interruption
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                {subscription?.cancelAtPeriodEnd 
                  ? 'Your subscription is scheduled to end. You can reactivate or choose a different plan.'
                  : 'Choose the plan that best fits your needs'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <RadioGroup
                  defaultValue="monthly"
                  value={selectedInterval}
                  onValueChange={(v) => setSelectedInterval(v as 'monthly' | 'yearly')}
                >
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="monthly" id="monthly" />
                      <Label htmlFor="monthly" className="cursor-pointer">Monthly billing</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yearly" id="yearly" />
                      <Label htmlFor="yearly" className="cursor-pointer">
                        Yearly billing
                        <Badge variant="secondary" className="ml-2">Save 20%</Badge>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((plan) => {
                  const isCurrentPlan = subscription?.plan === plan.id;
                  const isExpiredCurrentPlan = isCurrentPlan && isSubscriptionExpired();
                  const isActiveCurrentPlan = isCurrentPlan && !isSubscriptionExpired() && subscription?.interval === selectedInterval;
                  const price = selectedInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
                  const Icon = plan.icon;

                  return (
                    <Card
                      key={plan.id}
                      className={cn(
                        "relative transition-all cursor-pointer",
                        selectedPlan === plan.id && "ring-2 ring-primary",
                        isExpiredCurrentPlan
                          ? "border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                          : isActiveCurrentPlan
                          ? "border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                          : "hover:border-gray-400"
                      )}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      {isExpiredCurrentPlan ? (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white px-3 py-1">
                          Expired
                        </Badge>
                      ) : isActiveCurrentPlan ? (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1">
                          Current Plan
                        </Badge>
                      ) : plan.popular && (
                        <Badge className="absolute -top-2 -right-2" variant="default">
                          Popular
                        </Badge>
                      )}
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`h-6 w-6 text-${plan.color}-500`} />
                        </div>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4">
                          {selectedInterval === 'yearly' && price > 0 ? (
                            <>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold">{formatPrice(price / 12)}</span>
                                <span className="text-muted-foreground">/month</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                billed as <span className="text-emerald-500 font-semibold">{formatPrice(price)}/year</span>
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold">{formatPrice(price)}</span>
                                <span className="text-muted-foreground">/month</span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Main Features */}
                        <ul className="space-y-2 text-sm mb-4">
                          {plan.mainFeatures.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Expanded Features */}
                        {expandedCards[plan.id] && (
                          <div className="border-t pt-4 mb-4">
                            <div className="space-y-4">
                              {Object.entries(plan.allFeatures).map(([category, features]) => (
                                <div key={category} className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-white/95 uppercase tracking-wide">
                                    {getCategoryIcon(category)}
                                    <span>{category}</span>
                                  </div>
                                  <ul className="space-y-1 pl-6">
                                    {features.map((feature, idx) => (
                                      <li key={idx} className="text-xs flex items-center gap-2 text-white/80">
                                        <span>{feature}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Expand/Collapse Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCard(plan.id);
                          }}
                          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors py-3 border-t rounded-b-lg"
                        >
                          <span>{expandedCards[plan.id] ? 'Show Less' : 'Show All Features'}</span>
                          {expandedCards[plan.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>

                        {/* Action Button */}
                        <Button
                          variant={isActiveCurrentPlan ? "default" : isExpiredCurrentPlan ? "destructive" : "outline"}
                          className="w-full mt-4"
                          onClick={async (e) => {
                            e.stopPropagation();

                            // Allow clicking if expired (to renew), otherwise block if active current plan
                            if (isActiveCurrentPlan) return;

                            setSelectedPlan(plan.id);

                            // Immediately trigger upgrade with current interval
                            if (plan.id === 'free') {
                              // Free plan - redirect to billing portal
                              setIsUpgrading(true);
                              try {
                                const response = await billingAPI.createBillingPortalSession({
                                  organizationId: organizationId!,
                                  returnUrl: `${window.location.origin}/org/${organizationId}/billing`,
                                });
                                window.location.href = response.url;
                              } catch (error) {
                                toast.error('Failed to open billing portal. Please try again.');
                                setIsUpgrading(false);
                              }
                            } else {
                              // Paid plan - go to checkout with selected interval
                              setIsUpgrading(true);
                              try {
                                const session = await billingAPI.createCheckoutSession({
                                  organizationId: organizationId!,
                                  planId: plan.id,
                                  interval: selectedInterval,
                                  successUrl: `${window.location.origin}/org/${organizationId}/billing?success=true`,
                                  cancelUrl: `${window.location.origin}/org/${organizationId}/billing?canceled=true`,
                                });
                                if (session.url) {
                                  window.location.href = session.url;
                                }
                              } catch (error) {
                                console.error('Checkout error:', error);
                                toast.error('Failed to start checkout. Please try again.');
                                setIsUpgrading(false);
                              }
                            }
                          }}
                          disabled={isActiveCurrentPlan || isUpgrading}
                        >
                          {isExpiredCurrentPlan ? (
                            'Renew Plan'
                          ) : isActiveCurrentPlan ? (
                            'Current Plan'
                          ) : isUpgrading ? (
                            'Processing...'
                          ) : subscription?.plan === plan.id && subscription?.interval !== selectedInterval ? (
                            `Switch to ${selectedInterval === 'monthly' ? 'Monthly' : 'Yearly'}`
                          ) : (
                            `Select ${plan.id === 'free' ? 'Free Plan' : 'Plan'}`
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          {/* Organization Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Resources</CardTitle>
              <CardDescription>
                Track your organization-level resource usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {usage?.organizationMetrics && (
                <>
                  {/* Projects */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium">Projects</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {usage.organizationMetrics.projects.used.toLocaleString()} / {usage.organizationMetrics.projects.limit === -1 ? 'Unlimited' : usage.organizationMetrics.projects.limit.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(usage.organizationMetrics.projects.used, usage.organizationMetrics.projects.limit)} className="h-2" />
                  </div>

                  {/* Apps */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        <span className="font-medium">Apps</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {usage.organizationMetrics.apps.used.toLocaleString()} / {usage.organizationMetrics.apps.limit === -1 ? 'Unlimited' : usage.organizationMetrics.apps.limit.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(usage.organizationMetrics.apps.used, usage.organizationMetrics.apps.limit)} className="h-2" />
                  </div>

                  {/* Team Members */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Team Members</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {usage.organizationMetrics.teamMembers.used.toLocaleString()} / {usage.organizationMetrics.teamMembers.limit === -1 ? 'Unlimited' : usage.organizationMetrics.teamMembers.limit.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(usage.organizationMetrics.teamMembers.used, usage.organizationMetrics.teamMembers.limit)} className="h-2" />
                  </div>

                  {/* Storage */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        <span className="font-medium">Storage</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {(usage.organizationMetrics.storage.used / (1024 ** 3)).toFixed(2)} GB / {usage.organizationMetrics.storage.limit === -1 ? 'Unlimited' : (usage.organizationMetrics.storage.limit / (1024 ** 3)).toFixed(2) + ' GB'}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(usage.organizationMetrics.storage.used, usage.organizationMetrics.storage.limit)} className="h-2" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Workflow & AI Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow & AI Usage</CardTitle>
              <CardDescription>
                Track your AI workflow generation and workflow executions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {workflowUsage ? (
                <>
                  {/* AI Workflow Generation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">AI Workflow Generation</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {workflowUsage.aiWorkflowGeneration.used.toLocaleString()} / {workflowUsage.aiWorkflowGeneration.limit === -1 ? 'Unlimited' : workflowUsage.aiWorkflowGeneration.limit.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(workflowUsage.aiWorkflowGeneration.used, workflowUsage.aiWorkflowGeneration.limit)} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {workflowUsage.aiWorkflowGeneration.remaining === -1
                        ? 'Unlimited workflows available'
                        : `${workflowUsage.aiWorkflowGeneration.remaining.toLocaleString()} workflows remaining this period`
                      }
                    </p>
                  </div>

                  {/* Workflow Execution */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Workflow Executions</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {workflowUsage.workflowExecution.used.toLocaleString()} / {workflowUsage.workflowExecution.limit === -1 ? 'Unlimited' : workflowUsage.workflowExecution.limit.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(workflowUsage.workflowExecution.used, workflowUsage.workflowExecution.limit)} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {workflowUsage.workflowExecution.remaining === -1
                        ? 'Unlimited executions available'
                        : `${workflowUsage.workflowExecution.remaining.toLocaleString()} executions remaining this period`
                      }
                    </p>
                  </div>

                  {/* Usage Period */}
                  {workflowUsage.aiWorkflowGeneration.period && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Usage period: {new Date(workflowUsage.aiWorkflowGeneration.period.start).toLocaleDateString()} - {new Date(workflowUsage.aiWorkflowGeneration.period.end).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p>Loading workflow usage...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication & Services */}
          <Card>
            <CardHeader>
              <CardTitle>Communication & Services</CardTitle>
              <CardDescription>
                Monthly usage for communication services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {usage?.usage?.map((resource: UsageResource) => (
                <div key={resource.resourceType} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {resource.resourceType === 'email' && <Mail className="h-4 w-4" />}
                      {resource.resourceType === 'push' && <Bell className="h-4 w-4" />}
                      <span className="font-medium capitalize">{resource.resourceType}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {resource.used.toLocaleString()} / {resource.limit === -1 ? 'Unlimited' : resource.limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={getUsagePercentage(resource.used, resource.limit)} className="h-2" />
                </div>
              ))}

              {usage?.period && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Usage period: {new Date(usage.period.start).toLocaleDateString()} - {new Date(usage.period.end).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Plan Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Current Plan Limits</CardTitle>
              <CardDescription>
                Maximum limits for your {subscription?.plan || 'free'} plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Projects:</span>
                  <span className="ml-2 font-medium">
                    {subscription?.maxProjects === -1 ? 'Unlimited' : subscription?.maxProjects || 2}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Apps Total:</span>
                  <span className="ml-2 font-medium">
                    {subscription?.maxAppsPerProject === -1 ? 'Unlimited' : subscription?.maxAppsPerProject || 2} (across all projects)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Team Members:</span>
                  <span className="ml-2 font-medium">
                    {subscription?.maxTeamMembers === -1 ? 'Unlimited' : subscription?.maxTeamMembers || 1}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Storage:</span>
                  <span className="ml-2 font-medium">
                    {subscription?.storageQuotaGB || 1} GB
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                View and download your past invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscription?.plan === 'free' ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No invoices available for free plan
                  </p>
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-lg border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-4 font-medium">Date</th>
                          <th className="text-left p-4 font-medium">Description</th>
                          <th className="text-left p-4 font-medium">Amount</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-right p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice: Invoice) => (
                          <tr key={invoice.id} className="border-b">
                            <td className="p-4 text-sm">
                              {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td className="p-4 text-sm">
                              {invoice.description || `${plans.find(p => p.id === subscription?.plan)?.name || 'Subscription'} - ${invoice.currency?.toUpperCase()}`}
                            </td>
                            <td className="p-4 text-sm font-medium">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: invoice.currency || 'usd'
                              }).format((invoice.amount || 0) / 100)}
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {invoice.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {invoice.hostedInvoiceUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(invoice.hostedInvoiceUrl, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                                {invoice.pdfUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(invoice.pdfUrl, '_blank')}
                                  >
                                    Download
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-center pt-4">
                    <Button variant="outline" onClick={handleManageBilling}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View All Invoices in Billing Portal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No invoices found yet
                  </p>
                  <Button variant="outline" onClick={handleManageBilling}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Billing Portal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}