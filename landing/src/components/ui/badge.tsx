import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// shadcn/ui Badge в стиле «Контракт»: моноширинная метка в рамке
const badgeVariants = cva("", {
  variants: {
    variant: {
      outline: "tag",
      solid: "tag tag-solid",
      sample: "sample",
    },
  },
  defaultVariants: { variant: "outline" },
})

function Badge({ className, variant, asChild = false, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
