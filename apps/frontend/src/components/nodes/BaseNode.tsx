import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNodeColor } from '@/lib/node-theme'
import type { ExecutionStatus } from '@flowcraft/shared'

export interface BaseNodeData {
  label: string
  status?: ExecutionStatus
  [key: string]: unknown
}

export interface BaseNodeProps extends NodeProps {
  icon: LucideIcon
  children?: React.ReactNode
}

const statusStyles: Record<string, string> = {
  idle: 'border-neutral-300',
  pending: 'border-neutral-300',
  running: 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  completed: 'border-blue-500',
  failed: 'border-red-500',
  skipped: 'border-neutral-400 opacity-60',
}

const statusDotStyles: Record<string, string> = {
  idle: 'bg-neutral-300',
  pending: 'bg-neutral-300',
  running: 'bg-green-500 animate-pulse',
  completed: 'bg-blue-500',
  failed: 'bg-red-500',
  skipped: 'bg-neutral-400',
}

const BaseNode = memo(function BaseNode({ icon: Icon, children, data, selected, type }: BaseNodeProps) {
  const nodeData = data as unknown as BaseNodeData
  const status = nodeData.status ?? 'idle'
  const colors = getNodeColor(String(type))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={cn(
          'min-w-[180px] overflow-hidden rounded-lg border-2 bg-white shadow-sm transition-all duration-300',
          statusStyles[status] ?? statusStyles.idle,
          selected && cn('ring-2 ring-offset-1', colors.ring)
        )}
      >
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-neutral-400" />

        <div className="flex">
          <div className={cn('w-1 self-stretch', colors.accent)} />
          <div className="flex-1 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full transition-colors duration-300', statusDotStyles[status] ?? statusDotStyles.idle)} />
              <Icon className="h-4 w-4 text-neutral-600" />
              <span className="text-sm font-medium text-neutral-800">{nodeData.label}</span>
            </div>

            {children && <div className="mt-1.5 text-xs text-neutral-500">{children}</div>}
          </div>
        </div>

        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-neutral-400" />
      </div>
    </motion.div>
  )
})

export { BaseNode }
