import { Hono } from 'hono'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const app = new Hono()

function getZhipuClient() {
  if (!process.env.ZHIPU_API_KEY) return null
  return createOpenAI({
    apiKey: process.env.ZHIPU_API_KEY,
    baseURL: 'https://open.bigmodel.cn/api/coding/paas/v4',
  })
}

const SYSTEM_PROMPT = `你是 FlowCraft 工作流设计助手。根据用户描述生成工作流定义。

可用节点类型：
- start: 流程开始（无配置）
- end: 流程结束（无配置）
- http: HTTP 请求（配置：url, method, headers, body）
- llm: 大模型调用（配置：model, prompt, systemPrompt, temperature）
- data-mapper: 数据映射（配置：sourceNodeId, mappings[{sourcePath, targetName, enabled}]）
- condition: 条件判断（配置：field{sourceNodeId,path}, operator, value）
- ai-processor: AI 数据处理（配置：instruction, model, outputFormat）

可用模型：GLM-4.7, gpt-4o, claude-sonnet-4-20250514

输出格式：严格 JSON，不要 markdown 包裹
{
  "name": "工作流名称",
  "nodes": [
    {"id": "start-1", "type": "start", "config": {}},
    {"id": "http-1", "type": "http", "config": {"url": "...", "method": "GET"}},
    ...
  ],
  "edges": [
    {"id": "e1", "source": "start-1", "target": "http-1"},
    ...
  ],
  "explanation": "解释生成了什么工作流"
}

节点 ID 命名规则：{类型简写}-{序号}，如 start-1, http-1, llm-1, end-1
边 ID 命名规则：e{序号}
每个 edge 的 source 和 target 必须对应存在的 node ID
工作流必须以 start 节点开始，end 节点结束`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLLMResponse(text: string): any {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateWorkflowStructure(parsed: any): string | null {
  if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
    return 'nodes 缺失或不是数组'
  }
  if (!parsed.edges || !Array.isArray(parsed.edges)) {
    return 'edges 缺失或不是数组'
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterSimpleMode(parsed: any): void {
  parsed.nodes = parsed.nodes.filter((n: any) => n.type !== 'code')
  const validIds = new Set(parsed.nodes.map((n: any) => n.id))
  parsed.edges = parsed.edges.filter(
    (e: any) => validIds.has(e.source) && validIds.has(e.target),
  )
}

// 合法的节点类型白名单，过滤 AI 生成的非法类型
const VALID_NODE_TYPES = new Set(['start', 'end', 'http', 'llm', 'data-mapper', 'condition', 'ai-processor', 'code'])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterInvalidNodeTypes(parsed: any): void {
  parsed.nodes = parsed.nodes.filter((n: any) => {
    if (!VALID_NODE_TYPES.has(n.type)) {
      console.warn(`[AI Generate] Filtering unknown node type: ${n.type}`)
      return false
    }
    return true
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function removeDanglingEdges(parsed: any): void {
  const nodeIds = new Set(parsed.nodes.map((n: any) => n.id))
  parsed.edges = parsed.edges.filter(
    (e: any) => nodeIds.has(e.source) && nodeIds.has(e.target),
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function autoLayoutNodes(nodes: any[], spacing = 250): void {
  nodes.forEach((node, i) => {
    if (!node.position) {
      node.position = { x: i * spacing, y: 100 }
    }
  })
}

app.post('/generate-workflow', async (c) => {
  const { description, mode = 'simple' } = await c.req.json()

  if (!description?.trim()) {
    return c.json({ error: '请输入工作流描述' }, 400)
  }

  const zhipuClient = getZhipuClient()
  if (!zhipuClient) {
    return c.json({ error: 'AI 服务未配置' }, 503)
  }

  try {
    const modeInstruction =
      mode === 'simple'
        ? '\n注意：简单模式下，不要使用 code 类型节点，优先使用 data-mapper 和 ai-processor。'
        : ''

    const result = await generateText({
      model: zhipuClient.chat('GLM-4.7'),
      system: SYSTEM_PROMPT,
      prompt: `用户描述：${description}${modeInstruction}`,
      temperature: 0.7,
      maxOutputTokens: 2000,
    })

    const parsed = parseLLMResponse(result.text)
    if (!parsed) {
      return c.json({ error: 'AI 返回格式异常，请重试' }, 502)
    }

    const structureError = validateWorkflowStructure(parsed)
    if (structureError) {
      return c.json({ error: '生成的工作流结构无效' }, 502)
    }

    if (mode === 'simple') {
      filterSimpleMode(parsed)
    }

    filterInvalidNodeTypes(parsed)
    removeDanglingEdges(parsed)
    autoLayoutNodes(parsed.nodes)

    return c.json({
      workflow: {
        name: parsed.name || '未命名工作流',
        nodes: parsed.nodes,
        edges: parsed.edges,
      },
      explanation: parsed.explanation || '',
    })
  } catch (err: any) {
    console.error('[AI Generate]', err)
    return c.json(
      { error: 'AI 生成失败：' + (err.message || '未知错误') },
      502,
    )
  }
})

export default app
