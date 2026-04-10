import { useState, useCallback, useEffect, useRef } from 'react';
import type { Connection, Edge, Node } from '@xyflow/react';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import type { 
  WorkflowDefinition, 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowExecution, 
  WorkflowVariable 
} from '../types/workflow';

// Create a default workflow
const createDefaultWorkflow = (): WorkflowDefinition => ({
  id: `workflow-${Date.now()}`,
  name: 'Untitled Workflow',
  description: '',
  version: '1.0.0',
  nodes: [],
  edges: [],
  variables: [],
  triggers: [],
  settings: {
    timeout: 300000, // 5 minutes
    retryPolicy: {
      maxRetries: 3,
      delay: 1000,
      backoff: 'exponential',
    },
    errorHandling: 'stop',
    logging: {
      level: 'info',
      includeData: true,
    },
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useWorkflowBuilder = (
  workflowId?: string,
  initialWorkflow?: WorkflowDefinition
) => {
  // Core workflow state
  const [workflow, setWorkflow] = useState<WorkflowDefinition>(
    initialWorkflow || createDefaultWorkflow()
  );
  
  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<WorkflowExecution[]>([]);
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null);
  
  // Auto-save state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<number>(0);
  const lastSavedRef = useRef<string>('');
  
  // ReactFlow integration
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  // Convert workflow node to ReactFlow node format
  function nodeToReactFlow(node: WorkflowNode): Node {
    return {
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    };
  }

  // Convert workflow edge to ReactFlow edge format
  function edgeToReactFlow(edge: WorkflowEdge): Edge {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
      type: edge.type || 'default',
      data: edge.data,
    };
  }

  // Convert ReactFlow formats back to workflow formats
  function reactFlowToWorkflowNode(node: Node): WorkflowNode {
    return {
      id: node.id,
      type: node.type as 'connector' | 'control' | 'trigger',
      position: node.position,
      data: {
        label: (node.data as Record<string, unknown>)?.label || 'Untitled Node',
        ...(node.data as Record<string, unknown>)
      },
    };
  }

  function reactFlowToWorkflowEdge(edge: Edge): WorkflowEdge {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined,
      type: edge.type === 'default' ? undefined : (edge.type as 'default' | 'conditional'),
      data: edge.data,
    };
  }

  // Sync workflow state with ReactFlow state
  useEffect(() => {
    // Skip empty initial states to avoid infinite loops
    if (nodes.length === 0 && edges.length === 0 && workflow.nodes.length === 0) {
      return;
    }
    
    try {
      const workflowNodes: WorkflowNode[] = (nodes as Node[]).map(node => reactFlowToWorkflowNode(node));
      const workflowEdges: WorkflowEdge[] = (edges as Edge[]).map(edge => reactFlowToWorkflowEdge(edge));
      
      setWorkflow(prev => ({
        ...prev,
        nodes: workflowNodes,
        edges: workflowEdges,
        updatedAt: new Date().toISOString(),
      }));
      
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error syncing workflow state:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length]); // Using length to avoid deep comparison

  // Auto-save functionality
  useEffect(() => {
    const currentState = JSON.stringify(workflow);
    if (currentState !== lastSavedRef.current && hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current) {
        window.clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = window.setTimeout(() => {
        // Auto-save to localStorage
        localStorage.setItem(`workflow-${workflow.id}`, currentState);
        lastSavedRef.current = currentState;
        // console.log('Auto-saved workflow to localStorage');
      }, 2000); // Auto-save after 2 seconds of inactivity
    }
  }, [workflow, hasUnsavedChanges]);

  // Initialize ReactFlow states with workflow data
  useEffect(() => {
    const rfNodes = workflow.nodes.map(nodeToReactFlow);
    const rfEdges = workflow.edges.map(edgeToReactFlow);
    setNodes(rfNodes);
    setEdges(rfEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.nodes.length, workflow.edges.length]); // Using length to avoid deep comparison

  // Load workflow from localStorage on mount
  useEffect(() => {
    if (workflowId && !initialWorkflow) {
      const saved = localStorage.getItem(`workflow-${workflowId}`);
      if (saved) {
        try {
          const parsedWorkflow = JSON.parse(saved);
          setWorkflow(parsedWorkflow);
        } catch (error) {
          console.error('Failed to load workflow from localStorage:', error);
        }
      }
    }
  }, [workflowId, initialWorkflow]);

  // Node operations
  const addNode = useCallback((node: WorkflowNode) => {
    const reactFlowNode = nodeToReactFlow(node);
    setNodes(prevNodes => [...(prevNodes as Node[]), reactFlowNode]);
    setHasUnsavedChanges(true);
  }, [setNodes]);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setNodes(prevNodes => 
      (prevNodes as Node[]).map(node => 
        node.id === nodeId 
          ? { ...node, ...updates, data: { ...node.data, ...updates.data } }
          : node
      )
    );
    setHasUnsavedChanges(true);
  }, [setNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prevNodes => (prevNodes as Node[]).filter(node => node.id !== nodeId));
    setEdges(prevEdges => (prevEdges as Edge[]).filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    setHasUnsavedChanges(true);
  }, [setNodes, setEdges]);

  // Edge operations
  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = {
      ...connection,
      id: `edge-${Date.now()}`,
      type: 'default',
    } as Edge;
    setEdges(prevEdges => addEdge(newEdge, prevEdges as Edge[]));
    setHasUnsavedChanges(true);
  }, [setEdges]);

  // Variable operations
  const addVariable = useCallback((variable: WorkflowVariable) => {
    setWorkflow(prev => ({
      ...prev,
      variables: [...prev.variables, variable],
      updatedAt: new Date().toISOString(),
    }));
    setHasUnsavedChanges(true);
  }, []);

  const updateVariable = useCallback((variableId: string, updates: Partial<WorkflowVariable>) => {
    setWorkflow(prev => ({
      ...prev,
      variables: prev.variables.map(v => 
        v.id === variableId ? { ...v, ...updates } : v
      ),
      updatedAt: new Date().toISOString(),
    }));
    setHasUnsavedChanges(true);
  }, []);

  const deleteVariable = useCallback((variableId: string) => {
    setWorkflow(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v.id !== variableId),
      updatedAt: new Date().toISOString(),
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Workflow execution
  const executeWorkflow = useCallback(async (): Promise<WorkflowExecution | null> => {
    if (isExecuting || workflow.nodes.length === 0) {
      return null;
    }

    const execution: WorkflowExecution = {
      id: `exec-${Date.now()}`,
      workflowId: workflow.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      logs: [],
      nodeExecutions: [],
    };

    setCurrentExecution(execution);
    setIsExecuting(true);

    try {
      // Update node statuses to show execution progress
      const nodeIds = workflow.nodes.map(n => n.id);
      
      for (const nodeId of nodeIds) {
        updateNode(nodeId, { data: { label: 'Node', status: 'running' } });
        
        // Simulate node execution delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate success/failure (90% success rate for demo)
        const success = Math.random() > 0.1;
        
        updateNode(nodeId, { 
          data: { 
            label: 'Node',
            status: success ? 'success' : 'error',
            error: success ? undefined : 'Simulated execution error'
          }
        });

        execution.nodeExecutions.push({
          nodeId,
          status: success ? 'success' : 'error',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: 1000,
          error: success ? undefined : 'Simulated execution error',
        });

        if (!success && workflow.settings.errorHandling === 'stop') {
          break;
        }
      }

      // Complete execution
      execution.status = 'success';
      execution.completedAt = new Date().toISOString();
      execution.duration = Date.now() - new Date(execution.startedAt).getTime();

    } catch (error) {
      execution.status = 'error';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date().toISOString();
      execution.duration = Date.now() - new Date(execution.startedAt).getTime();
    } finally {
      setIsExecuting(false);
      setCurrentExecution(null);
      setExecutionHistory(prev => [execution, ...prev.slice(0, 9)]); // Keep last 10 executions
    }

    return execution;
  }, [workflow, isExecuting, updateNode]);

  // Workflow persistence
  const saveWorkflow = useCallback(async (): Promise<WorkflowDefinition | null> => {
    try {
      // In a real app, this would make an API call
      const updatedWorkflow = {
        ...workflow,
        updatedAt: new Date().toISOString(),
      };
      
      // Save to localStorage
      localStorage.setItem(`workflow-${workflow.id}`, JSON.stringify(updatedWorkflow));
      
      // Save to backend (placeholder)
      // console.log('Saving workflow to backend:', updatedWorkflow);
      // await fetch('/api/workflows', { method: 'POST', body: JSON.stringify(updatedWorkflow) });
      
      setWorkflow(updatedWorkflow);
      setHasUnsavedChanges(false);
      lastSavedRef.current = JSON.stringify(updatedWorkflow);
      
      return updatedWorkflow;
    } catch (error) {
      console.error('Failed to save workflow:', error);
      return null;
    }
  }, [workflow]);

  // Import/Export functionality
  const exportWorkflow = useCallback(() => {
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `workflow-${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [workflow]);

  const importWorkflow = useCallback((workflowData: WorkflowDefinition) => {
    setWorkflow(workflowData);
    setNodes(workflowData.nodes.map(nodeToReactFlow));
    setEdges(workflowData.edges.map(edgeToReactFlow));
    setHasUnsavedChanges(true);
  }, [setNodes, setEdges]);

  // Validation
  const validateWorkflow = useCallback((): string[] => {
    const errors: string[] = [];
    
    if (workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }
    
    // Check for unconnected nodes (except triggers)
    const connectedNodes = new Set([
      ...workflow.edges.map(e => e.source),
      ...workflow.edges.map(e => e.target),
    ]);
    
    const unconnectedNodes = workflow.nodes.filter(
      n => n.type !== 'trigger' && !connectedNodes.has(n.id)
    );
    
    if (unconnectedNodes.length > 0) {
      errors.push(`${unconnectedNodes.length} unconnected nodes found`);
    }
    
    // Check for circular dependencies (simplified)
    // In a real implementation, you'd do a proper topological sort
    
    return errors;
  }, [workflow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        window.clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Workflow state
    workflow,
    setWorkflow,
    hasUnsavedChanges,
    
    // ReactFlow integration
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    
    // Node operations
    addNode,
    updateNode,
    deleteNode,
    
    // Variable operations
    addVariable,
    updateVariable,
    deleteVariable,
    
    // Execution
    executeWorkflow,
    isExecuting,
    currentExecution,
    executionHistory,
    
    // Persistence
    saveWorkflow,
    exportWorkflow,
    importWorkflow,
    
    // Validation
    validateWorkflow,
  };
};