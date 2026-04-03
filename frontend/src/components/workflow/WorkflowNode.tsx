import { NodeToolbar, Position } from "@xyflow/react";
import { Settings, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../ui/button";

interface WorkflowNodeProps {
  children: ReactNode;
  showToolbar?: boolean;
  onDelete?: () => void;
  onSettings?: () => void;
  name?: string;
  description?: string;
}

export function WorkflowNode({
  children,
  showToolbar = true,
  onDelete,
  onSettings,
  name,
  description,
}: WorkflowNodeProps) {
  return (
    <>
      {showToolbar && (
        <NodeToolbar
          position={Position.Top}
          className="flex gap-1 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-1 shadow-lg"
        >
          {onSettings && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                // Don't stop propagation - let parent handle opening config modal
                onSettings();
              }}
              className="h-8 w-8 p-0 hover:bg-gray-800 text-gray-300 hover:text-white"
            >
              <Settings className="size-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-8 w-8 p-0 hover:bg-red-900/50 text-gray-300 hover:text-red-400"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </NodeToolbar>
      )}
      {children}
    </>
  );
}
