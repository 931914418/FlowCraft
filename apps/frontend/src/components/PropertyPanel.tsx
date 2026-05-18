import { useState, useCallback, useEffect } from 'react'
import type { Node } from '@xyflow/react'
import { X } from 'lucide-react'
import type { NodeType } from '@flowcraft/shared'
import { NODE_TYPE_META } from '@flowcraft/shared'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { getNodeColor } from '@/lib/node-theme'

import { LLMEditor } from '@/components/editors/LLMEditor'
import { ConditionEditor } from '@/components/editors/ConditionEditor'
import { HttpEditor } from '@/components/editors/HttpEditor'
import { CodeEditor } from '@/components/editors/CodeEditor'
import { DataMapperEditor } from '@/components/editors/DataMapperEditor'
import { AIProcessorEditor } from '@/components/editors/AIProcessorEditor'

interface NodeEditorProps {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  onBlur: () => void
}

interface PropertyPanelProps {
  node: Node
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
  onChangeNodeType?: (nodeId: string, newType: string) => void
  onClose: () => void
}

function getNodeConfig(node: Node): Record<string, unknown> {
  return (node.data as Record<string, unknown> & { config?: Record<string, unknown> })?.config ?? {}
}

const EDITOR_MAP: Partial<Record<NodeType, React.ComponentType<NodeEditorProps>>> = {
  llm: LLMEditor,
  condition: ConditionEditor,
  http: HttpEditor,
  code: CodeEditor,
  'data-mapper': DataMapperEditor,
  'ai-processor': AIProcessorEditor,
}

export function PropertyPanel({ node, onUpdate, onChangeNodeType, onClose }: PropertyPanelProps) {
  const config = getNodeConfig(node)
  const nodeType = node.type as NodeType
  const label = (node.data as Record<string, unknown>).label as string ?? ''
  const meta = NODE_TYPE_META[nodeType]
  const colors = getNodeColor(nodeType)
  const EditorComponent = EDITOR_MAP[nodeType]

  const [localLabel, setLocalLabel] = useState(label)
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({ ...config })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const newConfig = getNodeConfig(node)
    setLocalLabel(label)
    setLocalConfig({ ...newConfig })
    setDirty(false)
  }, [node.id])

  const handleChange = useCallback((key: string, value: unknown) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  const handleLabelChange = useCallback((value: string) => {
    setLocalLabel(value)
    setDirty(true)
  }, [])

  const handleBlur = useCallback(() => {
    if (!dirty) return
    onUpdate(node.id, { ...(node.data as Record<string, unknown>), label: localLabel, config: localConfig })
    setDirty(false)
  }, [dirty, node.id, node.data, localLabel, localConfig, onUpdate])

  return (
    <div className="flex h-full w-80 flex-col border-l border-slate-200 bg-white">
      {/* Header with accent bar */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={cn('h-5 w-1 rounded-full', colors.accent)} />
          <h3 className="text-sm font-semibold text-slate-800">
            {meta?.label ?? nodeType}
          </h3>
          {dirty && <span className="text-xs text-amber-600">(unsaved)</span>}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Label field */}
          <div className="rounded-lg bg-slate-50 p-3">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Label</label>
            <Input
              value={localLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              onBlur={handleBlur}
            />
          </div>

          {/* Node-specific editor */}
          {EditorComponent ? (
            <EditorComponent
              config={localConfig}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          ) : (
            <p className="text-xs text-slate-400">此节点无可配置属性</p>
          )}

          {/* 模式切换按钮（仅 data-mapper 显示） */}
          {nodeType === 'data-mapper' && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-800">需要更灵活的处理？</p>
                  <p className="text-xs text-amber-600">切换为代码模式，用 JavaScript 自定义数据转换</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => onChangeNodeType?.(node.id, 'code')}
                >
                  切换
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
