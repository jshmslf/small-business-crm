import * as React from "react"
import { cn } from "@/src/lib/utils"

/** Shared look for text inputs, textareas and selects. */
export const controlClasses = cn(
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white text-base text-gray-900 shadow-xs transition-[color,box-shadow,border-color] outline-none md:text-sm",
  "placeholder:text-gray-500 selection:bg-brand-100",
  "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
  "focus-visible:border-brand-300 focus-visible:ring-4 focus-visible:ring-brand-100",
  "aria-invalid:border-error-600 aria-invalid:focus-visible:ring-error-50"
)

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        controlClasses,
        "h-10 px-3.5 py-2 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
}

export { Input }
