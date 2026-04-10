import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIAgentExecutionPanel, type AgentExecutionResult } from './panels/AIAgentExecutionPanel';

interface NodeResultData {
  error?: { message?: string };
  data?: unknown[][];
  inputData?: unknown;
  executionTime?: number;
  intermediateSteps?: unknown;
  finishReason?: string;
  toolCalls?: unknown[];
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

interface ExecutionResultsPanelProps {
  result: ExecutionResult | null;
  onClose: () => void;
}

export function ExecutionResultsPanel({ result, onClose }: ExecutionResultsPanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  if (!result) return null;

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = () => {
    if (!result.started_at || !result.completed_at) return 'N/A';
    const start = new Date(result.started_at).getTime();
    const end = new Date(result.completed_at).getTime();
    const duration = end - start;
    return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(2)}s`;
  };

  return (
    <div className="fixed right-0 top-14 bottom-0 w-[500px] glass border-l border-white/10 flex flex-col z-50 animate-in slide-in-from-right">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {getStatusIcon(result.status)}
          <div>
            <h3 className="text-white font-medium">Execution Results</h3>
            <p className="text-xs text-gray-400">Execution #{result.execution_number}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="border-b border-white/10 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Status:</span>
          <span className={cn(
            "font-medium",
            result.status === 'completed' ? 'text-green-500' :
            result.status === 'failed' ? 'text-red-500' :
            'text-yellow-500'
          )}>
            {result.status.toUpperCase()}
          </span>
        </div>

        {result.result && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Nodes Executed:</span>
            <span className="text-white">
              {result.result.executedNodes} / {result.result.totalNodes}
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Duration:</span>
          <span className="text-white">{formatDuration()}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Started:</span>
          <span className="text-white text-xs">{formatDate(result.started_at)}</span>
        </div>

        {result.completed_at && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Completed:</span>
            <span className="text-white text-xs">{formatDate(result.completed_at)}</span>
          </div>
        )}
      </div>

      {/* Node Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h4 className="text-gray-400 text-sm font-medium mb-3">Node Results</h4>

        {result.result?.data && Object.entries(result.result.data).map(([nodeId, nodeData]: [string, NodeResultData]) => {
          const isExpanded = expandedNodes.has(nodeId);
          const hasError = nodeData.error;
          // Check if this is an AI Agent node by looking for agent-specific data
          const firstItem = nodeData.data?.[0]?.[0] as Record<string, unknown> | undefined;
          const isAIAgentNode = firstItem?.intermediateSteps !== undefined ||
                                firstItem?.finishReason !== undefined ||
                                firstItem?.toolCalls !== undefined ||
                                nodeId.toLowerCase().includes('ai_agent') ||
                                nodeId.toLowerCase().includes('aiagent');

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
                  {isAIAgentNode ? (
                    <Brain className="w-4 h-4 text-teal-500" />
                  ) : hasError ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">{nodeId}</p>
                    {isAIAgentNode ? (
                      <p className="text-xs text-teal-400">AI Agent</p>
                    ) : nodeData.data?.[0] && (
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
                <div className="border-t border-white/10 bg-black/20">
                  {isAIAgentNode && nodeData.data?.[0]?.[0] ? (
                    /* AI Agent specialized panel */
                    <AIAgentExecutionPanel
                      result={nodeData.data[0][0] as AgentExecutionResult}
                      className="max-h-[500px] overflow-y-auto"
                    />
                  ) : hasError ? (
                    <div className="space-y-4 p-4">
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
                    <div className="space-y-4 p-4">
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

        {/* Error Section */}
        {result.error && (
          <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-medium mb-2">Workflow Error</p>
                <pre className="text-xs text-red-300 overflow-x-auto">
                  {typeof result.error === 'string'
                    ? result.error
                    : JSON.stringify(result.error, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Input Data Section */}
        <div className="bg-white/5 rounded-lg border border-white/10 p-4">
          <p className="text-gray-400 text-sm font-medium mb-2">Input Data</p>
          <pre className="text-xs text-gray-300 bg-black/40 p-3 rounded overflow-x-auto">
            {JSON.stringify(result.input_data, null, 2)}
          </pre>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-4 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
        >
          Close
        </button>
        <button
          onClick={() => {
            // console.log('Full execution result:', result);
          }}
          className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition-colors"
        >
          Log to Console
        </button>
      </div>
    </div>
  );
}
