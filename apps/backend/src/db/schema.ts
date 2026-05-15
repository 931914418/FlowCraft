import { pgTable, uuid, text, varchar, jsonb, timestamp, integer, uniqueIndex, index } from 'drizzle-orm/pg-core'

export const workflowDefinitions = pgTable('workflow_definition', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  definition: jsonb('definition').notNull(),
  version: integer('version').default(1),
  triggerType: varchar('trigger_type', { length: 20 }).default('manual'),
  cronExpression: varchar('cron_expression', { length: 100 }),
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
