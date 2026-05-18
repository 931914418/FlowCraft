import { describe, it, expect } from 'vitest'
import { DataMapperExecutor } from '../executors'
import type { ExecutionContext } from '../executors'

function makeContext(nodeOutputs: Record<string, unknown> = {}): ExecutionContext {
  return {
    nodeOutputs: new Map(Object.entries(nodeOutputs)),
    variables: new Map(),
  }
}

function makeNode(config: Record<string, any>) {
  return { id: 'dm-1', type: 'data-mapper', config, edges: { incoming: [], outgoing: [] } } as any
}

describe('DataMapperExecutor', () => {
  const executor = new DataMapperExecutor()

  it('应提取指定字段', async () => {
    const node = makeNode({
      sourceNodeId: 'http-1',
      mappings: [{ sourcePath: 'name', targetName: 'username', enabled: true }],
    })
    const ctx = makeContext({ 'http-1': { name: 'John', age: 30, email: 'john@test.com' } })
    const result = await executor.execute(node, ctx)
    expect(result.output).toEqual({ username: 'John' })
  })

  it('应支持嵌套路径', async () => {
    const node = makeNode({
      sourceNodeId: 'http-1',
      mappings: [{ sourcePath: 'user.profile.name', targetName: 'name', enabled: true }],
    })
    const ctx = makeContext({ 'http-1': { user: { profile: { name: 'John' } } } })
    const result = await executor.execute(node, ctx)
    expect(result.output).toEqual({ name: 'John' })
  })

  it('应忽略 disabled 的映射', async () => {
    const node = makeNode({
      sourceNodeId: 'http-1',
      mappings: [
        { sourcePath: 'a', targetName: 'a', enabled: true },
        { sourcePath: 'b', targetName: 'b', enabled: false },
      ],
    })
    const ctx = makeContext({ 'http-1': { a: 1, b: 2, c: 3 } })
    const result = await executor.execute(node, ctx)
    expect(result.output).toEqual({ a: 1 })
  })

  it('源字段不存在时应跳过，不报错', async () => {
    const node = makeNode({
      sourceNodeId: 'http-1',
      mappings: [{ sourcePath: 'email', targetName: 'email', enabled: true }],
    })
    const ctx = makeContext({ 'http-1': { name: 'John' } })
    const result = await executor.execute(node, ctx)
    expect(result.output).toEqual({})
  })

  it('应处理数组类型的上游输出', async () => {
    const node = makeNode({
      sourceNodeId: 'http-1',
      mappings: [{ sourcePath: '0.name', targetName: 'first', enabled: true }],
    })
    const ctx = makeContext({ 'http-1': [{ name: 'A' }, { name: 'B' }] })
    const result = await executor.execute(node, ctx)
    expect(result.output).toEqual({ first: 'A' })
  })

  it('无 sourceNodeId 时返回空对象', async () => {
    const node = makeNode({
      mappings: [{ sourcePath: 'name', targetName: 'name', enabled: true }],
    })
    const ctx = makeContext({ 'http-1': { name: 'John' } })
    const result = await executor.execute(node, ctx)
    expect(result.output).toEqual({})
  })

  it('无 mappings 时返回空对象', async () => {
    const node = makeNode({ sourceNodeId: 'http-1' })
    const ctx = makeContext({ 'http-1': { name: 'John' } })
    const result = await executor.execute(node, ctx)
    expect(result.output).toEqual({})
  })

  it('targetName 为空时使用 sourcePath', async () => {
    const node = makeNode({
      sourceNodeId: 'http-1',
      mappings: [{ sourcePath: 'name', targetName: '', enabled: true }],
    })
    const ctx = makeContext({ 'http-1': { name: 'John' } })
    const result = await executor.execute(node, ctx)
    expect(result.output).toEqual({ name: 'John' })
  })

  it('tokens 应为 0', async () => {
    const node = makeNode({
      sourceNodeId: 'http-1',
      mappings: [{ sourcePath: 'a', targetName: 'a', enabled: true }],
    })
    const ctx = makeContext({ 'http-1': { a: 1 } })
    const result = await executor.execute(node, ctx)
    expect(result.tokens).toBe(0)
  })
})
