import { useState, useMemo, useCallback, useEffect } from 'react'
import { ConfigField } from './shared/ConfigField'
import { SectionHeader } from './shared/SectionHeader'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ChevronDown, ChevronRight, ListPlus } from 'lucide-react'

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

/** 从嵌套对象中提取所有叶子字段的点分隔路径 */
function extractPaths(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return []
  if (Array.isArray(obj)) {
    if (obj.length > 0) return extractPaths(obj[0], prefix ? `${prefix}.0` : '0')
    return []
  }
  const paths: string[] = []
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...extractPaths(value, path))
    } else {
      paths.push(path)
    }
  }
  return paths
}

/** 将路径按 "." 分段，返回缩进深度和最后一段名称 */
function pathToSegments(path: string): { depth: number; label: string } {
  const parts = path.split('.')
  return { depth: parts.length - 1, label: parts[parts.length - 1] }
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

  // 上游数据预览状态
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [sampleData, setSampleData] = useState('')
  const [parsedFields, setParsedFields] = useState<string[]>([])
  const [parseError, setParseError] = useState('')

  const updateMappings = useCallback((newMappings: FieldMapping[]) => {
    onChange('mappings', newMappings)
    onBlur()
  }, [onChange, onBlur])

  const preview = useMemo(() => buildOutputPreview(mappings), [mappings])

  // 当示例数据变化时解析字段路径
  useEffect(() => {
    if (!sampleData.trim()) {
      setParsedFields([])
      setParseError('')
      return
    }
    try {
      const data = JSON.parse(sampleData)
      const fields = extractPaths(data)
      setParsedFields(fields)
      setParseError('')
    } catch {
      setParsedFields([])
      setParseError('JSON 格式无效，请检查输入')
    }
  }, [sampleData])

  /** 从解析出的字段列表中添加单条映射 */
  const handleAddField = useCallback((fieldPath: string) => {
    const alreadyExists = mappings.some((m) => m.sourcePath === fieldPath)
    if (alreadyExists) return
    const { label } = pathToSegments(fieldPath)
    updateMappings([...mappings, { sourcePath: fieldPath, targetName: label, enabled: true }])
  }, [mappings, updateMappings])

  /** AI 推荐映射：将所有解析出的字段全部添加为映射 */
  const handleAiSuggest = useCallback(() => {
    if (!parsedFields.length) return
    const newMappings = parsedFields.map((path) => {
      const { label } = pathToSegments(path)
      return { sourcePath: path, targetName: label, enabled: true }
    })
    updateMappings(newMappings)
  }, [parsedFields, updateMappings])

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

      {/* ---- 上游数据预览 ---- */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
          onClick={() => setPreviewExpanded(!previewExpanded)}
        >
          {previewExpanded ? (
            <ChevronDown className="h-3 w-3 text-slate-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-slate-400" />
          )}
          上游数据预览
          {parsedFields.length > 0 && (
            <span className="ml-auto rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] text-cyan-600">
              {parsedFields.length} 个字段
            </span>
          )}
        </button>

        {previewExpanded && (
          <div className="border-t border-slate-100 px-3 py-2 space-y-2">
            <Textarea
              rows={3}
              value={sampleData}
              onChange={(e) => setSampleData(e.target.value)}
              placeholder='粘贴 JSON 示例数据，例如: {"name": "Alice", "age": 30}'
              className="font-mono text-xs"
            />
            {parseError && (
              <p className="text-xs text-red-500">{parseError}</p>
            )}

            {parsedFields.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-500">可用字段:</p>
                <div className="max-h-40 overflow-y-auto">
                  {parsedFields.map((fieldPath) => {
                    const { depth, label } = pathToSegments(fieldPath)
                    const alreadyMapped = mappings.some((m) => m.sourcePath === fieldPath)
                    return (
                      <div
                        key={fieldPath}
                        className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-50"
                        style={{ paddingLeft: `${depth * 12 + 4}px` }}
                      >
                        <span className="truncate font-mono text-xs text-slate-700" title={fieldPath}>
                          {label}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-400">{fieldPath}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-auto h-5 w-5 shrink-0 text-slate-400 hover:text-cyan-600"
                          disabled={alreadyMapped}
                          title={alreadyMapped ? '已添加' : '添加映射'}
                          onClick={() => handleAddField(fieldPath)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              disabled={parsedFields.length === 0}
              onClick={handleAiSuggest}
            >
              <ListPlus className="mr-1 h-3 w-3" />
              全部映射
            </Button>
          </div>
        )}
      </div>

      {/* ---- 字段映射 ---- */}
      <SectionHeader title="字段映射" />
      <div className="rounded-lg bg-slate-50 p-3 space-y-2">
        {mappings.length === 0 && (
          <p className="text-xs text-slate-400">暂无映射。点击下方按钮添加，或使用上游数据预览快速生成。</p>
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
