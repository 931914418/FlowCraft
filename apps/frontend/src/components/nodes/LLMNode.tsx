import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Bot } from 'lucide-react'
import { BaseNode } from './BaseNode'

interface LLMNodeData {
  label: string
  status?: string
  model?: string
  prompt?: string
  [key: string]: unknown
}

const LLMNode = memo(function LLMNode(props: NodeProps) {
  const data = props.data as unknown as LLMNodeData

  return (
    <BaseNode {...props} icon={Bot}>
      {data.model && <div className="truncate">Model: {data.model}</div>}
      {data.prompt && (
        <div className="truncate max-w-[160px]">Prompt: {data.prompt}</div>
      )}
    </BaseNode>
  )
})

export default LLMNode
