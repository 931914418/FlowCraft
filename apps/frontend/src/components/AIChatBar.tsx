import { useState, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, Wand2 } from 'lucide-react'
import { API_BASE } from '@/lib/api-config'

export interface AIWorkflowResult {
  name: string
  nodes: Array<{
    id: string
    type: string
    config: Record<string, unknown>
    position?: { x: number; y: number }
  }>
  edges: Array<{ id: string; source: string; target: string }>
}

interface AIChatBarProps {
  onGenerate: (workflow: AIWorkflowResult, explanation: string) => void
  mode: 'simple' | 'advanced'
  onModeChange: (mode: 'simple' | 'advanced') => void
}

export function AIChatBar({ onGenerate, mode, onModeChange }: AIChatBarProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Dismiss error on outside click
  useEffect(() => {
    if (!error) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setError(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [error])

  const handleGenerate = useCallback(async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/ai/generate-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: input.trim(), mode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '生成失败')
        return
      }
      onGenerate(data.workflow, data.explanation || '')
      setInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setLoading(false)
    }
  }, [input, loading, mode, onGenerate])

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-1 py-0.5">
        <button
          type="button"
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            mode === 'simple'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
          onClick={() => onModeChange('simple')}
        >
          简单
        </button>
        <button
          type="button"
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            mode === 'advanced'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
          onClick={() => onModeChange('advanced')}
        >
          高级
        </button>
      </div>

      {/* Input + Generate button */}
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleGenerate()
              }
            }}
            placeholder="描述你想创建的工作流..."
            className="pl-9"
            disabled={loading}
          />
        </div>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={loading || !input.trim()}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {loading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-1 h-4 w-4" />
          )}
          {loading ? '生成中...' : '生成'}
        </Button>
      </div>

      {/* Error tooltip */}
      {error && (
        <div className="absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600 shadow-lg">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
