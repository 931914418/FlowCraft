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
      <div className="rounded-lg bg-slate-50 p-3">
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
            <div className="mb-1 flex items-center gap-2">
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
