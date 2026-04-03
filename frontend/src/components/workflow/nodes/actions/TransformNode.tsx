import { type NodeProps, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { FileJson } from "lucide-react";

interface TransformNodeData {
  expression?: string;
  [key: string]: unknown;
}

type TransformNodeType = Node<TransformNodeData>;

export const TransformNode = memo((props: NodeProps<TransformNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const nodeStatus = "initial";

  const handleOpenSettings = () => setDialogOpen(true);

  const description = props.data?.expression
    ? "Transform configured"
    : "Not configured";

  return (
    <BaseActionNode
      {...props}
      icon={FileJson}
      name="Transform Data"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

TransformNode.displayName = "TransformNode";
