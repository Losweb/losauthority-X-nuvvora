"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-5 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

/*
 * Seto: `default` è il segmented control a pillola (fondo surface-hover, voce attiva = pillola
 * surface-active con shadow-active, come la voce di menu); `line` è la barra della scheda cliente
 * (testo grigio, attivo nero con riga sotto).
 */
const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "rounded-full bg-muted p-1 group-data-horizontal/tabs:h-10",
        line: "w-full justify-start gap-0.5 overflow-x-auto rounded-none border-b border-line bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center gap-2 border border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // default (segmented, a pillola)
        "group-data-[variant=default]/tabs-list:h-full group-data-[variant=default]/tabs-list:flex-1 group-data-[variant=default]/tabs-list:rounded-full group-data-[variant=default]/tabs-list:px-4 group-data-[variant=default]/tabs-list:py-1 group-data-[variant=default]/tabs-list:data-active:bg-surface-active group-data-[variant=default]/tabs-list:data-active:font-semibold group-data-[variant=default]/tabs-list:data-active:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm",
        // line (scheda cliente)
        "group-data-[variant=line]/tabs-list:-mb-px group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-0 group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:px-3.5 group-data-[variant=line]/tabs-list:pt-2.5 group-data-[variant=line]/tabs-list:pb-[11px] group-data-[variant=line]/tabs-list:text-sm group-data-[variant=line]/tabs-list:data-active:border-b-foreground group-data-[variant=line]/tabs-list:data-active:font-semibold group-data-[variant=line]/tabs-list:data-active:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
