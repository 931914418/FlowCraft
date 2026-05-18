import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { db } from '../db'
import { workflowDefinitions, workflowExecutions, nodeExecutions } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { engine, engineEvents } from '../engine/engine'
import type { WorkflowDefinition } from '@flowcraft/shared'

export const workflowRoutes = new Hono()

workflowRoutes.post('/', async (c) => {
  const body = await c.req.json()
  if (typeof body !== 'object' || body === null) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled'
  if (!Array.isArray(body.nodes)) {
    return c.json({ error: 'nodes must be an array' }, 400)
  }
  if (!Array.isArray(body.edges)) {
    return c.json({ error: 'edges must be an array' }, 400)
  }
  // 提取 webhook 字段写入独立列，而非嵌在 definition JSON 内
  const { webhookPath, webhookSecret, ...definition } = body
  const [wf] = await db.insert(workflowDefinitions).values({
    name,
    definition,
    webhookPath: webhookPath || null,
    webhookSecret: webhookSecret || null,
  }).returning()
  return c.json(wf)
})

workflowRoutes.get('/', async (c) => {
  const limit = Math.min(Number(c.req.query('limit')) || 50, 100)
  const offset = Number(c.req.query('offset')) || 0
  const workflows = await db.query.workflowDefinitions.findMany({
    orderBy: [desc(workflowDefinitions.updatedAt)],
    limit,
    offset,
  })
  return c.json(workflows)
})

workflowRoutes.get('/:id', async (c) => {
  const wf = await db.query.workflowDefinitions.findFirst({ where: eq(workflowDefinitions.id, c.req.param('id')) })
  if (!wf) return c.json({ error: 'Workflow not found' }, 404)
  return c.json(wf)
})

workflowRoutes.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  if (typeof body !== 'object' || body === null) {
    return c.json({ error: 'Invalid request body' }, 400)
  }
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled'
  // 提取 webhook 字段写入独立列，而非嵌在 definition JSON 内
  const { webhookPath, webhookSecret, ...definition } = body
  await db.update(workflowDefinitions)
    .set({
      name,
      definition,
      webhookPath: webhookPath || null,
      webhookSecret: webhookSecret || null,
      updatedAt: new Date(),
    })
    .where(eq(workflowDefinitions.id, id))
  return c.json({ ok: true })
})

workflowRoutes.delete('/:id', async (c) => {
  await db.delete(workflowDefinitions).where(eq(workflowDefinitions.id, c.req.param('id')))
  return c.json({ ok: true })
})

workflowRoutes.post('/:id/run', async (c) => {
  const id = c.req.param('id')
  const input = await c.req.json().catch(() => ({}))
  const wf = await db.query.workflowDefinitions.findFirst({ where: eq(workflowDefinitions.id, id) })
  if (!wf) return c.json({ error: 'Workflow not found' }, 404)
  const executionId = await engine.execute(id, wf.definition as WorkflowDefinition, input)
  return c.json({ executionId, status: 'running' })
})

workflowRoutes.get('/execution/:executionId/stream', async (c) => {
  const executionId = c.req.param('executionId')

  return streamSSE(c, async (stream) => {
    const execution = await db.query.workflowExecutions.findFirst({
      where: eq(workflowExecutions.id, executionId),
    })
    if (!execution) {
      await stream.writeSSE({ event: 'error', data: JSON.stringify({ error: 'Execution not found' }) })
      return
    }

    const nodes = await db.query.nodeExecutions.findMany({
      where: eq(nodeExecutions.executionId, executionId),
    })
    await stream.writeSSE({
      event: 'status',
      data: JSON.stringify({
        executionStatus: execution.status,
        nodes: nodes.map(n => ({ nodeId: n.nodeId, status: n.status, output: n.output, tokens: n.tokens, durationMs: n.durationMs, error: n.error })),
      }),
    })

    // If execution is already completed/failed, send end event and close
    if (execution.status === 'completed' || execution.status === 'failed') {
      await stream.writeSSE({ event: 'end', data: JSON.stringify({ status: execution.status }) })
      return
    }

    const nodeHandler = (data: unknown) => {
      stream.writeSSE({ event: 'node', data: JSON.stringify(data) }).catch(() => {})
    }

    const execHandler = (data: unknown) => {
      stream.writeSSE({ event: 'status', data: JSON.stringify(data) }).catch(() => {})
    }

    engineEvents.on(`node:${executionId}`, nodeHandler)
    engineEvents.on(`execution:${executionId}`, execHandler)

    const cleanup = () => {
      engineEvents.off(`node:${executionId}`, nodeHandler)
      engineEvents.off(`execution:${executionId}`, execHandler)
    }

    // 客户端断开时移除所有监听器，防止泄漏
    stream.onAbort(cleanup)

    try {
      await new Promise<void>((resolve) => {
        engineEvents.once(`execution:${executionId}`, () => resolve())
      })
    } finally {
      cleanup()
    }
  })
})

workflowRoutes.get('/:id/executions', async (c) => {
  const limit = Math.min(Number(c.req.query('limit')) || 50, 100)
  const executions = await db.query.workflowExecutions.findMany({
    where: eq(workflowExecutions.workflowId, c.req.param('id')),
    orderBy: [desc(workflowExecutions.startedAt)],
    limit,
  })
  return c.json(executions)
})
