import { useState } from 'react'
import type { NodeExecutionEvent } from '@flowcraft/shared'
import { NODE_TYPE_META } from '@flowcraft/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown, ChevronRight, Trash2, X, Clock, Zap, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DebugPanelProps {
  events: NodeExecutionEvent[]
  onClear?: () => void
  onClose?: () => void
}

const STATUS_LABELS: Record<string, string> = {
  pending: '等待中',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  skipped: '已跳过',
}

const statusDotColor: Record<string, string> = {
  pending: 'bg-neutral-300',
  running: 'bg-green-500 animate-pulse',
  completed: 'bg-blue-500',
  failed: 'bg-red-500',
  skipped: 'bg-neutral-400',
}

const badgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  running: 'default',
  completed: 'secondary',
  failed: 'destructive',
  skipped: 'outline',
}

function colorizeJson(str: string): React.ReactNode {
  try {
    const parsed = typeof str === 'string' ? JSON.parse(str) : str
    const formatted = JSON.stringify(parsed, null, 2)
    return formatted.split('\n').map((line, i) => (
      <div key={i} className="whitespace-pre">
        {colorizeLine(line)}
      </div>
    ))
  } catch {
    return <span>{str}</span>
  }
}

function colorizeLine(line: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let key = 0
  const regex = /("(?:[^"\\]|\\.)*")\s*:/g
  let lastIndex = 0
  let match
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{line.slice(lastIndex, match.index)}</span>)
    }
    parts.push(<span key={key++} className="text-violet-600">{match[1]}</span>)
    parts.push(<span key={key++}>{':'}</span>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < line.length) {
    const rest = line.slice(lastIndex)
    const valueRegex = /("(?:[^"\\]|\\.)*")|(\b\d+\.?\d*\b)|(\btrue\b|\bfalse\b|\bnull\b)/g
    let vLast = 0
    let vMatch
    while ((vMatch = valueRegex.exec(rest)) !== null) {
      if (vMatch.index > vLast) {
        parts.push(<span key={key++}>{rest.slice(vLast, vMatch.index)}</span>)
      }
      if (vMatch[1]) parts.push(<span key={key++} className="text-green-600">{vMatch[1]}</span>)
      else if (vMatch[2]) parts.push(<span key={key++} className="text-blue-600">{vMatch[2]}</span>)
      else if (vMatch[3]) parts.push(<span key={key++} className="text-amber-600">{vMatch[3]}</span>)
      vLast = vMatch.index + vMatch[0].length
    }
    if (vLast < rest.length) parts.push(<span key={key++}>{rest.slice(vLast)}</span>)
  }
  return parts.length > 0 ? parts : line
}

export function DebugPanel({ events, onClear, onClose }: DebugPanelProps) {
  if (events.length === 0) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-center p-4 text-sm text-neutral-400">
          点击 Run 按钮开始执行工作流...
        </div>
      </div>
    )
  }

  const systemError = events.find(e => e.nodeId === 'system' && e.status === 'failed')
  if (systemError && events.length === 1) {
    return (
      <div className="px-4 py-2">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="font-medium">连接失败</div>
          <div className="mt-1">{systemError.error || '无法连接到执行服务器'}</div>
          <div className="mt-2 text-xs text-red-600">
            提示：工作流可能已在后台执行完成。请刷新页面查看最新结果。
          </div>
        </div>
      </div>
    )
  }

  const nodeEvents = events.filter(e => e.nodeId !== 'system')
  const totalMs = nodeEvents.reduce((sum, e) => sum + (e.durationMs ?? 0), 0)
  const totalTokens = nodeEvents.reduce((sum, e) => sum + (e.tokens ?? 0), 0)
  const completedCount = nodeEvents.filter(e => e.status === 'completed').length
  const failedCount = nodeEvents.filter(e => e.status === 'failed').length

  return (
    <div>
      {/* Summary header */}
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Clock className="h-3 w-3" />
          <span>{totalMs > 1000 ? `${(totalMs / 1000).toFixed(1)}s` : `${totalMs}ms`}</span>
        </div>
        {totalTokens > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Zap className="h-3 w-3" />
            <span>{totalTokens} tokens</span>
          </div>
        )}
        {completedCount > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span className="text-green-600">{completedCount}</span>
          </div>
        )}
        {failedCount > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <XCircle className="h-3 w-3 text-red-500" />
            <span className="text-red-600">{failedCount}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          {onClear && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-neutral-400" onClick={onClear}>
              <Trash2 className="mr-1 h-3 w-3" />
              清空
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-neutral-400" onClick={onClose}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="max-h-64">
        <div className="space-y-0 p-3 pl-4">
          {nodeEvents.map((event, index) => (
            <TimelineItem key={`${event.nodeId}-${event.executionId}`} event={event} isLast={index === nodeEvents.length - 1} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function TimelineItem({ event, isLast }: { event: NodeExecutionEvent; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const nodeLabel = NODE_TYPE_META[event.nodeType]?.label ?? event.nodeType

  return (
    <div className="flex">
      {/* Timeline track */}
      <div className="flex flex-col items-center">
        <div className={cn('h-3 w-3 rounded-full border-2 border-white shadow-sm', statusDotColor[event.status] ?? 'bg-neutral-300')} />
        {!isLast && <div className="w-px flex-1 bg-neutral-200" />}
      </div>

      {/* Content */}
      <div className="ml-3 flex-1 pb-3">
        <button
          className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm transition-colors hover:bg-neutral-50"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-neutral-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-neutral-400" />
          )}
          <span className="font-medium text-neutral-700">{event.nodeId}</span>
          <span className="text-xs text-neutral-400">{nodeLabel}</span>
          <Badge variant={badgeVariant[event.status] ?? 'outline'} className="text-[10px]">
            {STATUS_LABELS[event.status] ?? event.status}
          </Badge>
          {event.durationMs != null && (
            <span className="ml-auto text-xs text-neutral-400">{event.durationMs}ms</span>
          )}
        </button>

        {expanded && (
          <div className="mt-1 space-y-1.5 pl-6 text-xs">
            {event.error && (
              <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-red-700">
                {event.error}
              </div>
            )}
            {event.output && (
              <pre className="max-h-48 overflow-auto rounded-md bg-neutral-900 p-2 font-mono text-xs leading-relaxed text-neutral-100">
                {colorizeJson(event.output)}
              </pre>
            )}
            {event.tokens != null && event.tokens > 0 && (
              <div className="flex items-center gap-1 text-neutral-400">
                <Zap className="h-3 w-3" />
                Token: {event.tokens}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
