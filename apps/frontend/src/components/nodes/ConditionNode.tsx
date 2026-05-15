import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ConditionNodeData {
  label: string
  status?: string
  expression?: string
  [key: string]: unknown
}

const ConditionNode = memo(function ConditionNode(props: NodeProps) {
  const data = props.data as unknown as ConditionNodeData
  const selected = props.selected

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={cn(
          'relative min-w-[180px] rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2 shadow-sm transition-all duration-300',
          selected && 'ring-2 ring-blue-400 ring-offset-1'
        )}
      >
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-amber-500" />

        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-900">{data.label}</span>
        </div>

        {data.expression && (
          <div className="text-xs text-amber-700 truncate max-w-[160px] mb-2">
            {data.expression}
          </div>
        )}

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              style={{ top: 'calc(50% - 12px)' }}
              className="!w-3 !h-3 !bg-green-500"
            />
            <span className="text-xs font-medium text-green-700 absolute -right-1 translate-x-full">True</span>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3">
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ top: 'calc(50% + 12px)' }}
            className="!w-3 !h-3 !bg-red-400"
          />
          <span className="text-xs font-medium text-red-600 absolute -right-1 translate-x-full bottom-2">False</span>
        </div>
      </div>
    </motion.div>
  )
})

export default ConditionNode
