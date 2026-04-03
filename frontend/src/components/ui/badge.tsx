import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-purple-500/20 text-purple-300 shadow hover:bg-purple-500/30",
        secondary:
          "border-transparent bg-white/10 text-white/80 hover:bg-white/20",
        destructive:
          "border-transparent bg-red-500/20 text-red-300 shadow hover:bg-red-500/30",
        success:
          "border-transparent bg-emerald-500/20 text-emerald-300 shadow hover:bg-emerald-500/30",
        outline: "border-white/20 text-white/70 hover:bg-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }