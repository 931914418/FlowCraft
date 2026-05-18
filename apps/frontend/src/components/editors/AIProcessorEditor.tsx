import { ConfigField } from './shared/ConfigField'
import { SectionHeader } from './shared/SectionHeader'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectItem } from '@/components/ui/select'

interface NodeEditorProps {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  onBlur: () => void
}

export function AIProcessorEditor({ config, onChange, onBlur }: NodeEditorProps) {
  return (
    <div className="space-y-4">
      <SectionHeader title="AI 处理" />
      <div className="rounded-lg bg-slate-50 p-3 space-y-3">
        <ConfigField label="处理指令">
          <Textarea
            rows={5}
            value={(config.instruction as string) ?? ''}
            onChange={(e) => onChange('instruction', e.target.value)}
            onBlur={onBlur}
            placeholder="用自然语言描述你想要的数据处理，例如：从文本中提取所有邮箱地址"
          />
        </ConfigField>

        <ConfigField label="模型">
          <Select
            value={(config.model as string) ?? 'GLM-4.7'}
            onValueChange={(v) => onChange('model', v)}
            onBlur={onBlur}
          >
            <SelectItem value="GLM-4.7">GLM-4.7</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
          </Select>
        </ConfigField>

        <ConfigField label="输出格式">
          <Select
            value={(config.outputFormat as string) ?? 'auto'}
            onValueChange={(v) => onChange('outputFormat', v)}
            onBlur={onBlur}
          >
            <SelectItem value="auto">自动</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="text">纯文本</SelectItem>
            <SelectItem value="list">列表</SelectItem>
          </Select>
        </ConfigField>
      </div>
    </div>
  )
}
