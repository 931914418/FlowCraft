import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { NodeType } from '@flowcraft/shared'
import type { DAGNode } from './dag'
import { db, schema } from '../db'
import { eq, and } from 'drizzle-orm'

export interface ExecutionContext {
  variables: Map<string, unknown>
  nodeOutputs: Map<string, unknown>
}

// 从 nodeOutputs 派生变量值
export function resolveVariable(key: string, context: ExecutionContext): unknown {
  // 如果是 nodeId.output 格式，从 nodeOutputs 取值
  if (key.endsWith('.output')) {
    const nodeId = key.slice(0, -'.output'.length)
    return context.nodeOutputs.get(nodeId)
  }
  // 否则从 variables 取（branches, input 等）
  return context.variables.get(key)
}

// renderTemplate 使用 resolveVariable 统一查找
export function renderTemplate(template: string, context: ExecutionContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const value = resolveVariable(key.trim(), context)
    if (value === undefined) return `{{${key}}}`
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  })
}

export interface NodeExecutor {
  execute(node: DAGNode, context: ExecutionContext, signal?: AbortSignal): Promise<{ output: unknown; tokens: number }>
}

const openaiClient = process.env.OPENAI_API_KEY ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const anthropicClient = process.env.ANTHROPIC_API_KEY ? createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null
// Zhipu GLM Coding Plan uses OpenAI-compatible endpoint
const zhipuClient = process.env.ZHIPU_API_KEY ? createOpenAI({
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: 'https://open.bigmodel.cn/api/coding/paas/v4',
}) : null

// 从数据库获取启用的 API Key（缓存 5 分钟）
let apiKeyCache: Map<string, { key: string; baseUrl?: string; expiry: number }> = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟

async function getApiKeyFromDb(provider: string): Promise<{ key: string; baseUrl?: string } | null> {
  const cached = apiKeyCache.get(provider)
  if (cached && cached.expiry > Date.now()) {
    return { key: cached.key, baseUrl: cached.baseUrl }
  }

  try {
    const keys = await db
      .select()
      .from(schema.apiKeys)
      .where(and(
        eq(schema.apiKeys.provider, provider),
        eq(schema.apiKeys.isEnabled, true)
      ))
      .limit(1)

    if (keys.length > 0) {
      apiKeyCache.set(provider, {
        key: keys[0].apiKey,
        baseUrl: keys[0].baseUrl || undefined,
        expiry: Date.now() + CACHE_TTL,
      })
      return { key: keys[0].apiKey, baseUrl: keys[0].baseUrl || undefined }
    }
  } catch (err) {
    console.error(`[Engine] Failed to fetch API key from DB for provider ${provider}:`, err)
  }

  return null
}

async function getModelClient(model: string) {
  // 优先从数据库获取 API Key
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')) {
    const dbKey = await getApiKeyFromDb('openai')
    if (dbKey) {
      return createOpenAI({ apiKey: dbKey.key }).chat(model)
    }
    if (openaiClient) return openaiClient.chat(model)
    throw new Error('OPENAI_API_KEY not configured in database or environment')
  }

  if (model.startsWith('glm-') || model.startsWith('GLM-')) {
    const dbKey = await getApiKeyFromDb('zhipu')
    if (dbKey) {
      return createOpenAI({
        apiKey: dbKey.key,
        baseURL: dbKey.baseUrl || 'https://open.bigmodel.cn/api/coding/paas/v4',
      }).chat(model)
    }
    if (zhipuClient) return zhipuClient.chat(model)
    throw new Error('ZHIPU_API_KEY not configured in database or environment')
  }

  // Claude 模型
  const dbKey = await getApiKeyFromDb('anthropic')
  if (dbKey) {
    return createAnthropic({ apiKey: dbKey.key })(model)
  }
  if (anthropicClient) return anthropicClient(model)
  throw new Error('ANTHROPIC_API_KEY not configured in database or environment')
}

function getModelSdk(model: string) {
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')) {
    if (!openaiClient) throw new Error('OPENAI_API_KEY not configured')
    return openaiClient.chat(model)
  }
  if (model.startsWith('glm-') || model.startsWith('GLM-')) {
    if (!zhipuClient) throw new Error('ZHIPU_API_KEY not configured')
    return zhipuClient.chat(model)
  }
  if (!anthropicClient) throw new Error('ANTHROPIC_API_KEY not configured')
  return anthropicClient(model)
}

export class LLMExecutor implements NodeExecutor {
  async execute(node: DAGNode, context: ExecutionContext, signal?: AbortSignal) {
    const { model, prompt, system, temperature } = node.config as Record<string, any>
    const renderedPrompt = renderTemplate(String(prompt || ''), context)

    const sdk = await getModelClient(String(model || 'gpt-4o'))

    const result = await generateText({
      model: sdk,
      prompt: renderedPrompt,
      system: system ? renderTemplate(String(system), context) : undefined,
      temperature: Number(temperature) || 0.7,
      abortSignal: signal,
    })

    return { output: result.text, tokens: result.usage?.totalTokens || 0 }
  }
}

export class ConditionExecutor implements NodeExecutor {
  async execute(node: DAGNode, context: ExecutionContext) {
    const config = node.config as Record<string, any>

    // V2 格式：同时有 field 和 operator 属性
    if (config.field && config.operator) {
      return this.executeV2(config, context)
    }

    // V1 格式：expression 字符串
    return this.executeV1(config, context)
  }

  private executeV1(config: Record<string, any>, context: ExecutionContext) {
    const { expression } = config
    const input = context.variables.get('input') || {}

    let result = false
    try {
      const match = String(expression || '').match(/^(\w+(?:\.\w+)*)\s*(>|<|==|>=|<=|!=)\s*(.+)$/)
      if (match) {
        const [, leftPath, op, rightRaw] = match
        const leftVal = resolvePath(input, leftPath) ?? context.variables.get(leftPath)
        const rightVal = isNaN(Number(rightRaw)) ? String(rightRaw.replace(/['"]/g, '')) : Number(rightRaw)
        const left = typeof leftVal === 'number' ? leftVal : Number(leftVal) || leftVal
        switch (op) {
          case '>': result = Number(left) > Number(rightVal); break
          case '<': result = Number(left) < Number(rightVal); break
          case '==': result = String(left) === String(rightVal); break
          case '>=': result = Number(left) >= Number(rightVal); break
          case '<=': result = Number(left) <= Number(rightVal); break
          case '!=': result = String(left) !== String(rightVal); break
        }
      }
    } catch {
      result = false
    }

    return { output: { branch: String(result) }, tokens: 0 }
  }

  private executeV2(config: Record<string, any>, context: ExecutionContext) {
    const field = config.field
    const operator = String(config.operator)
    const value = config.value

    // 解析字段值
    let fieldValue: unknown
    if (typeof field === 'object' && field.sourceNodeId) {
      // V2 完整格式：{ sourceNodeId, path }
      const upstreamData = context.nodeOutputs.get(field.sourceNodeId)
      fieldValue = field.path ? resolvePath(upstreamData, field.path) : upstreamData
    } else if (typeof field === 'string' && field) {
      // V2 简单格式：直接字符串字段名，从 input 中取值
      const input = context.variables.get('input') || {}
      fieldValue = resolvePath(input, field)
    }

    let result = false
    switch (operator) {
      case 'eq': {
        if (fieldValue == null && value == null) result = true
        else if (fieldValue == null || value == null) result = false
        else result = String(fieldValue) === String(value)
        break
      }
      case 'neq': {
        if (fieldValue == null && value == null) result = false
        else if (fieldValue == null || value == null) result = true
        else result = String(fieldValue) !== String(value)
        break
      }
      case 'gt': result = Number(fieldValue) > Number(value); break
      case 'lt': result = Number(fieldValue) < Number(value); break
      case 'gte': result = Number(fieldValue) >= Number(value); break
      case 'lte': result = Number(fieldValue) <= Number(value); break
      case 'contains': result = String(fieldValue ?? '').includes(String(value)); break
      case 'not_contains': result = !String(fieldValue ?? '').includes(String(value)); break
      case 'empty': result = fieldValue == null || fieldValue === '' || fieldValue === undefined; break
      case 'not_empty': result = fieldValue != null && fieldValue !== '' && fieldValue !== undefined; break
    }

    return { output: { branch: String(result) }, tokens: 0 }
  }
}

function resolvePath(obj: unknown, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return current
}

// SAFE_GLOBALS sandbox is not production-hardened — use isolated-vm for untrusted code.
const SAFE_GLOBALS = {
  Math, Date, JSON, Array, Object, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite,
  encodeURIComponent, decodeURIComponent,
}

export class CodeExecutor implements NodeExecutor {
  async execute(node: DAGNode, context: ExecutionContext, signal?: AbortSignal) {
    // 安全防护：代码执行默认关闭，需显式启用
    if (!process.env.ENABLE_CODE_EXECUTION) {
      throw new Error('Code execution is disabled. Set ENABLE_CODE_EXECUTION=1 to enable.')
    }
    const { code } = node.config as Record<string, any>
    const input = Object.fromEntries(context.variables)

    if (signal?.aborted) throw new Error('Execution aborted')

    const safeCode = `
      "use strict";
      const {${Object.keys(SAFE_GLOBALS).join(',')}} = ___safe;
      return (function(input) {
        "use strict";
        ${String(code)}
      })(___input);
    `

    try {
      const fn = new Function('___safe', '___input', safeCode)
      const output = fn(SAFE_GLOBALS, input)
      return { output, tokens: 0 }
    } catch (err: unknown) {
      throw new Error(`Code execution failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}

export class DataMapperExecutor implements NodeExecutor {
  async execute(node: DAGNode, context: ExecutionContext): Promise<{ output: unknown; tokens: number }> {
    const config = node.config as Record<string, any>
    const { sourceNodeId, mappings } = config

    // 获取上游数据
    const sourceData = sourceNodeId
      ? context.nodeOutputs.get(String(sourceNodeId))
      : null

    if (!sourceData) {
      return { output: {}, tokens: 0 }
    }

    // 过滤和重命名字段
    const result: Record<string, unknown> = {}
    if (Array.isArray(mappings)) {
      for (const mapping of mappings) {
        if (!mapping.enabled) continue
        if (!mapping.sourcePath) continue

        const value = resolvePath(sourceData, String(mapping.sourcePath))
        if (value !== undefined) {
          const targetName = mapping.targetName || mapping.sourcePath
          result[String(targetName)] = value
        }
      }
    }

    return { output: result, tokens: 0 }
  }
}

export class HttpExecutor implements NodeExecutor {
  async execute(node: DAGNode, context: ExecutionContext, signal?: AbortSignal) {
    const { url, method, headers, body } = node.config as Record<string, any>
    const renderedUrl = renderTemplate(String(url || ''), context)

    const parsed = new URL(renderedUrl)
    const blockedHosts = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0)/i
    if (blockedHosts.test(parsed.hostname)) {
      throw new Error(`Requests to internal addresses are blocked: ${parsed.hostname}`)
    }

    const fetchOptions: RequestInit = {
      method: String(method || 'GET'),
      headers: headers || {},
      signal: signal || AbortSignal.timeout(30000),
    }

    if (body && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = renderTemplate(JSON.stringify(body), context)
    }

    const response = await fetch(renderedUrl, fetchOptions)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${await response.text().catch(() => '')}`)
    }

    const contentType = response.headers.get('content-type') || ''
    const output = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    return { output, tokens: 0 }
  }
}

export class AIProcessorExecutor implements NodeExecutor {
  async execute(node: DAGNode, context: ExecutionContext, signal?: AbortSignal): Promise<{ output: unknown; tokens: number }> {
    const config = node.config as Record<string, any>
    const { instruction, model, outputFormat, outputSchema } = config

    if (!instruction) {
      return { output: '', tokens: 0 }
    }

    // 收集上游所有输出作为上下文
    const upstreamData: Record<string, unknown> = {}
    for (const [nodeId, output] of context.nodeOutputs) {
      upstreamData[nodeId] = output
    }

    // 构造 prompt
    let prompt = `你是一个数据处理助手。根据用户指令处理以下数据。\n\n上游数据：\n${JSON.stringify(upstreamData, null, 2)}\n\n处理指令：\n${instruction}`

    if (outputFormat === 'json') {
      prompt += '\n\n请以 JSON 格式返回结果。'
    }
    if (outputSchema) {
      prompt += `\n\n输出格式要求：${outputSchema}`
    }

    const sdk = await getModelClient(String(model || 'GLM-4.7'))

    const result = await generateText({
      model: sdk,
      prompt,
      temperature: 0.3,
      maxOutputTokens: 2000,
      abortSignal: signal,
    })

    let output: unknown = result.text
    // 如果期望 JSON 输出，尝试解析
    if (outputFormat === 'json' && typeof output === 'string') {
      try {
        output = JSON.parse(output)
      } catch {
        // 保持字符串输出
      }
    }

    return { output, tokens: result.usage?.totalTokens || 0 }
  }
}

export function getExecutor(type: NodeType): NodeExecutor | null {
  switch (type) {
    case 'llm': return new LLMExecutor()
    case 'condition': return new ConditionExecutor()
    case 'code':
      if (!process.env.ENABLE_CODE_EXECUTION) {
        console.warn('[Engine] Code execution is disabled. Set ENABLE_CODE_EXECUTION=1 to enable.')
      }
      return new CodeExecutor()
    case 'http': return new HttpExecutor()
    case 'data-mapper': return new DataMapperExecutor()
    case 'ai-processor': return new AIProcessorExecutor()
    default: return null
  }
}
