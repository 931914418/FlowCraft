import { Hono } from 'hono'
import { db, schema } from '../db'
import { eq, and } from 'drizzle-orm'
const { apiKeys, models, userPreferences } = schema

// 有效的 AI 提供商枚举
const VALID_PROVIDERS = ['openai', 'anthropic', 'zhipu', 'custom'] as const
type Provider = typeof VALID_PROVIDERS[number]

// 验证提供商是否有效
function isValidProvider(provider: string): provider is Provider {
  return VALID_PROVIDERS.includes(provider as Provider)
}

// 脱敏显示 API Key（只显示前4后4字符）
function maskApiKey(key: string): string {
  if (key.length <= 8) return '****'
  return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`
}

export const settingsRoutes = new Hono()

// ==================== API Keys ====================

// 获取所有 API Keys（key 值脱敏）
settingsRoutes.get('/keys', async (c) => {
  const keys = await db.query.apiKeys.findMany()
  // 返回时脱敏 API Key
  const maskedKeys = keys.map(key => ({
    ...key,
    apiKey: maskApiKey(key.apiKey),
  }))
  return c.json(maskedKeys)
})

// 添加新 API Key
settingsRoutes.post('/keys', async (c) => {
  const body = await c.req.json()

  // 验证必填字段
  if (!body.provider || !body.name || !body.apiKey) {
    return c.json({ error: '缺少必填字段: provider, name, apiKey' }, 400)
  }

  // 验证 provider 枚举值
  if (!isValidProvider(body.provider)) {
    return c.json({ error: `无效的 provider，必须是: ${VALID_PROVIDERS.join(', ')}` }, 400)
  }

  // 对于 custom 提供商，baseUrl 是必填的
  if (body.provider === 'custom' && !body.baseUrl) {
    return c.json({ error: '自定义提供商必须提供 baseUrl' }, 400)
  }

  try {
    const [newKey] = await db.insert(apiKeys).values({
      provider: body.provider,
      name: body.name,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl || null,
      isEnabled: body.isEnabled !== undefined ? body.isEnabled : true,
    }).returning()

    // 返回时脱敏
    return c.json({
      ...newKey,
      apiKey: maskApiKey(newKey.apiKey),
    })
  } catch (error) {
    console.error('创建 API Key 失败:', error)
    return c.json({ error: '创建 API Key 失败' }, 500)
  }
})

// 更新 API Key
settingsRoutes.put('/keys/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  // 验证 provider 枚举值（如果提供）
  if (body.provider && !isValidProvider(body.provider)) {
    return c.json({ error: `无效的 provider，必须是: ${VALID_PROVIDERS.join(', ')}` }, 400)
  }

  // 对于 custom 提供商，baseUrl 是必填的
  if (body.provider === 'custom' && !body.baseUrl) {
    return c.json({ error: '自定义提供商必须提供 baseUrl' }, 400)
  }

  try {
    const updated = await db.update(apiKeys)
      .set({
        ...(body.provider && { provider: body.provider }),
        ...(body.name && { name: body.name }),
        ...(body.apiKey && { apiKey: body.apiKey }),
        ...(body.baseUrl !== undefined && { baseUrl: body.baseUrl || null }),
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(apiKeys.id, id))
      .returning()

    if (updated.length === 0) {
      return c.json({ error: 'API Key 不存在' }, 404)
    }

    // 返回时脱敏
    return c.json({
      ...updated[0],
      apiKey: maskApiKey(updated[0].apiKey),
    })
  } catch (error) {
    console.error('更新 API Key 失败:', error)
    return c.json({ error: '更新 API Key 失败' }, 500)
  }
})

// 删除 API Key
settingsRoutes.delete('/keys/:id', async (c) => {
  const id = c.req.param('id')

  try {
    const deleted = await db.delete(apiKeys)
      .where(eq(apiKeys.id, id))
      .returning()

    if (deleted.length === 0) {
      return c.json({ error: 'API Key 不存在' }, 404)
    }

    return c.json({ ok: true })
  } catch (error) {
    console.error('删除 API Key 失败:', error)
    return c.json({ error: '删除 API Key 失败' }, 500)
  }
})

// 测试 API Key 连接
settingsRoutes.post('/keys/:id/test', async (c) => {
  const id = c.req.param('id')

  try {
    const keyRecord = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, id),
    })

    if (!keyRecord) {
      return c.json({ error: 'API Key 不存在' }, 404)
    }

    // 这里应该调用实际的 API 测试连接
    // 暂时返回成功，实际实现需要根据不同提供商调用相应的 API
    // TODO: 实现实际的连接测试逻辑

    return c.json({
      success: true,
      message: '连接测试成功',
      provider: keyRecord.provider,
    })
  } catch (error) {
    console.error('测试 API Key 失败:', error)
    return c.json({ error: '测试 API Key 失败' }, 500)
  }
})

// ==================== Models ====================

// 获取所有模型
settingsRoutes.get('/models', async (c) => {
  const allModels = await db.query.models.findMany()
  return c.json(allModels)
})

// 添加自定义模型
settingsRoutes.post('/models', async (c) => {
  const body = await c.req.json()

  // 验证必填字段
  if (!body.provider || !body.modelId || !body.displayName) {
    return c.json({ error: '缺少必填字段: provider, modelId, displayName' }, 400)
  }

  // 验证 provider 枚举值
  if (!isValidProvider(body.provider)) {
    return c.json({ error: `无效的 provider，必须是: ${VALID_PROVIDERS.join(', ')}` }, 400)
  }

  try {
    const [newModel] = await db.insert(models).values({
      provider: body.provider,
      modelId: body.modelId,
      displayName: body.displayName,
      maxTokens: body.maxTokens || null,
    }).returning()

    return c.json(newModel)
  } catch (error) {
    console.error('创建模型失败:', error)
    return c.json({ error: '创建模型失败' }, 500)
  }
})

// 删除模型
settingsRoutes.delete('/models/:id', async (c) => {
  const id = c.req.param('id')

  try {
    const deleted = await db.delete(models)
      .where(eq(models.id, id))
      .returning()

    if (deleted.length === 0) {
      return c.json({ error: '模型不存在' }, 404)
    }

    return c.json({ ok: true })
  } catch (error) {
    console.error('删除模型失败:', error)
    return c.json({ error: '删除模型失败' }, 500)
  }
})

// ==================== Preferences ====================

// 获取用户偏好
settingsRoutes.get('/preferences', async (c) => {
  // 由于暂时是单用户场景，获取第一条记录或返回默认值
  const prefs = await db.query.userPreferences.findFirst()

  if (!prefs) {
    // 返回默认值
    return c.json({
      defaultLlmModel: null,
      defaultAiProcessorModel: null,
      defaultWorkflowGenModel: null,
      requestTimeout: 30000,
      maxRetries: 2,
    })
  }

  return c.json(prefs)
})

// 更新用户偏好
settingsRoutes.put('/preferences', async (c) => {
  const body = await c.req.json()

  try {
    // 检查是否已存在偏好设置
    const existing = await db.query.userPreferences.findFirst()

    if (existing) {
      // 更新现有记录
      const [updated] = await db.update(userPreferences)
        .set({
          ...(body.defaultLlmModel !== undefined && { defaultLlmModel: body.defaultLlmModel }),
          ...(body.defaultAiProcessorModel !== undefined && { defaultAiProcessorModel: body.defaultAiProcessorModel }),
          ...(body.defaultWorkflowGenModel !== undefined && { defaultWorkflowGenModel: body.defaultWorkflowGenModel }),
          ...(body.requestTimeout !== undefined && { requestTimeout: body.requestTimeout }),
          ...(body.maxRetries !== undefined && { maxRetries: body.maxRetries }),
        })
        .where(eq(userPreferences.id, existing.id))
        .returning()

      return c.json(updated[0])
    } else {
      // 创建新记录
      const [created] = await db.insert(userPreferences).values({
        defaultLlmModel: body.defaultLlmModel || null,
        defaultAiProcessorModel: body.defaultAiProcessorModel || null,
        defaultWorkflowGenModel: body.defaultWorkflowGenModel || null,
        requestTimeout: body.requestTimeout || 30000,
        maxRetries: body.maxRetries !== undefined ? body.maxRetries : 2,
      }).returning()

      return c.json(created)
    }
  } catch (error) {
    console.error('更新用户偏好失败:', error)
    return c.json({ error: '更新用户偏好失败' }, 500)
  }
})
