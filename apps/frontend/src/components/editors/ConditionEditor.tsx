import { ConfigField } from './shared/ConfigField'
import { SectionHeader } from './shared/SectionHeader'
import { FieldInput } from './shared/FieldInput'
import { Input } from '@/components/ui/input'
import { Select, SelectItem } from '@/components/ui/select'

interface NodeEditorProps {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  onBlur: () => void
}

const OPERATORS = [
  { value: 'eq', label: '等于' },
  { value: 'neq', label: '不等于' },
  { value: 'gt', label: '大于' },
  { value: 'lt', label: '小于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lte', label: '小于等于' },
  { value: 'contains', label: '包含' },
  { value: 'not_contains', label: '不包含' },
  { value: 'empty', label: '为空' },
  { value: 'not_empty', label: '不为空' },
]

const NO_VALUE_OPS = ['empty', 'not_empty']

function buildExpression(config: Record<string, unknown>): string {
  const field = (config.field as string) ?? ''
  const op = (config.operator as string) ?? 'eq'
  const value = (config.value as string) ?? ''

  if (!field) return ''

  if (NO_VALUE_OPS.includes(op)) {
    return op === 'empty' ? `!${field}` : `${field}`
  }

  const opMap: Record<string, string> = {
    eq: '==', neq: '!=', gt: '>', lt: '<', gte: '>=', lte: '<=',
    contains: 'includes', not_contains: '!includes',
  }

  const symbol = opMap[op] ?? '=='
  if (op === 'contains' || op === 'not_contains') {
    return `${symbol}(${field}, "${value}")`
  }
  return `${field} ${symbol} ${value}`
}

export function ConditionEditor({ config, onChange, onBlur }: NodeEditorProps) {
  const operator = (config.operator as string) ?? 'eq'
  const needsValue = !NO_VALUE_OPS.includes(operator)
  const expression = buildExpression(config)
  const field = (config.field as string) ?? ''
  const value = (config.value as string) ?? ''

  return (
    <div className="space-y-4">
      <SectionHeader title="条件设置" />
      <div className="rounded-lg bg-slate-50 p-3 space-y-3">
        <ConfigField label="字段">
          <FieldInput
            value={field}
            onChange={(v) => onChange('field', v)}
            onBlur={onBlur}
            placeholder="输入字段路径，如 score"
          />
        </ConfigField>

        <ConfigField label="比较方式">
          <Select
            value={operator}
            onValueChange={(v) => {
              onChange('operator', v)
              const newConfig = { ...config, operator: v }
              onChange('expression', buildExpression(newConfig))
              onBlur()
            }}
            onBlur={onBlur}
          >
            {OPERATORS.map((op) => (
              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
            ))}
          </Select>
        </ConfigField>

        {needsValue && (
          <ConfigField label="值">
            <Input
              value={value}
              onChange={(e) => {
                onChange('value', e.target.value)
                const newConfig = { ...config, value: e.target.value }
                onChange('expression', buildExpression(newConfig))
              }}
              onBlur={onBlur}
              placeholder="输入比较值"
            />
          </ConfigField>
        )}
      </div>

      <SectionHeader title="输出预览" />
      <div className="rounded-lg bg-slate-50 p-3">
        <code className="text-xs font-mono text-slate-600">
          {expression || '(请填写字段)'}
        </code>
      </div>
    </div>
  )
}
