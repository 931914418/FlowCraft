import { pgTable, uuid, text, varchar, jsonb, timestamp, integer, uniqueIndex, index, boolean } from 'drizzle-orm/pg-core'

export const workflowDefinitions = pgTable('workflow_definition', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  definition: jsonb('definition').notNull(),
  version: integer('version').default(1),
  triggerType: varchar('trigger_type', { length: 20 }).default('manual'),
  cronExpression: varchar('cron_expression', { length: 100 }),
  webhookPath: varchar('webhook_path', { length: 50 }).unique(),
  webhookSecret: varchar('webhook_secret', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const workflowExecutions = pgTable('workflow_execution', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id').references(() => workflowDefinitions.id).notNull(),
  status: varchar('status', { length: 20 }).default('running'),
  input: jsonb('input'),
  output: jsonb('output'),
  totalTokens: integer('total_tokens').default(0),
  durationMs: integer('duration_ms').default(0),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
})

export const nodeExecutions = pgTable('node_execution', {
  id: uuid('id').defaultRandom().primaryKey(),
  executionId: uuid('execution_id').references(() => workflowExecutions.id).notNull(),
  nodeId: varchar('node_id', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  input: jsonb('input'),
  output: jsonb('output'),
  tokens: integer('tokens').default(0),
  durationMs: integer('duration_ms').default(0),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
}, (table) => [
  uniqueIndex('node_execution_execution_node_idx').on(table.executionId, table.nodeId),
  index('node_execution_execution_idx').on(table.executionId),
])

export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 100 }).default('default').notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  uniqueIndex('user_settings_user_key_idx').on(table.userId, table.key),
])

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  apiKey: text('api_key').notNull(),
  baseUrl: text('base_url'),
  isEnabled: boolean('is_enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const models = pgTable('models', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull(),
  modelId: varchar('model_id', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 200 }).notNull(),
  maxTokens: integer('max_tokens'),
})

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 100 }),
  defaultLlmModel: varchar('default_llm_model', { length: 100 }),
  defaultAiProcessorModel: varchar('default_ai_processor_model', { length: 100 }),
  defaultWorkflowGenModel: varchar('default_workflow_gen_model', { length: 100 }),
  requestTimeout: integer('request_timeout').default(30000),
  maxRetries: integer('max_retries').default(2),
})
