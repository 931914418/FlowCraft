import { useState } from 'react'
import type { NodeExecutionEvent } from '@flowcraft/shared'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface DebugPanelProps {
  events: NodeExecutionEvent[]
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  running: 'default',
  completed: 'secondary',
  failed: 'destructive',
  skipped: 'outline',
}

export function DebugPanel({ events }: DebugPanelProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-neutral-400">
        🔄 点击 Run 按钮开始执行工作流...
      </div>
    )
  }

  // Check if there's a system error
  const systemError = events.find(e => e.nodeId === 'system' && e.status === 'failed')
  if (systemError && events.length === 1) {
    return (
      <div className="p-4">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="font-medium">⚠️ 连接失败</div>
          <div className="mt-1">{systemError.error || '无法连接到执行服务器'}</div>
          <div className="mt-2 text-xs text-red-600">
            提示：工作流可能已在后台执行完成。请刷新页面查看最新结果。
          </div>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="max-h-64">
      <div className="space-y-1 p-2">
        {events.map((event) => (
          <DebugEventItem key={`${event.nodeId}-${event.executionId}`} event={event} />
        ))}
      </div>
    </ScrollArea>
  )
}

function DebugEventItem({ event }: { event: NodeExecutionEvent }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-md border border-neutral-200 bg-white">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-neutral-400" />
        ) : (
          <ChevronRight className="h-3 w-3 text-neutral-400" />
        )}
        <span className="font-medium text-neutral-700">{event.nodeId}</span>
        <span className="text-xs text-neutral-400">{event.nodeType}</span>
        <Badge variant={statusVariant[event.status] ?? 'outline'}>
          {event.status}
        </Badge>
        {event.durationMs != null && (
          <span className="ml-auto text-xs text-neutral-400">{event.durationMs}ms</span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-neutral-100 px-3 py-2 text-xs text-neutral-600">
          {event.error && (
            <div className="mb-1 text-red-600">Error: {event.error}</div>
          )}
          {event.output && (
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2 font-mono">
              {event.output}
            </pre>
          )}
          {event.tokens != null && (
            <div className="mt-1 text-neutral-400">Tokens: {event.tokens}</div>
          )}
        </div>
      )}
    </div>
  )
}
