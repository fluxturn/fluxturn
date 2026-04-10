import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { Database } from "lucide-react";
import { memo } from "react";
import { WorkflowNode } from "../../WorkflowNode";
import { BaseNode, BaseNodeContent } from "../../base/BaseNode";
import { BaseHandle } from "../../base/BaseHandle";

export const SimpleMemoryNode = memo((props: NodeProps) => {
  const { id, data: rawData } = props;
  const data = rawData as Record<string, unknown>;
  const { setNodes, setEdges } = useReactFlow();

  const label = data?.label || "Simple Memory";
  const contextWindowLength = data?.contextWindowLength || 5;
  const description = `Stores ${contextWindowLength} messages in memory`;
  const nodeStatus = data?.status || "initial";

  // Settings button handler
  const handleOpenSettings = () => {
    // No-op: parent will handle opening the config modal
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
      description={description}
      onSettings={handleOpenSettings}
      onDelete={handleDelete}
    >
      <BaseNode
        status={nodeStatus}
        onDoubleClick={handleOpenSettings}
      >
        <BaseNodeContent className="flex-col gap-2">
          {/* Header */}
          <div className="flex items-center gap-3 w-full">
            <Database className="size-5 text-purple-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{label}</p>
              <p className="text-xs text-gray-400 truncate">{description}</p>
            </div>
          </div>

          {/* Output handle */}
          <div className="relative w-full h-12">
            {/* Memory output */}
            <BaseHandle
              id="memory"
              type="source"
              position={Position.Right}
              style={{ top: "50%" }}
              className="!bg-purple-400"
              isConnectable={true}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-purple-400">
              memory
            </span>
          </div>
        </BaseNodeContent>
      </BaseNode>
    </WorkflowNode>
  );
});

SimpleMemoryNode.displayName = "SimpleMemoryNode";
