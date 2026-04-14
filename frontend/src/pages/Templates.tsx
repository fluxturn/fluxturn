import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { Search, Users, ArrowRight, X, Loader2, Zap, CheckCircle, Layers } from "lucide-react";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { WorkflowAPI } from "../lib/fluxturn";
import { AuthContext } from "../contexts/AuthContext";
import { toast } from "sonner";
import { PENDING_TEMPLATE_KEY, PENDING_TEMPLATE_TIMESTAMP_KEY } from "../config/pendingKeys";
import { ReactFlow, Background, BackgroundVariant, ReactFlowProvider, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeComponents } from '@/config/workflow';
import { useTranslation } from "react-i18next";
import { SEO } from "../components/SEO";
import type { JsonValue, JsonObject } from "../types/json";

// Fallback templates data (for when API fails)
// eslint-disable-next-line react-refresh/only-export-components
export const workflowTemplates = [
  {
    id: 1,
    title: "AI Content Generator for Social Media",
    description: "Generate engaging social media posts using AI, schedule them across platforms, and track performance metrics automatically.",
    category: "AI & ML",
    icon: "🤖",
    nodes: ["OpenAI", "Twitter", "LinkedIn", "Analytics"],
    users: "12.5K",
    color: "from-purple-500 to-pink-500",
    executions: "250K+"
  },
  {
    id: 2,
    title: "Lead Enrichment & Auto-Outreach",
    description: "Automatically enrich new leads from Google Sheets, find contact info, and send personalized email sequences.",
    category: "Sales & CRM",
    icon: "📊",
    nodes: ["Google Sheets", "Clearbit", "Gmail", "Salesforce"],
    users: "18.2K",
    color: "from-blue-500 to-cyan-500",
    executions: "500K+"
  },
  {
    id: 3,
    title: "Email to Slack with AI Summary",
    description: "Monitor Gmail for important emails, use AI to summarize content, and post to relevant Slack channels with @mentions.",
    category: "Marketing",
    icon: "📧",
    nodes: ["Gmail", "OpenAI", "Slack"],
    users: "25.1K",
    color: "from-cyan-500 to-blue-500",
    executions: "1M+"
  },
  {
    id: 4,
    title: "Automated Meeting Follow-ups",
    description: "Record Zoom meetings, generate AI transcripts, extract action items, and send follow-up emails with tasks.",
    category: "Sales & CRM",
    icon: "🎯",
    nodes: ["Zoom", "OpenAI", "Notion", "Gmail"],
    users: "15.7K",
    color: "from-orange-500 to-red-500",
    executions: "350K+"
  },
  {
    id: 5,
    title: "Database Monitoring & Alerts",
    description: "Monitor database changes in real-time, detect anomalies, and send alerts to Slack with detailed reports.",
    category: "IT & DevOps",
    icon: "🔧",
    nodes: ["PostgreSQL", "Slack", "PagerDuty"],
    users: "8.9K",
    color: "from-indigo-500 to-purple-500",
    executions: "180K+"
  },
  {
    id: 6,
    title: "Employee Onboarding Automation",
    description: "Create email accounts, set up Slack workspace, add to payroll, and send welcome package when HR adds new employee.",
    category: "HR & Recruiting",
    icon: "👥",
    nodes: ["Google Workspace", "Slack", "Gusto", "Notion"],
    users: "6.3K",
    color: "from-green-500 to-cyan-500",
    executions: "95K+"
  },
  {
    id: 7,
    title: "Social Media Trend Analyzer",
    description: "Scrape trending posts from Instagram/Twitter, analyze with AI, and generate content ideas for your brand.",
    category: "Marketing",
    icon: "📱",
    nodes: ["Twitter", "Instagram", "OpenAI", "Notion"],
    users: "11.4K",
    color: "from-pink-500 to-rose-500",
    executions: "220K+"
  },
  {
    id: 8,
    title: "Data Pipeline: API to Database",
    description: "Fetch data from multiple APIs hourly, transform and clean data, then sync to your data warehouse.",
    category: "Data & Analytics",
    icon: "📈",
    nodes: ["HTTP", "Transform", "PostgreSQL", "BigQuery"],
    users: "9.8K",
    color: "from-cyan-500 to-blue-500",
    executions: "400K+"
  },
  {
    id: 9,
    title: "CI/CD Pipeline Notifications",
    description: "Monitor GitHub Actions, detect failed builds, create Jira tickets, and notify team on Slack.",
    category: "IT & DevOps",
    icon: "⚙️",
    nodes: ["GitHub", "Jira", "Slack"],
    users: "14.2K",
    color: "from-gray-500 to-slate-600",
    executions: "600K+"
  }
];

// Template interface for API response
interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  required_connectors: string[];
  tags: string[];
  use_count: number;
  verified: boolean;
  created_at: string;
  canvas?: {
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
  };
  steps?: Record<string, unknown>[];
  triggers?: Record<string, unknown>[];
  conditions?: Record<string, unknown>[];
  variables?: Record<string, unknown>[];
  outputs?: Record<string, unknown>[];
}

// Category color mapping
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  'Marketing': { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
  'Sales & CRM': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  'AI & ML': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  'IT & DevOps': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  'HR & Recruiting': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  'Data & Analytics': { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  'Communication': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  'ecommerce': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  'social': { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
  'forms': { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  'content': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  'ai': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  'default': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
};

// Map connector names to icon file names
const connectorIconMap: Record<string, string> = {
  'openai': 'openai.png',
  'gmail': 'gmail.png',
  'slack': 'slack.png',
  'telegram': 'telegram.png',
  'twitter': 'twitter.png',
  'google_sheets': 'google_sheets.png',
  'google_docs': 'google_docs.png',
  'google_forms': 'google_forms.png',
  'google_drive': 'google_drive.png',
  'google_calendar': 'google_calendar.png',
  'notion': 'notion.png',
  'discord': 'discord.png',
  'stripe': 'stripe.png',
  'shopify': 'shopify.png',
  'woocommerce': 'woocommerce.png',
  'postgresql': 'postgresql.png',
  'mongodb': 'mongodb.png',
  'mysql': 'mysql.png',
  'redis': 'redis.png',
  'github': 'github.png',
  'gitlab': 'gitlab.png',
  'jira': 'jira.png',
  'youtube': 'youtube.png',
  'instagram': 'instagram.png',
  'facebook': 'facebook.png',
  'linkedin': 'linkedin.png',
  'whatsapp': 'whatsapp.png',
  'hubspot': 'hubspot.png',
  'salesforce': 'salesforce.png',
  'airtable': 'airtable.png',
  'asana': 'asana.png',
  'trello': 'trello.png',
  'clickup': 'clickup.png',
  'monday': 'monday.png',
  'linear': 'linear.png',
  'zendesk': 'zendesk.png',
  'intercom': 'intercom.png',
  'mailchimp': 'mailchimp.png',
  'twilio': 'twilio.png',
  'anthropic': 'anthropic.png',
  'dropbox': 'dropbox.png',
  'zoom': 'zoom.png',
  'teams': 'teams.png',
  'paypal': 'paypal.png',
  'reddit': 'reddit.png',
  'pinterest': 'pinterest.png',
};

function getConnectorIconPath(connector: string): string | null {
  const key = connector.toLowerCase().replace(/[\s-]/g, '_');
  const iconFile = connectorIconMap[key];
  return iconFile ? `/icons/connectors/${iconFile}` : null;
}

function getCategoryStyle(category: string) {
  const key = category?.toLowerCase() || 'default';
  return categoryColors[category] || categoryColors[key] || categoryColors['default'];
}

function formatUseCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// Connector icon component
const ConnectorIcon = ({ connector }: { connector: string }) => {
  const iconPath = getConnectorIconPath(connector);

  if (iconPath) {
    return (
      <img
        src={iconPath}
        alt={connector}
        className="w-4 h-4 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  return <span className="w-4 h-4 bg-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">{connector[0]?.toUpperCase()}</span>;
};

const TEMPLATES_PER_PAGE = 24;
const INITIAL_LOAD_LIMIT = 500; // Load more initially to get all categories

export function Templates() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [allTemplates, setAllTemplates] = useState<Array<{ id: string; title: string; description: string; category: string; connectors: string[]; use_count: number; verified: boolean }>>([]); // All loaded templates for filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);
  const [displayCount, setDisplayCount] = useState(TEMPLATES_PER_PAGE); // How many to display
  const [categories, setCategories] = useState<string[]>(["All"]);

  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const organizations = authContext?.organizations ?? [];

  // Store full template data for workflow creation
  const [fullTemplates, setFullTemplates] = useState<Template[]>([]);

  // Process API response
  const processTemplates = (apiTemplates: Record<string, unknown>[]) => {
    const processed: Template[] = apiTemplates.map((template: Record<string, unknown>) => ({
      id: template.id as string,
      name: (template.name as string) || 'Untitled Template',
      description: (template.description as string) || '',
      category: (template.category as string) || 'Other',
      required_connectors: (template.required_connectors as string[]) || [],
      tags: (template.tags as string[]) || [],
      use_count: (template.use_count as number) || 0,
      verified: (template.verified as boolean) || false,
      created_at: template.created_at as string,
      canvas: (template.canvas as Template['canvas']) || { nodes: [], edges: [] },
      steps: (template.steps as Template['steps']) || [],
      triggers: (template.triggers as Template['triggers']) || [],
      conditions: (template.conditions as Template['conditions']) || [],
      variables: (template.variables as Template['variables']) || [],
      outputs: (template.outputs as Template['outputs']) || []
    }));

    const display = apiTemplates.map((template: Record<string, unknown>) => ({
      id: template.id as string,
      title: (template.name as string) || 'Untitled Template',
      description: (template.description as string) || '',
      category: (template.category as string) || 'Other',
      connectors: (template.required_connectors as string[]) || [],
      use_count: (template.use_count as number) || 0,
      verified: (template.verified as boolean) || false
    }));

    return { processed, display };
  };

  // Fetch all templates from API (one-time load)
  const fetchAllTemplates = async () => {
    setLoading(true);
    try {
      const response = await api.getTemplates({ page: 1, limit: INITIAL_LOAD_LIMIT }) as { templates?: Record<string, unknown>[] } | null;

      if (response?.templates) {
        const { processed, display } = processTemplates(response.templates);

        setFullTemplates(processed);
        setAllTemplates(display);

        // Extract unique categories from templates
        const uniqueCategories = Array.from(new Set(
          response.templates
            .map((t: Record<string, unknown>) => t.category as string)
            .filter((c: string) => c && c.trim() !== '')
        )).sort() as string[];

        setCategories(["All", ...uniqueCategories]);
        setError(null);
      } else {
        setAllTemplates([]);
        setFullTemplates([]);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAllTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset display count when category changes
  useEffect(() => {
    setDisplayCount(TEMPLATES_PER_PAGE);
  }, [selectedCategory]);

  // Load more templates (client-side pagination)
  const loadMore = () => {
    setDisplayCount(prev => prev + TEMPLATES_PER_PAGE);
  };

  // Get full template data by ID
  const getFullTemplate = (id: string | number): Template | null => {
    return fullTemplates.find(t => t.id === String(id)) || null;
  };

  // Handle template card click - open preview modal
  const handleTemplateClick = (template: { id: string }) => {
    const fullData = getFullTemplate(template.id);
    if (fullData) {
      setSelectedTemplate(fullData);
    }
  };

  // Get node count for display
  const getNodeCount = (template: Template): number => {
    if (template.canvas?.nodes?.length) return template.canvas.nodes.length;
    if (template.steps?.length) return template.steps.length;
    return 0;
  };

  // Create workflow with template data
  const createWorkflowWithTemplate = async (template: Template) => {
    try {
      const organizationId = organizations[0]?.id;
      if (!organizationId) {
        toast.error('No organization found');
        navigate('/orgs');
        return;
      }

      // Get existing projects for this organization
      const projectsRes = await api.getProjectsByOrganization(organizationId);
      const projects = (projectsRes as { data?: { id: string }[] }).data || (projectsRes as { id: string }[]);

      if (!projects || projects.length === 0) {
        toast.error('No project found');
        navigate(`/org/${organizationId}`);
        return;
      }

      const projectId = projects[0].id;

      // Create workflow with template data
      const workflowRes = await WorkflowAPI.createWorkflow({
        name: template.name,
        description: template.description,
        workflow: {
          triggers: template.triggers || [],
          steps: template.steps || [],
          conditions: template.conditions || [],
          variables: template.variables || [],
          outputs: template.outputs || [],
          canvas: template.canvas || { nodes: [], edges: [] },
        } as unknown as JsonValue,
      } as JsonObject, organizationId, projectId);

      const workflowId = workflowRes.id;

      toast.success('Workflow created from template');
      navigate(`/org/${organizationId}/project/${projectId}/workflows/${workflowId}`);

    } catch (error) {
      console.error('Failed to create workflow from template:', error);
      toast.error('Failed to create workflow');
      setIsUsingTemplate(false);
    }
  };

  // Handle "Use Template" button click
  const handleUseTemplate = async () => {
    if (!selectedTemplate) return;

    setIsUsingTemplate(true);

    if (!isAuthenticated) {
      // Store template data for after login
      sessionStorage.setItem(PENDING_TEMPLATE_KEY, JSON.stringify(selectedTemplate));
      sessionStorage.setItem(PENDING_TEMPLATE_TIMESTAMP_KEY, Date.now().toString());
      navigate('/login?intent=use-template');
      return;
    }

    // Authenticated - create workflow with template
    await createWorkflowWithTemplate(selectedTemplate);
    setIsUsingTemplate(false);
  };

  // Format category name for display
  const formatCategoryName = (category: string): string => {
    if (category === "All") return t('templatesPage.all');
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Filter templates by category and search (client-side filtering)
  const filteredTemplates = allTemplates.filter(template => {
    // Category filter
    if (selectedCategory !== "All" && template.category !== selectedCategory) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return template.title?.toLowerCase().includes(query) ||
             template.description?.toLowerCase().includes(query) ||
             (template.connectors && template.connectors.some((c: string) => c?.toLowerCase().includes(query)));
    }
    return true;
  });

  // Get templates to display (with pagination)
  const displayedTemplates = filteredTemplates.slice(0, displayCount);
  const hasMore = displayCount < filteredTemplates.length;
  const totalCount = filteredTemplates.length;

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Templates"
        description="Browse hundreds of ready-to-use workflow templates. Get started quickly with pre-built automations for marketing, sales, HR, DevOps, and more."
        canonical="/templates"
      />
      {/* Header */}
      <section className="pt-28 pb-8 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              {t('templatesPage.title')} <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">{t('templatesPage.titleHighlight')}</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('templatesPage.subtitle')}
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-xl mx-auto mb-6"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('templatesPage.searchPlaceholder')}
                className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Category Filters */}
          {!loading && categories.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-center gap-2 mb-4"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all text-sm ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30"
                      : "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {formatCategoryName(category)}
                </button>
              ))}
            </motion.div>
          )}

          {/* Results Count */}
          {!loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <p className="text-gray-500 text-sm">
                {t('templatesPage.showingCount')} <span className="text-cyan-600 font-semibold">{displayedTemplates.length}</span>
                {totalCount > displayedTemplates.length && (
                  <span> {t('templatesPage.of')} <span className="font-semibold">{totalCount}</span></span>
                )}
                {' '}{totalCount !== 1 ? t('templatesPage.templates') : t('templatesPage.template')}
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Templates Grid */}
      <section className="py-8 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
              <p className="text-gray-500">{t('templatesPage.loading')}</p>
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <p className="text-2xl text-gray-700 mb-4">{t('templatesPage.loadFailed')}</p>
              <p className="text-gray-500 mb-8">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
              >
                {t('templatesPage.retry')}
              </Button>
            </motion.div>
          ) : displayedTemplates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <p className="text-2xl text-gray-700 mb-4">{t('templatesPage.noResults')}</p>
              <p className="text-gray-500 mb-8">{t('templatesPage.noResultsHint')}</p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
              >
                {t('templatesPage.clearFilters')}
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayedTemplates.map((template, index) => {
                const categoryStyle = getCategoryStyle(template.category);
                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(0.03 * index, 0.5) }}
                  >
                    <div
                      onClick={() => handleTemplateClick(template)}
                      className="group relative bg-white rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-200 cursor-pointer h-full border border-gray-200 hover:border-cyan-300 hover:shadow-lg"
                    >
                      <div className="p-5 flex flex-col h-full">
                        {/* Header: Category & Verified */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-md ${categoryStyle.bg} ${categoryStyle.text}`}>
                            {formatCategoryName(template.category)}
                          </span>
                          {template.verified && (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                            </span>
                          )}
                        </div>

                        {/* Connector Icons Row */}
                        <div className="flex items-center gap-1.5 mb-3">
                          {template.connectors && template.connectors.slice(0, 4).map((connector: string, idx: number) => (
                            <div key={idx} className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                              <ConnectorIcon connector={connector} />
                            </div>
                          ))}
                          {template.connectors && template.connectors.length > 4 && (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-500">+{template.connectors.length - 4}</span>
                            </div>
                          )}
                          {(!template.connectors || template.connectors.length === 0) && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                              <Zap className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                          {template.title}
                        </h3>

                        {/* Description */}
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-grow">
                          {template.description}
                        </p>

                        {/* Footer: Stats & Button */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Users className="w-3.5 h-3.5" />
                            <span>{formatUseCount(template.use_count || 0)} {t('templatesPage.uses')}</span>
                          </div>
                          <button className="flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700 transition-colors">
                            {t('templatesPage.useTemplate')}
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {!loading && hasMore && displayedTemplates.length > 0 && (
            <div className="flex justify-center mt-10">
              <Button
                onClick={loadMore}
                variant="outline"
                className="px-8 py-3 border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 font-medium rounded-xl"
              >
                {t('templatesPage.loadMore')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Template Preview Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTemplate(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h3>
                      {selectedTemplate.verified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          {t('templatesPage.verified')}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryStyle(selectedTemplate.category).bg} ${getCategoryStyle(selectedTemplate.category).text}`}>
                        {selectedTemplate.category}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm max-w-2xl">{selectedTemplate.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="grid md:grid-cols-3 gap-0">
                {/* Left: Info */}
                <div className="p-6 border-r border-gray-100">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-cyan-600">{getNodeCount(selectedTemplate)}</p>
                      <p className="text-xs text-gray-500">{t('templatesPage.steps')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-700">{formatUseCount(selectedTemplate.use_count)}</p>
                      <p className="text-xs text-gray-500">{t('templatesPage.users')}</p>
                    </div>
                  </div>

                  {/* Connectors */}
                  {selectedTemplate.required_connectors?.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                        {t('templatesPage.integrations')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTemplate.required_connectors.map((connector, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg"
                          >
                            <ConnectorIcon connector={connector} />
                            <span className="capitalize">{connector.replace(/_/g, ' ')}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA Button */}
                  <Button
                    onClick={handleUseTemplate}
                    disabled={isUsingTemplate}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all group disabled:opacity-70"
                  >
                    {isUsingTemplate ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('templatesPage.creating')}
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        {t('templatesPage.useThisTemplate')}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Right: Workflow Preview */}
                <div className="md:col-span-2 bg-slate-900 relative min-h-[320px]">
                  {selectedTemplate.canvas?.nodes?.length > 0 ? (
                    <ReactFlowProvider>
                      <ReactFlow
                        nodes={selectedTemplate.canvas.nodes as Node[]}
                        edges={(selectedTemplate.canvas.edges || []) as Edge[]}
                        nodeTypes={nodeComponents}
                        fitView
                        fitViewOptions={{ padding: 0.3 }}
                        minZoom={0.3}
                        maxZoom={1.2}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable={false}
                        panOnDrag={true}
                        zoomOnScroll={true}
                        className="w-full h-full"
                        proOptions={{ hideAttribution: true }}
                      >
                        <Background
                          color="#334155"
                          variant={BackgroundVariant.Dots}
                          gap={20}
                          size={1}
                        />
                      </ReactFlow>
                    </ReactFlowProvider>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <Layers className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm">{t('templatesPage.previewNotAvailable')}</p>
                      <p className="text-xs text-gray-500 mt-1">{t('templatesPage.previewHint')}</p>
                    </div>
                  )}

                  {/* Overlay badge */}
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <p className="text-xs text-white/80 font-medium">
                      {t('templatesPage.workflowPreview')}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
