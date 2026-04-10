import { type NodeProps, type Node } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseActionNode } from "../../base/BaseActionNode";
import { Code } from "lucide-react";

interface CodeNodeData {
  code?: string;
  [key: string]: unknown;
}

type CodeNodeType = Node<CodeNodeData>;

export const CodeNode = memo((props: NodeProps<CodeNodeType>) => {
  const [, setDialogOpen] = useState(false);
  const nodeStatus = "initial";

  const handleOpenSettings = () => setDialogOpen(true);

  const description = props.data?.code
    ? "Code configured"
    : "Not configured";

  return (
    <BaseActionNode
      {...props}
      icon={Code}
      name="Run Code"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

CodeNode.displayName = "CodeNode";
