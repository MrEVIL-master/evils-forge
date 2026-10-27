import * as React from "react"
import { cn } from "cn"

// shadcn/ui Card в стиле «Контракт»: поверхность surface-1, тонкая линия, без скругления
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card" className={cn("card-box", className)} {...props} />
}

export { Card }
