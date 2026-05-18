import { ConfigField } from './shared/ConfigField'
import { SectionHeader } from './shared/SectionHeader'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectItem } from '@/components/ui/select'

interface NodeEditorProps {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  onBlur: () => void
}

const QUICK_TEMPLATES: Record<string, { systemPrompt: string; prompt: string }> = {
  translate: { systemPrompt: '你是专业翻译。', prompt: '将以下文本翻译为{{target_language}}：\n{{input}}' },
  summarize: { systemPrompt: '你是摘要专家。', prompt: '请对以下内容进行摘要：\n{{input}}' },
  classify: { systemPrompt: '你是分类专家。', prompt: '对以下文本进行分类：\n{{input}}' },
}

export function LLMEditor({ config, onChange, onBlur }: NodeEditorProps) {
  return (
    <div className="space-y-4">
      <SectionHeader title="快捷模板" />
      <div className="rounded-lg bg-slate-50 p-3">
        <Select
          value="__placeholder__"
          onValueChange={(v) => {
            if (v && v !== '__placeholder__' && QUICK_TEMPLATES[v]) {
              const tpl = QUICK_TEMPLATES[v]
              onChange('systemPrompt', tpl.systemPrompt)
              onChange('prompt', tpl.prompt)
              onBlur()
            }
          }}
          onBlur={onBlur}
        >
          <SelectItem value="__placeholder__">选择模板（可选）</SelectItem>
          {Object.keys(QUICK_TEMPLATES).map((key) => (
            <SelectItem key={key} value={key}>
              {QUICK_TEMPLATES[key].systemPrompt.replace('你是', '').replace('。', '')}
            </SelectItem>
          ))}
        </Select>
      </div>

      <SectionHeader title="模型配置" />
      <div className="rounded-lg bg-slate-50 p-3 space-y-3">
        <ConfigField label="Model">
          <Select
            value={(config.model as string) ?? ''}
            onValueChange={(v) => onChange('model', v)}
            onBlur={onBlur}
          >
            <SelectItem value="GLM-4.7">GLM-4.7</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
            <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
            <SelectItem value="claude-haiku-4-20250514">Claude Haiku 4</SelectItem>
          </Select>
        </ConfigField>

        <ConfigField label="System Prompt">
          <Textarea
            rows={3}
            value={(config.systemPrompt as string) ?? ''}
            onChange={(e) => onChange('systemPrompt', e.target.value)}
            onBlur={onBlur}
            placeholder="You are a helpful assistant..."
          />
        </ConfigField>

        <ConfigField label="Prompt">
          <Textarea
            rows={4}
            value={(config.prompt as string) ?? ''}
            onChange={(e) => onChange('prompt', e.target.value)}
            onBlur={onBlur}
            placeholder="Enter your prompt template..."
          />
        </ConfigField>

        <ConfigField label={`Temperature: ${config.temperature ?? 0.7}`}>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={(config.temperature as number) ?? 0.7}
            onChange={(e) => onChange('temperature', parseFloat(e.target.value))}
            onMouseUp={onBlur}
            onTouchEnd={onBlur}
            className="w-full accent-violet-500"
          />
        </ConfigField>
      </div>
    </div>
  )
}
