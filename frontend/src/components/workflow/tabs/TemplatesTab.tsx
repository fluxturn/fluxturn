import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  ChevronRight,
  ChevronLeft,
  Search,
  RefreshCw,
  Download,
  Copy,
  Zap,
  Layers,
  Clock,
  Code,
  Maximize2,
  ExternalLink,
  TrendingUp,
  Shield,
  Clock3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { WorkflowAPI } from '@/lib/fluxturn';
import { toast } from 'sonner';
import { ReactFlow, Background, BackgroundVariant, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeComponents } from '@/config/workflow';
import { useNavigate, useParams } from 'react-router-dom';
import { extractRouteContext } from '@/lib/navigation-utils';

interface Template {
  id: string;
  name: string;
  description: string;
  category?: string;
  workflow: any;
  created_at: string;
  is_template: boolean;
  verified?: boolean;
  usage_count?: number;
  ai_prompt?: string | null;
}

interface TemplatesTabProps {
  onImportTemplate?: (template: Template) => void;
  onOpenWorkflow?: (workflowId: string) => void;
  templatesOnly?: boolean; // Hide saved workflows section
}

export function TemplatesTab({ onImportTemplate, onOpenWorkflow, templatesOnly = false }: TemplatesTabProps) {
  const navigate = useNavigate();
  const params = useParams();
  const context = extractRouteContext(params);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<Template[]>([]);
  const [selectedItem, setSelectedItem] = useState<Template | null>(null);
  // Always show templates category when templatesOnly is true
  const [activeCategory, setActiveCategory] = useState<'templates' | 'saved'>('templates');
  const [activeView, setActiveView] = useState<'overview' | 'json'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'verified' | 'new'>('all');

  // Pagination state for templates
  const [templatePage, setTemplatePage] = useState(1);
  const [templateTotalPages, setTemplateTotalPages] = useState(1);
  const [templateTotal, setTemplateTotal] = useState(0);

  // Pagination state for workflows
  const [workflowPage, setWorkflowPage] = useState(1);
  const [workflowTotalPages, setWorkflowTotalPages] = useState(1);
  const [workflowTotal, setWorkflowTotal] = useState(0);

  const itemsPerPage = 10;

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      // Reset to page 1 when search changes
      setTemplatePage(1);
      setWorkflowPage(1);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadTemplatesAndWorkflows();
  }, [templatePage, workflowPage, debouncedSearch, activeFilter]);

  // Fetch full workflow details when an item is selected
  const loadWorkflowDetails = async (workflowId: string) => {
    try {
      setIsLoadingDetails(true);
      const fullWorkflow = await WorkflowAPI.getWorkflow(
        workflowId,
        context.organizationId,
        context.projectId
      );
      // console.log('📦 Full workflow data loaded:', fullWorkflow);

      // Update the selected item with full workflow data
      setSelectedItem(fullWorkflow);
    } catch (error: any) {
      console.error('Failed to load workflow details:', error);
      toast.error('Failed to load workflow details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const loadTemplatesAndWorkflows = async () => {
    try {
      setIsLoading(true);

      // Load templates and workflows in parallel with pagination
      // Templates are platform-level (no tenant headers)
      // Workflows are user-scoped (need tenant headers)
      // Skip loading saved workflows when in templates-only mode
      const promises = [
        api.getTemplates({
          page: templatePage,
          limit: itemsPerPage,
          filter: activeFilter,
          ...(debouncedSearch && { search: debouncedSearch })
        })
      ];

      // Only load workflows if not in templates-only mode
      if (!templatesOnly) {
        promises.push(
          WorkflowAPI.getWorkflows(
            {
              page: workflowPage,
              limit: itemsPerPage,
              ...(debouncedSearch && { search: debouncedSearch })
            },
            context.organizationId,
            context.projectId
          )
        );
      }

      const results = await Promise.allSettled(promises);
      const templatesResponse = results[0];
      const workflowsResponse = results[1];

      // Handle templates response
      if (templatesResponse.status === 'fulfilled') {
        const templatesData = templatesResponse.value;
        // console.log('📋 Templates data received:', templatesData);
        
        // Extract pagination info and templates
        if (templatesData?.templates) {
          // Update pagination state
          setTemplateTotal(templatesData.total || templatesData.templates.length);
          setTemplateTotalPages(templatesData.totalPages || 1);
          
          const processedTemplates = templatesData.templates.map((template: any) => ({
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            created_at: template.created_at,
            is_template: true,
            usage_count: template.use_count || 0,
            ai_prompt: template.ai_prompt || null,
            verified: template.verified || false,
            workflow: {
              canvas: template.canvas || { nodes: [], edges: [] },
              steps: template.steps || [],
              triggers: template.triggers || [],
              conditions: template.conditions || [],
              variables: template.variables || [],
              outputs: template.outputs || []
            }
          }));
          setTemplates(processedTemplates);
        } else if (Array.isArray(templatesData)) {
          // Handle array response (no pagination)
          setTemplateTotal(templatesData.length);
          setTemplateTotalPages(1);
          setTemplates(templatesData);
        } else {
          setTemplates([]);
        }
      } else {
        console.error('Failed to load templates:', templatesResponse.reason);
        setTemplates([]);
      }

      // Handle workflows response
      if (workflowsResponse.status === 'fulfilled') {
        const workflowsData = workflowsResponse.value;
        // console.log('⚙️ Workflows data received:', workflowsData);

        // Handle different response formats with pagination
        if (workflowsData?.workflows) {
          // Update pagination state
          setWorkflowTotal(workflowsData.total || workflowsData.workflows.length);
          setWorkflowTotalPages(workflowsData.totalPages || Math.ceil((workflowsData.total || workflowsData.workflows.length) / itemsPerPage));
          setSavedWorkflows(workflowsData.workflows);
        } else if (workflowsData?.data && workflowsData?.pagination) {
          // Alternative format with pagination object
          setWorkflowTotal(workflowsData.pagination.total || workflowsData.data.length);
          setWorkflowTotalPages(workflowsData.pagination.totalPages || 1);
          setSavedWorkflows(workflowsData.data);
        } else if (Array.isArray(workflowsData)) {
          // Handle array response (no pagination)
          setWorkflowTotal(workflowsData.length);
          setWorkflowTotalPages(1);
          setSavedWorkflows(workflowsData);
        } else {
          setSavedWorkflows([]);
        }
      } else {
        console.error('Failed to load workflows:', workflowsResponse.reason);
        toast.error('Failed to load saved workflows');
        setSavedWorkflows([]);
      }

    } catch (error: any) {
      console.error('Failed to load templates and workflows:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = () => {
    // Return items based on active category
    // Search filtering is now handled by the backend API
    if (activeCategory === 'templates') {
      return templates;
    } else {
      return savedWorkflows;
    }
  };

  const handleOpenWorkflow = (workflow: Template) => {
    try {
      if (!workflow.id) {
        toast.error('Workflow ID is missing');
        return;
      }

      // If callback is provided (within the same workflow page), use it to switch to editor tab
      if (onOpenWorkflow) {
        onOpenWorkflow(workflow.id);
        toast.success(`Opening workflow "${workflow.name}"`);
      } else {
        // Otherwise, navigate to the workflow editor
        navigate(`/org/${context.organizationId}/project/${context.projectId}/workflows/${workflow.id}`);
        toast.success(`Opening workflow "${workflow.name}"`);
      }
    } catch (error) {
      console.error('Failed to open workflow:', error);
      toast.error('Failed to open workflow');
    }
  };

  const handleUseTemplate = (template: Template) => {
    try {
      if (!template.workflow || !template.workflow.canvas) {
        toast.error('Template workflow data is invalid');
        return;
      }

      if (!template.workflow.canvas.nodes || template.workflow.canvas.nodes.length === 0) {
        toast.error('Template has no nodes');
        return;
      }

      if (onImportTemplate) {
        onImportTemplate(template);
        toast.success(`Template "${template.name}" loaded into canvas`);
      }
    } catch (error) {
      console.error('Failed to use template:', error);
      toast.error('Failed to load template');
    }
  };

  const handleCopyJSON = async () => {
    try {
      if (!selectedItem) {
        toast.error('No template selected');
        return;
      }

      // Copy workflow data if available, otherwise copy entire item
      const dataToCopy = selectedItem.workflow || selectedItem;
      await navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
      toast.success('JSON copied to clipboard');
    } catch (error) {
      console.error('Failed to copy JSON:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    try {
      if (!selectedItem) {
        toast.error('No template selected');
        return;
      }

      const dataStr = JSON.stringify(selectedItem, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `${selectedItem.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Failed to download template:', error);
      toast.error('Failed to download template');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getNodeCount = (workflow: any) => {
    if (!workflow) return 0;

    // Try different possible locations for nodes
    if (workflow.canvas?.nodes?.length) {
      return workflow.canvas.nodes.length;
    }
    if (workflow.nodes?.length) {
      return workflow.nodes.length;
    }
    if (workflow.steps?.length) {
      return workflow.steps.length;
    }
    if (Array.isArray(workflow) && workflow.length) {
      return workflow.length;
    }

    return 0;
  };

  const getEdgeCount = (workflow: any) => {
    if (!workflow) return 0;

    // Try different possible locations for edges/connections
    if (workflow.canvas?.edges?.length) {
      return workflow.canvas.edges.length;
    }
    if (workflow.edges?.length) {
      return workflow.edges.length;
    }
    if (workflow.connections?.length) {
      return workflow.connections.length;
    }

    return 0;
  };

  const getWorkflowNodes = (workflow: any): any[] => {
    if (!workflow) return [];

    // Try different possible locations for nodes
    if (workflow.canvas?.nodes?.length) {
      return workflow.canvas.nodes;
    }
    if (workflow.nodes?.length) {
      return workflow.nodes;
    }
    if (workflow.steps?.length) {
      // Transform steps to node-like objects
      return workflow.steps.map((step: any, index: number) => ({
        id: step.id || `step-${index}`,
        type: step.type || step.action || 'step',
        data: {
          label: step.name || step.title || `Step ${index + 1}`,
          description: step.description
        },
        ...step
      }));
    }

    return [];
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Templates & Workflows List */}
      <div className="w-80 border-r border-white/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/10 flex-shrink-0">
          <div className="h-14 flex items-center justify-between px-4">
            <h3 className="text-white font-medium">{templatesOnly ? 'Templates' : 'Templates & Workflows'}</h3>
            <button
              onClick={loadTemplatesAndWorkflows}
              disabled={isLoading}
              className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Filter Buttons - Only shown for Templates */}
          {activeCategory === 'templates' && (
            <div className="px-3 pb-3 flex-shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveFilter('all');
                    setTemplatePage(1);
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                    activeFilter === 'all'
                      ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  All
                </button>
                <button
                  onClick={() => {
                    setActiveFilter('popular');
                    setTemplatePage(1);
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                    activeFilter === 'popular'
                      ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                  )}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Popular
                </button>
                <button
                  onClick={() => {
                    setActiveFilter('verified');
                    setTemplatePage(1);
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                    activeFilter === 'verified'
                      ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                  )}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Verified
                </button>
                <button
                  onClick={() => {
                    setActiveFilter('new');
                    setTemplatePage(1);
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                    activeFilter === 'new'
                      ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                  )}
                >
                  <Clock3 className="w-3.5 h-3.5" />
                  New
                </button>
              </div>
            </div>
          )}

          {/* Category Tabs - Hidden when templatesOnly is true */}
          {!templatesOnly && (
            <div className="flex border-b border-white/10 flex-shrink-0">
              <button
                onClick={() => {
                  setActiveCategory('templates');
                  setTemplatePage(1);
                }}
                className={cn(
                  "flex-1 px-4 py-2 text-sm border-b-2 transition-colors",
                  activeCategory === 'templates'
                    ? "border-cyan-500 text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                )}
              >
                Templates
              </button>
              <button
                onClick={() => {
                  setActiveCategory('saved');
                  setWorkflowPage(1);
                  setActiveFilter('all'); // Reset filter when switching to saved workflows
                }}
                className={cn(
                  "flex-1 px-4 py-2 text-sm border-b-2 transition-colors",
                  activeCategory === 'saved'
                    ? "border-cyan-500 text-white"
                    : "border-transparent text-gray-400 hover:text-white"
                )}
              >
                Saved Workflows
              </button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && filteredItems().length === 0 ? (
            <div className="p-4 text-center">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-400 text-sm">Loading...</p>
            </div>
          ) : filteredItems().length === 0 ? (
            <div className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No templates found</p>
              <p className="text-gray-500 text-xs mt-1">Save your workflows to see them here</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredItems().map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    // If this is a saved workflow (not a template), fetch full details
                    if (!item.is_template && item.id) {
                      loadWorkflowDetails(item.id);
                    } else {
                      // For templates, use the data as-is
                      setSelectedItem(item);
                    }
                  }}
                  className={cn(
                    "w-full p-3 rounded-lg border transition-all text-left",
                    selectedItem?.id === item.id
                      ? "bg-cyan-500/10 border-cyan-500/30"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.is_template ? (
                        <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-white text-sm font-medium line-clamp-1">
                        {item.name}
                      </span>
                      {item.verified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 flex-shrink-0 ml-2">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                    {item.description || 'No description'}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>{getNodeCount(item.workflow)} nodes</span>
                    </div>
                    {item.created_at && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {activeCategory === 'templates' && templateTotalPages > 1 && (
          <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="text-xs text-gray-400">
              Page {templatePage} of {templateTotalPages} • {templateTotal} templates
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTemplatePage(prev => Math.max(1, prev - 1))}
                disabled={templatePage === 1}
                className="flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3 h-3" />
                Previous
              </button>
              <button
                onClick={() => setTemplatePage(prev => Math.min(templateTotalPages, prev + 1))}
                disabled={templatePage === templateTotalPages}
                className="flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {activeCategory === 'saved' && workflowTotalPages > 1 && (
          <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="text-xs text-gray-400">
              Page {workflowPage} of {workflowTotalPages} • {workflowTotal} workflows
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setWorkflowPage(prev => Math.max(1, prev - 1))}
                disabled={workflowPage === 1}
                className="flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3 h-3" />
                Previous
              </button>
              <button
                onClick={() => setWorkflowPage(prev => Math.min(workflowTotalPages, prev + 1))}
                disabled={workflowPage === workflowTotalPages}
                className="flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Template/Workflow Details */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedItem ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                {selectedItem.is_template ? (
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                ) : (
                  <FileText className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium">{selectedItem.name}</h3>
                    {selectedItem.verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 flex-shrink-0">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {selectedItem.is_template ? 'Template' : 'Saved Workflow'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJSON}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy JSON
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                {selectedItem.is_template ? (
                  <button
                    onClick={() => handleUseTemplate(selectedItem)}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 rounded text-sm text-white transition-colors flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Use Template
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenWorkflow(selectedItem)}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 rounded text-sm text-white transition-colors flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Workflow
                  </button>
                )}
              </div>
            </div>

            {/* View Tabs */}
            <div className="border-b border-white/10 px-6">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveView('overview')}
                  className={cn(
                    "px-4 py-2 text-sm border-b-2 transition-colors",
                    activeView === 'overview'
                      ? "border-cyan-500 text-white"
                      : "border-transparent text-gray-400 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Overview
                  </div>
                </button>
                <button
                  onClick={() => setActiveView('json')}
                  className={cn(
                    "px-4 py-2 text-sm border-b-2 transition-colors",
                    activeView === 'json'
                      ? "border-cyan-500 text-white"
                      : "border-transparent text-gray-400 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    JSON
                  </div>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 text-sm">Loading workflow details...</p>
                  </div>
                </div>
              ) : activeView === 'overview' ? (
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 rounded border border-cyan-500/20 p-2">
                      <p className="text-gray-400 text-[10px] mb-0.5 uppercase tracking-wide">Total Nodes</p>
                      <p className="text-lg font-bold text-cyan-400">
                        {getNodeCount(selectedItem.workflow)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded border border-purple-500/20 p-2">
                      <p className="text-gray-400 text-[10px] mb-0.5 uppercase tracking-wide">Connections</p>
                      <p className="text-lg font-bold text-purple-400">
                        {getEdgeCount(selectedItem.workflow)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded border border-green-500/20 p-2">
                      <p className="text-gray-400 text-[10px] mb-0.5 uppercase tracking-wide">Created</p>
                      <p className="text-xs font-medium text-green-400">
                        {formatDate(selectedItem.created_at)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded border border-blue-500/20 p-2">
                      <p className="text-gray-400 text-[10px] mb-0.5 uppercase tracking-wide">Type</p>
                      <p className="text-xs font-medium text-blue-400">
                        {selectedItem.is_template ? 'Template' : 'Workflow'}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedItem.description && (
                    <div>
                      <h4 className="text-gray-400 text-xs font-medium mb-1">Description</h4>
                      <div className="bg-white/5 border border-white/10 rounded p-2 max-h-16 overflow-y-auto">
                        <p className="text-white text-xs leading-relaxed">{selectedItem.description}</p>
                      </div>
                    </div>
                  )}

                  {/* AI Prompt */}
                  {selectedItem.ai_prompt && (
                    <div>
                      <h4 className="text-gray-400 text-xs font-medium mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        AI Prompt
                      </h4>
                      <div className="bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border border-cyan-500/20 rounded p-2 max-h-16 overflow-y-auto">
                        <p className="text-gray-300 text-xs leading-relaxed font-mono">{selectedItem.ai_prompt}</p>
                      </div>
                    </div>
                  )}

                  {/* Workflow Visual Preview */}
                  {(() => {
                    // Get nodes and edges from workflow canvas
                    const nodes = selectedItem.workflow?.canvas?.nodes || [];
                    const edges = selectedItem.workflow?.canvas?.edges || [];

                    // Only show preview if we have nodes
                    if (!nodes || nodes.length === 0) return null;

                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-gray-400 text-xs font-medium">Workflow Preview</h4>
                          <button
                            onClick={() => {
                              toast.info(`Preview: ${nodes.length} nodes, ${edges.length} connections`);
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="View info"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                        <div className="bg-black/40 rounded border border-white/10 overflow-hidden h-[300px]">
                          <ReactFlowProvider>
                            <ReactFlow
                              nodes={nodes}
                              edges={edges}
                              nodeTypes={nodeComponents}
                              fitView
                              fitViewOptions={{ padding: 0.2 }}
                              minZoom={0.1}
                              maxZoom={1.5}
                              nodesDraggable={false}
                              nodesConnectable={false}
                              elementsSelectable={false}
                              panOnDrag={true}
                              zoomOnScroll={true}
                              className="w-full h-full"
                              proOptions={{ hideAttribution: true }}
                            >
                              <Background
                                color="#1f2937"
                                variant={BackgroundVariant.Dots}
                                gap={16}
                                size={1}
                              />
                            </ReactFlow>
                          </ReactFlowProvider>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : activeView === 'json' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-gray-400 text-sm font-medium">Complete Workflow JSON</h4>
                    <button
                      onClick={handleCopyJSON}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>

                  {selectedItem ? (
                    <div className="bg-black/40 rounded-lg border border-white/10 p-4 max-h-[600px] overflow-auto">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                        {JSON.stringify(selectedItem.workflow || selectedItem, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <p className="text-yellow-400 text-sm">No data available</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No Template Selected</p>
              <p className="text-gray-500 text-sm">Select a template or workflow to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
