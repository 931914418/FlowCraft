import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import webhookRoutes from '../webhook'

// Mock 数据库模块
const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockWhere = vi.fn()

vi.mock('../../db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
  schema: {
    workflowDefinitions: { webhookPath: 'webhook_path' },
  },
}))

// Mock engine 模块
const mockExecute = vi.fn()

vi.mock('../../engine/engine', () => ({
  engine: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}))

// Mock schema 以确保 workflowDefinitions.webhookPath 等字段可用
vi.mock('../../db/schema', () => {
  const col = (name: string) => name
  return {
    workflowDefinitions: {
      id: col('id'),
      webhookPath: col('webhook_path'),
      webhookSecret: col('webhook_secret'),
      definition: col('definition'),
    },
  }
})

function createTestApp() {
  const app = new Hono()
  app.route('/api/hooks', webhookRoutes)
  return app
}

describe('POST /api/hooks/:hookPath', () => {
  let app: Hono

  beforeEach(() => {
    app = createTestApp()
    vi.clearAllMocks()

    // 设置默认链式调用 mock
    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockResolvedValue([])
  })

  it('should return 404 when webhook path not found', async () => {
    mockWhere.mockResolvedValue([])

    const res = await app.request('/api/hooks/nonexistent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Webhook not found')
  })

  it('should trigger workflow and return executionId when webhook found', async () => {
    const fakeWorkflow = {
      id: 'wf-123',
      webhookSecret: null,
      definition: { nodes: [], edges: [] },
    }
    mockWhere.mockResolvedValue([fakeWorkflow])
    mockExecute.mockResolvedValue('exec-456')

    const res = await app.request('/api/hooks/my-hook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: 'data' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.executionId).toBe('exec-456')
    expect(body.status).toBe('running')

    expect(mockExecute).toHaveBeenCalledWith(
      'wf-123',
      { nodes: [], edges: [] },
      { payload: 'data' },
    )
  })

  it('should return 401 when secret is configured but not provided', async () => {
    const fakeWorkflow = {
      id: 'wf-123',
      webhookSecret: 'my-secret',
      definition: { nodes: [], edges: [] },
    }
    mockWhere.mockResolvedValue([fakeWorkflow])

    const res = await app.request('/api/hooks/my-hook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid webhook secret')
  })

  it('should return 401 when secret is wrong', async () => {
    const fakeWorkflow = {
      id: 'wf-123',
      webhookSecret: 'correct-secret',
      definition: { nodes: [], edges: [] },
    }
    mockWhere.mockResolvedValue([fakeWorkflow])

    const res = await app.request('/api/hooks/my-hook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': 'wrong-secret',
      },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(401)
  })

  it('should succeed when correct secret is provided', async () => {
    const fakeWorkflow = {
      id: 'wf-123',
      webhookSecret: 'correct-secret',
      definition: { nodes: [], edges: [] },
    }
    mockWhere.mockResolvedValue([fakeWorkflow])
    mockExecute.mockResolvedValue('exec-789')

    const res = await app.request('/api/hooks/my-hook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': 'correct-secret',
      },
      body: JSON.stringify({ data: 'test' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.executionId).toBe('exec-789')
    expect(body.status).toBe('running')
  })

  it('should handle request with no body (default to empty object)', async () => {
    const fakeWorkflow = {
      id: 'wf-123',
      webhookSecret: null,
      definition: { nodes: [], edges: [] },
    }
    mockWhere.mockResolvedValue([fakeWorkflow])
    mockExecute.mockResolvedValue('exec-empty')

    const res = await app.request('/api/hooks/my-hook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    expect(res.status).toBe(200)
    expect(mockExecute).toHaveBeenCalledWith(
      'wf-123',
      { nodes: [], edges: [] },
      {},
    )
  })
})
