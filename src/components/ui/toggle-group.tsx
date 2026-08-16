import * as React from 'react'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import { type VariantProps } from 'class-variance-authority'
import { toggleVariants } from './toggle'
import { cn } from '@/lib/utils'

interface ToggleGroupContextValue extends VariantProps<typeof toggleVariants> {
  stretch?: 'default' | 'stretched'
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: 'default',
  variant: 'default',
  stretch: 'default',
})

type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    /** `none`: items touch, forming one connected group with a shared border. `default`: gap between items, each keeps its own rounded corners. */
    spacing?: 'default' | 'none'
    /** `stretched`: items share the available width evenly instead of just fitting their label. */
    stretch?: 'default' | 'stretched'
  }

function ToggleGroup({ className, variant, size, spacing, stretch, children, ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      className={cn(
        'group/toggle-group flex items-center',
        spacing === 'none' ? 'gap-0 rounded-md border data-[variant=outline]:shadow-xs' : 'gap-2',
        stretch === 'stretched' ? 'w-full' : 'w-fit',
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, stretch }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      className={cn(
        toggleVariants({ variant: context.variant || variant, size: context.size || size }),
        'px-4 min-w-0 shrink-0 focus:z-10 focus-visible:z-10',
        'group-data-[spacing=none]/toggle-group:rounded-none group-data-[spacing=none]/toggle-group:shadow-none group-data-[spacing=none]/toggle-group:first:rounded-l-md group-data-[spacing=none]/toggle-group:last:rounded-r-md group-data-[spacing=none]/toggle-group:data-[variant=outline]:border-l-0 group-data-[spacing=none]/toggle-group:data-[variant=outline]:first:border-l',
        context.stretch === 'stretched' && 'flex-1',
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
