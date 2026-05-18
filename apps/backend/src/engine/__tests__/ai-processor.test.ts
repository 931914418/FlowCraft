import { describe, it, expect, vi, beforeEach } from 'vitest'

// 在任何模块加载前设置环境变量
process.env.ZHIPU_API_KEY = 'test-key'

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    generateText: vi.fn(),
  }
})

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn(() => 'mock-model'),
  })),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn(() => 'mock-anthropic-model')),
}))

// 使用动态导入确保 executors 模块在 mock 之后加载
const { AIProcessorExecutor } = await import('../executors')
const { generateText } = await import('ai')

function makeContext(nodeOutputs: Record<string, unknown> = {}): ExecutionContext {
  return {
    nodeOutputs: new Map(Object.entries(nodeOutputs)),
    variables: new Map(),
  }
}

// 使用从动态导入中获取的类型
type ExecutionContext = import('../executors').ExecutionContext

function makeNode(config: Record<string, any>) {
  return { id: 'aip-1', type: 'ai-processor' as const, config, edges: { incoming: [], outgoing: [] } } as any
}

describe('AIProcessorExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应将上游数据传递给 LLM', async () => {
    const mockGenerateText = generateText as any
    mockGenerateText.mockResolvedValueOnce({
      text: '处理结果',
      usage: { totalTokens: 50 },
    })

    const executor = new AIProcessorExecutor()
    const node = makeNode({ instruction: '提取所有名字' })
    const ctx = makeContext({ 'http-1': { users: [{ name: 'A' }, { name: 'B' }] } })
    const result = await executor.execute(node, ctx)

    expect(result.output).toBe('处理结果')
    expect(result.tokens).toBe(50)

    // 验证 prompt 中包含上游数据
    const callArgs = mockGenerateText.mock.calls[0][0]
    expect(callArgs.prompt).toContain('http-1')
    expect(callArgs.prompt).toContain('提取所有名字')
  })

  it('应正确统计 tokens', async () => {
    const mockGenerateText = generateText as any
    mockGenerateText.mockResolvedValueOnce({
      text: '结果',
      usage: { totalTokens: 100 },
    })

    const executor = new AIProcessorExecutor()
    const node = makeNode({ instruction: '处理数据' })
    const ctx = makeContext()
    const result = await executor.execute(node, ctx)
    expect(result.tokens).toBe(100)
  })

  it('outputFormat 为 json 时应尝试解析', async () => {
    const mockGenerateText = generateText as any
    mockGenerateText.mockResolvedValueOnce({
      text: '{"names": ["A", "B"]}',
      usage: { totalTokens: 30 },
    })

    const executor = new AIProcessorExecutor()
    const node = makeNode({ instruction: '提取名字', outputFormat: 'json' })
    const ctx = makeContext()
    const result = await executor.execute(node, ctx)
    expect(result.output).toEqual({ names: ['A', 'B'] })
  })

  it('outputFormat 为 json 但解析失败时保持字符串', async () => {
    const mockGenerateText = generateText as any
    mockGenerateText.mockResolvedValueOnce({
      text: '这不是 JSON',
      usage: { totalTokens: 10 },
    })

    const executor = new AIProcessorExecutor()
    const node = makeNode({ instruction: '处理', outputFormat: 'json' })
    const ctx = makeContext()
    const result = await executor.execute(node, ctx)
    expect(result.output).toBe('这不是 JSON')
  })

  it('无 instruction 时返回空输出', async () => {
    const executor = new AIProcessorExecutor()
    const node = makeNode({})
    const ctx = makeContext()
    const result = await executor.execute(node, ctx)
    expect(result.output).toBe('')
    expect(result.tokens).toBe(0)
  })

  it('outputSchema 应包含在 prompt 中', async () => {
    const mockGenerateText = generateText as any
    mockGenerateText.mockResolvedValueOnce({
      text: '{}',
      usage: { totalTokens: 20 },
    })

    const executor = new AIProcessorExecutor()
    const node = makeNode({ instruction: '分析', outputSchema: '{ name: string, age: number }' })
    const ctx = makeContext()
    await executor.execute(node, ctx)

    const callArgs = mockGenerateText.mock.calls[0][0]
    expect(callArgs.prompt).toContain('name: string')
  })

  it('上游无数据时 prompt 应包含空对象', async () => {
    const mockGenerateText = generateText as any
    mockGenerateText.mockResolvedValueOnce({
      text: '结果',
      usage: { totalTokens: 10 },
    })

    const executor = new AIProcessorExecutor()
    const node = makeNode({ instruction: '处理' })
    const ctx = makeContext()
    await executor.execute(node, ctx)

    const callArgs = mockGenerateText.mock.calls[0][0]
    expect(callArgs.prompt).toContain('上游数据')
  })
})
