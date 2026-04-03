import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Sparkles, CheckCircle, Loader2, BookOpen, Layers, X } from "lucide-react";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useContext } from "react";
import { api } from "../../lib/api";
import { WorkflowAPI } from "../../lib/fluxturn";
import { AuthContext } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { ReactFlow, Background, BackgroundVariant, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeComponents } from '@/config/workflow';

// Session storage keys for pending template
export const PENDING_TEMPLATE_KEY = 'fluxturn_pending_template';
export const PENDING_TEMPLATE_TIMESTAMP_KEY = 'fluxturn_pending_template_timestamp';

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
    nodes: any[];
    edges: any[];
  };
  steps?: any[];
  triggers?: any[];
  conditions?: any[];
  variables?: any[];
  outputs?: any[];
}

// Category color mapping
const categoryColors: Record<string, { bg: string; text: string; border: string; chip: string }> = {
  'Marketing': { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', chip: 'hover:bg-pink-50 hover:border-pink-300' },
  'Sales & CRM': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', chip: 'hover:bg-blue-50 hover:border-blue-300' },
  'AI & ML': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', chip: 'hover:bg-purple-50 hover:border-purple-300' },
  'IT & DevOps': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', chip: 'hover:bg-slate-50 hover:border-slate-300' },
  'HR & Recruiting': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', chip: 'hover:bg-green-50 hover:border-green-300' },
  'Data & Analytics': { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', chip: 'hover:bg-cyan-50 hover:border-cyan-300' },
  'Communication': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', chip: 'hover:bg-orange-50 hover:border-orange-300' },
  'ecommerce': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', chip: 'hover:bg-emerald-50 hover:border-emerald-300' },
  'social': { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', chip: 'hover:bg-sky-50 hover:border-sky-300' },
  'forms': { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', chip: 'hover:bg-violet-50 hover:border-violet-300' },
  'content': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', chip: 'hover:bg-rose-50 hover:border-rose-300' },
  'ai': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', chip: 'hover:bg-purple-50 hover:border-purple-300' },
  'default': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', chip: 'hover:bg-gray-50 hover:border-gray-300' }
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

export function TemplatesSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isUsingTemplate, setIsUsingTemplate] = useState(false);

  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const organizations = authContext?.organizations ?? [];

  useEffect(() => {
    async function fetchTemplates() {
      try {
        setLoading(true);
        // Fetch templates with full data including canvas
        const response = await api.getTemplates({ limit: 12, filter: 'popular' });

        // Process templates to ensure they have the right structure
        const templatesData = response?.templates || response || [];
        const processedTemplates = templatesData.map((template: any) => ({
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          required_connectors: template.required_connectors || [],
          tags: template.tags || [],
          use_count: template.use_count || 0,
          verified: template.verified || false,
          created_at: template.created_at,
          canvas: template.canvas || { nodes: [], edges: [] },
          steps: template.steps || [],
          triggers: template.triggers || [],
          conditions: template.conditions || [],
          variables: template.variables || [],
          outputs: template.outputs || []
        }));

        setTemplates(processedTemplates);
        // Select first template by default
        if (processedTemplates.length > 0) {
          setSelectedTemplate(processedTemplates[0]);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const handleTemplateClick = (template: Template) => {
    if (selectedTemplate?.id === template.id) {
      // Don't deselect, just keep selected
      return;
    }
    setSelectedTemplate(template);
  };

  const getNodeCount = (template: Template): number => {
    if (template.canvas?.nodes?.length) return template.canvas.nodes.length;
    if (template.steps?.length) return template.steps.length;
    return 0;
  };

  const createWorkflowWithTemplate = async (template: Template) => {
    try {
      const organizationId = organizations[0]?.id;
      if (!organizationId) {
        toast.error(t('templates.errors.noOrganization', 'No organization found'));
        navigate('/orgs');
        return;
      }

      // 1. Get existing projects for this organization
      const projectsRes = await api.getProjectsByOrganization(organizationId);
      const projects = (projectsRes as any).data || (projectsRes as any);

      if (!projects || projects.length === 0) {
        toast.error(t('templates.errors.noProject', 'No project found'));
        navigate(`/org/${organizationId}`);
        return;
      }

      const projectId = projects[0].id;

      // 2. Create workflow with template data
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
        },
      }, organizationId, projectId);

      const workflowId = workflowRes.id;

      // 3. Navigate to editor
      toast.success(t('templates.success.created', 'Workflow created from template'));
      navigate(`/org/${organizationId}/project/${projectId}/workflows/${workflowId}`);

    } catch (error) {
      console.error('Failed to create workflow from template:', error);
      toast.error(t('templates.errors.creationFailed', 'Failed to create workflow'));
      setIsUsingTemplate(false);
    }
  };

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
            // Fallback to text if image fails to load
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }

    // Fallback for unknown connectors
    return <span className="w-4 h-4 bg-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">{connector[0]?.toUpperCase()}</span>;
  };

  return (
    <section id="templates" className="relative py-20 md:py-28 overflow-hidden bg-gray-50">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-100/40 via-transparent to-transparent" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-cyan-200 shadow-sm mb-5"
          >
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-medium text-cyan-700">{t('templates.badge', '300+ Templates')}</span>
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-gray-900">{t('templates.title', 'Start with a')} </span>
            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
              {t('templates.titleHighlight', 'Ready-Made Template')}
            </span>
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-xl mx-auto">
            {t('templates.clickToPreview', 'Click any template to preview the workflow')}
          </p>
        </motion.div>

        {/* Template Chips */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-gray-500">{error}</div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex flex-wrap justify-center gap-3 mb-8"
            >
              {templates.slice(0, 12).map((template, index) => {
                const categoryStyle = getCategoryStyle(template.category);
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <motion.button
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.3, delay: 0.2 + index * 0.03 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      relative px-4 py-2.5 rounded-xl bg-white border-2 shadow-sm
                      transition-all duration-200 text-left group
                      ${isSelected
                        ? 'border-cyan-400 shadow-lg shadow-cyan-100/50 ring-2 ring-cyan-100'
                        : `border-gray-200 hover:shadow-md ${categoryStyle.chip}`
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {/* Category indicator dot */}
                      <div className={`w-2 h-2 rounded-full ${categoryStyle.bg} ${categoryStyle.border} border`} />

                      <span className={`text-sm font-medium ${isSelected ? 'text-cyan-700' : 'text-gray-700'} max-w-[200px] truncate`}>
                        {template.name}
                      </span>

                      {template.verified && (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      )}
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <motion.div
                        layoutId="selectedIndicator"
                        className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-cyan-400"
                      />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Preview Panel */}
            <AnimatePresence mode="wait">
              {selectedTemplate && (
                <motion.div
                  key={selectedTemplate.id}
                  initial={{ opacity: 0, y: 20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="mb-10"
                >
                  <div className="bg-white rounded-2xl border-2 border-cyan-200 shadow-xl overflow-hidden">
                    {/* Preview Header */}
                    <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100 px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h3>
                            {selectedTemplate.verified && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <CheckCircle className="w-3 h-3" />
                                {t('templates.verified', 'Verified')}
                              </span>
                            )}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryStyle(selectedTemplate.category).bg} ${getCategoryStyle(selectedTemplate.category).text}`}>
                              {selectedTemplate.category}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm max-w-2xl">{selectedTemplate.description}</p>
                        </div>
                        <button
                          onClick={() => setSelectedTemplate(templates[0] || null)}
                          className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    {/* Preview Content */}
                    <div className="grid md:grid-cols-3 gap-0">
                      {/* Left: Info */}
                      <div className="p-6 border-r border-gray-100">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-cyan-600">{getNodeCount(selectedTemplate)}</p>
                            <p className="text-xs text-gray-500">{t('templates.steps', 'Steps')}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-gray-700">{formatUseCount(selectedTemplate.use_count)}</p>
                            <p className="text-xs text-gray-500">{t('templates.users', 'Users')}</p>
                          </div>
                        </div>

                        {/* Connectors */}
                        {selectedTemplate.required_connectors?.length > 0 && (
                          <div className="mb-5">
                            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                              {t('templates.integrations', 'Integrations')}
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

                        {/* CTA */}
                        <Button
                          onClick={handleUseTemplate}
                          disabled={isUsingTemplate}
                          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all group disabled:opacity-70"
                        >
                          {isUsingTemplate ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {t('templates.creating', 'Creating...')}
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              {t('templates.useTemplate', 'Use This Template')}
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
                              nodes={selectedTemplate.canvas.nodes}
                              edges={selectedTemplate.canvas.edges || []}
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
                            <p className="text-sm">{t('templates.previewNotAvailable', 'Preview not available')}</p>
                            <p className="text-xs text-gray-500 mt-1">{t('templates.viewDetails', 'View template details for more info')}</p>
                          </div>
                        )}

                        {/* Overlay badge */}
                        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                          <p className="text-xs text-white/80 font-medium">
                            {t('templates.workflowPreview', 'Workflow Preview')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <Link to="/templates">
            <Button
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-105 group"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              {t('templates.browseAll', 'Browse All Templates')}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            {t('templates.browseHint', 'Explore 300+ ready-to-use automation templates')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
