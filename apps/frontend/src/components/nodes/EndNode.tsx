import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface EndNodeData {
  label: string
  status?: string
  [key: string]: unknown
}

const statusStyles: Record<string, string> = {
  idle: 'border-red-300',
  pending: 'border-red-300',
  running: 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  completed: 'border-blue-500',
  failed: 'border-red-500',
  skipped: 'border-neutral-400 opacity-60',
}

const EndNode = memo(function EndNode(props: NodeProps) {
  const data = props.data as unknown as EndNodeData
  const status = data.status ?? 'idle'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={cn(
          'min-w-[140px] overflow-hidden rounded-lg border-2 bg-red-50 shadow-sm transition-all duration-300',
          statusStyles[status] ?? statusStyles.idle,
          props.selected && 'ring-2 ring-blue-400 ring-offset-1'
        )}
      >
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-red-400" />
        <div className="flex">
          <div className="w-1 self-stretch rounded-l-lg bg-red-500" />
          <div className="flex-1 px-3 py-2">
            <div className="flex items-center gap-2">
              <Square className="h-5 w-5 text-red-500" />
              <span className="text-sm font-semibold text-red-800">{data.label}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
})

export default EndNode
