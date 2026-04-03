import { type NodeProps, type Node, Position, useReactFlow } from "@xyflow/react";
import { memo } from "react";
import { GitMerge } from "lucide-react";
import { BaseNode, BaseNodeContent } from "../../base/BaseNode";
import { BaseHandle } from "../../base/BaseHandle";
import { WorkflowNode } from "../../WorkflowNode";

interface MergeNodeData {
  mode?: string;
  combineBy?: string;
  numberOfInputs?: number;
  [key: string]: unknown;
}

type MergeNodeType = Node<MergeNodeData>;

export const MergeNode = memo((props: NodeProps<MergeNodeType>) => {
  const { id, data } = props;
  const { setNodes, setEdges } = useReactFlow();

  const numberOfInputs = data?.numberOfInputs || 2;
  const mode = data?.mode || "append";
  const combineBy = data?.combineBy;

  const handleDelete = () => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== id));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== id && edge.target !== id)
    );
  };

  const getDescription = () => {
    switch (mode) {
      case "append":
        return `Append ${numberOfInputs} inputs`;
      case "combine":
        if (combineBy === "combineByFields") {
          return "Combine by fields";
        } else if (combineBy === "combineByPosition") {
          return "Combine by position";
        } else if (combineBy === "combineAll") {
          return "Combine all (cross join)";
        }
        return "Combine mode";
      case "combineBySql":
        return "Combine by SQL";
      case "chooseBranch":
        return "Choose branch";
      default:
        return "Not configured";
    }
  };

  return (
    <WorkflowNode
      name="Merge"
      description={getDescription()}
      onDelete={handleDelete}
    >
      <BaseNode status="initial">
        <BaseNodeContent className="flex-row items-center gap-3">
          <GitMerge className="size-5 text-teal-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Merge</p>
            <p className="text-xs text-gray-400 truncate">{getDescription()}</p>
          </div>

          {/* Multiple input handles based on numberOfInputs */}
          {Array.from({ length: numberOfInputs }).map((_, index) => (
            <BaseHandle
              key={`input-${index}`}
              id={`target-${index + 1}`}
              type="target"
              position={Position.Left}
              style={{
                top: `${((index + 1) / (numberOfInputs + 1)) * 100}%`,
              }}
            />
          ))}

          {/* Single output handle */}
          <BaseHandle id="source-1" type="source" position={Position.Right} />
        </BaseNodeContent>
      </BaseNode>
    </WorkflowNode>
  );
});

MergeNode.displayName = "MergeNode";
