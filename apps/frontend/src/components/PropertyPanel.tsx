import { useState, useCallback, useEffect } from 'react'
import type { Node } from '@xyflow/react'
import { X } from 'lucide-react'
import type { NodeType } from '@flowcraft/shared'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface PropertyPanelProps {
  node: Node
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
  onClose: () => void
}

function getNodeConfig(node: Node): Record<string, unknown> {
  return (node.data as Record<string, unknown> & { config?: Record<string, unknown> })?.config ?? {}
}

export function PropertyPanel({ node, onUpdate, onClose }: PropertyPanelProps) {
  const config = getNodeConfig(node)
  const nodeType = node.type as NodeType
  const label = (node.data as Record<string, unknown>).label as string ?? ''

  const [localLabel, setLocalLabel] = useState(label)
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({ ...config })
  const [dirty, setDirty] = useState(false)

  // Reset state when node changes
  useEffect(() => {
    setLocalLabel(label)
    setLocalConfig({ ...getNodeConfig(node) })
    setDirty(false)
  }, [node.id, label]) // eslint-disable-line react-hooks/exhaustive-deps

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
    onUpdate(node.id, { ...node.data as Record<string, unknown>, label: localLabel, config: localConfig })
    setDirty(false)
  }, [dirty, node.id, node.data, localLabel, localConfig, onUpdate])

  return (
    <div className="flex h-full w-80 flex-col border-l border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-800">
          Properties
          {dirty && <span className="ml-2 text-xs text-amber-600">(unsaved)</span>}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Label</label>
            <Input
              value={localLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              onBlur={handleBlur}
            />
          </div>

          {nodeType === 'llm' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Model</label>
                <Select
                  value={(localConfig.model as string) ?? ''}
                  onValueChange={(v) => handleChange('model', v)}
                  onBlur={handleBlur}
                >
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                  <SelectItem value="claude-haiku-4-20250514">Claude Haiku 4</SelectItem>
                  <SelectItem value="GLM-4.7">GLM-4.7 (智谱)</SelectItem>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">System Prompt</label>
                <Textarea
                  rows={3}
                  value={(localConfig.systemPrompt as string) ?? ''}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="You are a helpful assistant..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Prompt</label>
                <Textarea
                  rows={4}
                  value={(localConfig.prompt as string) ?? ''}
                  onChange={(e) => handleChange('prompt', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Enter your prompt template..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Temperature</label>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={(localConfig.temperature as number) ?? 0.7}
                  onChange={(e) => handleChange('temperature', parseFloat(e.target.value) || 0)}
                  onBlur={handleBlur}
                />
              </div>
            </>
          )}

          {nodeType === 'condition' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Expression</label>
              <Textarea
                rows={3}
                value={(localConfig.expression as string) ?? ''}
                onChange={(e) => handleChange('expression', e.target.value)}
                onBlur={handleBlur}
                placeholder="e.g. {{output.score}} > 0.8"
                className="font-mono text-xs"
              />
            </div>
          )}

          {nodeType === 'code' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Code</label>
              <Textarea
                rows={10}
                value={(localConfig.code as string) ?? ''}
                onChange={(e) => handleChange('code', e.target.value)}
                onBlur={handleBlur}
                placeholder="// Write your JavaScript code here"
                className="font-mono text-xs"
              />
            </div>
          )}

          {nodeType === 'http' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Method</label>
                <Select
                  value={(localConfig.method as string) ?? 'GET'}
                  onValueChange={(v) => handleChange('method', v)}
                  onBlur={handleBlur}
                >
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">URL</label>
                <Input
                  value={(localConfig.url as string) ?? ''}
                  onChange={(e) => handleChange('url', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="https://api.example.com/data"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Headers (JSON)</label>
                <Textarea
                  rows={3}
                  value={(localConfig.headers as string) ?? ''}
                  onChange={(e) => handleChange('headers', e.target.value)}
                  onBlur={handleBlur}
                  placeholder='{"Content-Type": "application/json"}'
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Body</label>
                <Textarea
                  rows={4}
                  value={(localConfig.body as string) ?? ''}
                  onChange={(e) => handleChange('body', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Request body (JSON)"
                  className="font-mono text-xs"
                />
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
