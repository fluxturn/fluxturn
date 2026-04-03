import { Handle, type HandleProps, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export type HandleColor =
  | "blue"     // Chat Model
  | "purple"   // Memory
  | "orange"   // Tools
  | "gray"     // Input Data
  | "green"    // Output
  | "teal"     // AI Agent specific
  | "red"      // Error/Required
  | "yellow";  // Warning

const colorClasses: Record<HandleColor, { bg: string; border: string; text: string }> = {
  blue: {
    bg: "!bg-blue-500",
    border: "!border-blue-400",
    text: "text-blue-400",
  },
  purple: {
    bg: "!bg-purple-500",
    border: "!border-purple-400",
    text: "text-purple-400",
  },
  orange: {
    bg: "!bg-orange-500",
    border: "!border-orange-400",
    text: "text-orange-400",
  },
  gray: {
    bg: "!bg-gray-400",
    border: "!border-gray-300",
    text: "text-gray-400",
  },
  green: {
    bg: "!bg-green-500",
    border: "!border-green-400",
    text: "text-green-400",
  },
  teal: {
    bg: "!bg-teal-500",
    border: "!border-teal-400",
    text: "text-teal-400",
  },
  red: {
    bg: "!bg-red-500",
    border: "!border-red-400",
    text: "text-red-400",
  },
  yellow: {
    bg: "!bg-yellow-500",
    border: "!border-yellow-400",
    text: "text-yellow-400",
  },
};

interface LabeledHandleProps extends Omit<HandleProps, 'position'> {
  /** Display label for the handle */
  label: string;
  /** Color theme for the handle */
  color?: HandleColor;
  /** Whether this handle is required */
  required?: boolean;
  /** Whether this handle is currently connected */
  connected?: boolean;
  /** Icon to display next to the label */
  icon?: React.ReactNode;
  /** Position override - defaults based on handle type */
  position?: Position;
}

/**
 * LabeledHandle - A handle with a visible label and color coding
 *
 * Used for AI Agent nodes and other complex nodes that need clear
 * visual indicators for their connection points.
 */
export const LabeledHandle = forwardRef<HTMLDivElement, LabeledHandleProps>(
  (
    {
      type,
      id,
      label,
      color = "gray",
      required = false,
      connected = false,
      icon,
      position,
      className,
      ...props
    },
    ref
  ) => {
    // Default position based on handle type
    const handlePosition = position ?? (type === "source" ? Position.Right : Position.Left);
    const isLeft = handlePosition === Position.Left;
    const colors = colorClasses[color];

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex items-center gap-2",
          isLeft ? "flex-row" : "flex-row-reverse",
          className
        )}
      >
        <Handle
          type={type}
          position={handlePosition}
          id={id}
          className={cn(
            "!w-3 !h-3 !border-2 transition-all",
            connected ? colors.bg : "!bg-gray-700",
            colors.border,
            "hover:scale-110"
          )}
          {...props}
        />
        <span
          className={cn(
            "text-[10px] font-medium flex items-center gap-1 whitespace-nowrap",
            colors.text
          )}
        >
          {icon}
          {label}
          {required && <span className="text-red-400">*</span>}
        </span>
      </div>
    );
  }
);

LabeledHandle.displayName = "LabeledHandle";

/**
 * HandleRow - Container for a single labeled handle with proper spacing
 */
export const HandleRow = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { side?: "left" | "right" }
>(({ className, side = "left", children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex items-center h-6 w-full",
      side === "left" ? "justify-start" : "justify-end",
      className
    )}
    {...props}
  >
    {children}
  </div>
));

HandleRow.displayName = "HandleRow";

/**
 * HandleSection - Container for multiple handle rows
 */
export const HandleSection = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-3 py-2", className)}
    {...props}
  >
    {children}
  </div>
));

HandleSection.displayName = "HandleSection";
