import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { PlayCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface StartNodeData {
  label: string
  status?: string
  [key: string]: unknown
}

const statusStyles: Record<string, string> = {
  idle: 'border-green-400',
  pending: 'border-green-400',
  running: 'border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  completed: 'border-blue-500',
  failed: 'border-red-500',
  skipped: 'border-neutral-400 opacity-60',
}

const StartNode = memo(function StartNode(props: NodeProps) {
  const data = props.data as unknown as StartNodeData
  const status = data.status ?? 'idle'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={cn(
          'min-w-[140px] rounded-lg border-2 bg-green-50 px-4 py-2 shadow-sm transition-all duration-300',
          statusStyles[status] ?? statusStyles.idle,
          props.selected && 'ring-2 ring-blue-400 ring-offset-1'
        )}
      >
        <div className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm font-semibold text-green-800">{data.label}</span>
        </div>
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-green-500" />
      </div>
    </motion.div>
  )
})

export default StartNode
