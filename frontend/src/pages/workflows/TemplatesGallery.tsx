import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Zap,
  TrendingUp,
  Shield,
  Search,
  Filter,
  Clock,
  Check,
  Star,
  Copy,
  Eye,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  RotateCcw
} from 'lucide-react';
import { extractRouteContext } from '@/lib/navigation-utils';
import { api } from '@/lib/api';
import { WorkflowAPI } from '@/lib/fluxturn';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ReactFlow, Background, BackgroundVariant, ReactFlowProvider, useReactFlow, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeComponents } from '@/config/workflow';

interface Template {
  id: string;
  name: string;
  description: string;
  category?: string;
  workflow: Record<string, unknown>;
  created_at: string;
  is_template: boolean;
  verified?: boolean;
  usage_count?: number;
  ai_prompt?: string | null;
}

// Workflow Preview Component with Zoom Controls
const WorkflowPreview: React.FC<{ nodes: Node[]; edges: Edge[] }> = ({ nodes, edges }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [hasInitialized, setHasInitialized] = useState(false);

  // Only fit view once on mount to prevent auto-scrolling
  useEffect(() => {
    if (!hasInitialized && nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
        setHasInitialized(true);
      }, 100);
    }
  }, [hasInitialized, nodes.length, fitView]);

  const handleZoomIn = () => {
    zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    zoomOut({ duration: 300 });
  };

  const handleResetView = () => {
    fitView({ padding: 0.2, duration: 300 });
  };

  return (
    <div className="bg-black/40 rounded-lg border border-white/10 overflow-hidden relative h-[400px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeComponents}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
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

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-slate-800/90 hover:bg-slate-700/90 border border-white/20 rounded-lg transition-all shadow-lg"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-slate-800/90 hover:bg-slate-700/90 border border-white/20 rounded-lg transition-all shadow-lg"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-white" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 bg-slate-800/90 hover:bg-slate-700/90 border border-white/20 rounded-lg transition-all shadow-lg"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
};

export const TemplatesGallery: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ organizationId: string; projectId: string }>();
  const context = extractRouteContext(params);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'verified' | 'new'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    popular: 0
  });
  const itemsPerPage = 9;

  useEffect(() => {
    loadTemplates();
  }, [page, searchQuery, activeFilter]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.getTemplates({
        page,
        limit: itemsPerPage,
        filter: activeFilter,
        ...(searchQuery && { search: searchQuery })
      });

      if (response?.templates) {
        const processedTemplates = response.templates.map((template: Record<string, unknown>) => ({
          id: template.id as string,
          name: template.name as string,
          description: template.description as string,
          category: template.category as string,
          created_at: template.created_at as string,
          is_template: true,
          usage_count: (template.use_count as number) || 0,
          ai_prompt: (template.ai_prompt as string) || null,
          verified: (template.verified as boolean) || false,
          workflow: {
            canvas: (template.canvas as Record<string, unknown>) || { nodes: [], edges: [] }
          }
        }));
        setTemplates(processedTemplates);
        setTotalPages(response.totalPages || 1);
        setTotalCount(response.total || processedTemplates.length);

        // Set stats from API response
        setStats({
          total: response.total || processedTemplates.length,
          verified: response.verifiedCount || 0,
          popular: response.popularCount || 0
        });
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      toast.loading('Creating workflow from template...');

      // Create a new workflow from the template with correct format
      const workflowData = {
        name: template.name,
        description: template.description,
        workflow: {
          triggers: [],
          steps: [],
          conditions: [],
          variables: [],
          outputs: [],
          canvas: template.workflow?.canvas || { nodes: [], edges: [] }
        }
      };

      const newWorkflow = await WorkflowAPI.createWorkflow(
        workflowData,
        context.organizationId,
        context.projectId
      );

      toast.dismiss();
      toast.success('Workflow created from template!');

      // Navigate directly to the workflow editor
      navigate(`/org/${context.organizationId}/project/${context.projectId}/workflows/${newWorkflow.id}`);
    } catch (error) {
      console.error('Failed to create workflow from template:', error);
      toast.dismiss();
      toast.error('Failed to create workflow from template');
    }
  };

  const filterButtons = [
    { id: 'all', label: 'All Templates', icon: Layers },
    { id: 'popular', label: 'Popular', icon: TrendingUp },
    { id: 'verified', label: 'Verified', icon: Shield },
    { id: 'new', label: 'New', icon: Clock }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Compact Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-slate-900/50 via-slate-800/50 to-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Title & Back Button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => navigate(`/org/${context.organizationId}/project/${context.projectId}/workflows`)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all border border-white/10 hover:border-purple-500/50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              <Sparkles className="w-6 h-6 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  Workflow Templates
                </h1>
                <p className="text-gray-400 text-xs">
                  Deploy production-ready automation workflows
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="text-base font-bold text-white">{stats.total}</div>
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <div>
                    <div className="text-xs text-gray-400">Verified</div>
                    <div className="text-base font-bold text-white">{stats.verified}</div>
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="text-xs text-gray-400">Popular</div>
                    <div className="text-base font-bold text-white">{stats.popular}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex gap-3 items-center">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              {filterButtons.map((filter) => {
                const Icon = filter.icon;
                return (
                  <button
                    key={filter.id}
                    onClick={() => {
                      setActiveFilter(filter.id as typeof activeFilter);
                      setPage(1);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all",
                      activeFilter === filter.id
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                        : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-white/5 rounded-xl animate-pulse border border-white/10" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-400 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No templates found</h3>
            <p className="text-gray-400 mb-4">
              {searchQuery ? 'Try adjusting your search or filters' : 'Check back soon for new templates'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="group relative cursor-pointer"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="h-full bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-purple-500/50 transition-all shadow-lg hover:shadow-purple-500/20">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-3">
                      {template.verified && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 border border-green-500/30 rounded text-xs font-medium text-green-400">
                          <Shield className="w-3 h-3" />
                          Verified
                        </div>
                      )}
                      {template.category && (
                        <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-xs font-medium text-purple-400">
                          {template.category}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                      {template.name}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-400 text-xs mb-4 line-clamp-3 leading-relaxed">
                      {template.description || 'No description available'}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Copy className="w-3 h-3" />
                          <span>{template.usage_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>Preview</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseTemplate(template);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {(page - 1) * itemsPerPage + 1}-{Math.min(page * itemsPerPage, totalCount)} of {totalCount} templates
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex gap-1">
                    {(() => {
                      const pageNumbers = [];
                      const showEllipsis = totalPages > 7;

                      if (!showEllipsis) {
                        for (let i = 1; i <= totalPages; i++) {
                          pageNumbers.push(i);
                        }
                      } else {
                        pageNumbers.push(1);
                        if (page > 3) pageNumbers.push('...');

                        const start = Math.max(2, page - 1);
                        const end = Math.min(totalPages - 1, page + 1);

                        for (let i = start; i <= end; i++) {
                          if (!pageNumbers.includes(i)) {
                            pageNumbers.push(i);
                          }
                        }

                        if (page < totalPages - 2) pageNumbers.push('...');
                        if (!pageNumbers.includes(totalPages)) {
                          pageNumbers.push(totalPages);
                        }
                      }

                      return pageNumbers.map((pageNum, index) => {
                        if (pageNum === '...') {
                          return (
                            <span key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-gray-400">
                              ...
                            </span>
                          );
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum as number)}
                            className={cn(
                              "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                              page === pageNum
                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                : "bg-white/5 border border-white/10 hover:bg-white/10"
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      });
                    })()}
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Template Preview Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/20 rounded-2xl max-w-5xl w-full max-h-[90vh] shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex-shrink-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedTemplate.verified && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-lg">
                          <Shield className="w-4 h-4 text-green-400" />
                          <span className="text-xs font-medium text-green-400">Verified</span>
                        </div>
                      )}
                      {selectedTemplate.category && (
                        <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs font-medium text-purple-400">
                          {selectedTemplate.category}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {selectedTemplate.name}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {selectedTemplate.description}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Copy className="w-4 h-4" />
                    <span>{selectedTemplate.usage_count || 0} uses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(selectedTemplate.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Modal Content - Workflow Preview */}
              <div className="p-6 overflow-y-auto flex-1 min-h-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">What this template does:</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {selectedTemplate.description || 'This template provides a pre-configured workflow to help you automate your processes quickly.'}
                    </p>
                  </div>

                  {selectedTemplate.ai_prompt && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2">AI Configuration:</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {selectedTemplate.ai_prompt}
                      </p>
                    </div>
                  )}

                  {/* Workflow Visual Preview */}
                  {(() => {
                    const nodes = selectedTemplate.workflow?.canvas?.nodes || [];
                    const edges = selectedTemplate.workflow?.canvas?.edges || [];

                    if (!nodes || nodes.length === 0) {
                      return (
                        <div>
                          <h3 className="text-sm font-semibold text-white mb-2">Workflow Preview:</h3>
                          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <p className="text-xs text-gray-400">
                              No workflow visualization available
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-2">Workflow Preview:</h3>
                        <ReactFlowProvider>
                          <WorkflowPreview nodes={nodes} edges={edges} />
                        </ReactFlowProvider>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-white/10 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-all font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleUseTemplate(selectedTemplate);
                    setSelectedTemplate(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all font-medium"
                >
                  Use This Template
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
