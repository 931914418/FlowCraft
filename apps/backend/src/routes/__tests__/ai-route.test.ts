import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// Set env var before importing the module so getZhipuClient() works
beforeAll(() => {
  process.env.ZHIPU_API_KEY = 'test-key'
})

// Mock generateText before any imports that use it
vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

import { Hono } from 'hono'
import aiRoutes from '../ai'
import { generateText } from 'ai'

const mockGenerateText = vi.mocked(generateText)

function createApp() {
  const app = new Hono()
  app.route('/api/ai', aiRoutes)
  return app
}

describe('AI Generate Workflow API', () => {
  let app: Hono

  beforeEach(() => {
    app = createApp()
    vi.clearAllMocks()
  })

  it('空描述返回 400', async () => {
    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('描述')
  })

  it('缺少 description 字段返回 400', async () => {
    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('纯空格描述返回 400', async () => {
    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '   ' }),
    })
    expect(res.status).toBe(400)
  })

  it('简单模式应过滤 code 节点', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        name: '测试',
        nodes: [
          { id: 'start-1', type: 'start', config: {} },
          { id: 'code-1', type: 'code', config: { code: 'return input' } },
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'code-1' },
          { id: 'e2', source: 'code-1', target: 'end-1' },
        ],
        explanation: '测试',
      }),
    } as any)

    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '测试', mode: 'simple' }),
    })
    const data = await res.json()
    expect(data.workflow.nodes.some((n: any) => n.type === 'code')).toBe(false)
    // code 节点被移除后，相关的边也被移除
    expect(data.workflow.edges.length).toBe(0)
  })

  it('advanced 模式保留 code 节点', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        name: '高级工作流',
        nodes: [
          { id: 'start-1', type: 'start', config: {} },
          { id: 'code-1', type: 'code', config: { code: 'return input' } },
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'code-1' },
          { id: 'e2', source: 'code-1', target: 'end-1' },
        ],
        explanation: '高级模式',
      }),
    } as any)

    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '测试', mode: 'advanced' }),
    })
    const data = await res.json()
    expect(data.workflow.nodes.some((n: any) => n.type === 'code')).toBe(true)
    expect(data.workflow.edges.length).toBe(2)
  })

  it('应自动布局节点位置', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        name: '测试',
        nodes: [
          { id: 'start-1', type: 'start', config: {} },
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [{ id: 'e1', source: 'start-1', target: 'end-1' }],
        explanation: '测试',
      }),
    } as any)

    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '测试' }),
    })
    const data = await res.json()
    expect(data.workflow.nodes[0].position).toBeDefined()
    expect(data.workflow.nodes[0].position.x).toBe(0)
    expect(data.workflow.nodes[1].position.x).toBe(250)
  })

  it('保留已有 position 的节点', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        name: '测试',
        nodes: [
          { id: 'start-1', type: 'start', config: {}, position: { x: 100, y: 200 } },
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [{ id: 'e1', source: 'start-1', target: 'end-1' }],
        explanation: '测试',
      }),
    } as any)

    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '测试' }),
    })
    const data = await res.json()
    expect(data.workflow.nodes[0].position).toEqual({ x: 100, y: 200 })
    expect(data.workflow.nodes[1].position).toEqual({ x: 250, y: 100 })
  })

  it('LLM 返回无效 JSON 应返回 502', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'not json at all',
    } as any)

    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '测试' }),
    })
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toContain('格式异常')
  })

  it('LLM 返回缺少 nodes 应返回 502', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({ name: '测试', edges: [], explanation: '' }),
    } as any)

    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '测试' }),
    })
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toContain('结构无效')
  })

  it('应返回有效的 workflow 结构', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        name: 'HTTP 请求工作流',
        nodes: [
          { id: 'start-1', type: 'start', config: {} },
          {
            id: 'http-1',
            type: 'http',
            config: { url: 'https://api.example.com', method: 'GET' },
          },
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'http-1' },
          { id: 'e2', source: 'http-1', target: 'end-1' },
        ],
        explanation: '发送 HTTP GET 请求',
      }),
    } as any)

    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '发送 HTTP 请求' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.workflow.name).toBe('HTTP 请求工作流')
    expect(data.workflow.nodes.length).toBe(3)
    expect(data.explanation).toBe('发送 HTTP GET 请求')
  })

  it('应在 JSON 外包含 markdown 包裹时正确解析', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: '```json\n' +
        JSON.stringify({
          name: '测试',
          nodes: [
            { id: 'start-1', type: 'start', config: {} },
            { id: 'end-1', type: 'end', config: {} },
          ],
          edges: [{ id: 'e1', source: 'start-1', target: 'end-1' }],
          explanation: '测试',
        }) +
        '\n```',
    } as any)

    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '测试' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.workflow.nodes.length).toBe(2)
  })

  it('LLM 抛出异常应返回 502', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('API timeout'))

    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '测试' }),
    })
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toContain('AI 生成失败')
  })

  it('应移除指向不存在节点的边', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        name: '测试',
        nodes: [
          { id: 'start-1', type: 'start', config: {} },
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'end-1' },
          { id: 'e2', source: 'start-1', target: 'nonexistent-1' },
        ],
        explanation: '测试',
      }),
    } as any)

    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '测试' }),
    })
    const data = await res.json()
    expect(data.workflow.edges.length).toBe(1)
    expect(data.workflow.edges[0].target).toBe('end-1')
  })

  it('缺少 name 字段应使用默认名称', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        nodes: [
          { id: 'start-1', type: 'start', config: {} },
          { id: 'end-1', type: 'end', config: {} },
        ],
        edges: [{ id: 'e1', source: 'start-1', target: 'end-1' }],
      }),
    } as any)

    const res = await app.request('/api/ai/generate-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '测试' }),
    })
    const data = await res.json()
    expect(data.workflow.name).toBe('未命名工作流')
    expect(data.explanation).toBe('')
  })
})
