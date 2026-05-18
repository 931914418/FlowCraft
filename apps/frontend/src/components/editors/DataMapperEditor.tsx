import { useMemo, useCallback } from 'react'
import { ConfigField } from './shared/ConfigField'
import { SectionHeader } from './shared/SectionHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

interface NodeEditorProps {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  onBlur: () => void
}

interface FieldMapping {
  sourcePath: string
  targetName: string
  enabled: boolean
}

function getMappings(config: Record<string, unknown>): FieldMapping[] {
  const raw = config.mappings
  if (Array.isArray(raw)) return raw as FieldMapping[]
  return []
}

function buildOutputPreview(mappings: FieldMapping[]): string {
  const active = mappings.filter((m) => m.enabled && m.sourcePath)
  if (!active.length) return '{}'
  const obj: Record<string, string> = {}
  active.forEach((m) => { obj[m.targetName || m.sourcePath] = '...' })
  return JSON.stringify(obj, null, 2)
}

export function DataMapperEditor({ config, onChange, onBlur }: NodeEditorProps) {
  const mappings = getMappings(config)
  const sourceNodeId = (config.sourceNodeId as string) ?? ''

  const updateMappings = useCallback((newMappings: FieldMapping[]) => {
    onChange('mappings', newMappings)
    onBlur()
  }, [onChange, onBlur])

  const preview = useMemo(() => buildOutputPreview(mappings), [mappings])

  return (
    <div className="space-y-4">
      <SectionHeader title="数据映射" />
      <div className="rounded-lg bg-slate-50 p-3 space-y-3">
        <ConfigField label="来源节点">
          <Input
            value={sourceNodeId}
            onChange={(e) => onChange('sourceNodeId', e.target.value)}
            onBlur={onBlur}
            placeholder="输入上游节点 ID"
          />
        </ConfigField>
      </div>

      <SectionHeader title="字段映射" />
      <div className="rounded-lg bg-slate-50 p-3 space-y-2">
        {mappings.length === 0 && (
          <p className="text-xs text-slate-400">暂无映射。点击下方按钮添加。</p>
        )}
        {mappings.map((m, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={m.enabled}
              onChange={(e) => {
                const updated = [...mappings]
                updated[i] = { ...updated[i], enabled: e.target.checked }
                updateMappings(updated)
              }}
              className="h-4 w-4 rounded border-slate-300 accent-cyan-500"
            />
            <Input
              value={m.sourcePath}
              onChange={(e) => {
                const updated = [...mappings]
                updated[i] = { ...updated[i], sourcePath: e.target.value }
                updateMappings(updated)
              }}
              placeholder="源字段路径"
              className="flex-1 text-xs"
            />
            <span className="text-xs text-slate-400">&rarr;</span>
            <Input
              value={m.targetName}
              onChange={(e) => {
                const updated = [...mappings]
                updated[i] = { ...updated[i], targetName: e.target.value }
                updateMappings(updated)
              }}
              placeholder="输出名称"
              className="flex-1 text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-500"
              onClick={() => updateMappings(mappings.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-slate-400"
          onClick={() => updateMappings([...mappings, { sourcePath: '', targetName: '', enabled: true }])}
        >
          <Plus className="mr-1 h-3 w-3" /> 添加映射
        </Button>
      </div>

      <SectionHeader title="输出预览" />
      <div className="rounded-lg bg-slate-50 p-3">
        <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600">{preview}</pre>
      </div>
    </div>
  )
}
