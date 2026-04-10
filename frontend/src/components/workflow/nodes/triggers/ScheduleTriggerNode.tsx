import { type NodeProps, type Node } from "@xyflow/react";
import { memo } from "react";
import { BaseTriggerNode } from "../../base/BaseTriggerNode";
import { Clock } from "lucide-react";
import { type NodeStatus } from "../../base/NodeStatusIndicator";

interface ScheduleTriggerNodeData {
  cron?: string;
  timezone?: string;
  [key: string]: unknown;
}

type ScheduleTriggerNodeType = Node<ScheduleTriggerNodeData>;

export const ScheduleTriggerNode = memo((props: NodeProps<ScheduleTriggerNodeType>) => {
  const nodeStatus = (props.data as Record<string, unknown>)?.status as NodeStatus || "initial";

  // Settings button handler - parent will handle opening modal via click event
  const handleOpenSettings = () => {
    // No-op: parent's handleNodeClick will handle opening the config modal
  };

  const description = props.data?.cron
    ? `Every: ${props.data.cron}`
    : "Not configured";

  return (
    <BaseTriggerNode
      {...props}
      icon={Clock}
      name="Schedule"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

ScheduleTriggerNode.displayName = "ScheduleTriggerNode";
