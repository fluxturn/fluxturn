import { type NodeProps, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { Database } from "lucide-react";

interface DatabaseNodeData {
  connection?: string;
  query?: string;
  [key: string]: unknown;
}

type DatabaseNodeType = Node<DatabaseNodeData>;

export const DatabaseNode = memo((props: NodeProps<DatabaseNodeType>) => {
  const [, setDialogOpen] = useState(false);
  const nodeStatus = "initial";

  const handleOpenSettings = () => setDialogOpen(true);

  const description = props.data?.connection
    ? `Query: ${props.data.connection}`
    : "Not configured";

  return (
    <BaseActionNode
      {...props}
      icon={Database}
      name="Database Query"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

DatabaseNode.displayName = "DatabaseNode";
