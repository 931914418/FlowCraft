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
  const name = body.name || 'Untitled'
  const [wf] = await db.insert(workflowDefinitions).values({ name, definition: body }).returning()
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
  await db.update(workflowDefinitions)
    .set({ name: body.name, definition: body, updatedAt: new Date() })
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

    if (execution.status === 'completed' || execution.status === 'failed') return

    const nodeHandler = (data: unknown) => {
      stream.writeSSE({ event: 'node', data: JSON.stringify(data) }).catch(() => {})
    }

    const execHandler = (data: unknown) => {
      stream.writeSSE({ event: 'status', data: JSON.stringify(data) }).catch(() => {})
    }

    engineEvents.on(`node:${executionId}`, nodeHandler)
    engineEvents.once(`execution:${executionId}`, execHandler)

    try {
      await new Promise<void>((resolve) => {
        engineEvents.once(`execution:${executionId}`, () => resolve())
      })
    } finally {
      engineEvents.off(`node:${executionId}`, nodeHandler)
      engineEvents.off(`execution:${executionId}`, execHandler)
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
