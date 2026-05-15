import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const ScrollArea = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('overflow-auto', className)} {...props} />
  )
)
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
