<!-- /autoplan restore point: /c/Users/admin/.gstack/projects/FlowCraft/unknown-autoplan-restore-20260516-050905.md -->
# FlowCraft 实现计划（React 全栈版）

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 可视化拖拽编排 AI Agent 工作流，支持条件分支、并行执行、错误重试。所有竞品（Dify、Langflow、Flowise）都是 Python 后端，FlowCraft 用 TypeScript 全栈实现，填补生态空白。

**Architecture:** React Flow 可视化编辑器拖拽编排 → 序列化为 WorkflowDefinition JSON → 保存到 PostgreSQL → 点击运行 → 后端 DAG 解析器拓扑排序 → 逐层并行执行节点（LLM/工具/条件/代码/HTTP） → SSE 推送节点状态到前端 → Framer Motion 动画展示节点状态变化 → 调试面板支持步进查看。

**Tech Stack:** React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS + React Flow + Framer Motion | Node.js + TypeScript + Hono + Vercel AI SDK + Drizzle ORM + PostgreSQL | SSE | Docker Compose

---

## Phase 1: 项目初始化（Day 1）

### Task 1: Monorepo 初始化

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

**Step 1: 初始化 monorepo**

```bash
mkdir flowcraft && cd flowcraft
pnpm init
```

**package.json:**

```json
{
  "name": "flowcraft",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "db:push": "pnpm --filter backend db:push",
    "db:studio": "pnpm --filter backend db:studio",
    "test": "pnpm --filter backend test"
  }
}
```

**pnpm-workspace.yaml:**

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**tsconfig.base.json:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  }
}
```

**Step 2: Commit**

```bash
git init && git add . && git commit -m "chore: initialize monorepo"
```

---

### Task 2: 后端项目初始化

**Files:**
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/src/index.ts`
- Create: `apps/backend/drizzle.config.ts`

```bash
mkdir -p apps/backend/src
cd apps/backend
pnpm init
pnpm add hono @hono/node-server ai @ai-sdk/openai @ai-sdk/anthropic drizzle-orm postgres
pnpm add -D drizzle-kit typescript @types/node tsx vitest
```

**package.json scripts:**

```json
{
  "name": "backend",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

**src/index.ts:**

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { workflowRoutes } from './routes/workflows'
import { toolRoutes } from './routes/tools'
import { modelRoutes } from './routes/models'

const app = new Hono()
app.use('*', logger())
app.use('*', cors({ origin: 'http://localhost:5173' }))

app.route('/api/workflows', workflowRoutes)
app.route('/api/tools', toolRoutes)
app.route('/api/models', modelRoutes)

app.get('/health', (c) => c.json({ status: 'ok' }))

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log('FlowCraft backend running on http://localhost:3000')
})
```

**Step 2: Commit**

```bash
git add . && git commit -m "feat: initialize Hono backend"
```

---

### Task 3: 数据库 Schema（Drizzle ORM）

**Files:**
- Create: `apps/backend/src/db/schema.ts`
- Create: `apps/backend/src/db/index.ts`
- Create: `apps/backend/drizzle.config.ts`

```typescript
// src/db/schema.ts
import { pgTable, uuid, text, varchar, jsonb, timestamp, integer } from 'drizzle-orm/pg-core'

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
})
```

**src/db/index.ts:**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/flowcraft')
export const db = drizzle(client, { schema })
```

**drizzle.config.ts:**

```typescript
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/flowcraft' },
})
```

```bash
pnpm db:push
git add . && git commit -m "feat: add database schema with Drizzle ORM"
```

---

### Task 4: 共享类型定义

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

```typescript
// packages/shared/src/index.ts
export type NodeType = 'start' | 'end' | 'llm' | 'tool' | 'condition' | 'parallel' | 'merge' | 'code' | 'http' | 'variable'

export type TriggerType = 'manual' | 'cron' | 'webhook'

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'paused'

export interface Position {
  x: number
  y: number
}

export interface WorkflowNode {
  id: string
  type: NodeType
  position: Position
  config: Record<string, any>
  label?: string
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  label?: string
  condition?: string
}

export interface WorkflowDefinition {
  id?: string
  name: string
  version?: number
  trigger?: { type: TriggerType; cron?: string }
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface NodeExecutionEvent {
  executionId: string
  nodeId: string
  nodeType: NodeType
  status: ExecutionStatus
  output?: string
  tokens?: number
  durationMs?: number
  error?: string
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: ToolParam[]
}

export interface ToolParam {
  name: string
  type: 'string' | 'number' | 'boolean' | 'json'
  required: boolean
  description: string
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  modelId: string
  enabled: boolean
}
```

```bash
git add . && git commit -m "feat: add shared types package"
```

---

## Phase 2: DAG 引擎 + 节点执行器（Day 2-4）

### Task 5: DAG 解析器

**Files:**
- Create: `apps/backend/src/engine/dag.ts`
- Create: `apps/backend/src/engine/__tests__/dag.test.ts`

**Step 1: 写测试**

```typescript
// src/engine/__tests__/dag.test.ts
import { describe, it, expect } from 'vitest'
import { parseDAG, topologicalSort } from '../dag'
import type { WorkflowDefinition } from '@flowcraft/shared'

const linearWorkflow: WorkflowDefinition = {
  name: 'linear',
  nodes: [
    { id: 'start', type: 'start', position: { x: 0, y: 0 }, config: {} },
    { id: 'llm-1', type: 'llm', position: { x: 200, y: 0 }, config: { model: 'gpt-4o', prompt: 'hello' } },
    { id: 'end', type: 'end', position: { x: 400, y: 0 }, config: {} },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'llm-1' },
    { id: 'e2', source: 'llm-1', target: 'end' },
  ],
}

const parallelWorkflow: WorkflowDefinition = {
  name: 'parallel',
  nodes: [
    { id: 'start', type: 'start', position: { x: 0, y: 0 }, config: {} },
    { id: 'llm-1', type: 'llm', position: { x: 200, y: -100 }, config: {} },
    { id: 'llm-2', type: 'llm', position: { x: 200, y: 100 }, config: {} },
    { id: 'merge', type: 'merge', position: { x: 400, y: 0 }, config: {} },
    { id: 'end', type: 'end', position: { x: 600, y: 0 }, config: {} },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'llm-1' },
    { id: 'e2', source: 'start', target: 'llm-2' },
    { id: 'e3', source: 'llm-1', target: 'merge' },
    { id: 'e4', source: 'llm-2', target: 'merge' },
    { id: 'e5', source: 'merge', target: 'end' },
  ],
}

describe('parseDAG', () => {
  it('should parse linear workflow', () => {
    const dag = parseDAG(linearWorkflow)
    expect(dag.nodes.size).toBe(3)
    expect(dag.getChildren('start')).toEqual(['llm-1'])
    expect(dag.getParents('llm-1')).toEqual(['start'])
  })

  it('should detect cycle', () => {
    const cyclic: WorkflowDefinition = {
      name: 'cyclic',
      nodes: [
        { id: 'a', type: 'llm', position: { x: 0, y: 0 }, config: {} },
        { id: 'b', type: 'llm', position: { x: 200, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'a' },
      ],
    }
    expect(() => parseDAG(cyclic)).toThrow('Cycle detected')
  })
})

describe('topologicalSort', () => {
  it('should sort linear into layers', () => {
    const dag = parseDAG(linearWorkflow)
    const layers = topologicalSort(dag)
    expect(layers[0]).toContain('start')
    expect(layers[1]).toContain('llm-1')
    expect(layers[2]).toContain('end')
  })

  it('should sort parallel into layers', () => {
    const dag = parseDAG(parallelWorkflow)
    const layers = topologicalSort(dag)
    expect(layers[1]).toContain('llm-1')
    expect(layers[1]).toContain('llm-2')
    expect(layers[2]).toContain('merge')
  })
})
```

**Step 2: 运行测试验证失败**

```bash
cd apps/backend && pnpm test -- --run
```
Expected: FAIL

**Step 3: 实现**

```typescript
// src/engine/dag.ts
import type { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '@flowcraft/shared'

export interface DAGNode {
  id: string
  type: string
  config: Record<string, any>
  parents: string[]
  children: string[]
  edges: WorkflowEdge[]
}

export class DAG {
  nodes = new Map<string, DAGNode>()

  addNode(node: WorkflowNode): void {
    this.nodes.set(node.id, { id: node.id, type: node.type, config: node.config, parents: [], children: [], edges: [] })
  }

  addEdge(edge: WorkflowEdge): void {
    const source = this.nodes.get(edge.source)
    const target = this.nodes.get(edge.target)
    if (!source || !target) throw new Error(`Edge references missing node: ${edge.source} -> ${edge.target}`)
    source.children.push(edge.target)
    target.parents.push(edge.source)
    target.edges.push(edge)
  }

  getChildren(id: string): string[] { return this.nodes.get(id)?.children || [] }
  getParents(id: string): string[] { return this.nodes.get(id)?.parents || [] }
  getIncomingEdges(id: string): WorkflowEdge[] { return this.nodes.get(id)?.edges || [] }
}

export function parseDAG(workflow: WorkflowDefinition): DAG {
  const dag = new DAG()
  for (const node of workflow.nodes) dag.addNode(node)
  for (const edge of workflow.edges) dag.addEdge(edge)

  // Cycle detection
  const visited = new Set<string>()
  const inStack = new Set<string>()
  function dfs(id: string) {
    if (inStack.has(id)) throw new Error(`Cycle detected at node: ${id}`)
    if (visited.has(id)) return
    visited.add(id)
    inStack.add(id)
    for (const child of dag.getChildren(id)) dfs(child)
    inStack.delete(id)
  }
  for (const node of workflow.nodes) {
    if (!visited.has(node.id)) dfs(node.id)
  }
  return dag
}

export function topologicalSort(dag: DAG): string[][] {
  const layers: string[][] = []
  const remaining = new Set(dag.nodes.keys())
  const completed = new Set<string>()

  while (remaining.size > 0) {
    const layer: string[] = []
    for (const id of remaining) {
      if (dag.getParents(id).every(p => completed.has(p))) layer.push(id)
    }
    if (layer.length === 0) throw new Error('Cannot resolve remaining nodes')
    for (const id of layer) { remaining.delete(id); completed.add(id) }
    layers.push(layer)
  }
  return layers
}
```

**Step 4: 运行测试验证通过**

```bash
cd apps/backend && pnpm test -- --run
```
Expected: PASS

**Step 5: Commit**

```bash
git add . && git commit -m "feat: add DAG parser with topological sort and cycle detection"
```

---

### Task 6: 节点执行器

**Files:**
- Create: `apps/backend/src/engine/executors.ts`
- Create: `apps/backend/src/engine/__tests__/executors.test.ts`

**Step 1: 写测试**

```typescript
// src/engine/__tests__/executors.test.ts
import { describe, it, expect } from 'vitest'
import { renderTemplate } from '../executors'

describe('renderTemplate', () => {
  const context = new Map<string, any>([
    ['topic', 'Vue vs React'],
    ['node-1.output', 'Vue is great'],
    ['node-2.output', 'React is great'],
  ])

  it('should replace {{variable}}', () => {
    expect(renderTemplate('Task: {{topic}}', context)).toBe('Task: Vue vs React')
  })

  it('should replace nested outputs', () => {
    expect(renderTemplate('Result: {{node-1.output}}', context)).toBe('Result: Vue is great')
  })

  it('should handle missing variables', () => {
    expect(renderTemplate('Hello {{unknown}}', context)).toBe('Hello {{unknown}}')
  })
})
```

**Step 2: 运行测试验证失败**

```bash
cd apps/backend && pnpm test -- --run
```
Expected: FAIL

**Step 3: 实现**

```typescript
// src/engine/executors.ts
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { NodeType } from '@flowcraft/shared'
import type { DAGNode } from './dag'

export interface ExecutionContext {
  variables: Map<string, any>
  nodeOutputs: Map<string, any>
}

export function renderTemplate(template: string, context: Map<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const value = context.get(key.trim())
    return value !== undefined ? String(value) : `{{${key}}}`
  })
}

export interface NodeExecutor {
  execute(node: DAGNode, context: ExecutionContext): Promise<{ output: any; tokens: number }>
}

export class LLMExecutor implements NodeExecutor {
  async execute(node: DAGNode, context: ExecutionContext) {
    const { model, prompt, system, temperature } = node.config
    const renderedPrompt = renderTemplate(prompt, context.variables)

    let sdk: any
    if (model.startsWith('gpt') || model.startsWith('o')) {
      sdk = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(model)
    } else {
      sdk = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(model)
    }

    const result = streamText({
      model: sdk,
      prompt: renderedPrompt,
      system: system ? renderTemplate(system, context.variables) : undefined,
      temperature: temperature || 0.7,
      maxTokens: 4096,
    })

    let output = ''
    for await (const chunk of result.textStream) output += chunk
    const usage = await result.usage
    return { output, tokens: usage?.totalTokens || 0 }
  }
}

export class ConditionExecutor implements NodeExecutor {
  async execute(node: DAGNode, context: ExecutionContext) {
    const { expression } = node.config
    const input = context.variables.get('input') || {}
    let result = false
    const match = expression?.match(/^(\w+)\s*(>|<|==|>=|<=|!=)\s*(.+)$/)
    if (match) {
      const [, left, op, right] = match
      const leftVal = input[left] ?? context.variables.get(left)
      const rightVal = isNaN(Number(right)) ? right.replace(/['"]/g, '') : Number(right)
      switch (op) {
        case '>': result = leftVal > rightVal; break
        case '<': result = leftVal < rightVal; break
        case '==': result = leftVal == rightVal; break
        case '>=': result = leftVal >= rightVal; break
        case '<=': result = leftVal <= rightVal; break
        case '!=': result = leftVal != rightVal; break
      }
    }
    return { output: { branch: String(result) }, tokens: 0 }
  }
}

export class CodeExecutor implements NodeExecutor {
  async execute(node: DAGNode, context: ExecutionContext) {
    const { code } = node.config
    const input = Object.fromEntries(context.variables)
    const fn = new Function('input', code)
    return { output: fn(input), tokens: 0 }
  }
}

export class HttpExecutor implements NodeExecutor {
  async execute(node: DAGNode, context: ExecutionContext) {
    const { url, method, headers, body } = node.config
    const renderedUrl = renderTemplate(url, context.variables)
    const response = await fetch(renderedUrl, {
      method: method || 'GET',
      headers: headers || {},
      body: body ? renderTemplate(JSON.stringify(body), context.variables) : undefined,
    })
    return { output: await response.json(), tokens: 0 }
  }
}

export function getExecutor(type: NodeType): NodeExecutor | null {
  switch (type) {
    case 'llm': return new LLMExecutor()
    case 'condition': return new ConditionExecutor()
    case 'code': return new CodeExecutor()
    case 'http': return new HttpExecutor()
    default: return null
  }
}
```

**Step 4: 运行测试验证通过**

```bash
cd apps/backend && pnpm test -- --run
```
Expected: PASS

**Step 5: Commit**

```bash
git add . && git commit -m "feat: add node executors (LLM, Condition, Code, HTTP)"
```

---

### Task 7: 工作流引擎

**Files:**
- Create: `apps/backend/src/engine/engine.ts`

```typescript
// src/engine/engine.ts
import { db } from '../db'
import { workflowExecutions, nodeExecutions } from '../db/schema'
import { eq } from 'drizzle-orm'
import { parseDAG, topologicalSort } from './dag'
import { getExecutor, type ExecutionContext } from './executors'
import { renderTemplate } from './executors'
import type { WorkflowDefinition, NodeType } from '@flowcraft/shared'

export class WorkflowEngine {
  private running = new Map<string, AbortController>()

  async execute(workflowId: string, definition: WorkflowDefinition, input: Record<string, any> = {}): Promise<string> {
    const [execution] = await db.insert(workflowExecutions).values({
      workflowId, status: 'running', input,
    }).returning()

    const abortCtrl = new AbortController()
    this.running.set(execution.id, abortCtrl)

    this.runExecution(execution.id, definition, input, abortCtrl).catch(console.error)
    return execution.id
  }

  private async runExecution(
    executionId: string, definition: WorkflowDefinition,
    input: Record<string, any>, abortCtrl: AbortController,
  ) {
    const startTime = Date.now()
    const dag = parseDAG(definition)
    const layers = topologicalSort(dag)
    const context: ExecutionContext = {
      variables: new Map(Object.entries(input)),
      nodeOutputs: new Map(),
    }
    let totalTokens = 0

    try {
      for (const layer of layers) {
        if (abortCtrl.signal.aborted) break

        const results = await Promise.all(
          layer.map(nodeId => this.executeNode(executionId, nodeId, dag, context))
        )

        for (let i = 0; i < layer.length; i++) {
          const nodeId = layer[i]
          const result = results[i]
          if (result) {
            context.nodeOutputs.set(nodeId, result.output)
            context.variables.set(`${nodeId}.output`,
              typeof result.output === 'string' ? result.output : JSON.stringify(result.output))
            totalTokens += result.tokens
            if (dag.nodes.get(nodeId)?.type === 'condition' && result.output?.branch) {
              context.variables.set(`${nodeId}.branch`, result.output.branch)
            }
          }
        }
      }

      const endNodes = definition.nodes.filter(n => n.type === 'end')
      const finalOutput = endNodes.length > 0
        ? context.nodeOutputs.get(endNodes[0].id) || { message: 'completed' }
        : { message: 'completed' }

      await db.update(workflowExecutions)
        .set({ status: 'completed', output: finalOutput, totalTokens, durationMs: Date.now() - startTime, completedAt: new Date() })
        .where(eq(workflowExecutions.id, executionId))

    } catch (err) {
      await db.update(workflowExecutions)
        .set({ status: 'failed', durationMs: Date.now() - startTime, completedAt: new Date() })
        .where(eq(workflowExecutions.id, executionId))
    } finally {
      this.running.delete(executionId)
    }
  }

  private async executeNode(
    executionId: string, nodeId: string, dag: any, context: ExecutionContext,
  ): Promise<{ output: any; tokens: number } | null> {
    const dagNode = dag.nodes.get(nodeId)!
    if (dagNode.type === 'start' || dagNode.type === 'end') {
      if (dagNode.type === 'end' && dagNode.config.output) {
        return { output: renderTemplate(dagNode.config.output, context.variables), tokens: 0 }
      }
      return { output: null, tokens: 0 }
    }

    // Condition branch check
    if (dagNode.type !== 'condition') {
      const incomingEdges = dag.getIncomingEdges(nodeId)
      for (const edge of incomingEdges) {
        const parentNode = dag.nodes.get(edge.source)
        if (parentNode?.type === 'condition') {
          const branch = context.variables.get(`${edge.source}.branch`)
          if (edge.condition && edge.condition !== branch) {
            await this.recordNode(executionId, nodeId, 'skipped')
            return null
          }
        }
      }
    }

    const executor = getExecutor(dagNode.type as NodeType)
    if (!executor) {
      await this.recordNode(executionId, nodeId, 'failed', undefined, `No executor: ${dagNode.type}`)
      return null
    }

    await this.recordNode(executionId, nodeId, 'running')
    const nodeStart = Date.now()
    try {
      const result = await executor.execute(dagNode, context)
      await this.recordNode(executionId, nodeId, 'completed', result.output, undefined, result.tokens, Date.now() - nodeStart)
      return result
    } catch (err: any) {
      await this.recordNode(executionId, nodeId, 'failed', undefined, err.message, 0, Date.now() - nodeStart)
      throw err
    }
  }

  private async recordNode(
    executionId: string, nodeId: string, status: string,
    output?: any, error?: string, tokens = 0, durationMs = 0,
  ) {
    await db.insert(nodeExecutions).values({
      executionId, nodeId, status, output, error, tokens, durationMs,
      startedAt: new Date(),
      ...(status === 'completed' || status === 'failed' ? { completedAt: new Date() } : {}),
    })
  }

  abort(executionId: string) { this.running.get(executionId)?.abort() }
}

export const engine = new WorkflowEngine()
```

**Step 1: Commit**

```bash
git add . && git commit -m "feat: add workflow engine with DAG execution"
```

---

### Task 8: API 路由

**Files:**
- Create: `apps/backend/src/routes/workflows.ts`
- Create: `apps/backend/src/routes/tools.ts`
- Create: `apps/backend/src/routes/models.ts`
- Create: `apps/backend/src/services/tools.ts`

**services/tools.ts:**

```typescript
import type { ToolDefinition } from '@flowcraft/shared'

const builtinTools: ToolDefinition[] = [
  { name: 'web_search', description: '搜索互联网信息', parameters: [{ name: 'query', type: 'string', required: true, description: '搜索关键词' }] },
  { name: 'json_extract', description: '从 JSON 中提取数据', parameters: [{ name: 'json', type: 'string', required: true, description: 'JSON 字符串' }, { name: 'path', type: 'string', required: true, description: 'JSON Path' }] },
  { name: 'text_transform', description: '文本转换', parameters: [{ name: 'text', type: 'string', required: true, description: '文本内容' }, { name: 'operation', type: 'string', required: true, description: '操作类型' }] },
]

export function getToolDefinitions() { return builtinTools }
```

**routes/tools.ts:**

```typescript
import { Hono } from 'hono'
import { getToolDefinitions } from '../services/tools'
export const toolRoutes = new Hono()
toolRoutes.get('/', (c) => c.json(getToolDefinitions()))
```

**routes/models.ts:**

```typescript
import { Hono } from 'hono'
export const modelRoutes = new Hono()
modelRoutes.get('/', (c) => c.json([
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', modelId: 'gpt-4o', enabled: true },
  { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'anthropic', modelId: 'claude-sonnet-4-20250514', enabled: true },
]))
```

**routes/workflows.ts:**

```typescript
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { db } from '../db'
import { workflowDefinitions, workflowExecutions, nodeExecutions } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { engine } from '../engine/engine'
import type { WorkflowDefinition } from '@flowcraft/shared'

export const workflowRoutes = new Hono()

workflowRoutes.post('/', async (c) => {
  const definition = await c.req.json<WorkflowDefinition>()
  const [wf] = await db.insert(workflowDefinitions).values({ name: definition.name, definition }).returning()
  return c.json(wf)
})

workflowRoutes.get('/', async (c) => {
  const workflows = await db.query.workflowDefinitions.findMany({ orderBy: [desc(workflowDefinitions.updatedAt)] })
  return c.json(workflows)
})

workflowRoutes.get('/:id', async (c) => {
  const wf = await db.query.workflowDefinitions.findFirst({ where: eq(workflowDefinitions.id, c.req.param('id')) })
  return c.json(wf)
})

workflowRoutes.put('/:id', async (c) => {
  const definition = await c.req.json<WorkflowDefinition>()
  await db.update(workflowDefinitions)
    .set({ name: definition.name, definition, updatedAt: new Date() })
    .where(eq(workflowDefinitions.id, c.req.param('id')))
  return c.json({ ok: true })
})

workflowRoutes.delete('/:id', async (c) => {
  await db.delete(workflowDefinitions).where(eq(workflowDefinitions.id, c.req.param('id')))
  return c.json({ ok: true })
})

workflowRoutes.post('/:id/run', async (c) => {
  const id = c.req.param('id')
  const input = await c.req.json().catch(() => ({}))
  const wf = await db.query.workflowDefinitions.findFirst({ where: eq(workflowDefinitions.id, id) })
  if (!wf) return c.json({ error: 'Not found' }, 404)
  const executionId = await engine.execute(id, wf.definition as WorkflowDefinition, input)
  return c.json({ executionId, status: 'running' })
})

workflowRoutes.get('/execution/:executionId/stream', async (c) => {
  const executionId = c.req.param('executionId')
  return streamSSE(c, async (stream) => {
    while (true) {
      const execution = await db.query.workflowExecutions.findFirst({ where: eq(workflowExecutions.id, executionId) })
      if (!execution) break
      const nodes = await db.query.nodeExecutions.findMany({ where: eq(nodeExecutions.executionId, executionId) })
      await stream.writeSSE({
        event: 'status',
        data: JSON.stringify({
          executionStatus: execution.status,
          nodes: nodes.map(n => ({ nodeId: n.nodeId, status: n.status, output: n.output, tokens: n.tokens, durationMs: n.durationMs, error: n.error })),
        }),
      })
      if (execution.status === 'completed' || execution.status === 'failed') break
      await new Promise(r => setTimeout(r, 500))
    }
  })
})

workflowRoutes.get('/:id/executions', async (c) => {
  const executions = await db.query.workflowExecutions.findMany({
    where: eq(workflowExecutions.workflowId, c.req.param('id')),
    orderBy: [desc(workflowExecutions.startedAt)],
    limit: 50,
  })
  return c.json(executions)
})
```

```bash
git add . && git commit -m "feat: add workflow, tool, model API routes"
```

---

## Phase 3: React 前端（Day 5-8）

### Task 9: 前端项目初始化

```bash
mkdir -p apps/frontend
cd apps/frontend
pnpm create vite . --template react-ts
pnpm add tailwindcss @tailwindcss/vite react-router-dom @xyflow/react framer-motion
pnpm add lucide-react class-variance-authority clsx tailwind-merge
pnpm add @flowcraft/shared --workspace:*
```

**vite.config.ts:**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
})
```

**src/index.css:**

```css
@import "tailwindcss";
```

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button select input textarea card badge separator scroll-area
git add . && git commit -m "feat: initialize React frontend with React Flow + shadcn/ui"
```

---

### Task 10: 自定义 React Flow 节点

**Files:**
- Create: `apps/frontend/src/components/nodes/BaseNode.tsx`
- Create: `apps/frontend/src/components/nodes/LLMNode.tsx`
- Create: `apps/frontend/src/components/nodes/ConditionNode.tsx`
- Create: `apps/frontend/src/components/nodes/StartNode.tsx`
- Create: `apps/frontend/src/components/nodes/EndNode.tsx`
- Create: `apps/frontend/src/components/nodes/CodeNode.tsx`
- Create: `apps/frontend/src/components/nodes/HttpNode.tsx`

**nodes/BaseNode.tsx:**

```tsx
import { motion } from 'framer-motion'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ReactNode } from 'react'

interface Props extends NodeProps {
  icon: ReactNode
  label: string
  children?: ReactNode
  data: Record<string, any>
}

const statusColors: Record<string, string> = {
  idle: 'border-border',
  running: 'border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)]',
  completed: 'border-blue-500',
  failed: 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]',
  skipped: 'border-muted-foreground/30 opacity-50',
}

export function BaseNode({ icon, label, children, data }: Props) {
  const status = data.status || 'idle'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-card border-2 rounded-lg px-4 py-3 min-w-[180px] transition-colors ${statusColors[status]}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <span className="font-semibold text-xs">{label}</span>
        {status === 'running' && (
          <motion.div
            className="w-2 h-2 rounded-full bg-green-500 ml-auto"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      {children}
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
    </motion.div>
  )
}
```

**nodes/LLMNode.tsx:**

```tsx
import { BaseNode } from './BaseNode'
import type { NodeProps } from '@xyflow/react'

export function LLMNode({ data }: NodeProps) {
  return (
    <BaseNode icon="🤖" label={data.label || 'LLM'} data={data}>
      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <div>{data.config?.model || 'gpt-4o'}</div>
        <div className="truncate max-w-[160px]">{data.config?.prompt?.substring(0, 50) || 'No prompt'}</div>
      </div>
    </BaseNode>
  )
}
```

**nodes/ConditionNode.tsx:**

```tsx
import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'

export function ConditionNode({ data }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border-2 border-amber-500 rounded-lg px-4 py-3 min-w-[160px]"
    >
      <Handle type="target" position={Position.Left} className="!bg-amber-500 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        <span>◆</span>
        <span className="font-semibold text-xs">{data.label || '条件'}</span>
      </div>
      <div className="text-[10px] text-muted-foreground truncate">
        {data.config?.expression || 'No expression'}
      </div>
      <Handle type="source" position={Position.Right} id="true" style={{ top: '30%' }} className="!bg-green-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="false" style={{ top: '70%' }} className="!bg-red-500 !w-2 !h-2" />
    </motion.div>
  )
}
```

**nodes/StartNode.tsx, EndNode.tsx, CodeNode.tsx, HttpNode.tsx** — 类似结构，替换图标。

```bash
git add . && git commit -m "feat: add custom React Flow nodes"
```

---

### Task 11: 工作流编辑器页面

**Files:**
- Create: `apps/frontend/src/pages/EditorPage.tsx`
- Create: `apps/frontend/src/components/NodePalette.tsx`
- Create: `apps/frontend/src/components/PropertyPanel.tsx`
- Create: `apps/frontend/src/components/DebugPanel.tsx`
- Create: `apps/frontend/src/api/workflow.ts`
- Create: `apps/frontend/src/hooks/useWorkflowExecution.ts`

**api/workflow.ts:**

```typescript
import type { WorkflowDefinition } from '@flowcraft/shared'

export async function saveWorkflow(definition: WorkflowDefinition) {
  const res = await fetch('/api/workflows', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(definition),
  })
  return res.json()
}

export async function updateWorkflow(id: string, definition: WorkflowDefinition) {
  await fetch(`/api/workflows/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(definition),
  })
}

export async function getWorkflow(id: string) {
  const res = await fetch(`/api/workflows/${id}`)
  return res.json()
}

export async function runWorkflow(id: string, input?: Record<string, any>) {
  const res = await fetch(`/api/workflows/${id}/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input || {}),
  })
  return res.json()
}

export function connectExecutionSSE(executionId: string, callback: (data: any) => void) {
  const es = new EventSource(`/api/workflows/execution/${executionId}/stream`)
  es.addEventListener('status', (e) => callback(JSON.parse(e.data)))
  return es
}
```

**components/NodePalette.tsx:**

```tsx
import { Button } from '@/components/ui/button'
import type { NodeType } from '@flowcraft/shared'

const items: { type: NodeType; icon: string; label: string }[] = [
  { type: 'llm', icon: '🤖', label: 'LLM' },
  { type: 'tool', icon: '🔧', label: '工具' },
  { type: 'condition', icon: '◆', label: '条件' },
  { type: 'code', icon: '{ }', label: '代码' },
  { type: 'http', icon: '🌐', label: 'HTTP' },
  { type: 'variable', icon: '📋', label: '变量' },
]

interface Props { onAdd: (type: NodeType) => void }

export function NodePalette({ onAdd }: Props) {
  return (
    <div className="w-48 border-r p-3 space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground">节点面板</h3>
      {items.map(item => (
        <Button
          key={item.type}
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          onClick={() => onAdd(item.type)}
        >
          <span>{item.icon}</span> {item.label}
        </Button>
      ))}
    </div>
  )
}
```

**components/PropertyPanel.tsx:**

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface Props {
  node: any
  onUpdate: (nodeId: string, config: Record<string, any>) => void
}

export function PropertyPanel({ node, onUpdate }: Props) {
  const [config, setConfig] = useState<Record<string, any>>({ ...node.data?.config || {} })

  if (!node) return <div className="p-3 text-xs text-muted-foreground">选择节点查看属性</div>

  return (
    <div className="w-64 border-l p-3 space-y-3 overflow-y-auto">
      <h3 className="text-xs font-medium">{node.data.label} 属性</h3>

      {node.type === 'llm' && (
        <>
          <Select value={config.model} onValueChange={v => setConfig({ ...config, model: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="模型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={config.prompt || ''}
            onChange={e => setConfig({ ...config, prompt: e.target.value })}
            placeholder="Prompt 模板"
            rows={4}
            className="text-xs"
          />
        </>
      )}

      {node.type === 'condition' && (
        <Textarea
          value={config.expression || ''}
          onChange={e => setConfig({ ...config, expression: e.target.value })}
          placeholder="input.score > 80"
          rows={2}
          className="text-xs"
        />
      )}

      {node.type === 'code' && (
        <Textarea
          value={config.code || ''}
          onChange={e => setConfig({ ...config, code: e.target.value })}
          placeholder="return input;"
          rows={6}
          className="text-xs font-mono"
        />
      )}

      {node.type === 'http' && (
        <>
          <input className="w-full border rounded px-2 py-1 text-xs" placeholder="URL"
            value={config.url || ''} onChange={e => setConfig({ ...config, url: e.target.value })} />
          <Select value={config.method || 'GET'} onValueChange={v => setConfig({ ...config, method: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      <Button size="sm" className="w-full" onClick={() => onUpdate(node.id, config)}>应用</Button>
    </div>
  )
}
```

**components/DebugPanel.tsx:**

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface NodeDebug {
  nodeId: string
  status: string
  output?: any
  tokens?: number
  durationMs?: number
  error?: string
}

interface Props {
  nodes: NodeDebug[]
  open: boolean
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline', running: 'secondary', completed: 'default', failed: 'destructive', skipped: 'outline',
}

export function DebugPanel({ nodes, open }: Props) {
  if (!open) return null

  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: 'auto' }}
      className="border-t bg-muted/30"
    >
      <div className="p-3">
        <h3 className="text-xs font-medium mb-2">调试面板</h3>
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            <AnimatePresence>
              {nodes.map((n, i) => (
                <motion.div
                  key={n.nodeId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 text-xs py-1"
                >
                  <Badge variant={statusVariant[n.status] || 'outline'} className="text-[10px]">
                    {n.status}
                  </Badge>
                  <span className="font-mono">{n.nodeId}</span>
                  {n.tokens && <span className="text-muted-foreground">{n.tokens} tokens</span>}
                  {n.durationMs && <span className="text-muted-foreground">{(n.durationMs / 1000).toFixed(1)}s</span>}
                  {n.error && <span className="text-red-500 truncate max-w-[200px]">{n.error}</span>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  )
}
```

**pages/EditorPage.tsx:**

```tsx
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, type Connection, type Node, type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { LLMNode } from '@/components/nodes/LLMNode'
import { ConditionNode } from '@/components/nodes/ConditionNode'
import { StartNode } from '@/components/nodes/StartNode'
import { EndNode } from '@/components/nodes/EndNode'
import { CodeNode } from '@/components/nodes/CodeNode'
import { HttpNode } from '@/components/nodes/HttpNode'
import { NodePalette } from '@/components/NodePalette'
import { PropertyPanel } from '@/components/PropertyPanel'
import { DebugPanel } from '@/components/DebugPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveWorkflow, updateWorkflow, getWorkflow, runWorkflow, connectExecutionSSE } from '@/api/workflow'
import type { NodeType, WorkflowDefinition } from '@flowcraft/shared'

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  llm: LLMNode,
  condition: ConditionNode,
  code: CodeNode,
  http: HttpNode,
}

let counter = 100
export function EditorPage() {
  const { id: workflowId } = useParams<{ id: string }>()
  const [name, setName] = useState('新工作流')
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [running, setRunning] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugNodes, setDebugNodes] = useState<any[]>([])
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (workflowId) {
      getWorkflow(workflowId).then(wf => {
        setName(wf.name)
        const def = wf.definition as WorkflowDefinition
        setNodes(def.nodes.map(n => ({
          id: n.id, type: n.type, position: n.position,
          data: { label: n.label, config: n.config },
        })))
        setEdges(def.edges.map(e => ({
          id: e.id, source: e.source, target: e.target, label: e.label,
        })))
      })
    } else {
      setNodes([
        { id: 'start-1', type: 'start', position: { x: 100, y: 200 }, data: { label: '开始', config: {} } },
        { id: 'end-1', type: 'end', position: { x: 800, y: 200 }, data: { label: '结束', config: {} } },
      ])
    }
  }, [workflowId])

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({ ...connection, id: `e-${connection.source}-${connection.target}` }, eds))
  }, [setEdges])

  const selectedNode = useMemo(() => nodes.find(n => n.selected), [nodes])

  const addNode = useCallback((type: NodeType) => {
    counter++
    const labels: Record<string, string> = { llm: 'LLM', tool: '工具', condition: '条件', code: '代码', http: 'HTTP' }
    setNodes(nds => [...nds, {
      id: `${type}-${counter}`, type,
      position: { x: 200 + Math.random() * 400, y: 100 + Math.random() * 200 },
      data: { label: labels[type] || type, config: {} },
    }])
  }, [setNodes])

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, config } } : n))
  }, [setNodes])

  const toDefinition = (): WorkflowDefinition => ({
    name,
    nodes: nodes.map(n => ({ id: n.id, type: n.type as NodeType, position: n.position, config: n.data.config || {}, label: n.data.label })),
    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label as string })),
  })

  const save = async () => {
    const def = toDefinition()
    if (workflowId) await updateWorkflow(workflowId, def)
    else await saveWorkflow(def)
  }

  const run = async () => {
    if (!workflowId) return
    setRunning(true)
    setDebugOpen(true)
    setDebugNodes([])

    const { executionId } = await runWorkflow(workflowId)
    esRef.current = connectExecutionSSE(executionId, (data) => {
      setDebugNodes(data.nodes)
      // Update node status in canvas
      setNodes(nds => nds.map(n => {
        const dn = data.nodes.find((d: any) => d.nodeId === n.id)
        return dn ? { ...n, data: { ...n.data, status: dn.status } } : n
      }))
      if (data.executionStatus === 'completed' || data.executionStatus === 'failed') {
        setRunning(false)
      }
    })
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b px-4 py-2 flex items-center gap-3">
        <h1 className="font-bold text-sm">FlowCraft</h1>
        <Input value={name} onChange={e => setName(e.target.value)} className="w-48 h-7 text-xs" />
        <Button size="sm" variant="outline" onClick={save}>保存</Button>
        <Button size="sm" onClick={run} disabled={running || !workflowId}>
          {running ? '运行中...' : '运行'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDebugOpen(!debugOpen)}>调试</Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <NodePalette onAdd={addNode} />

        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {selectedNode && (
          <PropertyPanel node={selectedNode} onUpdate={updateNodeConfig} />
        )}
      </div>

      <DebugPanel nodes={debugNodes} open={debugOpen} />
    </div>
  )
}
```

```bash
git add . && git commit -m "feat: add workflow editor with React Flow and debug panel"
```

---

### Task 12: 列表页 + 路由

**Files:**
- Create: `apps/frontend/src/pages/ListView.tsx`
- Create: `apps/frontend/src/App.tsx`
- Create: `apps/frontend/src/main.tsx`

**pages/ListView.tsx:**

```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit } from 'lucide-react'

export function ListView() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/workflows').then(r => r.json()).then(setWorkflows)
  }, [])

  const remove = async (id: string) => {
    await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
    setWorkflows(prev => prev.filter(w => w.id !== id))
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">FlowCraft</h1>
        <Button onClick={() => navigate('/editor')}>
          <Plus className="w-4 h-4 mr-1" /> 新建工作流
        </Button>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((wf, i) => (
          <motion.div key={wf.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/editor/${wf.id}`)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{wf.name}</h3>
                  <Badge variant="outline">{(wf.definition as any)?.nodes?.length || 0} 节点</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(wf.updatedAt).toLocaleDateString()}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); navigate(`/editor/${wf.id}`) }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); remove(wf.id) }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </main>
    </div>
  )
}
```

**App.tsx:**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ListView } from './pages/ListView'
import { EditorPage } from './pages/EditorPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListView />} />
        <Route path="/editor/:id?" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

**main.tsx:**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
```

```bash
git add . && git commit -m "feat: add workflow list page and routing"
```

---

## Phase 4: Docker + 测试（Day 9-10）

### Task 13: Docker Compose + 测试

**Files:**
- Create: `docker-compose.yml`
- Create: `apps/backend/src/engine/__tests__/engine.test.ts`

**engine.test.ts:**

```typescript
import { describe, it, expect } from 'vitest'
import { parseDAG, topologicalSort } from '../dag'
import { renderTemplate } from '../executors'
import type { WorkflowDefinition } from '@flowcraft/shared'

describe('WorkflowEngine', () => {
  it('should sort complex workflow into layers', () => {
    const wf: WorkflowDefinition = {
      name: 'complex',
      nodes: [
        { id: 'start', type: 'start', position: { x: 0, y: 0 }, config: {} },
        { id: 'llm-1', type: 'llm', position: { x: 200, y: 0 }, config: {} },
        { id: 'llm-2a', type: 'llm', position: { x: 400, y: -100 }, config: {} },
        { id: 'llm-2b', type: 'llm', position: { x: 400, y: 100 }, config: {} },
        { id: 'merge', type: 'merge', position: { x: 600, y: 0 }, config: {} },
        { id: 'end', type: 'end', position: { x: 800, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'llm-1' },
        { id: 'e2', source: 'llm-1', target: 'llm-2a' },
        { id: 'e3', source: 'llm-1', target: 'llm-2b' },
        { id: 'e4', source: 'llm-2a', target: 'merge' },
        { id: 'e5', source: 'llm-2b', target: 'merge' },
        { id: 'e6', source: 'merge', target: 'end' },
      ],
    }
    const dag = parseDAG(wf)
    const layers = topologicalSort(dag)
    expect(layers[0]).toContain('start')
    expect(layers[1]).toContain('llm-1')
    expect(layers[2]).toContain('llm-2a')
    expect(layers[2]).toContain('llm-2b')
    expect(layers[3]).toContain('merge')
  })

  it('should render templates', () => {
    const ctx = new Map([['topic', 'whiteboard'], ['node-1.output', 'Miro']])
    expect(renderTemplate('Analyze {{node-1.output}} for {{topic}}', ctx))
      .toBe('Analyze Miro for whiteboard')
  })
})
```

**docker-compose.yml:**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: flowcraft, POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres }
    ports: ["5432:5432"]

  backend:
    build: ./apps/backend
    ports: ["3000:3000"]
    depends_on: [postgres]
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/flowcraft
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}

  frontend:
    build: ./apps/frontend
    ports: ["80:80"]
    depends_on: [backend]
```

```bash
cd apps/backend && pnpm test -- --run
git add . && git commit -m "feat: add Docker Compose and integration tests"
```

---

## 总结

| Phase | 天数 | 核心产出 |
|-------|------|---------|
| Phase 1 | Day 1 | Monorepo + Hono 后端 + Drizzle Schema + 共享类型 |
| Phase 2 | Day 2-4 | DAG 解析器 + 拓扑排序 + 节点执行器 + 工作流引擎（TDD） |
| Phase 3 | Day 5-8 | React + React Flow 可视化编辑器 + shadcn/ui + Framer Motion |
| Phase 4 | Day 9-10 | Docker + 集成测试 |

**React 版特色：**
- React Flow 原生 TypeScript，API 比 Vue Flow 更成熟
- Framer Motion 节点状态动画：运行中脉冲、完成变色、失败闪烁
- DebugPanel 面板入场动画，节点状态 stagger 展示
- shadcn/ui 统一设计语言

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | ISSUES_OPEN | 5 proposals, 5 accepted, 2 deferred |
| Outside Voice | `/plan-ceo-review` | Independent 2nd opinion | 1 | ISSUES_OPEN | 5 critical issues, 5/5 overlap with CEO |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | ISSUES_OPEN | 12 issues, 5 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | ISSUES_OPEN | score: 2/10 → 2/10, 0 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 1 | ISSUES_OPEN | score: 3.25/10 → 3.25/10, TTHW: 60min → 5min |

**UNRESOLVED:** 0 user decisions (all auto-decided by /autoplan)
**VERDICT:** 7 ship-blocker fixes required before implementation. CEO + ENG + DESIGN reviews all flag overlapping critical issues.

### Ship Blockers (must fix before implementation)

1. **CodeExecutor RCE** — `new Function()` enables process.env exfiltration. Fix: sandbox with isolated-vm.
2. **SSE DB polling** — 2 queries/500ms per client, event loop blocking. Fix: EventEmitter pub/sub.
3. **Condition routing broken** — UI never sets `edge.condition`. Fix: pass `sourceHandle` in `onConnect`.
4. **recordNode INSERT duplicates** — No UNIQUE constraint. Fix: UPSERT on (executionId, nodeId).
5. **Save-then-run broken** — URL stays `/editor` after save, Run disabled. Fix: navigate to `/editor/${id}`.
6. **No error handling** — All API routes lack try/catch, errors swallowed silently. Fix: error middleware.
7. **No authentication** — All endpoints open. Fix: API key middleware.

### Suggested Additional Tasks

| Task | Phase | Effort | Impact |
|------|-------|--------|--------|
| Task 0: README + .env.example + startup validation | Before Phase 1 | S | DX +3 |
| Task 4.5: Sandbox CodeExecutor + API key auth | Phase 2 | M | Security critical |
| Task 7.5: SSE EventEmitter + recordNode UPSERT | Phase 2 | M | Architecture critical |
| Task 10.5: Fix condition UI + save flow | Phase 3 | S | UX critical |
| Task 11.5: Loading/empty/error states + PropertyPanel fix | Phase 3 | S | UX important |
| Task 12.5: Promise.allSettled + engine recovery | Phase 2 | S | Reliability |
