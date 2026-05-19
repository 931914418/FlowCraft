import type { AIWorkflowResult } from '@/components/AIChatBar'
import { NODE_TYPE_META } from '@flowcraft/shared'
import { Button } from '@/components/ui/button'
import { getNodeColor } from '@/lib/node-theme'
import {
  PlayCircle, Square, Bot, GitBranch, Code, Globe, Table2, Sparkles,
  Wand2, X, RefreshCw, ArrowRight,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  PlayCircle, Square, bot: Bot, 'git-branch': GitBranch, code: Code,
  globe: Globe, 'table-2': Table2, sparkles: Sparkles,
}

interface AIPreviewPanelProps {
  result: AIWorkflowResult
  explanation: string
  onApply: () => void
  onDiscard: () => void
  onRegenerate: () => void
}

export function AIPreviewPanel({ result, explanation, onApply, onDiscard, onRegenerate }: AIPreviewPanelProps) {
  const nodeCounts = result.nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4 px-1">
      <div className="space-y-4">
        {/* Workflow name */}
        <div>
          <h4 className="text-base font-semibold text-neutral-800">{result.name}</h4>
          {explanation && (
            <p className="mt-1 text-sm leading-relaxed text-neutral-500">{explanation}</p>
          )}
        </div>

        {/* Node stats */}
        <div>
          <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            节点统计
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(nodeCounts).map(([type, count]) => {
              const meta = NODE_TYPE_META[type as keyof typeof NODE_TYPE_META]
              const colors = getNodeColor(type)
              if (!meta) return null
              return (
                <span
                  key={type}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.border} border`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                  {count}x {meta.label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Mini flow diagram */}
        <div>
          <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            流程预览
          </h5>
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            {result.nodes.map((node, index) => {
              const meta = NODE_TYPE_META[node.type as keyof typeof NODE_TYPE_META]
              const colors = getNodeColor(node.type)
              const Icon = meta ? ICON_MAP[meta.icon] : Code
              const isLast = index === result.nodes.length - 1

              return (
                <div key={node.id}>
                  <div className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${colors.border} ${colors.bg}`}>
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    <span className="text-xs font-medium text-neutral-700">{node.id}</span>
                    <span className="text-[10px] text-neutral-400">{meta?.label ?? node.type}</span>
                  </div>
                  {!isLast && (
                    <div className="flex flex-col items-center py-0.5">
                      <div className="h-3 w-px bg-neutral-300" />
                      <ArrowRight className="h-3 w-3 -rotate-90 text-neutral-300" />
                      <div className="h-3 w-px bg-neutral-300" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-1.5 text-xs text-neutral-400">
            共 {result.edges.length} 条连接
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 border-t border-neutral-100 pt-4">
          <Button variant="ghost" size="sm" onClick={onDiscard} className="text-neutral-500">
            <X className="mr-1 h-3 w-3" />
            放弃
          </Button>
          <Button variant="outline" size="sm" onClick={onRegenerate}>
            <RefreshCw className="mr-1 h-3 w-3" />
            重新生成
          </Button>
          <Button
            size="sm"
            onClick={onApply}
            className="ml-auto bg-violet-600 hover:bg-violet-700"
          >
            <Wand2 className="mr-1 h-3 w-3" />
            应用到画布
          </Button>
        </div>
      </div>
    </div>
  )
}
