import { Handle, type HandleProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export const BaseHandle = ({ className, ...props }: HandleProps) => {
  return (
    <Handle
      {...props}
      className={cn(
        "!size-2 !border-2 !border-background !bg-primary hover:!bg-primary/80 transition-colors",
        className,
      )}
    />
  );
};
