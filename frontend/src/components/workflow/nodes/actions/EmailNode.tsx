import { type NodeProps, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { Mail } from "lucide-react";

interface EmailNodeData {
  to?: string;
  subject?: string;
  body?: string;
  [key: string]: unknown;
}

type EmailNodeType = Node<EmailNodeData>;

export const EmailNode = memo((props: NodeProps<EmailNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const nodeStatus = "initial";

  const handleOpenSettings = () => setDialogOpen(true);

  const description = props.data?.to
    ? `To: ${props.data.to}`
    : "Not configured";

  return (
    <BaseActionNode
      {...props}
      icon={Mail}
      name="Send Email"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

EmailNode.displayName = "EmailNode";
