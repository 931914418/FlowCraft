import { Hono } from 'hono'
import { db } from '../db'
import { workflowDefinitions } from '../db/schema'
import { eq } from 'drizzle-orm'
import { engine } from '../engine/engine'
import type { WorkflowDefinition } from '@flowcraft/shared'

const app = new Hono()

app.post('/:hookPath', async (c) => {
  const { hookPath } = c.req.param()
  const body = await c.req.json().catch(() => ({}))

  // 根据 webhookPath 查找对应的 workflow
  const workflows = await db.select().from(workflowDefinitions)
    .where(eq(workflowDefinitions.webhookPath, hookPath))

  if (!workflows.length) {
    return c.json({ error: 'Webhook not found' }, 404)
  }

  const workflow = workflows[0]

  // 验证 webhook secret（如果配置了）
  if (workflow.webhookSecret) {
    const secret = c.req.header('X-Webhook-Secret')
    if (secret !== workflow.webhookSecret) {
      return c.json({ error: 'Invalid webhook secret' }, 401)
    }
  }

  // 触发 workflow 执行
  const executionId = await engine.execute(
    workflow.id,
    workflow.definition as WorkflowDefinition,
    body,
  )

  return c.json({ executionId, status: 'running' })
})

export default app
