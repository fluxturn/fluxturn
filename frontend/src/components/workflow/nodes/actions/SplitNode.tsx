import { type NodeProps, type Node, Position, useReactFlow } from "@xyflow/react";
import { memo } from "react";
import { Split } from "lucide-react";
import { BaseNode, BaseNodeContent } from "../../base/BaseNode";
import { BaseHandle } from "../../base/BaseHandle";
import { WorkflowNode } from "../../WorkflowNode";

interface SplitNodeData {
  mode?: string;
  numberOfOutputs?: number;
  fieldName?: string;
  chunkSize?: number;
  [key: string]: unknown;
}

type SplitNodeType = Node<SplitNodeData>;

export const SplitNode = memo((props: NodeProps<SplitNodeType>) => {
  const { id, data } = props;
  const { setNodes, setEdges } = useReactFlow();

  const numberOfOutputs = data?.numberOfOutputs || 2;
  const mode = data?.mode || "duplicate";
  const fieldName = data?.fieldName;
  const chunkSize = data?.chunkSize;

  const handleDelete = () => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== id));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== id && edge.target !== id)
    );
  };

  const getDescription = () => {
    switch (mode) {
      case "duplicate":
        return `Duplicate to ${numberOfOutputs} outputs`;
      case "splitByCondition":
        return "Split by conditions";
      case "splitEvenly":
        return `Split evenly to ${numberOfOutputs} outputs`;
      case "splitByField":
        return fieldName ? `Split by ${fieldName}` : "Split by field";
      case "splitBySize":
        return chunkSize ? `Chunks of ${chunkSize}` : "Split by size";
      default:
        return "Not configured";
    }
  };

  return (
    <WorkflowNode
      name="Split"
      description={getDescription()}
      onDelete={handleDelete}
    >
      <BaseNode status="initial">
        <BaseNodeContent className="flex-row items-center gap-3">
          <Split className="size-5 text-teal-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Split</p>
            <p className="text-xs text-gray-400 truncate">{getDescription()}</p>
          </div>

          {/* Single input handle */}
          <BaseHandle id="target-1" type="target" position={Position.Left} />

          {/* Multiple output handles based on numberOfOutputs */}
          {Array.from({ length: numberOfOutputs }).map((_, index) => (
            <BaseHandle
              key={`output-${index}`}
              id={`source-${index + 1}`}
              type="source"
              position={Position.Right}
              style={{
                top: `${((index + 1) / (numberOfOutputs + 1)) * 100}%`,
              }}
            />
          ))}
        </BaseNodeContent>
      </BaseNode>
    </WorkflowNode>
  );
});

SplitNode.displayName = "SplitNode";
