import { randomUUID } from 'crypto'
import { sqlite, db } from './index'
import { eq } from 'drizzle-orm'

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS workflow_definition (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  definition TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  trigger_type TEXT DEFAULT 'manual',
  cron_expression TEXT,
  webhook_path TEXT UNIQUE,
  webhook_secret TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS workflow_execution (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflow_definition(id),
  status TEXT DEFAULT 'running',
  input TEXT,
  output TEXT,
  total_tokens INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  started_at TEXT,
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS node_execution (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES workflow_execution(id),
  node_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  input TEXT,
  output TEXT,
  tokens INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  error TEXT,
  started_at TEXT,
  completed_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS node_execution_execution_node_idx ON node_execution(execution_id, node_id);
CREATE INDEX IF NOT EXISTS node_execution_execution_idx ON node_execution(execution_id);
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  base_url TEXT,
  is_enabled INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  max_tokens INTEGER
);
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  default_llm_model TEXT,
  default_ai_processor_model TEXT,
  default_workflow_gen_model TEXT,
  request_timeout INTEGER DEFAULT 30000,
  max_retries INTEGER DEFAULT 2
);
`

const SAMPLES = [
  {
    name: 'API 数据抓取',
    description: '入门示例：从 API 获取数据并映射字段',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 50, y: 200 }, config: {}, label: 'Start' },
      { id: 'http-1', type: 'http', position: { x: 300, y: 200 }, config: { url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET' }, label: '获取帖子' },
      { id: 'mapper-1', type: 'data-mapper', position: { x: 550, y: 200 }, config: { sourceNodeId: 'http-1', mappings: [{ sourcePath: 'title', targetName: '标题', enabled: true }, { sourcePath: 'body', targetName: '内容', enabled: true }] }, label: '提取字段' },
      { id: 'end-1', type: 'end', position: { x: 800, y: 200 }, config: {}, label: 'End' },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'http-1' },
      { id: 'e2', source: 'http-1', target: 'mapper-1' },
      { id: 'e3', source: 'mapper-1', target: 'end-1' },
    ],
  },
  {
    name: 'AI 内容分析',
    description: '中级示例：获取数据后根据条件调用 AI 分析',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 50, y: 200 }, config: {}, label: 'Start' },
      { id: 'http-1', type: 'http', position: { x: 300, y: 200 }, config: { url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET' }, label: '获取帖子' },
      { id: 'cond-1', type: 'condition', position: { x: 550, y: 200 }, config: { field: 'http-1.output', operator: 'not_empty', value: '' }, label: '有数据？' },
      { id: 'llm-1', type: 'llm', position: { x: 800, y: 120 }, config: { model: 'glm-4-flash', prompt: '请用一句话总结以下内容的主题：{{http-1.output.title}}\n\n内容：{{http-1.output.body}}', temperature: 0.7 }, label: 'AI 摘要' },
      { id: 'end-1', type: 'end', position: { x: 1050, y: 120 }, config: {}, label: 'End' },
      { id: 'end-2', type: 'end', position: { x: 800, y: 300 }, config: {}, label: 'End (空)' },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'http-1' },
      { id: 'e2', source: 'http-1', target: 'cond-1' },
      { id: 'e3', source: 'cond-1', target: 'llm-1', sourceHandle: 'true' },
      { id: 'e4', source: 'llm-1', target: 'end-1' },
      { id: 'e5', source: 'cond-1', target: 'end-2', sourceHandle: 'false' },
    ],
  },
  {
    name: '自动化数据处理',
    description: '高级示例：多步骤数据获取 → 映射 → AI 处理 → 输出',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 50, y: 200 }, config: {}, label: 'Start' },
      { id: 'http-1', type: 'http', position: { x: 280, y: 200 }, config: { url: 'https://jsonplaceholder.typicode.com/users/1', method: 'GET' }, label: '获取用户' },
      { id: 'mapper-1', type: 'data-mapper', position: { x: 510, y: 200 }, config: { sourceNodeId: 'http-1', mappings: [{ sourcePath: 'name', targetName: '用户名', enabled: true }, { sourcePath: 'email', targetName: '邮箱', enabled: true }, { sourcePath: 'company.name', targetName: '公司', enabled: true }] }, label: '提取信息' },
      { id: 'ai-1', type: 'ai-processor', position: { x: 740, y: 200 }, config: { instruction: '根据用户信息生成一段简短的职业简介（中文，50字以内）', outputFormat: 'text' }, label: 'AI 简介' },
      { id: 'llm-1', type: 'llm', position: { x: 970, y: 200 }, config: { model: 'glm-4-flash', prompt: '将以下信息整理为 JSON 格式：\n用户名：{{mapper-1.output.用户名}}\n邮箱：{{mapper-1.output.邮箱}}\n公司：{{mapper-1.output.公司}}\nAI简介：{{ai-1.output}}', temperature: 0.3 }, label: '格式化输出' },
      { id: 'end-1', type: 'end', position: { x: 1200, y: 200 }, config: {}, label: 'End' },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'http-1' },
      { id: 'e2', source: 'http-1', target: 'mapper-1' },
      { id: 'e3', source: 'mapper-1', target: 'ai-1' },
      { id: 'e4', source: 'ai-1', target: 'llm-1' },
      { id: 'e5', source: 'llm-1', target: 'end-1' },
    ],
  },
]

export async function initSqlite() {
  sqlite!.exec(CREATE_TABLES)
  console.log('[DB] SQLite tables initialized')

  // 插入默认模型配置
  const defaultModels = [
    { provider: 'openai', modelId: 'gpt-4o', displayName: 'GPT-4o', maxTokens: 128000 },
    { provider: 'openai', modelId: 'gpt-4o-mini', displayName: 'GPT-4o Mini', maxTokens: 128000 },
    { provider: 'anthropic', modelId: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', maxTokens: 200000 },
    { provider: 'zhipu', modelId: 'glm-4-flash', displayName: 'GLM-4 Flash', maxTokens: 128000 },
    { provider: 'zhipu', modelId: 'GLM-4.7', displayName: 'GLM-4.7', maxTokens: 128000 },
  ]

  for (const model of defaultModels) {
    const existing = sqlite!.prepare('SELECT id FROM models WHERE model_id = ?').get(model.modelId) as any
    if (!existing) {
      const id = randomUUID()
      sqlite!.prepare(
        'INSERT INTO models (id, provider, model_id, display_name, max_tokens) VALUES (?, ?, ?, ?, ?)'
      ).run(id, model.provider, model.modelId, model.displayName, model.maxTokens)
      console.log(`[Seed] Created model: ${model.displayName}`)
    }
  }

  // 插入默认用户偏好
  const existingPrefs = sqlite!.prepare('SELECT id FROM user_preferences LIMIT 1').get() as any
  if (!existingPrefs) {
    const id = randomUUID()
    sqlite!.prepare(
      'INSERT INTO user_preferences (id, default_llm_model, default_ai_processor_model, default_workflow_gen_model, request_timeout, max_retries) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, 'gpt-4o', 'glm-4-flash', 'GLM-4.7', 30000, 2)
    console.log('[Seed] Created default user preferences')
  }

  for (const sample of SAMPLES) {
    // 简单查询检查是否已存在
    const rows = sqlite!.prepare('SELECT id FROM workflow_definition WHERE name = ?').get(sample.name) as any
    if (rows) continue

    const id = randomUUID()
    const now = new Date().toISOString()
    sqlite!.prepare(
      'INSERT INTO workflow_definition (id, name, description, definition, version, trigger_type, created_at, updated_at) VALUES (?, ?, ?, ?, 1, \'manual\', ?, ?)'
    ).run(id, sample.name, sample.description, JSON.stringify({ nodes: sample.nodes, edges: sample.edges }), now, now)
    console.log(`[Seed] Created sample: ${sample.name}`)
  }
}
