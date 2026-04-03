import { useState, useEffect } from "react";
import {
  Brain,
  Wrench,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Zap,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * IntermediateStep - Represents a single step in agent execution
 */
interface IntermediateStep {
  step: number;
  type: "thought" | "tool_call" | "tool_result" | "observation";
  content: string;
  toolCall?: {
    id: string;
    name: string;
    arguments: Record<string, any>;
  };
  toolResult?: {
    success: boolean;
    data?: any;
    error?: string;
    durationMs?: number;
  };
  timestamp: string;
}

/**
 * AgentExecutionResult - The complete result from AI Agent execution
 */
interface AgentExecutionResult {
  response: string;
  success: boolean;
  iterations: number;
  toolCalls: any[];
  toolResults: any[];
  intermediateSteps?: IntermediateStep[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "complete" | "max_iterations" | "error";
  error?: {
    type: string;
    message: string;
    details?: any;
  };
  durationMs: number;
}

interface AIAgentExecutionPanelProps {
  /** The execution result from the AI Agent */
  result?: AgentExecutionResult;
  /** Whether the agent is currently executing */
  isExecuting?: boolean;
  /** Current iteration number (for live updates) */
  currentIteration?: number;
  /** Max iterations configured */
  maxIterations?: number;
  /** Class name for styling */
  className?: string;
}

/**
 * AIAgentExecutionPanel
 *
 * Displays the execution progress and results of an AI Agent.
 * Shows intermediate steps, tool calls, and final response.
 */
export function AIAgentExecutionPanel({
  result,
  isExecuting = false,
  currentIteration = 0,
  maxIterations = 10,
  className,
}: AIAgentExecutionPanelProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // Auto-expand latest step when executing
  useEffect(() => {
    if (isExecuting && result?.intermediateSteps) {
      const latestStep = result.intermediateSteps.length;
      setExpandedSteps((prev) => new Set([...prev, latestStep]));
    }
  }, [isExecuting, result?.intermediateSteps?.length]);

  const toggleStep = (step: number) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(step)) {
        newSet.delete(step);
      } else {
        newSet.add(step);
      }
      return newSet;
    });
  };

  if (!result && !isExecuting) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-gray-500",
          className
        )}
      >
        <Brain className="size-12 mb-4 opacity-50" />
        <p className="text-sm">No execution data yet</p>
        <p className="text-xs mt-1">Run the workflow to see agent execution</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              isExecuting ? "bg-blue-500/20" : result?.success ? "bg-green-500/20" : "bg-red-500/20"
            )}
          >
            {isExecuting ? (
              <Loader2 className="size-5 text-blue-400 animate-spin" />
            ) : result?.success ? (
              <CheckCircle2 className="size-5 text-green-400" />
            ) : (
              <XCircle className="size-5 text-red-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {isExecuting ? "Agent Executing..." : result?.success ? "Execution Complete" : "Execution Failed"}
            </h3>
            <p className="text-xs text-gray-400">
              {isExecuting
                ? `Iteration ${currentIteration}/${maxIterations}`
                : `Completed in ${result?.iterations || 0} iteration${(result?.iterations || 0) !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Stats */}
        {result && !isExecuting && (
          <div className="flex gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              {(result.durationMs / 1000).toFixed(2)}s
            </div>
            <div className="flex items-center gap-1">
              <Zap className="size-3" />
              {result.usage.totalTokens} tokens
            </div>
            <div className="flex items-center gap-1">
              <Wrench className="size-3" />
              {result.toolCalls.length} tool{result.toolCalls.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar (when executing) */}
      {isExecuting && (
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentIteration / maxIterations) * 100}%` }}
          />
        </div>
      )}

      {/* Intermediate Steps */}
      {result?.intermediateSteps && result.intermediateSteps.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <MessageSquare className="size-4" />
            Execution Steps
          </h4>
          <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto">
            {result.intermediateSteps.map((step, index) => (
              <StepItem
                key={index}
                step={step}
                isExpanded={expandedSteps.has(step.step)}
                onToggle={() => toggleStep(step.step)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {result?.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
            <XCircle className="size-4" />
            Error: {result.error.type}
          </h4>
          <p className="text-xs text-red-300 mt-1">{result.error.message}</p>
        </div>
      )}

      {/* Final Response */}
      {result?.response && !isExecuting && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Final Response</h4>
          <p className="text-sm text-white whitespace-pre-wrap">{result.response}</p>
        </div>
      )}
    </div>
  );
}

/**
 * StepItem - Renders a single intermediate step
 */
function StepItem({
  step,
  isExpanded,
  onToggle,
}: {
  step: IntermediateStep;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const getStepIcon = () => {
    switch (step.type) {
      case "thought":
        return <Brain className="size-4 text-teal-400" />;
      case "tool_call":
        return <Wrench className="size-4 text-orange-400" />;
      case "tool_result":
        return step.toolResult?.success ? (
          <CheckCircle2 className="size-4 text-green-400" />
        ) : (
          <XCircle className="size-4 text-red-400" />
        );
      case "observation":
        return <MessageSquare className="size-4 text-blue-400" />;
      default:
        return <Zap className="size-4 text-gray-400" />;
    }
  };

  const getStepLabel = () => {
    switch (step.type) {
      case "thought":
        return "Thinking";
      case "tool_call":
        return `Tool Call: ${step.toolCall?.name || "Unknown"}`;
      case "tool_result":
        return `Tool Result${step.toolResult?.durationMs ? ` (${step.toolResult.durationMs}ms)` : ""}`;
      case "observation":
        return "Observation";
      default:
        return `Step ${step.step}`;
    }
  };

  const getStepBgColor = () => {
    switch (step.type) {
      case "thought":
        return "bg-teal-500/10 border-teal-500/20";
      case "tool_call":
        return "bg-orange-500/10 border-orange-500/20";
      case "tool_result":
        return step.toolResult?.success
          ? "bg-green-500/10 border-green-500/20"
          : "bg-red-500/10 border-red-500/20";
      case "observation":
        return "bg-blue-500/10 border-blue-500/20";
      default:
        return "bg-gray-700/50 border-gray-600";
    }
  };

  return (
    <div className={cn("border rounded-lg", getStepBgColor())}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white/5 transition-colors rounded-lg"
      >
        {isExpanded ? (
          <ChevronDown className="size-4 text-gray-400" />
        ) : (
          <ChevronRight className="size-4 text-gray-400" />
        )}
        {getStepIcon()}
        <span className="text-xs font-medium text-gray-200 flex-1">
          {getStepLabel()}
        </span>
        <span className="text-[10px] text-gray-500">
          {new Date(step.timestamp).toLocaleTimeString()}
        </span>
      </button>

      {isExpanded && (
        <div className="px-8 pb-3 pt-1">
          {step.type === "tool_call" && step.toolCall && (
            <div className="text-xs">
              <p className="text-gray-400 mb-1">Arguments:</p>
              <pre className="bg-gray-900/50 rounded p-2 overflow-x-auto text-gray-300">
                {JSON.stringify(step.toolCall.arguments, null, 2)}
              </pre>
            </div>
          )}

          {step.type === "tool_result" && step.toolResult && (
            <div className="text-xs">
              <p className="text-gray-400 mb-1">
                {step.toolResult.success ? "Result:" : "Error:"}
              </p>
              <pre
                className={cn(
                  "rounded p-2 overflow-x-auto",
                  step.toolResult.success
                    ? "bg-gray-900/50 text-gray-300"
                    : "bg-red-900/30 text-red-300"
                )}
              >
                {step.toolResult.success
                  ? JSON.stringify(step.toolResult.data, null, 2)
                  : step.toolResult.error}
              </pre>
            </div>
          )}

          {(step.type === "thought" || step.type === "observation") && (
            <p className="text-xs text-gray-300 whitespace-pre-wrap">
              {step.content}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default AIAgentExecutionPanel;
