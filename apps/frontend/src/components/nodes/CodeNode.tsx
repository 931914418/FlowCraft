import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Code } from 'lucide-react'
import { BaseNode } from './BaseNode'

interface CodeNodeData {
  label: string
  status?: string
  code?: string
  [key: string]: unknown
}

const CodeNode = memo(function CodeNode(props: NodeProps) {
  const data = props.data as unknown as CodeNodeData

  return (
    <BaseNode {...props} icon={Code}>
      {data.code && (
        <div className="font-mono truncate max-w-[160px]">{data.code.slice(0, 50)}</div>
      )}
    </BaseNode>
  )
})

export default CodeNode
