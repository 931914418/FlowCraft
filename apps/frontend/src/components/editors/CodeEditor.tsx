import { SectionHeader } from './shared/SectionHeader'
import { Textarea } from '@/components/ui/textarea'

interface NodeEditorProps {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  onBlur: () => void
}

export function CodeEditor({ config, onChange, onBlur }: NodeEditorProps) {
  return (
    <div className="space-y-4">
      <SectionHeader title="代码编辑" />
      <div className="rounded-lg bg-slate-50 p-3">
        <p className="mb-2 text-xs text-slate-400">
          <span className="font-medium text-slate-500">输入:</span> 上游节点输出 &nbsp;
          <span className="font-medium text-slate-500">输出:</span> return 结果
        </p>
        <Textarea
          rows={12}
          value={(config.code as string) ?? ''}
          onChange={(e) => onChange('code', e.target.value)}
          onBlur={onBlur}
          placeholder="// Write your JavaScript code here"
          className="font-mono text-xs"
        />
      </div>
    </div>
  )
}
