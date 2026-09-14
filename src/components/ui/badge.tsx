import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-teal-600 text-white hover:bg-teal-700 shadow-xs',
        secondary:
          'bg-secondary text-foreground border border-border',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 shadow-xs',
        outline: 'text-foreground border border-border',
        success: 'bg-emerald-600 text-white border border-emerald-600 shadow-xs',
        warning: 'bg-amber-600 text-white border border-amber-600 shadow-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
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
