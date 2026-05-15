import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Loader2, FileText, AlertCircle } from 'lucide-react'
import { listWorkflows, deleteWorkflow } from '@/api/workflow'
import type { WorkflowDefinition } from '@flowcraft/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function ListView() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const handleCreate = () => {
    navigate('/editor')
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
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
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        <span className="ml-3 text-neutral-500">Loading workflows...</span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Workflows</h1>
          <p className="mt-1 text-sm text-neutral-500">Create and manage your automation workflows</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-1 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="mb-4 h-12 w-12 text-neutral-300" />
          <h2 className="text-lg font-medium text-neutral-600">No workflows yet</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Create your first workflow to get started.
          </p>
          <Button className="mt-6" onClick={handleCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Create Workflow
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <Card
              key={wf.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/editor/${wf.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-neutral-800">
                      {wf.name || 'Untitled'}
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary">
                        {wf.nodes?.length ?? 0} nodes
                      </Badge>
                      {wf.version != null && (
                        <Badge variant="outline">v{wf.version}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-neutral-400 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(wf.id!, wf.name)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
