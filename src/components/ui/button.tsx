import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/src/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border border-brand-600 bg-brand-600 text-white shadow-xs hover:border-brand-700 hover:bg-brand-700",
        secondary:
          "border border-gray-300 bg-white text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-800",
        destructive:
          "border border-gray-300 bg-white text-error-700 shadow-xs hover:border-error-200 hover:bg-error-50 focus-visible:ring-error-50",
        "destructive-solid":
          "border border-error-600 bg-error-600 text-white shadow-xs hover:border-error-700 hover:bg-error-700 focus-visible:ring-error-50",
        success:
          "border border-success-600 bg-success-600 text-white shadow-xs hover:border-success-700 hover:bg-success-700 focus-visible:ring-success-50",
        ghost: "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
        link: "h-auto px-0 text-brand-700 underline-offset-4 hover:text-brand-800 hover:underline has-[>svg]:px-0",
      },
      size: {
        default: "h-10 px-4 has-[>svg]:px-3.5",
        xs: "h-7 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-3",
        lg: "h-11 px-[18px] text-base",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
