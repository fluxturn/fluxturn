import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type NodeStatus = "initial" | "loading" | "success" | "error";

interface NodeStatusIndicatorProps {
  status: NodeStatus;
  variant?: "border" | "background";
  className?: string;
  children: ReactNode;
}

export const NodeStatusIndicator = ({
  status,
  variant = "border",
  className,
  children,
}: NodeStatusIndicatorProps) => {
  const borderColors = {
    initial: "border-muted-foreground",
    loading: "border-blue-500",
    success: "border-green-500",
    error: "border-red-500",
  };

  const backgroundColors = {
    initial: "bg-card",
    loading: "bg-blue-500/10",
    success: "bg-green-500/10",
    error: "bg-red-500/10",
  };

  return (
    <div
      className={cn(
        variant === "border" && borderColors[status],
        variant === "background" && backgroundColors[status],
        className,
      )}
    >
      {children}
    </div>
  );
};
