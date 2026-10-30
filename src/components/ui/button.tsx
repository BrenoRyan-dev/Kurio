import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const variants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-fg hover:bg-[#e9a566]',
        ghost: 'text-accent hover:underline',
        outline: 'border border-accent text-accent hover:bg-accent/10',
      },
      size: { default: 'h-12 px-6 rounded-[4px]', sm: 'h-9 px-3 rounded-[4px]', icon: 'h-9 w-9 rounded-full' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...p }, ref) => {
  const C = asChild ? Slot : 'button'
  return <C ref={ref} className={cn(variants({ variant, size }), className)} {...p} />
})
Button.displayName = 'Button'
