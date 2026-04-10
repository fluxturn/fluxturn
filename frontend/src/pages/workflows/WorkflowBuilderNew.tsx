import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from 'sonner';
import { DynamicNodeConfigModal } from '@/components/workflow/dialogs/DynamicNodeConfigModal';
import { FormTestModal } from '@/components/workflow/dialogs/FormTestModal';
import { SaveAsTemplateModal } from '@/components/workflow/dialogs/SaveAsTemplateModal';
import { NodeType } from '@/config/workflow';
import { TopHeader } from '@/components/workflow/TopHeader';
import { LeftSidebar } from '@/components/workflow/LeftSidebar';
import { NodeSelectorPanel } from '@/components/workflow/NodeSelectorPanel';
import { LogEntry } from '@/components/workflow/BottomPanel';
import type { DatabaseNodeInfo } from '@/components/workflow/database';
import { AIPromptPanel } from '@/components/workflow/AIPromptPanel';
import { NodeDetailsPanel } from '@/components/workflow/panels/NodeDetailsPanel';
import { ExecutionsTab } from '@/components/workflow/tabs/ExecutionsTab';
import { TemplatesTab } from '@/components/workflow/tabs/TemplatesTab';
import { EditorTab } from '@/components/workflow/tabs/EditorTab';
import { api } from '@/lib/api';
import { WorkflowAPI } from '@/lib/fluxturn';
import { useWebSocket } from '@/hooks/use-websocket';
import { useRoles } from '@/hooks/useRoles';
import { extractRouteContext, servicePaths } from '@/lib/navigation-utils';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const WorkflowBuilderInner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const params = useParams();
  const context = extractRouteContext(params);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Initialize activeTab from URL params or default to "editor"
  const tabFromUrl = searchParams.get('tab') as "editor" | "executions" | "templates" | null;
  const [activeTab, setActiveTabState] = useState<"editor" | "executions" | "templates">(
    (tabFromUrl && ['editor', 'executions', 'templates'].includes(tabFromUrl)) ? tabFromUrl : "editor"
  );

  // Wrapper to update both state and URL
  const setActiveTab = useCallback((tab: "editor" | "executions" | "templates") => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [nodeSelectorOpen, setNodeSelectorOpen] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<NodeType | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState("My workflow");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [executionResult, setExecutionResult] = useState<Record<string, unknown> | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [formTestModalOpen, setFormTestModalOpen] = useState(false);
  const [formTriggerConfig, setFormTriggerConfig] = useState<Record<string, unknown> | null>(null);
  const [isWorkflowActive, setIsWorkflowActive] = useState(false);
  const [showNodeDetails, setShowNodeDetails] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<LogEntry[]>([]);
  const [selectedNodeForData, setSelectedNodeForData] = useState<Node | null>(null);
  const [saveAsTemplateModalOpen, setSaveAsTemplateModalOpen] = useState(false);
  const [aiWorkflowPrompt, setAiWorkflowPrompt] = useState<string | null>(null);
  const [executedDatabaseNodes, setExecutedDatabaseNodes] = useState<DatabaseNodeInfo[]>([]);
  const { screenToFlowPosition } = useReactFlow();
  const loadedWorkflowRef = React.useRef<string | null>(null);
  const { socket } = useWebSocket();
  const currentExecutionIdRef = React.useRef<string | null>(null);
  const isExecutingRef = React.useRef<boolean>(false);
  const executionResetTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = React.useRef<boolean>(false);

  // Helper to set executing flag with debounced reset
  const setExecutingWithReset = () => {
    isExecutingRef.current = true;
    // Clear any existing timer
    if (executionResetTimerRef.current) {
      clearTimeout(executionResetTimerRef.current);
    }
    // Reset flag after 500ms of no activity
    executionResetTimerRef.current = setTimeout(() => {
      isExecutingRef.current = false;
    }, 500);
  };

  // Sync tab with URL on mount
  useEffect(() => {
    if (!searchParams.get('tab')) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, []); // Only run on mount

  // Handle OAuth callback success/error on workflow editor
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const email = searchParams.get('email');
    const credentialId = searchParams.get('credentialId');

    if (success === 'true') {
      toast.success(`Successfully connected to Google${email ? ` as ${email}` : ''}!`, {
        description: 'Your credential is ready to use in this workflow.',
        duration: 5000,
      });

      // Apply credential to pending node if there is one
      const pendingNodeId = sessionStorage.getItem('oauth_pending_node_id');
      if (pendingNodeId && credentialId) {
        // console.log('Applying credential', credentialId, 'to node', pendingNodeId);

        // Update the node data to include the credentialId
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === pendingNodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  credentialId: credentialId,
                },
              };
            }
            return node;
          })
        );

        // Clean up sessionStorage
        sessionStorage.removeItem('oauth_pending_node_id');
        // console.log('Successfully applied credential to node');
      }

      // Clean URL parameters
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('success');
      newSearchParams.delete('email');
      newSearchParams.delete('credentialId');
      setSearchParams(newSearchParams, { replace: true });
    } else if (error) {
      toast.error('OAuth connection failed', {
        description: decodeURIComponent(error),
        duration: 7000,
      });

      // Clean up sessionStorage on error too
      sessionStorage.removeItem('oauth_pending_node_id');

      // Clean URL parameters
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('error');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, []); // Only run on mount

  // Handle auto-trigger AI generation from landing page
  const autoGenerateTriggeredRef = React.useRef(false);

  useEffect(() => {
    // Only trigger once and when initial load is complete
    if (autoGenerateTriggeredRef.current) return;

    const shouldAutoGenerate = searchParams.get('ai-generate') === 'true';

    if (shouldAutoGenerate) {
      const PENDING_PROMPT_KEY = 'fluxturn_pending_ai_prompt';
      const pendingPrompt = sessionStorage.getItem(PENDING_PROMPT_KEY);

      if (pendingPrompt) {
        autoGenerateTriggeredRef.current = true;
        sessionStorage.removeItem(PENDING_PROMPT_KEY);

        // Clean URL first
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('ai-generate');
        setSearchParams(newSearchParams, { replace: true });

        // Wait for component to be ready, then open AI panel and trigger generation
        setTimeout(() => {
          setAiPromptOpen(true);
          // Give the panel time to open before triggering
          setTimeout(() => {
            handleGenerateWorkflow(pendingPrompt);
          }, 300);
        }, 500);
      }
    }
  }, [searchParams]); // Re-check when searchParams change

  // Listen to node execution WebSocket events
  useEffect(() => {
    if (!socket) return;

    const handleNodeExecutionStarted = (data: { nodeId: string; nodeName?: string; inputData?: unknown; startTime?: string }) => {
      // console.log('Node execution started:', data);
      setExecutingWithReset(); // Prevent unsaved changes during WebSocket updates
      const { nodeId, nodeName, inputData, startTime } = data;

      // Add log entry for node execution start
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      const inputCount = Array.isArray(inputData) ? inputData.length : inputData ? 1 : 0;

      setExecutionLogs(prev => [...prev, {
        time: timestamp,
        message: `▶ ${nodeName || nodeId} - Starting (${inputCount} input item${inputCount !== 1 ? 's' : ''})`,
        type: 'info'
      }]);

      // Update node status to loading and store input data
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                status: 'loading',
                inputData: inputData,
                startTime: startTime,
              }
            };
          }
          return node;
        })
      );
    };

    const handleNodeExecutionCompleted = (data: { nodeId: string; nodeName?: string; result?: Record<string, unknown>; inputData?: unknown; outputData?: unknown; executionTime?: number }) => {
      // console.log('Node execution completed:', data);
      setExecutingWithReset(); // Prevent unsaved changes during WebSocket updates
      const { nodeId, nodeName, result, inputData, outputData, executionTime } = data;

      // Add log entry for node execution completion
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      const output = outputData || result?.outputData || result?.data;
      const outputCount = output?.[0] ? output[0].length : output ? 1 : 0;

      setExecutionLogs(prev => [...prev, {
        time: timestamp,
        message: `✓ ${nodeName || nodeId} - Success (${outputCount} output item${outputCount !== 1 ? 's' : ''}) ${executionTime ? `[${executionTime}ms]` : ''}`,
        type: 'success'
      }]);

      // Update node status to success and store input/output data
      setNodes((currentNodes) => {
        // Check if this is a database node (MySQL or PostgreSQL)
        const node = currentNodes.find(n => n.id === nodeId);
        const connectorType = node?.data?.connectorType;
        const credentialId = node?.data?.credentialId;

        if ((connectorType === 'mysql' || connectorType === 'postgresql') && credentialId) {
          // Add to executed database nodes
          setExecutedDatabaseNodes(prev => {
            // Remove any existing entry for this node and add the new one
            const filtered = prev.filter(n => n.nodeId !== nodeId);
            return [...filtered, {
              nodeId,
              nodeName: nodeName || node?.data?.label || nodeId,
              credentialId: credentialId as string,
              connectorType: connectorType as 'mysql' | 'postgresql'
            }];
          });
        }

        return currentNodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                status: 'success',
                error: undefined,
                inputData: inputData || node.data.inputData,
                outputData: outputData || result?.outputData || result?.data,
                lastResult: outputData || result?.outputData || result?.data,
                executionTime: executionTime,
                lastExecutedAt: new Date().toISOString(),
              }
            };
          }
          return node;
        });
      });
    };

    const handleNodeExecutionFailed = (data: { nodeId: string; nodeName?: string; error?: { message?: string }; inputData?: unknown; executionTime?: number }) => {
      // console.log('Node execution failed:', data);
      setExecutingWithReset(); // Prevent unsaved changes during WebSocket updates
      const { nodeId, nodeName, error, inputData, executionTime } = data;

      // Add log entry for node execution failure
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

      setExecutionLogs(prev => [...prev, {
        time: timestamp,
        message: `✗ ${nodeName || nodeId} - Failed: ${error?.message || 'Unknown error'}`,
        type: 'error'
      }]);

      // Update node status to error and preserve input data
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                status: 'error',
                error: error?.message || 'Execution failed',
                inputData: inputData || node.data.inputData,
                executionTime: executionTime,
              }
            };
          }
          return node;
        })
      );
    };

    // Register event listeners
    socket.on('node:execution:started', handleNodeExecutionStarted);
    socket.on('node:execution:completed', handleNodeExecutionCompleted);
    socket.on('node:execution:failed', handleNodeExecutionFailed);

    // Cleanup listeners on unmount
    return () => {
      socket.off('node:execution:started', handleNodeExecutionStarted);
      socket.off('node:execution:completed', handleNodeExecutionCompleted);
      socket.off('node:execution:failed', handleNodeExecutionFailed);
    };
  }, [socket, setNodes]);

  // Handle paste event for JSON import
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle paste if no input/textarea is focused
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      const text = e.clipboardData?.getData('text');
      if (!text) return;

      try {
        // Try to parse as JSON
        const data = JSON.parse(text);
        
        // Check if it looks like a workflow
        if (data.workflow?.canvas?.nodes && data.workflow?.canvas?.edges) {
          e.preventDefault();
          
          // Ask for confirmation
          if (confirm('Detected workflow JSON in clipboard. Do you want to import it?')) {
            setWorkflowName(data.name || 'Imported Workflow');
            setNodes(data.workflow.canvas.nodes);
            // Normalize imported edges for consistent styling
            setEdges(data.workflow.canvas.edges.map((edge: Edge) => normalizeEdge(edge)));
            setHasUnsavedChanges(true);

            toast.success('Workflow imported from clipboard');
          }
        }
      } catch {
        // Not valid JSON or not a workflow, ignore
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [setNodes, setEdges]);

  // Handle OAuth workflow auto-save
  useEffect(() => {
    // Listen for OAuth save request - auto-save workflow before OAuth
    const handleRequestWorkflowSave = async (_event: Event) => {
      // console.log('🔔 Received oauth:request-workflow-save event');

      try {
        // Check if there are nodes to save
        if (nodes.length === 0) {
          // console.log('⚠️ No nodes to save, skipping workflow save');
          return;
        }

        // console.log('💾 Auto-saving workflow before OAuth...');

        // Prepare workflow data (same logic as handleSaveWorkflow)
        const triggers = nodes
          .filter(node => node.type && node.type.toLowerCase().includes('trigger'))
          .map(node => ({
            id: node.id,
            type: node.type,
            config: node.data || {},
          }));

        const steps = nodes
          .filter(node => node.type && !node.type.toLowerCase().includes('trigger') && node.type !== 'note')
          .map(node => ({
            id: node.id,
            connector: node.type,
            action: node.data?.action || 'execute',
            params: node.data || {},
          }));

        const workflowData = {
          name: workflowName || 'Untitled Workflow',
          description: `Workflow with ${nodes.length} nodes`,
          workflow: {
            triggers: triggers.length > 0 ? triggers : [],
            steps: steps.length > 0 ? steps : [],
            conditions: [],
            variables: [],
            outputs: [],
            canvas: {
              nodes: nodes.map(node => ({
                id: node.id,
                type: node.type,
                position: node.position,
                data: node.data || {},
                width: node.width,
                height: node.height,
                selected: node.selected,
                dragging: node.dragging,
              })),
              edges: edges.map(edge => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
                type: edge.type,
                animated: edge.animated,
                style: edge.style,
                markerEnd: edge.markerEnd,
              })),
            },
          },
        };

        let response;
        let savedWorkflowId = workflowId;

        if (workflowId) {
          // Update existing workflow
          // console.log('Updating existing workflow:', workflowId);
          response = await WorkflowAPI.updateWorkflow(
            workflowId,
            workflowData,
            context.organizationId,
            context.projectId
          );
        } else {
          // Create new workflow
          // console.log('Creating new workflow for OAuth');
          response = await WorkflowAPI.createWorkflow(
            workflowData,
            context.organizationId,
            context.projectId
          );
          savedWorkflowId = response.id;
          setWorkflowId(response.id);

          // Update browser URL to include the new workflow ID
          const currentPath = window.location.pathname;
          const basePath = `/org/${context.organizationId}/project/${context.projectId}/workflows`;
          if (currentPath === basePath) {
            window.history.replaceState({}, '', `${basePath}/${response.id}${window.location.search}`);
          }
        }

        // Store the workflow ID for the OAuth flow to use
        sessionStorage.setItem('oauth_workflow_id', savedWorkflowId);

        // Update the return URL to include the workflow ID
        const returnUrl = `/org/${context.organizationId}/project/${context.projectId}/workflows/${savedWorkflowId}${window.location.search}`;
        sessionStorage.setItem('oauth_return_url', returnUrl);

        // console.log('✅ Workflow saved successfully for OAuth:', savedWorkflowId);

        setHasUnsavedChanges(false);
      } catch (err: unknown) {
        console.error('❌ Failed to save workflow before OAuth:', err);
        toast.error('Could not save workflow: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };

    // console.log('📡 Setting up oauth:request-workflow-save listener');
    window.addEventListener('oauth:request-workflow-save', handleRequestWorkflowSave);
    return () => {
      // console.log('🔌 Removing oauth:request-workflow-save listener');
      window.removeEventListener('oauth:request-workflow-save', handleRequestWorkflowSave);
    };
  }, [nodes, edges, workflowName, workflowId, context]);

  // Handle node execution workflow auto-save
  useEffect(() => {
    // Listen for node execution save request - auto-save workflow before executing node
    const handleRequestNodeExecutionSave = async (_event: Event) => {
      // console.log('🔔 Received node-execution:request-workflow-save event');

      try {
        // Check if there are nodes to save
        if (nodes.length === 0) {
          // console.log('⚠️ No nodes to save, skipping workflow save');
          // Emit failure event
          window.dispatchEvent(new CustomEvent('node-execution:workflow-save-failed', {
            detail: { error: 'No nodes to save' }
          }));
          return;
        }

        // console.log('💾 Auto-saving workflow before node execution...');

        // Prepare workflow data (same logic as handleSaveWorkflow)
        const triggers = nodes
          .filter(node => node.type && node.type.toLowerCase().includes('trigger'))
          .map(node => ({
            id: node.id,
            type: node.type,
            config: node.data || {},
          }));

        const steps = nodes
          .filter(node => node.type && !node.type.toLowerCase().includes('trigger') && node.type !== 'note')
          .map(node => ({
            id: node.id,
            connector: node.type,
            action: node.data?.action || 'execute',
            params: node.data || {},
          }));

        const workflowData = {
          name: workflowName || 'Untitled Workflow',
          description: `Workflow with ${nodes.length} nodes`,
          template_id: templateId, // Include template ID if created from template
          workflow: {
            triggers: triggers.length > 0 ? triggers : [],
            steps: steps.length > 0 ? steps : [],
            conditions: [],
            variables: [],
            outputs: [],
            canvas: {
              nodes: nodes.map(node => ({
                id: node.id,
                type: node.type,
                position: node.position,
                data: node.data || {},
                width: node.width,
                height: node.height,
                selected: node.selected,
                dragging: node.dragging,
              })),
              edges: edges.map(edge => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
                type: edge.type,
                animated: edge.animated,
                style: edge.style,
                markerEnd: edge.markerEnd,
              })),
            },
          },
        };

        let response;
        let savedWorkflowId = workflowId;

        if (workflowId) {
          // Update existing workflow
          // console.log('Updating existing workflow:', workflowId);
          response = await WorkflowAPI.updateWorkflow(
            workflowId,
            workflowData,
            context.organizationId,
            context.projectId
          );
        } else {
          // Create new workflow
          // console.log('Creating new workflow for node execution');
          response = await WorkflowAPI.createWorkflow(
            workflowData,
            context.organizationId,
            context.projectId
          );
          savedWorkflowId = response.id;
          setWorkflowId(response.id);

          // Update browser URL to include the new workflow ID
          const currentPath = window.location.pathname;
          const basePath = `/org/${context.organizationId}/project/${context.projectId}/workflows`;
          if (currentPath === basePath) {
            window.history.replaceState({}, '', `${basePath}/${response.id}${window.location.search}`);
          }
        }

        // console.log('✅ Workflow saved successfully for node execution:', savedWorkflowId);

        setHasUnsavedChanges(false);

        // Emit success event with workflow ID
        window.dispatchEvent(new CustomEvent('node-execution:workflow-save-complete', {
          detail: { workflowId: savedWorkflowId }
        }));
      } catch (err: unknown) {
        console.error('❌ Failed to save workflow before node execution:', err);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        toast.error('Could not save workflow: ' + errMsg);

        // Emit failure event
        window.dispatchEvent(new CustomEvent('node-execution:workflow-save-failed', {
          detail: { error: errMsg }
        }));
      }
    };

    // console.log('📡 Setting up node-execution:request-workflow-save listener');
    window.addEventListener('node-execution:request-workflow-save', handleRequestNodeExecutionSave);
    return () => {
      // console.log('🔌 Removing node-execution:request-workflow-save listener');
      window.removeEventListener('node-execution:request-workflow-save', handleRequestNodeExecutionSave);
    };
  }, [nodes, edges, workflowName, workflowId, templateId, context]);

  // Load workflow from URL parameter or reset for new workflow
  useEffect(() => {
    const loadWorkflow = async () => {
      setInitialLoadComplete(false);

      // Check if we're returning from OAuth and have saved state
      const savedState = sessionStorage.getItem('oauth_workflow_state');
      // console.log('🔍 Checking for saved workflow state:', savedState ? 'Found' : 'Not found');

      if (savedState) {
        try {
          const state = JSON.parse(savedState);

          // Check if state is recent (within last 10 minutes)
          const ageMinutes = (Date.now() - state.timestamp) / 1000 / 60;
          const isRecent = ageMinutes < 10;

          if (isRecent) {

            setNodes(state.nodes || []);
            setEdges(state.edges || []);
            setWorkflowName(state.workflowName || 'My workflow');
            setWorkflowId(state.workflowId || null);
            setHasUnsavedChanges(true); // Mark as unsaved since we restored state

            // Clear the saved state
            sessionStorage.removeItem('oauth_workflow_state');

            setInitialLoadComplete(true);
            setIsLoading(false);

            toast.success('Workflow restored after credential creation');
            return;
          } else {
            // State is too old, remove it
            // console.log('⚠️ State is too old, removing');
            sessionStorage.removeItem('oauth_workflow_state');
          }
        } catch (err) {
          console.error('❌ Failed to restore workflow state:', err);
          sessionStorage.removeItem('oauth_workflow_state');
        }
      }

      if (!id) {
        // No ID in URL, reset to create a new workflow
        // console.log('Creating new workflow from scratch');
        setWorkflowId(null);
        setWorkflowName('My workflow');
        setNodes([]);
        setEdges([]);
        setHasUnsavedChanges(false);
        setInitialLoadComplete(true);
        return;
      }

      try {
        setIsLoading(true);
        // console.log('Loading workflow:', id);

        const workflow = await WorkflowAPI.getWorkflow(
          id,
          context.organizationId,
          context.projectId
        );

        // console.log('=== Workflow Loaded Successfully ===');
        // console.log('Workflow ID:', workflow.id);
        // console.log('Workflow Name:', workflow.name);
        // console.log('Workflow Data:', workflow.workflow);

        // Set workflow metadata
        setWorkflowId(workflow.id);
        setWorkflowName(workflow.name || 'My workflow');
        setIsWorkflowActive(workflow.status === 'active');

        // Load nodes and edges from canvas data if available
        isLoadingRef.current = true; // Prevent unsaved changes detection during load
        if (workflow.workflow?.canvas) {
          const loadedNodes = workflow.workflow.canvas.nodes || [];
          const loadedEdges = workflow.workflow.canvas.edges || [];

          // console.log('Loading', loadedNodes.length, 'nodes and', loadedEdges.length, 'edges');
          // console.log('Nodes data:', loadedNodes);
          // console.log('Edges data:', loadedEdges);

          // Normalize loaded edges to ensure consistent styling
          const normalizedEdges = loadedEdges.map((edge: Edge) => normalizeEdge(edge));

          setNodes(loadedNodes);
          setEdges(normalizedEdges);
        } else {
          // console.log('No canvas data found, starting with empty canvas');
          setNodes([]);
          setEdges([]);
        }

        setHasUnsavedChanges(false);

        // Only show toast if this workflow hasn't been loaded yet (prevents duplicate toasts in StrictMode)
        if (loadedWorkflowRef.current !== workflow.id) {
          loadedWorkflowRef.current = workflow.id;
          toast.success('Workflow loaded successfully');
        }
      } catch (error: unknown) {
        console.error('Failed to load workflow:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load workflow');
      } finally {
        setIsLoading(false);
        setInitialLoadComplete(true);
        // Reset loading flag after React has processed all state updates
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 100);
      }
    };

    loadWorkflow();
  }, [id, setNodes, setEdges]);

  // Track changes to nodes and edges
  useEffect(() => {
    // Only track changes after initial load is complete
    if (!initialLoadComplete) return;

    // Skip tracking changes during workflow loading
    if (isLoadingRef.current) return;

    // Skip tracking changes during workflow execution (status updates, output data, etc.)
    if (isExecutingRef.current) return;

    // Mark as changed when nodes or edges are modified
    // console.log('Changes detected - enabling save button');
    setHasUnsavedChanges(true);
  }, [nodes, edges, initialLoadComplete]);

  // Utility function to normalize edge styling
  const normalizeEdge = (edge: Edge | Connection) => {
    return {
      ...edge,
      type: edge.type || 'default',
      animated: true, // Always animate
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#06b6d4', // cyan-500
      },
      style: {
        strokeWidth: 2,
        stroke: '#06b6d4', // cyan-500
      },
    };
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = normalizeEdge(params);
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Don't open config for notes
    if (node.type === 'note') return;

    // Only process if node still exists
    const currentNode = nodes.find(n => n.id === node.id);
    if (!currentNode) return;

    // Single click: Show node data in bottom panel (n8n style)
    setSelectedNodeId(node.id);
    setSelectedNodeForData(currentNode);
  }, [nodes]);

  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Don't open config for notes - they handle their own double-click
    if (node.type === 'note') return;

    // Only open config if node still exists
    const currentNode = nodes.find(n => n.id === node.id);
    if (!currentNode) return;

    // Open modal for all nodes
    setSelectedNodeId(node.id);
    setSelectedNodeType(node.type as NodeType);
    setConfigModalOpen(true);
  }, [nodes]);

  const handleSaveWorkflow = async () => {
    try {
      // console.log('=== Save Workflow Button Clicked ===');

      // Transform React Flow nodes to backend workflow format
      const triggers = nodes
        .filter(node => node.type && node.type.toLowerCase().includes('trigger'))
        .map(node => ({
          id: node.id,
          type: node.type,
          config: node.data || {},
        }));

      const steps = nodes
        .filter(node => node.type && !node.type.toLowerCase().includes('trigger') && node.type !== 'note')
        .map(node => ({
          id: node.id,
          connector: node.type,
          action: node.data?.action || 'execute',
          params: node.data || {},
        }));

      const workflowData = {
        name: workflowName,
        description: `Workflow with ${nodes.length} nodes`,
        template_id: templateId, // Include template ID if created from template
        is_ai_generated: !!aiWorkflowPrompt, // Track AI-generated workflows for billing limits
        workflow: {
          triggers: triggers.length > 0 ? triggers : [],
          steps: steps.length > 0 ? steps : [],
          conditions: [],
          variables: [],
          outputs: [],
          canvas: {
            nodes: nodes.map(node => ({
              id: node.id,
              type: node.type,
              position: node.position,
              data: node.data || {},
              width: node.width,
              height: node.height,
              selected: node.selected,
              dragging: node.dragging,
            })),
            edges: edges.map(edge => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle,
              targetHandle: edge.targetHandle,
              type: edge.type,
              animated: edge.animated,
              style: edge.style,
              markerEnd: edge.markerEnd,
            })),
          },
        },
      };

      // console.log('=== Saving Workflow Data ===');
      // console.log('Nodes:', nodes.length);
      // console.log('Edges:', edges.length);
      // console.log('AI Generated:', workflowData.is_ai_generated);
      // console.log('Full Payload:', JSON.stringify(workflowData, null, 2));

      let response;
      // ✅ FIX: If AI-generated, ALWAYS create new workflow (don't update existing)
      // This ensures AI generation counter increments properly
      const shouldCreateNew = !workflowId || workflowData.is_ai_generated;

      if (workflowId && !workflowData.is_ai_generated) {
        // Update existing workflow (only if NOT AI-generated)
        // console.log('Updating existing workflow:', workflowId);
        response = await WorkflowAPI.updateWorkflow(
          workflowId,
          workflowData,
          context.organizationId,
          context.projectId
        );
        toast.success('Workflow updated successfully');
      } else {
        // Create new workflow (either no workflowId OR is AI-generated)
        // console.log('Creating new workflow' + (workflowData.is_ai_generated ? ' (AI-generated)' : ''));
        response = await WorkflowAPI.createWorkflow(
          workflowData,
          context.organizationId,
          context.projectId
        );
        const newWorkflowId = response.id;
        setWorkflowId(newWorkflowId);

        // Update URL if AI-generated from existing workflow
        if (workflowId && workflowData.is_ai_generated) {
          const basePath = `/org/${context.organizationId}/project/${context.projectId}/workflows`;
          window.history.replaceState({}, '', `${basePath}/${newWorkflowId}${window.location.search}`);
          // console.log('✅ Created new AI workflow, updated URL');
        }

        toast.success('Workflow created successfully' + (workflowData.is_ai_generated ? ' (AI-generated)' : ''));
      }

      // console.log('Response:', response);

      // Reset unsaved changes after successful save
      setHasUnsavedChanges(false);
    } catch (error: unknown) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save workflow');
    }
  };

  const handleSaveAsTemplate = async () => {
    if (nodes.length === 0) {
      toast.error('Cannot save an empty workflow as template');
      return;
    }
    
    // Open the modal
    setSaveAsTemplateModalOpen(true);
  };

  const handleSaveTemplateSubmit = async (templateInfo: {
    name: string;
    description: string;
    category: string;
  }) => {
    try {
      // Extract unique connector types from nodes
      const requiredConnectors = Array.from(new Set(
        nodes
          .filter(node => node.type && node.type !== 'note' && !node.type.toLowerCase().includes('trigger'))
          .map(node => node.type)
          .filter(Boolean)
      )) as string[];

      // Transform React Flow nodes to backend workflow format
      const triggers = nodes
        .filter(node => node.type && node.type.toLowerCase().includes('trigger'))
        .map(node => ({
          id: node.id,
          type: node.type,
          config: node.data || {},
        }));

      const steps = nodes
        .filter(node => node.type && !node.type.toLowerCase().includes('trigger') && node.type !== 'note')
        .map(node => ({
          id: node.id,
          connector: node.type,
          action: node.data?.action || 'execute',
          params: node.data || {},
        }));

      const templateData = {
        name: templateInfo.name,
        description: templateInfo.description,
        category: templateInfo.category,
        canvas: {
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data || {},
            width: node.width,
            height: node.height,
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            type: edge.type,
            animated: edge.animated,
            style: edge.style,
            markerEnd: edge.markerEnd,
          })),
        },
        steps,
        triggers,
        required_connectors: requiredConnectors,
        variables: [],
        conditions: [],
        outputs: [],
        is_public: true, // Admin templates are public by default
        tags: [], // Can be extended later
        ai_prompt: aiWorkflowPrompt || null, // Include AI prompt if available
      };

      // console.log('Creating template:', templateData);
      const response = await api.createTemplate(templateData);
      
      toast.success('Template created successfully!');
      // console.log('Template created:', response);
    } catch (error: unknown) {
      console.error('Failed to save as template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save as template');
      throw error; // Re-throw to handle in modal
    }
  };

  const handleExecuteWorkflow = async () => {
    if (nodes.length === 0) {
      toast.error('Please add nodes to the workflow first');
      return;
    }

    if (!workflowId) {
      toast.error('Please save the workflow before executing');
      return;
    }

    // Check if there are unsaved changes
    if (hasUnsavedChanges) {
      toast.warning('You have unsaved changes. Please save the workflow first to execute with your latest configuration.', {
        duration: 5000,
      });
      return;
    }

    // Check if there's a Form Trigger node
    const formTrigger = nodes.find(n => n.type === 'FORM_TRIGGER');
    const formTriggerData = formTrigger?.data as Record<string, unknown> | undefined;

    if (formTrigger && formTriggerData?.formFields && Array.isArray(formTriggerData.formFields) && formTriggerData.formFields.length > 0) {
      // Show form modal instead of executing directly
      setFormTriggerConfig({
        formTitle: formTriggerData.formTitle || 'Test Form',
        formDescription: formTriggerData.formDescription,
        formFields: formTriggerData.formFields,
        submitButtonText: formTriggerData.submitButtonText || 'Submit & Execute',
      });
      setFormTestModalOpen(true);
      return;
    }

    // Execute workflow directly without form
    executeWorkflowWithData({
      test: true,
      executedAt: new Date().toISOString()
    });
  };

  const executeWorkflowWithData = async (inputData: Record<string, unknown>) => {
    try {
      setIsActive(true);
      setExecutingWithReset(); // Prevent unsaved changes detection during execution

      // Helper function to format log time
      const formatLogTime = () => {
        return new Date().toLocaleTimeString('en-US', { hour12: false });
      };

      // Clear previous logs and add initial log
      const timestamp = formatLogTime();
      setExecutionLogs([{
        time: timestamp,
        message: `━━━ Workflow execution started (${nodes.filter(n => n.type !== 'note').length} nodes)`,
        type: 'info'
      }]);

      // Clear previous database nodes
      setExecutedDatabaseNodes([]);

      toast.info('Executing workflow...');
      // console.log('Executing workflow:', workflowId, 'with data:', inputData);

      // Reset all node statuses (clear previous execution state)
      // Nodes will be set to loading individually via WebSocket events
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          // Skip note nodes
          if (node.type === 'note') return node;

          return {
            ...node,
            data: {
              ...node.data,
              status: undefined, // Clear status
              error: undefined,  // Clear errors
            }
          };
        })
      );

      // Execute workflow via API
      const result = await WorkflowAPI.executeWorkflow(
        workflowId!,
        { input_data: inputData },
        context.organizationId,
        context.projectId
      );

      // console.log('Workflow execution result:', result);

      // Store execution result (stay on current tab)
      setExecutionResult(result);

      // Update node statuses based on execution result
      if (result.result?.data) {
        // Track successfully executed nodes for edge coloring
        const executedNodeIds = new Set<string>();
        const nodeErrors: Array<{nodeName: string, error: string}> = [];

        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            // Skip note nodes
            if (node.type === 'note') return node;

            const nodeResult = result.result.data[node.id];

            if (nodeResult) {
              // Node was executed
              // Check if node has explicit status field (new format from execution engine)
              const hasError = nodeResult.status === 'error' ||
                             nodeResult.error !== undefined;

              // Extract error message
              let errorMessage = 'Execution failed';
              if (nodeResult.error) {
                if (typeof nodeResult.error === 'string') {
                  errorMessage = nodeResult.error;
                } else if (nodeResult.error.message) {
                  errorMessage = nodeResult.error.message;
                }
              }

              // Handle different response formats for output data extraction
              let resultData = nodeResult;
              if (nodeResult.data) {
                if (Array.isArray(nodeResult.data) && nodeResult.data.length > 0) {
                  if (Array.isArray(nodeResult.data[0]) && nodeResult.data[0].length > 0) {
                    resultData = nodeResult.data[0][0].json || nodeResult.data[0][0];
                  } else if (nodeResult.data[0].json) {
                    resultData = nodeResult.data[0].json;
                  } else {
                    resultData = nodeResult.data[0];
                  }
                } else {
                  resultData = nodeResult.data;
                }
              }

              if (hasError) {
                // Node failed - red cross
                const nodeName = String(node.data?.label || node.id);
                nodeErrors.push({
                  nodeName,
                  error: errorMessage
                });
                // Note: Error logs are handled by WebSocket events
                return {
                  ...node,
                  data: {
                    ...node.data,
                    status: 'error',
                    error: errorMessage
                  }
                };
              } else {
                // Node succeeded - green check
                executedNodeIds.add(node.id);
                // Note: Success logs are handled by WebSocket events
                return {
                  ...node,
                  data: {
                    ...node.data,
                    status: 'success',
                    error: undefined,
                    outputData: resultData, // Store output for FieldPicker
                    lastResult: resultData, // Also store as lastResult for backward compatibility
                    lastExecutedAt: new Date().toISOString()
                  }
                };
              }
            } else {
              // Node was not executed - red cross
              const nodeName = String(node.data?.label || node.id);
              nodeErrors.push({
                nodeName,
                error: 'Node was not executed in the workflow'
              });
              // Note: Warning logs are handled by WebSocket events
              return {
                ...node,
                data: {
                  ...node.data,
                  status: 'error',
                  error: 'Not executed'
                }
              };
            }
          })
        );

        // Note: Logs state is now updated by WebSocket events and completion handlers

        // Update edges - mark as executed if both source and target executed successfully
        setEdges((currentEdges) =>
          currentEdges.map((edge) => {
            const sourceExecuted = executedNodeIds.has(edge.source);
            const targetExecuted = executedNodeIds.has(edge.target);

            if (sourceExecuted && targetExecuted) {
              // Both nodes executed successfully - green edge
              return {
                ...edge,
                data: {
                  ...edge.data,
                  executed: true
                }
              };
            } else {
              // One or both nodes didn't execute - keep default style
              return {
                ...edge,
                data: {
                  ...edge.data,
                  executed: false
                }
              };
            }
          })
        );

        // Show individual node errors with rich formatting
        if (nodeErrors.length > 0) {
          // Show a summary toast first
          toast.error(`${nodeErrors.length} node${nodeErrors.length > 1 ? 's' : ''} failed to execute`, {
            duration: 5000,
          });

          // Then show individual errors
          nodeErrors.forEach(({ nodeName, error }) => {
            toast.error(
              <div className="flex flex-col gap-1">
                <div className="font-semibold text-sm">{nodeName}</div>
                <div className="text-xs text-gray-300">{error}</div>
              </div>,
              {
                duration: 6000,
              }
            );
          });
        }
      } else {
        // No execution data - reset all nodes to initial state
        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            if (node.type === 'note') return node;

            return {
              ...node,
              data: {
                ...node.data,
                status: undefined,
              }
            };
          })
        );
      }

      // Check execution status
      if (result.status === 'completed') {
        // Only show success if no node errors - check all possible error locations
        const hasNodeErrors = result.result?.data && Object.values(result.result.data).some((nodeResult: unknown) => {
          const nr = nodeResult as Record<string, unknown>;
          const nrData = nr.data as Record<string, unknown> | undefined;
          return nr.error ||
            nrData?.error ||
            nrData?.success === false ||
            nr.success === false;
        });

        if (!hasNodeErrors) {
          toast.success('Workflow executed successfully!');
          setExecutionLogs(prev => [...prev, {
            time: formatLogTime(),
            message: `━━━ Workflow execution completed successfully (${result.result?.executedNodes || 0}/${result.result?.totalNodes || 0} nodes)`,
            type: 'success'
          }]);
        } else {
          // Find the first error message to display
          let firstErrorMessage = 'One or more nodes failed during execution';
          if (result.result?.data) {
            for (const nodeResult of Object.values(result.result.data) as Record<string, unknown>[]) {
              const nrError = nodeResult.error as Record<string, unknown> | string | undefined;
              const nrData = nodeResult.data as Record<string, unknown> | undefined;
              const nrDataError = nrData?.error as Record<string, unknown> | string | undefined;
              const errMsg = (typeof nrError === 'object' ? nrError?.message : nrError) ||
                            (typeof nrDataError === 'object' ? nrDataError?.message : nrDataError);
              if (errMsg) {
                firstErrorMessage = typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg);
                break;
              }
            }
          }

          toast.error(
            <div className="flex flex-col gap-1">
              <div className="font-semibold text-sm">Workflow Completed with Errors</div>
              <div className="text-xs text-gray-300">{firstErrorMessage}</div>
            </div>,
            { duration: 8000 }
          );
          setExecutionLogs(prev => [...prev, {
            time: formatLogTime(),
            message: `━━━ Workflow execution completed with errors: ${firstErrorMessage}`,
            type: 'error'
          }]);
        }
        // console.log('Execution details:', result.result);

        // Show execution summary
        if (result.result) {
          const { executedNodes, totalNodes, lastNodeExecuted } = result.result;
          // console.log(`Executed ${executedNodes}/${totalNodes} nodes`);
          // console.log('Last node executed:', lastNodeExecuted);
        }
      } else if (result.status === 'failed') {
        const errorMessage = result.error?.message || result.error || 'Unknown error';
        toast.error(
          <div className="flex flex-col gap-1">
            <div className="font-semibold text-sm">Workflow Execution Failed</div>
            <div className="text-xs text-gray-300">{errorMessage}</div>
          </div>,
          {
            duration: 8000,
          }
        );
        console.error('Execution error:', result.error);
        setExecutionLogs(prev => [...prev, {
          time: formatLogTime(),
          message: `━━━ Workflow execution failed: ${result.error?.message || 'Unknown error'}`,
          type: 'error'
        }]);
      } else {
        toast.info(`Workflow execution status: ${result.status}`);
        setExecutionLogs(prev => [...prev, {
          time: formatLogTime(),
          message: `━━━ Workflow execution status: ${result.status}`,
          type: 'info'
        }]);
      }
      setIsActive(false);
      setExecutingWithReset(); // Keep flag active briefly for any final updates
    } catch (error: unknown) {
      console.error('Workflow execution error:', error);

      // Extract detailed error message
      const errObj = error as { response?: { data?: Record<string, unknown> }; message?: string };
      const errorMessage = (errObj.response?.data?.message as string) || errObj.message || 'Failed to execute workflow';
      const errorData = errObj.response?.data;

      // Show error toast with details
      toast.error(
        <div className="flex flex-col gap-1">
          <div className="font-semibold text-sm">Execution Error</div>
          <div className="text-xs text-gray-300">{errorMessage}</div>
        </div>,
        {
          duration: 8000,
        }
      );

      // Add error log
      const formatLogTime = () => {
        return new Date().toLocaleTimeString('en-US', { hour12: false });
      };

      setExecutionLogs(prev => [...prev, {
        time: formatLogTime(),
        message: `━━━ Workflow execution error: ${errorMessage}`,
        type: 'error'
      }]);

      // Check if error response contains partial execution data (from failed nodes)
      // The backend returns this in error.response.data.details
      const details = errorData?.details;
      const nodeExecutionData = details?.result?.data || details?.output_data?.data;

      // console.log('Checking for node execution data...');
      // console.log('errorData:', errorData);
      // console.log('details:', details);
      // console.log('nodeExecutionData:', nodeExecutionData);

      if (nodeExecutionData && typeof nodeExecutionData === 'object') {
        // We have per-node execution status, use it
        // console.log('✅ Found node execution data, applying per-node status');

        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            if (node.type === 'note') return node;

            const nodeResult = nodeExecutionData[node.id];
            // console.log(`Node ${node.data?.label || node.id}:`, nodeResult);

            if (nodeResult) {
              const hasError = nodeResult.status === 'error' || nodeResult.error !== undefined;

              if (hasError) {
                let nodeErrorMessage = 'Node execution failed';
                if (nodeResult.error?.message) {
                  nodeErrorMessage = nodeResult.error.message;
                }

                // console.log(`❌ Node ${node.data?.label || node.id} failed: ${nodeErrorMessage}`);
                // Note: Error logs are handled by WebSocket events

                return {
                  ...node,
                  data: {
                    ...node.data,
                    status: 'error',
                    error: nodeErrorMessage
                  }
                };
              } else {
                // Node succeeded before workflow failed
                // console.log(`✅ Node ${node.data?.label || node.id} succeeded`);
                // Note: Success logs are handled by WebSocket events

                return {
                  ...node,
                  data: {
                    ...node.data,
                    status: 'success',
                    error: undefined
                  }
                };
              }
            } else {
              // Node was not executed
              // console.log(`⚪ Node ${node.data?.label || node.id} was not executed`);

              return {
                ...node,
                data: {
                  ...node.data,
                  status: undefined,
                  error: undefined
                }
              };
            }
          })
        );
      } else {
        // No partial execution data, only mark the workflow as failed but don't mark nodes
        // console.log('⚠️ No node execution data found, leaving nodes unmarked');

        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            if (node.type === 'note') return node;

            // Don't mark all nodes as error - leave them as is
            return {
              ...node,
              data: {
                ...node.data,
                status: undefined,
                error: undefined
              }
            };
          })
        );
      }

      setIsActive(false);
      setExecutingWithReset(); // Keep flag active briefly for any final updates
    }
  };

  const handleFormTestSubmit = (formData: Record<string, unknown>) => {
    // Execute workflow with form data
    executeWorkflowWithData({
      formSubmission: formData,
      submittedAt: new Date().toISOString(),
      trigger: 'form_test'
    });
  };

  const handleWorkflowSaved = useCallback((workflow: { nodes: Node[]; edges: Edge[]; prompt?: string }) => {
    // ✅ FIX: Store the AI prompt for tracking is_ai_generated
    if (workflow.prompt) {
      setAiWorkflowPrompt(workflow.prompt);
      // console.log('✅ AI prompt stored for is_ai_generated tracking:', workflow.prompt);
    }

    // Apply generated workflow to canvas
    if (workflow.nodes && workflow.nodes.length > 0) {
      // Process nodes the same way Classic mode does (add positions if missing)
      const processedNodes = workflow.nodes.map((node: Node, index: number) => {
        if (!node.position || (node.position.x === 0 && node.position.y === 0)) {
          return {
            ...node,
            position: { x: 100 + index * 300, y: 200 }
          };
        }
        return node;
      });

      // Debug logging removed for production

      // Normalize edges for consistent styling
      const normalizedEdges = (workflow.edges || []).map((edge: Edge) => normalizeEdge(edge));

      setNodes(processedNodes);
      setEdges(normalizedEdges);
      setHasUnsavedChanges(true);

      // console.log('✅ Workflow applied to canvas successfully');
      toast.success(`Workflow with ${processedNodes.length} nodes displayed on canvas!`);
    }
  }, [setNodes, setEdges, normalizeEdge, setAiWorkflowPrompt]); // ✅ FIX: Added setAiWorkflowPrompt to dependency array

  const handleGenerateWorkflow = async (prompt: string) => {
    try {
      toast.info('AI is generating your workflow...');
      // console.log('Generating workflow from prompt:', prompt);

      // Store the prompt for later use when saving as template
      setAiWorkflowPrompt(prompt);

      // Debug: Log context to see what we have
      // console.log('🔍 DEBUG - Route context:', context);
      // console.log('🔍 DEBUG - organizationId:', context.organizationId);
      // console.log('🔍 DEBUG - projectId:', context.projectId);

      // Call the API to generate workflow using RAG-powered AI
      const response = await WorkflowAPI.generateWorkflow({
        prompt,
        strategy: 'AI_ONLY',
      }, context.organizationId, context.projectId);

      // console.log('Workflow generation response:', response);

      // Check responseType from backend
      if (response.responseType === 'workflow' && response.workflow?.canvas) {
        // Apply generated workflow to canvas
        const { nodes, edges } = response.workflow.canvas;

        // DEBUG: Log what we received
        // console.log('🔍 DEBUG - Received from backend:');
        // console.log('  Nodes:', nodes?.length || 0, nodes?.map((n: any) => n.id));
        // console.log('  Node positions:', nodes?.map((n: any) => ({ id: n.id, pos: n.position })));
        // console.log('  Edges:', edges?.length || 0);
        // console.log('  Edge details:', JSON.stringify(edges, null, 2));

        // Validate edges reference valid nodes
        if (edges && edges.length > 0 && nodes) {
          const nodeIds = new Set(nodes.map((n: Node) => n.id));
          const invalidEdges = edges.filter((e: Edge) =>
            !nodeIds.has(e.source) || !nodeIds.has(e.target)
          );

          if (invalidEdges.length > 0) {
            console.error('❌ INVALID EDGES - Reference non-existent nodes:', invalidEdges);
          } else {
            // console.log('✅ All edges are valid and reference existing nodes');
          }
        }

        if (nodes && nodes.length > 0) {
          // console.log('⚙️ Setting nodes and edges in ReactFlow...');

          // Ensure nodes have proper positions (fallback if AI doesn't set them)
          const processedNodes = nodes.map((node: Node, index: number) => {
            if (!node.position || (node.position.x === 0 && node.position.y === 0)) {
              return {
                ...node,
                position: { x: 100 + index * 300, y: 200 }
              };
            }
            return node;
          });

          // Ensure edges have all required ReactFlow properties - use normalizeEdge for consistency
          const processedEdges = (edges || []).map((edge: Edge) => normalizeEdge(edge));

          // console.log('📊 Processed edges:', processedEdges);

          setNodes(processedNodes);
          setEdges(processedEdges);
          // console.log('✅ Nodes and edges set successfully');

          // Verify edges are in state immediately after setting
          setTimeout(() => {
            // console.log('🔍 VERIFICATION - Edges in state after 100ms:', edges.length);
          }, 100);

          setHasUnsavedChanges(true);

          // Show success message with confidence and edge count
          toast.success(
            `Workflow generated with ${response.confidence}% confidence! ${processedNodes.length} nodes and ${processedEdges.length} edges added.`,
            { duration: 5000 }
          );

          // Show warnings if any connectors are missing
          if (response.missingConnectors && response.missingConnectors.length > 0) {
            toast.warning(
              `Missing connectors: ${response.missingConnectors.join(', ')}. Please configure them in settings.`,
              { duration: 7000 }
            );
          }

          // Debug logging removed for production
        } else {
          toast.warning('Workflow generated but no nodes were created. Try rephrasing your prompt.');
        }

        // Return response for AIPromptPanel to check responseType
        return response;
      } else if (response.responseType === 'limit_exceeded') {
        // ✅ Show limit exceeded error with Sonner toast
        toast.error(response.error || 'AI workflow generation limit exceeded');
        return response;
      } else if (response.responseType === 'error') {
        // Return error response for AIPromptPanel
        toast.error(response.message || 'Failed to generate workflow');
        return response;
      } else if (response.responseType === 'conversational') {
        // Return conversational response
        return response;
      } else {
        // Fallback for old response format
        throw new Error(response.error || 'Failed to generate workflow structure');
      }
    } catch (error: unknown) {
      console.error('Workflow generation error:', error);
      const errMsg = error instanceof Error ? error.message : 'Failed to generate workflow. Please try again with a more detailed prompt.';
      toast.error(errMsg);

      // Return error response
      return {
        success: false,
        responseType: 'error',
        error: errMsg,
        message: errMsg,
        canRetry: true,
      };
    }
  };

  const handleAddNote = useCallback(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const flowPosition = screenToFlowPosition({
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 200,
    });

    const newNote = {
      id: `note_${Date.now()}`,
      type: 'note',
      position: flowPosition,
      data: {
        content: "I'm a note\n\nDouble click to edit me.",
      },
    };

    setNodes((nds) => [...nds, newNote]);
    toast.success('Note added');
  }, [screenToFlowPosition, setNodes]);

  const handleWorkflowNameChange = (name: string) => {
    setWorkflowName(name);
    setHasUnsavedChanges(true);
  };

  const handleToggleActive = async (active: boolean) => {
    if (!workflowId) {
      toast.error('Please save the workflow first');
      return;
    }

    try {
      // console.log('Toggling workflow activation:', active ? 'active' : 'draft');

      await WorkflowAPI.updateWorkflow(
        workflowId,
        { status: active ? 'active' : 'draft' },
        context.organizationId,
        context.projectId
      );

      setIsWorkflowActive(active);
      toast.success(`Workflow ${active ? 'activated' : 'deactivated'} successfully`);

      if (active) {
        toast.info('Workflow triggers are now active and will start polling/listening for events');
      }
    } catch (error: unknown) {
      console.error('Failed to toggle workflow activation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update workflow status');
      // Revert the state on error
      setIsWorkflowActive(!active);
    }
  };

  // Export workflow as JSON
  const handleExportWorkflow = () => {
    try {
      const workflowData = {
        name: workflowName,
        id: workflowId,
        workflow: {
          canvas: {
            nodes,
            edges,
          },
        },
        createdAt: new Date().toISOString(),
        exportedAt: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(workflowData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `${workflowName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_workflow.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      toast.success('Workflow exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export workflow');
    }
  };

  // Import workflow from JSON
  const handleImportWorkflow = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate the imported data
        if (!data.workflow?.canvas?.nodes || !data.workflow?.canvas?.edges) {
          throw new Error('Invalid workflow format');
        }

        // Set the imported data
        setWorkflowName(data.name || 'Imported Workflow');
        setNodes(data.workflow.canvas.nodes);
        // Normalize imported edges for consistent styling
        setEdges(data.workflow.canvas.edges.map((edge: Edge) => normalizeEdge(edge)));
        setHasUnsavedChanges(true);

        toast.success('Workflow imported successfully');
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import workflow. Please check the file format.');
      }
    };

    input.click();
  };

  // Duplicate workflow
  const handleDuplicateWorkflow = async () => {
    try {
      const duplicateName = `${workflowName} (Copy)`;
      setWorkflowName(duplicateName);
      setWorkflowId(null); // Reset ID to create new workflow
      setHasUnsavedChanges(true);

      toast.success('Workflow duplicated. Save to create a new workflow.');
    } catch (error) {
      console.error('Duplicate error:', error);
      toast.error('Failed to duplicate workflow');
    }
  };

  // Delete workflow
  const handleDeleteWorkflow = async () => {
    if (!workflowId) {
      toast.error('No workflow to delete');
      return;
    }

    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return;
    }

    try {
      await WorkflowAPI.deleteWorkflow(
        workflowId,
        context.organizationId,
        context.projectId
      );
      toast.success('Workflow deleted successfully');

      // Redirect to project dashboard
      window.location.href = `/org/${context.organizationId}/project/${context.projectId}`;
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete workflow');
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Left Sidebar */}
      <LeftSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header - n8n style */}
        <TopHeader
          workflowName={workflowName}
          onWorkflowNameChange={handleWorkflowNameChange}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSave={handleSaveWorkflow}
          onExecute={handleExecuteWorkflow}
          onExport={handleExportWorkflow}
          onImport={handleImportWorkflow}
          onDuplicate={handleDuplicateWorkflow}
          onDelete={handleDeleteWorkflow}
          onSaveAsTemplate={handleSaveAsTemplate}
          onCreateNew={() => navigate(servicePaths.workflows(context))}
          onBack={() => navigate(`/org/${context.organizationId}/project/${context.projectId}/workflows`)}
          isActive={isActive}
          hasUnsavedChanges={hasUnsavedChanges}
          isWorkflowActive={isWorkflowActive}
          onToggleActive={handleToggleActive}
        />

        {/* Main Content Area - Tab-based */}
        {activeTab === 'editor' ? (
          <EditorTab
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            isLoading={isLoading}
            executionLogs={executionLogs}
            onClearLogs={() => setExecutionLogs([])}
            onAddNode={() => setNodeSelectorOpen(true)}
            onAIPrompt={() => setAiPromptOpen(true)}
            onAddNote={handleAddNote}
            onLayout={() => {}}
            selectedNode={selectedNodeForData}
            onCloseNodeData={() => setSelectedNodeForData(null)}
            databaseNodes={executedDatabaseNodes}
          />
        ) : activeTab === 'executions' ? (
          <ExecutionsTab
            workflowId={workflowId}
            currentExecution={executionResult}
            context={context}
          />
        ) : activeTab === 'templates' ? (
          <TemplatesTab
            onImportTemplate={(template) => {
              // Import template into canvas
              if (template.workflow?.canvas) {
                setWorkflowName(template.name);
                setTemplateId(template.id); // Track template ID
                setNodes(template.workflow.canvas.nodes || []);
                setEdges((template.workflow.canvas.edges || []).map(normalizeEdge));
                setHasUnsavedChanges(true);
                setActiveTab('editor'); // Switch back to editor
              }
            }}
            onOpenWorkflow={(workflowId) => {
              // If we're already on this workflow, just switch to editor tab
              if (id === workflowId) {
                setActiveTab('editor');
              } else {
                // Otherwise, navigate to the workflow (will load it in editor tab by default)
                navigate(servicePaths.workflows(context, workflowId));
              }
            }}
          />
        ) : null}
      </div>

      {/* Node Selector Side Panel - slides from right */}
      <NodeSelectorPanel
        isOpen={nodeSelectorOpen}
        onClose={() => setNodeSelectorOpen(false)}
      />

      {/* AI Prompt Panel - slides from right */}
      <AIPromptPanel
        isOpen={aiPromptOpen}
        onClose={() => setAiPromptOpen(false)}
        onGenerateWorkflow={handleGenerateWorkflow}
        onWorkflowSaved={handleWorkflowSaved}
        workflowId={workflowId}
        context={context}
        onConfigureNode={(nodeId, nodeType) => {
          setSelectedNodeId(nodeId);
          setSelectedNodeType(nodeType as NodeType);
          setConfigModalOpen(true);
        }}
      />

      {/* Dynamic Configuration Modal */}
      <DynamicNodeConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        nodeId={selectedNodeId}
        nodeType={selectedNodeType}
      />

      {/* Form Test Modal - for testing Form Trigger */}
      <FormTestModal
        open={formTestModalOpen}
        onOpenChange={setFormTestModalOpen}
        formConfig={formTriggerConfig || {}}
        onSubmit={handleFormTestSubmit}
      />

      {/* Save as Template Modal */}
      <SaveAsTemplateModal
        open={saveAsTemplateModalOpen}
        onOpenChange={setSaveAsTemplateModalOpen}
        defaultName={workflowName}
        aiPrompt={aiWorkflowPrompt}
        onSave={handleSaveTemplateSubmit}
      />

      {/* Node Details Panel - Shows webhook URL persistently for trigger nodes */}
      {showNodeDetails && selectedNodeId && selectedNodeType && (
        <NodeDetailsPanel
          nodeId={selectedNodeId}
          nodeData={nodes.find(n => n.id === selectedNodeId)?.data || {}}
          nodeType={selectedNodeType}
          workflowId={workflowId}
          onClose={() => setShowNodeDetails(false)}
          onConfigure={() => {
            setConfigModalOpen(true);
          }}
        />
      )}

      {/* Node data is now shown in the bottom panel's Data tab */}
    </div>
  );
};

export const WorkflowBuilderNew: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
};
