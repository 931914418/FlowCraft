import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import testRoutes from '../test'
import { getExecutor } from '../../engine/executors'
import type { ExecutionContext, NodeExecutor } from '../../engine/executors'

// Mock executors 模块
vi.mock('../../engine/executors', () => ({
  getExecutor: vi.fn(),
  renderTemplate: vi.fn(),
}))

const mockGetExecutor = vi.mocked(getExecutor)

function createMockExecutor(impl?: (...args: unknown[]) => unknown) {
  const executor = {
    execute: vi.fn().mockImplementation(impl || (() => Promise.resolve({ output: null, tokens: 0 }))),
  }
  return executor as unknown as NodeExecutor
}

function createTestApp() {
  const app = new Hono()
  app.route('/api/test', testRoutes)
  return app
}

describe('POST /api/test/node', () => {
  let app: Hono

  beforeEach(() => {
    app = createTestApp()
    vi.clearAllMocks()
  })

  it('should return 400 when nodeType is missing', async () => {
    const res = await app.request('/api/test/node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: {} }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Missing required fields')
  })

  it('should return 400 when config is missing', async () => {
    const res = await app.request('/api/test/node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeType: 'http' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Missing required fields')
  })

  it('should return 400 for unsupported node type', async () => {
    const res = await app.request('/api/test/node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeType: 'start', config: {} }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Unsupported node type')
  })

  it('should return 400 when no executor available for type', async () => {
    mockGetExecutor.mockReturnValue(null)

    const res = await app.request('/api/test/node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeType: 'data-mapper', config: {} }),
    })

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('No executor available')
  })

  it('should execute a condition node and return success result', async () => {
    const executor = createMockExecutor(() =>
      Promise.resolve({ output: { branch: 'true' }, tokens: 0 }),
    )
    mockGetExecutor.mockReturnValue(executor)

    const res = await app.request('/api/test/node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeType: 'condition',
        config: { field: 'status', operator: 'eq', value: 200 },
        testInput: { status: 200 },
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.output).toEqual({ branch: 'true' })
    expect(body.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('should pass testInput to both variables.input and nodeOutputs when no testUpstream', async () => {
    const executor = createMockExecutor(() =>
      Promise.resolve({ output: 'result', tokens: 0 }),
    )
    mockGetExecutor.mockReturnValue(executor)

    const testInput = { key: 'value', nested: { a: 1 } }
    await app.request('/api/test/node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeType: 'http',
        config: { url: 'https://example.com', method: 'GET' },
        testInput,
      }),
    })

    expect(executor.execute).toHaveBeenCalledTimes(1)
    const calls = (executor.execute as any).mock.calls
    const [nodeArg, contextArg] = calls[0]
    expect(nodeArg.id).toBe('test-node')
    expect(nodeArg.type).toBe('http')
    // testInput 同时放入 variables.input 和 nodeOutputs
    expect((contextArg as ExecutionContext).variables.get('input')).toEqual(testInput)
    expect((contextArg as ExecutionContext).nodeOutputs.get('key')).toBe('value')
    expect((contextArg as ExecutionContext).nodeOutputs.get('nested')).toEqual({ a: 1 })
  })

  it('should pass testUpstream as nodeOutputs and testInput as variables.input', async () => {
    const executor = createMockExecutor(() =>
      Promise.resolve({ output: 'result', tokens: 0 }),
    )
    mockGetExecutor.mockReturnValue(executor)

    const testUpstream = { 'http-1': { status: 200 }, 'llm-1': { text: 'hello' } }
    const testInput = { score: 85 }
    await app.request('/api/test/node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeType: 'condition',
        config: { field: { sourceNodeId: 'http-1', path: 'status' }, operator: 'eq', value: 200 },
        testInput,
        testUpstream,
      }),
    })

    expect(executor.execute).toHaveBeenCalledTimes(1)
    const calls = (executor.execute as any).mock.calls
    const contextArg = calls[0][1] as ExecutionContext
    // testUpstream → nodeOutputs
    expect(contextArg.nodeOutputs.get('http-1')).toEqual({ status: 200 })
    expect(contextArg.nodeOutputs.get('llm-1')).toEqual({ text: 'hello' })
    // testInput → variables.input
    expect(contextArg.variables.get('input')).toEqual(testInput)
  })

  it('should return error when executor throws', async () => {
    const executor = createMockExecutor(() =>
      Promise.reject(new Error('Network timeout')),
    )
    mockGetExecutor.mockReturnValue(executor)

    const res = await app.request('/api/test/node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeType: 'http',
        config: { url: 'https://example.com', method: 'GET' },
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Network timeout')
    expect(body.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('should handle non-Error thrown values', async () => {
    const executor = createMockExecutor(() =>
      Promise.reject('string error'),
    )
    mockGetExecutor.mockReturnValue(executor)

    const res = await app.request('/api/test/node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeType: 'http',
        config: { url: 'https://example.com', method: 'GET' },
      }),
    })

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('string error')
  })

  it('should work without testInput', async () => {
    const executor = createMockExecutor(() =>
      Promise.resolve({ output: 'ok', tokens: 0 }),
    )
    mockGetExecutor.mockReturnValue(executor)

    const res = await app.request('/api/test/node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeType: 'http',
        config: { url: 'https://example.com', method: 'GET' },
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const calls = (executor.execute as any).mock.calls
    const contextArg = calls[0][1] as ExecutionContext
    expect(contextArg.variables.size).toBe(0)
    expect(contextArg.nodeOutputs.size).toBe(0)
  })
})
