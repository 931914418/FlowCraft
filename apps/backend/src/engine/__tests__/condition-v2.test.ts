import { describe, it, expect } from 'vitest'
import { ConditionExecutor } from '../executors'
import type { ExecutionContext } from '../executors'

// DAGNode 类型与 dag.ts 保持一致
interface TestDAGNode {
  id: string
  type: string
  config: Record<string, unknown>
  parents: string[]
  children: string[]
  incomingEdges: unknown[]
}

// 辅助：创建 ExecutionContext
function makeContext(
  nodeOutputs: Record<string, unknown> = {},
  variables: Record<string, unknown> = {},
): ExecutionContext {
  return {
    nodeOutputs: new Map(Object.entries(nodeOutputs)),
    variables: new Map(Object.entries(variables)),
  }
}

// 辅助：创建 condition 节点
function makeConditionNode(config: Record<string, unknown>): TestDAGNode {
  return {
    id: 'cond-1',
    type: 'condition',
    config,
    parents: [],
    children: [],
    incomingEdges: [],
  }
}

describe('ConditionExecutor V2', () => {
  const executor = new ConditionExecutor()

  it('eq — 相等判断（true）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'status' },
      operator: 'eq',
      value: 200,
    })
    const ctx = makeContext({ 'http-1': { status: 200 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('eq — 不相等（false）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'status' },
      operator: 'eq',
      value: 200,
    })
    const ctx = makeContext({ 'http-1': { status: 404 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })

  it('neq — 不等判断（true）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'status' },
      operator: 'neq',
      value: 200,
    })
    const ctx = makeContext({ 'http-1': { status: 404 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('gt — 大于判断（true）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'count' },
      operator: 'gt',
      value: 5,
    })
    const ctx = makeContext({ 'http-1': { count: 10 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('gt — 大于判断（false）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'count' },
      operator: 'gt',
      value: 100,
    })
    const ctx = makeContext({ 'http-1': { count: 10 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })

  it('lt — 小于判断', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'count' },
      operator: 'lt',
      value: 20,
    })
    const ctx = makeContext({ 'http-1': { count: 10 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('gte — 大于等于（等于时 true）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'score' },
      operator: 'gte',
      value: 60,
    })
    const ctx = makeContext({ 'http-1': { score: 60 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('lte — 小于等于（等于时 true）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'score' },
      operator: 'lte',
      value: 60,
    })
    const ctx = makeContext({ 'http-1': { score: 60 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('contains — 字符串包含（true）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'llm-1', path: '' },
      operator: 'contains',
      value: 'success',
    })
    const ctx = makeContext({ 'llm-1': 'The operation was a success' })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('contains — 字符串不包含（false）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'llm-1', path: '' },
      operator: 'contains',
      value: 'failure',
    })
    const ctx = makeContext({ 'llm-1': 'The operation was a success' })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })

  it('not_contains — 字符串不包含（true）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'llm-1', path: '' },
      operator: 'not_contains',
      value: 'error',
    })
    const ctx = makeContext({ 'llm-1': 'All systems normal' })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('empty — null 值检测为空（true）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'data' },
      operator: 'empty',
      value: '',
    })
    const ctx = makeContext({ 'http-1': { data: null } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('empty — 空字符串检测为空（true）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'data' },
      operator: 'empty',
      value: '',
    })
    const ctx = makeContext({ 'http-1': { data: '' } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('empty — 有值时检测为非空（false）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'data' },
      operator: 'empty',
      value: '',
    })
    const ctx = makeContext({ 'http-1': { data: 'hello' } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })

  it('not_empty — 有值检测（true）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'data' },
      operator: 'not_empty',
      value: '',
    })
    const ctx = makeContext({ 'http-1': { data: 'hello' } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('not_empty — null 值检测（false）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'data' },
      operator: 'not_empty',
      value: '',
    })
    const ctx = makeContext({ 'http-1': { data: null } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })

  it('嵌套路径解析 data.user.age', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'data.user.age' },
      operator: 'gt',
      value: 18,
    })
    const ctx = makeContext({ 'http-1': { data: { user: { age: 25 } } } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('字段不存在时 eq 返回 false', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: 'nonexistent' },
      operator: 'eq',
      value: 'anything',
    })
    const ctx = makeContext({ 'http-1': {} })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })

  it('sourceNodeId 不存在时 eq 返回 false', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'missing-node', path: 'data' },
      operator: 'eq',
      value: 'anything',
    })
    const ctx = makeContext({})
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })

  it('简单字段名格式（字符串 field）— 从 input 中取值', async () => {
    const node = makeConditionNode({
      field: 'score',
      operator: 'gte',
      value: 60,
    })
    const ctx = makeContext({}, { input: { score: 85 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('简单字段名格式 — 不满足条件', async () => {
    const node = makeConditionNode({
      field: 'score',
      operator: 'gte',
      value: 60,
    })
    const ctx = makeContext({}, { input: { score: 30 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })

  it('path 为空时直接返回上游节点的完整输出', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'llm-1', path: '' },
      operator: 'eq',
      value: 'yes',
    })
    const ctx = makeContext({ 'llm-1': 'yes' })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('完整输出对象直接比较（path 为空）', async () => {
    const node = makeConditionNode({
      field: { sourceNodeId: 'http-1', path: '' },
      operator: 'empty',
      value: '',
    })
    const ctx = makeContext({ 'http-1': { status: 200, body: 'ok' } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })
})

describe('ConditionExecutor V1 兼容', () => {
  const executor = new ConditionExecutor()

  it('V1 expression 格式 — 大于判断（true）', async () => {
    const node = makeConditionNode({ expression: 'count > 5' })
    const ctx = makeContext({}, { input: { count: 10 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('V1 expression 格式 — 大于判断（false）', async () => {
    const node = makeConditionNode({ expression: 'count > 100' })
    const ctx = makeContext({}, { input: { count: 10 } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })

  it('V1 expression 格式 — 等于判断', async () => {
    const node = makeConditionNode({ expression: "status == 'ok'" })
    const ctx = makeContext({}, { input: { status: 'ok' } })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'true' })
  })

  it('V1 expression 格式 — 不匹配的表达式返回 false', async () => {
    const node = makeConditionNode({ expression: 'invalid expression' })
    const ctx = makeContext({}, { input: {} })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })

  it('V1 expression 格式 — 空表达式返回 false', async () => {
    const node = makeConditionNode({ expression: '' })
    const ctx = makeContext({}, { input: {} })
    const result = await executor.execute(node as any, ctx)
    expect(result.output).toEqual({ branch: 'false' })
  })
})
