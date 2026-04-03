import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import { memo, type ReactNode } from "react";
import { BaseNode, BaseNodeContent } from "./BaseNode";
import { BaseHandle } from "./BaseHandle";
import { WorkflowNode } from "../WorkflowNode";
import { type NodeStatus } from "./NodeStatusIndicator";

interface BaseTriggerNodeProps extends NodeProps {
  icon: LucideIcon | string;
  name: string;
  description?: string;
  children?: ReactNode;
  status?: NodeStatus;
  onSettings?: () => void;
  onDoubleClick?: () => void;
}

export const BaseTriggerNode = memo(
  ({
    id,
    icon: Icon,
    name,
    description,
    children,
    status = "initial",
    onSettings,
    onDoubleClick,
  }: BaseTriggerNodeProps) => {
    const { setNodes, setEdges } = useReactFlow();

    const handleDelete = () => {
      setNodes((currentNodes) => currentNodes.filter((node) => node.id !== id));
      setEdges((currentEdges) =>
        currentEdges.filter((edge) => edge.source !== id && edge.target !== id)
      );
    };

    // Truncate description after 3 words
    const truncateDescription = (text: string | undefined, wordLimit: number = 3): string | undefined => {
      if (!text) return text;
      const words = text.trim().split(/\s+/);
      if (words.length <= wordLimit) return text;
      return words.slice(0, wordLimit).join(' ') + '...';
    };

    const truncatedDescription = truncateDescription(description);

    return (
      <WorkflowNode
        name={name}
        description={description}
        onDelete={handleDelete}
        onSettings={onSettings}
      >
        <BaseNode
          status={status}
          onDoubleClick={onDoubleClick}
          className="rounded-l-3xl border-l-4 border-l-cyan-500"
        >
          <BaseNodeContent className="flex-row items-center gap-3">
            {typeof Icon === "string" ? (
              <div className="p-1 bg-white rounded-md flex-shrink-0">
                <img src={Icon} alt={name} className="size-5 object-contain" />
              </div>
            ) : (
              <Icon className="size-5 text-cyan-400" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{name}</p>
              {truncatedDescription && (
                <p
                  className="text-xs text-gray-400 truncate cursor-help"
                  title={description}
                >
                  {truncatedDescription}
                </p>
              )}
            </div>
            {children}
            <BaseHandle id="source-1" type="source" position={Position.Right} />
          </BaseNodeContent>
        </BaseNode>
      </WorkflowNode>
    );
  }
);

BaseTriggerNode.displayName = "BaseTriggerNode";
