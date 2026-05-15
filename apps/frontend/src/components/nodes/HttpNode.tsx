import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Globe } from 'lucide-react'
import { BaseNode } from './BaseNode'

interface HttpNodeData {
  label: string
  status?: string
  url?: string
  method?: string
  [key: string]: unknown
}

const HttpNode = memo(function HttpNode(props: NodeProps) {
  const data = props.data as unknown as HttpNodeData

  return (
    <BaseNode {...props} icon={Globe}>
      {data.method && <span className="font-mono uppercase">{data.method}</span>}
      {data.url && <div className="truncate max-w-[160px]">{data.url}</div>}
    </BaseNode>
  )
})

export default HttpNode
