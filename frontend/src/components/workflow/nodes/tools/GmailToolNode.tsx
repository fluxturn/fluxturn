import { type NodeProps, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { Mail } from "lucide-react";

interface GmailToolNodeData {
  operation?: string;
  to?: string;
  subject?: string;
  [key: string]: unknown;
}

type GmailToolNodeType = Node<GmailToolNodeData>;

export const GmailToolNode = memo((props: NodeProps<GmailToolNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const nodeStatus = "initial";

  const handleOpenSettings = () => setDialogOpen(true);

  const getDescription = () => {
    const operation = props.data?.operation || "sendEmail";
    const to = props.data?.to;
    const subject = props.data?.subject;

    if (operation === "sendEmail") {
      if (to && subject) {
        return `Send to ${to.substring(0, 20)}${to.length > 20 ? "..." : ""}`;
      }
      return "Send Email";
    } else if (operation === "getLabels") {
      return "Get Labels";
    }
    return "Not configured";
  };

  return (
    <BaseActionNode
      {...props}
      icon={Mail}
      name="Gmail Tool"
      description={getDescription()}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

GmailToolNode.displayName = "GmailToolNode";
