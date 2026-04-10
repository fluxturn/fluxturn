import { useReactFlow } from "@xyflow/react";
import { X, Search, Zap, Cog, GitBranch, Database, Loader2, ArrowLeft, Mail, MessageSquare, CheckCircle } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getTriggerNodes,
  getActionNodes,
  getControlNodes,
  type NodeTypeDefinition,
  NodeType,
  NODE_DEFINITIONS,
} from "@/config/workflow";
import { connectorService, type AvailableConnector } from "@/services/workflow";
import { createConnectorTriggerNode } from "@/utils/workflow";
import { getConnectorIconPath, hasConnectorIcon } from "@/utils/workflow";

interface NodeSelectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NodeSelectorPanel({ isOpen, onClose }: NodeSelectorPanelProps) {
  const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();
  const [activeTab, setActiveTab] = useState<"triggers" | "actions" | "control">("triggers");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableConnectors, setAvailableConnectors] = useState<AvailableConnector[]>([]);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<AvailableConnector | null>(null);
  const [connectorActions, setConnectorActions] = useState<Array<{ id: string; name: string; description?: string; category?: string; inputSchema?: Record<string, unknown> }>>([]);
  const [selectedTriggerConnector, setSelectedTriggerConnector] = useState<AvailableConnector | null>(null);
  const [connectorTriggers, setConnectorTriggers] = useState<Array<{ id: string; name: string; description?: string; eventType?: string; webhookRequired?: boolean; icon?: string; inputSchema?: Record<string, unknown> }>>([]);

  const triggerNodes = getTriggerNodes();
  const actionNodes = getActionNodes();
  const controlNodes = getControlNodes();

  // Fetch available connector types when panel opens (cached - only fetch once)
  useEffect(() => {
    const fetchConnectors = async () => {
      // Skip if panel is closed or connectors are already loaded
      if (!isOpen || availableConnectors.length > 0) return;

      setIsLoadingConnectors(true);
      try {
        const connectors = await connectorService.getAvailableConnectors();
        // Deduplicate by connector name (safety measure)
        const uniqueConnectors = connectors ?
          connectors.filter((connector, index, self) =>
            index === self.findIndex((c) => c.name === connector.name)
          ) : [];
        setAvailableConnectors(uniqueConnectors);
      } catch (error) {
        console.error('Failed to fetch available connectors:', error);
        setAvailableConnectors([]);
      } finally {
        setIsLoadingConnectors(false);
      }
    };

    fetchConnectors();
  }, [isOpen, availableConnectors.length]);

  // Reset category selection when tab changes
  useEffect(() => {
    setSelectedCategory(null);
    setSelectedConnector(null);
    setConnectorActions([]);
    setSelectedTriggerConnector(null);
    setConnectorTriggers([]);
  }, [activeTab]);

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const handleBackToCategories = useCallback(() => {
    setSelectedCategory(null);
    setSelectedConnector(null);
    setConnectorActions([]);
    setSelectedTriggerConnector(null);
    setConnectorTriggers([]);
  }, []);

  const handleConnectorSelect = useCallback(async (connector: AvailableConnector) => {
    // Clear search query when selecting a connector
    setSearchQuery("");

    // If we're in actions tab, show actions for this connector
    if (activeTab === "actions") {
      setSelectedConnector(connector);
      try {
        const actions = await connectorService.getConnectorActions(connector.name);
        setConnectorActions(Array.isArray(actions) ? actions : []);
      } catch (error) {
        console.error('Failed to fetch connector actions:', error);
        // Fallback to supported_actions from connector metadata
        const fallbackActions = Array.isArray(connector.supported_actions) ? connector.supported_actions : [];
        setConnectorActions(fallbackActions.map((a: string | { id?: string; name?: string }) => typeof a === 'string' ? { id: a, name: a } : { id: a.id || a.name || '', name: a.name || a.id || '' }));
      }
      return;
    }

    // If we're in triggers tab, show triggers for this connector (similar to actions)
    if (activeTab === "triggers") {
      setSelectedTriggerConnector(connector);
      try {
        // Try to fetch triggers from API first
        const triggers = await connectorService.getConnectorTriggers(connector.name);
        setConnectorTriggers(Array.isArray(triggers) ? triggers : []);
      } catch (error) {
        console.error('Failed to fetch connector triggers:', error);
        // Fallback to supported_triggers from connector metadata
        const fallbackTriggers = Array.isArray(connector.supported_triggers) ? connector.supported_triggers : [];
        setConnectorTriggers(fallbackTriggers.map((t: string | { id?: string; name?: string }) => typeof t === 'string' ? { id: t, name: t } : { id: t.id || t.name || '', name: t.name || t.id || '' }));
      }
      return;
    }
  }, [activeTab]);

  const handleActionSelect = useCallback((action: { id: string; name: string; description?: string; inputSchema?: Record<string, unknown> }) => {
    if (!selectedConnector) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const flowPosition = screenToFlowPosition({
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 200,
    });

    // Create node with proper data for dynamic rendering
    const newNode = {
      id: `${selectedConnector.name}_${action.id}_${Date.now()}`,
      type: NodeType.CONNECTOR_ACTION,
      position: flowPosition,
      data: {
        // Clean data that follows your existing node patterns
        label: action.name, // "Send Email", not "Gmail Send Email"
        description: action.description,
        
        // Store connector metadata for execution
        connectorType: selectedConnector.name,
        actionId: action.id,
        inputSchema: action.inputSchema,
        
        // Add icon information for proper rendering
        icon: getActionIconName(action.id, selectedConnector.name),
      },
    };

    // Helper function to get icon name
    function getActionIconName(actionId: string, connectorType: string): string {
      if (actionId.includes('send_email') || actionId.includes('send')) return 'Mail';
      if (actionId.includes('delete')) return 'Trash';
      if (actionId.includes('create')) return 'Plus';
      if (actionId.includes('update') || actionId.includes('edit')) return 'Edit';
      if (actionId.includes('get') || actionId.includes('read')) return 'Search';
      if (actionId.includes('label')) return 'Tag';
      if (actionId.includes('message')) return 'MessageSquare';
      
      // Default based on connector type
      if (connectorType === 'gmail') return 'Mail';
      if (connectorType === 'slack') return 'MessageSquare';
      if (connectorType === 'salesforce') return 'Target';
      
      return 'Zap';
    }

    setNodes((nds) => [...nds, newNode]);
    onClose();
    toast.success(`Added ${action.name}`);
  }, [selectedConnector, screenToFlowPosition, setNodes, onClose]);

  const handleTriggerSelect = useCallback((trigger: { id: string; name: string; description?: string; eventType?: string; icon?: string; inputSchema?: Record<string, unknown> }) => {
    if (!selectedTriggerConnector) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const flowPosition = screenToFlowPosition({
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 200,
    });

    // Create trigger node with proper data
    const newNode = createConnectorTriggerNode(selectedTriggerConnector, trigger, flowPosition);
    
    setNodes((nds) => [...nds, newNode]);
    onClose();
    toast.success(`Added ${trigger.name}`);
  }, [selectedTriggerConnector, screenToFlowPosition, setNodes, onClose]);

  const handleNodeSelect = useCallback(
    (selection: NodeTypeDefinition) => {
      // Check if trying to add a manual trigger when one already exists
      if (selection.type === NodeType.MANUAL_TRIGGER) {
        const nodes = getNodes();
        const hasManualTrigger = nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER);

        if (hasManualTrigger) {
          toast.error("Only one manual trigger is allowed per workflow");
          return;
        }
      }

      setNodes((nodes) => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const flowPosition = screenToFlowPosition({
          x: centerX + (Math.random() - 0.5) * 200,
          y: centerY + (Math.random() - 0.5) * 200,
        });

        // Get color based on category
        const getColorForCategory = () => {
          switch (selection.category) {
            case 'trigger':
              return '#06b6d4'; // cyan
            case 'action':
              return '#14b8a6'; // teal
            case 'control':
              return '#a855f7'; // purple
            default:
              return '#8b5cf6';
          }
        };

        // Get control type for control flow nodes
        const getControlType = () => {
          switch (selection.type) {
            case NodeType.IF_CONDITION:
              return 'if';
            case NodeType.SWITCH:
              return 'switch';
            case NodeType.FILTER:
              return 'filter';
            case NodeType.LOOP:
              return 'loop';
            case NodeType.WAIT:
              return 'wait';
            default:
              return undefined;
          }
        };

        const controlType = getControlType();

        // Get default values from node definition config fields
        const nodeDefinition = NODE_DEFINITIONS[selection.type];
        const defaultValues: Record<string, unknown> = {};

        if (nodeDefinition?.configFields) {
          nodeDefinition.configFields.forEach((field) => {
            if (field.defaultValue !== undefined) {
              defaultValues[field.name] = field.defaultValue;
            }
          });
        }

        const newNode = {
          id: `${selection.type}_${Date.now()}`,
          data: {
            label: selection.label,
            icon: selection.label.charAt(0), // Use first letter as icon placeholder
            color: getColorForCategory(),
            category: selection.category,
            description: selection.description,
            ...(controlType && { controlType }), // Add controlType for control flow nodes
            ...defaultValues, // Add default values from config fields
          },
          position: flowPosition,
          type: selection.type,
        };

        return [...nodes, newNode];
      });

      toast.success(`Added ${selection.label}`);
      onClose();
    },
    [setNodes, getNodes, onClose, screenToFlowPosition]
  );

  const filterNodes = (nodes: NodeTypeDefinition[]) => {
    // Get currently added node types
    const currentNodes = getNodes();
    const addedNodeTypes = new Set(currentNodes.map(n => n.type));

    // Only filter out MANUAL_TRIGGER if it already exists (single instance allowed)
    // All other nodes can be added multiple times
    let filtered = nodes.filter(node => {
      if (node.type === NodeType.MANUAL_TRIGGER) {
        return !addedNodeTypes.has(node.type);
      }
      return true; // Allow all other nodes to be added multiple times
    });

    // Apply search query filter
    if (searchQuery) {
      filtered = filtered.filter(
        (node) =>
          node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const renderNodeOption = (nodeType: NodeTypeDefinition) => {
    const Icon = nodeType.icon;

    return (
      <div
        key={nodeType.type}
        className="cursor-pointer hover:bg-white/10 transition-all rounded-lg p-3 border border-transparent hover:border-white/10"
        onClick={() => handleNodeSelect(nodeType)}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 bg-${nodeType.color}-500/20 rounded-lg flex-shrink-0`}>
            <Icon className={`size-5 text-${nodeType.color}-400`} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm text-white block">{nodeType.label}</span>
            <span className="text-xs text-gray-300 block mt-0.5 line-clamp-2">
              {nodeType.description}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryCard = (title: string, description: string, icon: React.ReactNode, count: number, categoryKey: string) => {
    // Determine the count label based on category
    let countLabel = `${count} apps available`;
    if (categoryKey === 'memory') {
      countLabel = `${count} memory options`;
    }

    return (
      <div
        className="cursor-pointer hover:bg-white/10 transition-all rounded-lg p-4 border border-transparent hover:border-white/10"
        onClick={() => handleCategorySelect(categoryKey)}
      >
        <div className="flex items-start gap-3">
          <div className="p-3 bg-blue-500/20 rounded-lg flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm text-white block">{title}</span>
            <span className="text-xs text-gray-300 block mt-0.5 line-clamp-2">
              {description}
            </span>
            <span className="text-xs text-blue-400 block mt-1">
              {countLabel}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[55]"
        onClick={onClose}
      />

      {/* Side Panel - starts below the header */}
      <div className="fixed right-0 top-[60px] h-[calc(100%-60px)] w-96 glass border-l border-white/10 z-[60] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Add Node</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded transition-colors text-gray-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search - hide when viewing connector actions/triggers */}
          {!selectedConnector && !selectedTriggerConnector && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <Input
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 mx-4 mt-2">
            <TabsTrigger
              value="triggers"
              className="data-[state=active]:bg-white/10 text-xs"
            >
              <Zap className="size-3 mr-1" />
              Triggers
            </TabsTrigger>
            <TabsTrigger
              value="actions"
              className="data-[state=active]:bg-white/10 text-xs"
            >
              <Cog className="size-3 mr-1" />
              Actions
            </TabsTrigger>
            <TabsTrigger
              value="control"
              className="data-[state=active]:bg-white/10 text-xs"
            >
              <GitBranch className="size-3 mr-1" />
              Control
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <TabsContent value="triggers" className="mt-0 space-y-4">
              {/* Trigger Selection View - Similar to Actions */}
              {isLoadingConnectors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 text-white/50 animate-spin" />
                  <span className="ml-2 text-white/50">Loading connectors...</span>
                </div>
              ) : selectedTriggerConnector !== null ? (
                <>
                  {/* Trigger Selection View */}
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => setSelectedTriggerConnector(null)}
                      className="p-1 hover:bg-white/10 rounded transition-colors text-gray-300 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-sm font-medium text-white">{selectedTriggerConnector.display_name}</h3>
                  </div>

                  {/* Search Triggers */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <Input
                      placeholder={`Search ${selectedTriggerConnector.display_name} Triggers...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                    />
                  </div>

                  {/* Triggers Count */}
                  <div className="flex items-center gap-2 mb-4">
                    <h4 className="text-sm text-white/60">
                      Triggers ({Array.isArray(connectorTriggers) ? connectorTriggers.filter(trigger => 
                        trigger?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        trigger?.description?.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length : 0})
                    </h4>
                  </div>

                  {/* Triggers List */}
                  <div className="space-y-1">
                    {Array.isArray(connectorTriggers) && connectorTriggers
                      .filter(trigger =>
                        trigger?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        trigger?.description?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((trigger) => (
                        <div
                          key={trigger.id}
                          className="cursor-pointer hover:bg-white/10 transition-all rounded-lg p-3 border border-transparent hover:border-white/10"
                          onClick={() => handleTriggerSelect(trigger)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white rounded-lg flex-shrink-0 overflow-hidden">
                              {selectedTriggerConnector && hasConnectorIcon(selectedTriggerConnector.name) ? (
                                <img
                                  src={getConnectorIconPath(selectedTriggerConnector.name)}
                                  alt={selectedTriggerConnector.display_name}
                                  className="size-5 object-contain"
                                />
                              ) : (
                                <Zap className="size-5 text-cyan-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-sm text-white block">
                                {trigger.name}
                              </span>
                              <span className="text-xs text-gray-300 block mt-0.5 line-clamp-2">
                                {trigger.description}
                              </span>
                              {trigger.eventType && (
                                <div className="flex gap-1 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {trigger.eventType}
                                  </Badge>
                                  {trigger.webhookRequired && (
                                    <Badge variant="secondary" className="text-xs">
                                      Webhook
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              ) : selectedCategory === null ? (
                <>
                  {/* Category Selection View */}
                  {!isLoadingConnectors && availableConnectors.filter(c => c.webhook_support || c.supported_triggers?.length > 0).length > 0 && (
                    <>
                      <div className="space-y-2">
                        {renderCategoryCard(
                          "App Events",
                          "Trigger workflows when events happen in your connected apps",
                          <Zap className="size-6 text-cyan-400" />,
                          availableConnectors.filter(c => c.webhook_support || c.supported_triggers?.length > 0).length,
                          "app-events"
                        )}
                      </div>
                      <Separator className="my-4 bg-white/20" />
                    </>
                  )}

                  {/* Built-in Triggers */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">
                      Built-in Triggers
                    </h3>
                    <div className="space-y-1">
                      {filterNodes(triggerNodes).map(renderNodeOption)}
                    </div>
                  </div>
                </>
              ) : selectedCategory === "app-events" ? (
                <>
                  {/* Back Button */}
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={handleBackToCategories}
                      className="p-1 hover:bg-white/10 rounded transition-colors text-gray-300 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-sm font-medium text-white">App Events</h3>
                  </div>

                  {/* App Events List */}
                  <div className="space-y-1">
                    {availableConnectors
                      .filter(c => c.webhook_support || c.supported_triggers?.length > 0)
                      .filter(c =>
                        c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.description.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((connector) => (
                        <div
                          key={connector.id + '-trigger'}
                          className="cursor-pointer hover:bg-white/10 transition-all rounded-lg p-3 border border-transparent hover:border-white/10"
                          onClick={() => handleConnectorSelect(connector)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white rounded-lg flex-shrink-0 overflow-hidden">
                              {hasConnectorIcon(connector.name) ? (
                                <img
                                  src={getConnectorIconPath(connector.name)}
                                  alt={connector.display_name}
                                  className="size-5 object-contain"
                                />
                              ) : (
                                <Zap className="size-5 text-cyan-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-sm text-white">
                                  {connector.display_name}
                                </span>
                                {connector.verified && (
                                  <span title="Verified connector">
                                    <CheckCircle className="size-3.5 text-green-500 flex-shrink-0" />
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-300 block mt-0.5 line-clamp-2">
                                Trigger when events occur in {connector.display_name}
                              </span>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {Array.isArray(connector.supported_triggers) && connector.supported_triggers.slice(0, 3).map((trigger: string | { name?: string }, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {typeof trigger === 'string' ? trigger : (trigger?.name || 'Trigger')}
                                  </Badge>
                                ))}
                                {Array.isArray(connector.supported_triggers) && connector.supported_triggers.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{connector.supported_triggers.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              ) : null}
            </TabsContent>

            <TabsContent value="actions" className="mt-0 space-y-4">
              {/* Available Connectors */}
              {isLoadingConnectors ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 text-white/50 animate-spin" />
                  <span className="ml-2 text-white/50">Loading connectors...</span>
                </div>
              ) : selectedConnector !== null ? (
                <>
                  {/* Action Selection View - Like n8n Gmail */}
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => setSelectedConnector(null)}
                      className="p-1 hover:bg-white/10 rounded transition-colors text-gray-300 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-sm font-medium text-white">{selectedConnector.display_name}</h3>
                  </div>

                  {/* Search Actions */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <Input
                      placeholder={`Search ${selectedConnector.display_name} Actions...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                    />
                  </div>

                  {/* Actions Count */}
                  <div className="flex items-center gap-2 mb-4">
                    <h4 className="text-sm text-white/60">
                      Actions ({Array.isArray(connectorActions) ? connectorActions.filter(action => 
                        action?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        action?.description?.toLowerCase().includes(searchQuery.toLowerCase())
                      ).length : 0})
                    </h4>
                  </div>

                  {/* Actions List - Grouped by Category */}
                  <div className="space-y-4">
                    {Array.isArray(connectorActions) && Object.entries(
                      connectorActions
                        .filter(action =>
                          action?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          action?.description?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .reduce((acc, action) => {
                          const category = action.category || 'OTHER';
                          if (!acc[category]) acc[category] = [];
                          acc[category].push(action);
                          return acc;
                        }, {} as Record<string, typeof connectorActions>)
                    ).map(([category, actions]) => (
                      <div key={category} className="space-y-2">
                        <h5 className="text-xs font-medium text-white/60 uppercase tracking-wider">
                          {category}
                        </h5>
                        <div className="space-y-1">
                          {actions.map((action) => (
                            <div
                              key={action.id}
                              className="cursor-pointer hover:bg-white/10 transition-all rounded-lg p-3 border border-transparent hover:border-white/10"
                              onClick={() => handleActionSelect(action)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-white rounded-lg flex-shrink-0 overflow-hidden">
                                  {hasConnectorIcon(selectedConnector.name) ? (
                                    <img
                                      src={getConnectorIconPath(selectedConnector.name)}
                                      alt={selectedConnector.display_name}
                                      className="size-5 object-contain"
                                    />
                                  ) : selectedConnector.name === 'gmail' ? (
                                    <Mail className="size-5 text-teal-400" />
                                  ) : selectedConnector.name === 'slack' ? (
                                    <MessageSquare className="size-5 text-teal-400" />
                                  ) : (
                                    <Database className="size-5 text-teal-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-sm text-white block">
                                    {action.name}
                                  </span>
                                  <span className="text-xs text-gray-300 block mt-0.5 line-clamp-2">
                                    {action.description}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : selectedCategory === null ? (
                <>
                  {/* AI Section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">
                      AI
                    </h3>
                    <div className="space-y-1">
                      {filterNodes(actionNodes.filter(node =>
                        node.type === NodeType.AI_AGENT ||
                        node.type === NodeType.OPENAI_CHAT_MODEL
                      )).map(renderNodeOption)}
                    </div>
                  </div>

                  <Separator className="my-4 bg-white/20" />

                  {/* Built-in Actions */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium text-white/60 uppercase tracking-wider">
                      Built-in Actions
                    </h3>
                    <div className="space-y-1">
                      {filterNodes(actionNodes.filter(node =>
                        node.type !== NodeType.AI_AGENT &&
                        node.type !== NodeType.OPENAI_CHAT_MODEL &&
                        node.type !== NodeType.SIMPLE_MEMORY &&
                        node.type !== NodeType.REDIS_MEMORY &&
                        // Exclude AI Agent tools (available through App Actions)
                        node.type !== NodeType.GMAIL_TOOL &&
                        node.type !== NodeType.SLACK_TOOL &&
                        node.type !== NodeType.TELEGRAM_TOOL &&
                        node.type !== NodeType.DISCORD_TOOL &&
                        node.type !== NodeType.TEAMS_TOOL
                      )).map(renderNodeOption)}
                    </div>
                  </div>

                  <Separator className="my-4 bg-white/20" />

                  {/* Memory Category Card */}
                  <div className="space-y-2">
                    {renderCategoryCard(
                      "Memory",
                      "Add persistent memory to store conversation history and context",
                      <Database className="size-6 text-purple-400" />,
                      actionNodes.filter(node =>
                        node.type === NodeType.SIMPLE_MEMORY ||
                        node.type === NodeType.REDIS_MEMORY
                      ).length,
                      "memory"
                    )}
                  </div>

                  {/* App Actions Category Card */}
                  {availableConnectors.length > 0 && (
                    <>
                      <Separator className="my-4 bg-white/20" />
                      <div className="space-y-2">
                        {renderCategoryCard(
                          "App Actions",
                          "Perform actions in your connected apps when workflows run",
                          <Cog className="size-6 text-teal-400" />,
                          availableConnectors.length,
                          "app-actions"
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : selectedCategory === "memory" ? (
                <>
                  {/* Back Button */}
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={handleBackToCategories}
                      className="p-1 hover:bg-white/10 rounded transition-colors text-gray-300 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-sm font-medium text-white">Memory</h3>
                  </div>

                  {/* Search Memory */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <Input
                      placeholder="Search memory options..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                    />
                  </div>

                  {/* Memory Options List */}
                  <div className="space-y-1">
                    {filterNodes(actionNodes.filter(node =>
                      node.type === NodeType.SIMPLE_MEMORY ||
                      node.type === NodeType.REDIS_MEMORY
                    )).map(renderNodeOption)}
                  </div>
                </>
              ) : selectedCategory === "app-actions" ? (
                <>
                  {/* Back Button */}
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={handleBackToCategories}
                      className="p-1 hover:bg-white/10 rounded transition-colors text-gray-300 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-sm font-medium text-white">App Actions</h3>
                  </div>

                  {/* App Actions List */}
                  <div className="space-y-1">
                    {availableConnectors
                      .filter(c =>
                        c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.description.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((connector) => (
                        <div
                          key={connector.id}
                          className="cursor-pointer hover:bg-white/10 transition-all rounded-lg p-3 border border-transparent hover:border-white/10"
                          onClick={() => handleConnectorSelect(connector)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white rounded-lg flex-shrink-0 overflow-hidden">
                              {hasConnectorIcon(connector.name) ? (
                                <img
                                  src={getConnectorIconPath(connector.name)}
                                  alt={connector.display_name}
                                  className="size-5 object-contain"
                                />
                              ) : (
                                <Cog className="size-5 text-teal-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-sm text-white">
                                  {connector.display_name}
                                </span>
                                {connector.verified && (
                                  <span title="Verified connector">
                                    <CheckCircle className="size-3.5 text-green-500 flex-shrink-0" />
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-300 block mt-0.5 line-clamp-2">
                                {connector.description}
                              </span>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {Array.isArray(connector.supported_actions) && connector.supported_actions.slice(0, 3).map((action: string | { name?: string }, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {typeof action === 'string' ? action.replace(/_/g, ' ') : (action?.name || 'Action')}
                                  </Badge>
                                ))}
                                {Array.isArray(connector.supported_actions) && connector.supported_actions.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{connector.supported_actions.length - 3} more
                                  </Badge>
                                )}
                                {(!connector.supported_actions || !Array.isArray(connector.supported_actions) || connector.supported_actions.length === 0) && (
                                  <Badge variant="secondary" className="text-xs">
                                    {connector.auth_type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              ) : null}
            </TabsContent>

            <TabsContent value="control" className="mt-0 space-y-2">
              {filterNodes(controlNodes).map(renderNodeOption)}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </>
  );
}
