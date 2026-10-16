import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/*
 * Seto: pillola da 20px, 12/500 (caption). Tre toni di stato più i neutri:
 *   active   → verde salvia (fatto, pagato, attivo)
 *   expiring → ocra (in corso, in scadenza, bozza)
 *   churn    → argilla (scaduto, fuori target, errore)
 *   neutral  → surface-hover (informativo)
 *   outline  → solo bordo `line` (assente / da fare)
 *   action   → il badge di Seto: fill `action` (conteggi)
 * Gli alias shadcn restano validi: default=active, secondary=neutral, destructive=churn.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2 text-[12px] leading-4 font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        active: "bg-status-active-soft text-status-active",
        expiring: "bg-status-expiring-soft text-status-expiring",
        churn: "bg-status-churn-soft text-status-churn",
        neutral: "bg-secondary text-foreground",
        outline: "border-line bg-card text-muted-foreground",
        action: "bg-primary text-primary-foreground",
        default: "bg-status-active-soft text-status-active",
        secondary: "bg-secondary text-foreground",
        destructive: "bg-status-churn-soft text-status-churn",
        ghost: "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

type BadgeProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Pallino colorato prima del testo. */
    dot?: boolean
  }

function Badge({ className, variant = "neutral", dot = false, render, children, ...props }: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        children: dot ? (
          <>
            <span aria-hidden className="size-1.5 rounded-full bg-current opacity-85" />
            {children}
          </>
        ) : (
          children
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
