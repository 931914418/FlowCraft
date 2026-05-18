import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Table2 } from 'lucide-react'
import { BaseNode } from './BaseNode'

const DataMapperNode = memo(function DataMapperNode(props: NodeProps) {
  return <BaseNode {...props} icon={Table2} />
})

export default DataMapperNode
