import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/*
 * Seto: ogni bottone è una pillola (radius-full), 14/600, alto `control` (40px) o `control-lg` (48px).
 *   default  → l'unico fill forte (`action`), hover più chiaro (brightness 1.15)
 *   outline  → surface-raised con bordo `line` (il "secondary" di Seto)
 *   secondary→ surface-hover
 *   ghost    → trasparente, hover surface-hover
 *   glass    → il bottone della card utente (card-glass-button)
 * Focus da tastiera: anello pieno 2px `focus-ring`, 2px fuori dal controllo.
 * Su schermi touch (pointer-coarse) ogni taglia cresce di 4 px per il pollice.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm leading-5 font-semibold whitespace-nowrap transition-[background-color,color,border-color,filter] duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:brightness-[1.15]",
        outline: "border-line bg-card font-medium text-foreground hover:bg-surface-hover aria-expanded:bg-surface-hover",
        secondary: "bg-secondary font-medium text-secondary-foreground hover:bg-border aria-expanded:bg-secondary",
        ghost: "font-medium text-foreground hover:bg-surface-hover aria-expanded:bg-surface-hover",
        glass: "bg-card-glass-button font-medium text-foreground hover:brightness-[1.03]",
        destructive:
          "border-status-churn/60 bg-transparent text-status-churn hover:bg-status-churn-soft focus-visible:outline-status-churn",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-5 pointer-coarse:h-11 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-2.5 text-xs pointer-coarse:h-8 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3.5 text-[13px] pointer-coarse:h-9 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-6 text-[15px] has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10 pointer-coarse:size-11",
        "icon-xs": "size-7 pointer-coarse:size-8 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 pointer-coarse:size-9 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-12",
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
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
