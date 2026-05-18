import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Loader2, AlertCircle, Search, Sparkles, Zap, Clock, Globe } from 'lucide-react'
import { listWorkflows, deleteWorkflow } from '@/api/workflow'
import type { WorkflowDefinition } from '@flowcraft/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const TRIGGER_LABELS: Record<string, { label: string; icon: typeof Zap }> = {
  manual: { label: '手动', icon: Zap },
  webhook: { label: 'Webhook', icon: Globe },
  cron: { label: '定时', icon: Clock },
}

export default function ListView() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const loadWorkflows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listWorkflows()
      setWorkflows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkflows()
  }, [loadWorkflows])

  const filtered = useMemo(
    () =>
      workflows.filter((wf) =>
        wf.name.toLowerCase().includes(search.toLowerCase())
      ),
    [workflows, search]
  )

  const handleCreate = () => {
    navigate('/editor')
  }

  const handleAiCreate = () => {
    alert('AI 创建功能即将上线，敬请期待！')
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定删除「${name}」？此操作不可撤销。`)) return
    try {
      await deleteWorkflow(id)
      setWorkflows((prev) => prev.filter((wf) => wf.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-3 text-slate-400">Loading workflows...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-700">
            FlowCraft
          </h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              新建
            </Button>
            <Button variant="outline" onClick={handleAiCreate}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              AI 创建
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-6">
        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Search bar */}
        {workflows.length > 0 && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="搜索工作流..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* Empty state */}
        {workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <Sparkles className="h-7 w-7 text-slate-400" />
            </div>
            <h2 className="text-lg font-medium text-slate-700">还没有工作流</h2>
            <p className="mt-2 max-w-xs text-sm text-slate-400">
              用 AI 描述需求，帮你创建第一个工作流
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button onClick={handleCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                新建
              </Button>
              <Button variant="outline" onClick={handleAiCreate}>
                <Sparkles className="mr-1.5 h-4 w-4" />
                AI 创建
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* Search yielded no results */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">没有找到匹配的工作流</p>
          </div>
        ) : (
          /* Card grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((wf) => {
              const nodeCount = wf.nodes?.length ?? 0
              const triggerType = wf.trigger?.type ?? 'manual'
              const triggerInfo = TRIGGER_LABELS[triggerType] ?? TRIGGER_LABELS.manual
              const TriggerIcon = triggerInfo.icon

              return (
                <Card
                  key={wf.id}
                  className="cursor-pointer rounded-lg border-slate-200 transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/editor/${wf.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-slate-700">
                          {wf.name || 'Untitled'}
                        </h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-slate-400 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(wf.id!, wf.name)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Badges */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-xs">
                        <TriggerIcon className="h-3 w-3" />
                        {triggerInfo.label}
                      </Badge>
                    </div>

                    {/* Last run info */}
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300" />
                      从未运行
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
