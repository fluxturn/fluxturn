import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Calendar,
  Zap,
  Activity,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowAPI } from '@/lib/fluxturn';
import { toast } from 'sonner';

interface NodeResultData {
  error?: { message?: string };
  data?: unknown[][];
  inputData?: unknown;
  executionTime?: number;
}

interface ExecutionResult {
  id: string;
  workflow_id: string;
  execution_number: number;
  status: 'completed' | 'failed' | 'running';
  input_data: unknown;
  output_data?: unknown;
  result?: {
    success: boolean;
    data: Record<string, NodeResultData>;
    lastNodeExecuted?: string;
    executedNodes?: number;
    totalNodes?: number;
  };
  started_at: string;
  completed_at?: string;
  error?: unknown;
  message?: string;
}

interface ExecutionsTabProps {
  workflowId: string | null;
  currentExecution: ExecutionResult | null;
  context?: {
    organizationId?: string;
    projectId?: string;
    appId?: string;
  };
}

export function ExecutionsTab({ workflowId, currentExecution, context }: ExecutionsTabProps) {
  const [executions, setExecutions] = useState<ExecutionResult[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionResult | null>(currentExecution);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'logs' | 'analysis'>('overview');

  // Update selected execution when currentExecution changes
  useEffect(() => {
    if (currentExecution) {
      setSelectedExecution(currentExecution);
      // Add to executions list if not already there
      setExecutions(prev => {
        const exists = prev.some(e => e.id === currentExecution.id);
        if (exists) {
          return prev.map(e => e.id === currentExecution.id ? currentExecution : e);
        }
        return [currentExecution, ...prev];
      });
    }
  }, [currentExecution]);

  // Load execution history
  useEffect(() => {
    if (workflowId) {
      loadExecutionHistory();
    }
  }, [workflowId]);

  const loadExecutionHistory = async () => {
    if (!workflowId) return;

    try {
      setIsLoading(true);
      const response = await WorkflowAPI.getWorkflowExecutions(
        workflowId,
        undefined,
        context?.organizationId,
        context?.projectId,
        context?.appId
      );
      // Handle both array response and paginated response
      const history = Array.isArray(response) ? response : (response.executions || []);
      setExecutions(history);
    } catch (error: unknown) {
      console.error('Failed to load execution history:', error);
      toast.error('Failed to load execution history');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "px-2 py-1 rounded text-xs font-medium";
    switch (status) {
      case 'completed':
        return <span className={`${baseClass} bg-green-500/20 text-green-400`}>Completed</span>;
      case 'failed':
        return <span className={`${baseClass} bg-red-500/20 text-red-400`}>Failed</span>;
      case 'running':
        return <span className={`${baseClass} bg-yellow-500/20 text-yellow-400`}>Running</span>;
      default:
        return <span className={`${baseClass} bg-gray-500/20 text-gray-400`}>Unknown</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (execution: ExecutionResult) => {
    if (!execution.started_at || !execution.completed_at) return 'N/A';
    const start = new Date(execution.started_at).getTime();
    const end = new Date(execution.completed_at).getTime();
    const duration = end - start;
    return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date().getTime();
    const then = new Date(dateString).getTime();
    const diff = now - then;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const generateExecutionLogs = (execution: ExecutionResult): string[] => {
    const logs: string[] = [];
    const startTime = new Date(execution.started_at).getTime();

    // Format timestamp as HH:MM:SS
    const formatLogTime = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour12: false });
    };

    logs.push(`${formatLogTime(startTime)} Workflow execution started`);
    logs.push(`${formatLogTime(startTime)} Execution ID: ${execution.id}`);
    logs.push(`${formatLogTime(startTime)} Execution Number: #${execution.execution_number}`);

    if (execution.result?.data) {
      const nodeCount = Object.keys(execution.result.data).length;
      const totalDuration = execution.completed_at
        ? new Date(execution.completed_at).getTime() - startTime
        : 0;
      const avgNodeDuration = nodeCount > 0 ? totalDuration / nodeCount : 1000;

      Object.entries(execution.result.data).forEach(([nodeId, nodeData]: [string, NodeResultData], index) => {
        // Increment timestamp for each node to show progression
        const nodeTimestamp = startTime + (index + 1) * avgNodeDuration;

        // Calculate input/output item counts
        const inputCount = Array.isArray(nodeData.inputData) ? nodeData.inputData.length : 0;
        const outputCount = nodeData.data?.[0] ? nodeData.data[0].length : 0;
        const executionTime = nodeData.executionTime !== undefined ? `${nodeData.executionTime}ms` : '';

        if (nodeData.error) {
          logs.push(`${formatLogTime(nodeTimestamp)} ❌ Node ${nodeId} failed: ${nodeData.error.message || 'Unknown error'}`);
          if (inputCount > 0) {
            logs.push(`${formatLogTime(nodeTimestamp)}    Input: ${inputCount} item${inputCount !== 1 ? 's' : ''}`);
          }
        } else {
          logs.push(`${formatLogTime(nodeTimestamp)} ✓ Node ${nodeId} executed successfully ${executionTime ? `(${executionTime})` : ''}`);
          if (inputCount > 0 || outputCount > 0) {
            logs.push(`${formatLogTime(nodeTimestamp)}    Input: ${inputCount} item${inputCount !== 1 ? 's' : ''} → Output: ${outputCount} item${outputCount !== 1 ? 's' : ''}`);
          }
        }
      });
    }

    if (execution.completed_at) {
      const endTime = new Date(execution.completed_at).getTime();
      logs.push(`${formatLogTime(endTime)} Workflow execution completed`);
      logs.push(`${formatLogTime(endTime)} Status: ${execution.status}`);
      logs.push(`${formatLogTime(endTime)} Duration: ${formatDuration(execution)}`);
    }

    return logs;
  };

  const generateExecutionAnalysis = (execution: ExecutionResult) => {
    if (!execution.result?.data) {
      return {
        totalNodes: 0,
        executedNodes: 0,
        successfulNodes: 0,
        failedNodes: 0,
        notExecutedNodes: 0,
        successRate: 0,
        issues: []
      };
    }

    const data = execution.result.data;
    const totalNodes = Object.keys(data).length;
    let successfulNodes = 0;
    let failedNodes = 0;
    const issues: string[] = [];

    Object.entries(data).forEach(([nodeId, nodeData]: [string, NodeResultData]) => {
      if (nodeData.error) {
        failedNodes++;
        issues.push(`Node ${nodeId}: ${nodeData.error.message || 'Unknown error'}`);
      } else {
        successfulNodes++;
      }
    });

    const executedNodes = successfulNodes + failedNodes;
    const notExecutedNodes = (execution.result?.totalNodes || totalNodes) - executedNodes;
    const successRate = executedNodes > 0 ? (successfulNodes / executedNodes) * 100 : 0;

    return {
      totalNodes,
      executedNodes,
      successfulNodes,
      failedNodes,
      notExecutedNodes,
      successRate: Math.round(successRate),
      issues
    };
  };

  if (!workflowId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No Workflow Selected</p>
          <p className="text-gray-500 text-sm">Save your workflow to view executions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Execution History */}
      <div className="w-80 border-r border-white/10 flex flex-col h-full">
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-4">
          <h3 className="text-white font-medium">Execution History</h3>
          <button
            onClick={loadExecutionHistory}
            disabled={isLoading}
            className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && executions.length === 0 ? (
            <div className="p-4 text-center">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-400 text-sm">Loading executions...</p>
            </div>
          ) : executions.length === 0 ? (
            <div className="p-8 text-center">
              <Zap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No executions yet</p>
              <p className="text-gray-500 text-xs mt-1">Execute the workflow to see results here</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {executions.map((execution) => (
                <button
                  key={execution.id}
                  onClick={() => setSelectedExecution(execution)}
                  className={cn(
                    "w-full p-3 rounded-lg border transition-all text-left",
                    selectedExecution?.id === execution.id
                      ? "bg-cyan-500/10 border-cyan-500/30"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                      <span className="text-white text-sm font-medium">
                        Execution #{execution.execution_number}
                      </span>
                    </div>
                    {getStatusBadge(execution.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>{formatRelativeTime(execution.started_at)}</span>
                  </div>
                  {execution.result && (
                    <div className="mt-2 text-xs text-gray-400">
                      {execution.result.executedNodes} / {execution.result.totalNodes} nodes
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Execution Details */}
      <div className="flex-1 flex flex-col h-full">
        {selectedExecution ? (
          <>
            {/* Header */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-6">
              <div className="flex items-center gap-3">
                {getStatusIcon(selectedExecution.status)}
                <div>
                  <h3 className="text-white font-medium">Execution #{selectedExecution.execution_number}</h3>
                  <p className="text-xs text-gray-400">{formatDate(selectedExecution.started_at)}</p>
                </div>
              </div>
              {getStatusBadge(selectedExecution.status)}
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
                    <Activity className="w-4 h-4" />
                    Overview
                  </div>
                </button>
                <button
                  onClick={() => setActiveView('logs')}
                  className={cn(
                    "px-4 py-2 text-sm border-b-2 transition-colors",
                    activeView === 'logs'
                      ? "border-cyan-500 text-white"
                      : "border-transparent text-gray-400 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Logs
                  </div>
                </button>
                <button
                  onClick={() => setActiveView('analysis')}
                  className={cn(
                    "px-4 py-2 text-sm border-b-2 transition-colors",
                    activeView === 'analysis'
                      ? "border-cyan-500 text-white"
                      : "border-transparent text-gray-400 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Analysis
                  </div>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeView === 'overview' && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <p className="text-gray-400 text-sm mb-1">Status</p>
                      <p className={cn(
                        "text-lg font-semibold",
                        selectedExecution.status === 'completed' ? 'text-green-400' :
                        selectedExecution.status === 'failed' ? 'text-red-400' :
                        'text-yellow-400'
                      )}>
                        {selectedExecution.status.toUpperCase()}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <p className="text-gray-400 text-sm mb-1">Duration</p>
                      <p className="text-lg font-semibold text-white">
                        {formatDuration(selectedExecution)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <p className="text-gray-400 text-sm mb-1">Nodes Executed</p>
                      <p className="text-lg font-semibold text-white">
                        {selectedExecution.result?.executedNodes || 0} / {selectedExecution.result?.totalNodes || 0}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <p className="text-gray-400 text-sm mb-1">Started</p>
                      <p className="text-sm font-medium text-white">
                        {formatRelativeTime(selectedExecution.started_at)}
                      </p>
                    </div>
                  </div>

                  {/* Node Results */}
                  <div>
                    <h4 className="text-gray-400 text-sm font-medium mb-3">Node Results</h4>
                    <div className="space-y-3">
                      {selectedExecution.result?.data && Object.entries(selectedExecution.result.data).map(([nodeId, nodeData]: [string, NodeResultData]) => {
                        const isExpanded = expandedNodes.has(nodeId);
                        const hasError = nodeData.error;

                        return (
                          <div
                            key={nodeId}
                            className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                          >
                            {/* Node Header */}
                            <button
                              onClick={() => toggleNode(nodeId)}
                              className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                {hasError ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                                <div className="text-left">
                                  <p className="text-white text-sm font-medium">{nodeId}</p>
                                  {nodeData.data?.[0] && (
                                    <p className="text-xs text-gray-400">
                                      {nodeData.data.length} item{nodeData.data.length !== 1 ? 's' : ''}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {nodeData.executionTime !== undefined && (
                                <span className="text-xs text-gray-400">
                                  {nodeData.executionTime}ms
                                </span>
                              )}
                            </button>

                            {/* Node Content */}
                            {isExpanded && (
                              <div className="border-t border-white/10 p-4 bg-black/20">
                                {hasError ? (
                                  <div className="space-y-4">
                                    {/* Input Data for Failed Node */}
                                    {nodeData.inputData && (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <p className="text-blue-400 text-sm font-medium">Input:</p>
                                          <span className="text-xs text-gray-400">
                                            {Array.isArray(nodeData.inputData) ? nodeData.inputData.length : 1} item{Array.isArray(nodeData.inputData) && nodeData.inputData.length !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                        <pre className="text-xs text-gray-300 bg-blue-950/20 border border-blue-500/20 p-3 rounded overflow-x-auto max-h-[200px] overflow-y-auto">
                                          {JSON.stringify(nodeData.inputData, null, 2)}
                                        </pre>
                                      </div>
                                    )}

                                    {/* Error */}
                                    <div className="space-y-2">
                                      <p className="text-red-400 text-sm font-medium">Error:</p>
                                      <pre className="text-xs text-red-300 bg-red-950/30 p-3 rounded overflow-x-auto">
                                        {nodeData.error.message || JSON.stringify(nodeData.error, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {/* Input Data */}
                                    {nodeData.inputData && (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <p className="text-blue-400 text-sm font-medium">Input:</p>
                                          <span className="text-xs text-gray-400">
                                            {Array.isArray(nodeData.inputData) ? nodeData.inputData.length : 1} item{Array.isArray(nodeData.inputData) && nodeData.inputData.length !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                        <pre className="text-xs text-gray-300 bg-blue-950/20 border border-blue-500/20 p-3 rounded overflow-x-auto max-h-[200px] overflow-y-auto">
                                          {JSON.stringify(nodeData.inputData, null, 2)}
                                        </pre>
                                      </div>
                                    )}

                                    {/* Output Data */}
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <p className="text-green-400 text-sm font-medium">Output:</p>
                                        <span className="text-xs text-gray-400">
                                          {nodeData.data?.[0] ? nodeData.data[0].length : 0} item{nodeData.data?.[0]?.length !== 1 ? 's' : ''}
                                        </span>
                                      </div>
                                      <pre className="text-xs text-gray-300 bg-green-950/20 border border-green-500/20 p-3 rounded overflow-x-auto max-h-[200px] overflow-y-auto">
                                        {JSON.stringify(nodeData.data, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Error Section */}
                  {selectedExecution.error && (
                    <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-red-400 font-medium mb-2">Workflow Error</p>
                          <pre className="text-xs text-red-300 overflow-x-auto">
                            {typeof selectedExecution.error === 'string'
                              ? selectedExecution.error
                              : JSON.stringify(selectedExecution.error, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Input Data */}
                  <div className="bg-white/5 rounded-lg border border-white/10 p-4">
                    <p className="text-gray-400 text-sm font-medium mb-2">Input Data</p>
                    <pre className="text-xs text-gray-300 bg-black/40 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedExecution.input_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {activeView === 'logs' && (
                <div className="space-y-4">
                  <div className="bg-black/40 rounded-lg border border-white/10 p-4 font-mono text-xs">
                    {generateExecutionLogs(selectedExecution).map((log, index) => (
                      <div
                        key={index}
                        className={cn(
                          "py-1",
                          log.includes('❌') ? 'text-red-400' :
                          log.includes('✓') ? 'text-green-400' :
                          'text-gray-300'
                        )}
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeView === 'analysis' && (
                <div className="space-y-6">
                  {(() => {
                    const analysis = generateExecutionAnalysis(selectedExecution);
                    return (
                      <>
                        {/* Analysis Summary */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-green-500/10 rounded-lg border border-green-500/30 p-4">
                            <p className="text-green-400 text-sm mb-1">Successful Nodes</p>
                            <p className="text-2xl font-bold text-green-400">{analysis.successfulNodes}</p>
                          </div>
                          <div className="bg-red-500/10 rounded-lg border border-red-500/30 p-4">
                            <p className="text-red-400 text-sm mb-1">Failed Nodes</p>
                            <p className="text-2xl font-bold text-red-400">{analysis.failedNodes}</p>
                          </div>
                          <div className="bg-cyan-500/10 rounded-lg border border-cyan-500/30 p-4">
                            <p className="text-cyan-400 text-sm mb-1">Success Rate</p>
                            <p className="text-2xl font-bold text-cyan-400">{analysis.successRate}%</p>
                          </div>
                        </div>

                        {/* Issues */}
                        {analysis.issues.length > 0 && (
                          <div>
                            <h4 className="text-gray-400 text-sm font-medium mb-3">Issues Detected</h4>
                            <div className="space-y-2">
                              {analysis.issues.map((issue, index) => (
                                <div
                                  key={index}
                                  className="bg-red-950/30 border border-red-500/30 rounded-lg p-3 flex items-start gap-3"
                                >
                                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                  <p className="text-red-300 text-sm">{issue}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        <div>
                          <h4 className="text-gray-400 text-sm font-medium mb-3">Recommendations</h4>
                          <div className="space-y-2">
                            {analysis.failedNodes > 0 && (
                              <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                                <p className="text-white text-sm">
                                  Review failed nodes and check their configuration or input data.
                                </p>
                              </div>
                            )}
                            {analysis.notExecutedNodes > 0 && (
                              <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                                <p className="text-white text-sm">
                                  {analysis.notExecutedNodes} node(s) were not executed. Check workflow logic and connections.
                                </p>
                              </div>
                            )}
                            {analysis.successRate === 100 && (
                              <div className="bg-green-500/10 rounded-lg border border-green-500/30 p-3">
                                <p className="text-green-400 text-sm">
                                  ✓ All nodes executed successfully!
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Zap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No Execution Selected</p>
              <p className="text-gray-500 text-sm">Select an execution from the history to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
