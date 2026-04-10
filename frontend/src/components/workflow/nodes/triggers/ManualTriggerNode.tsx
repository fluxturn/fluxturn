import { type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { BaseTriggerNode } from "../../base/BaseTriggerNode";
import { MousePointerClick } from "lucide-react";

export const ManualTriggerNode = memo((props: NodeProps) => {
  const { data } = props;

  const handleOpenSettings = () => {
    // No-op: parent's handleNodeClick will handle opening the config modal
  };

  return (
    <BaseTriggerNode
      {...props}
      icon={MousePointerClick}
      name="Manual Trigger"
      description="Click to execute"
      status={(data as Record<string, unknown>).status as string || 'initial'}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

ManualTriggerNode.displayName = "ManualTriggerNode";
