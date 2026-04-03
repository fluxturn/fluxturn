import { type NodeProps, type Node } from "@xyflow/react";
import { memo } from "react";
import { BaseTriggerNode } from "../../base/BaseTriggerNode";
import { FileText } from "lucide-react";

interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormTriggerNodeData {
  formTitle?: string;
  formDescription?: string;
  formFields?: FormField[];
  submitButtonText?: string;
  successMessage?: string;
  [key: string]: unknown;
}

type FormTriggerNodeType = Node<FormTriggerNodeData>;

export const FormTriggerNode = memo((props: NodeProps<FormTriggerNodeType>) => {
  const nodeStatus = (props.data as any)?.status || "initial";

  const description = props.data?.formTitle
    ? `${props.data.formTitle} (${props.data.formFields?.length || 0} fields)`
    : "Not configured";

  // Settings button handler - parent will handle opening modal via click event
  const handleOpenSettings = () => {
    // No-op: parent's handleNodeClick will handle opening the config modal
  };

  return (
    <BaseTriggerNode
      {...props}
      icon={FileText}
      name="On Form Submission"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );
});

FormTriggerNode.displayName = "FormTriggerNode";
