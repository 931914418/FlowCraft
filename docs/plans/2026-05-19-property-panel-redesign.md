# PropertyPanel v2 Redesign + ListView Homepage

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign PropertyPanel from a monolithic component into a modular editor system with per-node-type editors, upgrade visual style to slate+accent colors, and redesign ListView homepage.

**Architecture:** PropertyPanel becomes a thin shell that dispatches to independent `*Editor` components based on `node.type`. Each editor receives a unified `NodeEditorProps` interface (`config`, `onChange`, `onBlur`). Shared UI primitives (`ConfigField`, `SectionHeader`) provide consistent styling. ListView gets branded header, search, richer cards.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, @xyflow/react, framer-motion, lucide-react, class-variance-authority

---

## Task 1: Update shared types for new node types

**Files:**
- Modify: `packages/shared/src/index.ts`

**Step 1: Add new node types to NodeType union and NODE_TYPE_META**

In `packages/shared/src/index.ts`, update the `NodeType` type and `NODE_TYPE_META`:

```typescript
export type NodeType = 'start' | 'end' | 'llm' | 'condition' | 'code' | 'http' | 'data-mapper' | 'ai-processor'
```

Add entries to `NODE_TYPE_META`:

```typescript
'data-mapper': { icon: 'table-2', label: 'Data Mapper', color: 'cyan-500' },
'ai-processor': { icon: 'sparkles', label: 'AI Processor', color: 'purple-500' },
```

**Step 2: Verify build**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
feat(shared): add data-mapper and ai-processor node types
```

---

## Task 2: Create shared editor components

**Files:**
- Create: `apps/frontend/src/components/editors/shared/ConfigField.tsx`
- Create: `apps/frontend/src/components/editors/shared/SectionHeader.tsx`
- Create: `apps/frontend/src/components/editors/shared/FieldInput.tsx`

**Step 1: Create ConfigField**

`apps/frontend/src/components/editors/shared/ConfigField.tsx`:

```tsx
import type { ReactNode } from 'react'

interface ConfigFieldProps {
  label: string
  children: ReactNode
  hint?: string
}

export function ConfigField({ label, children, hint }: ConfigFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
```

**Step 2: Create SectionHeader**

`apps/frontend/src/components/editors/shared/SectionHeader.tsx`:

```tsx
interface SectionHeaderProps {
  title: string
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
      {title}
    </div>
  )
}
```

**Step 3: Create FieldInput**

`apps/frontend/src/components/editors/shared/FieldInput.tsx`:

```tsx
import { useState, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface FieldInputProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  suggestions?: string[]
  placeholder?: string
}

export function FieldInput({ value, onChange, onBlur, suggestions = [], placeholder }: FieldInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback((suggestion: string) => {
    onChange(suggestion)
    setShowSuggestions(false)
    onBlur()
  }, [onChange, onBlur])

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => {
          onBlur()
          // Delay to allow click on suggestion
          setTimeout(() => setShowSuggestions(false), 150)
        }}
        placeholder={placeholder}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              onMouseDown={() => handleSelect(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Verify build**

Run: `cd apps/frontend && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```
feat(frontend): add shared editor UI components (ConfigField, SectionHeader, FieldInput)
```

---

## Task 3: Create type color utility and update BaseNode visual

**Files:**
- Create: `apps/frontend/src/lib/node-theme.ts`
- Modify: `apps/frontend/src/components/nodes/BaseNode.tsx`

**Step 1: Create node theme utility**

`apps/frontend/src/lib/node-theme.ts`:

```typescript
import type { NodeType } from '@flowcraft/shared'

const NODE_COLORS: Record<string, { accent: string; bg: string; border: string; dot: string }> = {
  start:        { accent: 'bg-green-500',    bg: 'bg-green-50',    border: 'border-green-400', dot: 'bg-green-500' },
  end:          { accent: 'bg-red-500',      bg: 'bg-red-50',      border: 'border-red-400',   dot: 'bg-red-500' },
  llm:          { accent: 'bg-violet-500',   bg: 'bg-violet-50',   border: 'border-violet-400', dot: 'bg-violet-500' },
  condition:    { accent: 'bg-amber-500',    bg: 'bg-amber-50',    border: 'border-amber-400',  dot: 'bg-amber-500' },
  code:         { accent: 'bg-emerald-500',  bg: 'bg-emerald-50',  border: 'border-emerald-400', dot: 'bg-emerald-500' },
  http:         { accent: 'bg-blue-500',     bg: 'bg-blue-50',     border: 'border-blue-400',   dot: 'bg-blue-500' },
  'data-mapper': { accent: 'bg-cyan-500',   bg: 'bg-cyan-50',    border: 'border-cyan-400',   dot: 'bg-cyan-500' },
  'ai-processor': { accent: 'bg-purple-500', bg: 'bg-purple-50', border: 'border-purple-400', dot: 'bg-purple-500' },
}

export function getNodeColor(nodeType: string) {
  return NODE_COLORS[nodeType] ?? { accent: 'bg-slate-500', bg: 'bg-slate-50', border: 'border-slate-400', dot: 'bg-slate-500' }
}

export function getNodeAccentBarClass(nodeType: NodeType): string {
  return getNodeColor(nodeType).accent
}
```

**Step 2: Update BaseNode to use accent bar**

In `apps/frontend/src/components/nodes/BaseNode.tsx`, add a left accent bar. Wrap the existing content in a flex container with a 3px color bar on the left:

```tsx
// Add import at top:
import { getNodeColor } from '@/lib/node-theme'

// Inside the component, get colors:
const colors = getNodeColor(String(type))

// In the return JSX, wrap existing content:
<motion.div ... className={cn("...")}>
  <div className="flex">
    <div className={cn("w-1 rounded-l-lg", colors.accent)} />
    <div className="flex-1 px-3 py-2">
      {/* existing content (status dot, icon, label, children) */}
    </div>
  </div>
  {/* handles stay outside the flex wrapper */}
</motion.div>
```

**Step 3: Verify visually**

Run dev server: `cd apps/frontend && npm run dev`
Open browser, drag nodes onto canvas, confirm left color bar appears on BaseNode-derived nodes.

**Step 4: Commit**

```
feat(frontend): add node type accent colors and BaseNode color bar
```

---

## Task 4: Create LLMEditor (extract from PropertyPanel)

**Files:**
- Create: `apps/frontend/src/components/editors/LLMEditor.tsx`

**Step 1: Create LLMEditor**

`apps/frontend/src/components/editors/LLMEditor.tsx`:

```tsx
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
            <SelectItem key={key} value={key}>{QUICK_TEMPLATES[key].systemPrompt.replace('你是', '').replace('。', '')}</SelectItem>
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
```

**Step 2: Verify build**

Run: `cd apps/frontend && npx tsc --noEmit`

**Step 3: Commit**

```
feat(frontend): extract LLMEditor with quick templates and slider
```

---

## Task 5: Create ConditionEditor (visual builder)

**Files:**
- Create: `apps/frontend/src/components/editors/ConditionEditor.tsx`

**Step 1: Create ConditionEditor**

`apps/frontend/src/components/editors/ConditionEditor.tsx`:

```tsx
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

// Convert visual config to expression string for backend
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

  // Parse old expression format for migration
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
              // Also update expression
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
        <code className="text-xs text-slate-600 font-mono">
          {expression || '(请填写字段)'}
        </code>
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd apps/frontend && npx tsc --noEmit`

**Step 3: Commit**

```
feat(frontend): add ConditionEditor visual builder with field+operator+value
```

---

## Task 6: Create HttpEditor (KV headers + test button)

**Files:**
- Create: `apps/frontend/src/components/editors/HttpEditor.tsx`

**Step 1: Create HttpEditor**

`apps/frontend/src/components/editors/HttpEditor.tsx`:

```tsx
import { useState, useCallback } from 'react'
import { ConfigField } from './shared/ConfigField'
import { SectionHeader } from './shared/SectionHeader'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Plus, Trash2 } from 'lucide-react'

interface NodeEditorProps {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  onBlur: () => void
}

interface KVPair {
  key: string
  value: string
}

function parseHeaders(raw: unknown): KVPair[] {
  if (Array.isArray(raw)) return raw as KVPair[]
  if (typeof raw === 'string' && raw) {
    try {
      const obj = JSON.parse(raw)
      return Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v) }))
    } catch { /* ignore */ }
  }
  return [{ key: '', value: '' }]
}

export function HttpEditor({ config, onChange, onBlur }: NodeEditorProps) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: number; time: number; body: string } | null>(null)

  const headers = parseHeaders(config.headers)
  const method = (config.method as string) ?? 'GET'

  const updateHeaders = useCallback((newHeaders: KVPair[]) => {
    // Store as array of KV pairs (more structured than JSON string)
    onChange('headers', newHeaders)
    onBlur()
  }, [onChange, onBlur])

  const handleTest = useCallback(async () => {
    const url = (config.url as string) ?? ''
    if (!url) return
    setTesting(true)
    setTestResult(null)
    try {
      const start = Date.now()
      const headerObj: Record<string, string> = {}
      headers.forEach((h) => { if (h.key) headerObj[h.key] = h.value })

      const res = await fetch(url, {
        method,
        headers: headerObj,
        body: ['POST', 'PUT', 'PATCH'].includes(method) ? (config.body as string) ?? undefined : undefined,
      })
      const body = await res.text()
      setTestResult({ status: res.status, time: Date.now() - start, body: body.slice(0, 500) })
    } catch (err) {
      setTestResult({ status: 0, time: 0, body: err instanceof Error ? err.message : 'Request failed' })
    } finally {
      setTesting(false)
    }
  }, [config.url, config.body, method, headers])

  return (
    <div className="space-y-4">
      <SectionHeader title="请求配置" />
      <div className="rounded-lg bg-slate-50 p-3 space-y-3">
        <div className="flex gap-2">
          <div className="w-24 shrink-0">
            <Select
              value={method}
              onValueChange={(v) => onChange('method', v)}
              onBlur={onBlur}
            >
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
            </Select>
          </div>
          <Input
            value={(config.url as string) ?? ''}
            onChange={(e) => onChange('url', e.target.value)}
            onBlur={onBlur}
            placeholder="https://api.example.com/data"
            className="flex-1"
          />
        </div>
      </div>

      <SectionHeader title="Headers" />
      <div className="rounded-lg bg-slate-50 p-3 space-y-2">
        {headers.map((h, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              value={h.key}
              onChange={(e) => {
                const updated = [...headers]
                updated[i] = { ...updated[i], key: e.target.value }
                updateHeaders(updated)
              }}
              placeholder="Key"
              className="flex-1 text-xs"
            />
            <Input
              value={h.value}
              onChange={(e) => {
                const updated = [...headers]
                updated[i] = { ...updated[i], value: e.target.value }
                updateHeaders(updated)
              }}
              placeholder="Value"
              className="flex-1 text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-500"
              onClick={() => {
                const updated = headers.filter((_, idx) => idx !== i)
                updateHeaders(updated.length ? updated : [{ key: '', value: '' }])
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-slate-400"
          onClick={() => updateHeaders([...headers, { key: '', value: '' }])}
        >
          <Plus className="mr-1 h-3 w-3" /> 添加 Header
        </Button>
      </div>

      {['POST', 'PUT', 'PATCH'].includes(method) && (
        <>
          <SectionHeader title="Body" />
          <div className="rounded-lg bg-slate-50 p-3">
            <Textarea
              rows={4}
              value={(config.body as string) ?? ''}
              onChange={(e) => onChange('body', e.target.value)}
              onBlur={onBlur}
              placeholder="Request body (JSON)"
              className="font-mono text-xs"
            />
          </div>
        </>
      )}

      <SectionHeader title="测试" />
      <div className="rounded-lg bg-slate-50 p-3 space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleTest}
          disabled={testing || !config.url}
        >
          {testing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
          发送测试
        </Button>
        {testResult && (
          <div className="rounded-md border border-slate-200 bg-white p-2 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className={testResult.status >= 200 && testResult.status < 300 ? 'text-green-600' : 'text-red-600'}>
                {testResult.status || 'Error'}
              </span>
              {testResult.time > 0 && <span className="text-slate-400">{testResult.time}ms</span>}
            </div>
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-slate-600">
              {testResult.body}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `cd apps/frontend && npx tsc --noEmit`

**Step 3: Commit**

```
feat(frontend): add HttpEditor with KV headers and test button
```

---

## Task 7: Create CodeEditor, DataMapperEditor, AIProcessorEditor

**Files:**
- Create: `apps/frontend/src/components/editors/CodeEditor.tsx`
- Create: `apps/frontend/src/components/editors/DataMapperEditor.tsx`
- Create: `apps/frontend/src/components/editors/AIProcessorEditor.tsx`

**Step 1: Create CodeEditor**

`apps/frontend/src/components/editors/CodeEditor.tsx`:

```tsx
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
```

**Step 2: Create DataMapperEditor**

`apps/frontend/src/components/editors/DataMapperEditor.tsx`:

```tsx
import { useState, useCallback, useMemo } from 'react'
import { ConfigField } from './shared/ConfigField'
import { SectionHeader } from './shared/SectionHeader'
import { Input } from '@/components/ui/input'
import { Select, SelectItem } from '@/components/ui/select'
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
            <span className="text-xs text-slate-400">→</span>
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
        <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap">{preview}</pre>
      </div>
    </div>
  )
}
```

**Step 3: Create AIProcessorEditor**

`apps/frontend/src/components/editors/AIProcessorEditor.tsx`:

```tsx
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
```

**Step 4: Verify build**

Run: `cd apps/frontend && npx tsc --noEmit`

**Step 5: Commit**

```
feat(frontend): add CodeEditor, DataMapperEditor, AIProcessorEditor
```

---

## Task 8: Rewrite PropertyPanel as thin shell

**Files:**
- Modify: `apps/frontend/src/components/PropertyPanel.tsx`

**Step 1: Replace entire PropertyPanel**

`apps/frontend/src/components/PropertyPanel.tsx`:

```tsx
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

interface PropertyPanelProps {
  node: Node
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void
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

interface NodeEditorProps {
  config: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  onBlur: () => void
}

export function PropertyPanel({ node, onUpdate, onClose }: PropertyPanelProps) {
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
      <div className={cn("flex items-center justify-between border-b border-slate-200 px-4 py-3")}>
        <div className="flex items-center gap-2">
          <div className={cn("h-5 w-1 rounded-full", colors.accent)} />
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
          {/* Label field (always shown) */}
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
        </div>
      </ScrollArea>
    </div>
  )
}
```

**Step 2: Verify build and test in browser**

Run: `cd apps/frontend && npm run dev`

Test in browser:
- Click each node type, confirm correct editor appears
- Edit fields, blur, confirm save works
- Switch between nodes, confirm state resets

**Step 3: Commit**

```
feat(frontend): rewrite PropertyPanel as thin shell dispatching to per-type editors
```

---

## Task 9: Update EditorPage for new node types

**Files:**
- Modify: `apps/frontend/src/pages/EditorPage.tsx`

**Step 1: Add new node type registrations**

In EditorPage, add imports and registrations for DataMapper and AIProcessor nodes. Since these nodes don't have custom node components yet, create minimal placeholder components that use BaseNode.

Create: `apps/frontend/src/components/nodes/DataMapperNode.tsx`:
```tsx
import BaseNode, { type BaseNodeProps } from './BaseNode'
import { Table2 } from 'lucide-react'

export default function DataMapperNode(props: BaseNodeProps) {
  return <BaseNode {...props} icon={Table2} />
}
```

Create: `apps/frontend/src/components/nodes/AIProcessorNode.tsx`:
```tsx
import BaseNode, { type BaseNodeProps } from './BaseNode'
import { Sparkles } from 'lucide-react'

export default function AIProcessorNode(props: BaseNodeProps) {
  return <BaseNode {...props} icon={Sparkles} />
}
```

Then in `EditorPage.tsx`, add to imports and `nodeTypes` map:
```tsx
import DataMapperNode from '@/components/nodes/DataMapperNode'
import AIProcessorNode from '@/components/nodes/AIProcessorNode'

const nodeTypes: NodeTypes = {
  ...existing,
  'data-mapper': DataMapperNode,
  'ai-processor': AIProcessorNode,
}
```

Also update `DEFAULT_LABELS`:
```typescript
const DEFAULT_LABELS: Record<string, string> = {
  ...existing,
  'data-mapper': 'Data Mapper',
  'ai-processor': 'AI Processor',
}
```

**Step 2: Verify in browser**

Run dev server, confirm new node types appear in palette and can be dragged to canvas.

**Step 3: Commit**

```
feat(frontend): add DataMapper and AIProcessor node components
```

---

## Task 10: Redesign ListView homepage

**Files:**
- Modify: `apps/frontend/src/pages/ListView.tsx`

**Step 1: Rewrite ListView**

Replace the entire ListView with the new design: branded header, search, richer cards with trigger type and last run info.

Key changes:
- Header: "FlowCraft" brand + "新建" + "AI 创建" buttons
- Search: client-side filter by name
- Cards: show trigger type, node count as visual dots, last run status
- Empty state: AI-first onboarding message
- Delete: custom confirmation modal instead of `window.confirm`

The implementation should be self-contained in ListView.tsx. Use existing UI components (Card, Badge, Button, Input).

**Step 2: Verify in browser**

Run dev server, navigate to `/`, confirm:
- Branded header renders
- Search filters cards
- Cards show richer info
- Empty state shows when no workflows
- Delete shows custom confirmation

**Step 3: Commit**

```
feat(frontend): redesign ListView with branded header, search, richer cards
```

---

## Task 11: Visual polish pass

**Files:**
- Modify: `apps/frontend/src/components/nodes/ConditionNode.tsx` (add accent bar)
- Modify: `apps/frontend/src/components/nodes/StartNode.tsx` (add accent bar)
- Modify: `apps/frontend/src/components/nodes/EndNode.tsx` (add accent bar)
- Modify: `apps/frontend/src/components/NodePalette.tsx` (use accent colors)
- Modify: `apps/frontend/src/pages/EditorPage.tsx` (toolbar styling)

**Step 1: Add accent bars to standalone nodes**

ConditionNode, StartNode, EndNode don't use BaseNode. Add the same left accent bar pattern from Task 3 to these components.

**Step 2: Update NodePalette to use accent colors**

Use `getNodeColor()` from `node-theme.ts` to color each palette item's hover/active state.

**Step 3: Polish toolbar**

Update EditorPage toolbar to use slate colors consistently, match the new visual language.

**Step 4: Full visual review in browser**

Test all node types, all editors, ListView, interactions.

**Step 5: Commit**

```
feat(frontend): visual polish pass — accent bars, palette colors, toolbar styling
```

---

## Task 12: Final integration test

**Step 1: Full E2E walkthrough**

1. Open ListView — confirm branded UI loads
2. Create new workflow — opens editor
3. Drag each node type to canvas — all 8 types render correctly with accent bars
4. Click each node — correct editor appears in PropertyPanel
5. Edit fields in each editor — blur saves, switching nodes preserves state
6. Condition: select operator, field, value — preview shows expression
7. HTTP: add KV headers, send test — response displays
8. LLM: select quick template — fields auto-fill
9. Save workflow — no errors
10. Refresh page — data persists
11. Run workflow — debug panel shows events

**Step 2: Fix any issues found**

**Step 3: Final commit**

```
chore: final integration fixes for PropertyPanel v2 redesign
```
