import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  title?: string
  children: React.ReactNode
}

export function Sheet({ open, onClose, side = 'right', title, children }: SheetProps) {
  const slideFrom = side === 'right' ? { x: '100%' } : { x: '-100%' }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              'fixed top-0 z-50 flex h-full w-96 flex-col bg-white shadow-xl',
              side === 'right' ? 'right-0' : 'left-0'
            )}
            initial={slideFrom}
            animate={{ x: 0 }}
            exit={slideFrom}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
