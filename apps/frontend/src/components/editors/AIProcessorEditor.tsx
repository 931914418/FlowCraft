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
  const outputFormat = (config.outputFormat as string) ?? 'auto'

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
            value={outputFormat}
            onValueChange={(v) => onChange('outputFormat', v)}
            onBlur={onBlur}
          >
            <SelectItem value="auto">自动</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="text">纯文本</SelectItem>
            <SelectItem value="list">列表</SelectItem>
          </Select>
        </ConfigField>

        {outputFormat === 'json' && (
          <ConfigField label="输出格式描述">
            <Textarea
              rows={3}
              value={(config.outputSchema as string) ?? ''}
              onChange={(e) => onChange('outputSchema', e.target.value)}
              onBlur={onBlur}
              placeholder="描述期望的输出格式，如：{ name: string, email: string }"
              className="font-mono text-xs"
            />
          </ConfigField>
        )}
      </div>

      {/* Prompt 预览：展示将发送给 LLM 的完整 prompt */}
      <SectionHeader title="Prompt 预览" />
      <div className="rounded-lg bg-slate-50 p-3">
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-slate-600 font-mono">
{`你是一个数据处理助手。根据用户指令处理以下数据。

上游数据：
${config.instruction ? '(执行时自动填充)' : '(无上游数据)'}

处理指令：
${(config.instruction as string) || '(未设置)'}

${outputFormat === 'json' ? '请以 JSON 格式返回结果。' : ''}${config.outputSchema ? `输出格式要求：${config.outputSchema}` : ''}`}
        </pre>
      </div>
    </div>
  )
}
