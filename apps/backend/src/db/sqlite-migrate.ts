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
  {
    name: '智能多源市场情报分析系统',
    description: '专家级示例：14节点全类型覆盖 — 并行HTTP请求 → 数据映射 → 条件分支 → AI分析 → LLM报告 → 代码格式化 → Webhook触发',
    triggerType: 'webhook',
    webhookPath: 'market-intel',
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 0, y: 300 }, config: {}, label: '接收请求' },
      { id: 'http-weather', type: 'http', position: { x: 250, y: 80 }, config: { url: 'https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&current_weather=true', method: 'GET', headers: {} }, label: '获取天气数据' },
      { id: 'http-exchange', type: 'http', position: { x: 250, y: 280 }, config: { url: 'https://open.er-api.com/v6/latest/USD', method: 'GET', headers: {} }, label: '获取汇率数据' },
      { id: 'http-news', type: 'http', position: { x: 250, y: 480 }, config: { url: 'https://hacker-news.firebaseio.com/v0/topstories.json', method: 'GET', headers: {} }, label: '获取热点新闻' },
      { id: 'dm-weather', type: 'data-mapper', position: { x: 500, y: 80 }, config: { sourceNodeId: 'http-weather', mappings: [{ sourcePath: 'current_weather.temperature', targetName: 'temperature', enabled: true }, { sourcePath: 'current_weather.windspeed', targetName: 'windspeed', enabled: true }, { sourcePath: 'current_weather.weathercode', targetName: 'weathercode', enabled: true }] }, label: '提取天气指标' },
      { id: 'dm-exchange', type: 'data-mapper', position: { x: 500, y: 280 }, config: { sourceNodeId: 'http-exchange', mappings: [{ sourcePath: 'rates.CNY', targetName: 'usd_cny', enabled: true }, { sourcePath: 'rates.EUR', targetName: 'usd_eur', enabled: true }, { sourcePath: 'rates.JPY', targetName: 'usd_jpy', enabled: true }, { sourcePath: 'rates.GBP', targetName: 'usd_gbp', enabled: true }] }, label: '提取汇率指标' },
      { id: 'cond-news', type: 'condition', position: { x: 500, y: 480 }, config: { field: { sourceNodeId: 'http-news', path: 'length' }, operator: 'gt', value: 0 }, label: '检查新闻数据' },
      { id: 'aip-sentiment', type: 'ai-processor', position: { x: 750, y: 200 }, config: { instruction: '综合分析以下多源数据，判断市场情绪：1) 天气数据对经济的影响 2) 汇率走势暗示 3) 新闻热度。输出 JSON 格式的市场情绪分析报告，包含 sentiment(positive/neutral/negative), confidence(0-1), key_factors 数组, risk_level(low/medium/high)', model: 'GLM-4.7', outputFormat: 'json', outputSchema: '{ sentiment: string, confidence: number, key_factors: string[], risk_level: string }' }, label: 'AI 情绪综合分析' },
      { id: 'cond-risk', type: 'condition', position: { x: 1000, y: 200 }, config: { field: { sourceNodeId: 'aip-sentiment', path: 'risk_level' }, operator: 'eq', value: 'high' }, label: '风险评估' },
      { id: 'llm-alert', type: 'llm', position: { x: 1250, y: 100 }, config: { model: 'GLM-4.7', systemPrompt: '你是一位资深风险分析师，专门识别市场中的潜在风险信号。请用专业但易懂的语言撰写风险预警报告。', prompt: '基于以下市场情报分析结果，撰写一份详细的风险预警报告：\n\n市场情绪：{{aip-sentiment.sentiment}}\n风险等级：{{aip-sentiment.risk_level}}\n关键因素：{{aip-sentiment.key_factors}}\n\n请包含：1. 风险概述 2. 具体风险点 3. 建议应对措施', temperature: 0.5 }, label: '高风险预警报告' },
      { id: 'llm-brief', type: 'llm', position: { x: 1250, y: 300 }, config: { model: 'GLM-4.7', systemPrompt: '你是一位市场分析师，善于从多维度数据中发现投资机会。请撰写积极乐观但基于事实的市场简报。', prompt: '基于以下市场情报，撰写一份简洁的市场简报：\n\n市场情绪：{{aip-sentiment.sentiment}}\n置信度：{{aip-sentiment.confidence}}\n关键因素：{{aip-sentiment.key_factors}}\n\n请包含：1. 市场概览 2. 亮点机会 3. 一句话建议', temperature: 0.7 }, label: '市场简报生成' },
      { id: 'aip-summary', type: 'ai-processor', position: { x: 1500, y: 200 }, config: { instruction: '将上游所有分析结果整合为一份结构化的最终报告。要求输出 JSON 格式，包含 title(报告标题), executive_summary(一句话摘要), sections(数组，每项含 heading 和 content), generated_at(当前时间), data_sources(数据来源列表), footer(注明由 FlowCraft 自动生成)', model: 'GLM-4.7', outputFormat: 'json', outputSchema: '{ title: string, executive_summary: string, sections: [{ heading: string, content: string }], generated_at: string, data_sources: string[], footer: string }' }, label: '最终报告整合' },
      { id: 'code-format', type: 'code', position: { x: 1750, y: 200 }, config: { code: "const report = input;\nconst formatted = {\n  ...report,\n  formatted_at: new Date().toISOString(),\n  version: '2.0',\n  footer: '由 FlowCraft 智能市场情报系统自动生成'\n};\nreturn JSON.stringify(formatted, null, 2);" }, label: '格式化输出' },
      { id: 'end-1', type: 'end', position: { x: 2000, y: 200 }, config: {}, label: '输出报告' },
    ],
    edges: [
      { id: 'e1', source: 'start-1', target: 'http-weather' },
      { id: 'e2', source: 'start-1', target: 'http-exchange' },
      { id: 'e3', source: 'start-1', target: 'http-news' },
      { id: 'e4', source: 'http-weather', target: 'dm-weather' },
      { id: 'e5', source: 'http-exchange', target: 'dm-exchange' },
      { id: 'e6', source: 'http-news', target: 'cond-news' },
      { id: 'e7', source: 'dm-weather', target: 'aip-sentiment' },
      { id: 'e8', source: 'dm-exchange', target: 'aip-sentiment' },
      { id: 'e9', source: 'cond-news', target: 'aip-sentiment', sourceHandle: 'true' },
      { id: 'e10', source: 'aip-sentiment', target: 'cond-risk' },
      { id: 'e11', source: 'cond-risk', target: 'llm-alert', sourceHandle: 'true' },
      { id: 'e12', source: 'cond-risk', target: 'llm-brief', sourceHandle: 'false' },
      { id: 'e13', source: 'llm-alert', target: 'aip-summary' },
      { id: 'e14', source: 'llm-brief', target: 'aip-summary' },
      { id: 'e15', source: 'aip-summary', target: 'code-format' },
      { id: 'e16', source: 'code-format', target: 'end-1' },
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
    const triggerType = sample.triggerType || 'manual'
    const webhookPath = sample.webhookPath || null
    sqlite!.prepare(
      'INSERT INTO workflow_definition (id, name, description, definition, version, trigger_type, webhook_path, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)'
    ).run(id, sample.name, sample.description, JSON.stringify({ nodes: sample.nodes, edges: sample.edges }), triggerType, webhookPath, now, now)
    console.log(`[Seed] Created sample: ${sample.name}`)
  }
}
