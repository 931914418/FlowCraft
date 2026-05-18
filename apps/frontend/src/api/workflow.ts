import type { WorkflowDefinition, NodeExecutionEvent } from '@flowcraft/shared'

const API_BASE = '/api/workflows'

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new ApiError(typeof body === 'string' ? body : res.statusText, res.status)
  }
  return res.json()
}

interface WorkflowRow {
  id: string
  name: string
  definition: WorkflowDefinition
  createdAt?: string
  updatedAt?: string
}

function unwrap(row: WorkflowRow): WorkflowDefinition {
  return { ...row.definition, id: row.id, name: row.name }
}

export async function listWorkflows(): Promise<WorkflowDefinition[]> {
  const rows = await request<WorkflowRow[]>(API_BASE)
  return rows.map(unwrap)
}

export async function getWorkflow(id: string): Promise<WorkflowDefinition> {
  const row = await request<WorkflowRow>(`${API_BASE}/${id}`)
  return unwrap(row)
}

export async function saveWorkflow(
  workflow: WorkflowDefinition
): Promise<WorkflowDefinition> {
  const row = await request<WorkflowRow>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(workflow),
  })
  return unwrap(row)
}

export async function updateWorkflow(
  id: string,
  workflow: WorkflowDefinition
): Promise<void> {
  await request(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(workflow),
  })
}

export async function deleteWorkflow(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new ApiError(res.statusText, res.status)
  }
}

export async function runWorkflow(id: string): Promise<{ executionId: string }> {
  return request<{ executionId: string }>(`${API_BASE}/${id}/run`, {
    method: 'POST',
  })
}

export function connectExecutionSSE(
  executionId: string,
  onEvent: (event: NodeExecutionEvent) => void,
  onError?: (error: Event) => void
): () => void {
  const source = new EventSource(`/api/workflows/execution/${executionId}/stream`)

  source.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as NodeExecutionEvent
      onEvent(data)
    } catch {
      // ignore malformed events
    }
  }

  source.addEventListener('complete', () => {
    source.close()
  })

  source.onerror = (e) => {
    onError?.(e)
    source.close()
  }

  return () => source.close()
}

export { ApiError }
