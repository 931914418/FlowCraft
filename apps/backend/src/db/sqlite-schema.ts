import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core'
import { randomUUID } from 'crypto'

export const workflowDefinitions = sqliteTable('workflow_definition', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  definition: text('definition', { mode: 'json' }).notNull(),
  version: integer('version').default(1),
  triggerType: text('trigger_type').default('manual'),
  cronExpression: text('cron_expression'),
  webhookPath: text('webhook_path').unique(),
  webhookSecret: text('webhook_secret'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
})

export const workflowExecutions = sqliteTable('workflow_execution', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  workflowId: text('workflow_id').references(() => workflowDefinitions.id).notNull(),
  status: text('status').default('running'),
  input: text('input', { mode: 'json' }),
  output: text('output', { mode: 'json' }),
  totalTokens: integer('total_tokens').default(0),
  durationMs: integer('duration_ms').default(0),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
})

export const nodeExecutions = sqliteTable('node_execution', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  executionId: text('execution_id').references(() => workflowExecutions.id).notNull(),
  nodeId: text('node_id').notNull(),
  status: text('status').default('pending'),
  input: text('input', { mode: 'json' }),
  output: text('output', { mode: 'json' }),
  tokens: integer('tokens').default(0),
  durationMs: integer('duration_ms').default(0),
  error: text('error'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
}, (table) => [
  uniqueIndex('node_execution_execution_node_idx').on(table.executionId, table.nodeId),
  index('node_execution_execution_idx').on(table.executionId),
])

// API Key 配置表
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  provider: text('provider').notNull(), // 'openai' | 'anthropic' | 'zhipu' | 'custom'
  name: text('name').notNull(),
  apiKey: text('api_key').notNull(),
  baseUrl: text('base_url'), // 自定义端点
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})

// 模型配置表（预设 + 用户自定义）
export const models = sqliteTable('models', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  provider: text('provider').notNull(),
  modelId: text('model_id').notNull(),
  displayName: text('display_name').notNull(),
  maxTokens: integer('max_tokens'),
})

// 用户偏好表（预留 user_id）
export const userPreferences = sqliteTable('user_preferences', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id'), // 预留字段
  defaultLlmModel: text('default_llm_model'),
  defaultAiProcessorModel: text('default_ai_processor_model'),
  defaultWorkflowGenModel: text('default_workflow_gen_model'),
  requestTimeout: integer('request_timeout').default(30000),
  maxRetries: integer('max_retries').default(2),
})
