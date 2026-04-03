import { type NodeProps, Position, useReactFlow, useEdges } from "@xyflow/react";
import { Brain, Bot, Database, Wrench, Zap, ChevronRight } from "lucide-react";
import { memo, useMemo } from "react";
import { WorkflowNode } from "../../WorkflowNode";
import { BaseNode, BaseNodeContent } from "../../base/BaseNode";
import { LabeledHandle, HandleSection } from "../../base/LabeledHandle";

// Agent type labels for display
const AGENT_TYPE_LABELS: Record<string, string> = {
  toolsAgent: "Tools Agent",
  conversational: "Conversational",
  react: "ReAct Agent",
};

export const AIAgentNode = memo((props: NodeProps) => {
  const { id, data: rawData } = props;
  const data = rawData as any;
  const { setNodes, setEdges } = useReactFlow();
  const edges = useEdges();

  const label = data?.label || "AI Agent";
  const systemPrompt = data?.systemPrompt || "";
  const agentType = data?.agentType || "toolsAgent";
  const maxIterations = data?.maxIterations || 10;
  const nodeStatus = data?.status || "initial";

  // Check which handles are connected
  const connections = useMemo(() => {
    const connectedHandles = new Set<string>();
    edges.forEach((edge) => {
      if (edge.target === id && edge.targetHandle) {
        connectedHandles.add(edge.targetHandle);
      }
    });
    return {
      model: connectedHandles.has("chatModel"),
      memory: connectedHandles.has("memory"),
      tools: connectedHandles.has("tools"),
      data: connectedHandles.has("main"),
    };
  }, [edges, id]);

  // Count connected tools
  const toolsCount = useMemo(() => {
    return edges.filter(
      (edge) => edge.target === id && edge.targetHandle === "tools"
    ).length;
  }, [edges, id]);

  // Format system prompt preview
  const promptPreview = systemPrompt
    ? `"${systemPrompt.substring(0, 50)}${systemPrompt.length > 50 ? "..." : ""}"`
    : "No system prompt configured";

  // Settings button handler
  const handleOpenSettings = () => {
    // No-op: parent's handleNodeClick will handle opening the config modal
  };

  const handleDelete = () => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== id));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== id && edge.target !== id)
    );
  };

  return (
    <WorkflowNode
      name={label}
      description="AI Agent"
      onSettings={handleOpenSettings}
      onDelete={handleDelete}
    >
      <BaseNode status={nodeStatus} onDoubleClick={handleOpenSettings}>
        <BaseNodeContent className="flex-col gap-0 p-0 min-w-[280px]">
          {/* Header with gradient background */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-teal-500/20 to-cyan-500/10 border-b border-white/5 rounded-t-lg">
            <div className="p-2 bg-teal-500/20 rounded-lg">
              <Brain className="size-5 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white truncate">
                  {label}
                </p>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-teal-500/20 text-teal-300 rounded-full">
                  {AGENT_TYPE_LABELS[agentType] || "Tools Agent"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Max {maxIterations} iterations
              </p>
            </div>
          </div>

          {/* System Prompt Preview */}
          <div className="px-4 py-2 border-b border-white/5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              System Prompt
            </p>
            <p className="text-xs text-gray-400 italic line-clamp-2">
              {promptPreview}
            </p>
          </div>

          {/* Connection Status */}
          <div className="px-4 py-2 flex gap-3 border-b border-white/5">
            {/* Model Status */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${
                connections.model
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-gray-700/50 text-gray-500"
              }`}
            >
              <Bot className="size-3" />
              <span className="text-[10px] font-medium">
                {connections.model ? "Model" : "No Model"}
              </span>
            </div>

            {/* Memory Status */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${
                connections.memory
                  ? "bg-purple-500/20 text-purple-300"
                  : "bg-gray-700/50 text-gray-500"
              }`}
            >
              <Database className="size-3" />
              <span className="text-[10px] font-medium">
                {connections.memory ? "Memory" : "No Memory"}
              </span>
            </div>

            {/* Tools Status */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${
                toolsCount > 0
                  ? "bg-orange-500/20 text-orange-300"
                  : "bg-gray-700/50 text-gray-500"
              }`}
            >
              <Wrench className="size-3" />
              <span className="text-[10px] font-medium">
                {toolsCount > 0 ? `${toolsCount} Tool${toolsCount > 1 ? "s" : ""}` : "No Tools"}
              </span>
            </div>
          </div>

          {/* Input/Output Handles Section */}
          <div className="relative px-4 py-3">
            {/* Left side - Input handles */}
            <HandleSection className="gap-3">
              <LabeledHandle
                id="main"
                type="target"
                position={Position.Left}
                label="Input Data"
                color="gray"
                required
                connected={connections.data}
                icon={<ChevronRight className="size-3" />}
                style={{ left: "-12px" }}
              />
              <LabeledHandle
                id="chatModel"
                type="target"
                position={Position.Left}
                label="Chat Model"
                color="blue"
                required
                connected={connections.model}
                icon={<Bot className="size-3" />}
                style={{ left: "-12px" }}
              />
              <LabeledHandle
                id="memory"
                type="target"
                position={Position.Left}
                label="Memory"
                color="purple"
                connected={connections.memory}
                icon={<Database className="size-3" />}
                style={{ left: "-12px" }}
              />
              <LabeledHandle
                id="tools"
                type="target"
                position={Position.Left}
                label={toolsCount > 0 ? `Tools (${toolsCount})` : "Tools"}
                color="orange"
                connected={toolsCount > 0}
                icon={<Wrench className="size-3" />}
                style={{ left: "-12px" }}
              />
            </HandleSection>

            {/* Right side - Output handle */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <LabeledHandle
                id="output"
                type="source"
                position={Position.Right}
                label="Output"
                color="green"
                connected={true}
                icon={<Zap className="size-3" />}
                style={{ right: "-12px" }}
              />
            </div>
          </div>
        </BaseNodeContent>
      </BaseNode>
    </WorkflowNode>
  );
});

AIAgentNode.displayName = "AIAgentNode";
