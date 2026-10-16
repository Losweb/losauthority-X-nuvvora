import * as React from "react"
import { cn } from "cn"

/* Seto: area di testo morbida (radius-lg) su surface-raised, bordo `line`, anello pieno al focus. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full resize-y rounded-lg border border-line bg-card px-4 py-3 text-base leading-relaxed text-foreground transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground hover:border-border-strong focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:outline-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
