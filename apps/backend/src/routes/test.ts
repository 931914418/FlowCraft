import { Hono } from 'hono'
import { getExecutor } from '../engine/executors'
import type { ExecutionContext } from '../engine/executors'
import type { DAGNode } from '../engine/dag'
import type { NodeType } from '@flowcraft/shared'

interface TestNodeRequest {
  nodeType: NodeType
  config: Record<string, unknown>
  testInput?: Record<string, unknown>
  testUpstream?: Record<string, unknown>
}

interface TestNodeResponse {
  success: boolean
  output: unknown
  durationMs: number
  error?: string
}

const SUPPORTED_NODE_TYPES: NodeType[] = ['http', 'llm', 'condition', 'code', 'data-mapper', 'ai-processor']

const app = new Hono()

app.post('/node', async (c) => {
  const body = await c.req.json<TestNodeRequest>()

  const { nodeType, config, testInput, testUpstream } = body

  if (!nodeType || !config) {
    return c.json<TestNodeResponse>(
      { success: false, output: null, durationMs: 0, error: 'Missing required fields: nodeType, config' },
      400,
    )
  }

  if (!SUPPORTED_NODE_TYPES.includes(nodeType)) {
    return c.json<TestNodeResponse>(
      { success: false, output: null, durationMs: 0, error: `Unsupported node type: ${nodeType}` },
      400,
    )
  }

  const executor = getExecutor(nodeType)
  if (!executor) {
    return c.json<TestNodeResponse>(
      { success: false, output: null, durationMs: 0, error: `No executor available for node type: ${nodeType}` },
      400,
    )
  }

  const node: DAGNode = {
    id: 'test-node',
    type: nodeType,
    config,
    parents: [],
    children: [],
    incomingEdges: [],
  }

  // 构建 context：testUpstream 放入 nodeOutputs，testInput 放入 variables.input
  // 同时兼容旧逻辑：当没有 testUpstream 时，testInput 也放入 nodeOutputs（虚拟上游节点 "__test__"）
  let context: ExecutionContext
  if (testUpstream) {
    context = {
      nodeOutputs: new Map(Object.entries(testUpstream)),
      variables: new Map(testInput ? [['input', testInput]] : []),
    }
  } else if (testInput) {
    // 向后兼容：testInput 同时放入 nodeOutputs 和 variables.input
    context = {
      nodeOutputs: new Map(Object.entries(testInput)),
      variables: new Map([['input', testInput]]),
    }
  } else {
    context = {
      nodeOutputs: new Map(),
      variables: new Map(),
    }
  }

  const start = Date.now()
  try {
    const result = await executor.execute(node, context)
    return c.json<TestNodeResponse>({
      success: true,
      output: result.output,
      durationMs: Date.now() - start,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json<TestNodeResponse>({
      success: false,
      output: null,
      durationMs: Date.now() - start,
      error: message,
    })
  }
})

export default app
