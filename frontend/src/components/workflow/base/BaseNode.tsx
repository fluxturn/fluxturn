import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";
import { NodeStatus } from "./NodeStatusIndicator";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

interface BaseNodeProps extends HTMLAttributes<HTMLDivElement> {
  status?: NodeStatus;
}

export const BaseNode = forwardRef<HTMLDivElement, BaseNodeProps>(
  ({ className, status, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative rounded-lg border-2 border-gray-700 bg-gray-900/90 backdrop-blur-sm text-white hover:bg-gray-800/90 transition-all shadow-xl min-w-[160px]",
        status === "loading" && "border-blue-500",
        status === "success" && "border-green-500",
        status === "error" && "border-red-500",
        className,
      )}
      tabIndex={0}
      {...props}
    >
      {children}

      {/* Loading Overlay - Prominent animation in center */}
      {status === "loading" && (
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] rounded-lg flex items-center justify-center z-10">
          <Loader2 className="size-8 text-blue-400 stroke-[2.5] animate-spin" />
        </div>
      )}

      {/* Status Indicators - Small icons in corner */}
      {status === "error" && (
        <XCircle className="absolute right-1 bottom-1 size-3 text-red-500 stroke-[3]" />
      )}
      {status === "success" && (
        <CheckCircle2 className="absolute right-1 bottom-1 size-3 text-green-500 stroke-[3]" />
      )}
    </div>
  )
);
BaseNode.displayName = "BaseNode";

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export const BaseNodeHeader = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, children, ...props }, ref) => (
    <header
      ref={ref}
      {...props}
      className={cn(
        "flex flex-row items-center justify-between gap-2 px-4 py-3 border-b border-gray-700",
        className,
      )}
    >
      {children}
    </header>
  )
);
BaseNodeHeader.displayName = "BaseNodeHeader";

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export const BaseNodeHeaderTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    data-slot="base-node-title"
    className={cn("select-none flex-1 font-semibold text-sm", className)}
    {...props}
  >
    {children}
  </h3>
));
BaseNodeHeaderTitle.displayName = "BaseNodeHeaderTitle";

export const BaseNodeContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="base-node-content"
      className={cn("flex flex-col gap-y-2 p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
);
BaseNodeContent.displayName = "BaseNodeContent";

export const BaseNodeFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="base-node-footer"
      className={cn("flex flex-col items-center gap-y-2 border-t border-gray-700 px-4 pb-4 pt-3", className)}
      {...props}
    >
      {children}
    </div>
  )
);
BaseNodeFooter.displayName = "BaseNodeFooter";
