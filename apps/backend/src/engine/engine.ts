import { EventEmitter } from 'events'
import { db, schema } from '../db'
const { workflowExecutions, nodeExecutions } = schema
import { eq } from 'drizzle-orm'
import { parseDAG, topologicalSort } from './dag'
import { getExecutor, renderTemplate, type ExecutionContext } from './executors'
import type { WorkflowDefinition, NodeType, NodeExecutionEvent } from '@flowcraft/shared'

export const engineEvents = new EventEmitter()
engineEvents.setMaxListeners(1000)

export class WorkflowEngine {
  private running = new Map<string, AbortController>()

  async execute(workflowId: string, definition: WorkflowDefinition, input: Record<string, unknown> = {}): Promise<string> {
    const inputVal = this.isSqlite ? JSON.stringify(input) : input
    const [execution] = await db.insert(workflowExecutions).values({
      workflowId, status: 'running', input: inputVal,
    }).returning()

    const abortCtrl = new AbortController()
    this.running.set(execution.id, abortCtrl)

    this.runExecution(execution.id, definition, input, abortCtrl).catch(console.error)
    return execution.id
  }

  private async runExecution(
    executionId: string, definition: WorkflowDefinition,
    input: Record<string, unknown>, abortCtrl: AbortController,
  ) {
    const startTime = Date.now()
    const dag = parseDAG(definition)
    const layers = topologicalSort(dag)
    const context: ExecutionContext = {
      variables: new Map(Object.entries(input)),
      nodeOutputs: new Map(),
    }
    // 将完整输入对象也存入 variables.input，供 start 节点和执行器使用
    context.variables.set('input', input)
    let totalTokens = 0
    const skippedNodes = new Set<string>()
    let hasFailure = false

    try {
      for (const layer of layers) {
        if (abortCtrl.signal.aborted) break

        const results = await Promise.allSettled(
          layer.map(nodeId => this.executeNode(executionId, nodeId, dag, context, skippedNodes))
        )

        for (let i = 0; i < layer.length; i++) {
          const nodeId = layer[i]
          const result = results[i]
          if (skippedNodes.has(nodeId)) continue

          if (result.status === 'fulfilled' && result.value) {
            context.nodeOutputs.set(nodeId, result.value.output)
            totalTokens += result.value.tokens

            const dagNode = dag.nodes.get(nodeId)
            if (dagNode?.type === 'condition' && (result.value.output as Record<string, unknown>)?.branch) {
              context.variables.set(`${nodeId}.branch`, (result.value.output as Record<string, unknown>).branch)
            }
          } else if (result.status === 'rejected') {
            hasFailure = true
            console.error(`[Engine] Node ${nodeId} failed:`, result.reason)
          }
        }
      }

      const endNodes = definition.nodes.filter((n: { type: string }) => n.type === 'end')
      const finalOutput = endNodes.length > 0
        ? context.nodeOutputs.get(endNodes[0].id) || { message: 'completed' }
        : { message: 'completed' }

      const outputVal = this.isSqlite ? JSON.stringify(finalOutput) : finalOutput
      const completedAt = this.isSqlite ? new Date().toISOString() : new Date()
      await db.update(workflowExecutions)
        .set({ status: hasFailure ? 'failed' : 'completed', output: outputVal, totalTokens, durationMs: Date.now() - startTime, completedAt })
        .where(eq(workflowExecutions.id, executionId))

      engineEvents.emit(`execution:${executionId}`, { executionStatus: hasFailure ? 'failed' : 'completed' })
    } catch (err) {
      const completedAt = this.isSqlite ? new Date().toISOString() : new Date()
      await db.update(workflowExecutions)
        .set({ status: 'failed', durationMs: Date.now() - startTime, completedAt })
        .where(eq(workflowExecutions.id, executionId))

      engineEvents.emit(`execution:${executionId}`, { executionStatus: 'failed', error: String(err) })
    } finally {
      this.running.delete(executionId)
    }
  }

  private async executeNode(
    executionId: string, nodeId: string, dag: InstanceType<typeof import('./dag').DAG>,
    context: ExecutionContext, skippedNodes: Set<string>,
  ): Promise<{ output: unknown; tokens: number } | null> {
    const dagNode = dag.nodes.get(nodeId)!

    if (dagNode.type === 'start') {
      // 将工作流输入数据传递给下游节点，使 Condition V2 等执行器可以正确解析上游数据
      const input = context.variables.get('input') || {}
      await this.upsertNode(executionId, nodeId, 'completed', input)
      return { output: input, tokens: 0 }
    }

    if (dagNode.type === 'end') {
      const output = dagNode.config.output
        ? renderTemplate(String(dagNode.config.output), context)
        : context.nodeOutputs.size > 0
          ? Object.fromEntries(context.nodeOutputs)
          : { message: 'completed' }
      await this.upsertNode(executionId, nodeId, 'completed', output)
      return { output, tokens: 0 }
    }

    const incomingEdges = dag.getIncomingEdges(nodeId)
    for (const edge of incomingEdges) {
      const parentNode = dag.nodes.get(edge.source)
      if (parentNode?.type === 'condition') {
        const branch = context.variables.get(`${edge.source}.branch`)
        if (edge.sourceHandle && edge.sourceHandle !== branch) {
          skippedNodes.add(nodeId)
          await this.upsertNode(executionId, nodeId, 'skipped')
          const eventData = { nodeId, status: 'skipped' }
          engineEvents.emit(`node:${executionId}:${nodeId}`, eventData)
          engineEvents.emit(`node:${executionId}`, eventData)
          return null
        }
      }
    }

    const executor = getExecutor(dagNode.type as NodeType)
    if (!executor) {
      await this.upsertNode(executionId, nodeId, 'failed', undefined, `No executor for type: ${dagNode.type}`)
      const eventData = { nodeId, status: 'failed', error: `No executor: ${dagNode.type}` }
      engineEvents.emit(`node:${executionId}:${nodeId}`, eventData)
      engineEvents.emit(`node:${executionId}`, eventData)
      return null
    }

    await this.upsertNode(executionId, nodeId, 'running')
    const eventData = { nodeId, status: 'running' }
    engineEvents.emit(`node:${executionId}:${nodeId}`, eventData)
    engineEvents.emit(`node:${executionId}`, eventData)

    const nodeStart = Date.now()
    try {
      const result = await executor.execute(dagNode, context)
      await this.upsertNode(executionId, nodeId, 'completed', result.output, undefined, result.tokens, Date.now() - nodeStart)
      const eventData = { nodeId, status: 'completed', output: result.output, tokens: result.tokens, durationMs: Date.now() - nodeStart }
      engineEvents.emit(`node:${executionId}:${nodeId}`, eventData)
      engineEvents.emit(`node:${executionId}`, eventData)
      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      await this.upsertNode(executionId, nodeId, 'failed', undefined, msg, 0, Date.now() - nodeStart)
      const eventData = { nodeId, status: 'failed', error: msg }
      engineEvents.emit(`node:${executionId}:${nodeId}`, eventData)
      engineEvents.emit(`node:${executionId}`, eventData)
      throw err
    }
  }

  private isSqlite = (process.env.DB_DRIVER || 'postgres') === 'sqlite'

  private toDbValue(val: unknown): unknown {
    if (val instanceof Date) return val.toISOString()
    if (val !== null && typeof val === 'object') {
      try { return JSON.stringify(val) } catch { return String(val) }
    }
    return val
  }

  private async upsertNode(
    executionId: string, nodeId: string, status: string,
    output?: unknown, error?: string, tokens = 0, durationMs = 0,
  ) {
    const startedAt = this.isSqlite ? new Date().toISOString() : new Date()
    const completedAt = (status === 'completed' || status === 'failed') ? (this.isSqlite ? new Date().toISOString() : new Date()) : undefined
    const outputVal = output !== undefined ? (this.isSqlite ? JSON.stringify(output) : output) : undefined
    const values = {
      executionId, nodeId, status,
      ...(outputVal !== undefined ? { output: outputVal } : {}),
      ...(error !== undefined ? { error } : {}),
      tokens, durationMs,
      startedAt,
      ...(completedAt !== undefined ? { completedAt } : {}),
    }

    await db.insert(nodeExecutions)
      .values(values)
      .onConflictDoUpdate({
        target: [nodeExecutions.executionId, nodeExecutions.nodeId],
        set: {
          status,
          ...(outputVal !== undefined ? { output: outputVal } : {}),
          ...(error !== undefined ? { error } : {}),
          ...(tokens ? { tokens } : {}),
          ...(durationMs ? { durationMs } : {}),
          ...(completedAt !== undefined ? { completedAt } : {}),
        },
      })
  }

  abort(executionId: string) {
    this.running.get(executionId)?.abort()
  }

  async recoverStaleExecutions() {
    const stale = await db.query.workflowExecutions.findMany({
      where: eq(workflowExecutions.status, 'running'),
    })
    const completedAt = this.isSqlite ? new Date().toISOString() : new Date()
    for (const exec of stale) {
      await db.update(workflowExecutions)
        .set({ status: 'failed', completedAt })
        .where(eq(workflowExecutions.id, exec.id))
      console.log(`[Recovery] Marked stale execution ${exec.id} as failed`)
    }
  }
}

export const engine = new WorkflowEngine()
