import { type NodeProps } from "@xyflow/react";
import { Bot } from "lucide-react";
import { memo } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";

export const OpenAIChatModelNode = memo((props: NodeProps) => {
  const data = props.data as any;

  const model = data?.model || "gpt-4o-mini";
  const description = `${model} model configuration`;
  const nodeStatus = data?.status || "initial";

  // Settings button handler - parent will handle opening modal via click event
  const handleOpenSettings = () => {
    // No-op: parent's handleNodeClick will handle opening the config modal
  };

  return (
    <BaseActionNode
      {...props}
      icon={Bot}
      name="OpenAI Chat Model"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

OpenAIChatModelNode.displayName = "OpenAIChatModelNode";
