import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Sparkles } from 'lucide-react'
import { BaseNode } from './BaseNode'

const AIProcessorNode = memo(function AIProcessorNode(props: NodeProps) {
  return <BaseNode {...props} icon={Sparkles} />
})

export default AIProcessorNode
